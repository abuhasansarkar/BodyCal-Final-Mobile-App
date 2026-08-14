"use node";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import { logProviderMisconfiguration, readProviderConfig } from "./lib/aiProvider";
import {
  assertNutritionInput,
  calculateNutritionPlan,
  clampTargetsToBaseline,
  type NutritionInput,
} from "./lib/nutrition";
import {
  activityLevelValidator,
  calculationBasisValidator,
  goalPaceValidator,
  goalTypeValidator,
} from "./schema";

/**
 * Copy-only AI output. The numbers are advisory: `clampTargetsToBaseline` keeps
 * every value within 10% of the locally computed Mifflin–St Jeor baseline, so the
 * safety floors and adjustment caps always hold.
 *
 * As in `ai.ts`, the string fields carry no length bounds: OpenAI's strict
 * Structured Outputs mode rejects `minLength`/`maxLength` outright, which made
 * every generation fail and fall back to the local baseline. Numeric bounds are
 * permitted and stay. Lengths are applied after parsing instead.
 */
export const planSchema = z.object({
  calories: z.number().int().min(1_000).max(5_000),
  proteinGrams: z.number().int().min(30).max(500),
  carbsGrams: z.number().int().min(0).max(1_500),
  fatGrams: z.number().int().min(20).max(500),
  goalTitle: z.string(),
  goalDescription: z.string(),
  reasoning: z.string(),
});

const COPY_LIMITS = { goalDescription: 280, goalTitle: 120, reasoning: 500 } as const;

const SUPPORTED_LOCALES = ["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type AiPlanResult = z.infer<typeof planSchema> & {
  paceWasCapped: boolean;
  formulaVersion: "openai-v1" | "mifflin-st-jeor-v1";
};

const FALLBACK_COPY: Record<SupportedLocale, Record<"lose" | "maintain" | "gain", { title: string; description: string }>> = {
  en: {
    lose: { title: "Reach your weight-loss goal", description: "Build steadily with a sustainable approach." },
    maintain: { title: "Maintain your healthy weight", description: "Keep a steady balance day to day." },
    gain: { title: "Reach your weight-gain goal", description: "Add calories gradually and consistently." },
  },
  es: {
    lose: { title: "Alcanza tu objetivo de pérdida de peso", description: "Avanza de forma constante y sostenible." },
    maintain: { title: "Mantén tu peso saludable", description: "Conserva un equilibrio estable cada día." },
    gain: { title: "Alcanza tu objetivo de aumento de peso", description: "Añade calorías de forma gradual y constante." },
  },
  de: {
    lose: { title: "Erreiche dein Abnehmziel", description: "Gehe gleichmäßig und nachhaltig vor." },
    maintain: { title: "Halte dein gesundes Gewicht", description: "Bewahre Tag für Tag ein stabiles Gleichgewicht." },
    gain: { title: "Erreiche dein Aufbauziel", description: "Erhöhe die Kalorien schrittweise und konstant." },
  },
  fr: {
    lose: { title: "Atteignez votre objectif de perte de poids", description: "Progressez régulièrement et durablement." },
    maintain: { title: "Maintenez votre poids de forme", description: "Gardez un équilibre stable au quotidien." },
    gain: { title: "Atteignez votre objectif de prise de poids", description: "Augmentez les calories progressivement." },
  },
  "pt-BR": {
    lose: { title: "Alcance sua meta de perda de peso", description: "Avance de forma constante e sustentável." },
    maintain: { title: "Mantenha seu peso saudável", description: "Mantenha um equilíbrio estável todos os dias." },
    gain: { title: "Alcance sua meta de ganho de peso", description: "Aumente as calorias de forma gradual." },
  },
  it: {
    lose: { title: "Raggiungi il tuo obiettivo di perdita di peso", description: "Procedi in modo costante e sostenibile." },
    maintain: { title: "Mantieni il tuo peso salutare", description: "Conserva un equilibrio stabile ogni giorno." },
    gain: { title: "Raggiungi il tuo obiettivo di aumento di peso", description: "Aumenta le calorie in modo graduale." },
  },
  ja: {
    lose: { title: "減量の目標を達成しましょう", description: "無理のないペースで着実に進めます。" },
    maintain: { title: "健康的な体重を維持しましょう", description: "毎日のバランスを一定に保ちます。" },
    gain: { title: "増量の目標を達成しましょう", description: "カロリーを少しずつ着実に増やします。" },
  },
  ko: {
    lose: { title: "체중 감량 목표를 달성하세요", description: "지속 가능한 속도로 꾸준히 진행합니다." },
    maintain: { title: "건강한 체중을 유지하세요", description: "매일 균형을 안정적으로 유지합니다." },
    gain: { title: "체중 증가 목표를 달성하세요", description: "칼로리를 점진적으로 꾸준히 늘립니다." },
  },
};

function resolveLocale(value: string): SupportedLocale {
  if ((SUPPORTED_LOCALES as readonly string[]).includes(value)) return value as SupportedLocale;
  const base = value.split("-")[0];
  const match = SUPPORTED_LOCALES.find((locale) => locale.split("-")[0] === base);
  return match ?? "en";
}

function localBaselineResult(input: NutritionInput, locale: SupportedLocale): AiPlanResult {
  const baseline = calculateNutritionPlan(input);
  const copy = FALLBACK_COPY[locale][input.goal];
  return {
    calories: baseline.calories,
    proteinGrams: baseline.proteinGrams,
    carbsGrams: baseline.carbsGrams,
    fatGrams: baseline.fatGrams,
    goalTitle: copy.title,
    goalDescription: copy.description,
    reasoning: "",
    paceWasCapped: baseline.paceWasCapped,
    formulaVersion: "mifflin-st-jeor-v1",
  };
}

/**
 * Generates onboarding plan copy and advisory targets.
 *
 * Requires an authenticated identity and is rate limited per identity. It calls a
 * paid provider, and the Convex deployment URL ships inside the app bundle, so an
 * unauthenticated version of this action was an open invitation to drain the API
 * key. Every failure path falls back to the local calculator rather than blocking
 * onboarding.
 */
export const generate = action({
  args: {
    calculationBasis: calculationBasisValidator,
    age: v.number(),
    heightCm: v.number(),
    currentWeightKg: v.number(),
    goalWeightKg: v.number(),
    activityLevel: activityLevelValidator,
    goal: goalTypeValidator,
    pace: goalPaceValidator,
    locale: v.string(),
  },
  handler: async (ctx, args): Promise<AiPlanResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Authentication required");
    await ctx.runMutation(internal.planGenerationDb.consumeBudget, { subject: identity.subject });

    const input: NutritionInput = {
      goal: args.goal,
      calculationBasis: args.calculationBasis,
      age: args.age,
      heightCm: args.heightCm,
      currentWeightKg: args.currentWeightKg,
      goalWeightKg: args.goalWeightKg,
      activityLevel: args.activityLevel,
      pace: args.pace,
    };

    // Range-check before anything is spent on a provider call.
    try {
      assertNutritionInput(input);
    } catch (cause) {
      throw new ConvexError(cause instanceof Error ? cause.message : "Unsupported measurements");
    }

    const locale = resolveLocale(args.locale);
    const baseline = calculateNutritionPlan(input);
    const provider = readProviderConfig();
    if (!provider) {
      logProviderMisconfiguration("planGeneration.generate");
      return localBaselineResult(input, locale);
    }
    const { apiKey, model } = provider;
    const activityLabel = {
      sedentary: "sedentary (little or no exercise)",
      light: "lightly active (light exercise 1-3 days/week)",
      active: "moderately active (moderate exercise 3-5 days/week)",
      veryActive: "very active (hard exercise 6-7 days/week)",
    }[args.activityLevel];

    // Only validated enum values and range-checked numbers reach the prompt.
    const prompt = [
      "You are a nutrition copywriter. Produce plan copy and targets for one user.",
      "",
      "User profile:",
      `- Calculation basis: ${args.calculationBasis}`,
      `- Age: ${args.age}`,
      `- Height: ${args.heightCm} cm`,
      `- Current weight: ${args.currentWeightKg} kg`,
      `- Goal weight: ${args.goalWeightKg} kg`,
      `- Activity: ${activityLabel}`,
      `- Goal: ${args.goal} at ${args.pace} pace`,
      "",
      "Safe baseline you must stay within 10% of:",
      `- Calories: ${baseline.calories} kcal/day`,
      `- Protein: ${baseline.proteinGrams} g`,
      `- Carbohydrates: ${baseline.carbsGrams} g`,
      `- Fat: ${baseline.fatGrams} g`,
      "",
      "Rules:",
      "1. Return calories and macros within 10% of the baseline values.",
      "2. goalTitle: short and motivating, at most 10 words.",
      `3. Write goalTitle, goalDescription and reasoning in the "${locale}" language.`,
      "4. Never claim precision; these are estimates.",
      "5. Never mention medical conditions, diagnoses, or treatment.",
    ].join("\n");

    try {
      const client = new OpenAI({ apiKey, timeout: 25_000, maxRetries: 1 });
      const response = await client.responses.parse({
        model,
        input: [{ role: "user", content: prompt }],
        text: { format: zodTextFormat(planSchema, "nutrition_plan") },
      });
      if (!response.output_parsed) throw new Error("No structured output");

      const parsed = planSchema.parse(response.output_parsed);
      const clamped = clampTargetsToBaseline(parsed, baseline);
      const fallbackCopy = FALLBACK_COPY[locale][input.goal];
      const bounded = (value: string, max: number) => value.trim().slice(0, max);

      return {
        ...clamped,
        // Empty copy falls back rather than rendering a blank headline.
        goalTitle: bounded(parsed.goalTitle, COPY_LIMITS.goalTitle) || fallbackCopy.title,
        goalDescription:
          bounded(parsed.goalDescription, COPY_LIMITS.goalDescription) || fallbackCopy.description,
        reasoning: bounded(parsed.reasoning, COPY_LIMITS.reasoning),
        paceWasCapped: baseline.paceWasCapped,
        formulaVersion: "openai-v1",
      };
    } catch (cause) {
      /*
        The local baseline is a safe answer, so this failure is invisible by
        design — which is exactly why a rejected request schema went unnoticed
        here for as long as it did. Log enough to tell "provider said no" from
        "provider was slow", using only the API error's own request-level fields.
      */
      const apiError = cause instanceof OpenAI.APIError ? cause : null;
      console.error("[planGeneration.generate] falling back to the local baseline", {
        code: apiError?.code ?? null,
        message: apiError?.message ?? null,
        status: apiError?.status ?? null,
      });
      return localBaselineResult(input, locale);
    }
  },
});
