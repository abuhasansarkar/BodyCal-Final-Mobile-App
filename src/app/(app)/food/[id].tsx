import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import React from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { PrimaryButton } from "@/components/primary-button";
import { FieldGroup, SegmentedControl, Stepper } from "@/components/ui/form";
import { ScreenTitle } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { colors, macroColors } from "@/config/theme";
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

/** One macro column in the nutrition card: icon, scaled value, label. */
function MacroColumn({ color, icon, label, value }: { color: string; icon: AppIconName; label: string; value: number }) {
  return (
    <View accessibilityLabel={`${label} ${value}g`} className="min-w-0 flex-1 items-center gap-1">
      <AppIcon color={color} name={icon} size={20} weight="semibold" />
      <Text className="text-[19px] font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
        {value}g
      </Text>
      <Text className="text-[12px] font-medium text-app-muted" numberOfLines={1} selectable>
        {label}
      </Text>
    </View>
  );
}

/**
 * Catalog food detail, logged through the same validated mutation as everything
 * else.
 *
 * Laid out from the supplied reference: full-bleed hero, a rounded sheet that
 * overlaps it, one nutrition card pairing calories with the macro columns, and a
 * pinned add action.
 *
 * The reference also shows fibre, sodium and sugar cards plus a per-ingredient
 * gram breakdown. `foodCatalog` stores none of those, and inventing them would
 * put fabricated nutrition figures in front of the user, so they are omitted
 * rather than filled with placeholders.
 */
function ConfiguredFoodDetail({ id }: { id: Id<"foodCatalog"> }) {
  const { t, i18n: instance } = useTranslation();
  const food = useQuery(api.foods.getById, { id, locale: i18n.resolvedLanguage ?? "en" });
  const createLog = useMutation(api.foodLogs.create);
  const number = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 0 });

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
      localDate: currentLocalDate(),
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

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The hero runs under the status bar, so the stack header is replaced by
          the overlaid back control below. */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-6" contentInsetAdjustmentBehavior="never">
        <View className="relative">
          <FoodThumbnail className="h-72 w-full bg-app-surface" imageUrl={food.imageUrl} name={food.title} />
          <SafeAreaView edges={["top"]} style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
            <Pressable
              accessibilityLabel={t("common.back")}
              accessibilityRole="button"
              className="m-4 h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/foods"))}
              style={{ boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)" }}
            >
              <AppIcon name="back" size={22} weight="semibold" />
            </Pressable>
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

          <View className="flex-row items-center gap-4 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous", boxShadow: "0 6px 22px rgba(0, 0, 0, 0.045)" }}>
            <View className="min-w-0 shrink gap-0.5">
              <Text className="text-[12px] font-medium text-app-muted" numberOfLines={1} selectable>
                {t("onboarding.result.calories")}
              </Text>
              <View className="flex-row items-baseline gap-1">
                <Text className="text-[30px] font-bold tracking-[-0.8px] text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>
                  {number.format(scaled.calories)}
                </Text>
                <Text className="text-[13px] font-medium text-app-muted">{t("dashboard.kcal")}</Text>
              </View>
            </View>
            <View className="h-12 w-px bg-app-border" />
            <MacroColumn color={macroColors.protein} icon="protein" label={t("dashboard.protein")} value={scaled.proteinGrams} />
            <MacroColumn color={macroColors.carbs} icon="carbs" label={t("dashboard.carbs")} value={scaled.carbsGrams} />
            <MacroColumn color={macroColors.fat} icon="fat" label={t("dashboard.fat")} value={scaled.fatGrams} />
          </View>

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
              <View className="overflow-hidden rounded-3xl border border-app-border bg-white" style={{ borderCurve: "continuous" }}>
                {food.ingredients.map((ingredient, index) => (
                  <View
                    className={index === 0 ? "min-h-14 flex-row items-center gap-3 px-4 py-3" : "min-h-14 flex-row items-center gap-3 border-t border-app-border-soft px-4 py-3"}
                    key={ingredient}
                  >
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-app-surface">
                      <AppIcon color={colors.muted} name="foods" size={17} />
                    </View>
                    <Text className="min-w-0 flex-1 text-[15px] font-medium text-app-text" selectable>
                      {ingredient}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

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
