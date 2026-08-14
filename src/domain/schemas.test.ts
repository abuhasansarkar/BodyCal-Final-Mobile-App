import { nutritionEstimateSchema } from "@/domain/schemas";
import { describe, expect, it } from "@jest/globals";

describe("nutrition estimate schema", () => {
  const valid = {
    mealName: "Chicken rice bowl",
    components: [{ name: "Chicken", portion: "150 g" }],
    nutrition: { calories: 685, proteinGrams: 48, carbsGrams: 76, fatGrams: 20 },
    confidence: "medium",
    warnings: ["Sauce amount is uncertain"],
  };

  it("accepts an editable structured estimate", () => {
    expect(nutritionEstimateSchema.parse(valid)).toEqual(valid);
  });

  it("rejects impossible or empty estimates", () => {
    expect(() => nutritionEstimateSchema.parse({ ...valid, components: [] })).toThrow();
    expect(() => nutritionEstimateSchema.parse({ ...valid, nutrition: { ...valid.nutrition, calories: -1 } })).toThrow();
  });

  it("carries the detail nutrition the provider reports", () => {
    const detailed = {
      ...valid,
      nutrition: {
        ...valid.nutrition,
        saturatedFatGrams: 6.5,
        fiberGrams: 4,
        sugarGrams: 12,
        sodiumMilligrams: 980,
      },
    };
    expect(nutritionEstimateSchema.parse(detailed).nutrition).toEqual(detailed.nutrition);
  });

  it("treats an unjudged detail value as absent rather than zero", () => {
    // The provider returns null when the photo does not support a value, and an
    // estimate stored before these fields existed omits the key. Both must parse:
    // the result screen renders them as not-estimated, never as 0.
    const withNulls = {
      ...valid,
      nutrition: {
        ...valid.nutrition,
        saturatedFatGrams: null,
        fiberGrams: null,
        sugarGrams: null,
        sodiumMilligrams: null,
      },
    };
    expect(nutritionEstimateSchema.parse(withNulls).nutrition.fiberGrams).toBeNull();
    expect(nutritionEstimateSchema.parse(valid).nutrition.fiberGrams).toBeUndefined();
  });

  it("rejects a detail value outside its plausibility bound", () => {
    expect(() =>
      nutritionEstimateSchema.parse({
        ...valid,
        nutrition: { ...valid.nutrition, sodiumMilligrams: -1 },
      }),
    ).toThrow();
  });
});
