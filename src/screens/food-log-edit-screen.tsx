import type { Id } from "../../convex/_generated/dataModel";
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
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { InlineNotice } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { api } from "@/lib/convex-api";
import { Pressable, ScrollView, Text, View } from "@/tw";
import type { MealType } from "@/types/domain";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function FoodLogEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  if (!id) {
    return (
      <AppScreen>
        <Text className="text-app-error">{t("foodLogEdit.invalidId")}</Text>
      </AppScreen>
    );
  }

  if (hasBackendConfiguration) {
    return <ConfiguredFoodLogEdit id={id as Id<"foodLogs">} />;
  }

  return (
    <AppScreen>
      <Text className="text-2xl font-bold text-app-text">{t("foodLogEdit.title")}</Text>
      <Text className="text-app-muted">{t("foodLogEdit.configureConvex")}</Text>
    </AppScreen>
  );
}

function ConfiguredFoodLogEdit({ id }: { id: Id<"foodLogs"> }) {
  const { t } = useTranslation();
  const log = useQuery(api.foodLogs.getById, { id });

  if (log === undefined) {
    return (
      <AppScreen>
        <View className="h-72 rounded-3xl bg-app-surface" />
        <View className="h-9 w-48 rounded-xl bg-app-surface" />
        <View className="h-5 w-64 rounded-lg bg-app-surface" />
        <View className="h-44 rounded-3xl bg-app-surface" />
        <View className="h-64 rounded-3xl bg-app-surface" />
      </AppScreen>
    );
  }

  if (log === null) {
    return (
      <AppScreen>
        <Text className="text-app-error">{t("foodLogEdit.notFound")}</Text>
      </AppScreen>
    );
  }

  return <FoodLogEditForm key={log._id} id={id} log={log} />;
}

type FoodLogRecord = {
  _id: Id<"foodLogs">;
  foodName: string;
  serving: string;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealType: string;
  source: "ai" | "manual" | "catalog";
  localDate: string;
  timezone: string;
  createdAt: number;
  clientRequestId: string;
  imageUrl: string | null;
};

/** Reads a numeric field without letting a half-typed value blank the summary. */
function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

type ScanDetailRecord = {
  components: { name: string; portion: string }[];
  confidence: "low" | "medium" | "high" | null;
  saturatedFatGrams: number | null;
  fiberGrams: number | null;
  sugarGrams: number | null;
  sodiumMilligrams: number | null;
  warnings: string[];
};

const confidenceKeys = {
  low: "scan.confidenceLow",
  medium: "scan.confidenceMedium",
  high: "scan.confidenceHigh",
} as const;

/**
 * What the photo estimate found, for an entry that came from a scan.
 *
 * The scan reports far more than the four macros a day total is built from —
 * every component it saw on the plate, saturated fat, fibre, sugar and sodium,
 * how sure it was, and what it could not judge. `foodLogs` stores only the four,
 * so all of this was visible once on the scan result screen and then gone
 * forever the moment the meal was saved. It is read back through the entry's
 * `aiScanId`.
 *
 * A value the model could not judge shows an em dash and announces as "not
 * estimated" — never as a zero, which would be a measurement claim.
 */
function ScanDetail({ scan }: { scan: ScanDetailRecord }) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });

  const measures = [
    { key: "saturatedFat", label: t("scan.saturatedFat"), unit: "g", value: scan.saturatedFatGrams },
    { key: "fiber", label: t("scan.fiber"), unit: "g", value: scan.fiberGrams },
    { key: "sugar", label: t("scan.sugar"), unit: "g", value: scan.sugarGrams },
    { key: "sodium", label: t("scan.sodium"), unit: "mg", value: scan.sodiumMilligrams },
  ];
  const hasMeasures = measures.some((measure) => measure.value !== null);

  if (!scan.components.length && !hasMeasures && !scan.warnings.length) return null;

  return (
    <View className="gap-4">
      <View className="gap-1">
        <Text accessibilityRole="header" className="text-xl font-bold text-app-text" selectable>
          {t("foodLogEdit.scanDetailTitle")}
        </Text>
        {scan.confidence ? (
          <Text className="text-[13px] leading-4.5 text-app-muted" selectable>
            {t(confidenceKeys[scan.confidence])}
          </Text>
        ) : null}
      </View>

      {scan.components.length ? (
        <View className="flex-row flex-wrap gap-2">
          {scan.components.map((component) => (
            <IngredientChip
              detail={component.portion}
              key={`${component.name}-${component.portion}`}
              name={component.name}
            />
          ))}
        </View>
      ) : null}

      {hasMeasures ? (
        <View className="overflow-hidden rounded-3xl border border-app-border bg-white" style={{ borderCurve: "continuous" }}>
          {measures.map((measure) => {
            const known = measure.value !== null;
            const formatted = known
              ? t(measure.unit === "g" ? "scan.gramsValue" : "scan.milligramsValue", {
                  value: number.format(measure.value as number),
                })
              : t("scan.notEstimated");
            return (
              <View
                accessibilityLabel={`${measure.label}: ${formatted}`}
                accessible
                className="min-h-11 flex-row items-center justify-between gap-3 border-b border-app-border-soft px-4 py-2.5 last:border-b-0"
                key={measure.key}
              >
                <Text className="min-w-0 flex-1 text-[15px] text-app-text" selectable>
                  {measure.label}
                </Text>
                <Text
                  className={known ? "text-[15px] font-semibold text-app-text" : "text-[15px] text-app-muted"}
                  selectable
                  style={known ? { fontVariant: ["tabular-nums"] } : undefined}
                >
                  {known ? formatted : "—"}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {scan.warnings.length ? (
        <View className="gap-2 rounded-3xl border border-app-border bg-app-surface p-4" style={{ borderCurve: "continuous" }}>
          <View className="flex-row items-center gap-2">
            <AppIcon color={colors.muted} name="warning" size={17} weight="semibold" />
            <Text className="min-w-0 flex-1 text-sm font-semibold text-app-text" selectable>
              {t("scan.warningsTitle")}
            </Text>
          </View>
          {scan.warnings.map((warning) => (
            <Text className="text-[13px] leading-4.75 text-app-muted" key={warning} selectable>
              {warning}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/**
 * A logged entry, shown the way the catalog food detail shows a food.
 *
 * The two screens describe the same thing at different points in its life, so
 * they share a layout: full-bleed photo, an overlapping sheet, and the same
 * calorie-and-macro card. What differs is that this entry already exists — the
 * numbers are editable, the ring measures it against the target that was active
 * on the day it was logged rather than today's, and the summary tracks the
 * fields live so a correction is visible before it is saved.
 */
function FoodLogEditForm({ id, log }: { id: Id<"foodLogs">; log: FoodLogRecord }) {
  const updateLog = useMutation(api.foodLogs.update);
  const removeLog = useMutation(api.foodLogs.remove);
  const { i18n, t } = useTranslation();

  // The goal that was in force on the entry's own day. Using today's target
  // would silently re-score an old meal against a plan it was never part of.
  const goal = useQuery(api.nutritionGoals.getActive, { localDate: log.localDate });
  // Only an AI entry has a scan behind it; skipping avoids a query that can only
  // ever answer null for the other two sources.
  const scan = useQuery(api.foodLogs.getScanDetail, log.source === "ai" ? { id } : "skip");

  const [foodName, setFoodName] = React.useState(log.foodName);
  const [serving, setServing] = React.useState(log.serving);
  const [quantity, setQuantity] = React.useState(String(log.quantity));
  const [calories, setCalories] = React.useState(String(log.calories));
  const [proteinGrams, setProteinGrams] = React.useState(String(log.proteinGrams));
  const [carbsGrams, setCarbsGrams] = React.useState(String(log.carbsGrams));
  const [fatGrams, setFatGrams] = React.useState(String(log.fatGrams));
  const [mealType, setMealType] = React.useState<MealType>(log.mealType as MealType);

  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loggedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(log.createdAt));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateLog({
        id,
        foodName: foodName.trim() || log.foodName,
        serving: serving.trim() || log.serving,
        servingUnit: log.servingUnit,
        quantity: Math.max(0.1, Number(quantity) || 1),
        calories: Math.max(0, Number(calories) || 0),
        proteinGrams: Math.max(0, Number(proteinGrams) || 0),
        carbsGrams: Math.max(0, Number(carbsGrams) || 0),
        fatGrams: Math.max(0, Number(fatGrams) || 0),
        mealType,
      });
      router.back();
    } catch {
      setError(t("foodLogEdit.updateError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await removeLog({ id });
      router.back();
    } catch {
      setError(t("foodLogEdit.deleteError"));
      setDeleting(false);
    }
  };

  return (
    <SafeAreaView edges={["bottom", "left", "right"]} style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The hero runs under the status bar, so the stack header is replaced by
          the overlaid back control below. */}
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-6" contentInsetAdjustmentBehavior="never">
        <View className="relative">
          {/* The entry's own photo when it has one; a generic meal still otherwise. */}
          <FoodThumbnail className="h-72 w-full bg-app-surface" imageUrl={log.imageUrl} name={foodName} />
          <SafeAreaView edges={["top"]} style={{ position: "absolute", left: 0, right: 0, top: 0 }}>
            <Pressable
              accessibilityLabel={t("common.back")}
              accessibilityRole="button"
              className="m-4 h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/today"))}
              // Heavier than `shadows.floating`: this sits on a photograph,
              // where a white circle needs the extra separation to read.
              style={{ boxShadow: "0 4px 14px rgba(0, 0, 0, 0.18)" }}
            >
              <AppIcon name="back" size={22} weight="semibold" />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Sheet overlapping the hero. */}
        <View className="-mt-7 gap-5 rounded-t-[28px] bg-white px-5 pt-6" style={{ borderCurve: "continuous" }}>
          <View className="gap-1.5">
            <Text
              accessibilityRole="header"
              className="text-[28px] font-bold leading-8.5 tracking-[-0.6px] text-app-text"
              selectable
            >
              {foodName}
            </Text>
            <Text className="text-[15px] leading-5.25 text-app-muted" selectable>
              {t("foodLogEdit.loggedSummary", {
                meal: t(`dashboard.meals.${mealType}`),
                serving: log.serving,
                time: loggedAt,
              })}
            </Text>
          </View>

          <NutritionBreakdownCard
            calories={toNumber(calories)}
            carbsGrams={toNumber(carbsGrams)}
            fatGrams={toNumber(fatGrams)}
            footer={
              <View className="flex-row items-center gap-2 rounded-2xl bg-app-surface px-3 py-2.5">
                <AppIcon
                  color={colors.muted}
                  name={log.source === "ai" ? "motivation" : log.source === "catalog" ? "foods" : "edit"}
                  size={17}
                  weight="semibold"
                />
                <Text className="min-w-0 flex-1 text-[13px] font-medium text-app-muted" selectable>
                  {t(`foodLogEdit.source.${log.source}`)}
                </Text>
              </View>
            }
            goalCalories={goal?.calories}
            proteinGrams={toNumber(proteinGrams)}
          />

          {scan ? <ScanDetail scan={scan} /> : null}

          <View className="gap-4">
            <Text accessibilityRole="header" className="text-xl font-bold text-app-text" selectable>
              {t("foodLogEdit.title")}
            </Text>
            <Text className="-mt-2 text-[13px] leading-4.5 text-app-muted" selectable>
              {t("foodLogEdit.subtitle")}
            </Text>

            <View className="gap-4 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous" }}>
              <Field label={t("foodLogEdit.foodName")} onChangeText={setFoodName} value={foodName} />

              <FieldGroup label={t("foodLogEdit.mealCategory")}>
                <SegmentedControl
                  accessibilityLabel={t("foodLogEdit.mealCategory")}
                  onChange={setMealType}
                  options={mealTypes.map((meal) => ({ value: meal, label: t(`dashboard.meals.${meal}`) }))}
                  value={mealType}
                />
              </FieldGroup>

              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <Field label={t("foodLogEdit.servingDescription")} onChangeText={setServing} value={serving} />
                </View>
                <View className="w-24">
                  <Field
                    keyboardType="decimal-pad"
                    label={t("foodLogEdit.quantity")}
                    onChangeText={setQuantity}
                    value={quantity}
                  />
                </View>
              </View>
            </View>

            <View className="gap-4 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous" }}>
              <Text className="px-1 text-base font-bold text-app-text">{t("foodLogEdit.nutritionSnapshot")}</Text>
              <Field
                keyboardType="number-pad"
                label={t("foodLogEdit.caloriesKcal")}
                onChangeText={setCalories}
                value={calories}
              />
              <View className="flex-row gap-3">
                <View className="min-w-0 flex-1">
                  <Field
                    keyboardType="number-pad"
                    label={t("foodLogEdit.proteinG")}
                    onChangeText={setProteinGrams}
                    value={proteinGrams}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Field
                    keyboardType="number-pad"
                    label={t("foodLogEdit.carbsG")}
                    onChangeText={setCarbsGrams}
                    value={carbsGrams}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Field
                    keyboardType="number-pad"
                    label={t("foodLogEdit.fatG")}
                    onChangeText={setFatGrams}
                    value={fatGrams}
                  />
                </View>
              </View>
            </View>
          </View>

          {error ? <InlineNotice message={error} tone="error" /> : null}

          <Pressable
            accessibilityRole="button"
            className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-app-error-surface px-4 active:opacity-80"
            disabled={deleting || saving}
            onPress={() => void handleDelete()}
          >
            <AppIcon color={colors.danger} name="delete" size={20} />
            <Text className="text-base font-semibold text-app-error">
              {deleting ? t("foodLogEdit.deleting") : t("foodLogEdit.deleteMealLog")}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Pinned so saving a correction never means scrolling past the fields. */}
      <View className="border-t border-app-border-soft bg-white px-5 pb-2 pt-3">
        <PrimaryButton
          className="min-h-14 rounded-2xl"
          disabled={saving || deleting}
          icon="check"
          label={saving ? t("foodLogEdit.saving") : t("foodLogEdit.saveChanges")}
          labelClassName="text-[17px]"
          onPress={() => void handleSave()}
        />
      </View>
    </SafeAreaView>
  );
}
