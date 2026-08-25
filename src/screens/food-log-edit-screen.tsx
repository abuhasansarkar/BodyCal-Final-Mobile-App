import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { IngredientChip } from "@/components/ingredient-chip";
import { NutritionBreakdownCard } from "@/components/nutrition-breakdown-card";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenErrorBoundary } from "@/components/screen-error-boundary";
import { Field, FieldGroup, SegmentedControl } from "@/components/ui/form";
import { InlineNotice } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { useRelogMeal } from "@/features/food/use-relog-meal";
import { api } from "@/lib/convex-api";
import { Pressable, ScrollView, Text, View } from "@/tw";
import type { MealType } from "@/types/domain";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

/**
 * Heavier than `shadows.floating`. These controls sit on a meal photograph,
 * where a white circle needs the extra separation to stay legible against
 * whatever the picture happens to be.
 */
const HERO_CONTROL_SHADOW = "0 4px 14px rgba(0, 0, 0, 0.18)";

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
    /*
      A Convex `useQuery` throws on the render that observes a server error. With
      no boundary here that reached `FatalErrorBoundary` and replaced the whole
      app with a restart prompt — for one entry that failed to load.
    */
    return (
      <ScreenErrorBoundary scope="foodLog">
        <ConfiguredFoodLogEdit id={id as Id<"foodLogs">} />
      </ScreenErrorBoundary>
    );
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
  /*
    Separate from `error`: a re-log confirmation is not a failure, and the two
    must not overwrite one another. `InlineNotice` announces politely either way.
  */
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "success" } | null>(null);
  const { pendingId, relog } = useRelogMeal();
  /*
    Editing happens in a sheet rather than inline. The screen's job is to show
    what was logged; the form is a deliberate second step, which also stops a
    stray tap on a number field from silently altering a saved entry.
  */
  const [editing, setEditing] = React.useState(false);

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
      // Close the sheet rather than the screen. The correction is what the user
      // came to check, so returning them to the entry — now showing the saved
      // numbers — is the answer to "did that work?".
      setEditing(false);
    } catch {
      setError(t("foodLogEdit.updateError"));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Closes the sheet and puts every field back the way it was saved.
   *
   * The summary card behind the sheet reads the same state the fields write, so
   * it updates as you type — which is the point, you see the correction before
   * committing it. Dismissing without saving therefore has to restore the stored
   * values, or the entry would go on displaying numbers that were never written.
   */
  const handleCancelEdit = () => {
    if (saving) return;
    setFoodName(log.foodName);
    setServing(log.serving);
    setQuantity(String(log.quantity));
    setCalories(String(log.calories));
    setProteinGrams(String(log.proteinGrams));
    setCarbsGrams(String(log.carbsGrams));
    setFatGrams(String(log.fatGrams));
    setMealType(log.mealType as MealType);
    setError(null);
    setEditing(false);
  };

  /**
   * Logs this meal against today again, without leaving the entry.
   *
   * Shares `useRelogMeal` with the Foods tab, so the offline queue, the
   * double-tap guard and the fields copied are the same in both places rather
   * than two implementations that drift.
   */
  const handleRelog = async () => {
    setError(null);
    setNotice(null);
    const outcome = await relog(log._id, {
      calories: toNumber(calories),
      carbsGrams: toNumber(carbsGrams),
      fatGrams: toNumber(fatGrams),
      foodName: foodName.trim() || log.foodName,
      mealType,
      proteinGrams: toNumber(proteinGrams),
      quantity: Math.max(0.1, Number(quantity) || 1),
      serving: serving.trim() || log.serving,
      servingUnit: log.servingUnit,
      source: log.source,
    });
    if (outcome === "logged") setNotice({ message: t("foodSearch.relogged"), tone: "success" });
    else if (outcome === "queued") setNotice({ message: t("foodSearch.reloggedOffline"), tone: "info" });
    else setError(t("foodSearch.relogError"));
  };

  /**
   * Confirms before deleting, because the entry cannot be recovered.
   *
   * A native alert rather than a bespoke dialog: it is the platform's own
   * destructive confirmation, so it inherits VoiceOver, Dynamic Type and the
   * iOS destructive styling, and it invents no dialog design of its own. The
   * cancel option is the default, so an accidental tap resolves to "no".
   */
  const confirmDelete = () => {
    if (deleting || saving) return;
    Alert.alert(
      t("foodLogEdit.deleteConfirmTitle"),
      t("foodLogEdit.deleteConfirmBody"),
      [
        // Named for what they do. "Yes"/"No" forces the reader back to the title
        // to work out which one deletes; the destructive button says "Delete".
        { text: t("common.cancel"), style: "cancel" },
        { text: t("common.delete"), style: "destructive", onPress: () => void handleDelete() },
      ],
      { cancelable: true },
    );
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await removeLog({ id });
      // Deep links and notification taps can land here with nothing behind them,
      // where `back()` is a no-op and leaves the user on a deleted entry.
      if (router.canGoBack()) router.back();
      else router.replace("/(app)/(tabs)/today");
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
            {/*
              Back on the left, edit and delete opposite it. All three sit on the
              photograph, so each carries the heavier shadow a white circle needs
              to read against an unpredictable image, and each is a 44pt target.
            */}
            <View className="m-4 flex-row items-center justify-between">
              <Pressable
                accessibilityLabel={t("common.back")}
                accessibilityRole="button"
                className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/today"))}
                style={{ boxShadow: HERO_CONTROL_SHADOW }}
              >
                <AppIcon name="back" size={22} weight="semibold" />
              </Pressable>

              <View className="flex-row items-center gap-2.5">
                <Pressable
                  accessibilityLabel={t("foodLogEdit.title")}
                  accessibilityRole="button"
                  className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
                  disabled={deleting}
                  onPress={() => setEditing(true)}
                  style={{ boxShadow: HERO_CONTROL_SHADOW }}
                >
                  <AppIcon name="edit" size={20} weight="semibold" />
                </Pressable>

                <Pressable
                  accessibilityLabel={t("foodLogEdit.deleteMealLog")}
                  accessibilityRole="button"
                  accessibilityState={{ busy: deleting, disabled: deleting }}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white active:opacity-80"
                  disabled={deleting}
                  onPress={confirmDelete}
                  style={{ boxShadow: HERO_CONTROL_SHADOW }}
                >
                  {/* The row leaves the screen on success, so the only feedback
                      that matters is that the tap registered. */}
                  {deleting ? (
                    <ActivityIndicator color={colors.danger} size="small" />
                  ) : (
                    <AppIcon color={colors.danger} name="delete" size={20} weight="semibold" />
                  )}
                </Pressable>
              </View>
            </View>
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

          {/* Errors from a delete or a re-log surface here; the sheet shows its own. */}
          {error && !editing ? <InlineNotice message={error} tone="error" /> : null}
          {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}
        </View>
      </ScrollView>

      {/*
        The screen's primary action. It had none: the entry could be corrected or
        deleted from the hero, but eating the same thing again — the single most
        repeated thing a food log is asked to do — meant going back to the tab.
      */}
      <View className="border-t border-app-border-soft bg-white px-5 pb-2 pt-3">
        <PrimaryButton
          className="min-h-14 rounded-2xl"
          disabled={pendingId !== null || deleting}
          icon="add"
          label={pendingId !== null ? t("foodSearch.loggingAgain") : t("foodSearch.logAgainLabel")}
          labelClassName="text-[17px]"
          onPress={() => void handleRelog()}
        />
      </View>

      <EditEntrySheet
        calories={calories}
        carbsGrams={carbsGrams}
        error={editing ? error : null}
        fatGrams={fatGrams}
        foodName={foodName}
        mealType={mealType}
        onChangeCalories={setCalories}
        onChangeCarbs={setCarbsGrams}
        onChangeFat={setFatGrams}
        onChangeFoodName={setFoodName}
        onChangeMealType={setMealType}
        onChangeProtein={setProteinGrams}
        onChangeQuantity={setQuantity}
        onChangeServing={setServing}
        onClose={handleCancelEdit}
        onSave={() => void handleSave()}
        proteinGrams={proteinGrams}
        quantity={quantity}
        saving={saving}
        serving={serving}
        visible={editing}
      />
    </SafeAreaView>
  );
}

type EditSheetProps = {
  calories: string;
  carbsGrams: string;
  error: string | null;
  fatGrams: string;
  foodName: string;
  mealType: MealType;
  onChangeCalories: (value: string) => void;
  onChangeCarbs: (value: string) => void;
  onChangeFat: (value: string) => void;
  onChangeFoodName: (value: string) => void;
  onChangeMealType: (value: MealType) => void;
  onChangeProtein: (value: string) => void;
  onChangeQuantity: (value: string) => void;
  onChangeServing: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  proteinGrams: string;
  quantity: string;
  saving: boolean;
  serving: string;
  visible: boolean;
};

/**
 * The correction form, as a sheet over the entry.
 *
 * `pageSheet` gives the platform's own presentation — the iOS card with its
 * swipe-to-dismiss, a full-screen modal on Android — rather than a dialog drawn
 * by hand. `onRequestClose` covers the Android back button and the iOS swipe, so
 * every route out of the sheet lands in the same place as Cancel.
 */
function EditEntrySheet(props: EditSheetProps) {
  const { t } = useTranslation();

  return (
    <Modal
      animationType="slide"
      onRequestClose={props.onClose}
      presentationStyle="pageSheet"
      transparent={false}
      visible={props.visible}
    >
      <SafeAreaView edges={["bottom", "left", "right", "top"]} style={{ flex: 1, backgroundColor: colors.background }}>
        <View className="flex-row items-center justify-between gap-3 border-b border-app-border-soft px-5 pb-3 pt-1">
          <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-bold text-app-text" selectable>
            {t("foodLogEdit.title")}
          </Text>
          <Pressable
            accessibilityLabel={t("common.close")}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full active:bg-app-surface"
            disabled={props.saving}
            onPress={props.onClose}
          >
            <AppIcon name="close" size={21} weight="semibold" />
          </Pressable>
        </View>

        <ScrollView
          className="flex-1 bg-white"
          contentContainerClassName="gap-5 px-5 pb-6 pt-5"
          keyboardShouldPersistTaps="handled"
        >
          <Text className="text-[13px] leading-4.5 text-app-muted" selectable>
            {t("foodLogEdit.subtitle")}
          </Text>

          <View className="gap-4 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous" }}>
            <Field label={t("foodLogEdit.foodName")} onChangeText={props.onChangeFoodName} value={props.foodName} />

            <FieldGroup label={t("foodLogEdit.mealCategory")}>
              <SegmentedControl
                accessibilityLabel={t("foodLogEdit.mealCategory")}
                onChange={props.onChangeMealType}
                options={mealTypes.map((meal) => ({ value: meal, label: t(`dashboard.meals.${meal}`) }))}
                value={props.mealType}
              />
            </FieldGroup>

            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Field
                  label={t("foodLogEdit.servingDescription")}
                  onChangeText={props.onChangeServing}
                  value={props.serving}
                />
              </View>
              <View className="w-24">
                <Field
                  keyboardType="decimal-pad"
                  label={t("foodLogEdit.quantity")}
                  onChangeText={props.onChangeQuantity}
                  value={props.quantity}
                />
              </View>
            </View>
          </View>

          <View className="gap-4 rounded-3xl border border-app-border bg-white p-4" style={{ borderCurve: "continuous" }}>
            <Text className="px-1 text-base font-bold text-app-text">{t("foodLogEdit.nutritionSnapshot")}</Text>
            <Field
              keyboardType="number-pad"
              label={t("foodLogEdit.caloriesKcal")}
              onChangeText={props.onChangeCalories}
              value={props.calories}
            />
            <View className="flex-row gap-3">
              <View className="min-w-0 flex-1">
                <Field
                  keyboardType="number-pad"
                  label={t("foodLogEdit.proteinG")}
                  onChangeText={props.onChangeProtein}
                  value={props.proteinGrams}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Field
                  keyboardType="number-pad"
                  label={t("foodLogEdit.carbsG")}
                  onChangeText={props.onChangeCarbs}
                  value={props.carbsGrams}
                />
              </View>
              <View className="min-w-0 flex-1">
                <Field
                  keyboardType="number-pad"
                  label={t("foodLogEdit.fatG")}
                  onChangeText={props.onChangeFat}
                  value={props.fatGrams}
                />
              </View>
            </View>
          </View>

          {props.error ? <InlineNotice message={props.error} tone="error" /> : null}
        </ScrollView>

        {/* Pinned so saving never means scrolling past the fields. */}
        <View className="border-t border-app-border-soft bg-white px-5 pb-2 pt-3">
          <PrimaryButton
            className="min-h-14 rounded-2xl"
            disabled={props.saving}
            icon="check"
            label={props.saving ? t("foodLogEdit.saving") : t("foodLogEdit.saveChanges")}
            labelClassName="text-[17px]"
            onPress={props.onSave}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
