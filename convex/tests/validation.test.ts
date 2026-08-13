import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import { createUser, FOOD_ENTRY, ONBOARDING_INPUT, setupTest} from "./setup";

/**
 * Server-side validation and idempotency.
 *
 * H-01, H-04, H-09 and M-10: a modified client must not be able to persist
 * implausible health data, and a retried write must not duplicate.
 */
describe("server validation", () => {
  it("recomputes the plan and ignores implausible client targets", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    const result = await asUser.mutation(api.onboarding.complete, {
      ...ONBOARDING_INPUT,
      // A modified client asking for a starvation target.
      suggestedTargets: {
        calories: 300,
        proteinGrams: 10,
        carbsGrams: 5,
        fatGrams: 2,
        source: "openai-v1",
      },
    });

    // Server baseline wins: the calorie floor holds.
    expect(result.calories).toBeGreaterThanOrEqual(1_200);
    expect(result.proteinGrams).toBeGreaterThan(10);
  });

  it("accepts AI targets that sit within 10% of the server baseline", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    const baseline = await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);
    const nudged = Math.round(baseline.calories * 1.05);

    const second = await asUser.mutation(api.onboarding.complete, {
      ...ONBOARDING_INPUT,
      suggestedTargets: {
        calories: nudged,
        proteinGrams: baseline.proteinGrams,
        carbsGrams: baseline.carbsGrams,
        fatGrams: baseline.fatGrams,
        source: "openai-v1",
      },
    });

    expect(second.calories).toBe(nudged);
  });

  it("rejects an onboarding payload for someone under 18", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.mutation(api.onboarding.complete, { ...ONBOARDING_INPUT, dateOfBirth: "2015-01-01" }),
    ).rejects.toThrow(/18/);
  });

  it("rejects out-of-range body metrics", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.mutation(api.onboarding.complete, { ...ONBOARDING_INPUT, heightCm: 40 }),
    ).rejects.toThrow(/heightCm/);
    await expect(
      asUser.mutation(api.onboarding.complete, { ...ONBOARDING_INPUT, currentWeightKg: 5 }),
    ).rejects.toThrow(/currentWeightKg/);
  });

  it("rejects a malformed effective date", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.mutation(api.onboarding.complete, { ...ONBOARDING_INPUT, effectiveFrom: "2026-02-31" }),
    ).rejects.toThrow(/effectiveFrom/);
  });

  it("rejects implausible macro targets, not only calories", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);
    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);

    await expect(
      asUser.mutation(api.nutritionGoals.createGoal, {
        calories: 2_000,
        proteinGrams: 5_000,
        carbsGrams: 200,
        fatGrams: 60,
        effectiveFrom: "2026-08-13",
        isManualOverride: true,
      }),
    ).rejects.toThrow(/proteinGrams/);
  });

  it("replaces rather than duplicates a goal for the same effective date", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);
    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);

    const args = {
      calories: 2_100,
      proteinGrams: 150,
      carbsGrams: 210,
      fatGrams: 70,
      effectiveFrom: "2026-08-13",
      isManualOverride: true,
    };
    const first = await asUser.mutation(api.nutritionGoals.createGoal, args);
    const second = await asUser.mutation(api.nutritionGoals.createGoal, {
      ...args,
      calories: 2_200,
    });

    expect(second).toBe(first);
    const active = await asUser.query(api.nutritionGoals.getActive, { localDate: "2026-08-13" });
    expect(active?.calories).toBe(2_200);
  });

  it("keeps historical goals when a new one is created for a later date", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);
    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);

    await asUser.mutation(api.nutritionGoals.createGoal, {
      calories: 2_500,
      proteinGrams: 160,
      carbsGrams: 250,
      fatGrams: 80,
      effectiveFrom: "2026-09-01",
      isManualOverride: true,
    });

    const august = await asUser.query(api.nutritionGoals.getActive, { localDate: "2026-08-20" });
    const september = await asUser.query(api.nutritionGoals.getActive, { localDate: "2026-09-05" });

    expect(august?.effectiveFrom).toBe(ONBOARDING_INPUT.effectiveFrom);
    expect(september?.calories).toBe(2_500);
  });

  it("rejects invalid nutrition on a food entry", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, calories: -5 }),
    ).rejects.toThrow(/calories/);
    await expect(
      asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, quantity: 0 }),
    ).rejects.toThrow(/quantity/);
  });

  it("bounds free-text fields", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, foodName: "x".repeat(500) }),
    ).rejects.toThrow(/foodName/);
    await expect(
      asUser.mutation(api.weights.create, {
        normalizedKg: 70,
        displayValue: 70,
        displayUnit: "kg",
        localDate: "2026-08-13",
        timezone: "Europe/Berlin",
        note: "n".repeat(2_000),
        clientRequestId: "w-long",
      }),
    ).rejects.toThrow(/note/);
  });

  it("rejects an invalid timezone", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, timezone: "not a zone!!" }),
    ).rejects.toThrow(/timezone/);
  });

  it("rejects a malformed local date on reads", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(asUser.query(api.foodLogs.getDay, { localDate: "13-08-2026" })).rejects.toThrow(
      /localDate/,
    );
  });

  it("refuses to update a profile that onboarding never created", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    // The server no longer fabricates a profile out of defaults.
    await expect(asUser.mutation(api.profiles.update, { heightCm: 180 })).rejects.toThrow(
      /onboarding/i,
    );
  });
});

describe("idempotency", () => {
  it("returns the same food log for a repeated client request id", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    const first = await asUser.mutation(api.foodLogs.create, FOOD_ENTRY);
    const second = await asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    expect(second).toBe(first);
    await expect(
      asUser.query(api.foodLogs.getDay, { localDate: FOOD_ENTRY.localDate }),
    ).resolves.toHaveLength(1);
  });

  it("returns the same weight entry for a repeated client request id", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    const args = {
      normalizedKg: 70,
      displayValue: 70,
      displayUnit: "kg" as const,
      localDate: "2026-08-13",
      timezone: "Europe/Berlin",
      clientRequestId: "w-same",
    };
    const first = await asUser.mutation(api.weights.create, args);
    const second = await asUser.mutation(api.weights.create, args);

    expect(second).toBe(first);
    await expect(asUser.query(api.weights.getHistory, {})).resolves.toHaveLength(1);
  });

  it("does not let one user's request id collide with another's", async () => {
    const t = setupTest();
    const a = await createUser(t, "user_a");
    const b = await createUser(t, "user_b");

    const first = await a.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);
    const second = await b.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    expect(second).not.toBe(first);
  });
});

describe("query limits", () => {
  it("clamps a client-supplied history limit", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    for (let index = 0; index < 5; index += 1) {
      await asUser.mutation(api.weights.create, {
        normalizedKg: 70 + index,
        displayValue: 70 + index,
        displayUnit: "kg",
        localDate: `2026-08-0${index + 1}`,
        timezone: "Europe/Berlin",
        clientRequestId: `w-${index}`,
      });
    }

    // An absurd limit is bounded rather than honoured.
    await expect(asUser.query(api.weights.getHistory, { limit: 100_000 })).resolves.toHaveLength(5);
    await expect(asUser.query(api.weights.getHistory, { limit: 2 })).resolves.toHaveLength(2);
  });

  it("rejects an inverted date range", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    await expect(
      asUser.query(api.foodLogs.getHistory, { fromDate: "2026-09-01", toDate: "2026-08-01" }),
    ).rejects.toThrow(/fromDate/);
  });
});
