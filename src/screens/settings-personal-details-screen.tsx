import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { ChoiceRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { NUTRITION_LIMITS } from "@/domain/nutrition-calculator";
import { api } from "@/lib/convex-api";
import { View } from "@/tw";
import type { ActivityLevel, CalculationBasis } from "@/types/domain";

const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "active", "veryActive"];
const ACTIVITY_LABEL_KEY: Record<ActivityLevel, string> = {
  sedentary: "personalDetails.activitySedentary",
  light: "personalDetails.activityLight",
  active: "personalDetails.activityActive",
  veryActive: "personalDetails.activityVeryActive",
};

export function SettingsPersonalDetailsScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredPersonalDetails />;
  return (
    <AppScreen>
      <ScreenTitle description={t("config.body")} title={t("personalDetails.title")} />
    </AppScreen>
  );
}

function ConfiguredPersonalDetails() {
  const { t } = useTranslation();
  const profile = useQuery(api.profiles.getCurrent, {});

  if (profile === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={4} />
      </AppScreen>
    );
  }

  // The server no longer invents a profile from defaults, so an incomplete
  // account is surfaced instead of silently fabricating height and weight.
  if (profile === null) {
    return (
      <AppScreen>
        <ScreenTitle description={t("personalDetails.subtitle")} title={t("personalDetails.title")} />
        <EmptyState
          description={t("personalDetails.incomplete")}
          icon="personalDetails"
          title={t("personalDetails.title")}
        />
      </AppScreen>
    );
  }

  return <PersonalDetailsForm key={profile._id} profile={profile} />;
}

type Profile = {
  dateOfBirth: string;
  calculationBasis: CalculationBasis;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
};

function PersonalDetailsForm({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const updateProfile = useMutation(api.profiles.update);

  const [basis, setBasis] = React.useState<CalculationBasis>(profile.calculationBasis);
  const [dateOfBirth, setDateOfBirth] = React.useState(profile.dateOfBirth);
  const [heightCm, setHeightCm] = React.useState(String(profile.heightCm));
  const [weightKg, setWeightKg] = React.useState(String(profile.currentWeightKg));
  const [activity, setActivity] = React.useState<ActivityLevel>(profile.activityLevel);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "success" | "error" } | null>(null);

  const heightValue = Number(heightCm);
  const weightValue = Number(weightKg);
  const heightError =
    Number.isFinite(heightValue) &&
    heightValue >= NUTRITION_LIMITS.minHeightCm &&
    heightValue <= NUTRITION_LIMITS.maxHeightCm
      ? null
      : `${NUTRITION_LIMITS.minHeightCm}–${NUTRITION_LIMITS.maxHeightCm} cm`;
  const weightError =
    Number.isFinite(weightValue) &&
    weightValue >= NUTRITION_LIMITS.minWeightKg &&
    weightValue <= NUTRITION_LIMITS.maxWeightKg
      ? null
      : `${NUTRITION_LIMITS.minWeightKg}–${NUTRITION_LIMITS.maxWeightKg} kg`;
  const dobError = /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) ? null : t("personalDetails.dateOfBirthHint");

  const canSave = !heightError && !weightError && !dobError && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setNotice(null);
    try {
      await updateProfile({
        calculationBasis: basis,
        dateOfBirth,
        heightCm: heightValue,
        currentWeightKg: weightValue,
        activityLevel: activity,
      });
      setNotice({ message: t("personalDetails.saved"), tone: "success" });
      setTimeout(() => router.back(), 900);
    } catch {
      setNotice({ message: t("personalDetails.saveError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("personalDetails.subtitle")} title={t("personalDetails.title")} />

      <SectionCard>
        <View className="gap-4">
          <FieldGroup hint={t("personalDetails.basisHint")} label={t("personalDetails.basisLabel")}>
            <SegmentedControl
              accessibilityLabel={t("personalDetails.basisLabel")}
              onChange={setBasis}
              options={[
                { value: "male", label: t("personalDetails.male") },
                { value: "female", label: t("personalDetails.female") },
              ]}
              value={basis}
            />
          </FieldGroup>

          <Field
            autoCapitalize="none"
            error={dobError}
            hint={t("personalDetails.dateOfBirthHint")}
            keyboardType="numbers-and-punctuation"
            label={t("personalDetails.dateOfBirth")}
            onChangeText={setDateOfBirth}
            placeholder="1994-07-01"
            value={dateOfBirth}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                error={heightError}
                keyboardType="decimal-pad"
                label={t("personalDetails.height")}
                onChangeText={setHeightCm}
                suffix="cm"
                value={heightCm}
              />
            </View>
            <View className="flex-1">
              <Field
                error={weightError}
                keyboardType="decimal-pad"
                label={t("personalDetails.weight")}
                onChangeText={setWeightKg}
                suffix="kg"
                value={weightKg}
              />
            </View>
          </View>
        </View>
      </SectionCard>

      <View className="gap-3">
        <SectionHeader icon="activity" title={t("personalDetails.activityLabel")} />
        <RowGroup>
          {ACTIVITY_LEVELS.map((level) => (
            <ChoiceRow
              key={level}
              onPress={() => setActivity(level)}
              selected={activity === level}
              title={t(ACTIVITY_LABEL_KEY[level])}
            />
          ))}
        </RowGroup>
      </View>

      <InlineNotice message={t("personalDetails.recalculateNotice")} />
      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={!canSave}
        icon="check"
        label={saving ? t("common.saving") : t("common.save")}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}
