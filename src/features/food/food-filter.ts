import type { MealType } from "@/types/domain";

/**
 * Pure list logic for the Foods tab.
 *
 * The screen filters three different lists — the user's own logged meals, their
 * saved custom foods and the catalog — against the same query and the same meal
 * chip. Keeping the rules here means they are unit tested once instead of being
 * re-derived inline three times, and it keeps `foods-screen.tsx` to rendering.
 */

export type CategoryFilter = "all" | MealType;

/** The meal chips, in the order the design lays them out. */
export const categoryOrder: CategoryFilter[] = ["all", "breakfast", "lunch", "dinner", "snack"];

/**
 * Comparison key for a searchable string.
 *
 * Lowercasing alone is not enough for eight launch languages: a German user
 * typing "musli" must match "Müsli", and a French user typing "creme" must match
 * "Crème". Decomposing to NFD and dropping the combining-mark block folds the
 * accent away without needing a locale-specific collator, which Hermes does not
 * expose. Recomposing to NFC afterwards matters for Korean: NFD splits Hangul
 * into Jamo, which are not combining marks and so survive the strip, leaving a
 * key that is visually identical but a different sequence of code points.
 */
export function searchKey(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC").toLowerCase();
}

/** True when every whitespace-separated term appears somewhere in the fields. */
export function matchesQuery(query: string, fields: (string | undefined | null)[]): boolean {
  const terms = searchKey(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fields.filter((field): field is string => Boolean(field)).map(searchKey).join(" ");
  return terms.every((term) => haystack.includes(term));
}

type LoggedFood = {
  foodName: string;
  serving: string;
  mealType: MealType;
};

/**
 * The logged meals a given chip and query should show.
 *
 * Order is preserved: the query returns newest first and the screen presents it
 * that way, so filtering must never re-sort.
 */
export function filterLoggedFoods<T extends LoggedFood>(
  items: T[],
  options: { category: CategoryFilter; query: string },
): T[] {
  return items.filter((item) => {
    if (options.category !== "all" && item.mealType !== options.category) return false;
    return matchesQuery(options.query, [item.foodName, item.serving]);
  });
}

type SavedFood = { name: string; serving: string };

/**
 * Saved custom foods matching the query.
 *
 * Deliberately not filtered by the meal chip: a custom food carries no meal
 * type, so a chip would silently hide the whole library rather than narrow it.
 */
export function filterSavedFoods<T extends SavedFood>(items: T[], query: string): T[] {
  if (!query.trim()) return [];
  return items.filter((item) => matchesQuery(query, [item.name, item.serving]));
}

/**
 * The meal a new entry should default to, from the local hour.
 *
 * Anything logged before 11:00 is breakfast, before 16:00 lunch, before 22:00
 * dinner, and the small hours are a snack. Defaulting every entry to lunch, as
 * the food detail screen did, meant most evening entries were filed wrong unless
 * the user noticed the control.
 */
export function mealTypeForHour(hour: number): MealType {
  if (hour < 5) return "snack";
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 22) return "dinner";
  return "snack";
}
