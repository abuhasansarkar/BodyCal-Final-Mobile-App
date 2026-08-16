import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field } from "@/components/ui/form";
import { DetailRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { calculateNutritionPlan, NUTRITION_LIMITS } from "@/domain/nutrition-calculator";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Pressable, Text, View } from "@/tw";

export function SettingsNutritionTargetsScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredNutritionTargets />;
  return (
    <AppScreen>
      <ScreenTitle description={t("config.body")} title={t("nutritionTargets.title")} />
    </AppScreen>
  );
}

function ConfiguredNutritionTargets() {
  const activeGoal = useQuery(api.nutritionGoals.getActive, { localDate: currentLocalDate() });
  const inputs = useQuery(api.profiles.getCalculationInputs, {});

  if (activeGoal === undefined || inputs === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={3} />
      </AppScreen>
    );
  }

  return <TargetsForm activeGoal={activeGoal} inputs={inputs} key={activeGoal?._id ?? "new"} />;
}

type Goal = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  isManualOverride: boolean;
} | null;

type Inputs = {
  age: number;
  calculationBasis: "female" | "male";
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: "sedentary" | "light" | "active" | "veryActive";
  goal: "lose" | "maintain" | "gain";
  pace: "slow" | "recommended" | "faster";
} | null;

/**
 * Manual target override, with a way back to the calculated plan.
 *
 * Previously this screen silently coerced bad input to a default (`Number(x) || 2000`).
 * Now every field is validated inline and the server range-checks again on write.
 */
function TargetsForm({ activeGoal, inputs }: { activeGoal: Goal; inputs: Inputs }) {
  const { t } = useTranslation();
  const createGoal = useMutation(api.nutritionGoals.createGoal);

  const calculated = React.useMemo(() => {
    if (!inputs) return null;
    try {
      return calculateNutritionPlan(inputs);
    } catch {
      return null;
    }
  }, [inputs]);

  const [calories, setCalories] = React.useState(String(activeGoal?.calories ?? calculated?.calories ?? 2_000));
  const [protein, setProtein] = React.useState(String(activeGoal?.proteinGrams ?? calculated?.proteinGrams ?? 150));
  const [carbs, setCarbs] = React.useState(String(activeGoal?.carbsGrams ?? calculated?.carbsGrams ?? 225));
  const [fat, setFat] = React.useState(String(activeGoal?.fatGrams ?? calculated?.fatGrams ?? 60));
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "success" | "error" } | null>(null);

  const range = (value: string, min: number, max: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= min && parsed <= max ? null : `${min}–${max}`;
  };

  const caloriesError = range(calories, NUTRITION_LIMITS.minCalories, NUTRITION_LIMITS.maxCalories);
  const proteinError = range(protein, 20, 600);
  const carbsError = range(carbs, 0, 1_500);
  const fatError = range(fat, 10, 600);
  const hasErrors = Boolean(caloriesError || proteinError || carbsError || fatError);

  const macroCalories =
    Number(protein) * 4 + Number(carbs) * 4 + Number(fat) * 9;
  const macroMismatch =
    !hasErrors && Math.abs(macroCalories - Number(calories)) > Number(calories) * 0.1;

  const write = async (
    values: { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number },
    manual: boolean,
    successMessage: string,
  ) => {
    setSaving(true);
    setNotice(null);
    try {
      await createGoal({
        ...values,
        effectiveFrom: currentLocalDate(),
        isManualOverride: manual,
        formulaVersion: manual ? "manual-v1" : "mifflin-st-jeor-v1",
      });
      setNotice({ message: successMessage, tone: "success" });
      setTimeout(() => router.back(), 900);
    } catch {
      setNotice({ message: t("nutritionTargets.saveError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("nutritionTargets.subtitle")} title={t("nutritionTargets.title")} />

      {activeGoal ? (
        <View className="gap-3">
          <SectionHeader
            icon="nutrition"
            title={t("nutritionTargets.currentPlan")}
            action={
              <Text className="text-xs font-semibold uppercase tracking-[0.06em] text-app-muted">
                {activeGoal.isManualOverride
                  ? t("nutritionTargets.manualLabel")
                  : t("nutritionTargets.calculatedLabel")}
              </Text>
            }
          />
          <RowGroup>
            {[
              <DetailRow key="c" label={t("nutritionTargets.calories")} value={String(activeGoal.calories)} />,
              <DetailRow key="p" label={t("nutritionTargets.protein")} value={String(activeGoal.proteinGrams)} />,
              <DetailRow key="ca" label={t("nutritionTargets.carbs")} value={String(activeGoal.carbsGrams)} />,
              <DetailRow key="f" label={t("nutritionTargets.fat")} value={String(activeGoal.fatGrams)} />,
            ]}
          </RowGroup>
        </View>
      ) : null}

      <SectionCard>
        <View className="gap-4">
          <SectionHeader title={t("nutritionTargets.macrosTitle")} />
          <Field
            error={caloriesError}
            keyboardType="number-pad"
            label={t("nutritionTargets.calories")}
            onChangeText={setCalories}
            value={calories}
          />
          <Field
            error={proteinError}
            keyboardType="number-pad"
            label={t("nutritionTargets.protein")}
            onChangeText={setProtein}
            value={protein}
          />
          <Field
            error={carbsError}
            keyboardType="number-pad"
            label={t("nutritionTargets.carbs")}
            onChangeText={setCarbs}
            value={carbs}
          />
          <Field
            error={fatError}
            keyboardType="number-pad"
            label={t("nutritionTargets.fat")}
            onChangeText={setFat}
            value={fat}
          />
        </View>
      </SectionCard>

      {macroMismatch ? <InlineNotice message={t("nutritionTargets.estimateNote")} /> : null}
      {!hasErrors && Number(carbs) < 100 ? (
        <InlineNotice message={t("nutritionTargets.carbWarning")} tone="error" />
      ) : null}
      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={saving || hasErrors}
        icon="check"
        label={saving ? t("common.saving") : t("common.save")}
        onPress={() =>
          void write(
            {
              calories: Number(calories),
              proteinGrams: Number(protein),
              carbsGrams: Number(carbs),
              fatGrams: Number(fat),
            },
            true,
            t("nutritionTargets.saved"),
          )
        }
      />

      {calculated && activeGoal?.isManualOverride ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
          disabled={saving}
          onPress={() =>
            void write(
              {
                calories: calculated.calories,
                proteinGrams: calculated.proteinGrams,
                carbsGrams: calculated.carbsGrams,
                fatGrams: calculated.fatGrams,
              },
              false,
              t("nutritionTargets.resetDone"),
            )
          }
        >
          <Text className="text-base font-semibold text-app-text">
            {t("nutritionTargets.resetToCalculated")}
          </Text>
        </Pressable>
      ) : null}

      <InlineNotice message={t("nutritionTargets.estimateNote")} />
    </AppScreen>
  );
}
