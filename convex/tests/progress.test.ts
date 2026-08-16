import { describe, expect, it } from "@jest/globals";
import { api } from "../_generated/api";
import { createUser, ONBOARDING_INPUT, setupTest } from "./setup";

describe("progress and dashboard analytics", () => {
  it("handles empty and sparse weight progress records gracefully", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_progress_1", "progress1@example.com");

    // 1. Initial state with onboarding complete but no weight logs
    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);

    const initialProgress = await asUser.query(api.weights.getProgress, {});
    expect(initialProgress).not.toBeNull();
    expect(initialProgress?.entryCount).toBe(0);
    expect(initialProgress?.startWeightKg).toBeNull();
    expect(initialProgress?.latestWeightKg).toBeNull();
    expect(initialProgress?.profileWeightKg).toBe(70);
    expect(initialProgress?.goalWeightKg).toBe(65);

    // 2. Single weight entry
    await asUser.mutation(api.weights.create, {
      normalizedKg: 67.5,
      displayValue: 67.5,
      displayUnit: "kg",
      localDate: "2026-08-01",
      timezone: "America/New_York",
      clientRequestId: "req_weight_1",
    });

    const singleLogProgress = await asUser.query(api.weights.getProgress, {});
    expect(singleLogProgress?.entryCount).toBe(1);
    expect(singleLogProgress?.startWeightKg).toBe(67.5);
    expect(singleLogProgress?.latestWeightKg).toBe(67.5);
    expect(singleLogProgress?.startLocalDate).toBe("2026-08-01");
    expect(singleLogProgress?.latestLocalDate).toBe("2026-08-01");

    // 3. Second weight entry later
    await asUser.mutation(api.weights.create, {
      normalizedKg: 65.0,
      displayValue: 65.0,
      displayUnit: "kg",
      localDate: "2026-08-15",
      timezone: "America/New_York",
      clientRequestId: "req_weight_2",
    });

    const twoLogsProgress = await asUser.query(api.weights.getProgress, {});
    expect(twoLogsProgress?.entryCount).toBe(2);
    expect(twoLogsProgress?.startWeightKg).toBe(67.5);
    expect(twoLogsProgress?.latestWeightKg).toBe(65.0);
    expect(twoLogsProgress?.startLocalDate).toBe("2026-08-01");
    expect(twoLogsProgress?.latestLocalDate).toBe("2026-08-15");
  });

  it("calculates logging streak across consecutive and broken days", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_streak_1", "streak1@example.com");

    // Empty streak
    const streak0 = await asUser.query(api.dashboard.getLoggingStreak, {
      todayLocalDate: "2026-08-16",
    });
    expect(streak0).toBe(0);

    // Log for today
    await asUser.mutation(api.foodLogs.create, {
      foodName: "Apple",
      serving: "1 medium",
      servingUnit: "serving",
      quantity: 1,
      mealType: "snack",
      calories: 95,
      proteinGrams: 0.5,
      carbsGrams: 25,
      fatGrams: 0.3,
      source: "manual",
      localDate: "2026-08-16",
      timezone: "UTC",
      clientRequestId: "req_food_1",
    });

    const streak1 = await asUser.query(api.dashboard.getLoggingStreak, {
      todayLocalDate: "2026-08-16",
    });
    expect(streak1).toBe(1);

    // Log for yesterday and day before
    await asUser.mutation(api.foodLogs.create, {
      foodName: "Oatmeal",
      serving: "1 bowl",
      servingUnit: "bowl",
      quantity: 1,
      mealType: "breakfast",
      calories: 300,
      proteinGrams: 10,
      carbsGrams: 50,
      fatGrams: 5,
      source: "manual",
      localDate: "2026-08-15",
      timezone: "UTC",
      clientRequestId: "req_food_2",
    });

    await asUser.mutation(api.foodLogs.create, {
      foodName: "Salad",
      serving: "1 bowl",
      servingUnit: "bowl",
      quantity: 1,
      mealType: "lunch",
      calories: 250,
      proteinGrams: 15,
      carbsGrams: 20,
      fatGrams: 10,
      source: "manual",
      localDate: "2026-08-14",
      timezone: "UTC",
      clientRequestId: "req_food_3",
    });

    const streak3 = await asUser.query(api.dashboard.getLoggingStreak, {
      todayLocalDate: "2026-08-16",
    });
    expect(streak3).toBe(3);

    // If today is not logged yet but yesterday was, streak remains active
    const streakYesterday = await asUser.query(api.dashboard.getLoggingStreak, {
      todayLocalDate: "2026-08-17",
    });
    expect(streakYesterday).toBe(3);

    // If missing for 2 days, streak resets to 0
    const streakBroken = await asUser.query(api.dashboard.getLoggingStreak, {
      todayLocalDate: "2026-08-20",
    });
    expect(streakBroken).toBe(0);
  });

  it("aggregates daily calorie series across multiple entries per day", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_series_1", "series1@example.com");

    // Two entries on 2026-08-10
    await asUser.mutation(api.foodLogs.create, {
      foodName: "Eggs",
      serving: "2 large",
      servingUnit: "serving",
      quantity: 1,
      mealType: "breakfast",
      calories: 140,
      proteinGrams: 12,
      carbsGrams: 1,
      fatGrams: 10,
      source: "manual",
      localDate: "2026-08-10",
      timezone: "UTC",
      clientRequestId: "req_series_1",
    });

    await asUser.mutation(api.foodLogs.create, {
      foodName: "Rice & Chicken",
      serving: "1 plate",
      servingUnit: "plate",
      quantity: 1,
      mealType: "dinner",
      calories: 650,
      proteinGrams: 45,
      carbsGrams: 70,
      fatGrams: 15,
      source: "manual",
      localDate: "2026-08-10",
      timezone: "UTC",
      clientRequestId: "req_series_2",
    });

    // One entry on 2026-08-12
    await asUser.mutation(api.foodLogs.create, {
      foodName: "Protein Shake",
      serving: "1 scoop",
      servingUnit: "scoop",
      quantity: 1,
      mealType: "snack",
      calories: 200,
      proteinGrams: 30,
      carbsGrams: 5,
      fatGrams: 3,
      source: "manual",
      localDate: "2026-08-12",
      timezone: "UTC",
      clientRequestId: "req_series_3",
    });

    const series = await asUser.query(api.dashboard.getDailyCalorieSeries, {
      fromDate: "2026-08-01",
      toDate: "2026-08-15",
    });

    expect(series).toHaveLength(2);
    expect(series[0]).toEqual({ localDate: "2026-08-10", calories: 790, entryCount: 2 });
    expect(series[1]).toEqual({ localDate: "2026-08-12", calories: 200, entryCount: 1 });
  });
});
