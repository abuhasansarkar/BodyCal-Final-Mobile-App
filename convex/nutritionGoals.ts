import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

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
  calculationMetadata: v.any(),
  isManualOverride: v.boolean(),
  createdAt: v.number(),
});

function isValidLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1_000 || month < 1 || month > 12 || day < 1) return false;

  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export const getActive = query({
  args: { localDate: v.string() },
  returns: v.union(nutritionGoal, v.null()),
  handler: async (ctx, { localDate }) => {
    if (!isValidLocalDate(localDate)) {
      throw new ConvexError("localDate must use the YYYY-MM-DD format");
    }

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

export const createGoal = mutation({
  args: {
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
    effectiveFrom: v.string(),
    isManualOverride: v.boolean(),
    formulaVersion: v.optional(v.string()),
    calculationMetadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (!isValidLocalDate(args.effectiveFrom)) throw new ConvexError("Invalid effectiveFrom date");
    if (args.calories < 1200 || args.calories > 6000) throw new ConvexError("Calories must be between 1,200 and 6,000");

    const now = Date.now();
    return ctx.db.insert("nutritionGoals", {
      userId: user._id,
      calories: Math.round(args.calories),
      proteinGrams: Math.round(args.proteinGrams),
      carbsGrams: Math.round(args.carbsGrams),
      fatGrams: Math.round(args.fatGrams),
      effectiveFrom: args.effectiveFrom,
      isManualOverride: args.isManualOverride,
      formulaVersion: args.formulaVersion ?? "mifflin-st-jeor-v1",
      calculationMetadata: args.calculationMetadata ?? {},
      createdAt: now,
    });
  },
});
