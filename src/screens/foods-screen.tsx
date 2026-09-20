import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { FoodResultRow } from "@/components/food-result-row";
import { FoodThumbnail } from "@/components/food-thumbnail";
import { ScreenErrorBoundary } from "@/components/screen-error-boundary";
import { SectionHeader } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors, macroColors, shadows } from "@/config/theme";
import {
  type CategoryFilter,
  filterLoggedFoods,
  filterSavedFoods,
} from "@/features/food/food-filter";
import { useRelogMeal } from "@/features/food/use-relog-meal";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "@/tw";
import type { GoalType, MealType } from "@/types/domain";

const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

/** Meals fetched per page, and the ceiling the server will serve. */
const PAGE_SIZE = 30;
const MAX_MEALS = 150;
/** Below this the catalog search is noise rather than help. */
const MIN_CATALOG_QUERY = 2;
/** Keystroke settling time before the catalog search index is queried. */
const SEARCH_DEBOUNCE_MS = 250;
/** How long a "logged again" confirmation stays on screen. */
const NOTICE_TIMEOUT_MS = 5_000;

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

type Notice = { message: string; tone: "info" | "error" | "success" };

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
  return (
    <ScreenErrorBoundary scope="foods">
      <ConfiguredFoodsScreen />
    </ScreenErrorBoundary>
  );
}

/**
 * Debounced mirror of a value.
 *
 * The text field stays instant — a laggy search box feels broken — while the
 * Convex search index is only asked about a query the user has stopped typing.
 */
function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, value]);
  return settled;
}

function ConfiguredFoodsScreen() {
  const { t } = useTranslation();
  const locale = i18n.resolvedLanguage ?? "en";

  const [searchQuery, setSearchQuery] = React.useState("");
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const [notice, setNotice] = React.useState<Notice | null>(null);

  const debouncedQuery = useDebounced(searchQuery, SEARCH_DEBOUNCE_MS);
  const trimmedQuery = searchQuery.trim();
  const searching = trimmedQuery.length > 0;
  const catalogTerm = debouncedQuery.trim();

  const profile = useQuery(api.profiles.getCurrent, {});
  const streak = useQuery(api.dashboard.getLoggingStreak, { todayLocalDate: currentLocalDate() });
  const userScannedFoods = useQuery(api.foods.getMyScannedAndLoggedFoods, { limit });
  /*
    Only subscribed once the user is actually searching. The saved-food library
    is a search result here, not part of the resting screen, so a user who never
    types never pays for the read — and gating on the debounced term rather than
    the raw one keeps a keystroke from subscribing and unsubscribing repeatedly.
  */
  const savedFoods = useQuery(api.foods.listCustomFoods, catalogTerm ? {} : "skip");
  /*
    The catalog is only consulted while the user is actually searching. Rendering
    it unprompted would restore the goal-suggestion section that was removed from
    this screen on request; searching for a food the user has never logged is a
    different question, and before this it had no answer at all — the box only
    ever filtered the handful of entries already on screen.
  */
  const catalogResults = useQuery(
    api.foods.searchCatalog,
    catalogTerm.length >= MIN_CATALOG_QUERY
      ? {
          query: catalogTerm,
          locale,
          mealType: category === "all" ? undefined : category,
          limit: 12,
        }
      : "skip",
  );
  const toggleFavorite = useMutation(api.foods.toggleFavorite);
  const { pendingId: reloggingId, relog } = useRelogMeal();

  const goal: GoalType = profile?.goalType ?? "maintain";

  const visibleUserFoods = React.useMemo(
    () =>
      userScannedFoods
        ? filterLoggedFoods(userScannedFoods, { category, query: trimmedQuery })
        : undefined,
    [category, trimmedQuery, userScannedFoods],
  );

  const visibleSavedFoods = React.useMemo(
    () => (savedFoods ? filterSavedFoods(savedFoods, trimmedQuery) : []),
    [savedFoods, trimmedQuery],
  );

  /** A confirmation clears itself; an error stays until the next attempt. */
  const noticeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  const showNotice = React.useCallback((next: Notice) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(next);
    if (next.tone !== "error") {
      noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_TIMEOUT_MS);
    }
  }, []);

  const headline = t(`foodHeadline.${goal}`);

  /**
   * One distinct icon per chip. `all` and `lunch` both used `foods`, and `snack`
   * used the hydration water-drop, so three of the five chips read as the wrong
   * category at a glance. `design/foods.png` has no Shakes chip equivalent here:
   * `MealType` is breakfast/lunch/dinner/snack, so a Shakes filter would match
   * nothing until the meal-type union gains a member.
   */
  const categories: { icon: AppIconName; key: CategoryFilter; label: string }[] = [
    { key: "all", icon: "foods", label: t("foodCategories.all") },
    { key: "breakfast", icon: "light", label: t("foodCategories.breakfast") },
    { key: "lunch", icon: "ingredientMeat", label: t("foodCategories.lunch") },
    { key: "dinner", icon: "ingredientFish", label: t("foodCategories.dinner") },
    { key: "snack", icon: "ingredientFruit", label: t("foodCategories.snack") },
  ];

  /**
   * Logs the same meal against today.
   *
   * The screen stays put on success. "Log again" is an action people repeat, and
   * being thrown onto Today after each one made logging three things three round
   * trips; a confirmation with a link there is enough.
   */
  const handleRelog = async (item: UserScannedFood) => {
    const outcome = await relog(item._id, item);
    if (outcome === "logged") showNotice({ message: t("foodSearch.relogged"), tone: "success" });
    else if (outcome === "queued") showNotice({ message: t("foodSearch.reloggedOffline"), tone: "info" });
    else showNotice({ message: t("foodSearch.relogError"), tone: "error" });
  };

  const loading = visibleUserFoods === undefined;
  const totalLogged = userScannedFoods?.length ?? 0;
  const canLoadMore = totalLogged === limit && limit < MAX_MEALS;
  /*
    True between the last keystroke and the debounced query reaching Convex.
    Without it "No matches" flashed on every word typed: the local lists filter
    instantly while the catalog is still a quarter of a second behind, so the
    screen briefly had nothing to show and said so.
  */
  const searchSettling = searching && trimmedQuery !== catalogTerm;
  const catalogLoading =
    searchSettling || (catalogTerm.length >= MIN_CATALOG_QUERY && catalogResults === undefined);
  const noResultsAnywhere =
    searching &&
    !loading &&
    visibleUserFoods.length === 0 &&
    visibleSavedFoods.length === 0 &&
    !catalogLoading &&
    (catalogResults?.length ?? 0) === 0;

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/* Top Header — logo + wordmark lockup and streak badge, per `design/foods.png`. */}
      <View className="min-h-14 flex-row items-center justify-between gap-3">
        <View accessibilityLabel="BodyCal" accessibilityRole="header" className="min-w-0 flex-row items-center gap-2">
          <Image className="h-12 w-12" contentFit="contain" source={brandLogo} />
          <Text className="text-2xl font-bold tracking-[-0.4px] text-app-text">BodyCal</Text>
        </View>

        {/*
          `accessible` is what makes the composed label replace the icon and the
          bare number. Without it VoiceOver read the badge as an unlabelled
          image followed by "3", which says nothing about a streak.
        */}
        <View
          accessible
          accessibilityLabel={t("dashboard.streakLabel", { count: streak ?? 0 })}
          className="min-h-11 flex-row items-center gap-1.5 rounded-2xl border border-app-border bg-white px-3 py-1"
          style={{ borderCurve: "continuous", boxShadow: shadows.floating }}
        >
          <AppIcon color={macroColors.calories} name="calories" size={18} weight="semibold" />
          <Text className="text-sm font-bold text-app-text" style={{ fontVariant: ["tabular-nums"] }}>
            {streak ?? 0}
          </Text>
          <Text className="max-w-20 text-[11px] font-medium leading-3.5 text-app-muted">
            {t("foodSearch.dayStreak")}
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
          autoCapitalize="none"
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

      {/*
        Category Pills.

        The row bleeds through `AppScreen`'s `px-5` with a matching negative
        margin so a pill scrolled to either end sits flush with the screen edge
        instead of being sliced mid-capsule by the parent padding.
      */}
      <View accessibilityRole="radiogroup">
        <ScrollView
          className="-mx-5"
          contentContainerClassName="flex-row gap-2 px-5 py-1"
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
                <Text className={active ? "text-sm font-bold text-white" : "text-sm font-semibold text-app-text"}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Screen Title and its supporting copy. */}
      <View className="gap-1.5">
        <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.4px] text-app-text">
          {searching ? t("foodSearch.searchResultsTitle") : headline}
        </Text>
        <Text className="text-[15px] leading-5.5 text-app-muted">
          {searching ? t("foodSearch.searchResultsDescription") : t(`foodHeadline.${goal}Support`)}
        </Text>
      </View>

      {notice ? (
        <View className="gap-2">
          <InlineNotice message={notice.message} tone={notice.tone === "success" ? "success" : notice.tone} />
          {notice.tone === "success" ? (
            <Pressable
              accessibilityRole="button"
              className="min-h-11 flex-row items-center gap-1.5 self-start rounded-2xl px-1"
              onPress={() => router.navigate("/(app)/(tabs)/today")}
            >
              <Text className="text-sm font-semibold text-app-accent">{t("foodSearch.viewToday")}</Text>
              <AppIcon color={colors.accent} name="chevronRight" size={15} weight="semibold" />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/*
        The user's own scanned & logged meals.

        `undefined` means the query has not resolved yet, which is distinct from a
        resolved empty list, so the skeleton must not be conflated with the empty
        state.
      */}
      {loading ? (
        <ScreenSkeleton lines={3} />
      ) : visibleUserFoods.length > 0 ? (
        <View className="gap-3">
          <SectionHeader
            action={
              <Pressable
                accessibilityRole="button"
                className="min-h-11 flex-row items-center gap-1 pl-2"
                onPress={() => router.push("/(app)/history")}
              >
                <Text className="text-xs font-semibold text-app-accent">{t("foodSearch.viewAll")}</Text>
                <AppIcon color={colors.accent} name="chevronRight" size={14} weight="semibold" />
              </Pressable>
            }
            description={t("foodSearch.mealCount", { count: visibleUserFoods.length })}
            title={t("foodSearch.scannedSectionAll")}
          />

          <View className="gap-3">
            {visibleUserFoods.map((item) => (
              <UserScannedFoodCard
                isRelogging={reloggingId === item._id}
                item={item}
                key={item._id}
                onOpen={() =>
                  router.push({ pathname: "/(app)/food/log/[id]", params: { id: item._id } })
                }
                onRelog={() => void handleRelog(item)}
                relogDisabled={reloggingId !== null}
              />
            ))}
          </View>

          {canLoadMore ? (
            <View className="gap-2 pt-1">
              {/* Never truncate silently: say what is on screen and where the rest lives. */}
              <Text className="px-1 text-center text-xs leading-4 text-app-muted">
                {t("foodSearch.loadMoreNote", { total: totalLogged })}
              </Text>
              <Pressable
                accessibilityRole="button"
                className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-5 active:bg-app-surface"
                onPress={() => setLimit((current) => Math.min(MAX_MEALS, current + PAGE_SIZE))}
                style={{ borderCurve: "continuous" }}
              >
                <AppIcon color={colors.text} name="history" size={17} weight="semibold" />
                <Text className="text-sm font-semibold text-app-text">{t("foodSearch.loadMore")}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : searching ? null : category !== "all" && totalLogged > 0 ? (
        /*
          A filter that matches nothing is not an empty library. Offering "scan a
          meal" here answered a question the user had not asked; clearing the
          chip is what they actually want.
        */
        <EmptyState
          action={t("foodSearch.emptyCategoryAction")}
          actionIcon="foods"
          description={t("foodSearch.emptyCategoryDescription")}
          icon="foods"
          onAction={() => setCategory("all")}
          title={t("foodSearch.emptyCategoryTitle", {
            category: t(`foodCategories.${category}`),
          })}
        />
      ) : (
        <EmptyState
          action={t("foodSearch.emptyScannedAction")}
          actionIcon="camera"
          description={t("foodSearch.emptyScannedDescription")}
          icon="camera"
          onAction={() => router.push("/(app)/scan/camera")}
          title={t("foodSearch.emptyScannedTitle")}
        />
      )}

      {/* Saved custom foods matching the query. Hidden entirely when not searching. */}
      {visibleSavedFoods.length > 0 ? (
        <View className="gap-3">
          <SectionHeader
            action={
              <Text className="text-xs font-medium text-app-muted">
                {t("foodSearch.resultCount", { count: visibleSavedFoods.length })}
              </Text>
            }
            title={t("foodSearch.librarySection")}
          />
          <View className="gap-2">
            {visibleSavedFoods.map((food) => (
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

      {/* Catalog matches. The only route by which `/(app)/food/[id]` is reachable. */}
      {catalogLoading ? (
        <ScreenSkeleton lines={2} />
      ) : catalogResults && catalogResults.length > 0 ? (
        <View className="gap-3">
          <SectionHeader
            action={
              <Text className="text-xs font-medium text-app-muted">
                {t("foodSearch.resultCount", { count: catalogResults.length })}
              </Text>
            }
            title={t("foodSearch.librarySearchSection")}
          />
          <View className="gap-2">
            {catalogResults.map((food) => (
              <FoodResultRow
                calories={food.calories}
                key={food._id}
                onPress={() => router.push({ pathname: "/(app)/food/[id]", params: { id: food._id } })}
                serving={food.serving}
                title={food.title}
                trailing={
                  <FavoriteToggle
                    isFavorite={food.isFavorite}
                    onToggle={() =>
                      void toggleFavorite({ referenceType: "catalog", referenceId: food._id }).catch(
                        () => showNotice({ message: t("foodDetail.favoriteError"), tone: "error" }),
                      )
                    }
                  />
                }
              />
            ))}
          </View>
        </View>
      ) : null}

      {noResultsAnywhere ? (
        <EmptyState
          action={t("foodSearch.addManually")}
          description={t("foodSearch.emptyDescription")}
          icon="search"
          onAction={() => router.push("/(app)/food/manual")}
          title={t("foodSearch.emptyTitle")}
        />
      ) : null}

      {/* Footer actions */}
      <View className="items-center gap-3 pb-6 pt-3">
        <Text className="text-center text-xs text-app-muted" selectable>
          {t("nutritionTargets.estimateNote")}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-12 w-full flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-5 active:bg-app-surface shadow-xs"
          onPress={() => router.push("/(app)/food/manual")}
        >
          <AppIcon color={colors.text} name="add" size={19} weight="semibold" />
          <Text className="text-sm font-semibold text-app-text">{t("foodSearch.addManually")}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          className="min-h-11 flex-row items-center justify-center gap-1.5 px-4"
          onPress={() => router.push("/(app)/food/search")}
        >
          <Text className="text-sm font-semibold text-app-accent">{t("foodSearch.browseLibrary")}</Text>
          <AppIcon color={colors.accent} name="chevronRight" size={15} weight="semibold" />
        </Pressable>
      </View>
    </AppScreen>
  );
}

function FavoriteToggle({ isFavorite, onToggle }: { isFavorite: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityLabel={isFavorite ? t("foodSearch.favoriteRemove") : t("foodSearch.favoriteAdd")}
      accessibilityRole="button"
      accessibilityState={{ selected: isFavorite }}
      className="h-11 w-11 items-center justify-center rounded-full active:bg-app-surface"
      hitSlop={6}
      onPress={onToggle}
    >
      <AppIcon color={isFavorite ? colors.danger : colors.muted} name={isFavorite ? "heart" : "heartOutline"} size={20} />
    </Pressable>
  );
}

/**
 * Card for a meal the user actually logged.
 *
 * The whole card opens the entry. It previously opened nothing at all: the
 * detail screen at `/(app)/food/log/[id]` existed and was reachable from Today
 * and from History, but the tab dedicated to the user's meals had no route to
 * it, so from here a logged meal could not be corrected or deleted.
 */
function UserScannedFoodCard({
  isRelogging,
  item,
  onOpen,
  onRelog,
  relogDisabled,
}: {
  isRelogging: boolean;
  item: UserScannedFood;
  onOpen: () => void;
  onRelog: () => void;
  relogDisabled: boolean;
}) {
  const { i18n: instance, t } = useTranslation();
  const number = new Intl.NumberFormat(instance.resolvedLanguage, { maximumFractionDigits: 0 });

  /**
   * `localDate` is a stored local `YYYY-MM-DD` day key, not an instant. Reading
   * it through `Intl` keeps the card from printing the raw ISO key, and the
   * explicit midnight keeps `Date` from parsing the bare date as UTC and drifting
   * a day backwards for users behind Greenwich.
   */
  const loggedOn = new Date(`${item.localDate}T00:00:00`);
  const loggedLabel = Number.isNaN(loggedOn.getTime())
    ? item.localDate
    : new Intl.DateTimeFormat(instance.resolvedLanguage, { day: "numeric", month: "short" }).format(loggedOn);

  const calorieLabel = t("dashboard.logCalories", { calories: number.format(item.calories) });
  const mealLabel = t(`dashboard.meals.${item.mealType}`);

  return (
    <Pressable
      accessibilityHint={t("foodSearch.openMealHint")}
      accessibilityLabel={t("foodSearch.cardLabel", {
        calories: calorieLabel,
        date: loggedLabel,
        meal: mealLabel,
        name: item.foodName,
      })}
      accessibilityRole="button"
      className="overflow-hidden rounded-3xl border border-app-border bg-white active:bg-app-surface"
      onPress={onOpen}
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="flex-row items-stretch">
        {/*
          `self-stretch` rather than a fixed height: the row is `items-stretch`,
          but an explicit `h-38` overrode that and left a white gap beside the
          macro row whenever the text column grew past 152pt — which a two-line
          meal name always does.
        */}
        <FoodThumbnail className="w-32 self-stretch bg-app-surface" imageUrl={item.imageUrl} name={item.foodName} />

        <View className="min-w-0 flex-1 justify-between gap-1.5 p-3.5">
          <View className="gap-1">
            <View className="flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-row items-center gap-1.5">
                <View className={`rounded-full px-2 py-0.5 ${item.source === "ai" ? "bg-emerald-100" : "bg-blue-100"}`}>
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      item.source === "ai" ? "text-emerald-800" : "text-blue-800"
                    }`}
                    numberOfLines={1}
                  >
                    {item.source === "ai" ? t("foodSearch.badgeAi") : t("foodSearch.badgeLogged")}
                  </Text>
                </View>
                {/* Which meal it was filed under — the chips filter on it, so the
                    card has to say it or a filtered list looks arbitrary. */}
                <Text className="min-w-0 shrink text-[10px] font-semibold uppercase tracking-wider text-app-muted" numberOfLines={1}>
                  {mealLabel}
                </Text>
              </View>
              <Text className="shrink-0 text-[11px] font-medium text-app-muted">{loggedLabel}</Text>
            </View>

            <Text className="text-base font-bold text-app-text" numberOfLines={2}>
              {item.foodName}
            </Text>
            <Text className="text-xs text-app-muted" numberOfLines={1}>
              {item.serving}
            </Text>
          </View>

          <View className="gap-1.5">
            <View className="flex-row items-center justify-between gap-2">
              <View className="min-w-0 flex-row items-center gap-1">
                <AppIcon color={macroColors.calories} name="calories" size={14} weight="semibold" />
                <Text className="text-sm font-bold text-app-text" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
                  {calorieLabel}
                </Text>
              </View>

              {/*
                Nested inside the card's own press target on purpose: the inner
                pressable wins the touch, so "log again" does not also open the
                entry. Every re-log button is disabled while any one of them is
                in flight, so a double tap cannot produce two entries.
              */}
              <Pressable
                accessibilityLabel={t("foodSearch.logAgainLabel")}
                accessibilityRole="button"
                accessibilityState={{ busy: isRelogging, disabled: relogDisabled }}
                className="min-h-9 shrink-0 flex-row items-center gap-1 rounded-xl bg-app-surface px-2.5 py-1 active:bg-app-border"
                disabled={relogDisabled}
                hitSlop={4}
                onPress={onRelog}
              >
                <AppIcon color={relogDisabled ? colors.subtle : colors.text} name="add" size={13} weight="semibold" />
                <Text className={relogDisabled ? "text-[11px] font-bold text-app-subtle" : "text-[11px] font-bold text-app-text"}>
                  {isRelogging ? t("foodSearch.loggingAgain") : t("foodSearch.logAgain")}
                </Text>
              </Pressable>
            </View>

            <View className="h-px bg-app-border-soft" />

            <View className="flex-row items-center">
              <MacroStat color={macroColors.protein} label={t("nutritionBreakdown.protein")} value={item.proteinGrams} />
              <View className="h-6 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.carbs} label={t("nutritionBreakdown.carbs")} value={item.carbsGrams} />
              <View className="h-6 w-px bg-app-border-soft" />
              <MacroStat color={macroColors.fat} label={t("nutritionBreakdown.fat")} value={item.fatGrams} />
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

/**
 * Coloured macro value over a muted label.
 *
 * The label wraps to a second line rather than truncating: German
 * "Kohlenhydrate" and Portuguese "Carboidratos" do not fit one third of a card
 * at this size, and a clipped "Kohlenhydr…" reads worse than two short lines.
 *
 * `accessible` is required for the composed label to be used: a plain `View`
 * with `accessibilityLabel` and no `accessible` is not an accessibility element,
 * so the label was silently dropped and the two texts were read separately.
 */
function MacroStat({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View accessible accessibilityLabel={`${label} ${value}g`} className="min-w-0 flex-1 items-center gap-0.5 px-1">
      <Text className="text-[14px] font-bold" style={{ color, fontVariant: ["tabular-nums"] }}>
        {value}g
      </Text>
      <Text className="text-center text-[11px] font-medium text-app-muted" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
