import { v } from "convex/values";

/**
 * The one place a stored AI estimate is described and re-narrowed.
 *
 * `aiScans.estimate` is `v.any()` on purpose — the estimate shape is owned by the
 * AI provider contract, not the database — so every read path has to narrow it
 * rather than trust it. Doing that once here is what keeps the scan result
 * screen, the saved-entry detail screen and the provider contract describing the
 * same numbers. Two hand-rolled narrowings drift, and the drift shows up as a
 * screen that silently renders "no estimate" for a scan that completed fine.
 *
 * Nothing in here throws. A row written before a field existed simply has
 * nothing to read, which is reported as `null` — never as a zero. "0 g of fibre"
 * is a measurement claim; "not estimated" is the truth.
 */

const TEXT = { component: 100, mealName: 120, warning: 240 } as const;
const MAX_COMPONENTS = 25;
const MAX_WARNINGS = 10;

export const nullableNumber = v.union(v.number(), v.null());
export const confidenceValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
);

export const mealTypeHintValidator = v.union(
  v.literal("breakfast"),
  v.literal("lunch"),
  v.literal("dinner"),
  v.literal("snack"),
  v.literal("drink"),
  v.literal("unknown"),
);

/**
 * One item on the plate.
 *
 * `nutrition` is nullable because scans recorded before per-item nutrition
 * existed have only a name and a portion. Those rows still render — as chips
 * without numbers — rather than disappearing from their own meal.
 */
const storedComponentValidator = v.object({
  name: v.string(),
  preparation: v.union(v.string(), v.null()),
  portion: v.string(),
  estimatedWeightGrams: nullableNumber,
  nutrition: v.union(
    v.object({
      calories: v.number(),
      proteinGrams: v.number(),
      carbsGrams: v.number(),
      fatGrams: v.number(),
    }),
    v.null(),
  ),
  confidence: nullableNumber,
});

/** The estimate shape as it is handed to a client. Every optional value is explicit. */
export const storedEstimateValidator = v.object({
  mealName: v.string(),
  mealType: mealTypeHintValidator,
  summary: v.union(v.string(), v.null()),
  components: v.array(storedComponentValidator),
  nutrition: v.object({
    calories: v.number(),
    proteinGrams: v.number(),
    carbsGrams: v.number(),
    fatGrams: v.number(),
    saturatedFatGrams: nullableNumber,
    fiberGrams: nullableNumber,
    sugarGrams: nullableNumber,
    sodiumMilligrams: nullableNumber,
  }),
  calorieRange: v.union(
    v.object({ minCalories: v.number(), maxCalories: v.number() }),
    v.null(),
  ),
  confidence: v.union(confidenceValidator, v.null()),
  portionConfidence: nullableNumber,
  assumptions: v.array(v.string()),
  warnings: v.array(v.string()),
});

export type StoredComponent = {
  name: string;
  preparation: string | null;
  portion: string;
  estimatedWeightGrams: number | null;
  nutrition: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  } | null;
  confidence: number | null;
};

export type StoredEstimate = {
  mealName: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "drink" | "unknown";
  summary: string | null;
  components: StoredComponent[];
  nutrition: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    saturatedFatGrams: number | null;
    fiberGrams: number | null;
    sugarGrams: number | null;
    sodiumMilligrams: number | null;
  };
  calorieRange: { minCalories: number; maxCalories: number } | null;
  confidence: "low" | "medium" | "high" | null;
  portionConfidence: number | null;
  assumptions: string[];
  warnings: string[];
};

const MEAL_TYPE_HINTS = new Set(["breakfast", "lunch", "dinner", "snack", "drink", "unknown"]);

function readMealType(value: unknown): StoredEstimate["mealType"] {
  return typeof value === "string" && MEAL_TYPE_HINTS.has(value)
    ? (value as StoredEstimate["mealType"])
    : "unknown";
}

/** A 0–1 score, or null. Anything outside the range is not a confidence. */
function readUnitInterval(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

export function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : null;
}

/** A finite non-negative number, or null. Rejects NaN, Infinity and negatives. */
export function readMeasure(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function readConfidence(value: unknown): "low" | "medium" | "high" | null {
  return value === "low" || value === "medium" || value === "high" ? value : null;
}

/**
 * Narrows a stored estimate, or returns null when there is nothing to read.
 *
 * `confidenceOverride` is the scan row's own `confidence` column, which is
 * written alongside the estimate and is the more reliable of the two.
 */
export function readStoredEstimate(
  value: unknown,
  confidenceOverride?: unknown,
): StoredEstimate | null {
  if (!value || typeof value !== "object") return null;
  const estimate = value as Record<string, unknown>;

  const nutrition = (estimate.nutrition ?? {}) as Record<string, unknown>;
  const calories = readMeasure(nutrition.calories);
  const proteinGrams = readMeasure(nutrition.proteinGrams);
  const carbsGrams = readMeasure(nutrition.carbsGrams);
  const fatGrams = readMeasure(nutrition.fatGrams);
  // The four values a day total is built from are the estimate. Without them
  // there is no estimate to show, only a shell that would render as zeroes.
  if (calories === null || proteinGrams === null || carbsGrams === null || fatGrams === null) {
    return null;
  }

  const rawComponents = Array.isArray(estimate.components)
    ? estimate.components.slice(0, MAX_COMPONENTS)
    : [];

  const readTextList = (value: unknown) =>
    Array.isArray(value)
      ? value.slice(0, MAX_WARNINGS).flatMap((entry) => readString(entry, TEXT.warning) ?? [])
      : [];

  const range = (estimate.calorieRange ?? null) as Record<string, unknown> | null;
  const minCalories = range ? readMeasure(range.minCalories) : null;
  const maxCalories = range ? readMeasure(range.maxCalories) : null;

  return {
    mealName: readString(estimate.mealName, TEXT.mealName) ?? "",
    mealType: readMealType(estimate.mealType),
    summary: readString(estimate.summary, TEXT.warning),
    components: rawComponents.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const component = entry as Record<string, unknown>;
      const name = readString(component.name, TEXT.component);
      const portion = readString(component.portion, TEXT.component);
      if (!name || !portion) return [];

      // Per-item nutrition is all-or-nothing: a partial reading would show a
      // calorie figure beside blank macros and read as though the food had none.
      const itemNutrition = (component.nutrition ?? {}) as Record<string, unknown>;
      const itemCalories = readMeasure(itemNutrition.calories);
      const itemProtein = readMeasure(itemNutrition.proteinGrams);
      const itemCarbs = readMeasure(itemNutrition.carbsGrams);
      const itemFat = readMeasure(itemNutrition.fatGrams);
      const complete =
        itemCalories !== null && itemProtein !== null && itemCarbs !== null && itemFat !== null;

      return [
        {
          name,
          preparation: readString(component.preparation, TEXT.component),
          portion,
          estimatedWeightGrams: readMeasure(component.estimatedWeightGrams),
          nutrition: complete
            ? {
                calories: itemCalories,
                proteinGrams: itemProtein,
                carbsGrams: itemCarbs,
                fatGrams: itemFat,
              }
            : null,
          confidence: readUnitInterval(component.confidence),
        },
      ];
    }),
    nutrition: {
      calories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      saturatedFatGrams: readMeasure(nutrition.saturatedFatGrams),
      fiberGrams: readMeasure(nutrition.fiberGrams),
      sugarGrams: readMeasure(nutrition.sugarGrams),
      sodiumMilligrams: readMeasure(nutrition.sodiumMilligrams),
    },
    // A range is only meaningful if it actually brackets the total it describes.
    calorieRange:
      minCalories !== null && maxCalories !== null && minCalories <= calories && calories <= maxCalories
        ? { minCalories, maxCalories }
        : null,
    confidence: readConfidence(confidenceOverride) ?? readConfidence(estimate.confidence),
    portionConfidence: readUnitInterval(estimate.portionConfidence),
    assumptions: readTextList(estimate.assumptions),
    warnings: readTextList(estimate.warnings),
  };
}
