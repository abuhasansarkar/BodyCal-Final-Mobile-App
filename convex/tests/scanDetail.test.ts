import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { claimUpload, createUser, FOOD_ENTRY, setupTest } from "./setup";

/**
 * `foodLogs.getScanDetail` reads a scan through a food log's `aiScanId`.
 *
 * That is a stored cross-table reference, so ownership has to be re-checked on
 * the scan itself and not merely on the log that points at it. These cover the
 * cases AGENTS.md requires: unauthenticated, wrong user, and a shape the
 * provider contract has since changed under.
 */
const ESTIMATE = {
  mealName: "Chicken and rice",
  components: [
    { name: "Grilled chicken breast", portion: "180 g" },
    { name: "Jasmine rice", portion: "1 cup" },
  ],
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

/** Inserts a completed scan directly: the real path needs a paid provider call. */
async function seedScan(
  t: ReturnType<typeof setupTest>,
  userId: Id<"users">,
  storageId: Id<"_storage">,
  estimate: unknown = ESTIMATE,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("aiScans", {
      userId,
      requestId: `scan-${String(userId)}`,
      imageStorageId: storageId,
      status: "completed" as const,
      provider: "openai",
      model: "test-model",
      locale: "en",
      estimate,
      confidence: "medium",
      retentionUntil: Date.now() + 86_400_000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

describe("foodLogs.getScanDetail", () => {
  it("returns the detail the log's own scan produced", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const storageId = await claimUpload(t, owner.asUser);
    const aiScanId = await seedScan(t, owner.userId, storageId);

    const logId = await owner.asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      source: "ai" as const,
      aiScanId,
    });

    const detail = await owner.asUser.query(api.foodLogs.getScanDetail, { id: logId });
    expect(detail).not.toBeNull();
    expect(detail?.components).toEqual(ESTIMATE.components);
    expect(detail?.confidence).toBe("medium");
    expect(detail?.saturatedFatGrams).toBe(4.5);
    expect(detail?.sodiumMilligrams).toBe(820);
    // A value the model could not judge stays null; it must never become a zero.
    expect(detail?.fiberGrams).toBeNull();
    expect(detail?.warnings).toEqual(ESTIMATE.warnings);
  });

  it("returns null for an entry that was not scanned", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const logId = await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    await expect(owner.asUser.query(api.foodLogs.getScanDetail, { id: logId })).resolves.toBeNull();
  });

  it("does not return another user's scan detail", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");
    const storageId = await claimUpload(t, owner.asUser);
    const aiScanId = await seedScan(t, owner.userId, storageId);

    const logId = await owner.asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      source: "ai" as const,
      aiScanId,
    });

    await expect(other.asUser.query(api.foodLogs.getScanDetail, { id: logId })).resolves.toBeNull();
  });

  it("rejects an unauthenticated read", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const logId = await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    await expect(t.query(api.foodLogs.getScanDetail, { id: logId })).rejects.toThrow(
      /Unauthenticated/,
    );
  });

  it("survives a stored estimate that no longer matches the current contract", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const storageId = await claimUpload(t, owner.asUser);
    // An older row: no micros, and a component missing its portion.
    const aiScanId = await seedScan(t, owner.userId, storageId, {
      mealName: "Old scan",
      components: [{ name: "Rice" }, { name: "Chicken", portion: "150 g" }],
      nutrition: { calories: 500, proteinGrams: 30, carbsGrams: 60, fatGrams: 12 },
    });

    const logId = await owner.asUser.mutation(api.foodLogs.create, {
      ...FOOD_ENTRY,
      source: "ai" as const,
      aiScanId,
    });

    const detail = await owner.asUser.query(api.foodLogs.getScanDetail, { id: logId });
    expect(detail?.components).toEqual([{ name: "Chicken", portion: "150 g" }]);
    expect(detail?.confidence).toBe("medium");
    expect(detail?.fiberGrams).toBeNull();
    expect(detail?.warnings).toEqual([]);
  });
});
