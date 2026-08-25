import { describe, expect, it } from "@jest/globals";

import { api, internal } from "../_generated/api";
import { assertAdultDateOfBirth } from "../lib/validation";
import { createUser, localDateOffset, setupTest, TODAY } from "./setup";

/**
 * Regressions for the findings of the full-codebase review.
 *
 * Each test names the defect it guards, because every one of these is a case
 * where the code did something plausible and wrong rather than throwing.
 */

describe("adult age window", () => {
  const now = new Date(Date.UTC(2026, 7, 24));

  it("admits the exact boundaries", () => {
    expect(assertAdultDateOfBirth("2008-08-24", now)).toBe("2008-08-24");
    expect(assertAdultDateOfBirth("1946-08-24", now)).toBe("1946-08-24");
  });

  /**
   * The check subtracted birth *years* and then allowed a year of slack either
   * side, so the 18–80 window it advertised actually accepted 17 and 81.
   */
  it("refuses someone a day short of eighteen", () => {
    expect(() => assertAdultDateOfBirth("2008-08-25", now)).toThrow(/18 to 80/);
  });

  it("refuses someone a day past eighty-one", () => {
    expect(() => assertAdultDateOfBirth("1945-08-24", now)).toThrow(/18 to 80/);
  });

  /** The `YYYY-01-01` that onboarding derives has to keep round-tripping. */
  it("accepts a derived 1 January birthday for an eighteen-year-old", () => {
    expect(assertAdultDateOfBirth("2008-01-01", now)).toBe("2008-01-01");
  });
});

describe("export pagination", () => {
  /**
   * `collectExport` used to `.collect()` every row of every user table in one
   * query. Past Convex's per-query read limit that threw, and the account with
   * the most data was the one that could never get it out.
   */
  it("walks every table by cursor and returns each row exactly once", async () => {
    const t = setupTest();
    const { asUser, userId } = await createUser(t);

    for (let index = 0; index < 12; index += 1) {
      await asUser.mutation(api.weights.create, {
        normalizedKg: 70 + index * 0.1,
        displayValue: 70 + index * 0.1,
        displayUnit: "kg",
        localDate: TODAY,
        timezone: "Europe/Berlin",
        clientRequestId: `export-${index}`,
      });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let guard = 0;
    do {
      const page: { table: string; rows: { _id: string }[]; continueCursor: string | null } =
        await t.query(internal.usersDb.collectExportPage, {
          userId,
          // weightLogs is index 1 in EXPORTED_TABLES.
          tableIndex: 1,
          cursor,
        });
      expect(page.table).toBe("weightLogs");
      seen.push(...page.rows.map((row) => row._id));
      cursor = page.continueCursor;
      guard += 1;
    } while (cursor !== null && guard < 20);

    expect(seen).toHaveLength(12);
    expect(new Set(seen).size).toBe(12);
  });
});

describe("maintenance sweeps drain", () => {
  /**
   * Both of these read the head of an unindexed table and filtered in
   * JavaScript, so once the head held unexpired rows nothing behind it was ever
   * reached — the sweeps reported success and collected nothing.
   */
  it("deletes an expired export archive that sits behind unexpired rows", async () => {
    const t = setupTest();
    const { userId } = await createUser(t);
    const now = Date.now();

    const expiredId = await t.run(async (ctx) =>
      ctx.db.insert("exportJobs", {
        userId,
        status: "complete" as const,
        expiresAt: now - 60_000,
        createdAt: now - 120_000,
        updatedAt: now - 120_000,
      }),
    );
    // Written after it, and unexpired: under the old head-of-table read these
    // would have been all it ever looked at.
    await t.run(async (ctx) => {
      for (let index = 0; index < 5; index += 1) {
        await ctx.db.insert("exportJobs", {
          userId,
          status: "complete" as const,
          expiresAt: now + 600_000,
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    const result = await t.mutation(internal.maintenance.deleteExpiredExports, {});
    expect(result.deleted).toBe(1);

    const remaining = await t.run(async (ctx) => ctx.db.query("exportJobs").collect());
    expect(remaining).toHaveLength(5);
    expect(remaining.some((job) => job._id === expiredId)).toBe(false);
  });

  it("leaves a pending export alone, since it has no expiry yet", async () => {
    const t = setupTest();
    const { userId } = await createUser(t);

    await t.run(async (ctx) =>
      ctx.db.insert("exportJobs", {
        userId,
        status: "pending" as const,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const result = await t.mutation(internal.maintenance.deleteExpiredExports, {});
    expect(result.deleted).toBe(0);
    await expect(
      t.run(async (ctx) => ctx.db.query("exportJobs").collect()),
    ).resolves.toHaveLength(1);
  });

  it("prunes a stale rate-limit counter and keeps a current one", async () => {
    const t = setupTest();
    const now = Date.now();

    await t.run(async (ctx) => {
      await ctx.db.insert("rateLimits", {
        key: "aiScan:old",
        windowStart: now - 72 * 60 * 60 * 1_000,
        count: 3,
      });
      await ctx.db.insert("rateLimits", { key: "aiScan:current", windowStart: now, count: 1 });
    });

    const result = await t.mutation(internal.maintenance.pruneRateLimits, {});
    expect(result.deleted).toBe(1);

    const remaining = await t.run(async (ctx) => ctx.db.query("rateLimits").collect());
    expect(remaining.map((row) => row.key)).toEqual(["aiScan:current"]);
  });
});

describe("catalog search", () => {
  /**
   * `searchCatalog` took `limit` rows and *then* dropped the ones that did not
   * match the meal type, so a filtered search returned whatever fraction of the
   * first page happened to match and the rest of the catalog looked absent.
   */
  it("returns a full page of breakfast items even when they are not the first rows", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await t.run(async (ctx) => {
      // Twenty dinners first, then five breakfasts behind them.
      for (let index = 0; index < 20; index += 1) {
        await ctx.db.insert("foodCatalog", {
          slug: `dinner-${index}`,
          titles: { en: `Dinner ${index}` },
          descriptions: { en: "" },
          goalTypes: ["maintain" as const],
          mealTypes: ["dinner" as const],
          serving: "1 plate",
          calories: 500,
          proteinGrams: 30,
          carbsGrams: 50,
          fatGrams: 20,
          ingredients: [],
          active: true,
          version: 1,
        });
      }
      for (let index = 0; index < 5; index += 1) {
        await ctx.db.insert("foodCatalog", {
          slug: `breakfast-${index}`,
          titles: { en: `Breakfast ${index}` },
          descriptions: { en: "" },
          goalTypes: ["maintain" as const],
          mealTypes: ["breakfast" as const],
          serving: "1 bowl",
          calories: 300,
          proteinGrams: 12,
          carbsGrams: 40,
          fatGrams: 8,
          ingredients: [],
          active: true,
          version: 1,
        });
      }
    });

    const results = await asUser.query(api.foods.searchCatalog, {
      query: "",
      locale: "en",
      mealType: "breakfast",
      limit: 10,
    });

    expect(results).toHaveLength(5);
    expect(results.every((food) => food.mealTypes.includes("breakfast"))).toBe(true);
  });
});

describe("goal history stays anchored to its effective date", () => {
  it("does not rewrite an earlier day's targets", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);
    await asUser.mutation(api.onboarding.complete, {
      dateOfBirth: "1994-01-01",
      dateOfBirthPrecision: "year" as const,
      calculationBasis: "female" as const,
      heightCm: 165,
      currentWeightKg: 70,
      goalWeightKg: 65,
      weightUnit: "kg" as const,
      heightUnit: "cm" as const,
      activityLevel: "light" as const,
      goalType: "lose" as const,
      goalPace: "recommended" as const,
      locale: "en",
      timezone: "Europe/Berlin",
      effectiveFrom: TODAY,
    });

    await asUser.mutation(api.nutritionGoals.createGoal, {
      calories: 2_400,
      proteinGrams: 150,
      carbsGrams: 240,
      fatGrams: 75,
      effectiveFrom: localDateOffset(5),
      isManualOverride: true,
    });

    const today = await asUser.query(api.nutritionGoals.getActive, { localDate: TODAY });
    const later = await asUser.query(api.nutritionGoals.getActive, {
      localDate: localDateOffset(6),
    });

    expect(today?.effectiveFrom).toBe(TODAY);
    expect(later?.calories).toBe(2_400);
  });
});

describe("settings.get across auth transitions", () => {
  /**
   * The client subscribes to this from a provider that also renders for a
   * signed-out visitor, because `ConvexUserGate` passes children straight
   * through when nobody is signed in. Throwing meant the welcome screen logged
   * `Uncaught ConvexError: Unauthenticated` before anyone had an account.
   */
  it("returns null for a caller with no identity instead of throwing", async () => {
    const t = setupTest();
    await expect(t.query(api.settings.get, {})).resolves.toBeNull();
  });

  /** Signed in to Clerk, but `syncFromClerk` has not landed yet. */
  it("returns null when the identity has no user row yet", async () => {
    const t = setupTest();
    const asStranger = t.withIdentity({
      subject: "user_never_synced",
      issuer: "https://example.clerk.accounts.dev",
      tokenIdentifier: "test|user_never_synced",
    });

    await expect(asStranger.query(api.settings.get, {})).resolves.toBeNull();
  });

  it("still returns the signed-in user's own settings", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await asUser.mutation(api.settings.update, { languageMode: "manual", language: "de" });

    const settings = await asUser.query(api.settings.get, {});
    expect(settings?.language).toBe("de");
    expect(settings?.languageMode).toBe("manual");
  });
});
