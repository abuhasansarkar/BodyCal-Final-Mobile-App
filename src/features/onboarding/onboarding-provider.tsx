import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { type PropsWithChildren } from "react";

import { NUTRITION_LIMITS } from "@/domain/nutrition-calculator";
import type { AiNutritionPlan, OnboardingDraft } from "@/types/domain";

/**
 * Pre-authentication onboarding draft.
 *
 * Stored in AsyncStorage rather than SecureStore: the draft can exceed
 * SecureStore's ~2 KB practical ceiling on Android once AI plan copy is attached,
 * and it holds no credentials. It is validated on read, so corrupt or
 * out-of-range persisted values cannot flow into the calculator, and cleared as
 * soon as it has been persisted to the account.
 */

const STORAGE_KEY = "bodycal.onboarding-draft.v2";
const LEGACY_SECURE_KEY = "bodycal.onboarding-draft.v1";

const initialDraft: OnboardingDraft = {
  goal: "maintain",
  calculationBasis: "female",
  age: 30,
  heightCm: 165,
  currentWeightKg: 70,
  goalWeightKg: 70,
  activityLevel: "light",
  pace: "recommended",
  weightUnit: "kg",
  heightUnit: "cm",
};

const GOALS = new Set(["lose", "maintain", "gain"]);
const BASES = new Set(["female", "male"]);
const ACTIVITIES = new Set(["sedentary", "light", "active", "veryActive"]);
const PACES = new Set(["slow", "recommended", "faster"]);

function numberInRange(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: Set<string>, fallback: T): T {
  return typeof value === "string" && allowed.has(value) ? (value as T) : fallback;
}

function sanitizeAiPlan(value: unknown): AiNutritionPlan | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<AiNutritionPlan>;
  const numbers = [
    candidate.calories,
    candidate.proteinGrams,
    candidate.carbsGrams,
    candidate.fatGrams,
  ];
  if (numbers.some((entry) => typeof entry !== "number" || !Number.isFinite(entry))) return undefined;
  if (typeof candidate.goalTitle !== "string" || typeof candidate.goalDescription !== "string") {
    return undefined;
  }

  return {
    calories: candidate.calories!,
    proteinGrams: candidate.proteinGrams!,
    carbsGrams: candidate.carbsGrams!,
    fatGrams: candidate.fatGrams!,
    goalTitle: candidate.goalTitle.slice(0, 120),
    goalDescription: candidate.goalDescription.slice(0, 280),
    reasoning: typeof candidate.reasoning === "string" ? candidate.reasoning.slice(0, 500) : "",
    paceWasCapped: candidate.paceWasCapped === true,
    formulaVersion: candidate.formulaVersion === "openai-v1" ? "openai-v1" : "mifflin-st-jeor-v1",
  };
}

/** Coerces anything persisted into a draft the calculator will accept. */
export function sanitizeDraft(value: unknown): OnboardingDraft {
  if (!value || typeof value !== "object") return initialDraft;
  const raw = value as Record<string, unknown>;
  const { minAge, maxAge, minHeightCm, maxHeightCm, minWeightKg, maxWeightKg } = NUTRITION_LIMITS;

  return {
    goal: oneOf(raw.goal, GOALS, initialDraft.goal),
    calculationBasis: oneOf(raw.calculationBasis, BASES, initialDraft.calculationBasis),
    age: numberInRange(raw.age, minAge, maxAge, initialDraft.age),
    heightCm: numberInRange(raw.heightCm, minHeightCm, maxHeightCm, initialDraft.heightCm),
    currentWeightKg: numberInRange(
      raw.currentWeightKg,
      minWeightKg,
      maxWeightKg,
      initialDraft.currentWeightKg,
    ),
    goalWeightKg: numberInRange(raw.goalWeightKg, minWeightKg, maxWeightKg, initialDraft.goalWeightKg),
    activityLevel: oneOf(raw.activityLevel, ACTIVITIES, initialDraft.activityLevel),
    pace: oneOf(raw.pace, PACES, initialDraft.pace),
    weightUnit: raw.weightUnit === "lb" ? "lb" : "kg",
    heightUnit: raw.heightUnit === "imperial" ? "imperial" : "cm",
    aiPlan: sanitizeAiPlan(raw.aiPlan),
  };
}

async function readStoredDraft(): Promise<OnboardingDraft> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return initialDraft;
    return sanitizeDraft(JSON.parse(stored));
  } catch {
    return initialDraft;
  }
}

type OnboardingContextValue = {
  draft: OnboardingDraft;
  hydrated: boolean;
  update: (value: Partial<OnboardingDraft>) => void;
  clear: () => Promise<void>;
};

const OnboardingContext = React.createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = React.useState(initialDraft);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void readStoredDraft()
      .then((value) => {
        if (!cancelled) setDraft(value);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = React.useCallback((value: Partial<OnboardingDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...value };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const clear = React.useCallback(async () => {
    setDraft(initialDraft);
    await AsyncStorage.multiRemove([STORAGE_KEY, LEGACY_SECURE_KEY]).catch(() => undefined);
  }, []);

  const value = React.useMemo(
    () => ({ clear, draft, hydrated, update }),
    [clear, draft, hydrated, update],
  );

  return <OnboardingContext value={value}>{children}</OnboardingContext>;
}

export function useOnboarding() {
  const value = React.use(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider.");
  return value;
}
