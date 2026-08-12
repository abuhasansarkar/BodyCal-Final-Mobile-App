import * as SecureStore from "expo-secure-store";
import React, { type PropsWithChildren } from "react";

import type { OnboardingDraft } from "@/types/domain";

const STORAGE_KEY = "bodycal.onboarding-draft.v1";

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

async function readStoredDraft() {
  const stored = await SecureStore.getItemAsync(STORAGE_KEY);
  return stored ? { ...initialDraft, ...JSON.parse(stored) as Partial<OnboardingDraft> } : initialDraft;
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
    void readStoredDraft()
      .then(setDraft)
      .finally(() => setHydrated(true));
  }, []);

  const update = React.useCallback((value: Partial<OnboardingDraft>) => {
    setDraft((current) => {
      const next = { ...current, ...value };
      void SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clear = React.useCallback(async () => {
    setDraft(initialDraft);
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }, []);

  return <OnboardingContext value={{ clear, draft, hydrated, update }}>{children}</OnboardingContext>;
}

export function useOnboarding() {
  const value = React.use(OnboardingContext);
  if (!value) throw new Error("useOnboarding must be used inside OnboardingProvider.");
  return value;
}
