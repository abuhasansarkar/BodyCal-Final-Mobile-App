import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { calculateNutritionPlan } from "@/domain/nutrition-calculator";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { AuthField } from "@/screens/auth/auth-fields";
import { Pressable, Text, View } from "@/tw";

type GoalType = "lose" | "maintain" | "gain";
type GoalPace = "slow" | "recommended" | "faster";

export function SettingsGoalScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredGoalScreen />;
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">{t("goalSettings.title")}</Text>
      <Text className="text-app-muted">{t("goalSettings.configureConvex")}</Text>
    </AppScreen>
  );
}

function ConfiguredGoalScreen() {
  const profile = useQuery(api.profiles.getCurrent, {});

  if (profile === undefined) {
    return (
      <AppScreen>
        <View className="h-9 w-40 rounded-xl bg-app-surface" />
        <View className="h-5 w-64 rounded-lg bg-app-surface" />
        <View className="h-14 rounded-2xl bg-app-surface" />
        <View className="flex-row gap-2">
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
        </View>
        <View className="h-14 rounded-2xl bg-app-surface" />
        <View className="flex-row gap-2">
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
        </View>
        <View className="h-14 rounded-2xl bg-app-surface" />
      </AppScreen>
    );
  }

  return <GoalForm key={profile?._id ?? "new"} profile={profile} />;
}

type ProfileRecord = {
  goalType?: string;
  goalWeightKg?: number;
  goalPace?: string;
  dateOfBirth?: string;
  calculationBasis?: "female" | "male";
  heightCm?: number;
  currentWeightKg?: number;
  weightUnit?: "kg" | "lb";
  heightUnit?: "cm" | "imperial";
  activityLevel?: "sedentary" | "light" | "active" | "veryActive";
} | null;

function GoalForm({ profile }: { profile: ProfileRecord }) {
  const updateProfile = useMutation(api.profiles.update);
  const createGoal = useMutation(api.nutritionGoals.createGoal);
  const { t } = useTranslation();

  const [goalType, setGoalType] = React.useState<GoalType>((profile?.goalType as GoalType) ?? "lose");
  const [goalWeightKg, setGoalWeightKg] = React.useState(String(profile?.goalWeightKg ?? 70));
  const [goalPace, setGoalPace] = React.useState<GoalPace>((profile?.goalPace as GoalPace) ?? "recommended");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const goalTypes: { key: GoalType; label: string }[] = [
    { key: "lose", label: t("goalSettings.goalType.lose") },
    { key: "maintain", label: t("goalSettings.goalType.maintain") },
    { key: "gain", label: t("goalSettings.goalType.gain") },
  ];

  const paceOptions: { key: GoalPace; label: string }[] = [
    { key: "slow", label: t("goalSettings.pace.slow") },
    { key: "recommended", label: t("goalSettings.pace.recommended") },
    { key: "faster", label: t("goalSettings.pace.faster") },
  ];

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const targetKg = Math.max(35, Math.min(350, Number(goalWeightKg) || 70));

      await updateProfile({
        goalType,
        goalWeightKg: targetKg,
        goalPace,
      });

      const age = profile?.dateOfBirth ? Math.max(18, Math.min(80, new Date().getFullYear() - Number(profile.dateOfBirth.slice(0, 4)))) : 28;
      const plan = calculateNutritionPlan({
        age,
        calculationBasis: profile?.calculationBasis ?? "male",
        heightCm: profile?.heightCm ?? 175,
        currentWeightKg: profile?.currentWeightKg ?? 70,
        goalWeightKg: targetKg,
        weightUnit: profile?.weightUnit ?? "kg",
        heightUnit: profile?.heightUnit ?? "cm",
        activityLevel: profile?.activityLevel ?? "light",
        goal: goalType,
        pace: goalPace,
      });

      await createGoal({
        calories: plan.calories,
        proteinGrams: plan.proteinGrams,
        carbsGrams: plan.carbsGrams,
        fatGrams: plan.fatGrams,
        effectiveFrom: currentLocalDate(),
        isManualOverride: false,
        formulaVersion: plan.formulaVersion,
      });

      setMessage(t("goalSettings.saveSuccess"));
      setTimeout(() => router.back(), 1000);
    } catch {
      setMessage(t("goalSettings.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">{t("goalSettings.title")}</Text>
      <Text className="text-sm text-app-muted">{t("goalSettings.subtitle")}</Text>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">{t("goalSettings.primaryGoalLabel")}</Text>
        <View className="flex-row gap-2">
          {goalTypes.map(({ key, label }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: goalType === key }}
              className={goalType === key ? "flex-1 items-center rounded-2xl bg-[#111111] py-3" : "flex-1 items-center rounded-2xl border border-app-border bg-white py-3"}
              onPress={() => setGoalType(key)}
            >
              <Text className={goalType === key ? "text-sm font-semibold capitalize text-white" : "text-sm font-semibold capitalize text-app-text"}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <AuthField
        keyboardType="decimal-pad"
        label={t("goalSettings.targetWeightLabel")}
        onChangeText={setGoalWeightKg}
        value={goalWeightKg}
      />

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">{t("goalSettings.paceLabel")}</Text>
        <View className="flex-row gap-2">
          {paceOptions.map(({ key, label }) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: goalPace === key }}
              className={goalPace === key ? "flex-1 items-center rounded-2xl bg-[#111111] py-3" : "flex-1 items-center rounded-2xl border border-app-border bg-white py-3"}
              onPress={() => setGoalPace(key)}
            >
              <Text className={goalPace === key ? "text-xs font-semibold capitalize text-white" : "text-xs font-semibold capitalize text-app-text"}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {message ? <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted" selectable>{message}</Text> : null}
      <PrimaryButton disabled={saving} icon="check" label={saving ? t("goalSettings.recalculating") : t("goalSettings.saveAndRecalculate")} onPress={() => void handleSave()} />
    </AppScreen>
  );
}
