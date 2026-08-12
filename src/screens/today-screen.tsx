import { router, Tabs } from "expo-router";
import { useConvexConnectionState, useQuery } from "convex/react";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { DashboardRecentUploads, type RecentUpload } from "@/components/dashboard-recent-uploads";
import { DashboardWeekCarousel } from "@/components/dashboard-week-carousel";
import { hasBackendConfiguration } from "@/config/env";
import { atLocalNoon } from "@/features/dashboard/week-range";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Image, Link, Pressable, Text, View } from "@/tw";

const scanHero = require("@/../assets/images/welcome-food-scan-hero.png");

type Nutrition = { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type FoodLog = Nutrition & { _id: string; foodName: string; mealType: MealType };

const emptyNutrition: Nutrition = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 };
const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

function ConfiguredToday() {
  const [selectedDate, setSelectedDate] = React.useState(() => atLocalNoon(new Date()));
  const localDate = currentLocalDate(selectedDate);
  const logs = useQuery(api.foodLogs.getDay, { localDate });
  const summary = useQuery(api.foodLogs.getDaySummary, { localDate });
  const goal = useQuery(api.nutritionGoals.getActive, { localDate });
  const recentUploads = useQuery(api.dashboard.getRecentUploads, { limit: 3 });
  const loggingStreak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });
  const connection = useConvexConnectionState();

  if (logs === undefined || summary === undefined || goal === undefined || recentUploads === undefined || loggingStreak === undefined) return <DashboardLoading />;
  return <TodayContent isOffline={connection.hasEverConnected && !connection.isWebSocketConnected} loggingStreak={loggingStreak} logs={logs} onSelectDate={setSelectedDate} recentUploads={recentUploads} selectedDate={selectedDate} summary={summary} goal={goal} />;
}

function DashboardLoading() {
  return (
    <AppScreen>
      <View className="h-24 rounded-3xl bg-app-surface" />
      <View className="h-52 rounded-3xl bg-app-surface" />
      <View className="h-44 rounded-3xl bg-app-surface" />
      <View className="h-56 rounded-3xl bg-app-surface" />
      <View className="h-52 rounded-3xl bg-app-surface" />
    </AppScreen>
  );
}

class DashboardErrorBoundary extends React.Component<React.PropsWithChildren<{ fallback: (retry: () => void) => React.ReactNode }>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  retry = () => this.setState({ failed: false });
  render() { return this.state.failed ? this.props.fallback(this.retry) : this.props.children; }
}

function ConfiguredDashboard() {
  const { t } = useTranslation();
  return (
    <DashboardErrorBoundary fallback={(retry) => (
      <AppScreen>
        <View accessibilityRole="alert" className="items-center gap-4 rounded-3xl border border-app-border bg-white p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-app-surface"><AppIcon color="#737373" name="warning" size={26} /></View>
          <Text className="text-center text-base text-app-muted" selectable>{t("dashboard.loadError")}</Text>
          <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center gap-2 rounded-2xl bg-[#111111] px-6" onPress={retry}><AppIcon color="#FFFFFF" name="refresh" size={19} /><Text className="font-semibold text-white">{t("common.retry")}</Text></Pressable>
        </View>
      </AppScreen>
    )}>
      <ConfiguredToday />
    </DashboardErrorBoundary>
  );
}

function TodayContent({ isOffline = false, loggingStreak = 0, logs = [], onSelectDate, recentUploads = [], selectedDate, summary = emptyNutrition, goal = null }: { isOffline?: boolean; loggingStreak?: number; logs?: FoodLog[]; onSelectDate: (date: Date) => void; recentUploads?: RecentUpload[]; selectedDate: Date; summary?: Nutrition; goal?: Nutrition | null }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;
  const remaining = Math.max(0, (goal?.calories ?? 0) - summary.calories);
  const calorieProgress = goal?.calories ? Math.min(100, Math.round((summary.calories / goal.calories) * 100)) : 0;

  return (
    <AppScreen>
      <Tabs.Screen options={{ headerRight: () => <LoggingStreakBadge value={loggingStreak} /> }} />
      {isOffline ? (
        <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2 rounded-2xl bg-app-surface px-4 py-3">
          <AppIcon color="#737373" name="warning" size={18} />
          <Text className="min-w-0 flex-1 text-sm text-app-muted" selectable>{t("dashboard.offlineData")}</Text>
        </View>
      ) : null}

      <DashboardWeekCarousel locale={locale} onSelectDate={onSelectDate} selectedDate={selectedDate} />
      <CalorieCard goal={goal?.calories ?? 0} progress={calorieProgress} remaining={remaining} summary={summary.calories} />

      <View className="flex-row gap-3">
        <MacroCard color="#2F80ED" icon="protein" label={t("dashboard.proteinLeft")} value={Math.max(0, (goal?.proteinGrams ?? 0) - summary.proteinGrams)} goal={goal?.proteinGrams} />
        <MacroCard color="#F97316" icon="carbs" label={t("dashboard.carbsLeft")} value={Math.max(0, (goal?.carbsGrams ?? 0) - summary.carbsGrams)} goal={goal?.carbsGrams} />
        <MacroCard color="#8B5CF6" icon="fat" label={t("dashboard.fatLeft")} value={Math.max(0, (goal?.fatGrams ?? 0) - summary.fatGrams)} goal={goal?.fatGrams} />
      </View>

      <ScanBanner />

      <View className="flex-row gap-3">
        <QuickAction href="/(app)/(tabs)/foods" icon="search" label={t("dashboard.search")} />
        <QuickAction href="/(app)/add-food" icon="edit" label={t("dashboard.manual")} />
        <QuickAction href="/(app)/history" icon="history" label={t("dashboard.history")} />
      </View>

      <DashboardRecentUploads items={recentUploads} />

      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-bold text-app-text" selectable>
            {currentLocalDate(selectedDate) === currentLocalDate()
              ? t("dashboard.todaysMeals")
              : t("dashboard.selectedMeals", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(selectedDate) })}
          </Text>
          <Link accessibilityRole="link" className="min-h-11 justify-center px-1 text-sm font-medium text-app-muted" href="/(app)/history">{t("dashboard.viewAll")}</Link>
        </View>
        {mealTypes.map((meal) => <MealSection canAdd={currentLocalDate(selectedDate) === currentLocalDate()} key={meal} logs={logs.filter((item) => item.mealType === meal)} meal={meal} recentUploads={recentUploads} />)}
      </View>
    </AppScreen>
  );
}

function CalorieCard({ goal, progress, remaining, summary }: { goal: number; progress: number; remaining: number; summary: number }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });
  return (
    <View className="min-h-52 flex-row items-center gap-4 rounded-3xl border border-app-border bg-white p-5" style={{ borderCurve: "continuous", boxShadow: "0 8px 28px rgba(0, 0, 0, 0.055)" }}>
      <View className="min-w-0 flex-1 gap-2">
        <Text className="text-[48px] font-bold tracking-[-1.5px] text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>{number.format(remaining)}</Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-xl font-medium text-app-text" selectable>{t("dashboard.caloriesLeft")}</Text>
          <AppIcon color="#737373" name="info" size={17} />
        </View>
        <Text className="text-sm text-app-muted" selectable>{t("dashboard.eatenOfGoalCompact", { eaten: number.format(summary), goal: number.format(goal) })}</Text>
      </View>
      <View accessibilityLabel={t("dashboard.calorieProgress", { percent: progress })} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }} className="h-28 w-28 items-center justify-center rounded-full border-[10px] border-[#E8E8E8]">
        <View className="absolute -inset-[10px] rounded-full border-[10px] border-transparent" style={{ borderRightColor: "#111111", borderTopColor: "#111111", transform: [{ rotate: `${Math.max(-45, progress * 3.6 - 135)}deg` }] }} />
        <AppIcon name="calories" size={34} weight="semibold" />
      </View>
    </View>
  );
}

function MacroCard({ color, goal, icon, label, value }: { color: string; goal?: number; icon: AppIconName; label: string; value: number }) {
  const progress = goal ? Math.min(100, Math.max(0, ((goal - value) / goal) * 100)) : 0;
  return (
    <View className="min-h-44 min-w-0 flex-1 gap-2 rounded-3xl border border-app-border bg-white p-3" style={{ borderCurve: "continuous", boxShadow: "0 6px 22px rgba(0, 0, 0, 0.045)" }}>
      <Text className="text-2xl font-bold tracking-[-0.5px] text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>{Math.round(value)}g</Text>
      <Text className="text-xs leading-4 text-app-muted" numberOfLines={2} selectable>{label}</Text>
      <View className="h-1.5 overflow-hidden rounded-full bg-[#E8E8E8]"><View className="h-full rounded-full" style={{ backgroundColor: color, width: `${progress}%` }} /></View>
      <View className="mt-auto h-14 w-14 items-center justify-center self-center rounded-full" style={{ backgroundColor: `${color}12` }}><AppIcon color={color} name={icon} size={27} /></View>
    </View>
  );
}

function LoggingStreakBadge({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLabel={t("dashboard.streakLabel", { count: value })}
      className="mr-1 min-h-11 flex-row items-center gap-1.5 rounded-2xl border border-app-border bg-white px-3"
      style={{ borderCurve: "continuous", boxShadow: "0 5px 18px rgba(0, 0, 0, 0.08)" }}
    >
      <AppIcon color="#FF6B00" name="calories" size={20} weight="semibold" />
      <Text className="text-base font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>{value}</Text>
    </View>
  );
}

function ScanBanner() {
  const { t } = useTranslation();
  return (
    <View className="h-56 overflow-hidden rounded-[28px] bg-[#111111]" style={{ borderCurve: "continuous" }}>
      <Image accessibilityLabel={t("welcome.scanHeroImage")} className="absolute right-0 h-full w-[58%]" contentFit="cover" contentPosition="center" source={scanHero} />
      <View className="h-full w-[54%] justify-center gap-3 bg-[#111111] p-5">
        <Text accessibilityRole="header" className="text-2xl font-bold leading-7 text-white" selectable>{t("dashboard.scanFoodTitle")}</Text>
        <Text className="text-sm leading-5 text-white/75" numberOfLines={3} selectable>{t("dashboard.scanFoodDescription")}</Text>
        <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center justify-center gap-2 rounded-full bg-white px-4 active:opacity-80" onPress={() => router.push("/(app)/scan/camera")}>
          <Text className="text-base font-semibold text-[#111111]">{t("dashboard.scanFood")}</Text>
          <AppIcon name="camera" size={20} weight="semibold" />
        </Pressable>
      </View>
    </View>
  );
}

function QuickAction({ href, icon, label }: { href: "/(app)/(tabs)/foods" | "/(app)/add-food" | "/(app)/history"; icon: AppIconName; label: string }) {
  return <Link href={href} asChild><Pressable accessibilityLabel={label} accessibilityRole="button" className="min-h-14 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-2 active:opacity-70"><AppIcon name={icon} size={19} /><Text className="text-sm font-semibold text-app-text" numberOfLines={1}>{label}</Text></Pressable></Link>;
}

function MealSection({ canAdd, logs, meal, recentUploads }: { canAdd: boolean; logs: FoodLog[]; meal: MealType; recentUploads: RecentUpload[] }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });
  const firstPhoto = logs.length ? recentUploads.find((item) => item._id === logs[0]._id)?.imageUrl : null;
  return (
    <View className="min-h-24 flex-row items-start gap-3 rounded-3xl border border-app-border bg-white p-3" style={{ borderCurve: "continuous", boxShadow: "0 4px 18px rgba(0, 0, 0, 0.035)" }}>
      {firstPhoto ? <Image accessibilityLabel={t("dashboard.mealPhoto", { name: logs[0].foodName })} cachePolicy="memory" className="h-[76px] w-[76px] rounded-2xl bg-app-surface" contentFit="cover" source={{ uri: firstPhoto }} transition={150} /> : <View className="h-[76px] w-[76px] items-center justify-center rounded-2xl bg-app-surface"><AppIcon color="#737373" name="foods" size={25} /></View>}
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-xs font-medium text-app-muted" selectable>{t(`dashboard.meals.${meal}`)}</Text>
        {logs.length ? logs.map((item) => (
          <Pressable key={item._id} accessibilityRole="button" className="min-h-11 justify-center" onPress={() => router.push({ pathname: "/(app)/food/log/[id]", params: { id: item._id } })}>
            <Text className="text-base font-semibold text-app-text" numberOfLines={1} selectable>{item.foodName}</Text>
            <Text className="text-sm text-app-muted" selectable>{t("dashboard.logCalories", { calories: number.format(item.calories) })}</Text>
          </Pressable>
        )) : canAdd ? <Link href="/(app)/add-food" asChild><Pressable accessibilityRole="button" className="min-h-11 flex-row items-center gap-2 self-start pr-4"><AppIcon color="#2563EB" name="add" size={19} weight="semibold" /><Text className="text-sm font-medium text-[#2563EB]">{t("dashboard.addFood")}</Text></Pressable></Link> : <Text className="min-h-11 py-3 text-sm text-app-muted" selectable>{t("dashboard.noFoodLogged")}</Text>}
      </View>
      <AppIcon color="#737373" name="chevronRight" size={19} />
    </View>
  );
}

export function TodayScreen() {
  return hasBackendConfiguration ? <ConfiguredDashboard /> : <UnconfiguredToday />;
}

function UnconfiguredToday() {
  const [selectedDate, setSelectedDate] = React.useState(() => atLocalNoon(new Date()));
  return <TodayContent goal={{ calories: 2_000, proteinGrams: 150, carbsGrams: 225, fatGrams: 60 }} onSelectDate={setSelectedDate} selectedDate={selectedDate} />;
}
