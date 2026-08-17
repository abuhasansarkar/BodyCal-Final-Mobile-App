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
import { i18n } from "@/locales/i18n";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import type { GoalType, MealType } from "@/types/domain";

const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

type CategoryFilter = "all" | MealType;
type ViewTab = "all" | "scanned" | "discover";

/** Catalog item as projected by `foods.searchCatalog`. */
type CatalogItem = {
  _id: string;
  title: string;
  description: string;
  serving: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  imageUrl: string | null;
  mealTypes?: MealType[];
};

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
  const locale = i18n.resolvedLanguage ?? "en";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [viewTab, setViewTab] = React.useState<ViewTab>("all");
  const [reloggingId, setReloggingId] = React.useState<string | null>(null);

  const profile = useQuery(api.profiles.getCurrent, {});
  const streak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });
  const userScannedFoods = useQuery(api.foods.getMyScannedAndLoggedFoods, { limit: 40 });
  const createFoodLog = useMutation(api.foodLogs.create);
  const goal: GoalType = profile?.goalType ?? "maintain";

  const searching = searchQuery.trim().length > 0;
  const results = useQuery(
    api.foods.searchCatalog,
    searching
      ? { query: searchQuery, locale, mealType: category === "all" ? undefined : category }
      : "skip",
  );
  const recommended = useQuery(
    api.foods.getRecommendations,
    searching || profile === undefined ? "skip" : { goalType: goal, locale },
  );

  const catalogFoods = searching ? results : recommended;

  // Filter user's scanned & logged foods
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

  // Filter catalog foods
  const visibleCatalogFoods = React.useMemo(() => {
    if (!catalogFoods) return undefined;
    if (category === "all" || searching) return catalogFoods;
    return catalogFoods.filter((food) => food.mealTypes?.includes(category));
  }, [category, catalogFoods, searching]);

  const headline = t(`foodHeadline.${goal}`);

  const categories: { icon: AppIconName; key: CategoryFilter; label: string }[] = [
    { key: "all", icon: "foods", label: t("foodCategories.all") },
    { key: "breakfast", icon: "calories", label: t("foodCategories.breakfast") },
    { key: "lunch", icon: "foods", label: t("foodCategories.lunch") },
    { key: "dinner", icon: "nutrition", label: t("foodCategories.dinner") },
    { key: "snack", icon: "hydration", label: t("foodCategories.snack") },
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
      {/* Top Header */}
      <View className="min-h-14 flex-row items-center justify-between">
        <Image accessibilityLabel="BodyCal" className="h-14 w-14" contentFit="contain" source={brandLogo} />

        <View
          accessibilityLabel={t("dashboard.streakLabel", { count: streak ?? 0 })}
          className="min-h-11 flex-row items-center gap-1.5 rounded-2xl border border-app-border bg-white px-3"
          style={{ borderCurve: "continuous", boxShadow: shadows.floating }}
        >
          <AppIcon color={macroColors.calories} name="calories" size={18} weight="semibold" />
          <Text className="text-sm font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
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

      {/* View Mode Switcher */}
      <View className="flex-row rounded-2xl border border-app-border bg-app-surface p-1">
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewTab === "all" }}
          className={`min-h-9 flex-1 items-center justify-center rounded-xl px-2 ${
            viewTab === "all" ? "bg-white shadow-xs" : ""
          }`}
          onPress={() => setViewTab("all")}
        >
          <Text className={`text-xs font-bold ${viewTab === "all" ? "text-app-text" : "text-app-muted"}`}>
            {t("foodSearch.tabAll")}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewTab === "scanned" }}
          className={`min-h-9 flex-1 items-center justify-center rounded-xl px-2 ${
            viewTab === "scanned" ? "bg-white shadow-xs" : ""
          }`}
          onPress={() => setViewTab("scanned")}
        >
          <Text className={`text-xs font-bold ${viewTab === "scanned" ? "text-app-text" : "text-app-muted"}`}>
            {t("foodSearch.tabScans", { count: userScannedFoods?.length ?? 0 })}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: viewTab === "discover" }}
          className={`min-h-9 flex-1 items-center justify-center rounded-xl px-2 ${
            viewTab === "discover" ? "bg-white shadow-xs" : ""
          }`}
          onPress={() => setViewTab("discover")}
        >
          <Text className={`text-xs font-bold ${viewTab === "discover" ? "text-app-text" : "text-app-muted"}`}>
            {t("foodSearch.tabDiscover")}
          </Text>
        </Pressable>
      </View>

      {/* Category Pills */}
      <ScrollView contentContainerClassName="flex-row gap-2 py-1" horizontal showsHorizontalScrollIndicator={false}>
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

      {/* Screen Title */}
      <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.4px] text-app-text">
        {searching
          ? t("foodSearch.title")
          : viewTab === "scanned"
          ? t("foodSearch.scannedTitle")
          : headline}
      </Text>

      {/* SECTION 1: User's Real Scanned & Logged Meals */}
      {(viewTab === "all" || viewTab === "scanned") && visibleUserFoods && visibleUserFoods.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text accessibilityRole="header" className="text-lg font-bold text-app-text">
              {viewTab === "all" ? t("foodSearch.scannedSectionAll") : t("foodSearch.scannedSectionTab")}
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
      ) : null}

      {/* SECTION 2: Empty Scanned Meals State */}
      {viewTab === "scanned" && visibleUserFoods && visibleUserFoods.length === 0 ? (
        <EmptyState
          action={t("foodSearch.emptyScannedAction")}
          description={t("foodSearch.emptyScannedDescription")}
          icon="camera"
          onAction={() => router.push("/(app)/(tabs)/scan")}
          title={t("foodSearch.emptyScannedTitle")}
        />
      ) : null}

      {/* SECTION 3: Discover & Catalog Whole Foods */}
      {(viewTab === "all" || viewTab === "discover") ? (
        visibleCatalogFoods === undefined ? (
          <ScreenSkeleton lines={3} />
        ) : visibleCatalogFoods.length === 0 ? (
          <EmptyState
            action={t("foodSearch.addManually")}
            description={
              searching ? t("foodSearch.emptyDescription") : t("foodSearch.recommendationsEmptyDescription")
            }
            icon={searching ? "search" : "foods"}
            onAction={() => router.push("/(app)/food/manual")}
            title={searching ? t("foodSearch.emptyTitle") : t("foodSearch.recommendationsEmptyTitle")}
          />
        ) : (
          <View className="gap-3">
            {!searching && viewTab === "all" ? (
              <Text accessibilityRole="header" className="mt-2 text-lg font-bold text-app-text">
                {t("foodSearch.catalogSection")}
              </Text>
            ) : null}
            <View className="gap-4">
              {visibleCatalogFoods.map((food) => (
                <FoodCard food={food} key={food._id} />
              ))}
            </View>
          </View>
        )
      ) : null}

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

  return (
    <View
      className="overflow-hidden rounded-3xl border border-app-border bg-white"
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="flex-row items-stretch">
        <FoodThumbnail className="h-38 w-32 bg-app-surface" imageUrl={item.imageUrl} name={item.foodName} />

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
              <Text className="text-[11px] font-medium text-app-muted">{item.localDate}</Text>
            </View>

            <Text accessibilityRole="header" className="text-base font-bold text-app-text" numberOfLines={1} selectable>
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
              <MacroStat color={macroColors.protein} label={t("nutritionTargets.protein")} value={item.proteinGrams} />
              <View className="h-6 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.carbs} label={t("nutritionTargets.carbs")} value={item.carbsGrams} />
              <View className="h-6 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.fat} label={t("nutritionTargets.fat")} value={item.fatGrams} />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * One recommended or searched catalog food.
 */
function FoodCard({ food }: { food: CatalogItem }) {
  const { i18n: instance, t } = useTranslation();
  const number = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 0 });

  return (
    <Pressable
      accessibilityLabel={food.title}
      accessibilityRole="button"
      className="overflow-hidden rounded-3xl border border-app-border bg-white active:bg-app-surface"
      onPress={() => router.push({ pathname: "/(app)/food/[id]", params: { id: food._id } })}
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="flex-row items-stretch">
        <FoodThumbnail className="h-44 w-36 bg-app-surface" imageUrl={food.imageUrl} name={food.title} />

        <View className="min-w-0 flex-1 justify-between gap-2 p-4">
          <View className="gap-1">
            <Text accessibilityRole="header" className="text-base font-bold text-app-text" numberOfLines={2} selectable>
              {food.title}
            </Text>
            <Text className="text-[13px] leading-4.5 text-app-muted" numberOfLines={2} selectable>
              {food.description}
            </Text>
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <AppIcon color={macroColors.calories} name="calories" size={15} weight="semibold" />
              <Text className="text-sm font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
                {t("dashboard.logCalories", { calories: number.format(food.calories) })}
              </Text>
            </View>

            <View className="h-px bg-app-border-soft" />

            <View className="flex-row items-center">
              <MacroStat color={macroColors.protein} label={t("nutritionTargets.protein")} value={food.proteinGrams} />
              <View className="h-7 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.carbs} label={t("nutritionTargets.carbs")} value={food.carbsGrams} />
              <View className="h-7 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.fat} label={t("nutritionTargets.fat")} value={food.fatGrams} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/** Coloured macro value over a muted label. */
function MacroStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View accessibilityLabel={`${label} ${value}g`} className="min-w-0 flex-1 items-center gap-0.5">
      <Text className="text-[14px] font-bold" selectable style={{ color, fontVariant: ["tabular-nums"] }}>
        {value}g
      </Text>
      <Text className="text-[11px] font-medium text-app-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
