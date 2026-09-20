import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import { shiftLocalDate } from "../lib/entitlements";
import { claimUpload, createUser, FOOD_ENTRY, grantPro, setupTest, todayLocalDate } from "./setup";

describe("server-enforced history entitlement", () => {
  it("clamps premium date windows for a free account without throwing", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "history_free");

    await expect(
      asUser.query(api.foodLogs.getHistory, {
        fromDate: "2000-01-01",
        toDate: "2000-01-31",
      }),
    ).resolves.toEqual([]);
    await expect(
      asUser.query(api.weights.getHistory, {
        fromDate: "2000-01-01",
        toDate: "2000-01-31",
      }),
    ).resolves.toEqual([]);
    await expect(
      asUser.query(api.dashboard.getDailyCalorieSeries, {
        fromDate: "2000-01-01",
        toDate: "2000-01-31",
      }),
    ).resolves.toEqual([]);
  });

  it("allows the same bounded windows with a verified Pro mirror", async () => {
    const t = setupTest();
    const { asUser, subject } = await createUser(t, "history_pro");
    await grantPro(t, subject);

    await expect(
      asUser.query(api.foodLogs.getHistory, {
        fromDate: "2000-01-01",
        toDate: "2000-01-31",
      }),
    ).resolves.toEqual([]);
    await expect(
      asUser.query(api.weights.getHistory, {
        fromDate: "2000-01-01",
        toDate: "2000-01-31",
      }),
    ).resolves.toEqual([]);
  });

  it("does not leak older meals through the Foods reuse list for a free account", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "history_free_reuse");

    const today = todayLocalDate();
    const oldDate = shiftLocalDate(today, -30);
    await asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, localDate: oldDate, clientRequestId: "recent-old" });
    const storageId = await claimUpload(t, asUser, "mealPhoto");
    await asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      localDate: today,
      imageStorageId: storageId,
      clientRequestId: "recent-new",
    });

    const items = await asUser.query(api.foods.getMyScannedAndLoggedFoods, { limit: 60 });
    expect(items.map((item) => item.localDate)).toEqual([today]);
  });

  it("keeps the full reuse list for a verified Pro account", async () => {
    const t = setupTest();
    const { asUser, subject } = await createUser(t, "history_pro_reuse");
    await grantPro(t, subject);

    const today = todayLocalDate();
    await asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      localDate: shiftLocalDate(today, -30),
      clientRequestId: "reuse-old",
    });
    await asUser.mutation(api.foodLogs.create, { ...FOOD_ENTRY, localDate: today, clientRequestId: "reuse-new" });

    const items = await asUser.query(api.foods.getMyScannedAndLoggedFoods, { limit: 60 });
    expect(items).toHaveLength(2);
  });
});
