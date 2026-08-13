import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";
import {
  ageFromDateOfBirth,
  calculateNutritionPlan,
  clampTargetsToBaseline,
  NUTRITION_LIMITS,
} from "./lib/nutrition";
import { upsertGoalForDate } from "./nutritionGoals";
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
  assertBodyMetrics,
  assertLocalDate,
  assertLocale,
  assertTimezone,
} from "./lib/validation";

/**
 * Persists the onboarding result.
 *
 * The server is authoritative for the plan: it recomputes the Mifflin–St Jeor
 * baseline from validated inputs and only accepts the client's AI-suggested
 * targets where they sit within 10% of that baseline. Client-supplied calorie and
 * macro numbers are therefore advisory, never trusted — the previous version
 * inserted them verbatim.
 */
export const complete = mutation({
  args: {
    dateOfBirth: v.string(),
    /** "year" when only a birth year was collected; the month/day are derived. */
    dateOfBirthPrecision: v.union(v.literal("day"), v.literal("year")),
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
    effectiveFrom: v.string(),
    /** Optional AI suggestion. Clamped against the server baseline before use. */
    suggestedTargets: v.optional(
      v.object({
        calories: v.number(),
        proteinGrams: v.number(),
        carbsGrams: v.number(),
        fatGrams: v.number(),
        source: v.union(v.literal("openai-v1"), v.literal("mifflin-st-jeor-v1")),
      }),
    ),
  },
  returns: v.object({
    userId: v.id("users"),
    goalId: v.id("nutritionGoals"),
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const dateOfBirth = assertAdultDateOfBirth(args.dateOfBirth);
    assertBodyMetrics(args);
    assertLocalDate(args.effectiveFrom, "effectiveFrom");
    const locale = assertLocale(args.locale);
    const timezone = assertTimezone(args.timezone);

    const age = ageFromDateOfBirth(dateOfBirth);
    if (age === null || age < NUTRITION_LIMITS.minAge || age > NUTRITION_LIMITS.maxAge) {
      throw new Error(
        `BodyCal supports adults ages ${NUTRITION_LIMITS.minAge} to ${NUTRITION_LIMITS.maxAge}`,
      );
    }

    const inputs = {
      age,
      calculationBasis: args.calculationBasis,
      heightCm: args.heightCm,
      currentWeightKg: args.currentWeightKg,
      goalWeightKg: args.goalWeightKg,
      activityLevel: args.activityLevel,
      goal: args.goalType,
      pace: args.goalPace,
    };
    const baseline = calculateNutritionPlan(inputs);
    const targets = clampTargetsToBaseline(args.suggestedTargets, baseline);
    const aiAccepted =
      args.suggestedTargets?.source === "openai-v1" && targets.calories !== baseline.calories;

    const profileData = {
      userId: user._id,
      dateOfBirth,
      dateOfBirthPrecision: args.dateOfBirthPrecision,
      calculationBasis: args.calculationBasis,
      heightCm: args.heightCm,
      currentWeightKg: args.currentWeightKg,
      goalWeightKg: args.goalWeightKg,
      weightUnit: args.weightUnit,
      heightUnit: args.heightUnit,
      activityLevel: args.activityLevel,
      goalType: args.goalType,
      goalPace: args.goalPace,
      locale,
      timezone,
      updatedAt: now,
    };

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existingProfile) await ctx.db.replace(existingProfile._id, profileData);
    else await ctx.db.insert("userProfiles", profileData);

    const goalId = await upsertGoalForDate(ctx, user._id, {
      ...targets,
      effectiveFrom: args.effectiveFrom,
      formulaVersion: args.suggestedTargets?.source === "openai-v1" ? "openai-v1" : baseline.formulaVersion,
      calculationMetadata: {
        bmr: baseline.bmr,
        tdee: baseline.tdee,
        requestedAdjustment: baseline.requestedAdjustment,
        appliedAdjustment: baseline.appliedAdjustment,
        paceWasCapped: baseline.paceWasCapped,
        aiGenerated: aiAccepted,
        inputs: {
          age,
          calculationBasis: args.calculationBasis,
          heightCm: args.heightCm,
          currentWeightKg: args.currentWeightKg,
          goalWeightKg: args.goalWeightKg,
          activityLevel: args.activityLevel,
          goalType: args.goalType,
          goalPace: args.goalPace,
        },
      },
      isManualOverride: false,
    });

    if (!user.onboardingCompleted) {
      await ctx.db.patch(user._id, { onboardingCompleted: true, updatedAt: now });
    }

    return { userId: user._id, goalId, ...targets };
  },
});
