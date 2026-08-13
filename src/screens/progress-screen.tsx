import { useQuery } from "convex/react";
import { Link, router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Pressable, Text, View } from "@/tw";

type WeightLogItem = {
  _id: string;
  normalizedKg: number;
  localDate: string;
};

/** Shape returned by `weights.getProgress`, which no longer reads the whole history. */
type ProgressData = {
  startWeightKg: number | null;
  startLocalDate: string | null;
  latestWeightKg: number | null;
  latestLocalDate: string | null;
  goalWeightKg: number | null;
  goalType: "lose" | "maintain" | "gain" | null;
  profileWeightKg: number | null;
  displayUnit: "kg" | "lb";
  entryCount: number;
  countIsCapped: boolean;
};

type RangeOption = "week" | "month" | "3m" | "all";

export function ProgressScreen() {
  return hasBackendConfiguration ? <ConfiguredProgress /> : <UnconfiguredProgress />;
}

function ProgressSkeleton() {
  return (
    <AppScreen edges={["top", "left", "right"]}>
      <View className="h-8 w-48 rounded-xl bg-app-surface" />
      <View className="h-4 w-64 rounded-lg bg-app-surface" />
      <View className="h-48 rounded-3xl bg-app-surface" />
      <View className="h-56 rounded-3xl bg-app-surface" />
      <View className="flex-row gap-3">
        <View className="h-36 flex-1 rounded-3xl bg-app-surface" />
        <View className="h-36 flex-1 rounded-3xl bg-app-surface" />
      </View>
      <View className="flex-row gap-3">
        <View className="h-36 flex-1 rounded-3xl bg-app-surface" />
        <View className="h-36 flex-1 rounded-3xl bg-app-surface" />
      </View>
    </AppScreen>
  );
}

function ConfiguredProgress() {
  const { state } = useSubscription();
  const isPro = ["trial", "active", "cancelledActive", "billingIssueActive"].includes(state);
  const progress = useQuery(api.weights.getProgress, {});
  const history = useQuery(api.weights.getHistory, { limit: isPro ? 365 : 30 });
  const streak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });

  if (progress === undefined || history === undefined || streak === undefined) {
    return <ProgressSkeleton />;
  }

  return <ProgressContent history={history} isPro={isPro} progress={progress} streak={streak} />;
}

function UnconfiguredProgress() {
  return <ProgressContent isPro={false} streak={0} />;
}

function ProgressContent({
  progress,
  history = [],
  streak = 0,
}: {
  progress?: ProgressData;
  history?: WeightLogItem[];
  streak?: number;
  isPro: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [range, setRange] = React.useState<RangeOption>("month");

  const rangeOptions: { key: RangeOption; label: string }[] = [
    { key: "week", label: t("progress.rangeWeek") },
    { key: "month", label: t("progress.rangeMonth") },
    { key: "3m", label: t("progress.range3M") },
    { key: "all", label: t("progress.rangeAll") },
  ];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const parts = dateStr.split("-");
      const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", { month: "short", day: "numeric", year: "numeric" }).format(date);
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      const date = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
      return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "en", { month: "short", day: "numeric" }).format(date);
    } catch {
      return dateStr;
    }
  };

  const latestKg = progress?.latestWeightKg ?? progress?.profileWeightKg ?? null;
  const firstKg = progress?.startWeightKg ?? null;
  const goalKg = progress?.goalWeightKg ?? null;
  const unit = progress?.displayUnit ?? "kg";
  const isGain = (progress?.goalType ?? "lose") === "gain";

  const convertVal = (kg: number) => (unit === "lb" ? kg * 2.2046226218 : kg);
  const formatNum = (kg: number | null) => {
    if (kg === null) return "—";
    return new Intl.NumberFormat(i18n.resolvedLanguage ?? "en", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(convertVal(kg));
  };

  const diffKg = latestKg !== null && firstKg !== null ? latestKg - firstKg : null;
  const totalTargetDiff = goalKg !== null && firstKg !== null ? Math.abs(goalKg - firstKg) || 1 : null;
  const currentDiff = diffKg !== null ? Math.abs(diffKg) : 0;
  const pctGoal = totalTargetDiff ? Math.min(100, Math.max(0, Math.round((currentDiff / totalTargetDiff) * 100))) : 0;
  const diffFormatted = diffKg !== null ? `${diffKg > 0 ? "+" : ""}${formatNum(diffKg)}` : "—";

  // Filter history by selected range
  const filteredHistory = React.useMemo(() => {
    if (!history.length) return [];
    const now = new Date();
    const cutoff = new Date(now);
    if (range === "week") cutoff.setDate(now.getDate() - 7);
    else if (range === "month") cutoff.setMonth(now.getMonth() - 1);
    else if (range === "3m") cutoff.setMonth(now.getMonth() - 3);
    else return history;
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return history.filter((p) => p.localDate >= cutoffStr);
  }, [history, range]);

  const hasEnoughData = filteredHistory.length >= 2;
  const rawPoints = hasEnoughData ? [...filteredHistory].reverse().slice(-6) : [];
  const minVal = rawPoints.length ? Math.floor(Math.min(...rawPoints.map((p) => p.normalizedKg)) - 1) : 60;
  const maxVal = rawPoints.length ? Math.ceil(Math.max(...rawPoints.map((p) => p.normalizedKg)) + 1) : 80;
  const rangeVal = Math.max(1, maxVal - minVal);

  const chartPoints = rawPoints.map((p) => ({
    ...p,
    pct: Math.min(88, Math.max(10, Math.round(((p.normalizedKg - minVal) / rangeVal) * 78 + 10))),
  }));

  const yMax = Math.round(maxVal);
  const yMin = Math.round(minVal);
  const yMid1 = Math.round(minVal + rangeVal * 0.66);
  const yMid2 = Math.round(minVal + rangeVal * 0.33);

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text accessibilityRole="header" className="text-3xl font-bold tracking-[-0.5px] text-app-text">
            {t("progress.title")}
          </Text>
          <Text className="mt-0.5 text-sm text-app-muted">{t("progress.subtitle")}</Text>
        </View>
        <Link href="/(app)/settings/notifications" asChild>
          <Pressable accessibilityLabel={t("profile.settings.notifications")} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full border border-app-border bg-white active:bg-app-surface">
            <AppIcon name="notification" size={21} />
          </Pressable>
        </Link>
      </View>

      {/* Top Card: 3-Column Weight Stats */}
      <View className="gap-5 rounded-3xl border border-app-border bg-white p-5" style={{ borderCurve: "continuous", boxShadow: "0 6px 24px rgba(0, 0, 0, 0.045)" }}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1 items-center">
            <Text className="text-sm font-semibold text-app-muted">{t("progress.startWeight")}</Text>
            <Text className="mt-1 text-lg font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
              {formatNum(firstKg)}{firstKg !== null ? <Text className="text-xs font-semibold text-app-muted"> {unit}</Text> : null}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-app-muted">{formatDate(progress?.startLocalDate)}</Text>
          </View>

          <View className="h-10 w-px bg-app-border" />

          <View className="flex-1 items-center">
            <Text className="text-sm font-semibold text-app-muted">{t("progress.currentWeight")}</Text>
            <Text className="mt-1 text-lg font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
              {formatNum(latestKg)}{latestKg !== null ? <Text className="text-xs font-semibold text-app-muted"> {unit}</Text> : null}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-app-muted">{formatDate(progress?.latestLocalDate)}</Text>
          </View>

          <View className="h-10 w-px bg-app-border" />

          <View className="flex-1 items-center">
            <Text className="text-sm font-semibold text-app-muted">{t("progress.goalWeight")}</Text>
            <Text className="mt-1 text-lg font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
              {formatNum(goalKg)}{goalKg !== null ? <Text className="text-xs font-semibold text-app-muted"> {unit}</Text> : null}
            </Text>
            <Text className="mt-0.5 text-xs font-medium text-app-muted">—</Text>
          </View>
        </View>

        <View className="h-px bg-app-border" />

        {/* Progress & Ring Row */}
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-2">
            <Text className="text-sm font-semibold text-app-muted">{isGain ? t("progress.totalGain") : t("progress.totalLoss")}</Text>
            <Text className="text-3xl font-bold tracking-[-0.5px] text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
              {diffFormatted}{diffKg !== null ? <Text className="text-sm font-normal text-app-muted"> {unit}</Text> : null}
            </Text>
            <Text className="text-sm font-medium text-app-muted">{t("progress.pctOfGoal", { pct: pctGoal })}</Text>
            <View className="h-2.5 overflow-hidden rounded-full bg-[#E8E8E8]">
              <View className="h-full rounded-full bg-[#111111]" style={{ width: `${pctGoal}%` }} />
            </View>
          </View>

          {/* Circular Ring */}
          <View
            accessibilityLabel={t("progress.pctOfGoal", { pct: pctGoal })}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: pctGoal }}
            className="h-24 w-24 items-center justify-center"
          >
            <View className="absolute inset-0 rounded-full border-[7px] border-[#E8E8E8]" />
            {pctGoal > 0 && pctGoal <= 50 ? (
              <View
                className="absolute inset-0 rounded-full border-[7px] border-transparent"
                style={{ borderRightColor: "#111111", borderTopColor: "#111111", transform: [{ rotate: `${pctGoal * 3.6 - 135}deg` }] }}
              />
            ) : pctGoal > 50 ? (
              <>
                <View className="absolute inset-0 rounded-full border-[7px] border-transparent" style={{ borderRightColor: "#111111", borderTopColor: "#111111", transform: [{ rotate: "45deg" }] }} />
                <View className="absolute inset-0 rounded-full border-[7px] border-transparent" style={{ borderLeftColor: "#111111", borderBottomColor: "#111111", transform: [{ rotate: `${(pctGoal - 50) * 3.6 - 135}deg` }] }} />
              </>
            ) : null}
            <Text className="text-xl font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>{pctGoal}%</Text>
            <Text className="text-xs font-semibold text-app-muted">{t("progress.ofGoalShort")}</Text>
          </View>
        </View>
      </View>

      {/* Weight Over Time Chart */}
      <View className="gap-4 rounded-3xl border border-app-border bg-white p-5" style={{ borderCurve: "continuous", boxShadow: "0 6px 24px rgba(0, 0, 0, 0.045)" }}>
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-bold text-app-text">{t("progress.weightOverTime")}</Text>
          <View className="flex-row gap-1 rounded-xl border border-app-border bg-[#F5F5F5] p-1">
            {rangeOptions.map(({ key, label }) => {
              const active = range === key;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className={active ? "rounded-lg bg-[#111111] px-3 py-1.5" : "rounded-lg px-3 py-1.5"}
                  onPress={() => setRange(key)}
                >
                  <Text className={active ? "text-xs font-bold text-white" : "text-xs font-semibold text-app-muted"}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {hasEnoughData ? (
          <View className="mt-2 h-44 flex-row">
            <View className="h-32 justify-between pr-3">
              <Text className="text-xs font-semibold text-app-muted" style={{ fontVariant: ["tabular-nums"] }}>{yMax}</Text>
              <Text className="text-xs font-semibold text-app-muted" style={{ fontVariant: ["tabular-nums"] }}>{yMid1}</Text>
              <Text className="text-xs font-semibold text-app-muted" style={{ fontVariant: ["tabular-nums"] }}>{yMid2}</Text>
              <Text className="text-xs font-semibold text-app-muted" style={{ fontVariant: ["tabular-nums"] }}>{yMin}</Text>
            </View>

            <View className="relative flex-1 justify-between">
              <View className="absolute inset-x-0 top-1 border-b border-dashed border-[#E5E5E5]" />
              <View className="absolute inset-x-0 top-[33%] border-b border-dashed border-[#E5E5E5]" />
              <View className="absolute inset-x-0 top-[66%] border-b border-dashed border-[#E5E5E5]" />
              <View className="absolute inset-x-0 bottom-8 border-b border-[#E5E5E5]" />

              <View className="relative h-32 flex-row items-end justify-between px-2">
                {chartPoints.map((pt, idx) => (
                  <View key={pt._id || idx} className="relative items-center" style={{ bottom: `${pt.pct}%` }}>
                    <View className="z-10 h-3 w-3 rounded-full border-2 border-[#111111] bg-white" />
                  </View>
                ))}
              </View>

              <View className="flex-row justify-between px-1 pt-2">
                {chartPoints.map((pt, idx) => (
                  <Text key={pt._id || idx} className="text-xs font-medium text-app-muted">
                    {formatShortDate(pt.localDate)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View className="items-center justify-center gap-2 py-8">
            <AppIcon color="#D4D4D4" name="progress" size={36} />
            <Text className="text-center text-sm font-medium text-app-muted" selectable>{t("progress.noChartData")}</Text>
          </View>
        )}
      </View>

      {/* 2x2 Metric Cards */}
      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[47%] flex-1 gap-2 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous", boxShadow: "0 4px 18px rgba(0, 0, 0, 0.035)" }}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon color="#FF6B00" name="calories" size={22} />
          </View>
          <Text className="text-sm font-semibold text-app-muted">{t("progress.currentStreak")}</Text>
          <Text className="text-xl font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
            {streak > 0 ? t("progress.streakDays", { count: streak }) : "—"}
          </Text>
          <Text className="text-xs font-medium text-app-muted">{streak > 0 ? t("progress.keepItUp") : t("progress.startLogging")}</Text>
        </View>

        <View className="min-w-[47%] flex-1 gap-2 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous", boxShadow: "0 4px 18px rgba(0, 0, 0, 0.035)" }}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon color="#111111" name="foods" size={22} />
          </View>
          <Text className="text-sm font-semibold text-app-muted">{t("progress.weightEntries")}</Text>
          <Text className="text-xl font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
            {history.length > 0 ? String(history.length) : "—"}
          </Text>
          <Text className="text-xs font-medium text-app-muted">{t("progress.totalLogged")}</Text>
        </View>

        <View className="min-w-[47%] flex-1 gap-2 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous", boxShadow: "0 4px 18px rgba(0, 0, 0, 0.035)" }}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon color="#111111" name="goal" size={22} />
          </View>
          <Text className="text-sm font-semibold text-app-muted">{t("progress.goalProgress")}</Text>
          <Text className="text-xl font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
            {totalTargetDiff ? `${pctGoal}%` : "—"}
          </Text>
          <Text className="text-xs font-medium text-app-muted">{t("progress.towardGoal")}</Text>
        </View>

        <View className="min-w-[47%] flex-1 gap-2 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous", boxShadow: "0 4px 18px rgba(0, 0, 0, 0.035)" }}>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F5F5F5]">
            <AppIcon color="#111111" name="protein" size={22} />
          </View>
          <Text className="text-sm font-semibold text-app-muted">{t("progress.avgCalories")}</Text>
          <Text className="text-xl font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>—</Text>
          <Text className="text-xs font-medium text-app-muted">{t("progress.comingSoon")}</Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="flex-row gap-3 pt-1">
        <View className="flex-1">
          <PrimaryButton icon="weight" label={t("progress.addWeight")} onPress={() => router.push("/(app)/weight/add")} />
        </View>
        <Link href="/(app)/weight/history" asChild>
          <Pressable
            accessibilityLabel={t("progress.history")}
            accessibilityRole="button"
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-5 active:bg-app-surface"
          >
            <AppIcon name="history" size={20} />
            <Text className="text-sm font-semibold text-app-text">{t("progress.history")}</Text>
          </Pressable>
        </Link>
      </View>
    </AppScreen>
  );
}
