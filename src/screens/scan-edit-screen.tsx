import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { ScreenTitle, SectionCard } from "@/components/ui/section-card";
import { InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { View } from "@/tw";
import type { Id } from "../../convex/_generated/dataModel";
import type { MealType } from "@/types/domain";

function mealTypeFromEstimate(hint: string): MealType {
  if (hint === "breakfast" || hint === "lunch" || hint === "dinner" || hint === "snack") {
    return hint;
  }
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

export function ScanEditScreen({ scanId }: { scanId?: string }) {
  const { t } = useTranslation();

  const scan = useQuery(
    api.aiDb.getScan,
    scanId ? { scanId: scanId as Id<"aiScans"> } : "skip",
  );
  const parsed = scan?.estimate ?? null;

  const create = useMutation(api.foodLogs.create);

  const [name, setName] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType>("lunch");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!parsed || seeded.current) return;
    seeded.current = true;
    setName(parsed.mealName);
    setMealType(mealTypeFromEstimate(parsed.mealType));
    setCalories(String(Math.round(parsed.nutrition.calories)));
    setProtein(String(Math.round(parsed.nutrition.proteinGrams)));
    setCarbs(String(Math.round(parsed.nutrition.carbsGrams)));
    setFat(String(Math.round(parsed.nutrition.fatGrams)));
  }, [parsed]);

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
        serving: t("scan.estimatedServing"),
        servingUnit: "serving",
        quantity: 1,
        calories: Number(calories),
        proteinGrams: Number(protein),
        carbsGrams: Number(carbs),
        fatGrams: Number(fat),
        imageStorageId: scan?.imageStorageId,
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

  if (scanId && scan === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton />
      </AppScreen>
    );
  }

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

          <Field
            error={caloriesError}
            keyboardType="number-pad"
            label={t("onboarding.result.calories")}
            onChangeText={setCalories}
            suffix={t("dashboard.kcal")}
            value={calories}
          />
          <Field
            error={proteinError}
            keyboardType="number-pad"
            label={t("dashboard.protein")}
            onChangeText={setProtein}
            suffix="g"
            value={protein}
          />
          <Field
            error={carbsError}
            keyboardType="number-pad"
            label={t("dashboard.carbs")}
            onChangeText={setCarbs}
            suffix="g"
            value={carbs}
          />
          <Field
            error={fatError}
            keyboardType="number-pad"
            label={t("dashboard.fat")}
            onChangeText={setFat}
            suffix="g"
            value={fat}
          />
        </View>
      </SectionCard>

      {error ? <InlineNotice message={error} tone="error" /> : null}

      <PrimaryButton
        disabled={!canSave}
        icon="add"
        label={saving ? t("foodDetail.logging") : t("scan.saveAction")}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}
