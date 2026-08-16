import {
  calculateBmr,
  calculateNutritionPlan,
  centimetersToFeetAndInches,
  feetAndInchesToCentimeters,
  kilogramsToPounds,
  poundsToKilograms,
  type ActivityLevel,
  type GoalPace,
  type GoalType,
} from "@/domain/nutrition-calculator";
import type { OnboardingDraft } from "@/types/domain";
import { describe, expect, it } from "@jest/globals";

const baseInput: OnboardingDraft = {
  goal: "maintain",
  calculationBasis: "female",
  age: 30,
  heightCm: 165,
  currentWeightKg: 70,
  goalWeightKg: 70,
  activityLevel: "light",
  pace: "recommended",
  weightUnit: "kg",
  heightUnit: "cm",
};

describe("nutrition calculator", () => {
  it("uses the Mifflin-St Jeor calculation for female basis", () => {
    // 10 * 70 + 6.25 * 165 - 5 * 30 - 161 = 700 + 1031.25 - 150 - 161 = 1420.25
    expect(calculateBmr(baseInput)).toBeCloseTo(1420.25);
  });

  it("uses the Mifflin-St Jeor calculation for male basis", () => {
    // 10 * 70 + 6.25 * 165 - 5 * 30 + 5 = 700 + 1031.25 - 150 + 5 = 1586.25
    expect(calculateBmr({ ...baseInput, calculationBasis: "male" })).toBeCloseTo(1586.25);
  });

  it("creates a maintenance target whose macros match calories within rounding tolerance", () => {
    const plan = calculateNutritionPlan(baseInput);
    const macroCalories = plan.proteinGrams * 4 + plan.carbsGrams * 4 + plan.fatGrams * 9;
    expect(plan.calories).toBe(1950);
    expect(Math.abs(macroCalories - plan.calories)).toBeLessThanOrEqual(10);
    expect(plan.formulaVersion).toBe("mifflin-st-jeor-v1");
  });

  it("caps a requested deficit at 20 percent of TDEE", () => {
    const plan = calculateNutritionPlan({ ...baseInput, goal: "lose", goalWeightKg: 60 });
    expect(plan.paceWasCapped).toBe(true);
    expect(Math.abs(plan.appliedAdjustment)).toBeLessThanOrEqual(Math.round(plan.tdee * 0.2) + 10);
  });

  it("caps a requested surplus at 15 percent of TDEE for gaining weight", () => {
    const plan = calculateNutritionPlan({ ...baseInput, goal: "gain", pace: "faster", goalWeightKg: 80 });
    expect(Math.abs(plan.appliedAdjustment)).toBeLessThanOrEqual(Math.round(plan.tdee * 0.15) + 10);
  });

  describe("activity level multiplier table", () => {
    const activities: { level: ActivityLevel; expectedMultiplier: number }[] = [
      { level: "sedentary", expectedMultiplier: 1.2 },
      { level: "light", expectedMultiplier: 1.375 },
      { level: "active", expectedMultiplier: 1.55 },
      { level: "veryActive", expectedMultiplier: 1.725 },
    ];

    for (const { level, expectedMultiplier } of activities) {
      it(`computes TDEE accurately for activity: ${level}`, () => {
        const plan = calculateNutritionPlan({ ...baseInput, activityLevel: level });
        const expectedTdee = Math.round(plan.bmr * expectedMultiplier);
        expect(plan.tdee).toBe(expectedTdee);
      });
    }
  });

  describe("goal and pace matrix", () => {
    const goals: GoalType[] = ["lose", "maintain", "gain"];
    const paces: GoalPace[] = ["slow", "recommended", "faster"];

    for (const goal of goals) {
      for (const pace of paces) {
        it(`calculates a valid, safe plan for goal: ${goal}, pace: ${pace}`, () => {
          const plan = calculateNutritionPlan({
            ...baseInput,
            goal,
            pace,
            goalWeightKg: goal === "lose" ? 65 : goal === "gain" ? 75 : 70,
          });

          expect(plan.calories).toBeGreaterThanOrEqual(1200);
          expect(plan.calories).toBeLessThanOrEqual(5000);
          expect(plan.proteinGrams).toBeGreaterThan(0);
          expect(plan.fatGrams).toBeGreaterThan(0);
          expect(plan.carbsGrams).toBeGreaterThanOrEqual(0);
        });
      }
    }
  });

  describe("calorie safety floors", () => {
    it("enforces a 1200 kcal floor for females with a small frame and low activity", () => {
      const plan = calculateNutritionPlan({
        ...baseInput,
        calculationBasis: "female",
        age: 65,
        heightCm: 145,
        currentWeightKg: 42,
        goalWeightKg: 38,
        activityLevel: "sedentary",
        goal: "lose",
        pace: "faster",
      });

      expect(plan.calories).toBeGreaterThanOrEqual(1200);
    });

    it("enforces a 1500 kcal floor for males with low activity", () => {
      const plan = calculateNutritionPlan({
        ...baseInput,
        calculationBasis: "male",
        age: 65,
        heightCm: 155,
        currentWeightKg: 50,
        goalWeightKg: 45,
        activityLevel: "sedentary",
        goal: "lose",
        pace: "faster",
      });

      expect(plan.calories).toBeGreaterThanOrEqual(1500);
    });
  });

  describe("boundary and range validation", () => {
    it("accepts exact minimum and maximum valid adult ages (18 and 80)", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, age: 18 })).not.toThrow();
      expect(() => calculateNutritionPlan({ ...baseInput, age: 80 })).not.toThrow();
    });

    it("rejects ages below 18 or above 80", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, age: 17 })).toThrow(RangeError);
      expect(() => calculateNutritionPlan({ ...baseInput, age: 81 })).toThrow(RangeError);
    });

    it("accepts exact minimum and maximum valid heights (120cm and 230cm)", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, heightCm: 120 })).not.toThrow();
      expect(() => calculateNutritionPlan({ ...baseInput, heightCm: 230 })).not.toThrow();
    });

    it("rejects heights below 120cm or above 230cm", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, heightCm: 119 })).toThrow(RangeError);
      expect(() => calculateNutritionPlan({ ...baseInput, heightCm: 231 })).toThrow(RangeError);
    });

    it("accepts exact minimum and maximum valid weights (35kg and 350kg)", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, currentWeightKg: 35, goalWeightKg: 35 })).not.toThrow();
      expect(() => calculateNutritionPlan({ ...baseInput, currentWeightKg: 350, goalWeightKg: 350 })).not.toThrow();
    });

    it("rejects weights below 35kg or above 350kg", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, currentWeightKg: 34 })).toThrow(RangeError);
      expect(() => calculateNutritionPlan({ ...baseInput, currentWeightKg: 351 })).toThrow(RangeError);
      expect(() => calculateNutritionPlan({ ...baseInput, goalWeightKg: 34 })).toThrow(RangeError);
      expect(() => calculateNutritionPlan({ ...baseInput, goalWeightKg: 351 })).toThrow(RangeError);
    });

    it("rejects non-finite inputs (NaN / Infinity)", () => {
      expect(() => calculateNutritionPlan({ ...baseInput, age: Number.NaN })).toThrow(RangeError);
      expect(() => calculateNutritionPlan({ ...baseInput, currentWeightKg: Number.POSITIVE_INFINITY })).toThrow(RangeError);
    });
  });

  describe("unit conversion helpers", () => {
    it("round-trips kg to lb conversions accurately", () => {
      expect(poundsToKilograms(kilogramsToPounds(72))).toBeCloseTo(72);
      expect(kilogramsToPounds(1)).toBeCloseTo(2.20462, 2);
    });

    it("round-trips cm to feet and inches accurately", () => {
      const imperial = centimetersToFeetAndInches(180);
      expect(imperial).toEqual({ feet: 5, inches: 11 });
      expect(feetAndInchesToCentimeters(imperial.feet, imperial.inches)).toBeCloseTo(180, 0);

      const short = centimetersToFeetAndInches(152.4);
      expect(short).toEqual({ feet: 5, inches: 0 });
      expect(feetAndInchesToCentimeters(5, 0)).toBeCloseTo(152.4, 0);
    });
  });
});
