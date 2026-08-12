import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { NutritionSummary } from "@/components/nutrition-summary";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { curatedFoods } from "@/features/food/catalog";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { Pressable, Text, View } from "@/tw";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function FoodDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const food = curatedFoods.find((item) => item.id === id);

  const [mealType, setMealType] = React.useState<MealType>("lunch");
  const [quantity, setQuantity] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const createLog = useMutation(api.foodLogs.create);

  if (!food) {
    return (
      <AppScreen>
        <Text className="text-app-error">Food not found.</Text>
      </AppScreen>
    );
  }

  const scaledCalories = Math.round(food.calories * quantity);
  const scaledProtein = Math.round(food.proteinGrams * quantity);
  const scaledCarbs = Math.round(food.carbsGrams * quantity);
  const scaledFat = Math.round(food.fatGrams * quantity);

  const handleAdd = async () => {
    setSaving(true);
    setMessage(null);
    const payload = {
      foodName: food.title,
      serving: food.serving,
      servingUnit: "portion",
      quantity,
      calories: scaledCalories,
      proteinGrams: scaledProtein,
      carbsGrams: scaledCarbs,
      fatGrams: scaledFat,
      mealType,
      source: "catalog" as const,
      localDate: currentLocalDate(),
      timezone: currentTimezone(),
      clientRequestId: createClientRequestId(),
    };

    try {
      if (!hasBackendConfiguration) {
        setMessage("Food logging is available after Convex is configured.");
        return;
      }

      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        await enqueueOutbox({ id: payload.clientRequestId, kind: "foodLog.create", payload });
        setMessage("Logged offline. It will sync when reconnected.");
        setTimeout(() => router.replace("/(app)/(tabs)/today"), 1200);
        return;
      }

      await createLog(payload);
      router.replace("/(app)/(tabs)/today");
    } catch {
      setMessage("Could not log this food. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        {food.title}
      </Text>
      <Text className="text-base leading-6 text-app-muted">{food.description}</Text>

      <NutritionSummary
        calories={scaledCalories}
        carbsGrams={scaledCarbs}
        fatGrams={scaledFat}
        proteinGrams={scaledProtein}
      />

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">Select Meal</Text>
        <View className="flex-row gap-2">
          {mealTypes.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              className={
                mealType === m
                  ? "flex-1 rounded-2xl bg-[#111111] py-3 items-center"
                  : "flex-1 rounded-2xl border border-app-border bg-white py-3 items-center"
              }
              onPress={() => setMealType(m)}
            >
              <Text className={mealType === m ? "text-xs font-semibold text-white capitalize" : "text-xs font-semibold text-app-text capitalize"}>
                {t(`dashboard.meals.${m}`, { defaultValue: m })}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between rounded-3xl border border-app-border bg-white p-4">
        <View>
          <Text className="text-sm font-semibold text-app-text">Portion Quantity</Text>
          <Text className="text-xs text-app-muted">{food.serving}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityLabel="Decrease quantity"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-app-surface active:bg-app-border"
            onPress={() => setQuantity((q) => Math.max(0.5, q - 0.5))}
          >
            <Text className="text-xl font-bold text-app-text">-</Text>
          </Pressable>
          <Text className="min-w-8 text-center text-lg font-bold text-app-text">{quantity}x</Text>
          <Pressable
            accessibilityLabel="Increase quantity"
            accessibilityRole="button"
            className="h-10 w-10 items-center justify-center rounded-full bg-app-surface active:bg-app-border"
            onPress={() => setQuantity((q) => Math.min(10, q + 0.5))}
          >
            <Text className="text-xl font-bold text-app-text">+</Text>
          </Pressable>
        </View>
      </View>

      {message ? (
        <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted">
          {message}
        </Text>
      ) : null}

      <PrimaryButton disabled={saving} icon="add" label={saving ? "Logging…" : "Add to Today"} onPress={() => void handleAdd()} />
    </AppScreen>
  );
}
