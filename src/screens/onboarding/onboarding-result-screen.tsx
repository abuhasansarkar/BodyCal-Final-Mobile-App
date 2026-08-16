import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { calculateNutritionPlan, kilogramsToPounds } from "@/domain/nutrition-calculator";
import { hasBackendConfiguration } from "@/config/env";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { Text, View } from "@/tw";
import type { AiNutritionPlan, GoalType } from "@/types/domain";

type MacroTileProps = {
  color: string;
  label: string;
  icon: AppIconName;
  value: string;
};

function MacroTile({ color, icon, label, value }: MacroTileProps) {
  return (
    <View className="min-h-[128px] min-w-0 flex-1 justify-between rounded-[20px] border border-[#E8E8E8] bg-white p-3.5">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F7]">
        <AppIcon color={color} name={icon} size={20} weight="semibold" />
      </View>
      <View className="gap-0.5">
        <Text className="text-[23px] font-bold tracking-[-0.5px] text-[#111111]" selectable style={{ fontVariant: ["tabular-nums"] }}>{value}</Text>
        <Text className="text-[14px] leading-[18px] text-[#737373]" selectable>{label}</Text>
      </View>
    </View>
  );
}

const goalCopyKeys: Record<GoalType, { description: string; title: string }> = {
  lose: { title: "onboarding.result.goal.lose.title", description: "onboarding.result.goal.lose.description" },
  maintain: { title: "onboarding.result.goal.maintain.title", description: "onboarding.result.goal.maintain.description" },
  gain: { title: "onboarding.result.goal.gain.title", description: "onboarding.result.goal.gain.description" },
};

type ResultContentProps = {
  isAuthLoaded: boolean;
  isSignedIn: boolean;
};

function ResultContent({ isAuthLoaded, isSignedIn }: ResultContentProps) {
  const { draft } = useOnboarding();
  const { i18n, t } = useTranslation();

  const aiPlan: AiNutritionPlan | undefined = draft.aiPlan;
  const localPlan = calculateNutritionPlan(draft);

  const calories = aiPlan?.calories ?? localPlan.calories;
  const proteinGrams = aiPlan?.proteinGrams ?? localPlan.proteinGrams;
  const carbsGrams = aiPlan?.carbsGrams ?? localPlan.carbsGrams;
  const fatGrams = aiPlan?.fatGrams ?? localPlan.fatGrams;
  const paceWasCapped = aiPlan?.paceWasCapped ?? localPlan.paceWasCapped;

  const goalCopy = goalCopyKeys[draft.goal];
  const titleText = aiPlan?.goalTitle ?? t(goalCopy.title);
  const descriptionText = aiPlan?.goalDescription ?? t(goalCopy.description);

  const numberFormatter = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });
  const weightValue = draft.weightUnit === "lb"
    ? `${numberFormatter.format(kilogramsToPounds(draft.currentWeightKg))} ${t("onboarding.units.lb")}`
    : `${numberFormatter.format(draft.currentWeightKg)} ${t("onboarding.units.kg")}`;
  const activityLabel = t(`onboarding.activity.${draft.activityLevel}.title`);

  const continueToPaywall = () => {
    if (!isAuthLoaded) return;
    if (isSignedIn) router.push("/(onboarding)/ai-introduction");
    else router.push({ pathname: "/(auth)/sign-in", params: { destination: "onboarding" } });
  };

  return (
    <OnboardingStageScreen
      description={descriptionText}
      disabled={!isAuthLoaded}
      footerLabel={t("common.continue")}
      onContinue={continueToPaywall}
      progressStep={10}
      title={titleText}
      titleAccessory={(
        <View className="mb-1 h-14 w-14 items-center justify-center rounded-full bg-[#111111]">
          <AppIcon color="#FFFFFF" name="check" size={30} weight="semibold" />
        </View>
      )}
    >
      <View className="flex-1 gap-4 pb-2">
        <View className="gap-4 rounded-[24px] bg-[#FAFAFC] p-4">
          <Text className="text-[20px] font-bold leading-[26px] text-[#111111]" selectable>{t("onboarding.result.dailyRecommendation")}</Text>

          <View className="min-h-[112px] flex-row items-center gap-4 rounded-[20px] border border-[#E8E8E8] bg-white px-4 py-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-[#F7F7F7]">
              <AppIcon name="calories" size={27} weight="semibold" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[46px] font-bold leading-[50px] tracking-[-1.2px] text-[#111111]" selectable style={{ fontVariant: ["tabular-nums"] }}>
                {new Intl.NumberFormat(i18n.resolvedLanguage).format(calories)}
              </Text>
              <Text className="text-[16px] text-[#737373]" selectable>{t("onboarding.result.calories")}</Text>
            </View>
          </View>

          <View className="flex-row gap-2.5">
            <MacroTile color="#2F80ED" icon="protein" label={t("onboarding.result.protein")} value={`${proteinGrams}g`} />
            <MacroTile color="#F97316" icon="carbs" label={t("onboarding.result.carbs")} value={`${carbsGrams}g`} />
            <MacroTile color="#8B5CF6" icon="fat" label={t("onboarding.result.fat")} value={`${fatGrams}g`} />
          </View>
        </View>

        <View className="gap-3 rounded-[24px] bg-[#FAFAFC] p-4">
          <View className="gap-1">
            <Text className="text-[20px] font-bold text-[#111111]" selectable>{t("onboarding.result.yourInfo")}</Text>
            <Text className="text-[15px] leading-5 text-[#737373]" selectable>{t("onboarding.result.infoDescription")}</Text>
          </View>
          <View className="gap-4 rounded-[20px] border border-[#E8E8E8] bg-white px-4 py-4">
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name="weight" size={19} weight="semibold" /></View>
              <Text className="min-w-0 flex-1 text-[16px] font-semibold leading-[22px] text-[#111111]" selectable>{t("onboarding.result.currentWeight", { value: weightValue })}</Text>
            </View>
            <View className="h-px bg-[#EEEEEE]" />
            <View className="flex-row items-center gap-3">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name="activity" size={19} weight="semibold" /></View>
              <Text className="min-w-0 flex-1 text-[16px] font-semibold leading-[22px] text-[#111111]" selectable>{t("onboarding.result.activityLevel", { value: activityLabel })}</Text>
            </View>
          </View>
          <Text className="text-center text-[13px] leading-[18px] text-[#737373]" selectable>
            {t("onboarding.result.estimate")}{paceWasCapped ? ` ${t("onboarding.result.safetyLimited")}` : ""}
          </Text>

          {aiPlan?.formulaVersion === "openai-v1" ? (
            <View className="flex-row items-center justify-center gap-1.5">
              <AppIcon color="#737373" name="analysis" size={14} />
              <Text className="text-center text-[12px] text-[#737373]" selectable>
                {t("onboarding.result.aiGenerated")}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </OnboardingStageScreen>
  );
}

function ConfiguredResultRoute() {
  const { isLoaded, isSignedIn } = useAuth();
  return <ResultContent isAuthLoaded={isLoaded} isSignedIn={isSignedIn ?? false} />;
}

export function OnboardingResultScreen() {
  return hasBackendConfiguration ? <ConfiguredResultRoute /> : <ResultContent isAuthLoaded isSignedIn={false} />;
}
