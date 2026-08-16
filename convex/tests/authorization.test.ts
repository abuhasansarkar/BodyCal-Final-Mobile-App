import { describe, expect, it } from "@jest/globals";

import { api } from "../_generated/api";
import { claimUpload, createUser, FOOD_ENTRY, settle, setupTest } from "./setup";

/**
 * Authorization coverage.
 *
 * These are the cases AGENTS.md requires and that the pre-review code did not
 * have: unauthenticated access, wrong-user access, and cross-user reads through
 * an id that happens to be valid.
 */
describe("authorization", () => {
  it("rejects unauthenticated reads and writes", async () => {
    const t = setupTest();

    await expect(t.query(api.profiles.getCurrent, {})).rejects.toThrow(/Unauthenticated/);
    await expect(t.query(api.foodLogs.getDay, { localDate: "2026-08-13" })).rejects.toThrow(
      /Unauthenticated/,
    );
    await expect(t.mutation(api.foodLogs.create, FOOD_ENTRY)).rejects.toThrow(/Unauthenticated/);
    await expect(t.mutation(api.weights.create, {
      normalizedKg: 70,
      displayValue: 70,
      displayUnit: "kg",
      localDate: "2026-08-13",
      timezone: "Europe/Berlin",
      clientRequestId: "w-1",
    })).rejects.toThrow(/Unauthenticated/);
  });

  it("returns null from getCurrent rather than leaking an error to a signed-out client", async () => {
    const t = setupTest();
    await expect(t.query(api.users.getCurrent, {})).resolves.toBeNull();
  });

  it("does not return another user's food log", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");

    const logId = await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    await expect(owner.asUser.query(api.foodLogs.getById, { id: logId })).resolves.not.toBeNull();
    await expect(other.asUser.query(api.foodLogs.getById, { id: logId })).resolves.toBeNull();
  });

  it("refuses to update or delete another user's food log", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");
    const logId = await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    await expect(
      other.asUser.mutation(api.foodLogs.update, {
        id: logId,
        mealType: "dinner",
        foodName: "Hijacked",
        serving: "1",
        servingUnit: "portion",
        quantity: 1,
        calories: 1,
        proteinGrams: 0,
        carbsGrams: 0,
        fatGrams: 0,
      }),
    ).rejects.toThrow(/not found/i);

    await expect(other.asUser.mutation(api.foodLogs.remove, { id: logId })).rejects.toThrow(
      /not found/i,
    );

    // The original entry is untouched.
    const log = await owner.asUser.query(api.foodLogs.getById, { id: logId });
    expect(log?.foodName).toBe(FOOD_ENTRY.foodName);
  });

  it("refuses to read, update, or delete another user's weight entry", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");

    const weightId = await owner.asUser.mutation(api.weights.create, {
      normalizedKg: 70,
      displayValue: 70,
      displayUnit: "kg",
      localDate: "2026-08-13",
      timezone: "Europe/Berlin",
      clientRequestId: "w-1",
    });

    await expect(other.asUser.query(api.weights.getById, { id: weightId })).resolves.toBeNull();
    await expect(
      other.asUser.mutation(api.weights.update, {
        id: weightId,
        normalizedKg: 50,
        displayValue: 50,
        displayUnit: "kg",
      }),
    ).rejects.toThrow(/not found/i);

    await expect(other.asUser.mutation(api.weights.remove, { id: weightId })).rejects.toThrow(
      /not found/i,
    );
  });

  /**
   * C-06: an authenticated user must not be able to attach a blob somebody else
   * uploaded, which previously exposed a signed URL for another user's meal photo.
   */
  it("refuses to attach an image uploaded by another user", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");

    const storageId = await claimUpload(t, owner.asUser, "mealPhoto");

    await expect(
      other.asUser.mutation(api.foodLogs.create, {
        ...FOOD_ENTRY,
        clientRequestId: "req-steal",
        imageStorageId: storageId,
      }),
    ).rejects.toThrow(/not available/i);
  });

  it("refuses to claim a blob another user already claimed", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");

    const storageId = await claimUpload(t, owner.asUser, "mealScan");

    await expect(
      other.asUser.mutation(api.uploads.claim, { storageId, purpose: "mealScan" }),
    ).rejects.toThrow(/not available/i);
  });

  it("scopes the day view to the calling user", async () => {
    const t = setupTest();
    const owner = await createUser(t, "user_owner");
    const other = await createUser(t, "user_other");

    await owner.asUser.mutation(api.foodLogs.create, FOOD_ENTRY);

    await expect(
      owner.asUser.query(api.foodLogs.getDay, { localDate: FOOD_ENTRY.localDate }),
    ).resolves.toHaveLength(1);
    await expect(
      other.asUser.query(api.foodLogs.getDay, { localDate: FOOD_ENTRY.localDate }),
    ).resolves.toHaveLength(0);
  });

  it("keeps a user awaiting deletion out of the app", async () => {
    const t = setupTest();
    const { asUser } = await createUser(t, "user_leaving");

    await asUser.mutation(api.users.requestDeletion, {});
    await settle(t);

    // requireCurrentUser rejects a non-active lifecycle state.
    await expect(asUser.query(api.foodLogs.getDay, { localDate: "2026-08-13" })).rejects.toThrow(
      /unavailable/i,
    );
  });
});
