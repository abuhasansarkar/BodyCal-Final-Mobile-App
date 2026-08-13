import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenTitle, SectionCard } from "@/components/ui/section-card";
import { EmptyState, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { isProState, useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Pressable, Text, View } from "@/tw";

const FREE_DAYS = 6;
const PRO_DAYS = 3_650;

export default function HistoryRoute() {
  const { t } = useTranslation();
  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("history.title")} />
      </AppScreen>
    );
  }
  return <ConfiguredHistory />;
}

function dateDaysAgo(days: number) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  return currentLocalDate(value);
}

/** Food history, grouped by day, with the free-tier window made explicit. */
function ConfiguredHistory() {
  const { i18n, t } = useTranslation();
  const { state } = useSubscription();
  const isPro = isProState(state);

  const logs = useQuery(api.foodLogs.getHistory, {
    fromDate: dateDaysAgo(isPro ? PRO_DAYS : FREE_DAYS),
    toDate: currentLocalDate(),
    limit: isPro ? 500 : 200,
  });

  if (logs === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={5} />
      </AppScreen>
    );
  }

  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    day: "numeric",
    month: "long",
    weekday: "short",
  });

  const today = currentLocalDate();
  const yesterday = dateDaysAgo(1);

  const grouped = new Map<string, typeof logs>();
  for (const log of logs) {
    grouped.set(log.localDate, [...(grouped.get(log.localDate) ?? []), log]);
  }
  const days = [...grouped.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const dayLabel = (localDate: string) => {
    if (localDate === today) return t("history.groupToday");
    if (localDate === yesterday) return t("history.groupYesterday");
    const [year, month, day] = localDate.split("-").map(Number);
    return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
  };

  return (
    <AppScreen>
      <ScreenTitle
        description={isPro ? t("history.subtitlePro") : t("history.subtitleFree")}
        title={t("history.title")}
      />

      {days.length === 0 ? (
        <EmptyState
          action={t("dashboard.addFood")}
          description={t("history.emptyDescription")}
          icon="history"
          onAction={() => router.push("/(app)/add-food")}
          title={t("history.emptyTitle")}
        />
      ) : (
        days.map(([localDate, entries]) => {
          const total = entries.reduce((sum, entry) => sum + entry.calories, 0);
          return (
            <View className="gap-2" key={localDate}>
              <View className="flex-row items-baseline justify-between gap-3 px-1">
                <Text
                  accessibilityRole="header"
                  className="min-w-0 flex-1 text-base font-bold text-app-text"
                  selectable
                >
                  {dayLabel(localDate)}
                </Text>
                <Text
                  className="text-sm font-semibold text-app-muted"
                  selectable
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {t("history.dayTotal", { calories: number.format(total) })}
                </Text>
              </View>

              <SectionCard padded={false}>
                {entries.map((entry, index) => (
                  <View key={entry._id}>
                    {index > 0 ? <View className="h-px bg-app-border-soft" /> : null}
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:bg-app-surface"
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/food/log/[id]",
                          params: { id: entry._id },
                        })
                      }
                    >
                      <View className="min-w-0 flex-1 gap-0.5">
                        <Text
                          className="text-base font-semibold text-app-text"
                          numberOfLines={1}
                          selectable
                        >
                          {entry.foodName}
                        </Text>
                        <Text className="text-[13px] text-app-muted" selectable>
                          {t(`dashboard.meals.${entry.mealType}`)}
                        </Text>
                      </View>
                      <Text
                        className="text-sm font-bold text-app-text"
                        selectable
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {number.format(entry.calories)}
                      </Text>
                    </Pressable>
                  </View>
                ))}
              </SectionCard>
            </View>
          );
        })
      )}

      {!isPro ? (
        <PrimaryButton
          icon="subscription"
          label={t("history.upgradeAction")}
          onPress={() => router.push("/(app)/paywall")}
        />
      ) : null}
    </AppScreen>
  );
}
