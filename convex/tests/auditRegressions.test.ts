import { describe, expect, it } from "@jest/globals";

import { api, internal } from "../_generated/api";
import { claimUpload, createUser, grantPro, setupTest } from "./setup";

/**
 * Regressions from the production readiness audit.
 *
 * Each test here reproduces a failure that shipped, so they are written to fail
 * against the previous behaviour rather than merely to exercise the new code.
 */

describe("upload claim cap", () => {
  it("does not count attached uploads against the outstanding cap", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_upload_cap");

    /*
      The cap is 20 outstanding claims. Attaching them used to leave them
      counted, so an account that had simply *used* the app 21 times could never
      upload again — the AI scan feature died permanently for its best users.
    */
    for (let index = 0; index < 25; index += 1) {
      const storageId = await claimUpload(t, asUser, "mealPhoto");
      await t.run(async (ctx) => {
        const upload = await ctx.db
          .query("imageUploads")
          .withIndex("by_storage", (q) => q.eq("storageId", storageId))
          .unique();
        if (upload) await ctx.db.patch(upload._id, { attachedAt: Date.now() });
      });
    }

    await expect(asUser.mutation(api.uploads.generateUploadUrl, {})).resolves.toEqual(
      expect.any(String),
    );
  });

  it("still refuses once too many claims are outstanding", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_upload_cap_2");

    for (let index = 0; index < 21; index += 1) {
      await claimUpload(t, asUser, "mealPhoto");
    }

    await expect(asUser.mutation(api.uploads.generateUploadUrl, {})).rejects.toThrow(
      /pending uploads/i,
    );
  });
});

describe("stalled scan watchdog", () => {
  it("re-queues a scan abandoned in processing", async () => {
    const t = setupTest();
    const { asUser, subject } = await createUser(t, "user_stalled");
    await grantPro(t, subject);

    const storageId = await claimUpload(t, asUser);
    const { scanId } = await t.run(async (ctx) => ({
      scanId: await ctx.db.insert("aiScans", {
        userId: (await ctx.db
          .query("users")
          .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", subject))
          .unique())!._id,
        requestId: "stalled-request",
        imageStorageId: storageId,
        // Exactly the state an action leaves behind when it is killed before it
        // can reach its own error handler.
        status: "processing",
        provider: "openai",
        model: "test-model",
        locale: "en",
        attempts: 1,
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now() - 600_000,
        updatedAt: Date.now() - 600_000,
      }),
    }));

    const result = await t.mutation(internal.maintenance.reapStalledScans, {});
    expect(result).toEqual({ requeued: 1, failed: 0 });

    const scan = await asUser.query(api.aiDb.getScan, { scanId });
    expect(scan?.status).toBe("pending");
  });

  it("fails a stalled scan that has no attempts left", async () => {
    const t = setupTest();
    const { asUser, subject } = await createUser(t, "user_stalled_exhausted");
    await grantPro(t, subject);

    const storageId = await claimUpload(t, asUser);
    const scanId = await t.run(async (ctx) =>
      ctx.db.insert("aiScans", {
        userId: (await ctx.db
          .query("users")
          .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", subject))
          .unique())!._id,
        requestId: "exhausted-request",
        imageStorageId: storageId,
        status: "processing",
        provider: "openai",
        model: "test-model",
        locale: "en",
        attempts: 3,
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now() - 600_000,
        updatedAt: Date.now() - 600_000,
      }),
    );

    const result = await t.mutation(internal.maintenance.reapStalledScans, {});
    expect(result).toEqual({ requeued: 0, failed: 1 });

    const scan = await asUser.query(api.aiDb.getScan, { scanId });
    expect(scan?.status).toBe("failed");
    expect(scan?.failureCategory).toBe("stalled");
  });

  it("leaves a scan that is still within its window alone", async () => {
    const t = setupTest();
    const { subject } = await createUser(t, "user_recent_processing");
    await grantPro(t, subject);

    await t.run(async (ctx) => {
      const user = (await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", subject))
        .unique())!;
      const storageId = await ctx.storage.store(new Blob([new Uint8Array(8)]));
      await ctx.db.insert("aiScans", {
        userId: user._id,
        requestId: "fresh-request",
        imageStorageId: storageId,
        status: "processing",
        provider: "openai",
        model: "test-model",
        locale: "en",
        attempts: 1,
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await expect(t.mutation(internal.maintenance.reapStalledScans, {})).resolves.toEqual({
      requeued: 0,
      failed: 0,
    });
  });
});

describe("scan-sourced food log deletion", () => {
  it("marks the scan image deleted when the log owned the same blob", async () => {
    const t = setupTest();
    const { asUser, subject } = await createUser(t, "user_shared_image");
    await grantPro(t, subject);

    const storageId = await claimUpload(t, asUser);
    const scanId = await t.run(async (ctx) => {
      const user = (await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", subject))
        .unique())!;
      return ctx.db.insert("aiScans", {
        userId: user._id,
        requestId: "shared-image-request",
        imageStorageId: storageId,
        status: "completed",
        provider: "openai",
        model: "test-model",
        locale: "en",
        attempts: 1,
        retentionUntil: Date.now() + 86_400_000,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const logId = await asUser.mutation(api.foodLogs.create, {
      localDate: "2026-08-17",
      timezone: "Europe/Berlin",
      mealType: "lunch",
      source: "ai",
      foodName: "Scanned plate",
      serving: "1 meal",
      servingUnit: "portion",
      quantity: 1,
      calories: 500,
      proteinGrams: 30,
      carbsGrams: 50,
      fatGrams: 20,
      imageStorageId: storageId,
      aiScanId: scanId,
      clientRequestId: "shared-image-log",
    });

    await asUser.mutation(api.foodLogs.remove, { id: logId });

    /*
      The blob is gone, so the scan must say so. It previously kept
      `imageDeletedAt` unset, leaving `getScan` handing out a URL for a deleted
      blob and `retryScan` passing its guard only to fail later.
    */
    const scan = await asUser.query(api.aiDb.getScan, { scanId });
    expect(scan?.imageUrl).toBeNull();
    expect(scan?.imageStorageId).toBeUndefined();
  });
});

describe("free history window", () => {
  it("reports a boundary for a free account and none for Pro", async () => {
    const t = setupTest();
    const free = await createUser(t, "user_free_boundary");
    await expect(free.asUser.query(api.foodLogs.getHistoryBoundary, {})).resolves.toEqual(
      expect.any(String),
    );

    const pro = await createUser(t, "user_pro_boundary");
    await grantPro(t, pro.subject);
    await expect(pro.asUser.query(api.foodLogs.getHistoryBoundary, {})).resolves.toBeNull();
  });
});
