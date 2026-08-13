import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
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
    searching ? "skip" : { goalType: goal, locale },
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
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Image accessibilityLabel="BodyCal" className="h-10 w-10" contentFit="contain" source={brandLogo} />
          <Text className="text-2xl font-bold tracking-[-0.5px] text-app-text">BodyCal</Text>
        </View>

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
          description={t("foodSearch.emptyDescription")}
          icon="search"
          onAction={() => router.push("/(app)/food/manual")}
          title={t("foodSearch.emptyTitle")}
        />
      ) : (
        <View className="gap-4">
          {visible.map((food) => (
            <FoodCard food={food} key={food._id} />
          ))}
        </View>
      )}

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
    </AppScreen>
  );
}

function FoodCard({ food }: { food: CatalogItem }) {
  const { i18n: instance, t } = useTranslation();
  const number = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 0 });

  return (
    <Pressable
      accessibilityLabel={food.title}
      accessibilityRole="button"
      className="min-h-[148px] overflow-hidden rounded-3xl border border-app-border bg-white active:bg-app-surface"
      onPress={() => router.push({ pathname: "/(app)/food/[id]", params: { id: food._id } })}
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="flex-row">
        {food.imageUrl ? (
          <Image
            accessibilityLabel={food.title}
            cachePolicy="memory"
            className="h-full w-[130px] bg-app-surface"
            contentFit="cover"
            source={{ uri: food.imageUrl }}
            transition={200}
          />
        ) : (
          <View className="h-full w-[130px] items-center justify-center bg-app-surface">
            <AppIcon color={colors.muted} name="foods" size={30} />
          </View>
        )}

        <View className="min-w-0 flex-1 justify-between gap-2 p-4">
          <View className="gap-1">
            <Text
              accessibilityRole="header"
              className="text-base font-bold text-app-text"
              numberOfLines={1}
              selectable
            >
              {food.title}
            </Text>
            <Text className="text-[13px] leading-[18px] text-app-muted" numberOfLines={2} selectable>
              {food.description}
            </Text>
          </View>

          <View className="gap-2">
            <View className="flex-row items-center gap-1.5">
              <AppIcon color={macroColors.calories} name="calories" size={15} weight="semibold" />
              <Text
                className="text-sm font-bold text-app-text"
                selectable
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {t("dashboard.logCalories", { calories: number.format(food.calories) })}
              </Text>
              <Text className="text-xs text-app-muted" numberOfLines={1}>
                · {food.serving}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <MacroChip color={macroColors.protein} label={t("nutritionTargets.protein")} value={food.proteinGrams} />
              <MacroChip color={macroColors.carbs} label={t("nutritionTargets.carbs")} value={food.carbsGrams} />
              <MacroChip color={macroColors.fat} label={t("nutritionTargets.fat")} value={food.fatGrams} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function MacroChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View accessibilityLabel={`${label} ${value}`} className="flex-row items-center gap-1">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs font-semibold text-app-muted" style={{ fontVariant: ["tabular-nums"] }}>
        {value}g
      </Text>
    </View>
  );
}
