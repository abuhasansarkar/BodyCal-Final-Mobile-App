import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { normalizeEstimate } from "../ai";
import { claimUpload, createUser, grantPro, setupTest } from "./setup";

describe("scan corrections and estimate bounds", () => {
  it("persists user corrections to a completed scan", async () => {
    const t = setupTest();
    const { asUser, subject, userId } = await createUser(t);
    await grantPro(t, subject);

    const storageId = await claimUpload(t, asUser, "mealScan");
    const originalEstimate = {
      isFood: true,
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
      calorieRange: { minCalories: 450, maxCalories: 550 },
      confidence: "high" as const,
      portionConfidence: 0.9,
      assumptions: [],
      warnings: [],
    };

    const scanId = await t.run(async (ctx) =>
      ctx.db.insert("aiScans", {
        userId,
        requestId: "scan-correction-test",
        imageStorageId: storageId,
        status: "completed" as const,
        provider: "openai",
        model: "test-model",
        locale: "en",
        estimate: originalEstimate,
        confidence: "high",
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );

    const corrected = {
      ...originalEstimate,
      mealName: "Custom Chicken & Rice Bowl",
      nutrition: { ...originalEstimate.nutrition, calories: 550 },
    };

    await asUser.mutation(api.aiDb.recordCorrection, {
      scanId,
      correctedEstimate: corrected,
    });

    const fetched = await asUser.query(api.aiDb.getScan, { scanId });
    expect(fetched?.estimate?.mealName).toBe("Custom Chicken & Rice Bowl");
    expect(fetched?.estimate?.nutrition.calories).toBe(550);
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
