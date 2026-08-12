import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text, View } from "@/tw";

export function SettingsNutritionTargetsScreen() {
  if (hasBackendConfiguration) return <ConfiguredNutritionTargetsScreen />;
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Nutrition Targets</Text>
      <Text className="text-app-muted">Configure Convex to save custom nutrition targets.</Text>
    </AppScreen>
  );
}

function ConfiguredNutritionTargetsScreen() {
  const activeGoal = useQuery(api.nutritionGoals.getActive, { localDate: currentLocalDate() });

  if (activeGoal === undefined) {
    return <AppScreen><Text className="text-app-muted">Loading targets…</Text></AppScreen>;
  }

  return <NutritionTargetsForm key={activeGoal?._id ?? "new"} activeGoal={activeGoal} />;
}

type GoalRecord = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
} | null;

function NutritionTargetsForm({ activeGoal }: { activeGoal: GoalRecord }) {
  const createGoal = useMutation(api.nutritionGoals.createGoal);

  const [calories, setCalories] = React.useState(String(activeGoal?.calories ?? 2000));
  const [protein, setProtein] = React.useState(String(activeGoal?.proteinGrams ?? 150));
  const [carbs, setCarbs] = React.useState(String(activeGoal?.carbsGrams ?? 225));
  const [fat, setFat] = React.useState(String(activeGoal?.fatGrams ?? 60));
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const cal = Math.max(1200, Math.min(6000, Number(calories) || 2000));
      const p = Math.max(0, Number(protein) || 150);
      const c = Math.max(0, Number(carbs) || 225);
      const f = Math.max(0, Number(fat) || 60);

      await createGoal({
        calories: cal,
        proteinGrams: p,
        carbsGrams: c,
        fatGrams: f,
        effectiveFrom: currentLocalDate(),
        isManualOverride: true,
      });

      setMessage("Custom daily targets saved.");
      setTimeout(() => router.back(), 1000);
    } catch {
      setMessage("Could not save targets. Ensure calories are between 1,200 and 6,000.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Nutrition Targets</Text>
      <Text className="text-sm text-app-muted">Override automatic estimates with custom daily macro targets.</Text>

      <AuthField keyboardType="number-pad" label="Daily Calories (kcal)" onChangeText={setCalories} value={calories} />

      <View className="gap-3 rounded-3xl border border-app-border bg-white p-4">
        <Text className="text-base font-bold text-app-text">Macronutrient Targets</Text>
        <AuthField keyboardType="number-pad" label="Protein (grams)" onChangeText={setProtein} value={protein} />
        <AuthField keyboardType="number-pad" label="Carbohydrates (grams)" onChangeText={setCarbs} value={carbs} />
        <AuthField keyboardType="number-pad" label="Fat (grams)" onChangeText={setFat} value={fat} />
      </View>

      {message ? <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted">{message}</Text> : null}
      <PrimaryButton disabled={saving} icon="check" label={saving ? "Saving…" : "Save targets"} onPress={() => void handleSave()} />
    </AppScreen>
  );
}
