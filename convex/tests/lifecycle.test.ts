import { describe, expect, it } from "@jest/globals";

import { api, internal } from "../_generated/api";
import { claimUpload, createUser, FOOD_ENTRY, ONBOARDING_INPUT, settle, setupTest } from "./setup";

/**
 * Account lifecycle: export and deletion.
 *
 * C-02 and C-03 were both caused by iterating user tables through a `by_user`
 * index that four of them did not define. These tests exercise the whole loop, so
 * a table added without that index fails here instead of in production.
 */
describe("data export", () => {
  it("collects every user-scoped table without throwing", async () => {
    const t = setupTest();
    const { asUser, userId } = await createUser(t);

    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);
    await asUser.mutation(api.foodLogs.create, FOOD_ENTRY);
    await asUser.mutation(api.weights.create, {
      normalizedKg: 70,
      displayValue: 70,
      displayUnit: "kg",
      localDate: "2026-08-13",
      timezone: "Europe/Berlin",
      clientRequestId: "w-1",
    });

    const data = await t.query(internal.usersDb.collectExport, { userId });

    expect(data).not.toBeNull();
    expect(data?.foodLogs).toHaveLength(1);
    expect(data?.weightLogs).toHaveLength(1);
    expect(data?.nutritionGoals).toHaveLength(1);
    expect(data?.userProfiles).toHaveLength(1);
  });

  it("reuses a pending export instead of stacking duplicates", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    const first = await asUser.mutation(api.users.requestExport, {});
    const second = await asUser.mutation(api.users.requestExport, {});
    expect(second).toBe(first);
    await settle(t);
  });

  it("rate limits repeated export requests", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t);

    // Complete each job so the next request is not simply deduplicated.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const jobId = await asUser.mutation(api.users.requestExport, {});
      await t.run(async (ctx) => {
        await ctx.db.patch(jobId, { status: "failed", updatedAt: Date.now() });
      });
    }

    await expect(asUser.mutation(api.users.requestExport, {})).rejects.toThrow();
    await settle(t);
  });
});

describe("account deletion", () => {
  it("clears every user-scoped table", async () => {
    const t = setupTest();
    const { asUser, userId } = await createUser(t);

    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);
    await asUser.mutation(api.foodLogs.create, FOOD_ENTRY);
    await asUser.mutation(api.weights.create, {
      normalizedKg: 70,
      displayValue: 70,
      displayUnit: "kg",
      localDate: "2026-08-13",
      timezone: "Europe/Berlin",
      clientRequestId: "w-1",
    });
    await claimUpload(t, asUser, "mealPhoto");

    // Drive the batch loop the way the action does.
    for (let guard = 0; guard < 50; guard += 1) {
      const result = await t.mutation(internal.usersDb.clearUserDataBatch, { userId });
      if (result.done) break;
    }

    const remaining = await t.run(async (ctx) => ({
      foodLogs: await ctx.db.query("foodLogs").collect(),
      weightLogs: await ctx.db.query("weightLogs").collect(),
      goals: await ctx.db.query("nutritionGoals").collect(),
      profiles: await ctx.db.query("userProfiles").collect(),
      uploads: await ctx.db.query("imageUploads").collect(),
    }));

    expect(remaining.foodLogs).toHaveLength(0);
    expect(remaining.weightLogs).toHaveLength(0);
    expect(remaining.goals).toHaveLength(0);
    expect(remaining.profiles).toHaveLength(0);
    expect(remaining.uploads).toHaveLength(0);
  });

  /** M-19: feedback used to survive deletion, pointing at a user that no longer existed. */
  it("clears post-purchase feedback", async () => {
    const t = setupTest();
    const { asUser, userId } = await createUser(t);

    await asUser.mutation(api.feedback.submit, { rating: 5, locale: "en", feedback: "Great" });

    for (let guard = 0; guard < 50; guard += 1) {
      const result = await t.mutation(internal.usersDb.clearUserDataBatch, { userId });
      if (result.done) break;
    }

    const feedback = await t.run(async (ctx) => ctx.db.query("userFeedback").collect());
    expect(feedback).toHaveLength(0);
  });

  it("is idempotent: clearing an already-empty account reports done", async () => {
    const t = setupTest();
    const { userId } = await createUser(t);

    await expect(t.mutation(internal.usersDb.clearUserDataBatch, { userId })).resolves.toMatchObject(
      { done: true },
    );
  });

  it("lets a user retry after a failed deletion", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_retry");

    const jobId = await asUser.mutation(api.users.requestDeletion, {});
    await settle(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(jobId, { status: "failed", errorCategory: "clerk_delete_failed" });
    });

    // requireUserRecord, not requireCurrentUser, so a deletionPending user is not locked out.
    await expect(asUser.mutation(api.users.requestDeletion, {})).resolves.toBe(jobId);
    await settle(t);

    const status = await asUser.query(api.users.getDeletionStatus, {});
    expect(status?.status).toBe("pending");
  });

  it("lets a user cancel a failed deletion and keep the account", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_cancel");

    const jobId = await asUser.mutation(api.users.requestDeletion, {});
    await settle(t);
    await t.run(async (ctx) => {
      await ctx.db.patch(jobId, { status: "failed" });
    });

    await asUser.mutation(api.users.cancelDeletion, {});

    const user = await asUser.query(api.users.getCurrent, {});
    expect(user?.lifecycleState).toBe("active");
  });

  it("refuses to cancel a deletion that is still in progress", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_inflight");

    await asUser.mutation(api.users.requestDeletion, {});
    await expect(asUser.mutation(api.users.cancelDeletion, {})).rejects.toThrow(/in progress/i);
    await settle(t);
  });

  it("refuses to finalize before the data is cleared", async () => {
    const t = setupTest();
    const { asUser, userId } = await createUser(t);
    await asUser.mutation(api.onboarding.complete, ONBOARDING_INPUT);
    const jobId = await asUser.mutation(api.users.requestDeletion, {});
    await settle(t);

    await expect(t.mutation(internal.usersDb.finalizeDeletion, { jobId, userId })).rejects.toThrow(
      /not_cleared/,
    );
  });
});
