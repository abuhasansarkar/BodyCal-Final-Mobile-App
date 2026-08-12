import { internalMutationGeneric as internalMutation, mutationGeneric as mutation } from "convex/server";
import { ConvexError, v } from "convex/values";

import { requireCurrentUser } from "./lib/auth";

export const generateUploadUrl = mutation({ args: {}, handler: async (ctx) => { await requireCurrentUser(ctx); return ctx.storage.generateUploadUrl(); } });

export const _begin = internalMutation({
  args: { storageId: v.id("_storage"), requestId: v.string(), locale: v.string(), provider: v.string(), model: v.string() },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const metadata = await ctx.db.system.get(args.storageId);
    if (!metadata || metadata.size > 4_000_000 || !metadata.contentType?.startsWith("image/")) throw new ConvexError("Invalid image upload");
    const existing = await ctx.db.query("aiScans").withIndex("by_user_request", (q) => q.eq("userId", user._id)).filter((q) => q.eq(q.field("requestId"), args.requestId)).unique();
    if (existing) return { scanId: existing._id, duplicate: true, estimate: existing.estimate };
    const subscription = await ctx.db.query("subscriptionMirror").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const allowedStates = new Set(["trial", "active", "cancelledActive", "billingIssueActive"]);
    if (!subscription || !allowedStates.has(subscription.state) || (subscription.expirationAt && subscription.expirationAt <= Date.now())) throw new ConvexError("Pro entitlement required");
    const now = Date.now();
    const scans = await ctx.db.query("aiScans").withIndex("by_user_created", (q) => q.eq("userId", user._id)).filter((q) => q.gte(q.field("createdAt"), now - 31 * 86_400_000)).collect();
    const dailyCount = scans.filter((scan) => scan.createdAt >= now - 86_400_000 && scan.status !== "failed").length;
    const startOfMonth = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), 1);
    const monthlyCount = scans.filter((scan) => scan.createdAt >= startOfMonth && scan.status !== "failed").length;
    if (dailyCount >= 10 || monthlyCount >= 150) throw new ConvexError("AI scan fair-use limit reached");
    const scanId = await ctx.db.insert("aiScans", { userId: user._id, requestId: args.requestId, imageStorageId: args.storageId, status: "processing", provider: args.provider, model: args.model, locale: args.locale, retentionUntil: now + 86_400_000, createdAt: now, updatedAt: now });
    return { scanId, duplicate: false, estimate: undefined };
  },
});

export const _complete = internalMutation({ args: { scanId: v.id("aiScans"), estimate: v.any(), latencyMs: v.number(), inputTokens: v.optional(v.number()), outputTokens: v.optional(v.number()) }, handler: async (ctx, args) => { const user = await requireCurrentUser(ctx); const scan = await ctx.db.get(args.scanId); if (!scan || scan.userId !== user._id) throw new ConvexError("Scan not found"); await ctx.db.patch(args.scanId, { status: "completed", estimate: args.estimate, confidence: args.estimate.confidence, latencyMs: args.latencyMs, inputTokens: args.inputTokens, outputTokens: args.outputTokens, updatedAt: Date.now() }); } });
export const _fail = internalMutation({ args: { scanId: v.id("aiScans"), failureCategory: v.string(), latencyMs: v.number() }, handler: async (ctx, args) => { const user = await requireCurrentUser(ctx); const scan = await ctx.db.get(args.scanId); if (scan?.userId === user._id) await ctx.db.patch(args.scanId, { status: "failed", failureCategory: args.failureCategory, latencyMs: args.latencyMs, updatedAt: Date.now() }); } });
