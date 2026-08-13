import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "@jest/globals";

import {
  bindOutboxToUser,
  enqueueOutbox,
  flushOutbox,
  OUTBOX_MAX_ATTEMPTS,
  readOutbox,
} from "@/features/outbox/outbox";

beforeEach(async () => AsyncStorage.clear());

const foodRecord = {
  id: "same-key",
  kind: "foodLog.create" as const,
  payload: { calories: 100 },
};

describe("offline outbox", () => {
  it("deduplicates and removes successfully delivered records", async () => {
    await enqueueOutbox(foodRecord);
    await enqueueOutbox(foodRecord);
    expect(await readOutbox()).toHaveLength(1);

    await expect(flushOutbox(async () => undefined)).resolves.toEqual({
      sent: 1,
      remaining: 0,
      dropped: 0,
    });
  });

  it("retains failed records and increments attempts", async () => {
    await enqueueOutbox({ id: "retry-key", kind: "weight.create", payload: { kilograms: 70 } });
    await flushOutbox(async () => {
      throw new Error("offline");
    });
    expect((await readOutbox())[0]?.attempts).toBe(1);
  });

  it("drops a record that keeps failing instead of retrying it forever", async () => {
    await enqueueOutbox({ id: "poison", kind: "weight.create", payload: { kilograms: 70 } });

    const fail = async () => {
      throw new Error("permanently invalid");
    };
    for (let attempt = 0; attempt < OUTBOX_MAX_ATTEMPTS; attempt += 1) {
      await flushOutbox(fail);
    }

    expect(await readOutbox()).toHaveLength(0);
  });

  it("reports how many records were dropped", async () => {
    await enqueueOutbox({ id: "a", kind: "weight.create", payload: {} });
    for (let attempt = 0; attempt < OUTBOX_MAX_ATTEMPTS - 1; attempt += 1) {
      await flushOutbox(async () => {
        throw new Error("offline");
      });
    }

    await expect(
      flushOutbox(async () => {
        throw new Error("offline");
      }),
    ).resolves.toEqual({ sent: 0, remaining: 0, dropped: 1 });
  });

  it("discards the queue when a different account signs in", async () => {
    await bindOutboxToUser("user_a");
    await enqueueOutbox(foodRecord);
    expect(await readOutbox()).toHaveLength(1);

    await expect(bindOutboxToUser("user_b")).resolves.toBe(true);
    expect(await readOutbox()).toHaveLength(0);
  });

  it("keeps the queue when the same account signs in again", async () => {
    await bindOutboxToUser("user_a");
    await enqueueOutbox(foodRecord);

    await expect(bindOutboxToUser("user_a")).resolves.toBe(false);
    expect(await readOutbox()).toHaveLength(1);
  });

  it("ignores records persisted in an unrecognised shape", async () => {
    await AsyncStorage.setItem(
      "bodycal.offline-outbox.v2",
      JSON.stringify([{ id: "bad", kind: "unknown.kind", payload: {}, createdAt: 0, attempts: 0 }]),
    );
    expect(await readOutbox()).toHaveLength(0);
  });
});
