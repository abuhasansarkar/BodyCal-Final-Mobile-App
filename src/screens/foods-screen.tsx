import { useQuery } from "convex/react";
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
import { currentLocalDate } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import type { GoalType, MealType } from "@/types/domain";

const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

type CategoryFilter = "all" | MealType;

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

/**
 * The Foods tab, now reading the Convex catalog.
 *
 * It previously rendered a hard-coded five-item array with remote Unsplash URLs,
 * which meant every user saw the same five foods and the seeded catalog, search
 * index and favourites were all unreachable.
 */
function ConfiguredFoodsScreen() {
  const { t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "en";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");

  const profile = useQuery(api.profiles.getCurrent, {});
  const streak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });
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

  const foods = searching ? results : recommended;
  const visible = React.useMemo(() => {
    if (!foods) return undefined;
    if (category === "all" || searching) return foods;
    return foods.filter((food) => food.mealTypes.includes(category));
  }, [category, foods, searching]);

  const headline = t(`foodHeadline.${goal}`);

  const categories: { icon: AppIconName; key: CategoryFilter; label: string }[] = [
    { key: "all", icon: "foods", label: t("foodCategories.all") },
    { key: "breakfast", icon: "calories", label: t("foodCategories.breakfast") },
    { key: "lunch", icon: "foods", label: t("foodCategories.lunch") },
    { key: "dinner", icon: "nutrition", label: t("foodCategories.dinner") },
    { key: "snack", icon: "hydration", label: t("foodCategories.snack") },
  ];

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/*
        Standing alone since the wordmark was dropped, the mark needs more size
        to hold the corner against the streak badge. `min-h-14` fixes the row
        height so both sides stay centred on the same axis.
      */}
      <View className="min-h-14 flex-row items-center justify-between">
        <Image accessibilityLabel="BodyCal" className="h-14 w-14" contentFit="contain" source={brandLogo} />

        <View
          accessibilityLabel={t("dashboard.streakLabel", { count: streak ?? 0 })}
          className="min-h-11 flex-row items-center gap-1.5 rounded-2xl border border-app-border bg-white px-3"
          style={{ borderCurve: "continuous", boxShadow: shadows.floating }}
        >
          <AppIcon color={macroColors.calories} name="calories" size={18} weight="semibold" />
          <Text
            className="text-sm font-bold text-app-text"
            selectable
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {streak ?? 0}
          </Text>
        </View>
      </View>

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

      <ScrollView
        contentContainerClassName="flex-row gap-2 py-1"
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
              <Text
                className={
                  active ? "text-sm font-bold text-white" : "text-sm font-semibold text-app-text"
                }
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.4px] text-app-text">
        {searching ? t("foodSearch.title") : headline}
      </Text>

      {visible === undefined ? (
        <ScreenSkeleton lines={3} />
      ) : visible.length === 0 ? (
        <EmptyState
          action={t("foodSearch.addManually")}
          description={
            searching
              ? t("foodSearch.emptyDescription")
              : t("foodSearch.recommendationsEmptyDescription")
          }
          icon={searching ? "search" : "foods"}
          onAction={() => router.push("/(app)/food/manual")}
          title={
            searching ? t("foodSearch.emptyTitle") : t("foodSearch.recommendationsEmptyTitle")
          }
        />
      ) : (
        <View className="gap-4">
          {!searching ? (
            <Text accessibilityRole="header" className="text-lg font-bold text-app-text">
              {t("foodSearch.catalogSection")}
            </Text>
          ) : null}
          {visible.map((food) => (
            <FoodCard food={food} key={food._id} />
          ))}
        </View>
      )}

      {visible && visible.length > 0 ? (
        <View className="items-center gap-3 pb-4 pt-2">
          <Text className="text-center text-xs text-app-muted" selectable>
            {t("nutritionTargets.estimateNote")}
          </Text>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-5 active:bg-app-surface"
            onPress={() => router.push("/(app)/food/manual")}
          >
            <AppIcon color={colors.text} name="add" size={19} weight="semibold" />
            <Text className="text-sm font-semibold text-app-text">{t("foodSearch.addManually")}</Text>
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}

/**
 * One recommended or searched food.
 *
 * `foods.png` gives the card a tall photo down the left and a macro row beneath
 * the calories. No catalog row carries an image yet, so `FoodThumbnail` supplies
 * a generic meal still rather than the grey cutlery tile that made every card
 * look broken. Both the image and the card use fixed heights: percentage sizing
 * does not resolve on the image element here.
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

/** Coloured macro value over a muted label, as the reference shows. */
function MacroStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View accessibilityLabel={`${label} ${value}g`} className="min-w-0 flex-1 items-center gap-0.5">
      <Text className="text-[15px] font-bold" selectable style={{ color, fontVariant: ["tabular-nums"] }}>
        {value}g
      </Text>
      <Text className="text-[11px] font-medium text-app-muted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

