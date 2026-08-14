import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import React from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { IngredientChip } from "@/components/ingredient-chip";
import { NutritionBreakdownCard } from "@/components/nutrition-breakdown-card";
import { PrimaryButton } from "@/components/primary-button";
import { FieldGroup, SegmentedControl, Stepper } from "@/components/ui/form";
import { ScreenTitle } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { colors } from "@/config/theme";
import { hasBackendConfiguration } from "@/config/env";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { Pressable, ScrollView, Text, View } from "@/tw";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { MealType } from "@/types/domain";

export default function FoodDetailRoute() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("foodSearch.title")} />
      </AppScreen>
    );
  }
  if (!id) {
    return (
      <AppScreen>
        <EmptyState description={t("foodDetail.notFound")} icon="foods" title={t("foodSearch.title")} />
      </AppScreen>
    );
  }
  return <ConfiguredFoodDetail id={id as Id<"foodCatalog">} />;
}

/** One line of the per-serving facts table. */
function FactRow({ label, unit, value }: { label: string; unit: string; value: string }) {
  return (
    <View
      accessibilityLabel={`${label}: ${value} ${unit}`}
      accessible
      className="min-h-11 flex-row items-center justify-between gap-3 border-b border-app-border-soft px-4 py-2.5 last:border-b-0"
    >
      <Text className="min-w-0 flex-1 text-[15px] text-app-text" selectable>
        {label}
      </Text>
      <Text className="text-[15px] font-semibold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
        {value}
        <Text className="text-[13px] font-medium text-app-muted"> {unit}</Text>
      </Text>
    </View>
  );
}

/**
 * Catalog food detail, logged through the same validated mutation as everything
 * else.
 *
 * Laid out from `design/modal-food.png`: full-bleed hero with back and favourite
 * controls, a rounded sheet that overlaps it, a calorie block paired with a ring
 * showing what the portion costs against today's calorie target, macro rows
 * carrying grams and their share of the meal's energy, ingredient chips, and a
 * per-serving facts table headed by the food's own name.
 *
 * Every number on the screen is either stored on the food or derived from stored
 * values. The reference also shows fibre and sodium pillars; `foodCatalog`
 * stores neither, and inventing them would put fabricated nutrition in front of
 * the user, so they are omitted rather than filled in.
 */
function ConfiguredFoodDetail({ id }: { id: Id<"foodCatalog"> }) {
  const { t, i18n: instance } = useTranslation();
  const localDate = currentLocalDate();

  const food = useQuery(api.foods.getById, { id, locale: i18n.resolvedLanguage ?? "en" });
  const goal = useQuery(api.nutritionGoals.getActive, { localDate });
  const profile = useQuery(api.profiles.getCurrent, {});
  const createLog = useMutation(api.foodLogs.create);
  const toggleFavorite = useMutation(api.foods.toggleFavorite);
  const number = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 0 });
  // The stepper moves in halves, so the portion count keeps one decimal.
  const portionCount = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 1 });

  const [mealType, setMealType] = React.useState<MealType>("lunch");
  const [quantity, setQuantity] = React.useState(1);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "error" } | null>(null);

  if (food === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={3} />
      </AppScreen>
    );
  }
  if (food === null) {
    return (
      <AppScreen>
        <EmptyState description={t("foodDetail.notFound")} icon="foods" title={t("foodSearch.title")} />
      </AppScreen>
    );
  }

  const scaled = {
    calories: Math.round(food.calories * quantity),
    proteinGrams: Math.round(food.proteinGrams * quantity),
    carbsGrams: Math.round(food.carbsGrams * quantity),
    fatGrams: Math.round(food.fatGrams * quantity),
  };

  const fitsGoal = profile?.goalType ? food.goalTypes.includes(profile.goalType) : false;

  const add = async () => {
    setSaving(true);
    setNotice(null);
    const payload = {
      ...scaled,
      foodName: food.title,
      serving: food.serving,
      servingUnit: "portion",
      quantity,
      mealType,
      source: "catalog" as const,
      localDate,
      timezone: currentTimezone(),
      clientRequestId: createClientRequestId(),
    };

    try {
      const network = await NetInfo.fetch();
      if (!network.isConnected) {
        await enqueueOutbox({ id: payload.clientRequestId, kind: "foodLog.create", payload });
        setNotice({ message: t("foodDetail.loggedOffline"), tone: "info" });
        setTimeout(() => router.replace("/(app)/(tabs)/today"), 1_000);
        return;
      }
      await createLog(payload);
      router.replace("/(app)/(tabs)/today");
    } catch {
      setNotice({ message: t("foodDetail.logError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const favorite = async () => {
    try {
      await toggleFavorite({ referenceType: "catalog", referenceId: id });
    } catch {
      setNotice({ message: t("foodDetail.favoriteError"), tone: "error" });
    }
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The hero runs under the status bar, so the stack header is replaced by
          the overlaid controls below. */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-6" contentInsetAdjustmentBehavior="never">
        <View className="relative">
          <FoodThumbnail className="h-72 w-full bg-app-surface" imageUrl={food.imageUrl} name={food.title} />
          <SafeAreaView edges={["top"]} style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
            <View className="m-4 flex-row items-center justify-between">
              <Pressable
                accessibilityLabel={t("common.back")}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/foods"))}
                // Heavier than `shadows.floating`: these sit on a photograph,
                // where a white circle needs the extra separation to read.
                style={{ boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)" }}
              >
                <AppIcon name="back" size={22} weight="semibold" />
              </Pressable>
              <Pressable
                accessibilityLabel={food.isFavorite ? t("foodSearch.favoriteRemove") : t("foodSearch.favoriteAdd")}
                accessibilityRole="button"
                accessibilityState={{ selected: food.isFavorite }}
                className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
                onPress={() => void favorite()}
                // Heavier than `shadows.floating`: these sit on a photograph,
                // where a white circle needs the extra separation to read.
                style={{ boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)" }}
              >
                <AppIcon
                  color={food.isFavorite ? colors.danger : colors.text}
                  name={food.isFavorite ? "heart" : "heartOutline"}
                  size={21}
                  weight="semibold"
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* Sheet overlapping the hero. */}
        <View className="-mt-7 gap-5 rounded-t-[28px] bg-white px-5 pt-6" style={{ borderCurve: "continuous" }}>
          <View className="gap-1.5">
            <Text accessibilityRole="header" className="text-[28px] font-bold leading-8.5 tracking-[-0.6px] text-app-text" selectable>
              {food.title}
            </Text>
            <Text className="text-[15px] leading-5.25 text-app-muted" selectable>
              {food.description}
            </Text>
          </View>

          <NutritionBreakdownCard
            {...scaled}
            caption={t("foodDetail.portionSummary", { portions: portionCount.format(quantity), serving: food.serving })}
            footer={
              fitsGoal ? (
                <View className="flex-row items-center gap-2 rounded-2xl bg-app-surface px-3 py-2.5">
                  <AppIcon color={colors.text} name="goal" size={17} weight="semibold" />
                  <Text className="min-w-0 flex-1 text-[13px] font-medium text-app-text" selectable>
                    {t("foodDetail.goalMatch")}
                  </Text>
                </View>
              ) : null
            }
            goalCalories={goal?.calories}
          />

          <View className="gap-4 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous" }}>
            <FieldGroup label={t("foodDetail.selectMeal")}>
              <SegmentedControl
                accessibilityLabel={t("foodDetail.selectMeal")}
                onChange={setMealType}
                options={[
                  { value: "breakfast", label: t("foodCategories.breakfast") },
                  { value: "lunch", label: t("foodCategories.lunch") },
                  { value: "dinner", label: t("foodCategories.dinner") },
                  { value: "snack", label: t("foodCategories.snack") },
                ]}
                value={mealType}
              />
            </FieldGroup>

            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-app-text">{t("foodDetail.portionQuantity")}</Text>
                <Text className="text-[13px] text-app-muted" numberOfLines={1} selectable>
                  {food.serving}
                </Text>
              </View>
              <Stepper
                decreaseLabel={t("foodDetail.decrease")}
                increaseLabel={t("foodDetail.increase")}
                onChange={setQuantity}
                value={quantity}
              />
            </View>
          </View>

          {food.ingredients?.length ? (
            <View className="gap-3">
              <View className="flex-row items-end justify-between gap-3">
                <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-bold text-app-text" selectable>
                  {t("foodDetail.ingredients")}
                </Text>
                <Text className="text-[13px] text-app-muted" numberOfLines={1} selectable>
                  {`${t("foodDetail.servingSize")} · ${food.serving}`}
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {food.ingredients.map((ingredient) => (
                  <IngredientChip key={ingredient} name={ingredient} />
                ))}
              </View>
            </View>
          ) : null}

          {/* The unscaled facts, headed by the food's own name, so the portion
              stepper above never obscures what one serving actually contains. */}
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-xl font-bold text-app-text" selectable>
              {t("foodDetail.nutritionIn", { name: food.title })}
            </Text>
            <View className="overflow-hidden rounded-3xl border border-app-border bg-white" style={{ borderCurve: "continuous" }}>
              <View className="flex-row items-center justify-between gap-3 border-b border-app-border bg-app-surface px-4 py-2.5">
                <Text className="min-w-0 flex-1 text-[13px] font-semibold text-app-muted" numberOfLines={1} selectable>
                  {t("foodDetail.perServing")}
                </Text>
                <Text className="text-[13px] font-medium text-app-muted" numberOfLines={1} selectable>
                  {food.serving}
                </Text>
              </View>
              <FactRow label={t("onboarding.result.calories")} unit={t("dashboard.kcal")} value={number.format(food.calories)} />
              <FactRow label={t("dashboard.protein")} unit="g" value={number.format(food.proteinGrams)} />
              <FactRow label={t("dashboard.carbs")} unit="g" value={number.format(food.carbsGrams)} />
              <FactRow label={t("dashboard.fat")} unit="g" value={number.format(food.fatGrams)} />
            </View>
            <Text className="px-1 text-[12px] leading-4 text-app-muted" selectable>
              {t("foodDetail.estimateNote")}
            </Text>
          </View>

          {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}
        </View>
      </ScrollView>

      {/* Pinned so the add action stays reachable however long the ingredients run. */}
      <View className="border-t border-app-border-soft bg-white px-5 pb-2 pt-3">
        <PrimaryButton
          className="min-h-14 rounded-2xl"
          disabled={saving}
          icon="add"
          label={saving ? t("foodDetail.logging") : t("foodDetail.addToDay")}
          labelClassName="text-[17px]"
          onPress={() => void add()}
        />
      </View>
    </SafeAreaView>
  );
}
