import { makeFunctionReference, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { requireCurrentUser, requireIdentity } from "./lib/auth";

export const getCurrent = query({ args: {}, handler: async (ctx) => { try { return await requireCurrentUser(ctx); } catch { return null; } } });

export const syncFromClerk = mutation({
  args: { email: v.string(), name: v.optional(v.string()), avatarUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db.query("users").withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject)).unique();
    const now = Date.now();
    if (existing) { await ctx.db.patch(existing._id, { ...args, updatedAt: now }); return existing._id; }
    return ctx.db.insert("users", { clerkUserId: identity.subject, ...args, onboardingCompleted: false, lifecycleState: "active", createdAt: now, updatedAt: now });
  },
});

const buildExport = makeFunctionReference<"action">("usersActions:buildExport");
const executeDeletion = makeFunctionReference<"action">("usersActions:executeDeletion");

export const requestExport = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const jobId = await ctx.db.insert("exportJobs", { userId: user._id, status: "pending", createdAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, buildExport, { jobId, userId: user._id });
    return jobId;
  },
});

export const requestDeletion = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    if (user.lifecycleState !== "deletionPending") await ctx.db.patch(user._id, { lifecycleState: "deletionPending", updatedAt: Date.now() });
    const existing = await ctx.db.query("deletionJobs").withIndex("by_user", (q) => q.eq("userId", user._id)).first();
    if (existing) {
      if (existing.status === "failed") {
        await ctx.db.patch(existing._id, { status: "pending", errorCategory: undefined, updatedAt: Date.now() });
        await ctx.scheduler.runAfter(0, executeDeletion, { jobId: existing._id, userId: user._id, clerkUserId: user.clerkUserId });
      }
      return existing._id;
    }
    const now = Date.now();
    const jobId = await ctx.db.insert("deletionJobs", { userId: user._id, clerkUserId: user.clerkUserId, status: "pending", createdAt: now, updatedAt: now });
    await ctx.scheduler.runAfter(0, executeDeletion, { jobId, userId: user._id, clerkUserId: user.clerkUserId });
    return jobId;
  },
});
