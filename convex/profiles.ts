import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import { ageFromDateOfBirth, NUTRITION_LIMITS } from "./lib/nutrition";
import {
  activityLevelValidator,
  calculationBasisValidator,
  goalPaceValidator,
  goalTypeValidator,
  heightUnitValidator,
  weightUnitValidator,
} from "./schema";
import {
  assertAdultDateOfBirth,
  assertFiniteInRange,
  assertLocale,
  assertTimezone,
} from "./lib/validation";

const profile = v.object({
  _id: v.id("userProfiles"),
  _creationTime: v.number(),
  userId: v.id("users"),
  dateOfBirth: v.string(),
  dateOfBirthPrecision: v.optional(v.union(v.literal("day"), v.literal("year"))),
  calculationBasis: calculationBasisValidator,
  heightCm: v.number(),
  currentWeightKg: v.number(),
  goalWeightKg: v.number(),
  weightUnit: weightUnitValidator,
  heightUnit: heightUnitValidator,
  activityLevel: activityLevelValidator,
  goalType: goalTypeValidator,
  goalPace: goalPaceValidator,
  locale: v.string(),
  timezone: v.string(),
  updatedAt: v.number(),
});

export const getCurrent = query({
  args: {},
  returns: v.union(profile, v.null()),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
  },
});

/**
 * Partial profile update.
 *
 * This no longer invents a profile out of defaults. A profile is created only by
 * `onboarding.complete`, which collects every required field; updating a profile
 * that does not exist is an error rather than a silent fabrication of somebody's
 * height, weight, and date of birth.
 */
export const update = mutation({
  args: {
    dateOfBirth: v.optional(v.string()),
    calculationBasis: v.optional(calculationBasisValidator),
    heightCm: v.optional(v.number()),
    currentWeightKg: v.optional(v.number()),
    goalWeightKg: v.optional(v.number()),
    weightUnit: v.optional(weightUnitValidator),
    heightUnit: v.optional(heightUnitValidator),
    activityLevel: v.optional(activityLevelValidator),
    goalType: v.optional(goalTypeValidator),
    goalPace: v.optional(goalPaceValidator),
    locale: v.optional(v.string()),
    timezone: v.optional(v.string()),
  },
  returns: v.id("userProfiles"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    if (!existing) {
      throw new ConvexError("Complete onboarding before updating your profile");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };

    if (args.dateOfBirth !== undefined) {
      patch.dateOfBirth = assertAdultDateOfBirth(args.dateOfBirth);
      patch.dateOfBirthPrecision = "day";
    }
    if (args.heightCm !== undefined) {
      patch.heightCm = assertFiniteInRange(
        args.heightCm,
        NUTRITION_LIMITS.minHeightCm,
        NUTRITION_LIMITS.maxHeightCm,
        "heightCm",
      );
    }
    if (args.currentWeightKg !== undefined) {
      patch.currentWeightKg = assertFiniteInRange(
        args.currentWeightKg,
        NUTRITION_LIMITS.minWeightKg,
        NUTRITION_LIMITS.maxWeightKg,
        "currentWeightKg",
      );
    }
    if (args.goalWeightKg !== undefined) {
      patch.goalWeightKg = assertFiniteInRange(
        args.goalWeightKg,
        NUTRITION_LIMITS.minWeightKg,
        NUTRITION_LIMITS.maxWeightKg,
        "goalWeightKg",
      );
    }
    if (args.locale !== undefined) patch.locale = assertLocale(args.locale);
    if (args.timezone !== undefined) patch.timezone = assertTimezone(args.timezone);
    if (args.calculationBasis !== undefined) patch.calculationBasis = args.calculationBasis;
    if (args.weightUnit !== undefined) patch.weightUnit = args.weightUnit;
    if (args.heightUnit !== undefined) patch.heightUnit = args.heightUnit;
    if (args.activityLevel !== undefined) patch.activityLevel = args.activityLevel;
    if (args.goalType !== undefined) patch.goalType = args.goalType;
    if (args.goalPace !== undefined) patch.goalPace = args.goalPace;

    await ctx.db.patch(existing._id, patch);
    return existing._id;
  },
});

/**
 * Everything the client needs to recalculate a plan, with the stored age already
 * resolved. Returns null when the profile is incomplete so callers cannot
 * silently substitute defaults.
 */
export const getCalculationInputs = query({
  args: {},
  returns: v.union(
    v.object({
      age: v.number(),
      calculationBasis: calculationBasisValidator,
      heightCm: v.number(),
      currentWeightKg: v.number(),
      goalWeightKg: v.number(),
      activityLevel: activityLevelValidator,
      goal: goalTypeValidator,
      pace: goalPaceValidator,
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const record = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (!record) return null;

    const age = ageFromDateOfBirth(record.dateOfBirth);
    if (age === null || age < NUTRITION_LIMITS.minAge || age > NUTRITION_LIMITS.maxAge) return null;

    return {
      age,
      calculationBasis: record.calculationBasis,
      heightCm: record.heightCm,
      currentWeightKg: record.currentWeightKg,
      goalWeightKg: record.goalWeightKg,
      activityLevel: record.activityLevel,
      goal: record.goalType,
      pace: record.goalPace,
    };
  },
});
