import { describe, expect, it } from "@jest/globals";

import { estimateSchema, NoFoodError, normalizeEstimate } from "../ai";
import { readStoredEstimate } from "../lib/estimate";

/**
 * What the server does with a structured response *after* it parses.
 *
 * Schema conformance is not plausibility: a response can satisfy every type and
 * still describe a meal whose stated total contradicts its own items, or claim a
 * confident estimate for a photo with no food in it. Neither may reach a user's
 * day, and neither may be quietly rewritten into zeroes — a fabricated zero is
 * worse than a failed scan, because it looks like an answer.
 */

const COMPONENT = {
  name: "Grilled chicken breast",
  preparation: "grilled",
  portion: "1 breast",
  estimatedWeightGrams: 180,
  nutrition: { calories: 300, proteinGrams: 45, carbsGrams: 0, fatGrams: 12 },
  confidence: 0.8,
};

const RAW = {
  isFood: true,
  mealName: "Chicken and rice",
  mealType: "lunch" as const,
  summary: "Grilled chicken with rice.",
  components: [
    COMPONENT,
    {
      name: "Jasmine rice",
      preparation: "steamed",
      portion: "1 cup",
      estimatedWeightGrams: 160,
      nutrition: { calories: 340, proteinGrams: 6, carbsGrams: 70, fatGrams: 1 },
      confidence: 0.7,
    },
  ],
  nutrition: {
    calories: 640,
    proteinGrams: 51,
    carbsGrams: 70,
    fatGrams: 13,
    saturatedFatGrams: 4.5,
    fiberGrams: null,
    sugarGrams: 3,
    sodiumMilligrams: 820,
  },
  calorieRange: { minCalories: 560, maxCalories: 740 },
  confidence: "medium" as const,
  portionConfidence: 0.6,
  assumptions: ["Rice was cooked without added fat."],
  warnings: ["Cooking oil is hard to judge from a photo."],
};

describe("estimateSchema", () => {
  it("accepts a well-formed provider response", () => {
    expect(() => estimateSchema.parse(RAW)).not.toThrow();
  });

  it("rejects negative nutrition", () => {
    expect(() =>
      estimateSchema.parse({ ...RAW, nutrition: { ...RAW.nutrition, proteinGrams: -1 } }),
    ).toThrow();
  });

  it("rejects a confidence outside 0–1", () => {
    expect(() => estimateSchema.parse({ ...RAW, portionConfidence: 1.4 })).toThrow();
  });
});

describe("normalizeEstimate", () => {
  it("keeps a coherent estimate intact", () => {
    const estimate = normalizeEstimate(RAW);
    expect(estimate.mealName).toBe("Chicken and rice");
    expect(estimate.components).toHaveLength(2);
    expect(estimate.nutrition.calories).toBe(640);
    expect(estimate.calorieRange).toEqual({ minCalories: 560, maxCalories: 740 });
  });

  it("refuses a photo with no food rather than reporting an empty meal", () => {
    expect(() => normalizeEstimate({ ...RAW, isFood: false })).toThrow(NoFoodError);
  });

  it("refuses a meal total its own items do not support", () => {
    // Items sum to 640; a stated 1,900 means one of the two did not read the photo.
    expect(() =>
      normalizeEstimate({ ...RAW, nutrition: { ...RAW.nutrition, calories: 1_900 } }),
    ).toThrow(/does not match/i);
  });

  it("tolerates the small disagreement that rounding produces", () => {
    expect(() =>
      normalizeEstimate({ ...RAW, nutrition: { ...RAW.nutrition, calories: 660 } }),
    ).not.toThrow();
  });

  it("refuses macro totals that contradict the item breakdown", () => {
    expect(() =>
      normalizeEstimate({
        ...RAW,
        nutrition: { ...RAW.nutrition, proteinGrams: 240 },
      }),
    ).toThrow(/proteinGrams/i);
  });

  it("uses null instead of a zero estimated weight", () => {
    expect(() =>
      normalizeEstimate({
        ...RAW,
        components: [{ ...COMPONENT, estimatedWeightGrams: 0 }, RAW.components[1]],
      }),
    ).toThrow(/positive or unknown/i);
  });

  it("refuses food identified with no energy at all", () => {
    expect(() =>
      normalizeEstimate({
        ...RAW,
        components: [{ ...COMPONENT, nutrition: { ...COMPONENT.nutrition, calories: 0 } }],
        nutrition: { ...RAW.nutrition, calories: 0 },
      }),
    ).toThrow(/no calories/i);
  });

  it("widens a range that does not bracket its own total", () => {
    const estimate = normalizeEstimate({
      ...RAW,
      calorieRange: { minCalories: 700, maxCalories: 900 },
    });
    expect(estimate.calorieRange.minCalories).toBe(640);
    expect(estimate.calorieRange.maxCalories).toBe(900);
  });

  it("drops an empty component the provider padded the list with", () => {
    const estimate = normalizeEstimate({
      ...RAW,
      components: [
        ...RAW.components,
        {
          ...COMPONENT,
          name: "   ",
          portion: "",
          nutrition: { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 },
        },
      ],
    });
    expect(estimate.components).toHaveLength(2);
  });

  it("refuses the meal when dropping a blank component leaves the total unsupported", () => {
    // The rice arrived nameless, so it cannot be shown — and without it the
    // remaining food accounts for 300 of the meal's 640 kcal. Rendering that
    // would claim energy nothing on screen explains.
    expect(() =>
      normalizeEstimate({
        ...RAW,
        components: [COMPONENT, { ...RAW.components[1], name: "  " }],
      }),
    ).toThrow(/does not match/i);
  });
});

describe("readStoredEstimate", () => {
  it("reads back a normalized estimate whole", () => {
    const stored = readStoredEstimate(normalizeEstimate(RAW), "medium");
    expect(stored?.mealType).toBe("lunch");
    expect(stored?.components[0].nutrition?.calories).toBe(300);
    expect(stored?.components[0].estimatedWeightGrams).toBe(180);
    expect(stored?.assumptions).toHaveLength(1);
    expect(stored?.calorieRange).toEqual({ minCalories: 560, maxCalories: 740 });
  });

  it("still reads a row written before per-item nutrition existed", () => {
    const stored = readStoredEstimate(
      {
        mealName: "Old scan",
        components: [{ name: "Rice", portion: "1 cup" }],
        nutrition: { calories: 500, proteinGrams: 30, carbsGrams: 60, fatGrams: 12 },
      },
      "medium",
    );
    // The food still appears in its own meal; it simply carries no numbers.
    expect(stored?.components[0].nutrition).toBeNull();
    expect(stored?.components[0].name).toBe("Rice");
    expect(stored?.mealType).toBe("unknown");
    expect(stored?.calorieRange).toBeNull();
    expect(stored?.assumptions).toEqual([]);
  });

  it("reports an unjudged value as not-estimated rather than as zero", () => {
    const stored = readStoredEstimate(normalizeEstimate(RAW), "medium");
    expect(stored?.nutrition.fiberGrams).toBeNull();
    expect(stored?.nutrition.sugarGrams).toBe(3);
  });

  it("refuses a row with no usable macros at all", () => {
    expect(readStoredEstimate({ mealName: "Broken", components: [] })).toBeNull();
    expect(readStoredEstimate(null)).toBeNull();
  });

  it("drops a per-item nutrition block that is only half there", () => {
    const stored = readStoredEstimate({
      ...RAW,
      components: [{ ...COMPONENT, nutrition: { calories: 300, proteinGrams: 45 } }],
    });
    // Half a breakdown would render as a food with calories and no macros.
    expect(stored?.components[0].nutrition).toBeNull();
  });
});
