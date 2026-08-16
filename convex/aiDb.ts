import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { providerModel, readProviderConfig } from "./lib/aiProvider";
import { attachOwnedUpload, loadOwned, requireCurrentUser } from "./lib/auth";
import { readStoredEstimate, storedEstimateValidator } from "./lib/estimate";
import { consumeRateLimit } from "./lib/rateLimit";
import { assertLocale } from "./lib/validation";

const ABANDONED_IMAGE_RETENTION_MS = 24 * 60 * 60 * 1_000;
const DAILY_SCAN_LIMIT = 10;
const MONTHLY_SCAN_LIMIT = 150;
const ENTITLED_STATES = new Set(["trial", "active", "cancelledActive", "billingIssueActive"]);

/**
 * Provider attempts allowed per scan, retries included.
 *
 * Every attempt past the first is a second paid request against the same photo,
 * so this stays small: it exists to ride out a timeout or a 503, not to grind
 * against a request the provider is never going to accept.
 */
export const MAX_SCAN_ATTEMPTS = 3;

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

/**
 * Whether this deployment can reach an AI provider at all, and under which
 * variable it found the key.
 *
 * Answers the one question a failed scan cannot: is the key actually visible to
 * the deployment? A key set only in a local `.env`, or set as `OPENAI_API_KEY`
 * when the code reads `AI_API_KEY`, produces exactly the same user-facing
 * failure as a provider outage.
 *
 * Returns no secret — only which variable name supplied a value, and the model
 * in use. Requires an authenticated caller regardless.
 */
export const getProviderStatus = query({
  args: {},
  returns: v.object({
    configured: v.boolean(),
    keySource: v.union(v.string(), v.null()),
    model: v.string(),
  }),
  handler: async (ctx) => {
    await requireCurrentUser(ctx);
    const provider = readProviderConfig();
    return {
      configured: provider !== null,
      keySource: provider?.keySource ?? null,
      model: providerModel(),
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
      // Queued, not running. The scan is durable before any provider call is
      // made, so a client that disappears mid-analysis loses nothing.
      status: "pending",
      provider: args.provider,
      model: args.model,
      locale,
      attempts: 0,
      retentionUntil: now + ABANDONED_IMAGE_RETENTION_MS,
      createdAt: now,
      updatedAt: now,
    });
    return { scanId, duplicate: false, estimate: undefined };
  },
});

/**
 * Atomically takes ownership of a queued scan, or refuses.
 *
 * This is the single point that decides whether a paid provider call happens.
 * Mutations are transactions, so two schedulings of the same scan cannot both
 * claim it: the first moves `pending → processing`, the second sees a status
 * that is no longer `pending` and gets null. Every duplicate path — a retried
 * schedule, a resumed client, a user tapping Analyze twice — converges here.
 */
export const claimForAnalysis = internalMutation({
  args: { scanId: v.id("aiScans") },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      locale: v.string(),
      model: v.string(),
      attempt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { scanId }) => {
    const scan = await ctx.db.get(scanId);
    if (!scan || scan.status !== "pending") return null;

    const attempt = (scan.attempts ?? 0) + 1;
    await ctx.db.patch(scanId, { status: "processing", attempts: attempt, updatedAt: Date.now() });
    return {
      storageId: scan.imageStorageId,
      locale: scan.locale,
      model: scan.model,
      attempt,
    };
  },
});

/*
  `complete` and `fail` are reached only from the scheduled analysis action,
  which runs with no identity at all — a scheduled function is not "the user",
  and `ctx.auth` is empty inside it. They therefore take ownership from the scan
  row itself rather than from `ctx.auth`. That is not a weakening: both are
  `internalMutation`s, unreachable from any client, and the scan row's `userId`
  was written under a checked identity by `begin`.
*/

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
    const scan = await ctx.db.get(args.scanId);
    if (!scan) throw new ConvexError("Scan not found");
    // A scan that already produced a result is never overwritten: the user may
    // already be editing it.
    if (scan.status === "completed") return null;

    await ctx.db.patch(args.scanId, {
      status: "completed",
      estimate: args.estimate,
      confidence: args.confidence,
      latencyMs: args.latencyMs,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      failureCategory: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});

/**
 * Records a failed attempt, and either re-queues it or gives up.
 *
 * Retry scheduling lives here rather than in the action so that "increment the
 * attempt count and queue the next try" is one transaction. An action that
 * crashed between those two steps would otherwise leave a scan stuck in
 * `processing` with nothing scheduled to move it — a spinner with no end.
 */
export const fail = internalMutation({
  args: {
    scanId: v.id("aiScans"),
    failureCategory: v.string(),
    latencyMs: v.number(),
    /** Set for transient provider faults; absent means the request itself is bad. */
    retryInMs: v.optional(v.number()),
  },
  returns: v.object({ retrying: v.boolean() }),
  handler: async (ctx, args) => {
    const scan = await ctx.db.get(args.scanId);
    if (!scan) return { retrying: false };

    const failureCategory = args.failureCategory.slice(0, 64);
    const attempts = scan.attempts ?? 1;
    const retrying = args.retryInMs !== undefined && attempts < MAX_SCAN_ATTEMPTS;

    await ctx.db.patch(args.scanId, {
      // Back to queued, so the same row is picked up again by `claimForAnalysis`.
      // The scan id never changes, so no duplicate scan and no duplicate log.
      status: retrying ? "pending" : "failed",
      failureCategory,
      latencyMs: args.latencyMs,
      updatedAt: Date.now(),
    });

    if (retrying) {
      await ctx.scheduler.runAfter(args.retryInMs ?? 0, internal.ai.runScanAnalysis, {
        scanId: args.scanId,
      });
    }
    return { retrying };
  },
});

/**
 * One scan, for the user who owns it.
 *
 * The scan screen subscribes to this instead of awaiting the analysis call, so
 * `pending → processing → completed` arrives over the existing Convex
 * subscription. Closing the app, locking the phone or reopening the screen
 * rejoins the same scan rather than starting a new one.
 */
export const getScan = query({
  args: { scanId: v.id("aiScans") },
  returns: v.union(
    v.object({
      scanId: v.id("aiScans"),
      status: v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("completed"),
        v.literal("failed"),
      ),
      estimate: v.union(storedEstimateValidator, v.null()),
      imageUrl: v.union(v.string(), v.null()),
      imageStorageId: v.optional(v.id("_storage")),
      failureCategory: v.union(v.string(), v.null()),
      retryable: v.boolean(),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, { scanId }) => {
    const user = await requireCurrentUser(ctx);
    // Returns null rather than throwing for another user's scan: a scan id is
    // not a secret worth confirming the existence of.
    const scan = await loadOwned(ctx, scanId, user._id);
    if (!scan) return null;

    return {
      scanId: scan._id,
      status: scan.status,
      estimate: readStoredEstimate(scan.correctedEstimate ?? scan.estimate, scan.confidence),
      // Read from storage rather than stored, so a swept image reports as gone
      // instead of handing the client a dead URL.
      imageUrl: scan.imageDeletedAt ? null : await ctx.storage.getUrl(scan.imageStorageId),
      imageStorageId: scan.imageDeletedAt ? undefined : scan.imageStorageId,
      failureCategory: scan.failureCategory ?? null,
      retryable: scan.status === "failed" && (scan.attempts ?? 0) < MAX_SCAN_ATTEMPTS,
      createdAt: scan.createdAt,
    };
  },
});

/**
 * Re-queues a failed scan against the image already uploaded.
 *
 * Only a `failed` scan can be re-queued. A `pending` or `processing` scan is
 * already on its way and re-queueing it would buy a second provider call for
 * the same photo; a `completed` one has its answer.
 */
export const retryScan = mutation({
  args: { scanId: v.id("aiScans") },
  returns: v.object({ requeued: v.boolean() }),
  handler: async (ctx, { scanId }) => {
    const user = await requireCurrentUser(ctx);
    const scan = await loadOwned(ctx, scanId, user._id);
    if (!scan) throw new ConvexError("Scan not found");
    if (scan.status !== "failed") return { requeued: false };
    if (scan.imageDeletedAt) throw new ConvexError("Image is no longer available");
    if ((scan.attempts ?? 0) >= MAX_SCAN_ATTEMPTS) throw new ConvexError("Meal analysis failed");

    // A manual retry is a fresh paid request, so it is rate limited like a new
    // scan. It deliberately does not consume daily quota again: the user is not
    // getting a second estimate, they are still waiting on the first.
    await consumeRateLimit(ctx, "aiScan", user._id);

    await ctx.db.patch(scanId, { status: "pending", failureCategory: undefined, updatedAt: Date.now() });
    await ctx.scheduler.runAfter(0, internal.ai.runScanAnalysis, { scanId });
    return { requeued: true };
  },
});

/**
 * Records a user correction on a completed scan so their adjustments can be
 * preserved alongside the original estimate for model review.
 */
export const recordCorrection = mutation({
  args: {
    scanId: v.id("aiScans"),
    correctedEstimate: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const scan = await loadOwned(ctx, args.scanId, user._id);
    if (!scan) throw new ConvexError("Scan not found");

    await ctx.db.patch(args.scanId, {
      correctedEstimate: args.correctedEstimate,
      updatedAt: Date.now(),
    });
    return null;
  },
});
