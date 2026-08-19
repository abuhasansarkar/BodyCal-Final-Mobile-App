import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { assertClockTime, assertTimezone } from "./lib/validation";

/**
 * Reminder categories are a closed set. The previous `v.record` accepted any keys
 * and any values, which let a client store arbitrary blobs in a preferences row.
 */
const categoriesValidator = v.object({
  daily: v.boolean(),
  meal: v.boolean(),
  hydration: v.boolean(),
  progress: v.boolean(),
  motivation: v.boolean(),
});

const timesValidator = v.object({
  daily: v.string(),
  meal: v.string(),
  hydration: v.string(),
  progress: v.string(),
  motivation: v.string(),
});

const permissionStatusValidator = v.union(
  v.literal("granted"),
  v.literal("denied"),
  v.literal("undetermined"),
  v.literal("not_requested"),
);

const preferences = v.object({
  enabled: v.boolean(),
  categories: categoriesValidator,
  times: timesValidator,
  quietHoursStart: v.optional(v.string()),
  quietHoursEnd: v.optional(v.string()),
  timezone: v.string(),
  permissionStatus: permissionStatusValidator,
  updatedAt: v.number(),
});

export const DEFAULT_TIMES = {
  daily: "20:00",
  meal: "08:00",
  hydration: "11:00",
  progress: "09:00",
  motivation: "18:00",
} as const;

export const getPreferences = query({
  args: {},
  returns: v.union(preferences, v.null()),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const record = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!record) return null;
    return {
      enabled: record.enabled,
      categories: record.categories,
      times: record.times,
      quietHoursStart: record.quietHoursStart,
      quietHoursEnd: record.quietHoursEnd,
      timezone: record.timezone,
      permissionStatus: record.permissionStatus,
      updatedAt: record.updatedAt,
    };
  },
});

export const updatePreferences = mutation({
  args: {
    enabled: v.boolean(),
    categories: categoriesValidator,
    times: timesValidator,
    quietHoursStart: v.optional(v.string()),
    quietHoursEnd: v.optional(v.string()),
    timezone: v.string(),
    permissionStatus: permissionStatusValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    for (const [key, value] of Object.entries(args.times)) {
      assertClockTime(value, `times.${key}`);
    }
    if (args.quietHoursStart !== undefined) assertClockTime(args.quietHoursStart, "quietHoursStart");
    if (args.quietHoursEnd !== undefined) assertClockTime(args.quietHoursEnd, "quietHoursEnd");

    const value = {
      userId: user._id,
      enabled: args.enabled,
      categories: args.categories,
      times: args.times,
      quietHoursStart: args.quietHoursStart,
      quietHoursEnd: args.quietHoursEnd,
      timezone: assertTimezone(args.timezone),
      permissionStatus: args.permissionStatus,
      updatedAt: Date.now(),
    };

    const existing = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existing) await ctx.db.replace(existing._id, value);
    else await ctx.db.insert("notificationPreferences", value);
    return null;
  },
});
