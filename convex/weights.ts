import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireOwned } from "./lib/auth";
import { NUTRITION_LIMITS } from "./lib/nutrition";
import {
  assertBoundedString,
  assertFiniteInRange,
  assertLocalDate,
  assertOptionalBoundedString,
  assertTimezone,
  boundedLimit,
  LIMITS,
} from "./lib/validation";
import { goalTypeValidator, weightUnitValidator } from "./schema";

const weightLog = v.object({
  _id: v.id("weightLogs"),
  _creationTime: v.number(),
  userId: v.id("users"),
  normalizedKg: v.number(),
  displayValue: v.number(),
  displayUnit: weightUnitValidator,
  localDate: v.string(),
  timezone: v.string(),
  note: v.optional(v.string()),
  clientRequestId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const getHistory = query({
  args: { limit: v.optional(v.number()) },
  returns: v.array(weightLog),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(boundedLimit(args.limit, 100, 500));
  },
});

/**
 * Start / latest / count without reading the whole history.
 *
 * The oldest and newest rows come from the two ends of the date index, and the
 * count is bounded — previously this called `.collect()` on every weight the user
 * had ever logged.
 */
export const getProgress = query({
  args: {},
  returns: v.object({
    startWeightKg: v.union(v.number(), v.null()),
    startLocalDate: v.union(v.string(), v.null()),
    latestWeightKg: v.union(v.number(), v.null()),
    latestLocalDate: v.union(v.string(), v.null()),
    goalWeightKg: v.union(v.number(), v.null()),
    goalType: v.union(goalTypeValidator, v.null()),
    profileWeightKg: v.union(v.number(), v.null()),
    displayUnit: weightUnitValidator,
    entryCount: v.number(),
    countIsCapped: v.boolean(),
  }),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const oldest = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("asc")
      .first();
    const newest = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    const COUNT_CAP = 500;
    const counted = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(COUNT_CAP);

    return {
      startWeightKg: oldest?.normalizedKg ?? null,
      startLocalDate: oldest?.localDate ?? null,
      latestWeightKg: newest?.normalizedKg ?? null,
      latestLocalDate: newest?.localDate ?? null,
      goalWeightKg: profile?.goalWeightKg ?? null,
      goalType: profile?.goalType ?? null,
      profileWeightKg: profile?.currentWeightKg ?? null,
      displayUnit: profile?.weightUnit ?? "kg",
      entryCount: counted.length,
      countIsCapped: counted.length === COUNT_CAP,
    };
  },
});

export const create = mutation({
  args: {
    normalizedKg: v.number(),
    displayValue: v.number(),
    displayUnit: weightUnitValidator,
    localDate: v.string(),
    timezone: v.string(),
    note: v.optional(v.string()),
    clientRequestId: v.string(),
  },
  returns: v.id("weightLogs"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    assertFiniteInRange(
      args.normalizedKg,
      NUTRITION_LIMITS.minWeightKg,
      NUTRITION_LIMITS.maxWeightKg,
      "normalizedKg",
    );
    assertFiniteInRange(args.displayValue, 1, 1_000, "displayValue");
    const localDate = assertLocalDate(args.localDate, "localDate");
    const timezone = assertTimezone(args.timezone);
    const note = assertOptionalBoundedString(args.note, LIMITS.note, "note");
    const clientRequestId = assertBoundedString(args.clientRequestId, 64, "clientRequestId");

    const existing = await ctx.db
      .query("weightLogs")
      .withIndex("by_user_request", (q) =>
        q.eq("userId", user._id).eq("clientRequestId", clientRequestId),
      )
      .unique();
    if (existing) return existing._id;

    const now = Date.now();
    return await ctx.db.insert("weightLogs", {
      userId: user._id,
      normalizedKg: args.normalizedKg,
      displayValue: args.displayValue,
      displayUnit: args.displayUnit,
      localDate,
      timezone,
      note,
      clientRequestId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("weightLogs") },
  returns: v.null(),
  handler: async (ctx, { id }) => {
    const user = await requireCurrentUser(ctx);
    await requireOwned(ctx, id, user._id, "Weight entry");
    await ctx.db.delete(id);
    return null;
  },
});
