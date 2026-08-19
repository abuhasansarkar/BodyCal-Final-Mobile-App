import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { EmptyState, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors, macroColors, shadows } from "@/config/theme";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import type { GoalType, MealType } from "@/types/domain";

const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

type CategoryFilter = "all" | MealType;

type UserScannedFood = {
  _id: string;
  foodName: string;
  serving: string;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealType: MealType;
  source: "ai" | "manual" | "catalog";
  imageUrl: string | null;
  localDate: string;
  createdAt: number;
};

export function FoodsScreen() {
  const { t } = useTranslation();
  if (!hasBackendConfiguration) {
    return (
      <AppScreen edges={["top", "left", "right"]}>
        <Text accessibilityRole="header" className="text-2xl font-bold text-app-text">
          {t("tabs.foods")}
        </Text>
        <EmptyState description={t("config.body")} icon="foods" title={t("config.title")} />
      </AppScreen>
    );
  }
  return <ConfiguredFoodsScreen />;
}

function ConfiguredFoodsScreen() {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [reloggingId, setReloggingId] = React.useState<string | null>(null);

  const profile = useQuery(api.profiles.getCurrent, {});
  const streak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });
  const userScannedFoods = useQuery(api.foods.getMyScannedAndLoggedFoods, { limit: 40 });
  const createFoodLog = useMutation(api.foodLogs.create);
  const goal: GoalType = profile?.goalType ?? "maintain";

  const searching = searchQuery.trim().length > 0;

  // Filter the user's own scanned & logged foods. This is the screen's only list:
  // the goal-suggestion catalog section was removed on request.
  const visibleUserFoods = React.useMemo(() => {
    if (!userScannedFoods) return undefined;
    let list = userScannedFoods;
    if (category !== "all") {
      list = list.filter((item) => item.mealType === category);
    }
    if (searching) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((item) => item.foodName.toLowerCase().includes(q) || item.serving.toLowerCase().includes(q));
    }
    return list;
  }, [userScannedFoods, category, searching, searchQuery]);

  const headline = t(`foodHeadline.${goal}`);

  /**
   * One distinct icon per chip. `all` and `lunch` both used `foods`, and `snack`
   * used the hydration water-drop, so three of the five chips read as the wrong
   * category at a glance. `design/foods.png` has no Shakes chip equivalent here:
   * `MealType` is breakfast/lunch/dinner/snack, so a Shakes filter would match
   * nothing until the meal-type union gains a member.
   */
  const categories: { icon: AppIconName; key: CategoryFilter; label: string }[] = [
    { key: "all", icon: "foods", label: t("foodCategories.all") },
    { key: "breakfast", icon: "light", label: t("foodCategories.breakfast") },
    { key: "lunch", icon: "ingredientMeat", label: t("foodCategories.lunch") },
    { key: "dinner", icon: "ingredientFish", label: t("foodCategories.dinner") },
    { key: "snack", icon: "ingredientFruit", label: t("foodCategories.snack") },
  ];

  const handleRelog = async (item: UserScannedFood) => {
    try {
      setReloggingId(item._id);
      await createFoodLog({
        localDate: currentLocalDate(),
        timezone: currentTimezone(),
        mealType: item.mealType,
        source: item.source,
        foodName: item.foodName,
        serving: item.serving,
        servingUnit: item.servingUnit,
        quantity: item.quantity,
        calories: item.calories,
        proteinGrams: item.proteinGrams,
        carbsGrams: item.carbsGrams,
        fatGrams: item.fatGrams,
        clientRequestId: createClientRequestId(),
      });
      router.push("/(app)/(tabs)/today");
    } catch {
      // Re-log failed silently, user can retry
    } finally {
      setReloggingId(null);
    }
  };

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/* Top Header — logo + wordmark lockup and streak badge, per `design/foods.png`. */}
      <View className="min-h-14 flex-row items-center justify-between gap-3">
        <View accessibilityLabel="BodyCal" accessibilityRole="header" className="min-w-0 flex-row items-center gap-2">
          <Image className="h-12 w-12" contentFit="contain" source={brandLogo} />
          <Text className="text-2xl font-bold tracking-[-0.4px] text-app-text">BodyCal</Text>
        </View>

        <View
          accessibilityLabel={t("dashboard.streakLabel", { count: streak ?? 0 })}
          className="min-h-11 flex-row items-center gap-1.5 rounded-2xl border border-app-border bg-white px-3"
          style={{ borderCurve: "continuous", boxShadow: shadows.floating }}
        >
          <AppIcon color={macroColors.calories} name="calories" size={18} weight="semibold" />
          <Text className="text-sm font-bold text-app-text" style={{ fontVariant: ["tabular-nums"] }}>
            {streak ?? 0}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View
        className="min-h-12 flex-row items-center gap-3 rounded-2xl border border-app-border bg-white px-4"
        style={{ borderCurve: "continuous" }}
      >
        <AppIcon color={colors.muted} name="search" size={20} />
        <TextInput
          accessibilityLabel={t("foodSearch.placeholder")}
          autoCorrect={false}
          className="min-h-12 min-w-0 flex-1 text-base text-app-text"
          onChangeText={setSearchQuery}
          placeholder={t("foodSearch.placeholder")}
          placeholderTextColor={colors.subtle}
          returnKeyType="search"
          value={searchQuery}
        />
        {searchQuery ? (
          <Pressable
            accessibilityLabel={t("foodSearch.clear")}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full"
            onPress={() => setSearchQuery("")}
          >
            <AppIcon color={colors.muted} name="close" size={16} />
          </Pressable>
        ) : null}
      </View>

      {/*
        Category Pills.

        The row bleeds through `AppScreen`'s `px-5` with a matching negative
        margin so a pill scrolled to either end sits flush with the screen edge
        instead of being sliced mid-capsule by the parent padding.
      */}
      <ScrollView
        className="-mx-5"
        contentContainerClassName="flex-row gap-2 px-5 py-1"
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.map((item) => {
          const active = category === item.key;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              className={
                active
                  ? "min-h-11 flex-row items-center gap-1.5 rounded-full bg-[#111111] px-4"
                  : "min-h-11 flex-row items-center gap-1.5 rounded-full border border-app-border bg-white px-4"
              }
              key={item.key}
              onPress={() => setCategory(item.key)}
            >
              <AppIcon color={active ? colors.white : colors.muted} name={item.icon} size={16} />
              <Text className={active ? "text-sm font-bold text-white" : "text-sm font-semibold text-app-text"}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Screen Title and its supporting copy. */}
      <View className="gap-1.5">
        <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.4px] text-app-text">
          {searching ? t("foodSearch.title") : headline}
        </Text>
        {searching ? null : (
          <Text className="text-[15px] leading-5.5 text-app-muted">{t(`foodHeadline.${goal}Support`)}</Text>
        )}
      </View>

      {/*
        The user's own scanned & logged meals — now the screen's only list.

        Loading, empty and populated states are all handled here. `undefined`
        means the query has not resolved yet, which is distinct from a resolved
        empty list, so the skeleton must not be conflated with the empty state.
      */}
      {visibleUserFoods === undefined ? (
        <ScreenSkeleton lines={3} />
      ) : visibleUserFoods.length === 0 ? (
        <EmptyState
          action={searching ? t("foodSearch.addManually") : t("foodSearch.emptyScannedAction")}
          description={searching ? t("foodSearch.emptyDescription") : t("foodSearch.emptyScannedDescription")}
          icon={searching ? "search" : "camera"}
          onAction={() =>
            router.push(searching ? "/(app)/food/manual" : "/(app)/(tabs)/scan")
          }
          title={searching ? t("foodSearch.emptyTitle") : t("foodSearch.emptyScannedTitle")}
        />
      ) : (
        <View className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text accessibilityRole="header" className="text-lg font-bold text-app-text">
              {t("foodSearch.scannedSectionAll")}
            </Text>
            <Text className="text-xs font-semibold text-app-muted">
              {t("foodSearch.mealCount", { count: visibleUserFoods.length })}
            </Text>
          </View>

          <View className="gap-3">
            {visibleUserFoods.map((item) => (
              <UserScannedFoodCard
                isRelogging={reloggingId === item._id}
                item={item}
                key={item._id}
                onRelog={() => handleRelog(item)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Footer Add Manually Button */}
      <View className="items-center gap-3 pb-6 pt-3">
        <Text className="text-center text-xs text-app-muted" selectable>
          {t("nutritionTargets.estimateNote")}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-5 active:bg-app-surface shadow-xs"
          onPress={() => router.push("/(app)/food/manual")}
        >
          <AppIcon color={colors.text} name="add" size={19} weight="semibold" />
          <Text className="text-sm font-semibold text-app-text">{t("foodSearch.addManually")}</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

/**
 * Card for user's real AI-scanned or logged meal.
 */
function UserScannedFoodCard({
  item,
  onRelog,
  isRelogging,
}: {
  item: UserScannedFood;
  onRelog: () => void;
  isRelogging: boolean;
}) {
  const { i18n: instance, t } = useTranslation();
  const number = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 0 });

  /**
   * `localDate` is a stored local `YYYY-MM-DD` day key, not an instant. Reading
   * it through `Intl` keeps the card from printing the raw ISO key, and the
   * explicit midnight keeps `Date` from parsing the bare date as UTC and drifting
   * a day backwards for users behind Greenwich.
   */
  const loggedOn = new Date(`${item.localDate}T00:00:00`);
  const loggedLabel = Number.isNaN(loggedOn.getTime())
    ? item.localDate
    : new Intl.DateTimeFormat(instance.resolvedLanguage, { day: "numeric", month: "short" }).format(loggedOn);

  return (
    <View
      className="overflow-hidden rounded-3xl border border-app-border bg-white"
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="flex-row items-stretch">
        {/*
          `self-stretch` rather than a fixed height: the row is `items-stretch`,
          but an explicit `h-38` overrode that and left a white gap beside the
          macro row whenever the text column grew past 152pt — which a two-line
          meal name always does.
        */}
        <FoodThumbnail className="w-32 self-stretch bg-app-surface" imageUrl={item.imageUrl} name={item.foodName} />

        <View className="min-w-0 flex-1 justify-between gap-1.5 p-3.5">
          <View className="gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <View
                className={`rounded-full px-2 py-0.5 ${
                  item.source === "ai" ? "bg-emerald-100" : "bg-blue-100"
                }`}
              >
                <Text
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    item.source === "ai" ? "text-emerald-800" : "text-blue-800"
                  }`}
                >
                  {item.source === "ai" ? t("foodSearch.badgeAi") : t("foodSearch.badgeLogged")}
                </Text>
              </View>
              <Text className="text-[11px] font-medium text-app-muted">{loggedLabel}</Text>
            </View>

            <Text accessibilityRole="header" className="text-base font-bold text-app-text" numberOfLines={2} selectable>
              {item.foodName}
            </Text>
            <Text className="text-xs text-app-muted" numberOfLines={1}>
              {item.serving}
            </Text>
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1">
                <AppIcon color={macroColors.calories} name="calories" size={14} weight="semibold" />
                <Text className="text-sm font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
                  {t("dashboard.logCalories", { calories: number.format(item.calories) })}
                </Text>
              </View>

              <Pressable
                accessibilityLabel={t("foodSearch.logAgainLabel")}
                accessibilityRole="button"
                className="flex-row items-center gap-1 rounded-xl bg-app-surface px-2.5 py-1 active:bg-app-border"
                disabled={isRelogging}
                onPress={onRelog}
              >
                <AppIcon color={colors.text} name="add" size={13} weight="semibold" />
                <Text className="text-[11px] font-bold text-app-text">
                  {isRelogging ? t("foodSearch.loggingAgain") : t("foodSearch.logAgain")}
                </Text>
              </Pressable>
            </View>

            <View className="h-px bg-app-border-soft" />

            <View className="flex-row items-center">
              <MacroStat color={macroColors.protein} label={t("nutritionBreakdown.protein")} value={item.proteinGrams} />
              <View className="h-6 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.carbs} label={t("nutritionBreakdown.carbs")} value={item.carbsGrams} />
              <View className="h-6 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.fat} label={t("nutritionBreakdown.fat")} value={item.fatGrams} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Coloured macro value over a muted label.
 *
 * The label wraps to a second line rather than truncating: German
 * "Kohlenhydrate" and Portuguese "Carboidratos" do not fit one third of a card
 * at this size, and a clipped "Kohlenhydr…" reads worse than two short lines.
 */
function MacroStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View accessibilityLabel={`${label} ${value}g`} className="min-w-0 flex-1 items-center gap-0.5 px-1">
      <Text className="text-[14px] font-bold" selectable style={{ color, fontVariant: ["tabular-nums"] }}>
        {value}g
      </Text>
      <Text className="text-center text-[11px] font-medium text-app-muted" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
