import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { NutritionSummary } from "@/components/nutrition-summary";
import { PrimaryButton } from "@/components/primary-button";
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { calculateNutritionPlan, NUTRITION_LIMITS } from "@/domain/nutrition-calculator";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { View } from "@/tw";
import type { GoalPace, GoalType } from "@/types/domain";

export function SettingsGoalScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredGoalScreen />;
  return (
    <AppScreen>
      <ScreenTitle description={t("goalSettings.configureConvex")} title={t("goalSettings.title")} />
    </AppScreen>
  );
}

function ConfiguredGoalScreen() {
  const { t } = useTranslation();
  // A single server query returns every input the calculator needs, with the age
  // already resolved from the stored date of birth.
  const inputs = useQuery(api.profiles.getCalculationInputs, {});

  if (inputs === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={3} />
      </AppScreen>
    );
  }

  if (inputs === null) {
    return (
      <AppScreen>
        <ScreenTitle description={t("goalSettings.subtitle")} title={t("goalSettings.title")} />
        <EmptyState
          action={t("personalDetails.title")}
          description={t("goalSettings.profileRequired")}
          icon="personalDetails"
          onAction={() => router.push("/(app)/settings/personal-details")}
          title={t("goalSettings.title")}
        />
      </AppScreen>
    );
  }

  return <GoalForm inputs={inputs} key={`${inputs.goal}-${inputs.pace}-${inputs.goalWeightKg}`} />;
}

type CalculationInputs = {
  age: number;
  calculationBasis: "female" | "male";
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: "sedentary" | "light" | "active" | "veryActive";
  goal: GoalType;
  pace: GoalPace;
};

/**
 * Goal editor with a live preview.
 *
 * Targets are previewed with the shared calculator and written through
 * `nutritionGoals.createGoal`, which recomputes and range-checks them server-side.
 * Saving replaces only today's goal — history is never rewritten.
 */
function GoalForm({ inputs }: { inputs: CalculationInputs }) {
  const { t } = useTranslation();
  const updateProfile = useMutation(api.profiles.update);
  const createGoal = useMutation(api.nutritionGoals.createGoal);

  const [goalType, setGoalType] = React.useState<GoalType>(inputs.goal);
  const [goalPace, setGoalPace] = React.useState<GoalPace>(inputs.pace);
  const [goalWeight, setGoalWeight] = React.useState(String(inputs.goalWeightKg));
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "success" | "error" } | null>(null);

  const weightValue = Number(goalWeight);
  const weightError =
    Number.isFinite(weightValue) &&
    weightValue >= NUTRITION_LIMITS.minWeightKg &&
    weightValue <= NUTRITION_LIMITS.maxWeightKg
      ? null
      : `${NUTRITION_LIMITS.minWeightKg}–${NUTRITION_LIMITS.maxWeightKg} kg`;

  const preview = React.useMemo(() => {
    if (weightError) return null;
    try {
      return calculateNutritionPlan({
        age: inputs.age,
        calculationBasis: inputs.calculationBasis,
        heightCm: inputs.heightCm,
        currentWeightKg: inputs.currentWeightKg,
        goalWeightKg: weightValue,
        activityLevel: inputs.activityLevel,
        goal: goalType,
        pace: goalPace,
      });
    } catch {
      return null;
    }
  }, [goalPace, goalType, inputs, weightError, weightValue]);

  const save = async () => {
    if (saving || !preview) return;
    setSaving(true);
    setNotice(null);
    try {
      await updateProfile({ goalType, goalPace, goalWeightKg: weightValue });
      await createGoal({
        calories: preview.calories,
        proteinGrams: preview.proteinGrams,
        carbsGrams: preview.carbsGrams,
        fatGrams: preview.fatGrams,
        effectiveFrom: currentLocalDate(),
        isManualOverride: false,
        formulaVersion: preview.formulaVersion,
        calculationMetadata: {
          bmr: preview.bmr,
          tdee: preview.tdee,
          requestedAdjustment: preview.requestedAdjustment,
          appliedAdjustment: preview.appliedAdjustment,
          paceWasCapped: preview.paceWasCapped,
          aiGenerated: false,
          inputs: {
            age: inputs.age,
            calculationBasis: inputs.calculationBasis,
            heightCm: inputs.heightCm,
            currentWeightKg: inputs.currentWeightKg,
            goalWeightKg: weightValue,
            activityLevel: inputs.activityLevel,
            goalType,
            goalPace,
          },
        },
      });
      setNotice({ message: t("goalSettings.saveSuccess"), tone: "success" });
      setTimeout(() => router.back(), 900);
    } catch {
      setNotice({ message: t("goalSettings.saveError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("goalSettings.subtitle")} title={t("goalSettings.title")} />

      <SectionCard>
        <View className="gap-4">
          <FieldGroup label={t("goalSettings.primaryGoalLabel")}>
            <SegmentedControl
              accessibilityLabel={t("goalSettings.primaryGoalLabel")}
              onChange={setGoalType}
              options={[
                { value: "lose", label: t("goalSettings.goalTypeLose") },
                { value: "maintain", label: t("goalSettings.goalTypeMaintain") },
                { value: "gain", label: t("goalSettings.goalTypeGain") },
              ]}
              value={goalType}
            />
          </FieldGroup>

          <Field
            error={weightError}
            keyboardType="decimal-pad"
            label={t("goalSettings.targetWeightLabel")}
            onChangeText={setGoalWeight}
            suffix="kg"
            value={goalWeight}
          />

          <FieldGroup label={t("goalSettings.paceLabel")}>
            <SegmentedControl
              accessibilityLabel={t("goalSettings.paceLabel")}
              onChange={setGoalPace}
              options={[
                { value: "slow", label: t("goalSettings.paceSlow") },
                { value: "recommended", label: t("goalSettings.paceRecommended") },
                { value: "faster", label: t("goalSettings.paceFaster") },
              ]}
              value={goalPace}
            />
          </FieldGroup>
        </View>
      </SectionCard>

      {preview ? (
        <View className="gap-3">
          <SectionHeader icon="nutrition" title={t("nutritionTargets.currentPlan")} />
          <NutritionSummary
            calories={preview.calories}
            carbsGrams={preview.carbsGrams}
            fatGrams={preview.fatGrams}
            proteinGrams={preview.proteinGrams}
          />
          {preview.paceWasCapped ? (
            <InlineNotice message={t("onboarding.result.safetyLimited")} />
          ) : null}
          <InlineNotice message={t("nutritionTargets.estimateNote")} />
        </View>
      ) : null}

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={saving || !preview}
        icon="check"
        label={saving ? t("goalSettings.recalculating") : t("goalSettings.saveAndRecalculate")}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}
