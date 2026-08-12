import { mutationGeneric as mutation } from "convex/server";
import { v } from "convex/values";

import { requireCurrentUser } from "./lib/auth";

const goalType = v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain"));
const pace = v.union(v.literal("slow"), v.literal("recommended"), v.literal("faster"));

export const complete = mutation({
  args: {
    dateOfBirth: v.string(), calculationBasis: v.union(v.literal("female"), v.literal("male")), heightCm: v.number(), currentWeightKg: v.number(), goalWeightKg: v.number(),
    weightUnit: v.union(v.literal("kg"), v.literal("lb")), heightUnit: v.union(v.literal("cm"), v.literal("imperial")), activityLevel: v.union(v.literal("sedentary"), v.literal("light"), v.literal("active"), v.literal("veryActive")), goalType, goalPace: pace,
    locale: v.string(), timezone: v.string(), calories: v.number(), proteinGrams: v.number(), carbsGrams: v.number(), fatGrams: v.number(), effectiveFrom: v.string(), calculationMetadata: v.any(),
    formulaVersion: v.union(v.literal("mifflin-st-jeor-v1"), v.literal("openai-v1")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx); const now = Date.now();
    const profile = await ctx.db.query("userProfiles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const profileData = { userId: user._id, dateOfBirth: args.dateOfBirth, calculationBasis: args.calculationBasis, heightCm: args.heightCm, currentWeightKg: args.currentWeightKg, goalWeightKg: args.goalWeightKg, weightUnit: args.weightUnit, heightUnit: args.heightUnit, activityLevel: args.activityLevel, goalType: args.goalType, goalPace: args.goalPace, locale: args.locale, timezone: args.timezone, updatedAt: now };
    if (profile) await ctx.db.replace(profile._id, profileData); else await ctx.db.insert("userProfiles", profileData);
    await ctx.db.insert("nutritionGoals", { userId: user._id, calories: args.calories, proteinGrams: args.proteinGrams, carbsGrams: args.carbsGrams, fatGrams: args.fatGrams, effectiveFrom: args.effectiveFrom, formulaVersion: args.formulaVersion, calculationMetadata: args.calculationMetadata, isManualOverride: false, createdAt: now });
    await ctx.db.patch(user._id, { onboardingCompleted: true, updatedAt: now });
    return user._id;
  },
});
