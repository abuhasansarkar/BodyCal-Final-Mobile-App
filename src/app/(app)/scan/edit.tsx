import { useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { nutritionEstimateSchema } from "@/domain/schemas";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text } from "@/tw";

export default function EditScanRoute() {
  const { estimate: rawEstimate, scanId } = useLocalSearchParams<{ estimate?: string; scanId?: string }>();
  const parsed = React.useMemo(() => { try { return nutritionEstimateSchema.parse(JSON.parse(rawEstimate ?? "null")); } catch { return null; } }, [rawEstimate]);
  const create = useMutation(api.foodLogs.create);
  const [name, setName] = React.useState(parsed?.mealName ?? "");
  const [calories, setCalories] = React.useState(String(parsed?.nutrition.calories ?? ""));
  const [protein, setProtein] = React.useState(String(parsed?.nutrition.proteinGrams ?? ""));
  const [carbs, setCarbs] = React.useState(String(parsed?.nutrition.carbsGrams ?? ""));
  const [fat, setFat] = React.useState(String(parsed?.nutrition.fatGrams ?? ""));
  const [error, setError] = React.useState<string | null>(null);
  const save = async () => { try { await create({ localDate: currentLocalDate(), timezone: currentTimezone(), mealType: "snack", source: "ai", foodName: name.trim(), serving: "1 estimated meal", servingUnit: "serving", quantity: 1, calories: Number(calories), proteinGrams: Number(protein), carbsGrams: Number(carbs), fatGrams: Number(fat), aiScanId: scanId as Id<"aiScans"> | undefined, clientRequestId: createClientRequestId() }); router.replace("/(app)/(tabs)/today"); } catch { setError("Could not save this estimate. Check the values and try again."); } };
  return <AppScreen><Text className="text-3xl font-bold text-app-text">Review estimate</Text><Text className="text-sm text-app-muted">AI values are estimates. Correct them before saving.</Text><AuthField label="Meal name" value={name} onChangeText={setName} /><AuthField label="Calories" keyboardType="decimal-pad" value={calories} onChangeText={setCalories} /><AuthField label="Protein (g)" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} /><AuthField label="Carbohydrates (g)" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} /><AuthField label="Fat (g)" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />{error ? <Text accessibilityLiveRegion="polite" className="text-app-error">{error}</Text> : null}<PrimaryButton disabled={!name.trim() || [calories, protein, carbs, fat].some((value) => !Number.isFinite(Number(value)) || Number(value) < 0)} icon="add" label="Add to Today" onPress={() => void save()} /></AppScreen>;
}
