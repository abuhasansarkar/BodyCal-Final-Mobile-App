import { describe, expect, it } from "@jest/globals";

import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { MAX_SCAN_ATTEMPTS } from "../aiDb";
import { claimUpload, createUser, grantPro, setupTest, type TestConvex } from "./setup";

/**
 * The scan lifecycle, which is where the money is.
 *
 * Every path through `pending → processing → completed | failed` either does or
 * does not buy a paid provider call, so the guards are covered directly rather
 * than through the action that would need a provider to run. The cases mirror
 * what AGENTS.md requires of a Convex feature: success, unauthenticated, wrong
 * user, idempotency, limits, and failure.
 */

const ESTIMATE = {
  mealName: "Chicken and rice",
  components: [{ name: "Grilled chicken breast", portion: "180 g" }],
  nutrition: {
    calories: 640,
    proteinGrams: 45,
    carbsGrams: 70,
    fatGrams: 18,
    saturatedFatGrams: 4.5,
    fiberGrams: null,
    sugarGrams: 3,
    sodiumMilligrams: 820,
  },
  confidence: "medium",
  warnings: ["Cooking oil is hard to judge from a photo."],
};

async function beginScan(
  t: TestConvex,
  subject: string,
  storageId: Id<"_storage">,
  requestId = "req-scan-1",
) {
  return await t.withIdentity({ subject }).mutation(internal.aiDb.begin, {
    storageId,
    requestId,
    locale: "en",
    provider: "openai",
    model: "gpt-4o-mini",
  });
}

/** A Pro user with a claimed upload — everything a scan needs except a provider. */
async function proUserWithUpload(t: TestConvex, subject = "user_pro") {
  const user = await createUser(t, subject);
  await grantPro(t, subject);
  const storageId = await claimUpload(t, user.asUser);
  return { ...user, storageId };
}

describe("aiDb.begin", () => {
  it("queues a scan rather than marking it already running", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);

    const start = await beginScan(t, subject, storageId);
    expect(start.duplicate).toBe(false);

    const scan = await t.run(async (ctx) => ctx.db.get(start.scanId));
    // Durable before any provider call: a client that vanishes loses nothing.
    expect(scan?.status).toBe("pending");
    expect(scan?.attempts).toBe(0);
  });

  it("rejoins the same scan for a resent request id", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);

    const first = await beginScan(t, subject, storageId, "req-same");
    const second = await beginScan(t, subject, storageId, "req-same");

    expect(second.duplicate).toBe(true);
    expect(second.scanId).toBe(first.scanId);

    const scans = await t.run(async (ctx) => ctx.db.query("aiScans").collect());
    expect(scans).toHaveLength(1);
  });
});

describe("aiDb.claimForAnalysis", () => {
  it("claims a queued scan exactly once", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);

    const first = await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
    expect(first).not.toBeNull();
    expect(first?.attempt).toBe(1);

    // The duplicate-charge guard: a second scheduling of the same scan buys
    // nothing, whatever caused it.
    const second = await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
    expect(second).toBeNull();
  });

  it("refuses a scan that already completed", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);

    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
    await t.mutation(internal.aiDb.complete, {
      scanId,
      estimate: ESTIMATE,
      confidence: "medium",
      latencyMs: 1_200,
    });

    await expect(t.mutation(internal.aiDb.claimForAnalysis, { scanId })).resolves.toBeNull();
  });
});

describe("aiDb.fail", () => {
  it("re-queues a transient failure against the same scan", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);
    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });

    const result = await t.mutation(internal.aiDb.fail, {
      scanId,
      failureCategory: "provider:503",
      latencyMs: 900,
      retryInMs: 1,
    });

    expect(result.retrying).toBe(true);
    const scan = await t.run(async (ctx) => ctx.db.get(scanId));
    // Back to queued on the same row: no second scan, so no second meal entry.
    expect(scan?.status).toBe("pending");
    expect(scan?.attempts).toBe(1);
  });

  it("does not retry a failure that will never succeed", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);
    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });

    const result = await t.mutation(internal.aiDb.fail, {
      scanId,
      failureCategory: "provider:400",
      latencyMs: 120,
    });

    expect(result.retrying).toBe(false);
    const scan = await t.run(async (ctx) => ctx.db.get(scanId));
    expect(scan?.status).toBe("failed");
  });

  it("gives up once the attempt budget is spent", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);

    for (let attempt = 0; attempt < MAX_SCAN_ATTEMPTS; attempt += 1) {
      const claim = await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
      expect(claim).not.toBeNull();
      await t.mutation(internal.aiDb.fail, {
        scanId,
        failureCategory: "timeout",
        latencyMs: 30_000,
        retryInMs: 1,
      });
    }

    const scan = await t.run(async (ctx) => ctx.db.get(scanId));
    expect(scan?.status).toBe("failed");
    expect(scan?.attempts).toBe(MAX_SCAN_ATTEMPTS);
  });
});

describe("aiDb.complete", () => {
  it("never overwrites a result the user may already be editing", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);
    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });

    await t.mutation(internal.aiDb.complete, {
      scanId,
      estimate: ESTIMATE,
      confidence: "medium",
      latencyMs: 1_000,
    });
    await t.mutation(internal.aiDb.complete, {
      scanId,
      estimate: { ...ESTIMATE, mealName: "Something else" },
      confidence: "low",
      latencyMs: 1_000,
    });

    const scan = await t.run(async (ctx) => ctx.db.get(scanId));
    expect((scan?.estimate as typeof ESTIMATE).mealName).toBe("Chicken and rice");
  });
});

describe("aiDb.getScan", () => {
  it("follows a scan from queued to completed", async () => {
    const t = setupTest();
    const { asUser, subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);

    expect((await asUser.query(api.aiDb.getScan, { scanId }))?.status).toBe("pending");

    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
    expect((await asUser.query(api.aiDb.getScan, { scanId }))?.status).toBe("processing");

    await t.mutation(internal.aiDb.complete, {
      scanId,
      estimate: ESTIMATE,
      confidence: "medium",
      latencyMs: 1_500,
    });

    const done = await asUser.query(api.aiDb.getScan, { scanId });
    expect(done?.status).toBe("completed");
    expect(done?.estimate?.mealName).toBe("Chicken and rice");
    expect(done?.estimate?.nutrition.calories).toBe(640);
    // A value the model could not judge stays null; it must never become a zero.
    expect(done?.estimate?.nutrition.fiberGrams).toBeNull();
    expect(done?.imageUrl).not.toBeNull();
  });

  it("does not return another user's scan", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t, "user_owner");
    const other = await createUser(t, "user_other");
    const { scanId } = await beginScan(t, subject, storageId);

    await expect(other.asUser.query(api.aiDb.getScan, { scanId })).resolves.toBeNull();
  });

  it("rejects an unauthenticated read", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);

    await expect(t.query(api.aiDb.getScan, { scanId })).rejects.toThrow(/Unauthenticated/);
  });
});

describe("aiDb.retryScan", () => {
  it("re-queues a failed scan against the image it already has", async () => {
    const t = setupTest();
    const { asUser, subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);
    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
    await t.mutation(internal.aiDb.fail, { scanId, failureCategory: "provider:400", latencyMs: 50 });

    await expect(asUser.mutation(api.aiDb.retryScan, { scanId })).resolves.toEqual({ requeued: true });

    const scan = await t.run(async (ctx) => ctx.db.get(scanId));
    expect(scan?.status).toBe("pending");
    // Same row, same image, same id — a retry is never a second scan.
    expect(scan?.imageStorageId).toBe(storageId);
  });

  it("refuses to re-queue a scan that is still running", async () => {
    const t = setupTest();
    const { asUser, subject, storageId } = await proUserWithUpload(t);
    const { scanId } = await beginScan(t, subject, storageId);
    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });

    // Already on its way: re-queueing would buy a second call for one photo.
    await expect(asUser.mutation(api.aiDb.retryScan, { scanId })).resolves.toEqual({
      requeued: false,
    });
  });

  it("does not let another user re-queue a scan", async () => {
    const t = setupTest();
    const { subject, storageId } = await proUserWithUpload(t, "user_owner");
    const other = await createUser(t, "user_other");
    const { scanId } = await beginScan(t, subject, storageId);
    await t.mutation(internal.aiDb.claimForAnalysis, { scanId });
    await t.mutation(internal.aiDb.fail, { scanId, failureCategory: "timeout", latencyMs: 10 });

    await expect(other.asUser.mutation(api.aiDb.retryScan, { scanId })).rejects.toThrow(
      /not found/i,
    );
  });
});
