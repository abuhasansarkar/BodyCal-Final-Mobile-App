import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { RowGroup, ToggleRow } from "@/components/ui/rows";
import { ScreenTitle, SectionCard } from "@/components/ui/section-card";
import { InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { View } from "@/tw";
import type { Id } from "../../convex/_generated/dataModel";
import type { MealType } from "@/types/domain";

export function CustomFoodScreen() {
  const { t } = useTranslation();
  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("manualFood.title")} />
      </AppScreen>
    );
  }
  return <ConfiguredCustomFood />;
}

/**
 * Manual food entry and custom food editor.
 *
 * Supports creating new custom/manual entries as well as editing existing library items
 * when `customFoodId` is present.
 */
function ConfiguredCustomFood() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    customFoodId?: string;
    name?: string;
    serving?: string;
    calories?: string;
    protein?: string;
    carbs?: string;
    fat?: string;
  }>();

  const customFoodId = params.customFoodId as Id<"customFoods"> | undefined;
  const customFood = useQuery(
    api.foods.getCustomFoodById,
    customFoodId ? { id: customFoodId } : "skip",
  );

  const createLog = useMutation(api.foodLogs.create);
  const createCustomFood = useMutation(api.foods.createCustomFood);
  const updateCustomFood = useMutation(api.foods.updateCustomFood);

  const [name, setName] = React.useState(params.name ?? "");
  const [serving, setServing] = React.useState(params.serving ?? "1 serving");
  const [calories, setCalories] = React.useState(params.calories ?? "");
  const [protein, setProtein] = React.useState(params.protein ?? "");
  const [carbs, setCarbs] = React.useState(params.carbs ?? "");
  const [fat, setFat] = React.useState(params.fat ?? "");
  const [mealType, setMealType] = React.useState<MealType>("snack");
  const [alsoSave, setAlsoSave] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "error" } | null>(null);

  const seeded = React.useRef(false);
  React.useEffect(() => {
    if (!customFood || seeded.current) return;
    seeded.current = true;
    setName(customFood.name);
    setServing(customFood.serving);
    setCalories(String(customFood.calories));
    setProtein(String(customFood.proteinGrams));
    setCarbs(String(customFood.carbsGrams));
    setFat(String(customFood.fatGrams));
  }, [customFood]);

  if (customFoodId && customFood === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={4} />
      </AppScreen>
    );
  }

  const numberError = (value: string, max: number) => {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? null : `0–${max}`;
  };

  const caloriesError = numberError(calories, 20_000);
  const proteinError = numberError(protein, 2_000);
  const carbsError = numberError(carbs, 2_000);
  const fatError = numberError(fat, 2_000);

  const canSave =
    name.trim().length > 0 &&
    calories.trim().length > 0 &&
    !caloriesError &&
    !proteinError &&
    !carbsError &&
    !fatError &&
    !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true);
    setNotice(null);

    const nutrition = {
      calories: Number(calories),
      proteinGrams: Number(protein || 0),
      carbsGrams: Number(carbs || 0),
      fatGrams: Number(fat || 0),
    };
    const payload = {
      ...nutrition,
      foodName: name.trim(),
      serving: serving.trim() || t("manualFood.defaultServing"),
      servingUnit: "serving",
      quantity: 1,
      mealType,
      source: "manual" as const,
      localDate: currentLocalDate(),
      timezone: currentTimezone(),
      clientRequestId: createClientRequestId(),
    };

    try {
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        await enqueueOutbox({ id: payload.clientRequestId, kind: "foodLog.create", payload });
        setNotice({ message: t("manualFood.savedOffline"), tone: "info" });
        setTimeout(() => router.back(), 1_000);
        return;
      }

      await createLog(payload);

      if (customFoodId) {
        await updateCustomFood({
          id: customFoodId,
          ...nutrition,
          name: payload.foodName,
          serving: payload.serving,
          servingUnit: payload.servingUnit,
        }).catch(() => undefined);
      } else if (alsoSave) {
        await createCustomFood({
          ...nutrition,
          name: payload.foodName,
          serving: payload.serving,
          servingUnit: payload.servingUnit,
        }).catch(() => undefined);
      }
      router.replace("/(app)/(tabs)/today");
    } catch {
      setNotice({ message: t("manualFood.saveError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("manualFood.subtitle")} title={t("manualFood.title")} />

      <SectionCard>
        <View className="gap-4">
          <Field label={t("manualFood.name")} onChangeText={setName} value={name} />
          <Field label={t("manualFood.serving")} onChangeText={setServing} value={serving} />

          <FieldGroup label={t("manualFood.mealLabel")}>
            <SegmentedControl
              accessibilityLabel={t("manualFood.mealLabel")}
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
            label={t("manualFood.calories")}
            onChangeText={setCalories}
            value={calories}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                error={proteinError}
                keyboardType="decimal-pad"
                label={t("manualFood.protein")}
                onChangeText={setProtein}
                value={protein}
              />
            </View>
            <View className="flex-1">
              <Field
                error={carbsError}
                keyboardType="decimal-pad"
                label={t("manualFood.carbs")}
                onChangeText={setCarbs}
                value={carbs}
              />
            </View>
            <View className="flex-1">
              <Field
                error={fatError}
                keyboardType="decimal-pad"
                label={t("manualFood.fat")}
                onChangeText={setFat}
                value={fat}
              />
            </View>
          </View>
        </View>
      </SectionCard>

      {!customFoodId ? (
        <RowGroup>
          {[
            <ToggleRow
              icon="heart"
              key="library"
              onValueChange={setAlsoSave}
              title={t("manualFood.saveToLibrary")}
              value={alsoSave}
            />,
          ]}
        </RowGroup>
      ) : null}

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={!canSave}
        icon="add"
        label={saving ? t("foodDetail.logging") : t("manualFood.addToDay")}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}
