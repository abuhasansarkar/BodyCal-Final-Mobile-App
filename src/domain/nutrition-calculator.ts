/**
 * Client-facing surface for BodyCal's nutrition maths.
 *
 * The implementation lives in `convex/lib/nutrition.ts` so the Convex backend and
 * this app run byte-identical code. Two copies of the calorie floors and
 * adjustment caps had already drifted apart; do not reintroduce a second one.
 */
export {
  ageFromDateOfBirth,
  assertNutritionInput,
  calculateBmr,
  calculateNutritionPlan,
  centimetersToFeetAndInches,
  clampTargetsToBaseline,
  feetAndInchesToCentimeters,
  kilogramsToPounds,
  NUTRITION_LIMITS,
  poundsToKilograms,
} from "../../convex/lib/nutrition";

export type {
  ActivityLevel,
  CalculationBasis,
  GoalPace,
  GoalType,
  HeightUnit,
  NutritionInput,
  NutritionPlan,
  NutritionValues,
  WeightUnit,
} from "../../convex/lib/nutrition";
