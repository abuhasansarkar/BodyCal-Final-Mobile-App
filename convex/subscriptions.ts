import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, query, type MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

type MirrorState = Doc<"subscriptionMirror">["state"];

const mirrorStateValidator = v.union(
  v.literal("trial"),
  v.literal("active"),
  v.literal("cancelledActive"),
  v.literal("billingIssueActive"),
  v.literal("expired"),
);

const eventPayloadValidator = v.object({
  productId: v.optional(v.string()),
  periodType: v.optional(v.string()),
  expirationAt: v.optional(v.number()),
  willRenew: v.optional(v.boolean()),
});

/**
 * RevenueCat remains the source of truth for entitlement. This table is only a
 * server-side gating mirror and never an independent record of purchase.
 */
export const getMirror = query({
  args: {},
  returns: v.union(
    v.object({
      state: mirrorStateValidator,
      productId: v.optional(v.string()),
      expirationAt: v.optional(v.number()),
      willRenew: v.optional(v.boolean()),
      trial: v.boolean(),
      verifiedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const mirror = await ctx.db
      .query("subscriptionMirror")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!mirror) return null;
    return {
      state: mirror.state,
      productId: mirror.productId,
      expirationAt: mirror.expirationAt,
      willRenew: mirror.willRenew,
      trial: mirror.trial,
      verifiedAt: mirror.verifiedAt,
    };
  },
});

function stateFromEvent(eventType: string, periodType: string | undefined): MirrorState {
  const trial = periodType?.toUpperCase() === "TRIAL";
  switch (eventType.toUpperCase()) {
    case "EXPIRATION":
    case "SUBSCRIPTION_PAUSED":
      return "expired";
    case "BILLING_ISSUE":
      return "billingIssueActive";
    case "CANCELLATION":
    case "UNSUBSCRIBE":
      return "cancelledActive";
    case "TRANSFER":
      return "expired";
    default:
      return trial ? "trial" : "active";
  }
}

async function applyEventToMirror(
  ctx: MutationCtx,
  userId: Id<"users">,
  event: {
    eventId: string;
    customerId: string;
    eventType: string;
    eventAt: number;
    productId?: string;
    periodType?: string;
    expirationAt?: number;
    willRenew?: boolean;
  },
) {
  const existing = await ctx.db
    .query("subscriptionMirror")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  // Out-of-order delivery guard: never let an older store event overwrite newer state.
  if (existing && existing.lastEventAt !== undefined && event.eventAt < existing.lastEventAt) {
    return { applied: false, reason: "stale_event" as const };
  }

  const state = stateFromEvent(event.eventType, event.periodType);
  const now = Date.now();
  const value = {
    userId,
    revenueCatCustomerId: event.customerId,
    state,
    productId: event.productId,
    periodType: event.periodType,
    expirationAt: event.expirationAt,
    // Reported by the store. Never inferred from "is currently active".
    willRenew: event.willRenew,
    trial: event.periodType?.toUpperCase() === "TRIAL",
    lastEventAt: event.eventAt,
    eventId: event.eventId,
    verifiedAt: now,
    updatedAt: now,
  };

  if (existing) await ctx.db.replace(existing._id, value);
  else await ctx.db.insert("subscriptionMirror", value);
  return { applied: true, reason: "applied" as const };
}

/**
 * Applies one RevenueCat webhook event.
 *
 * Replay protection lives in `subscriptionEvents`, an append-only log, because
 * the mirror row is overwritten on every state change and therefore remembers
 * only the most recent event id. Events for a customer whose Convex user does
 * not exist yet are stored unapplied and replayed by `applyPendingEvents` once
 * `users.syncFromClerk` creates the row — previously they were dropped.
 */
export const applyWebhook = internalMutation({
  args: {
    eventId: v.string(),
    customerId: v.string(),
    eventType: v.string(),
    eventAt: v.number(),
    payload: eventPayloadValidator,
  },
  returns: v.object({ status: v.string() }),
  handler: async (ctx, args) => {
    const duplicate = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (duplicate) return { status: "duplicate" };

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.customerId))
      .unique();

    if (!user) {
      await ctx.db.insert("subscriptionEvents", {
        eventId: args.eventId,
        customerId: args.customerId,
        eventType: args.eventType,
        eventAt: args.eventAt,
        applied: false,
        pendingReason: "unknown_customer",
        payload: args.payload,
        receivedAt: Date.now(),
      });
      return { status: "pending" };
    }

    const result = await applyEventToMirror(ctx, user._id, {
      eventId: args.eventId,
      customerId: args.customerId,
      eventType: args.eventType,
      eventAt: args.eventAt,
      ...args.payload,
    });

    await ctx.db.insert("subscriptionEvents", {
      eventId: args.eventId,
      customerId: args.customerId,
      eventType: args.eventType,
      eventAt: args.eventAt,
      applied: result.applied,
      pendingReason: result.applied ? undefined : result.reason,
      payload: args.payload,
      receivedAt: Date.now(),
    });

    return { status: result.reason };
  },
});

/** Replays events that arrived before the Convex user record existed. */
export const applyPendingEvents = internalMutation({
  args: { customerId: v.string() },
  returns: v.object({ applied: v.number() }),
  handler: async (ctx, { customerId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", customerId))
      .unique();
    if (!user) return { applied: 0 };

    const pending = await ctx.db
      .query("subscriptionEvents")
      .withIndex("by_pending", (q) => q.eq("applied", false).eq("customerId", customerId))
      .take(50);

    // Oldest first, so the newest store state wins.
    pending.sort((a, b) => a.eventAt - b.eventAt);

    let applied = 0;
    for (const event of pending) {
      const result = await applyEventToMirror(ctx, user._id, {
        eventId: event.eventId,
        customerId: event.customerId,
        eventType: event.eventType,
        eventAt: event.eventAt,
        ...event.payload,
      });
      await ctx.db.patch(event._id, {
        applied: true,
        pendingReason: result.applied ? undefined : result.reason,
      });
      if (result.applied) applied += 1;
    }

    return { applied };
  },
});

/**
 * Writes the result of a direct RevenueCat REST verification.
 *
 * Unlike a webhook this carries no store event timestamp, so it never clears
 * `lastEventAt` and never claims to know `willRenew` unless RevenueCat said so.
 */
export const applyVerification = internalMutation({
  args: {
    customerId: v.string(),
    active: v.boolean(),
    trial: v.boolean(),
    productId: v.optional(v.string()),
    periodType: v.optional(v.string()),
    expirationAt: v.optional(v.number()),
    willRenew: v.optional(v.boolean()),
    unsubscribeDetected: v.optional(v.boolean()),
    billingIssueDetected: v.optional(v.boolean()),
  },
  returns: v.union(v.id("subscriptionMirror"), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.customerId))
      .unique();
    if (!user) return null;

    const state: MirrorState = !args.active
      ? "expired"
      : args.billingIssueDetected
        ? "billingIssueActive"
        : args.trial
          ? "trial"
          : args.unsubscribeDetected || args.willRenew === false
            ? "cancelledActive"
            : "active";

    const existing = await ctx.db
      .query("subscriptionMirror")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();
    const value = {
      userId: user._id,
      revenueCatCustomerId: args.customerId,
      state,
      productId: args.productId,
      periodType: args.periodType,
      expirationAt: args.expirationAt,
      willRenew: args.willRenew,
      trial: args.trial,
      lastEventAt: existing?.lastEventAt,
      eventId: existing?.eventId,
      verifiedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, value);
      return existing._id;
    }
    return await ctx.db.insert("subscriptionMirror", value);
  },
});
