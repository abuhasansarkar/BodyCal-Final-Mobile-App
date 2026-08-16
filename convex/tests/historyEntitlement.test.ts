import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import { createUser, grantPro, setupTest } from "./setup";

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
});
