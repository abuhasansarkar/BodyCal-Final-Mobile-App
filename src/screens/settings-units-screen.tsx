import { useMutation, useQuery } from "convex/react";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { ChoiceRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle, SectionHeader } from "@/components/ui/section-card";
import { InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { View } from "@/tw";
import type { HeightUnit, WeightUnit } from "@/types/domain";

export function SettingsUnitsScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredUnits />;
  return (
    <AppScreen>
      <ScreenTitle description={t("unitSettings.subtitle")} title={t("unitSettings.title")} />
    </AppScreen>
  );
}

/**
 * Display units only.
 *
 * Storage is always kilograms and centimetres; this screen changes presentation
 * and is mirrored to `userSettings` so the choice follows the account.
 */
function ConfiguredUnits() {
  const { t } = useTranslation();
  const profile = useQuery(api.profiles.getCurrent, {});
  const updateProfile = useMutation(api.profiles.update);
  const updateSettings = useMutation(api.settings.update);
  const [notice, setNotice] = React.useState<{ message: string; tone: "success" | "error" } | null>(null);

  if (profile === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={2} />
      </AppScreen>
    );
  }

  const weightUnit: WeightUnit = profile?.weightUnit ?? "kg";
  const heightUnit: HeightUnit = profile?.heightUnit ?? "cm";

  const save = async (next: { weightUnit?: WeightUnit; heightUnit?: HeightUnit }) => {
    setNotice(null);
    try {
      if (profile) await updateProfile(next);
      const resolvedWeight = next.weightUnit ?? weightUnit;
      const resolvedHeight = next.heightUnit ?? heightUnit;
      await updateSettings({
        units: resolvedWeight === "kg" && resolvedHeight === "cm" ? "metric" : "imperial",
      });
      setNotice({ message: t("unitSettings.saved"), tone: "success" });
    } catch {
      setNotice({ message: t("unitSettings.saveError"), tone: "error" });
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("unitSettings.subtitle")} title={t("unitSettings.title")} />

      <View className="gap-3">
        <SectionHeader icon="weight" title={t("unitSettings.weightUnit")} />
        <RowGroup>
          {[
            <ChoiceRow
              key="kg"
              onPress={() => void save({ weightUnit: "kg" })}
              selected={weightUnit === "kg"}
              title={t("unitSettings.kilograms")}
            />,
            <ChoiceRow
              key="lb"
              onPress={() => void save({ weightUnit: "lb" })}
              selected={weightUnit === "lb"}
              title={t("unitSettings.pounds")}
            />,
          ]}
        </RowGroup>
      </View>

      <View className="gap-3">
        <SectionHeader icon="units" title={t("unitSettings.heightUnit")} />
        <RowGroup>
          {[
            <ChoiceRow
              key="cm"
              onPress={() => void save({ heightUnit: "cm" })}
              selected={heightUnit === "cm"}
              title={t("unitSettings.centimetres")}
            />,
            <ChoiceRow
              key="imperial"
              onPress={() => void save({ heightUnit: "imperial" })}
              selected={heightUnit === "imperial"}
              title={t("unitSettings.feetInches")}
            />,
          ]}
        </RowGroup>
      </View>

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}
    </AppScreen>
  );
}
