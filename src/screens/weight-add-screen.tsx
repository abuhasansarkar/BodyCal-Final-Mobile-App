import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field } from "@/components/ui/form";
import { ScreenTitle, SectionCard } from "@/components/ui/section-card";
import { InlineNotice } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import {
  kilogramsToPounds,
  NUTRITION_LIMITS,
  poundsToKilograms,
} from "@/domain/nutrition-calculator";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { View } from "@/tw";
import type { WeightUnit } from "@/types/domain";
import type { Id } from "../../convex/_generated/dataModel";

export function WeightAddScreen({ id }: { id?: string }) {
  const { t } = useTranslation();
  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("weight.addTitle")} />
      </AppScreen>
    );
  }
  return <ConfiguredWeightForm id={id as Id<"weightLogs"> | undefined} />;
}

/**
 * Weight entry.
 *
 * Values are entered in the user's display unit and normalised to kilograms
 * before they are stored, per the storage rules in AGENTS.md.
 */
function ConfiguredWeightForm({ id }: { id?: Id<"weightLogs"> }) {
  const { t } = useTranslation();
  const profile = useQuery(api.profiles.getCurrent, {});
  const entry = useQuery(api.weights.getById, id ? { id } : "skip");
  const create = useMutation(api.weights.create);
  const update = useMutation(api.weights.update);

  const [value, setValue] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "error" } | null>(null);
  const hydratedId = React.useRef<string | null>(null);

  const unit: WeightUnit = profile?.weightUnit ?? "kg";
  React.useEffect(() => {
    if (!id || !entry || !profile || hydratedId.current === id) return;
    const display = unit === "lb" ? kilogramsToPounds(entry.normalizedKg) : entry.normalizedKg;
    setValue(String(Number(display.toFixed(1))));
    setNote(entry.note ?? "");
    hydratedId.current = id;
  }, [entry, id, profile, unit]);
  const entered = Number(value);
  const kilograms = unit === "lb" ? poundsToKilograms(entered) : entered;
  const inRange =
    Number.isFinite(kilograms) &&
    kilograms >= NUTRITION_LIMITS.minWeightKg &&
    kilograms <= NUTRITION_LIMITS.maxWeightKg;
  const error = value.trim() === "" || inRange ? null : t("weight.rangeHint");

  const submit = async () => {
    if (!inRange || saving) return;
    setSaving(true);
    setNotice(null);

    const values = {
      normalizedKg: Number(kilograms.toFixed(2)),
      displayValue: entered,
      displayUnit: unit,
      note: note.trim() || undefined,
    };
    const payload = {
      ...values,
      localDate: currentLocalDate(),
      timezone: currentTimezone(),
      clientRequestId: createClientRequestId(),
    };

    try {
      if (id) {
        await update({ id, ...values });
        router.back();
        return;
      }
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        await enqueueOutbox({ id: payload.clientRequestId, kind: "weight.create", payload });
        setNotice({ message: t("weight.savedOffline"), tone: "info" });
        setTimeout(() => router.back(), 1_000);
        return;
      }
      await create(payload);
      router.back();
    } catch {
      setNotice({ message: t("weight.saveError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle
        description={t("weight.addSubtitle")}
        title={t(id ? "weight.editTitle" : "weight.addTitle")}
      />

      <SectionCard>
        <View className="gap-4">
          <Field
            error={error}
            hint={t("weight.rangeHint")}
            keyboardType="decimal-pad"
            label={t("weight.weightLabel")}
            onChangeText={setValue}
            suffix={unit}
            value={value}
          />
          <Field
            hint={t("common.optional")}
            label={t("weight.noteLabel")}
            maxLength={500}
            onChangeText={setNote}
            placeholder={t("weight.notePlaceholder")}
            value={note}
          />
        </View>
      </SectionCard>

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={!inRange || saving}
        icon="weight"
        label={saving ? t("common.saving") : t("weight.save")}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}
