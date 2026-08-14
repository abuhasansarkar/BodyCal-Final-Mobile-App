import { useUser } from "@clerk/expo";
import { useConvexConnectionState, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { DashboardRecentUploads, type RecentUpload } from "@/components/dashboard-recent-uploads";
import { DashboardWeekCarousel } from "@/components/dashboard-week-carousel";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { ProgressRing } from "@/components/progress-ring";
import { hasBackendConfiguration } from "@/config/env";
import { atLocalNoon, getDashboardWeeks } from "@/features/dashboard/week-range";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Image, Link, Pressable, Text, View } from "@/tw";

const scanHero = require("@/../assets/images/welcome-food-scan-hero.png");
const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");
const proteinFoodImage = require("@/../assets/images/food-protein.png");
const carbsFoodImage = require("@/../assets/images/food-carbs.png");
const fatFoodImage = require("@/../assets/images/food-fat.png");

type Nutrition = { calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number };
type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type FoodLog = Nutrition & { _id: string; foodName: string; mealType: MealType };

const emptyNutrition: Nutrition = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 };
const mealTypes = ["breakfast", "lunch", "dinner", "snack"] as const;

function ConfiguredToday() {
  const [selectedDate, setSelectedDate] = React.useState(() => atLocalNoon(new Date()));
  const localDate = currentLocalDate(selectedDate);
  // The week strip spans the same three weeks the carousel renders, so one
  // range read covers every day it can show.
  const weeks = React.useMemo(() => getDashboardWeeks(new Date()), []);
  const fromDate = currentLocalDate(weeks[0][0]);
  const toDate = currentLocalDate(weeks[weeks.length - 1][6]);
  const logs = useQuery(api.foodLogs.getDay, { localDate });
  const summary = useQuery(api.foodLogs.getDaySummary, { localDate });
  const goal = useQuery(api.nutritionGoals.getActive, { localDate });
  const recentUploads = useQuery(api.dashboard.getRecentUploads, { limit: 3 });
  const loggingStreak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });
  const calorieSeries = useQuery(api.dashboard.getDailyCalorieSeries, { fromDate, toDate });
  const goalHistory = useQuery(api.nutritionGoals.getHistory, {});
  const connection = useConvexConnectionState();

  /*
    Goals are effective-dated and history must never be re-scored against a
    newer target, so each day resolves the goal that was active *on that day*.
    `getHistory` returns newest first, making the first entry effective on or
    before a date the right one.
  */
  const progressByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!calorieSeries || !goalHistory) return map;
    for (const day of calorieSeries) {
      const goalForDay = goalHistory.find((entry) => entry.effectiveFrom <= day.localDate);
      if (!goalForDay?.calories) continue;
      map.set(day.localDate, Math.min(100, Math.max(0, (day.calories / goalForDay.calories) * 100)));
    }
    return map;
  }, [calorieSeries, goalHistory]);

  if (
    logs === undefined ||
    summary === undefined ||
    goal === undefined ||
    recentUploads === undefined ||
    loggingStreak === undefined ||
    calorieSeries === undefined ||
    goalHistory === undefined
  ) {
    return <DashboardLoading />;
  }

  return (
    <TodayContent
      goal={goal}
      isOffline={connection.hasEverConnected && !connection.isWebSocketConnected}
      loggingStreak={loggingStreak}
      logs={logs}
      onSelectDate={setSelectedDate}
      progressByDate={progressByDate}
      recentUploads={recentUploads}
      selectedDate={selectedDate}
      summary={summary}
    />
  );
}

function DashboardLoading() {
  return (
    <AppScreen>
      <View className="h-20 rounded-3xl bg-app-surface" />
      <View className="h-24 rounded-3xl bg-app-surface" />
      <View className="h-48 rounded-3xl bg-app-surface" />
      <View className="flex-row gap-3">
        <View className="h-40 flex-1 rounded-3xl bg-app-surface" />
        <View className="h-40 flex-1 rounded-3xl bg-app-surface" />
        <View className="h-40 flex-1 rounded-3xl bg-app-surface" />
      </View>
      <View className="h-44 rounded-3xl bg-app-surface" />
      <View className="h-48 rounded-3xl bg-app-surface" />
    </AppScreen>
  );
}

class DashboardErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback: (retry: () => void) => React.ReactNode }>,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  retry = () => this.setState({ failed: false });
  render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}

function ConfiguredDashboard() {
  const { t } = useTranslation();
  return (
    <DashboardErrorBoundary
      fallback={(retry) => (
        <AppScreen>
          <View accessibilityRole="alert" className="items-center gap-4 rounded-3xl border border-app-border bg-white p-6">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-app-surface">
              <AppIcon color="#737373" name="warning" size={26} />
            </View>
            <Text className="text-center text-base text-app-muted" selectable>
              {t("dashboard.loadError")}
            </Text>
            <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center gap-2 rounded-2xl bg-[#111111] px-6" onPress={retry}>
              <AppIcon color="#FFFFFF" name="refresh" size={19} />
              <Text className="font-semibold text-white">{t("common.retry")}</Text>
            </Pressable>
          </View>
        </AppScreen>
      )}
    >
      <ConfiguredToday />
    </DashboardErrorBoundary>
  );
}

function GreetingHeader() {
  const { t } = useTranslation();
  const { user } = useUser();
  // `dashboard.greeting.*` already carries the ", {{name}}" clause per language,
  // so the name is interpolated rather than concatenated — word order differs.
  const hour = new Date().getHours();
  const period = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const name = user?.firstName?.trim() || t("dashboard.friend");

  return (
    <View className="min-w-0 flex-1">
      {/*
        A non-breaking space keeps the wave attached to the final word. A plain
        space let it wrap onto a line of its own once a long display name pushed
        the greeting to two lines, which read as a rendering fault.
      */}
      <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.5px] text-app-text" numberOfLines={2} selectable>
        {`${t(`dashboard.greeting.${period}`, { name })} 👋`}
      </Text>
      <Text className="text-sm font-medium text-app-muted" selectable>
        {t("dashboard.encouragement")}
      </Text>
    </View>
  );
}

function TodayContent({
  isOffline = false,
  loggingStreak = 0,
  logs = [],
  onSelectDate,
  progressByDate,
  recentUploads = [],
  selectedDate,
  summary = emptyNutrition,
  goal = null,
}: {
  isOffline?: boolean;
  loggingStreak?: number;
  logs?: FoodLog[];
  onSelectDate: (date: Date) => void;
  progressByDate?: ReadonlyMap<string, number>;
  recentUploads?: RecentUpload[];
  selectedDate: Date;
  summary?: Nutrition;
  goal?: Nutrition | null;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;
  const remaining = Math.max(0, (goal?.calories ?? 0) - summary.calories);
  const calorieProgress = goal?.calories ? Math.min(100, Math.round((summary.calories / goal.calories) * 100)) : 0;

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/*
        Native tabs render no header, so the screen carries its own. The greeting
        takes the slot the brand lockup held, with the streak beside it.
        `items-start` keeps the badge level with the greeting's first line rather
        than centred against two lines of text.
      */}
      <View className="flex-row items-start justify-between gap-3">
        <GreetingHeader />
        <LoggingStreakBadge value={loggingStreak} />
      </View>
      {isOffline ? (
        <View accessibilityLiveRegion="polite" className="flex-row items-center gap-2 rounded-2xl bg-app-surface px-4 py-3">
          <AppIcon color="#737373" name="warning" size={18} />
          <Text className="min-w-0 flex-1 text-sm text-app-muted" selectable>
            {t("dashboard.offlineData")}
          </Text>
        </View>
      ) : null}

      <DashboardWeekCarousel locale={locale} onSelectDate={onSelectDate} progressByDate={progressByDate} selectedDate={selectedDate} />
      <CalorieCard goal={goal?.calories ?? 0} progress={calorieProgress} remaining={remaining} summary={summary.calories} />

      <View className="flex-row gap-3">
        <MacroCard color="#2F80ED" image={proteinFoodImage} label={t("dashboard.proteinLeft")} value={Math.max(0, (goal?.proteinGrams ?? 0) - summary.proteinGrams)} goal={goal?.proteinGrams} />
        <MacroCard color="#F97316" image={carbsFoodImage} label={t("dashboard.carbsLeft")} value={Math.max(0, (goal?.carbsGrams ?? 0) - summary.carbsGrams)} goal={goal?.carbsGrams} />
        <MacroCard color="#8B5CF6" image={fatFoodImage} label={t("dashboard.fatLeft")} value={Math.max(0, (goal?.fatGrams ?? 0) - summary.fatGrams)} goal={goal?.fatGrams} />
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
          <Link accessibilityRole="link" className="min-h-11 justify-center px-1 text-sm font-medium text-app-muted" href="/(app)/history">
            {t("dashboard.viewAll")}
          </Link>
        </View>
        {mealTypes.map((meal) => (
          <MealSection
            canAdd={currentLocalDate(selectedDate) === currentLocalDate()}
            key={meal}
            logs={logs.filter((item) => item.mealType === meal)}
            meal={meal}
            recentUploads={recentUploads}
          />
        ))}
      </View>
    </AppScreen>
  );
}

function CalorieCard({ goal, progress, remaining, summary }: { goal: number; progress: number; remaining: number; summary: number }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });
  return (
    <View
      className="min-h-48 flex-row items-center gap-4 rounded-3xl border border-app-border bg-white p-5"
      style={{ borderCurve: "continuous", boxShadow: "0 8px 28px rgba(0, 0, 0, 0.055)" }}
    >
      <View className="min-w-0 flex-1 gap-1.5">
        <Text className="text-[44px] font-bold tracking-[-1.5px] text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
          {number.format(remaining)}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Text className="text-lg font-semibold text-app-text" selectable>
            {t("dashboard.caloriesLeft")}
          </Text>
          <AppIcon color="#737373" name="info" size={16} />
        </View>
        <Text className="text-xs font-medium text-app-muted" selectable>
          {t("dashboard.eatenOfGoalCompact", { eaten: number.format(summary), goal: number.format(goal) })}
        </Text>
      </View>

      {/* Progress Ring */}
      <View
        accessibilityLabel={t("dashboard.calorieProgress", { percent: progress })}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        className="h-28 w-28 items-center justify-center relative"
      >
        <View className="absolute inset-0 rounded-full border-[9px] border-[#E8E8E8]" />
        {progress > 0 && progress <= 50 ? (
          <View
            className="absolute inset-0 rounded-full border-[9px] border-transparent"
            style={{ borderRightColor: "#111111", borderTopColor: "#111111", transform: [{ rotate: `${progress * 3.6 - 135}deg` }] }}
          />
        ) : progress > 50 ? (
          <>
            <View className="absolute inset-0 rounded-full border-[9px] border-transparent" style={{ borderRightColor: "#111111", borderTopColor: "#111111", transform: [{ rotate: "45deg" }] }} />
            <View className="absolute inset-0 rounded-full border-[9px] border-transparent" style={{ borderLeftColor: "#111111", borderBottomColor: "#111111", transform: [{ rotate: `${(progress - 50) * 3.6 - 135}deg` }] }} />
          </>
        ) : null}
        {/*
          Decorative: the ring's own accessibilityLabel already announces the
          calorie progress, so the mark must not add a second announcement.
        */}
        <Image accessible={false} className="h-11 w-11" contentFit="contain" source={brandLogo} />
      </View>
    </View>
  );
}

function MacroCard({ color, goal, image, label, value }: { color: string; goal?: number; image: number; label: string; value: number }) {
  const { t } = useTranslation();
  const progress = goal ? Math.min(100, Math.max(0, ((goal - value) / goal) * 100)) : 0;
  const percent = Math.round(progress);
  return (
    <View
      className="min-h-40 min-w-0 flex-1 gap-2 rounded-3xl border border-app-border bg-white p-3.5"
      style={{ borderCurve: "continuous", boxShadow: "0 6px 22px rgba(0, 0, 0, 0.045)" }}
    >
      <Text className="text-2xl font-bold tracking-[-0.5px] text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
        {Math.round(value)}g
      </Text>
      <Text className="text-xs font-semibold leading-4 text-app-muted" numberOfLines={2} selectable>
        {label}
      </Text>
      {/*
        The macro photo sits inside its own progress ring, echoing the calorie
        card above. Ring 64pt with a 5pt stroke leaves 54pt inside, so the 48pt
        tinted well from `main-dashbaord.png` still clears the stroke.

        The image needs a concrete size: `h-full` resolves to nothing here. The
        sources are transparent cut-outs with their own padding, so `contain`
        keeps them whole where `cover` would crop into the food.

        `mt-auto` pins the ring to the card's base so all three line up when a
        translated label wraps to two lines in one card but not its neighbours.
      */}
      <View
        accessibilityLabel={t("dashboard.macroProgress", { label, percent })}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: percent }}
        className="mt-auto self-center"
      >
        <ProgressRing color={color} size={64} thickness={5} value={progress}>
          <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-app-surface">
            <Image accessible={false} className="h-9 w-9" contentFit="contain" source={image} />
          </View>
        </ProgressRing>
      </View>
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
      <Text className="text-base font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </Text>
    </View>
  );
}

function ScanBanner() {
  const { t } = useTranslation();
  return (
    <View className="h-44 overflow-hidden rounded-3xl bg-[#111111]" style={{ borderCurve: "continuous", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
      <Image accessibilityLabel={t("welcome.scanHeroImage")} className="absolute right-0 h-full w-[54%]" contentFit="cover" contentPosition="center" source={scanHero} />
      <View className="h-full w-[56%] justify-center gap-2.5 bg-[#111111] p-5">
        <Text accessibilityRole="header" className="text-xl font-bold leading-6 text-white" selectable>
          {t("dashboard.scanFoodTitle")}
        </Text>
        <Text className="text-xs font-medium leading-4 text-white/80" numberOfLines={2} selectable>
          {t("dashboard.scanFoodDescription")}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-10 flex-row items-center justify-center gap-2 rounded-full bg-white px-4 active:opacity-80 mt-1"
          onPress={() => router.push("/(app)/scan/camera")}
        >
          <Text className="text-sm font-bold text-[#111111]">{t("dashboard.scanFood")}</Text>
          <AppIcon name="camera" size={18} weight="semibold" />
        </Pressable>
      </View>
    </View>
  );
}

function QuickAction({ href, icon, label }: { href: "/(app)/(tabs)/foods" | "/(app)/add-food" | "/(app)/history"; icon: AppIconName; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={label} accessibilityRole="button" className="min-h-14 min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-2 active:opacity-70">
        <AppIcon name={icon} size={19} />
        <Text className="text-sm font-semibold text-app-text" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function MealSection({ canAdd, logs, meal, recentUploads }: { canAdd: boolean; logs: FoodLog[]; meal: MealType; recentUploads: RecentUpload[] }) {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });
  const firstPhoto = logs.length ? recentUploads.find((item) => item._id === logs[0]._id)?.imageUrl : null;
  return (
    <View className="min-h-24 flex-row items-start gap-3 rounded-3xl border border-app-border bg-white p-3.5" style={{ borderCurve: "continuous", boxShadow: "0 4px 18px rgba(0, 0, 0, 0.035)" }}>
      <FoodThumbnail className="h-18 w-18 rounded-2xl bg-app-surface" imageUrl={firstPhoto ?? null} name={logs[0]?.foodName ?? ""} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-semibold text-app-muted" selectable>
          {t(`dashboard.meals.${meal}`)}
        </Text>
        {logs.length ? (
          logs.map((item) => (
            <Pressable key={item._id} accessibilityRole="button" className="min-h-11 justify-center" onPress={() => router.push({ pathname: "/(app)/food/log/[id]", params: { id: item._id } })}>
              <Text className="text-base font-semibold text-app-text" numberOfLines={1} selectable>
                {item.foodName}
              </Text>
              <Text className="text-sm text-app-muted" selectable>
                {t("dashboard.logCalories", { calories: number.format(item.calories) })}
              </Text>
            </Pressable>
          ))
        ) : canAdd ? (
          <Link href="/(app)/add-food" asChild>
            <Pressable accessibilityRole="button" className="min-h-11 flex-row items-center gap-2 self-start pr-4">
              <AppIcon color="#2F80ED" name="add" size={18} weight="semibold" />
              <Text className="text-sm font-semibold text-[#2F80ED]">{t("dashboard.addFood")}</Text>
            </Pressable>
          </Link>
        ) : (
          <Text className="min-h-11 py-3 text-sm text-app-muted" selectable>
            {t("dashboard.noFoodLogged")}
          </Text>
        )}
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
