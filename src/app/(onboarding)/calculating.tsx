import { useAction, useConvexAuth } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, ActivityIndicator } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { hasBackendConfiguration } from "@/config/env";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { api } from "@/lib/convex-api";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { i18n } from "@/locales/i18n";
import { Text, View } from "@/tw";

const ANIMATION_DURATION_MS = 5_200;

type GenerationStep = {
  complete: boolean;
  icon: AppIconName;
  inProgress: boolean;
  title: string;
};

export default function CalculatingRoute() {
  const { t } = useTranslation();
  const { draft, update } = useOnboarding();
  const { isAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const generatePlan = useAction(api.planGeneration.generate);
  const [progress, setProgress] = React.useState(0);
  const [aiDone, setAiDone] = React.useState(false);

  // ── 1. Fire AI request if authenticated, otherwise finish immediately ──────
  React.useEffect(() => {
    let mounted = true;

    if (convexAuthLoading) return;

    if (!hasBackendConfiguration || !isAuthenticated) {
      setTimeout(() => {
        if (mounted) setAiDone(true);
      }, 0);
      return;
    }

    void generatePlan({
      calculationBasis: draft.calculationBasis,
      age: draft.age,
      heightCm: draft.heightCm,
      currentWeightKg: draft.currentWeightKg,
      goalWeightKg: draft.goalWeightKg,
      activityLevel: draft.activityLevel,
      goal: draft.goal,
      pace: draft.pace,
      locale: i18n.resolvedLanguage ?? "en",
    })
      .then((plan) => {
        if (mounted) update({ aiPlan: plan });
      })
      .catch(() => {
        // Failure is handled: result.tsx falls back to the local calculator
      })
      .finally(() => {
        if (mounted) setAiDone(true);
      });
    return () => {
      mounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convexAuthLoading, isAuthenticated]);

  // ── 2. Run progress animation; stall at 95% until AI finishes ───────────
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (!mounted) return;
      if (reduceMotion) {
        setProgress(95); // hold until AI done
        return;
      }
      const startedAt = Date.now();
      interval = setInterval(() => {
        if (!mounted) return;
        const natural = Math.min(95, Math.round(((Date.now() - startedAt) / ANIMATION_DURATION_MS) * 100));
        setProgress(natural);
        if (natural >= 95 && interval) clearInterval(interval);
      }, 80);
    });

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  // ── 3. When AI finishes, snap to 100% then navigate ─────────────────────
  React.useEffect(() => {
    if (!aiDone) return;
    const timer = setTimeout(() => {
      setProgress(100);
      // Give React a tick to render 100%, then navigate
      setTimeout(() => router.replace("/(onboarding)/result"), 400);
    }, 0);
    return () => clearTimeout(timer);
  }, [aiDone]);

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
