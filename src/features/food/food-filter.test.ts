import { describe, expect, it } from "@jest/globals";

import {
  filterLoggedFoods,
  filterSavedFoods,
  matchesQuery,
  mealTypeForHour,
  searchKey,
} from "@/features/food/food-filter";
import type { MealType } from "@/types/domain";

const meal = (foodName: string, mealType: MealType, serving = "1 serving") => ({
  foodName,
  mealType,
  serving,
});

describe("searchKey", () => {
  it("folds case", () => {
    expect(searchKey("Chicken Bowl")).toBe("chicken bowl");
  });

  it("folds the accents the launch languages need", () => {
    expect(searchKey("Müsli")).toBe("musli");
    expect(searchKey("Crème brûlée")).toBe("creme brulee");
    expect(searchKey("Açaí")).toBe("acai");
  });

  it("leaves scripts without combining marks alone", () => {
    expect(searchKey("鶏むね肉")).toBe("鶏むね肉");
    expect(searchKey("닭가슴살")).toBe("닭가슴살");
  });
});

describe("matchesQuery", () => {
  it("treats an empty query as matching everything", () => {
    expect(matchesQuery("   ", ["anything"])).toBe(true);
  });

  it("requires every term, in any order and any field", () => {
    expect(matchesQuery("rice chicken", ["Chicken bowl", "with rice"])).toBe(true);
    expect(matchesQuery("rice steak", ["Chicken bowl", "with rice"])).toBe(false);
  });

  it("ignores empty fields", () => {
    expect(matchesQuery("oats", ["Oats", null, undefined])).toBe(true);
  });
});

describe("filterLoggedFoods", () => {
  const items = [
    meal("Protein Pancakes", "breakfast"),
    meal("Chicken & Rice", "lunch"),
    meal("Steak Alfredo", "dinner"),
    meal("Almonds", "snack", "30 g"),
  ];

  it("returns everything for the all chip and an empty query", () => {
    expect(filterLoggedFoods(items, { category: "all", query: "" })).toHaveLength(4);
  });

  it("narrows to one meal type", () => {
    expect(filterLoggedFoods(items, { category: "dinner", query: "" })).toEqual([items[2]]);
  });

  it("combines the chip and the query", () => {
    expect(filterLoggedFoods(items, { category: "lunch", query: "rice" })).toEqual([items[1]]);
    expect(filterLoggedFoods(items, { category: "breakfast", query: "rice" })).toEqual([]);
  });

  it("matches on the serving as well as the name", () => {
    expect(filterLoggedFoods(items, { category: "all", query: "30 g" })).toEqual([items[3]]);
  });

  it("preserves the newest-first order it is given", () => {
    const result = filterLoggedFoods(items, { category: "all", query: "" });
    expect(result.map((item) => item.foodName)).toEqual(items.map((item) => item.foodName));
  });
});

describe("filterSavedFoods", () => {
  const saved = [
    { name: "Overnight oats", serving: "1 jar" },
    { name: "Protein shake", serving: "400 ml" },
  ];

  it("shows nothing until there is a query", () => {
    expect(filterSavedFoods(saved, "")).toEqual([]);
    expect(filterSavedFoods(saved, "   ")).toEqual([]);
  });

  it("matches name and serving", () => {
    expect(filterSavedFoods(saved, "oats")).toEqual([saved[0]]);
    expect(filterSavedFoods(saved, "400")).toEqual([saved[1]]);
  });
});

describe("mealTypeForHour", () => {
  it("maps the day onto the four meal types", () => {
    expect(mealTypeForHour(2)).toBe("snack");
    expect(mealTypeForHour(8)).toBe("breakfast");
    expect(mealTypeForHour(13)).toBe("lunch");
    expect(mealTypeForHour(19)).toBe("dinner");
    expect(mealTypeForHour(23)).toBe("snack");
  });

  it("covers every hour of the day", () => {
    for (let hour = 0; hour < 24; hour += 1) {
      expect(["breakfast", "lunch", "dinner", "snack"]).toContain(mealTypeForHour(hour));
    }
  });
});
