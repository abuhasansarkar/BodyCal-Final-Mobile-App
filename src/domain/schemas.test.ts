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
});
