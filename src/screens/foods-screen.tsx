import { useQuery } from "convex/react";
import { Link } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { hasBackendConfiguration } from "@/config/env";
import { curatedFoods, type CatalogFood } from "@/features/food/catalog";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "@/tw";

const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

type CategoryFilter = "all" | "breakfast" | "lunch" | "dinner" | "snack" | "shakes";

const categoryFilters: { key: CategoryFilter; label: string; icon: AppIconName }[] = [
  { key: "all", label: "All", icon: "foods" },
  { key: "breakfast", label: "Breakfast", icon: "calories" },
  { key: "lunch", label: "Lunch", icon: "foods" },
  { key: "dinner", label: "Dinner", icon: "nutrition" },
  { key: "snack", label: "Snacks", icon: "hydration" },
  { key: "shakes", label: "Shakes", icon: "protein" },
];

export function FoodsScreen() {
  if (hasBackendConfiguration) {
    return <ConfiguredFoodsScreen />;
  }
  return <FoodsContent streak={3} userGoal="gain" />;
}

function ConfiguredFoodsScreen() {
  const profile = useQuery(api.profiles.getCurrent, {});
  const streak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });

  const userGoal = profile?.goalType ?? "gain";
  return <FoodsContent streak={streak ?? 3} userGoal={userGoal} />;
}

function FoodsContent({ streak = 3, userGoal = "gain" }: { streak?: number; userGoal?: "lose" | "maintain" | "gain" }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<CategoryFilter>("all");

  const headline =
    userGoal === "lose"
      ? "Foods for healthy weight loss"
      : userGoal === "maintain"
        ? "Foods for maintaining weight"
        : "Foods for healthy weight gain";

  const subtitle =
    userGoal === "lose"
      ? "Nutrient-dense, satisfying meals to keep you full and energized."
      : userGoal === "maintain"
        ? "Balanced, wholesome meals to keep your current weight steady."
        : "High-calorie, nutrient-dense meals to help you build muscle and reach your goals.";

  const searchPlaceholder =
    userGoal === "gain"
      ? "Search high-calorie foods and meals"
      : userGoal === "lose"
        ? "Search low-calorie foods and meals"
        : "Search balanced foods and meals";

  const filteredFoods = curatedFoods.filter((item) => {
    const matchesSearch =
      !searchQuery.trim() ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || item.category === selectedCategory || item.mealTypes.includes(selectedCategory as never);

    return matchesSearch && matchesCategory;
  });

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/* Header Lockup: BodyCal Logo + Live Streak Badge */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Image accessibilityLabel="BodyCal" className="h-10 w-10" contentFit="contain" source={brandLogo} />
          <Text className="text-2xl font-bold tracking-[-0.5px] text-app-text">BodyCal</Text>
        </View>

        <View
          accessibilityLabel={`${streak} day streak`}
          className="flex-row items-center gap-1.5 rounded-2xl border border-app-border bg-white px-3 py-1.5"
          style={{ borderCurve: "continuous", boxShadow: "0 4px 14px rgba(0, 0, 0, 0.04)" }}
        >
          <AppIcon color="#FF6B00" name="calories" size={18} weight="semibold" />
          <Text className="text-sm font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
            {streak}
          </Text>
          <Text className="text-sm font-semibold text-app-muted">day streak</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View className="min-h-13 flex-row items-center gap-3 rounded-2xl border border-app-border bg-white px-4 py-3" style={{ borderCurve: "continuous" }}>
        <AppIcon color="#737373" name="search" size={20} />
        <TextInput
          accessibilityLabel="Search foods and meals"
          className="min-h-10 min-w-0 flex-1 text-base text-app-text placeholder:text-app-muted"
          onChangeText={setSearchQuery}
          placeholder={searchPlaceholder}
          value={searchQuery}
        />
        {searchQuery ? (
          <Pressable accessibilityLabel="Clear search" accessibilityRole="button" className="h-9 w-9 items-center justify-center rounded-full bg-app-surface" onPress={() => setSearchQuery("")}>
            <AppIcon color="#737373" name="close" size={16} />
          </Pressable>
        ) : null}
      </View>

      {/* Horizontal Category Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2 py-1">
        {categoryFilters.map((cat) => {
          const active = selectedCategory === cat.key;
          return (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              className={
                active
                  ? "flex-row items-center gap-1.5 rounded-full bg-[#111111] px-4 py-2.5"
                  : "flex-row items-center gap-1.5 rounded-full border border-app-border bg-white px-4 py-2.5"
              }
              onPress={() => setSelectedCategory(cat.key)}
            >
              <AppIcon color={active ? "#FFFFFF" : "#737373"} name={cat.icon} size={16} />
              <Text className={active ? "text-sm font-bold text-white" : "text-sm font-semibold text-app-text"}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Headline & Subtitle Section */}
      <View className="gap-1.5 pt-1">
        <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.4px] text-app-text">
          {headline}
        </Text>
        <Text className="text-sm leading-5 text-app-muted">{subtitle}</Text>
      </View>

      {/* Sub-header: Recommended for you */}
      <View className="flex-row items-center justify-between pt-1">
        <Text className="text-base font-bold text-app-text">Recommended for you</Text>
        <Text className="text-sm font-semibold text-app-muted">{filteredFoods.length} items</Text>
      </View>

      {/* Food Cards List */}
      {filteredFoods.length === 0 ? (
        <View className="items-center justify-center rounded-3xl border border-app-border bg-white p-8">
          <AppIcon color="#737373" name="search" size={32} />
          <Text className="mt-2 text-base font-semibold text-app-text">No matching foods found</Text>
          <Text className="mt-1 text-center text-xs text-app-muted">
            Try searching for another food or add a custom meal manually.
          </Text>
          <Link href="/(app)/add-food" asChild>
            <Pressable accessibilityRole="button" className="mt-4 min-h-11 flex-row items-center gap-2 rounded-2xl bg-[#111111] px-5 py-2.5">
              <AppIcon color="#FFFFFF" name="add" size={18} />
              <Text className="text-sm font-semibold text-white">Add Custom Food</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View className="gap-4">
          {filteredFoods.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </View>
      )}

      {/* Footer Disclaimer & Manual Entry Link */}
      <View className="items-center gap-3 pt-2 pb-4">
        <Text className="text-center text-xs text-app-muted">
          {t("common.estimated")} · Curated nutritional suggestions
        </Text>
        <Link href="/(app)/add-food" asChild>
          <Pressable accessibilityRole="button" className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-5 active:bg-app-surface">
            <AppIcon color="#111111" name="add" size={19} weight="semibold" />
            <Text className="text-sm font-semibold text-app-text">Log Custom Food Manually</Text>
          </Pressable>
        </Link>
      </View>
    </AppScreen>
  );
}

function FoodCard({ food }: { food: CatalogFood }) {
  return (
    <Link href={{ pathname: "/(app)/food/[id]", params: { id: food.id } }} asChild>
      <Pressable
        accessibilityLabel={food.title}
        accessibilityRole="button"
        className="min-h-[148px] overflow-hidden rounded-3xl border border-app-border bg-white active:bg-app-surface"
        style={{ borderCurve: "continuous", boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)" }}
      >
        <View className="flex-row">
          {/* Left Side: Photographic Food Image */}
          <Image
            accessibilityLabel={food.title}
            cachePolicy="memory"
            className="h-full w-[130px] bg-app-surface"
            contentFit="cover"
            source={{ uri: food.imageUrl }}
            transition={200}
          />

          {/* Right Side: Details & Macro Breakdown */}
          <View className="min-w-0 flex-1 justify-between p-4 gap-2">
            <View className="gap-1">
              <Text accessibilityRole="header" className="text-base font-bold text-app-text" numberOfLines={1} selectable>
                {food.title}
              </Text>
              <Text className="text-sm leading-5 text-app-muted" numberOfLines={2} selectable>
                {food.description}
              </Text>
            </View>

            <Text className="text-sm font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
              {food.calories} <Text className="text-sm font-medium text-app-muted">kcal</Text>
            </Text>

            <View className="h-px bg-app-border" />

            {/* 3-Column Macro Breakdown */}
            <View className="flex-row items-center justify-between">
              <View className="items-start">
                <Text className="text-xs font-bold text-[#2F80ED]" selectable style={{ fontVariant: ["tabular-nums"] }}>
                  {food.proteinGrams}g
                </Text>
                <Text className="text-xs font-semibold text-app-muted">Protein</Text>
              </View>

              <View className="h-6 w-px bg-app-border" />

              <View className="items-start">
                <Text className="text-xs font-bold text-[#F97316]" selectable style={{ fontVariant: ["tabular-nums"] }}>
                  {food.carbsGrams}g
                </Text>
                <Text className="text-xs font-semibold text-app-muted">Carbs</Text>
              </View>

              <View className="h-6 w-px bg-app-border" />

              <View className="items-start">
                <Text className="text-xs font-bold text-[#8B5CF6]" selectable style={{ fontVariant: ["tabular-nums"] }}>
                  {food.fatGrams}g
                </Text>
                <Text className="text-xs font-semibold text-app-muted">Fat</Text>
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
