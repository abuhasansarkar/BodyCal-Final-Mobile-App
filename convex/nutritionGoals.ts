import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  activityLevelValidator,
  calculationBasisValidator,
  goalPaceValidator,
  goalTypeValidator,
} from "./schema";
import { assertDailyTargets, assertLocalDate } from "./lib/validation";

export const calculationMetadataValidator = v.object({
  bmr: v.optional(v.number()),
  tdee: v.optional(v.number()),
  requestedAdjustment: v.optional(v.number()),
  appliedAdjustment: v.optional(v.number()),
  paceWasCapped: v.optional(v.boolean()),
  aiGenerated: v.optional(v.boolean()),
  activityLevel: v.optional(v.string()),
  age: v.optional(v.number()),
  calculationBasis: v.optional(v.string()),
  currentWeightKg: v.optional(v.number()),
  formulaVersion: v.optional(v.string()),
  goal: v.optional(v.string()),
  goalWeightKg: v.optional(v.number()),
  heightCm: v.optional(v.number()),
  heightUnit: v.optional(v.string()),
  pace: v.optional(v.string()),
  weightUnit: v.optional(v.string()),
  aiPlan: v.optional(v.any()),
  inputs: v.optional(
    v.object({
      age: v.optional(v.number()),
      calculationBasis: v.optional(calculationBasisValidator),
      heightCm: v.optional(v.number()),
      currentWeightKg: v.optional(v.number()),
      goalWeightKg: v.optional(v.number()),
      activityLevel: v.optional(activityLevelValidator),
      goalType: v.optional(goalTypeValidator),
      goalPace: v.optional(goalPaceValidator),
      advice: v.optional(v.string()),
      formulaVersion: v.optional(v.string()),
      goal: v.optional(v.string()),
      pace: v.optional(v.string()),
      tdee: v.optional(v.number()),
      bmr: v.optional(v.number()),
      weightUnit: v.optional(v.string()),
      heightUnit: v.optional(v.string()),
    }),
  ),
});

const nutritionGoal = v.object({
  _id: v.id("nutritionGoals"),
  _creationTime: v.number(),
  userId: v.id("users"),
  calories: v.number(),
  proteinGrams: v.number(),
  carbsGrams: v.number(),
  fatGrams: v.number(),
  effectiveFrom: v.string(),
  formulaVersion: v.string(),
  calculationMetadata: calculationMetadataValidator,
  isManualOverride: v.boolean(),
  createdAt: v.number(),
});

/**
 * Writes a goal for `effectiveFrom`, replacing an existing goal for the same day.
 *
 * Historical goals are never rewritten — only the row that already shares this
 * effective date is replaced, so a double-tap in Goal settings cannot leave two
 * goals competing for the same day.
 */
export async function upsertGoalForDate(
  ctx: MutationCtx,
  userId: Id<"users">,
  value: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    effectiveFrom: string;
    formulaVersion: string;
    calculationMetadata: Doc<"nutritionGoals">["calculationMetadata"];
    isManualOverride: boolean;
  },
): Promise<Id<"nutritionGoals">> {
  assertDailyTargets(value);
  assertLocalDate(value.effectiveFrom, "effectiveFrom");

  const rounded = {
    ...value,
    calories: Math.round(value.calories),
    proteinGrams: Math.round(value.proteinGrams),
    carbsGrams: Math.round(value.carbsGrams),
    fatGrams: Math.round(value.fatGrams),
  };

  const sameDay = await ctx.db
    .query("nutritionGoals")
    .withIndex("by_user_effective", (q) =>
      q.eq("userId", userId).eq("effectiveFrom", value.effectiveFrom),
    )
    .unique();

  if (sameDay) {
    await ctx.db.replace(sameDay._id, {
      ...rounded,
      userId,
      createdAt: sameDay.createdAt,
    });
    return sameDay._id;
  }

  return await ctx.db.insert("nutritionGoals", { ...rounded, userId, createdAt: Date.now() });
}

export const getActive = query({
  args: { localDate: v.string() },
  returns: v.union(nutritionGoal, v.null()),
  handler: async (ctx, { localDate }) => {
    assertLocalDate(localDate, "localDate");
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("nutritionGoals")
      .withIndex("by_user_effective", (q) =>
        q.eq("userId", user._id).lte("effectiveFrom", localDate),
      )
      .order("desc")
      .first();
  },
});

export const getHistory = query({
  args: {},
  returns: v.array(nutritionGoal),
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return await ctx.db
      .query("nutritionGoals")
      .withIndex("by_user_effective", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(24);
  },
});

export const createGoal = mutation({
  args: {
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
    effectiveFrom: v.string(),
    isManualOverride: v.boolean(),
    formulaVersion: v.optional(v.string()),
    calculationMetadata: v.optional(calculationMetadataValidator),
  },
  returns: v.id("nutritionGoals"),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    return await upsertGoalForDate(ctx, user._id, {
      calories: args.calories,
      proteinGrams: args.proteinGrams,
      carbsGrams: args.carbsGrams,
      fatGrams: args.fatGrams,
      effectiveFrom: args.effectiveFrom,
      formulaVersion: args.formulaVersion ?? "mifflin-st-jeor-v1",
      calculationMetadata: args.calculationMetadata ?? {},
      isManualOverride: args.isManualOverride,
    });
  },
});
