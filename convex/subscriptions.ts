import { internalMutationGeneric as internalMutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";
import { requireCurrentUser } from "./lib/auth";

export const getMirror = query({ args: {}, handler: async (ctx) => { const user = await requireCurrentUser(ctx); return ctx.db.query("subscriptionMirror").withIndex("by_user", (q) => q.eq("userId", user._id)).unique(); } });

export const _applyWebhook = internalMutation({
  args: { eventId: v.string(), customerId: v.string(), eventType: v.string(), productId: v.optional(v.string()), periodType: v.optional(v.string()), expirationAt: v.optional(v.number()), willRenew: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const duplicate = await ctx.db.query("subscriptionMirror").withIndex("by_event", (q) => q.eq("eventId", args.eventId)).unique();
    if (duplicate) return duplicate._id;
    const user = await ctx.db.query("users").withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.customerId)).unique();
    if (!user) return null;
    const trial = args.periodType === "TRIAL";
    const state = args.eventType === "EXPIRATION" ? "expired" as const
      : args.eventType === "BILLING_ISSUE" ? "billingIssueActive" as const
        : args.eventType === "CANCELLATION" ? "cancelledActive" as const
          : trial ? "trial" as const : "active" as const;
    const now = Date.now();
    const existing = await ctx.db.query("subscriptionMirror").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const value = { userId: user._id, revenueCatCustomerId: args.customerId, state, productId: args.productId, periodType: args.periodType, expirationAt: args.expirationAt, willRenew: args.willRenew, trial, eventId: args.eventId, verifiedAt: now, updatedAt: now };
    if (existing) { await ctx.db.replace(existing._id, value); return existing._id; }
    return ctx.db.insert("subscriptionMirror", value);
  },
});

export const _applyVerification = internalMutation({
  args: { customerId: v.string(), active: v.boolean(), productId: v.optional(v.string()), expirationAt: v.optional(v.number()), trial: v.boolean() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users").withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.customerId)).unique();
    if (!user) return null;
    const now = Date.now();
    const existing = await ctx.db.query("subscriptionMirror").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const value = { userId: user._id, revenueCatCustomerId: args.customerId, state: args.active ? args.trial ? "trial" as const : "active" as const : "expired" as const, productId: args.productId, expirationAt: args.expirationAt, willRenew: args.active, trial: args.trial, verifiedAt: now, updatedAt: now };
    if (existing) { await ctx.db.patch(existing._id, value); return existing._id; }
    return ctx.db.insert("subscriptionMirror", value);
  },
});
