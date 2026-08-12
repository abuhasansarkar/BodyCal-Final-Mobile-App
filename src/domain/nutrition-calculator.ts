import type {
  ActivityLevel,
  GoalPace,
  GoalType,
  NutritionPlan,
  OnboardingDraft,
} from "@/types/domain";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  active: 1.55,
  veryActive: 1.725,
};

const LOSS_ADJUSTMENT: Record<GoalPace, number> = {
  slow: -250,
  recommended: -500,
  faster: -750,
};

const GAIN_ADJUSTMENT: Record<GoalPace, number> = {
  slow: 150,
  recommended: 300,
  faster: 500,
};

function roundToTen(value: number) {
  return Math.round(value / 10) * 10;
}

function requestedAdjustment(goal: GoalType, pace: GoalPace) {
  if (goal === "lose") return LOSS_ADJUSTMENT[pace];
  if (goal === "gain") return GAIN_ADJUSTMENT[pace];
  return 0;
}

export function calculateBmr(input: Pick<OnboardingDraft, "age" | "calculationBasis" | "currentWeightKg" | "heightCm">) {
  const basisConstant = input.calculationBasis === "male" ? 5 : -161;
  return 10 * input.currentWeightKg + 6.25 * input.heightCm - 5 * input.age + basisConstant;
}

export function calculateNutritionPlan(input: OnboardingDraft): NutritionPlan {
  if (input.age < 18 || input.age > 80) throw new RangeError("BodyCal supports adults ages 18 to 80.");
  if (input.heightCm < 120 || input.heightCm > 230) throw new RangeError("Height is outside the supported range.");
  if (input.currentWeightKg < 35 || input.currentWeightKg > 350) throw new RangeError("Weight is outside the supported range.");
  if (input.goalWeightKg < 35 || input.goalWeightKg > 350) throw new RangeError("Goal weight is outside the supported range.");

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

export function kilogramsToPounds(kilograms: number) {
  return kilograms * 2.2046226218;
}

export function poundsToKilograms(pounds: number) {
  return pounds / 2.2046226218;
}

export function centimetersToFeetAndInches(centimeters: number) {
  const totalInches = centimeters / 2.54;
  const feet = Math.floor(totalInches / 12);
  return { feet, inches: Math.round(totalInches - feet * 12) };
}

export function feetAndInchesToCentimeters(feet: number, inches: number) {
  return (feet * 12 + inches) * 2.54;
}
