import {
  calculateBmr,
  calculateNutritionPlan,
  centimetersToFeetAndInches,
  feetAndInchesToCentimeters,
  kilogramsToPounds,
  poundsToKilograms,
} from "@/domain/nutrition-calculator";
import type { OnboardingDraft } from "@/types/domain";
import { describe, expect, it } from "@jest/globals";

const input: OnboardingDraft = {
  goal: "maintain", calculationBasis: "female", age: 30, heightCm: 165,
  currentWeightKg: 70, goalWeightKg: 70, activityLevel: "light", pace: "recommended",
  weightUnit: "kg", heightUnit: "cm",
};

describe("nutrition calculator", () => {
  it("uses the Mifflin-St Jeor calculation", () => {
    expect(calculateBmr(input)).toBeCloseTo(1420.25);
  });

  it("creates a maintenance target whose macros match calories within rounding tolerance", () => {
    const plan = calculateNutritionPlan(input);
    const macroCalories = plan.proteinGrams * 4 + plan.carbsGrams * 4 + plan.fatGrams * 9;
    expect(plan.calories).toBe(1950);
    expect(Math.abs(macroCalories - plan.calories)).toBeLessThanOrEqual(10);
    expect(plan.formulaVersion).toBe("mifflin-st-jeor-v1");
  });

  it("caps a requested deficit at 20 percent of TDEE", () => {
    const plan = calculateNutritionPlan({ ...input, goal: "lose", goalWeightKg: 60 });
    expect(plan.paceWasCapped).toBe(true);
    expect(Math.abs(plan.appliedAdjustment)).toBeLessThanOrEqual(Math.round(plan.tdee * 0.2) + 10);
  });

  it("enforces adult and supported measurement ranges", () => {
    expect(() => calculateNutritionPlan({ ...input, age: 17 })).toThrow(RangeError);
    expect(() => calculateNutritionPlan({ ...input, currentWeightKg: 20 })).toThrow(RangeError);
  });

  it("round-trips supported unit conversions", () => {
    expect(poundsToKilograms(kilogramsToPounds(72))).toBeCloseTo(72);
    const imperial = centimetersToFeetAndInches(180);
    expect(imperial).toEqual({ feet: 5, inches: 11 });
    expect(feetAndInchesToCentimeters(imperial.feet, imperial.inches)).toBeCloseTo(180, 0);
  });
});
