import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
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
import type { Id } from "../../../../convex/_generated/dataModel";
import type { MealType } from "@/types/domain";

/**
 * Turns the estimate's meal-type hint into a meal the app actually logs against.
 *
 * A drink, or a photo the model could not place, falls back to the time of day
 * rather than to a fixed guess — logging a 9 a.m. coffee as lunch is a worse
 * default than reading the clock. It is a preselection either way, and the user
 * can change it before saving.
 */
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

/** Edits an AI estimate before it is saved. Every value stays correctable. */
export default function EditScanRoute() {
  const { t } = useTranslation();
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();

  // Read from the scan rather than from a navigation param, so the values being
  // corrected are the ones actually stored against the scan.
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

  /*
    Seed the fields once the estimate arrives, and only once: these are edit
    fields, and a later re-render of the same scan must never overwrite what the
    user has typed into them.
  */
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
        // Shown on the entry afterwards, so it has to come from the active
        // language rather than being pinned to English at write time.
        serving: t("scan.estimatedServing"),
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
