import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { createUser, FOOD_ENTRY, setupTest, type TestConvex } from "./setup";

/**
 * The queries the Foods tab is built on.
 *
 * `getMyScannedAndLoggedFoods` is the screen's only list, and `searchCatalog` is
 * what the search box now consults — before this change the box only filtered
 * the rows already on screen, so nothing here was exercised end to end.
 */

/** Inserts a catalog row directly; there is no public mutation that creates one. */
async function seedCatalogFood(
  t: TestConvex,
  options: {
    slug: string;
    title: string;
    mealTypes: ("breakfast" | "lunch" | "dinner" | "snack")[];
    active?: boolean;
  },
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("foodCatalog", {
      slug: options.slug,
      titles: { en: options.title },
      descriptions: { en: `${options.title} description` },
      goalTypes: ["gain"],
      mealTypes: options.mealTypes,
      serving: "1 bowl",
      calories: 500,
      proteinGrams: 30,
      carbsGrams: 50,
      fatGrams: 15,
      ingredients: ["oats"],
      searchText: `${options.title} oats`,
      active: options.active ?? true,
      version: 1,
    }),
  );
}

describe("foods.getMyScannedAndLoggedFoods", () => {
  it("rejects an unauthenticated caller", async () => {
    const t = setupTest();
    await expect(t.query(api.foods.getMyScannedAndLoggedFoods, {})).rejects.toThrow(
      /Unauthenticated/,
    );
  });

  it("returns only the caller's own entries", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");

    await owner.asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, foodName: "Mine" });
    await other.asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      foodName: "Theirs",
      clientRequestId: "req-other",
    });

    const mine = await owner.asUser.query(api.foods.getMyScannedAndLoggedFoods, {});
    expect(mine.map((item) => item.foodName)).toEqual(["Mine"]);
  });

  it("returns the newest entry first, which is the order the screen renders", async () => {
    const t = setupTest();
    const owner = await createUser(t);

    await owner.asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      foodName: "First",
      clientRequestId: "req-first",
    });
    await owner.asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      foodName: "Second",
      clientRequestId: "req-second",
    });

    const items = await owner.asUser.query(api.foods.getMyScannedAndLoggedFoods, {});
    expect(items.map((item) => item.foodName)).toEqual(["Second", "First"]);
  });

  it("honours the page size the screen asks for", async () => {
    const t = setupTest();
    const owner = await createUser(t);

    for (let index = 0; index < 4; index += 1) {
      await owner.asUser.mutation(api.foodLogs.create, {
        ...FOOD_ENTRY,
        foodName: `Meal ${index}`,
        clientRequestId: `req-${index}`,
      });
    }

    await expect(
      owner.asUser.query(api.foods.getMyScannedAndLoggedFoods, { limit: 2 }),
    ).resolves.toHaveLength(2);
  });

  it("clamps a limit past the ceiling instead of serving an unbounded read", async () => {
    const t = setupTest();
    const owner = await createUser(t);
    await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    // 150 is the ceiling the Foods tab pages towards; anything larger must not
    // widen the read. With one entry stored the assertion is that it answers at
    // all rather than rejecting the argument.
    await expect(
      owner.asUser.query(api.foods.getMyScannedAndLoggedFoods, { limit: 10_000 }),
    ).resolves.toHaveLength(1);
  });

  it("reports no image for an entry that has none", async () => {
    const t = setupTest();
    const owner = await createUser(t);
    await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    const [item] = await owner.asUser.query(api.foods.getMyScannedAndLoggedFoods, {});
    expect(item.imageUrl).toBeNull();
    expect(item.source).toBe("manual");
    expect(item.mealType).toBe("lunch");
  });
});

describe("foods.searchCatalog", () => {
  it("rejects an unauthenticated caller", async () => {
    const t = setupTest();
    await expect(
      t.query(api.foods.searchCatalog, { query: "oats", locale: "en" }),
    ).rejects.toThrow(/Unauthenticated/);
  });

  it("does not return inactive catalog rows", async () => {
    const t = setupTest();
    const owner = await createUser(t);
    await seedCatalogFood(t, { slug: "retired", title: "Retired bowl", mealTypes: ["lunch"] , active: false });

    const results = await owner.asUser.query(api.foods.searchCatalog, { query: "", locale: "en" });
    expect(results).toEqual([]);
  });

  it("applies the meal chip after the read, so a filtered search is not truncated away", async () => {
    const t = setupTest();
    const owner = await createUser(t);
    await seedCatalogFood(t, { slug: "a", title: "Morning oats", mealTypes: ["breakfast"] });
    await seedCatalogFood(t, { slug: "b", title: "Evening oats", mealTypes: ["dinner"] });

    const dinner = await owner.asUser.query(api.foods.searchCatalog, {
      query: "",
      locale: "en",
      mealType: "dinner",
    });
    expect(dinner.map((food) => food.slug)).toEqual(["b"]);
  });

  it("marks the caller's own favourites and nobody else's", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");
    const foodId = await seedCatalogFood(t, { slug: "fav", title: "Oat bowl", mealTypes: ["breakfast"] });

    await owner.asUser.mutation(api.foods.toggleFavorite, {
      referenceType: "catalog",
      referenceId: foodId as Id<"foodCatalog">,
    });

    const forOwner = await owner.asUser.query(api.foods.searchCatalog, { query: "", locale: "en" });
    const forOther = await other.asUser.query(api.foods.searchCatalog, { query: "", locale: "en" });
    expect(forOwner[0].isFavorite).toBe(true);
    expect(forOther[0].isFavorite).toBe(false);
  });

  it("falls back to English when the requested language has no title", async () => {
    const t = setupTest();
    const owner = await createUser(t);
    await seedCatalogFood(t, { slug: "fallback", title: "Oat bowl", mealTypes: ["breakfast"] });

    const results = await owner.asUser.query(api.foods.searchCatalog, { query: "", locale: "ja" });
    expect(results[0].title).toBe("Oat bowl");
  });
});
