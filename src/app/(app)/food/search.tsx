import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodResultRow } from "@/components/food-result-row";
import { SegmentedControl } from "@/components/ui/form";
import { ScreenTitle, SectionHeader } from "@/components/ui/section-card";
import { EmptyState, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { api } from "@/lib/convex-api";
import { i18n } from "@/locales/i18n";
import { Pressable, Text, TextInput, View } from "@/tw";
import type { MealType } from "@/types/domain";

export default function SearchFoodRoute() {
  const { t } = useTranslation();
  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("foodSearch.title")} />
      </AppScreen>
    );
  }
  return <ConfiguredSearch />;
}

/**
 * Food search backed by the Convex catalog search index.
 *
 * This screen previously filtered a hard-coded five-item array in memory, so the
 * seeded catalog, favourites and custom foods were all unreachable.
 */
function ConfiguredSearch() {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType | "all">("all");
  const locale = i18n.resolvedLanguage ?? "en";

  const results = useQuery(api.foods.searchCatalog, {
    query,
    locale,
    mealType: mealType === "all" ? undefined : mealType,
  });
  const recent = useQuery(api.foods.getRecent, { limit: 8 });
  const customFoods = useQuery(api.foods.listCustomFoods, {});

  const loading = results === undefined || recent === undefined || customFoods === undefined;

  return (
    <AppScreen>
      <ScreenTitle title={t("foodSearch.title")} />

      <View className="min-h-12 flex-row items-center gap-2 rounded-2xl border border-app-border bg-white px-4">
        <AppIcon color={colors.muted} name="search" size={20} />
        <TextInput
          accessibilityLabel={t("foodSearch.placeholder")}
          autoCorrect={false}
          className="min-h-12 min-w-0 flex-1 text-base text-app-text"
          onChangeText={setQuery}
          placeholder={t("foodSearch.placeholder")}
          placeholderTextColor={colors.subtle}
          returnKeyType="search"
          value={query}
        />
        {query ? (
          <Pressable
            accessibilityLabel={t("foodSearch.clear")}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center"
            onPress={() => setQuery("")}
          >
            <AppIcon color={colors.muted} name="close" size={18} />
          </Pressable>
        ) : null}
      </View>

      <SegmentedControl
        accessibilityLabel={t("foodCategories.all")}
        onChange={setMealType}
        options={[
          { value: "all", label: t("foodCategories.all") },
          { value: "breakfast", label: t("foodCategories.breakfast") },
          { value: "lunch", label: t("foodCategories.lunch") },
          { value: "dinner", label: t("foodCategories.dinner") },
        ]}
        value={mealType}
      />

      {loading ? (
        <ScreenSkeleton lines={4} />
      ) : (
        <>
          {results.length > 0 ? (
            <View className="gap-3">
              <SectionHeader
                action={
                  <Text className="text-xs font-medium text-app-muted">
                    {t("foodSearch.resultCount", { count: results.length })}
                  </Text>
                }
                title={t("foodSearch.catalogSection")}
              />
              <View className="gap-2">
                {results.map((food) => (
                  <FoodResultRow
                    calories={food.calories}
                    key={food._id}
                    onPress={() =>
                      router.push({ pathname: "/(app)/food/[id]", params: { id: food._id } })
                    }
                    serving={food.serving}
                    title={food.title}
                  />
                ))}
              </View>
            </View>
          ) : query ? (
            <EmptyState
              action={t("foodSearch.addManually")}
              description={t("foodSearch.emptyDescription")}
              icon="search"
              onAction={() => router.push("/(app)/food/manual")}
              title={t("foodSearch.emptyTitle")}
            />
          ) : null}

          {customFoods.length > 0 ? (
            <View className="gap-3">
              <SectionHeader title={t("foodSearch.librarySection")} />
              <View className="gap-2">
                {customFoods.map((food) => (
                  <FoodResultRow
                    calories={food.calories}
                    key={food._id}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/food/manual",
                        params: { customFoodId: food._id },
                      })
                    }
                    serving={food.serving}
                    title={food.name}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {recent.length > 0 ? (
            <View className="gap-3">
              <SectionHeader title={t("foodSearch.recentSection")} />
              <View className="gap-2">
                {recent.map((food) => (
                  <FoodResultRow
                    calories={food.calories}
                    key={`${food.foodName}-${food.lastLoggedAt}`}
                    onPress={() =>
                      router.push({
                        pathname: "/(app)/food/manual",
                        params: {
                          name: food.foodName,
                          serving: food.serving,
                          calories: String(food.calories),
                          protein: String(food.proteinGrams),
                          carbs: String(food.carbsGrams),
                          fat: String(food.fatGrams),
                        },
                      })
                    }
                    serving={food.serving}
                    title={food.foodName}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      <Pressable
        accessibilityRole="button"
        className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
        onPress={() => router.push("/(app)/food/manual")}
      >
        <AppIcon color={colors.accent} name="add" size={19} weight="semibold" />
        <Text className="text-base font-semibold text-app-accent">{t("foodSearch.addManually")}</Text>
      </Pressable>
    </AppScreen>
  );
}
