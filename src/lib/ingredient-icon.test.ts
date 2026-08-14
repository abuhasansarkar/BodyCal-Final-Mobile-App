import { describe, expect, it } from "@jest/globals";

import { ingredientIcon } from "@/lib/ingredient-icon";

describe("ingredientIcon", () => {
  it.each([
    ["Chicken Breast", "ingredientMeat"],
    ["Beef Sirloin Steak", "ingredientMeat"],
    ["Turkey Bacon", "ingredientMeat"],
    ["Atlantic Salmon Fillet", "ingredientFish"],
    ["Eggs", "ingredientEgg"],
    ["Nonfat Greek Yogurt", "ingredientDairy"],
    ["Parmesan Cheese", "ingredientDairy"],
    ["Heavy Cream", "ingredientDairy"],
    ["Jasmine Rice", "ingredientGrain"],
    ["Rolled Oats", "ingredientGrain"],
    ["Fettuccine Pasta", "ingredientGrain"],
    ["Cooked Quinoa", "ingredientGrain"],
    ["Blueberries", "ingredientFruit"],
    ["Banana", "ingredientFruit"],
    ["Baby Spinach", "ingredientVegetable"],
    ["Roma Tomatoes", "ingredientVegetable"],
    ["Edamame", "ingredientVegetable"],
    ["Maple Syrup", "ingredientSweetener"],
    ["Natural Honey", "ingredientSweetener"],
    ["Olive Oil", "ingredientFat"],
  ])("classifies %s", (ingredient, expected) => {
    expect(ingredientIcon(ingredient)).toBe(expected);
  });

  it("prefers the more specific word in a compound name", () => {
    // "butter" and "milk" would otherwise pull both of these into dairy.
    expect(ingredientIcon("Natural Peanut Butter")).toBe("ingredientNut");
    expect(ingredientIcon("Unsweetened Almond Milk")).toBe("ingredientNut");
  });

  it("treats a condiment as a fat however it is flavoured", () => {
    expect(ingredientIcon("Garlic Aioli")).toBe("ingredientFat");
    expect(ingredientIcon("Sesame Dressing")).toBe("ingredientFat");
  });

  it("reads a supplement as a supplement, not as its flavour", () => {
    expect(ingredientIcon("Whey Protein Concentrate")).toBe("ingredientSupplement");
    expect(ingredientIcon("Vanilla Protein Powder")).toBe("ingredientSupplement");
  });

  it("ignores case and diacritics", () => {
    expect(ingredientIcon("PURÉE OF TOMATO")).toBe("ingredientVegetable");
  });

  it("falls back to the neutral glyph rather than guessing", () => {
    expect(ingredientIcon("Chef's secret blend")).toBe("foods");
    expect(ingredientIcon("")).toBe("foods");
  });
});
