import NetInfo from "@react-native-community/netinfo";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { NutritionSummary } from "@/components/nutrition-summary";
import { PrimaryButton } from "@/components/primary-button";
import { FieldGroup, SegmentedControl, Stepper } from "@/components/ui/form";
import { ScreenTitle, SectionCard } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { Image } from "@/tw/image";
import { Text, View } from "@/tw";
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

/** Catalog food detail, logged through the same validated mutation as everything else. */
function ConfiguredFoodDetail({ id }: { id: Id<"foodCatalog"> }) {
  const { t } = useTranslation();
  const food = useQuery(api.foods.getById, { id, locale: i18n.resolvedLanguage ?? "en" });
  const createLog = useMutation(api.foodLogs.create);

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
    <AppScreen>
      {food.imageUrl ? (
        <Image
          accessibilityLabel={food.title}
          className="h-52 w-full rounded-3xl bg-app-surface"
          contentFit="cover"
          source={{ uri: food.imageUrl }}
          transition={150}
        />
      ) : null}

      <ScreenTitle description={food.description} title={food.title} />

      <NutritionSummary {...scaled} />

      <SectionCard>
        <View className="gap-4">
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
              <Text className="text-sm font-semibold text-app-text">
                {t("foodDetail.portionQuantity")}
              </Text>
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
      </SectionCard>

      {food.ingredients?.length ? (
        <SectionCard>
          <View className="gap-2">
            <Text className="text-base font-bold text-app-text">{t("foodDetail.ingredients")}</Text>
            <Text className="text-sm leading-6 text-app-muted" selectable>
              {food.ingredients.join(" · ")}
            </Text>
          </View>
        </SectionCard>
      ) : null}

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={saving}
        icon="add"
        label={saving ? t("foodDetail.logging") : t("foodDetail.addToDay")}
        onPress={() => void add()}
      />
    </AppScreen>
  );
}
