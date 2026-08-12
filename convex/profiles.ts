import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

import { requireCurrentUser } from "./lib/auth";

const goalType = v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain"));
const pace = v.union(v.literal("slow"), v.literal("recommended"), v.literal("faster"));

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const update = mutation({
  args: {
    dateOfBirth: v.optional(v.string()),
    calculationBasis: v.optional(v.union(v.literal("female"), v.literal("male"))),
    heightCm: v.optional(v.number()),
    currentWeightKg: v.optional(v.number()),
    goalWeightKg: v.optional(v.number()),
    weightUnit: v.optional(v.union(v.literal("kg"), v.literal("lb"))),
    heightUnit: v.optional(v.union(v.literal("cm"), v.literal("imperial"))),
    activityLevel: v.optional(
      v.union(v.literal("sedentary"), v.literal("light"), v.literal("active"), v.literal("veryActive"))
    ),
    goalType: v.optional(goalType),
    goalPace: v.optional(pace),
    locale: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();
    if (!existing) {
      return ctx.db.insert("userProfiles", {
        userId: user._id,
        dateOfBirth: args.dateOfBirth ?? "2000-01-01",
        calculationBasis: args.calculationBasis ?? "male",
        heightCm: args.heightCm ?? 175,
        currentWeightKg: args.currentWeightKg ?? 70,
        goalWeightKg: args.goalWeightKg ?? 70,
        weightUnit: args.weightUnit ?? "kg",
        heightUnit: args.heightUnit ?? "cm",
        activityLevel: args.activityLevel ?? "light",
        goalType: args.goalType ?? "maintain",
        goalPace: args.goalPace ?? "recommended",
        locale: args.locale ?? "en",
        timezone: args.timezone ?? "UTC",
        updatedAt: now,
      });
    }

    await ctx.db.patch(existing._id, {
      ...args,
      updatedAt: now,
    });
    return existing._id;
  },
});
