"use node";

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import { action } from "./_generated/server";
import { v } from "convex/values";

// ---------------------------------------------------------------------------
// Output schema returned from OpenAI
// ---------------------------------------------------------------------------
const planSchema = z.object({
  calories: z.number().int().min(1_000).max(5_000),
  proteinGrams: z.number().int().min(30).max(500),
  carbsGrams: z.number().int().min(0).max(1_500),
  fatGrams: z.number().int().min(20).max(500),
  goalTitle: z.string().min(1).max(120),
  goalDescription: z.string().min(1).max(280),
  reasoning: z.string().max(500),
});

export type AiPlanResult = z.infer<typeof planSchema> & {
  paceWasCapped: boolean;
  formulaVersion: "openai-v1" | "mifflin-st-jeor-v1";
};

// ---------------------------------------------------------------------------
// Simple local Mifflin–St Jeor baseline (mirrors src/domain/nutrition-calculator.ts)
// Run server-side so we can constrain the OpenAI output.
// ---------------------------------------------------------------------------
function localBaseline(args: {
  calculationBasis: "female" | "male";
  age: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: "sedentary" | "light" | "active" | "veryActive";
  goal: "lose" | "maintain" | "gain";
  pace: "slow" | "recommended" | "faster";
}) {
  const activityMultiplier = {
    sedentary: 1.2,
    light: 1.375,
    active: 1.55,
    veryActive: 1.725,
  }[args.activityLevel];

  const bmr =
    10 * args.currentWeightKg +
    6.25 * args.heightCm -
    5 * args.age +
    (args.calculationBasis === "male" ? 5 : -161);
  const tdee = bmr * activityMultiplier;

  const requestedAdj = {
    lose: { slow: -250, recommended: -500, faster: -750 }[args.pace],
    gain: { slow: 150, recommended: 300, faster: 500 }[args.pace],
    maintain: 0,
  }[args.goal] as number;

  const cap =
    args.goal === "lose"
      ? tdee * 0.2
      : args.goal === "gain"
        ? tdee * 0.15
        : 0;
  const applied =
    Math.sign(requestedAdj) * Math.min(Math.abs(requestedAdj), cap);
  const minCal = args.calculationBasis === "female" ? 1_200 : 1_500;
  const calories =
    Math.round(Math.min(5_000, Math.max(minCal, tdee + applied)) / 10) * 10;
  const paceWasCapped = Math.abs(applied - requestedAdj) > 10;

  const refWeight =
    args.goal === "lose" ? args.goalWeightKg : args.currentWeightKg;
  const protein = refWeight * (args.goal === "maintain" ? 1.4 : 1.6);
  const minFat = refWeight * 0.8;
  let fat = Math.min((calories * 0.35) / 9, Math.max(minFat, (calories * 0.25) / 9));
  let carbs = (calories - protein * 4 - fat * 9) / 4;
  if (carbs < 100) {
    const deficit = 400 - carbs * 4;
    const reducFat = Math.min(deficit, Math.max(0, (fat - minFat) * 9));
    fat -= reducFat / 9;
    carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  }

  return {
    calories,
    proteinGrams: Math.round(protein),
    carbsGrams: Math.round(carbs),
    fatGrams: Math.round(fat),
    paceWasCapped,
  };
}

// ---------------------------------------------------------------------------
// Validate that the AI numbers are within 10% of the baseline; if not, clamp.
// This ensures safety floors are always respected.
// ---------------------------------------------------------------------------
function clampToBaseline(
  ai: z.infer<typeof planSchema>,
  base: ReturnType<typeof localBaseline>,
) {
  const within = (v: number, ref: number) => Math.abs(v - ref) / ref <= 0.1;
  return {
    calories: within(ai.calories, base.calories) ? ai.calories : base.calories,
    proteinGrams: within(ai.proteinGrams, base.proteinGrams)
      ? ai.proteinGrams
      : base.proteinGrams,
    carbsGrams: within(ai.carbsGrams, base.carbsGrams)
      ? ai.carbsGrams
      : base.carbsGrams,
    fatGrams: within(ai.fatGrams, base.fatGrams)
      ? ai.fatGrams
      : base.fatGrams,
    goalTitle: ai.goalTitle,
    goalDescription: ai.goalDescription,
    reasoning: ai.reasoning,
  };
}

// ---------------------------------------------------------------------------
// Public action — called unauthenticated from the onboarding calculating screen
// ---------------------------------------------------------------------------
export const generate = action({
  args: {
    calculationBasis: v.union(v.literal("female"), v.literal("male")),
    age: v.number(),
    heightCm: v.number(),
    currentWeightKg: v.number(),
    goalWeightKg: v.number(),
    activityLevel: v.union(
      v.literal("sedentary"),
      v.literal("light"),
      v.literal("active"),
      v.literal("veryActive"),
    ),
    goal: v.union(v.literal("lose"), v.literal("maintain"), v.literal("gain")),
    pace: v.union(
      v.literal("slow"),
      v.literal("recommended"),
      v.literal("faster"),
    ),
    locale: v.string(),
  },
  handler: async (_ctx, args): Promise<AiPlanResult> => {
    // Always compute local baseline first (safety floors guaranteed)
    const base = localBaseline(args);

    // Try OpenAI — prefer the user-supplied key, fall back to the generic AI key
    const apiKey =
      process.env.OPEN_AI_API_SECRET_KEY ?? process.env.AI_API_KEY;
    if (!apiKey) {
      // No key configured — return local baseline with neutral copy
      return {
        ...base,
        goalTitle: args.goal === "lose"
          ? "Reach your weight-loss goal"
          : args.goal === "gain"
            ? "Reach your weight-gain goal"
            : "Maintain your healthy weight",
        goalDescription: "Build steadily with a sustainable approach.",
        reasoning: "Generated from the local calculator (AI not configured).",
        formulaVersion: "mifflin-st-jeor-v1",
      };
    }

    const model = process.env.AI_MODEL ?? "gpt-4o-mini";
    const goalLabel =
      args.goal === "lose"
        ? "lose weight"
        : args.goal === "gain"
          ? "gain weight"
          : "maintain weight";
    const activityLabel = {
      sedentary: "sedentary (little or no exercise)",
      light: "lightly active (light exercise 1–3 days/week)",
      active: "moderately active (moderate exercise 3–5 days/week)",
      veryActive: "very active (hard exercise 6–7 days/week)",
    }[args.activityLevel];
    const paceLabel = {
      slow: "slow and steady",
      recommended: "recommended",
      faster: "faster",
    }[args.pace];

    const prompt = `
You are a certified nutrition expert. A user has completed their health onboarding.
Generate a personalized nutrition plan for them.

User profile:
- Gender: ${args.calculationBasis}
- Age: ${args.age} years
- Height: ${args.heightCm} cm
- Current weight: ${args.currentWeightKg} kg
- Goal weight: ${args.goalWeightKg} kg
- Activity level: ${activityLabel}
- Primary goal: ${goalLabel} (${paceLabel} pace)

Calculated safe baseline (you MUST stay within 10% of these values):
- Calories: ${base.calories} kcal/day
- Protein: ${base.proteinGrams}g
- Carbohydrates: ${base.carbsGrams}g
- Fat: ${base.fatGrams}g

Instructions:
1. Return calories, proteinGrams, carbsGrams, and fatGrams within ±10% of the baseline values.
2. Write a short, motivating goalTitle (max 10 words) for this user's specific goal.
3. Write a goalDescription (1–2 sentences, max 50 words) explaining their plan approach.
4. Write brief reasoning (1 sentence) for the macro split.
5. IMPORTANT: Write goalTitle, goalDescription, and reasoning in the "${args.locale}" language/locale. If "${args.locale}" is "en", write in English. If "es", write in Spanish, etc.
6. Never claim precision; label results as estimates.
7. Do not mention medical conditions or diagnoses.
`.trim();

    try {
      const client = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 1 });
      const response = await client.responses.parse({
        model,
        input: [{ role: "user", content: prompt }],
        text: { format: zodTextFormat(planSchema, "nutrition_plan") },
      });

      if (!response.output_parsed) {
        throw new Error("No structured output from OpenAI");
      }

      const clamped = clampToBaseline(response.output_parsed, base);

      return {
        ...clamped,
        paceWasCapped: base.paceWasCapped,
        formulaVersion: "openai-v1",
      };
    } catch {
      // Any OpenAI failure → return local baseline silently
      return {
        ...base,
        goalTitle: args.goal === "lose"
          ? "Reach your weight-loss goal"
          : args.goal === "gain"
            ? "Reach your weight-gain goal"
            : "Maintain your healthy weight",
        goalDescription: "Build steadily with a sustainable approach.",
        reasoning: "Generated from the local calculator.",
        formulaVersion: "mifflin-st-jeor-v1",
      };
    }
  },
});
