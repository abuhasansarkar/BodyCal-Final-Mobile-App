import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { ScreenTitle, SectionCard } from "@/components/ui/section-card";
import { InlineNotice } from "@/components/ui/states";
import { nutritionEstimateSchema } from "@/domain/schemas";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { View } from "@/tw";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { MealType } from "@/types/domain";

/** Edits an AI estimate before it is saved. Every value stays correctable. */
export default function EditScanRoute() {
  const { t } = useTranslation();
  const { estimate: rawEstimate, scanId } = useLocalSearchParams<{
    estimate?: string;
    scanId?: string;
  }>();

  const parsed = React.useMemo(() => {
    try {
      return nutritionEstimateSchema.parse(JSON.parse(rawEstimate ?? "null"));
    } catch {
      return null;
    }
  }, [rawEstimate]);

  const create = useMutation(api.foodLogs.create);

  const [name, setName] = React.useState(parsed?.mealName ?? "");
  const [mealType, setMealType] = React.useState<MealType>("lunch");
  const [calories, setCalories] = React.useState(String(parsed?.nutrition.calories ?? ""));
  const [protein, setProtein] = React.useState(String(parsed?.nutrition.proteinGrams ?? ""));
  const [carbs, setCarbs] = React.useState(String(parsed?.nutrition.carbsGrams ?? ""));
  const [fat, setFat] = React.useState(String(parsed?.nutrition.fatGrams ?? ""));
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const rangeError = (value: string, max: number) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 && number <= max ? null : `0–${max}`;
  };

  const caloriesError = rangeError(calories, 20_000);
  const proteinError = rangeError(protein, 2_000);
  const carbsError = rangeError(carbs, 2_000);
  const fatError = rangeError(fat, 2_000);
  const canSave =
    name.trim().length > 0 && !caloriesError && !proteinError && !carbsError && !fatError && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await create({
        localDate: currentLocalDate(),
        timezone: currentTimezone(),
        mealType,
        source: "ai",
        foodName: name.trim(),
        serving: "1 estimated meal",
        servingUnit: "serving",
        quantity: 1,
        calories: Number(calories),
        proteinGrams: Number(protein),
        carbsGrams: Number(carbs),
        fatGrams: Number(fat),
        aiScanId: scanId as Id<"aiScans"> | undefined,
        clientRequestId: createClientRequestId(),
      });
      router.replace("/(app)/(tabs)/today");
    } catch {
      setError(t("foodDetail.logError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("scan.editSubtitle")} title={t("scan.editTitle")} />

      <SectionCard>
        <View className="gap-4">
          <Field label={t("scan.mealName")} onChangeText={setName} value={name} />

          <FieldGroup label={t("foodDetail.selectMeal")}>
            <SegmentedControl
              accessibilityLabel={t("foodDetail.selectMeal")}
              onChange={setMealType}
              options={[
                { value: "breakfast", label: t("foodCategories.breakfast") },
                { value: "lunch", label: t("foodCategories.lunch") },
                { value: "dinner", label: t("foodCategories.dinner") },
                { value: "snack", label: t("foodCategories.snack") },
              ]}
              value={mealType}
            />
          </FieldGroup>
        </View>
      </SectionCard>

      <SectionCard>
        <View className="gap-4">
          <Field
            error={caloriesError}
            keyboardType="decimal-pad"
            label={t("foodLogEdit.caloriesKcal")}
            onChangeText={setCalories}
            value={calories}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                error={proteinError}
                keyboardType="decimal-pad"
                label={t("foodLogEdit.proteinG")}
                onChangeText={setProtein}
                value={protein}
              />
            </View>
            <View className="flex-1">
              <Field
                error={carbsError}
                keyboardType="decimal-pad"
                label={t("foodLogEdit.carbsG")}
                onChangeText={setCarbs}
                value={carbs}
              />
            </View>
            <View className="flex-1">
              <Field
                error={fatError}
                keyboardType="decimal-pad"
                label={t("foodLogEdit.fatG")}
                onChangeText={setFat}
                value={fat}
              />
            </View>
          </View>
        </View>
      </SectionCard>

      <InlineNotice message={t("nutritionTargets.estimateNote")} />
      {error ? <InlineNotice message={error} tone="error" /> : null}

      <PrimaryButton
        disabled={!canSave}
        icon="add"
        label={saving ? t("foodDetail.logging") : t("foodDetail.addToDay")}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}
