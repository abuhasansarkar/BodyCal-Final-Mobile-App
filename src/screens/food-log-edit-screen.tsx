import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { AuthField } from "@/screens/auth/auth-fields";
import { Pressable, Text, View } from "@/tw";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function FoodLogEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  if (!id) {
    return (
      <AppScreen>
        <Text className="text-app-error">{t("foodLogEdit.invalidId")}</Text>
      </AppScreen>
    );
  }

  if (hasBackendConfiguration) {
    return <ConfiguredFoodLogEdit id={id as Id<"foodLogs">} />;
  }

  return (
    <AppScreen>
      <Text className="text-2xl font-bold text-app-text">{t("foodLogEdit.title")}</Text>
      <Text className="text-app-muted">{t("foodLogEdit.configureConvex")}</Text>
    </AppScreen>
  );
}

function ConfiguredFoodLogEdit({ id }: { id: Id<"foodLogs"> }) {
  const { t } = useTranslation();
  const log = useQuery(api.foodLogs.getById, { id });

  if (log === undefined) {
    return (
      <AppScreen>
        <View className="h-9 w-40 rounded-xl bg-app-surface" />
        <View className="h-5 w-72 rounded-lg bg-app-surface" />
        <View className="h-14 rounded-2xl bg-app-surface" />
        <View className="flex-row gap-2">
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
          <View className="h-11 flex-1 rounded-2xl bg-app-surface" />
        </View>
        <View className="h-14 rounded-2xl bg-app-surface" />
        <View className="h-36 rounded-3xl bg-app-surface" />
        <View className="h-14 rounded-2xl bg-app-surface" />
        <View className="h-14 rounded-2xl bg-app-surface" />
      </AppScreen>
    );
  }

  if (log === null) {
    return (
      <AppScreen>
        <Text className="text-app-error">{t("foodLogEdit.notFound")}</Text>
      </AppScreen>
    );
  }

  return <FoodLogEditForm key={log._id} id={id} log={log} />;
}

type FoodLogRecord = {
  _id: Id<"foodLogs">;
  foodName: string;
  serving: string;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealType: string;
  source: "ai" | "manual" | "catalog";
  localDate: string;
  timezone: string;
  clientRequestId: string;
  imageUrl: string | null;
};

function FoodLogEditForm({ id, log }: { id: Id<"foodLogs">; log: FoodLogRecord }) {
  const updateLog = useMutation(api.foodLogs.update);
  const removeLog = useMutation(api.foodLogs.remove);
  const { t } = useTranslation();

  const [foodName, setFoodName] = React.useState(log.foodName);
  const [serving, setServing] = React.useState(log.serving);
  const [quantity, setQuantity] = React.useState(String(log.quantity));
  const [calories, setCalories] = React.useState(String(log.calories));
  const [proteinGrams, setProteinGrams] = React.useState(String(log.proteinGrams));
  const [carbsGrams, setCarbsGrams] = React.useState(String(log.carbsGrams));
  const [fatGrams, setFatGrams] = React.useState(String(log.fatGrams));
  const [mealType, setMealType] = React.useState<MealType>(log.mealType as MealType);

  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateLog({
        id,
        foodName: foodName.trim() || log.foodName,
        serving: serving.trim() || log.serving,
        servingUnit: log.servingUnit,
        quantity: Math.max(0.1, Number(quantity) || 1),
        calories: Math.max(0, Number(calories) || 0),
        proteinGrams: Math.max(0, Number(proteinGrams) || 0),
        carbsGrams: Math.max(0, Number(carbsGrams) || 0),
        fatGrams: Math.max(0, Number(fatGrams) || 0),
        mealType,
      });
      router.back();
    } catch {
      setError(t("foodLogEdit.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await removeLog({ id });
      router.back();
    } catch {
      setError(t("foodLogEdit.deleteError"));
      setDeleting(false);
    }
  };

  return (
    <AppScreen>
      {/* The entry's own photo when it has one; a generic meal still otherwise. */}
      <FoodThumbnail className="h-52 w-full rounded-3xl bg-app-surface" imageUrl={log.imageUrl} name={foodName} />

      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        {t("foodLogEdit.title")}
      </Text>
      <Text className="text-sm text-app-muted">
        {t("foodLogEdit.subtitle")}
      </Text>

      <AuthField label={t("foodLogEdit.foodName")} onChangeText={setFoodName} value={foodName} />

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">{t("foodLogEdit.mealCategory")}</Text>
        <View className="flex-row gap-2">
          {mealTypes.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected: mealType === m }}
              className={
                mealType === m
                  ? "flex-1 items-center rounded-2xl bg-[#111111] py-3"
                  : "flex-1 items-center rounded-2xl border border-app-border bg-white py-3"
              }
              onPress={() => setMealType(m)}
            >
              <Text className={mealType === m ? "text-xs font-semibold capitalize text-white" : "text-xs font-semibold capitalize text-app-text"}>
                {t(`dashboard.meals.${m}`, { defaultValue: m })}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <AuthField label={t("foodLogEdit.servingDescription")} onChangeText={setServing} value={serving} />
        </View>
        <View className="w-28">
          <AuthField keyboardType="decimal-pad" label={t("foodLogEdit.quantity")} onChangeText={setQuantity} value={quantity} />
        </View>
      </View>

      <View className="gap-3 rounded-3xl border border-app-border bg-white p-4">
        <Text className="text-base font-bold text-app-text">{t("foodLogEdit.nutritionSnapshot")}</Text>
        <AuthField keyboardType="number-pad" label={t("foodLogEdit.caloriesKcal")} onChangeText={setCalories} value={calories} />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <AuthField keyboardType="number-pad" label={t("foodLogEdit.proteinG")} onChangeText={setProteinGrams} value={proteinGrams} />
          </View>
          <View className="flex-1">
            <AuthField keyboardType="number-pad" label={t("foodLogEdit.carbsG")} onChangeText={setCarbsGrams} value={carbsGrams} />
          </View>
          <View className="flex-1">
            <AuthField keyboardType="number-pad" label={t("foodLogEdit.fatG")} onChangeText={setFatGrams} value={fatGrams} />
          </View>
        </View>
      </View>

      {error ? (
        <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-error" selectable>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        disabled={saving || deleting}
        icon="check"
        label={saving ? t("foodLogEdit.saving") : t("foodLogEdit.saveChanges")}
        onPress={() => void handleSave()}
      />

      <Pressable
        accessibilityRole="button"
        className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-[#FFF1F1] px-4 active:bg-[#FFE4E4]"
        disabled={deleting || saving}
        onPress={() => void handleDelete()}
      >
        <AppIcon color="#DC2626" name="delete" size={20} />
        <Text className="text-base font-semibold text-[#DC2626]">
          {deleting ? t("foodLogEdit.deleting") : t("foodLogEdit.deleteMealLog")}
        </Text>
      </Pressable>
    </AppScreen>
  );
}
