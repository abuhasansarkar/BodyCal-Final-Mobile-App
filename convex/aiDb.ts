import { ConvexError, v } from "convex/values";

import { internalMutation, internalQuery, query } from "./_generated/server";
import { attachOwnedUpload, requireCurrentUser } from "./lib/auth";
import { consumeRateLimit } from "./lib/rateLimit";
import { assertLocale } from "./lib/validation";

const ABANDONED_IMAGE_RETENTION_MS = 24 * 60 * 60 * 1_000;
const DAILY_SCAN_LIMIT = 10;
const MONTHLY_SCAN_LIMIT = 150;
const ENTITLED_STATES = new Set(["trial", "active", "cancelledActive", "billingIssueActive"]);

/**
 * Server-side quota view so the client can show remaining scans instead of
 * discovering the limit by failing.
 */
export const getScanQuota = query({
  args: {},
  returns: v.object({
    dailyUsed: v.number(),
    dailyLimit: v.number(),
    monthlyUsed: v.number(),
    monthlyLimit: v.number(),
  }),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const startOfMonth = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
    const since = Math.min(startOfMonth, now - ABANDONED_IMAGE_RETENTION_MS);

    const scans = await ctx.db
      .query("aiScans")
      .withIndex("by_user_created", (q) => q.eq("userId", user._id).gte("createdAt", since))
      .collect();

    const billable = scans.filter((scan) => scan.status !== "failed");
    return {
      dailyUsed: billable.filter((scan) => scan.createdAt >= now - ABANDONED_IMAGE_RETENTION_MS).length,
      dailyLimit: DAILY_SCAN_LIMIT,
      monthlyUsed: billable.filter((scan) => scan.createdAt >= startOfMonth).length,
      monthlyLimit: MONTHLY_SCAN_LIMIT,
    };
  },
});

/** True when the server-side mirror is fresh enough to skip a RevenueCat call. */
export const isEntitlementFresh = internalQuery({
  args: { maxAgeMs: v.number() },
  returns: v.boolean(),
  handler: async (ctx, { maxAgeMs }) => {
    const user = await requireCurrentUser(ctx);
    const mirror = await ctx.db
      .query("subscriptionMirror")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!mirror) return false;
    if (Date.now() - mirror.verifiedAt > maxAgeMs) return false;
    if (!ENTITLED_STATES.has(mirror.state)) return false;
    if (mirror.expirationAt !== undefined && mirror.expirationAt <= Date.now()) return false;
    return true;
  },
});

export const begin = internalMutation({
  args: {
    storageId: v.id("_storage"),
    requestId: v.string(),
    locale: v.string(),
    provider: v.string(),
    model: v.string(),
  },
  returns: v.object({
    scanId: v.id("aiScans"),
    duplicate: v.boolean(),
    estimate: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const locale = assertLocale(args.locale);

    // Idempotency first, through the index — a retried request must not re-charge.
    const existing = await ctx.db
      .query("aiScans")
      .withIndex("by_user_request", (q) => q.eq("userId", user._id).eq("requestId", args.requestId))
      .unique();
    if (existing) return { scanId: existing._id, duplicate: true, estimate: existing.estimate };

    // The caller must own the blob; size and MIME were checked when it was claimed.
    await attachOwnedUpload(ctx, args.storageId, user._id);

    const subscription = await ctx.db
      .query("subscriptionMirror")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const entitled =
      subscription !== null &&
      ENTITLED_STATES.has(subscription.state) &&
      (subscription.expirationAt === undefined || subscription.expirationAt > Date.now());
    if (!entitled) throw new ConvexError("Pro entitlement required");

    await consumeRateLimit(ctx, "aiScan", user._id);

    const now = Date.now();
    const startOfMonth = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
    const scans = await ctx.db
      .query("aiScans")
      .withIndex("by_user_created", (q) =>
        q.eq("userId", user._id).gte("createdAt", Math.min(startOfMonth, now - ABANDONED_IMAGE_RETENTION_MS)),
      )
      .collect();
    const billable = scans.filter((scan) => scan.status !== "failed");
    const dailyCount = billable.filter(
      (scan) => scan.createdAt >= now - ABANDONED_IMAGE_RETENTION_MS,
    ).length;
    const monthlyCount = billable.filter((scan) => scan.createdAt >= startOfMonth).length;
    if (dailyCount >= DAILY_SCAN_LIMIT || monthlyCount >= MONTHLY_SCAN_LIMIT) {
      throw new ConvexError("AI scan fair-use limit reached");
    }

    const scanId = await ctx.db.insert("aiScans", {
      userId: user._id,
      requestId: args.requestId,
      imageStorageId: args.storageId,
      status: "processing",
      provider: args.provider,
      model: args.model,
      locale,
      retentionUntil: now + ABANDONED_IMAGE_RETENTION_MS,
      createdAt: now,
      updatedAt: now,
    });
    return { scanId, duplicate: false, estimate: undefined };
  },
});

export const complete = internalMutation({
  args: {
    scanId: v.id("aiScans"),
    // Already validated by `estimateSchema` in ai.ts; see the note in schema.ts.
    estimate: v.any(),
    confidence: v.string(),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== user._id) throw new ConvexError("Scan not found");

    await ctx.db.patch(args.scanId, {
      status: "completed",
      estimate: args.estimate,
      confidence: args.confidence,
      latencyMs: args.latencyMs,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const fail = internalMutation({
  args: { scanId: v.id("aiScans"), failureCategory: v.string(), latencyMs: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const scan = await ctx.db.get(args.scanId);
    if (!scan || scan.userId !== user._id) return null;

    await ctx.db.patch(args.scanId, {
      status: "failed",
      failureCategory: args.failureCategory.slice(0, 64),
      latencyMs: args.latencyMs,
      updatedAt: Date.now(),
    });
    return null;
  },
});
