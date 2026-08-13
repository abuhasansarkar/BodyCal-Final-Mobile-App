/**
 * Single source of truth for BodyCal's nutrition maths.
 *
 * This module is imported by BOTH the Convex backend and the React Native client
 * (re-exported from `src/domain/nutrition-calculator.ts`). It must therefore stay
 * free of path aliases, React Native imports, and Convex imports — plain,
 * deterministic TypeScript only.
 *
 * Formula and safety rules are documented in PLAN.md. Do not change the
 * multipliers, adjustment caps, or calorie floors without product approval and
 * updated tests.
 */

export type GoalType = "lose" | "maintain" | "gain";
export type CalculationBasis = "female" | "male";
export type ActivityLevel = "sedentary" | "light" | "active" | "veryActive";
export type GoalPace = "slow" | "recommended" | "faster";
export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "imperial";

export interface NutritionValues {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface NutritionInput {
  goal: GoalType;
  calculationBasis: CalculationBasis;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  pace: GoalPace;
}

export interface NutritionPlan extends NutritionValues {
  bmr: number;
  tdee: number;
  requestedAdjustment: number;
  appliedAdjustment: number;
  paceWasCapped: boolean;
  formulaVersion: "mifflin-st-jeor-v1";
}

export const NUTRITION_LIMITS = {
  minAge: 18,
  maxAge: 80,
  minHeightCm: 120,
  maxHeightCm: 230,
  minWeightKg: 35,
  maxWeightKg: 350,
  minCalories: 1_200,
  maxCalories: 6_000,
} as const;

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  active: 1.55,
  veryActive: 1.725,
};

const LOSS_ADJUSTMENT: Record<GoalPace, number> = { slow: -250, recommended: -500, faster: -750 };
const GAIN_ADJUSTMENT: Record<GoalPace, number> = { slow: 150, recommended: 300, faster: 500 };

const POUNDS_PER_KILOGRAM = 2.2046226218;
const CENTIMETERS_PER_INCH = 2.54;

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

function requestedAdjustment(goal: GoalType, pace: GoalPace) {
  if (goal === "lose") return LOSS_ADJUSTMENT[pace];
  if (goal === "gain") return GAIN_ADJUSTMENT[pace];
  return 0;
}

export function calculateBmr(
  input: Pick<NutritionInput, "age" | "calculationBasis" | "currentWeightKg" | "heightCm">,
) {
  const basisConstant = input.calculationBasis === "male" ? 5 : -161;
  return 10 * input.currentWeightKg + 6.25 * input.heightCm - 5 * input.age + basisConstant;
}

/**
 * Throws RangeError when an input falls outside the supported adult ranges.
 * Callers that receive untrusted input should call this before persisting.
 */
export function assertNutritionInput(input: NutritionInput) {
  const { minAge, maxAge, minHeightCm, maxHeightCm, minWeightKg, maxWeightKg } = NUTRITION_LIMITS;
  for (const value of [input.age, input.heightCm, input.currentWeightKg, input.goalWeightKg]) {
    if (!Number.isFinite(value)) throw new RangeError("Nutrition inputs must be finite numbers.");
  }
  if (input.age < minAge || input.age > maxAge) {
    throw new RangeError(`BodyCal supports adults ages ${minAge} to ${maxAge}.`);
  }
  if (input.heightCm < minHeightCm || input.heightCm > maxHeightCm) {
    throw new RangeError("Height is outside the supported range.");
  }
  if (input.currentWeightKg < minWeightKg || input.currentWeightKg > maxWeightKg) {
    throw new RangeError("Weight is outside the supported range.");
  }
  if (input.goalWeightKg < minWeightKg || input.goalWeightKg > maxWeightKg) {
    throw new RangeError("Goal weight is outside the supported range.");
  }
}

export function calculateNutritionPlan(input: NutritionInput): NutritionPlan {
  assertNutritionInput(input);

  const bmr = calculateBmr(input);
  const tdee = bmr * ACTIVITY_MULTIPLIER[input.activityLevel];
  const requested = requestedAdjustment(input.goal, input.pace);
  const adjustmentCap = input.goal === "lose" ? tdee * 0.2 : input.goal === "gain" ? tdee * 0.15 : 0;
  const applied = Math.sign(requested) * Math.min(Math.abs(requested), adjustmentCap);
  const minimumCalories = input.calculationBasis === "female" ? 1_200 : 1_500;
  const calories = roundToTen(Math.min(5_000, Math.max(minimumCalories, tdee + applied)));
  const actualAdjustment = calories - tdee;

  const referenceWeight = input.goal === "lose" ? input.goalWeightKg : input.currentWeightKg;
  let protein = referenceWeight * (input.goal === "maintain" ? 1.4 : 1.6);
  const minimumProtein = referenceWeight * 1.2;
  const minimumFat = referenceWeight * 0.8;
  let fat = Math.min((calories * 0.35) / 9, Math.max(minimumFat, (calories * 0.25) / 9));
  let carbs = (calories - protein * 4 - fat * 9) / 4;

  if (carbs < 100) {
    let excessCalories = 400 - carbs * 4;
    const reducibleFatCalories = Math.max(0, (fat - minimumFat) * 9);
    const fatReduction = Math.min(excessCalories, reducibleFatCalories);
    fat -= fatReduction / 9;
    excessCalories -= fatReduction;

    const reducibleProteinCalories = Math.max(0, (protein - minimumProtein) * 4);
    const proteinReduction = Math.min(excessCalories, reducibleProteinCalories);
    protein -= proteinReduction / 4;
    carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  }

  return {
    calories,
    proteinGrams: Math.round(protein),
    carbsGrams: Math.round(carbs),
    fatGrams: Math.round(fat),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    requestedAdjustment: requested,
    appliedAdjustment: Math.round(actualAdjustment),
    paceWasCapped: Math.abs(actualAdjustment - requested) > 10,
    formulaVersion: "mifflin-st-jeor-v1",
  };
}

/**
 * Accepts a candidate set of targets only where each value sits within
 * `tolerance` of the locally computed baseline; otherwise the baseline wins.
 *
 * This is how AI-suggested targets are allowed to influence a plan without ever
 * escaping the calorie floors and adjustment caps above. The server applies it
 * again on write, so a modified client cannot bypass it.
 */
export function clampTargetsToBaseline(
  candidate: Partial<NutritionValues> | undefined,
  baseline: NutritionValues,
  tolerance = 0.1,
): NutritionValues {
  const within = (value: number | undefined, reference: number) => {
    if (value === undefined || !Number.isFinite(value) || reference <= 0) return false;
    return Math.abs(value - reference) / reference <= tolerance;
  };

  return {
    calories: within(candidate?.calories, baseline.calories) ? candidate!.calories! : baseline.calories,
    proteinGrams: within(candidate?.proteinGrams, baseline.proteinGrams)
      ? candidate!.proteinGrams!
      : baseline.proteinGrams,
    carbsGrams: within(candidate?.carbsGrams, baseline.carbsGrams)
      ? candidate!.carbsGrams!
      : baseline.carbsGrams,
    fatGrams: within(candidate?.fatGrams, baseline.fatGrams) ? candidate!.fatGrams! : baseline.fatGrams,
  };
}

export function kilogramsToPounds(kilograms: number) {
  return kilograms * POUNDS_PER_KILOGRAM;
}

export function poundsToKilograms(pounds: number) {
  return pounds / POUNDS_PER_KILOGRAM;
}

export function centimetersToFeetAndInches(centimeters: number) {
  const totalInches = centimeters / CENTIMETERS_PER_INCH;
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: Math.round(totalInches - feet * 12) };
}

export function feetAndInchesToCentimeters(feet: number, inches: number) {
  return (feet * 12 + inches) * CENTIMETERS_PER_INCH;
}

/**
 * Age from a stored `YYYY-MM-DD` date of birth, evaluated against `now`.
 * Returns null when the string is not a usable date.
 */
export function ageFromDateOfBirth(dateOfBirth: string, now = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  let age = now.getUTCFullYear() - year;
  const beforeBirthday =
    now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return Number.isFinite(age) ? age : null;
}
