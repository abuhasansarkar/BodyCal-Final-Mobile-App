export type GoalType = "lose" | "maintain" | "gain";
export type CalculationBasis = "female" | "male";
export type ActivityLevel = "sedentary" | "light" | "active" | "veryActive";
export type GoalPace = "slow" | "recommended" | "faster";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "ai" | "manual" | "catalog";
export type WeightUnit = "kg" | "lb";
export type HeightUnit = "cm" | "imperial";

export type SubscriptionState =
  | "loading"
  | "free"
  | "trial"
  | "active"
  | "cancelledActive"
  | "billingIssueActive"
  | "expired"
  | "offlineUnknown"
  | "error";

export interface NutritionValues {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface OnboardingDraft {
  goal: GoalType;
  calculationBasis: CalculationBasis;
  age: number;
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
  activityLevel: ActivityLevel;
  pace: GoalPace;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
}

export interface NutritionPlan extends NutritionValues {
  bmr: number;
  tdee: number;
  requestedAdjustment: number;
  appliedAdjustment: number;
  paceWasCapped: boolean;
  formulaVersion: "mifflin-st-jeor-v1";
}
