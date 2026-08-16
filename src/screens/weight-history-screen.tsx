import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { kilogramsToPounds } from "@/domain/nutrition-calculator";
import { useServerProAccess } from "@/features/subscription/server-pro-access";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Pressable, Text, View } from "@/tw";
import type { Id } from "../../convex/_generated/dataModel";

function dateDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return currentLocalDate(value);
}

export function WeightHistoryScreen() {
  const { t } = useTranslation();

  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("weight.historyTitle")} />
      </AppScreen>
    );
  }
  return <ConfiguredWeightHistory />;
}

/** Weight history with per-entry deletion. Free accounts see a shorter window. */
function ConfiguredWeightHistory() {
  const { i18n, t } = useTranslation();
  const isPro = useServerProAccess();
  const weights = useQuery(api.weights.getHistory, {
    fromDate: dateDaysAgo(isPro ? 3_650 : 29),
    toDate: currentLocalDate(),
    limit: isPro ? 500 : 100,
  });
  const profile = useQuery(api.profiles.getCurrent, {});
  const removeWeight = useMutation(api.weights.remove);

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "error" } | null>(null);

  if (weights === undefined || profile === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={4} />
      </AppScreen>
    );
  }

  const unit = profile?.weightUnit ?? "kg";
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium" });

  const format = (kilograms: number) =>
    `${number.format(unit === "lb" ? kilogramsToPounds(kilograms) : kilograms)} ${unit}`;

  const remove = async (id: Id<"weightLogs">) => {
    setDeletingId(id);
    setNotice(null);
    try {
      await removeWeight({ id });
      setNotice({ message: t("weight.deleted"), tone: "info" });
    } catch {
      setNotice({ message: t("weight.deleteError"), tone: "error" });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle title={t("weight.historyTitle")} />

      {weights.length === 0 ? (
        <EmptyState
          action={t("weight.addTitle")}
          description={t("weight.historyEmptyDescription")}
          icon="weight"
          onAction={() => router.push("/(app)/weight/add")}
          title={t("weight.historyEmptyTitle")}
        />
      ) : (
        <>
          <SectionHeader
            action={
              <Text className="text-xs font-medium text-app-muted">
                {t("weight.entryCount", { count: weights.length })}
              </Text>
            }
            icon="weight"
            title={t("progress.weightEntries")}
          />

          <SectionCard padded={false}>
            {weights.map((entry, index) => {
              const [year, month, day] = entry.localDate.split("-").map(Number);
              return (
                <View key={entry._id}>
                  {index > 0 ? <View className="h-px bg-app-border-soft" /> : null}
                  <View className="min-h-16 flex-row items-center gap-3 px-4 py-3">
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text
                        className="text-base font-bold text-app-text"
                        selectable
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {format(entry.normalizedKg)}
                      </Text>
                      <Text className="text-[13px] text-app-muted" selectable>
                        {dateFormatter.format(new Date(Date.UTC(year, month - 1, day)))}
                      </Text>
                      {entry.note ? (
                        <Text className="text-[13px] leading-[18px] text-app-muted" numberOfLines={2} selectable>
                          {entry.note}
                        </Text>
                      ) : null}
                    </View>

                    <Pressable
                      accessibilityLabel={t("common.edit")}
                      accessibilityRole="button"
                      className="h-11 w-11 items-center justify-center rounded-full active:bg-app-surface"
                      onPress={() => router.push({ pathname: "/(app)/weight/add", params: { id: entry._id } })}
                    >
                      <AppIcon color={colors.muted} name="edit" size={19} />
                    </Pressable>

                    <Pressable
                      accessibilityLabel={t("weight.deleteEntry")}
                      accessibilityRole="button"
                      accessibilityState={{ busy: deletingId === entry._id, disabled: deletingId !== null }}
                      className="h-11 w-11 items-center justify-center rounded-full active:bg-app-error-surface"
                      disabled={deletingId !== null}
                      onPress={() => void remove(entry._id)}
                    >
                      <AppIcon color={colors.danger} name="delete" size={19} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </SectionCard>
        </>
      )}

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}
    </AppScreen>
  );
}
