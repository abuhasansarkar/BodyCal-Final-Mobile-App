import React from "react";
import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "convex/react";
import { router } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text } from "@/tw";
import { hasBackendConfiguration } from "@/config/env";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";

function CustomFoodForm({ save }: { save: (input: { name: string; calories: number; protein: number; carbs: number; fat: number }) => Promise<string> }) {
  const [name, setName] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const valid = name.trim().length > 0 && [calories, protein, carbs, fat].every((value) => Number.isFinite(Number(value)) && Number(value) >= 0);
  const submit = async () => { try { const result = await save({ name: name.trim(), calories: Number(calories), protein: Number(protein), carbs: Number(carbs), fat: Number(fat) }); setMessage(result); if (result === "Saved") router.back(); } catch { setMessage("Could not save this food. Try again."); } };
  return <AppScreen><Text className="text-3xl font-bold text-app-text">Add food manually</Text><AuthField label="Food name" value={name} onChangeText={setName} /><AuthField label="Calories" keyboardType="decimal-pad" value={calories} onChangeText={setCalories} /><AuthField label="Protein (g)" keyboardType="decimal-pad" value={protein} onChangeText={setProtein} /><AuthField label="Carbohydrates (g)" keyboardType="decimal-pad" value={carbs} onChangeText={setCarbs} /><AuthField label="Fat (g)" keyboardType="decimal-pad" value={fat} onChangeText={setFat} />{message ? <Text accessibilityLiveRegion="polite" className="text-app-muted">{message}</Text> : null}<PrimaryButton disabled={!valid} icon="add" label="Add to Today" onPress={() => void submit()} /></AppScreen>;
}

function ConfiguredCustomFood() {
  const create = useMutation(api.foodLogs.create);
  return <CustomFoodForm save={async (input) => {
    const payload = { localDate: currentLocalDate(), timezone: currentTimezone(), mealType: "snack" as const, source: "manual" as const, foodName: input.name, serving: "1 serving", servingUnit: "serving", quantity: 1, calories: input.calories, proteinGrams: input.protein, carbsGrams: input.carbs, fatGrams: input.fat, clientRequestId: createClientRequestId() };
    const network = await NetInfo.fetch();
    if (!network.isConnected) { await enqueueOutbox({ id: payload.clientRequestId, kind: "foodLog.create", payload }); return "Saved offline. It will sync when you reconnect."; }
    await create(payload);
    return "Saved";
  }} />;
}

export function CustomFoodScreen() {
  return hasBackendConfiguration ? <ConfiguredCustomFood /> : <CustomFoodForm save={async () => "Cloud saving becomes available after Convex is configured."} />;
}
