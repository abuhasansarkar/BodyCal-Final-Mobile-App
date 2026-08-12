import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, ActivityIndicator } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { Text, View } from "@/tw";

const GENERATION_DURATION_MS = 4_800;

type GenerationStep = {
  complete: boolean;
  icon: AppIconName;
  inProgress: boolean;
  title: string;
};

export default function CalculatingRoute() {
  const { t } = useTranslation();
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let navigationTimer: ReturnType<typeof setTimeout> | undefined;
    let mounted = true;

    const completeGeneration = () => {
      setProgress(100);
      navigationTimer = setTimeout(() => router.replace("/(onboarding)/result"), 450);
    };

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotionEnabled) => {
      if (!mounted) return;

      if (reduceMotionEnabled) {
        completeGeneration();
        return;
      }

      const startedAt = Date.now();
      interval = setInterval(() => {
        const nextProgress = Math.min(100, Math.round(((Date.now() - startedAt) / GENERATION_DURATION_MS) * 100));
        setProgress(nextProgress);

        if (nextProgress === 100) {
          if (interval) clearInterval(interval);
          completeGeneration();
        }
      }, 80);
    });

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
      if (navigationTimer) clearTimeout(navigationTimer);
    };
  }, []);

  const steps: GenerationStep[] = [
    { icon: "calories", title: t("onboarding.calculating.calories"), complete: progress >= 34, inProgress: progress < 34 },
    { icon: "macros", title: t("onboarding.calculating.macros"), complete: progress >= 67, inProgress: progress >= 34 && progress < 67 },
    { icon: "foods", title: t("onboarding.calculating.foods"), complete: progress >= 100, inProgress: progress >= 67 && progress < 100 },
  ];

  return (
    <OnboardingStageScreen description={t("onboarding.calculating.description")} progressStep={9} title={t("onboarding.calculating.title")}>
      <View className="flex-1 justify-center gap-5">
        <View className="items-center gap-3 px-1">
          <Text className="text-[54px] font-bold leading-[62px] tracking-[-1.5px] text-[#111111]" selectable style={{ fontVariant: ["tabular-nums"] }}>
            {progress}%
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: progress }}
            className="h-2 w-full overflow-hidden rounded-full bg-[#EEEEEE]"
          >
            <View className="h-full rounded-full bg-[#111111]" style={{ width: `${progress}%` }} />
          </View>
          <Text className="text-center text-[15px] leading-5 text-[#737373]" selectable>
            {t("onboarding.calculating.almostDescription")}
          </Text>
        </View>

        <View className="gap-3">
          {steps.map((item) => (
            <View className="min-h-[82px] flex-row items-center gap-4 rounded-[18px] border border-[#E8E8E8] bg-white px-4 py-3" key={item.title}>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7F7F7]">
                <AppIcon name={item.icon} size={24} weight="semibold" />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[16px] font-semibold text-[#111111]">{item.title}</Text>
                <Text className="text-[13px] text-[#737373]">
                  {item.complete ? t("onboarding.calculating.done") : item.inProgress ? t("onboarding.calculating.inProgress") : t("onboarding.calculating.pending")}
                </Text>
              </View>
              {item.complete ? (
                <View className="h-7 w-7 items-center justify-center rounded-full bg-[#111111]">
                  <AppIcon color="#FFFFFF" name="check" size={16} weight="semibold" />
                </View>
              ) : item.inProgress ? (
                <ActivityIndicator color="#111111" size="small" />
              ) : (
                <View className="h-7 w-7 items-center justify-center rounded-full border border-[#D8D8D8]">
                  <View className="h-1.5 w-1.5 rounded-full bg-[#D8D8D8]" />
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </OnboardingStageScreen>
  );
}
