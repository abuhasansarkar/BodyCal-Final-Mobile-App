import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { OnboardingScreen } from "@/screens/onboarding/onboarding-screen";
import { RulerControl } from "@/screens/onboarding/ruler-control";
import { Text, View } from "@/tw";

export default function GoalWeightRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();
  const pounds = draft.weightUnit === "lb";
  const factor = pounds ? 2.2046226218 : 1;
  const current = draft.currentWeightKg * factor;
  const goal = draft.goalWeightKg * factor;
  const suffix = pounds ? t("onboarding.units.lb") : t("onboarding.units.kg");

  return (
    <OnboardingScreen description={t("onboarding.goalWeight.description")} onContinue={() => router.push("/(onboarding)/activity")} step={6} title={t("onboarding.goalWeight.title")}>
      <View className="flex-1 items-center justify-center gap-7 pb-3">
        <View className="w-full rounded-[20px] border border-[#E8E8E8] bg-white px-6 py-5">
          <View className="items-center gap-1">
            <Text className="text-[14px] text-[#737373]" selectable>{t("onboarding.goalWeight.current")}</Text>
            <Text className="text-[34px] font-semibold leading-[40px] tracking-[-0.7px] text-[#111111]" selectable style={{ fontVariant: ["tabular-nums"] }}>{current.toFixed(1)} <Text className="text-[17px] font-medium">{suffix}</Text></Text>
          </View>
          <View className="items-center py-1.5">
            <View className="h-2.5 w-2.5 rounded-full bg-[#111111]" />
            <View className="h-7 border-l border-dashed border-[#A3A3A3]" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-[14px] text-[#737373]" selectable>{t("onboarding.goalWeight.goal")}</Text>
            <Text className="text-[34px] font-semibold leading-[40px] tracking-[-0.7px] text-[#111111]" selectable style={{ fontVariant: ["tabular-nums"] }}>{goal.toFixed(1)} <Text className="text-[17px] font-medium">{suffix}</Text></Text>
          </View>
        </View>
        <View className="w-full">
          <RulerControl
            accessibilityLabel={t("onboarding.goalWeight.title")}
            labelEvery={pounds ? 5 : 10}
            maximum={pounds ? 772 : 350}
            minimum={pounds ? 77 : 35}
            onChange={(next) => update({ goalWeightKg: pounds ? Number((next / factor).toFixed(1)) : next })}
            step={pounds ? 1 : 0.5}
            value={goal}
          />
        </View>
      </View>
    </OnboardingScreen>
  );
}
