import { Stack } from "expo-router/stack";

import { OnboardingProvider } from "@/features/onboarding/onboarding-provider";

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <Stack screenOptions={{ animation: "slide_from_right", headerShown: false }} />
    </OnboardingProvider>
  );
}
