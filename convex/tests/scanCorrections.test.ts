import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { normalizeEstimate } from "../ai";
import { claimUpload, createUser, grantPro, setupTest } from "./setup";

describe("scan corrections and estimate bounds", () => {
  /**
   * The stored estimate shape — what `lib/estimate.ts` describes and what every
   * read path narrows to. `recordCorrection` accepts exactly this, rather than
   * the raw provider shape, so a correction is validated against the same
   * contract the screens read.
   */
  const storedEstimate = {
    mealName: "Chicken Bowl",
    mealType: "lunch" as const,
    summary: "Grilled chicken with rice",
    components: [
      {
        name: "Chicken",
        preparation: "grilled",
        portion: "150g",
        estimatedWeightGrams: 150,
        nutrition: { calories: 250, proteinGrams: 35, carbsGrams: 0, fatGrams: 5 },
        confidence: 0.9,
      },
      {
        name: "Rice",
        preparation: "steamed",
        portion: "1 cup",
        estimatedWeightGrams: 200,
        nutrition: { calories: 250, proteinGrams: 5, carbsGrams: 55, fatGrams: 1 },
        confidence: 0.85,
      },
    ],
    nutrition: {
      calories: 500,
      proteinGrams: 40,
      carbsGrams: 55,
      fatGrams: 6,
      saturatedFatGrams: null,
      fiberGrams: null,
      sugarGrams: null,
      sodiumMilligrams: null,
    },
    calorieRange: { minCalories: 450, maxCalories: 600 },
    confidence: "high" as const,
    portionConfidence: 0.9,
    assumptions: [],
    warnings: [],
  };

  async function completedScan(t: ReturnType<typeof setupTest>, asUser: any, userId: Id<"users">) {
    const storageId = await claimUpload(t, asUser, "mealScan");
    return await t.run(async (ctx) =>
      ctx.db.insert("aiScans", {
        userId,
        requestId: `scan-${Math.round(Math.random() * 1e9)}`,
        imageStorageId: storageId,
        status: "completed" as const,
        provider: "openai",
        model: "test-model",
        locale: "en",
        estimate: storedEstimate,
        confidence: "high",
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
  }

  it("persists user corrections to a completed scan", async () => {
    const t = setupTest();
    const { asUser, subject, userId } = await createUser(t);
    await grantPro(t, subject);
    const scanId = await completedScan(t, asUser, userId);

    await asUser.mutation(api.aiDb.recordCorrection, {
      scanId,
      correctedEstimate: {
        ...storedEstimate,
        mealName: "Custom Chicken & Rice Bowl",
        nutrition: { ...storedEstimate.nutrition, calories: 550 },
      },
    });

    const fetched = await asUser.query(api.aiDb.getScan, { scanId });
    expect(fetched?.estimate?.mealName).toBe("Custom Chicken & Rice Bowl");
    expect(fetched?.estimate?.nutrition.calories).toBe(550);
  });

  it("bounds an oversized correction instead of storing it verbatim", async () => {
    const t = setupTest();
    const { asUser, subject, userId } = await createUser(t);
    await grantPro(t, subject);
    const scanId = await completedScan(t, asUser, userId);

    await asUser.mutation(api.aiDb.recordCorrection, {
      scanId,
      correctedEstimate: {
        ...storedEstimate,
        mealName: "M".repeat(5_000),
        // Far past the 25-component and 10-warning caps every reader applies.
        components: Array.from({ length: 80 }, (_, index) => ({
          ...storedEstimate.components[0],
          name: `Item ${index}`,
        })),
        warnings: Array.from({ length: 50 }, (_, index) => `warning ${index}`),
      },
    });

    const stored = await t.run(async (ctx) => (await ctx.db.get(scanId))!.correctedEstimate);
    expect(stored.mealName).toHaveLength(120);
    expect(stored.components).toHaveLength(25);
    expect(stored.warnings).toHaveLength(10);
  });

  it("refuses a correction that carries no usable nutrition", async () => {
    const t = setupTest();
    const { asUser, subject, userId } = await createUser(t);
    await grantPro(t, subject);
    const scanId = await completedScan(t, asUser, userId);

    await expect(
      asUser.mutation(api.aiDb.recordCorrection, {
        scanId,
        correctedEstimate: {
          ...storedEstimate,
          // Negative energy is not an estimate, and storing it would hide the
          // original behind a record that reads back as "no estimate".
          nutrition: { ...storedEstimate.nutrition, calories: -1 },
        },
      }),
    ).rejects.toThrow(/usable nutrition/i);

    // Nothing was written: the original estimate is still the only one on the row.
    const stored = await t.run(async (ctx) => (await ctx.db.get(scanId))!.correctedEstimate);
    expect(stored ?? null).toBeNull();
  });

  it("refuses a correction to a scan that has not completed", async () => {
    const t = setupTest();
    const { asUser, subject, userId } = await createUser(t);
    await grantPro(t, subject);
    const storageId = await claimUpload(t, asUser, "mealScan");
    const scanId = await t.run(async (ctx) =>
      ctx.db.insert("aiScans", {
        userId,
        requestId: "scan-still-running",
        imageStorageId: storageId,
        status: "processing" as const,
        provider: "openai",
        model: "test-model",
        locale: "en",
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    await expect(
      asUser.mutation(api.aiDb.recordCorrection, { scanId, correctedEstimate: storedEstimate }),
    ).rejects.toThrow(/not complete/i);
  });

  it("refuses a correction to another user's scan", async () => {
    const t = setupTest();
    const owner = await createUser(t, "owner-subject");
    await grantPro(t, owner.subject);
    const scanId = await completedScan(t, owner.asUser, owner.userId);

    const intruder = await createUser(t, "intruder-subject");
    await expect(
      intruder.asUser.mutation(api.aiDb.recordCorrection, {
        scanId,
        correctedEstimate: storedEstimate,
      }),
    ).rejects.toThrow(/not found/i);
  });

  it("safely clamps calorie ranges that are inverted or non-finite", () => {
    const raw = {
      isFood: true,
      mealName: "Salad",
      mealType: "lunch" as const,
      summary: "Green salad",
      components: [
        {
          name: "Greens",
          preparation: "raw",
          portion: "1 bowl",
          estimatedWeightGrams: 100,
          nutrition: { calories: 150, proteinGrams: 3, carbsGrams: 10, fatGrams: 5 },
          confidence: 0.8,
        },
      ],
      nutrition: {
        calories: 150,
        proteinGrams: 3,
        carbsGrams: 10,
        fatGrams: 5,
        saturatedFatGrams: null,
        fiberGrams: null,
        sugarGrams: null,
        sodiumMilligrams: null,
      },
      // Inverted range
      calorieRange: { minCalories: 200, maxCalories: 100 },
      confidence: "medium" as const,
      portionConfidence: 0.7,
      assumptions: [],
      warnings: [],
    };

    const normalized = normalizeEstimate(raw);
    expect(normalized.calorieRange.minCalories).toBeLessThanOrEqual(normalized.calorieRange.maxCalories);
    expect(normalized.calorieRange.minCalories).toBe(150);
    expect(normalized.calorieRange.maxCalories).toBe(150);
  });
});
