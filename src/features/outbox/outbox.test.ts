import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, expect, it } from "@jest/globals";

import { enqueueOutbox, flushOutbox, readOutbox } from "@/features/outbox/outbox";

beforeEach(async () => AsyncStorage.clear());

it("deduplicates and removes successfully delivered records", async () => {
  const record = { id: "same-key", kind: "foodLog.create" as const, payload: { calories: 100 } };
  await enqueueOutbox(record);
  await enqueueOutbox(record);
  expect(await readOutbox()).toHaveLength(1);
  await expect(flushOutbox(async () => undefined)).resolves.toEqual({ sent: 1, remaining: 0 });
});

it("retains failed records and increments attempts", async () => {
  await enqueueOutbox({ id: "retry-key", kind: "weight.create", payload: { kilograms: 70 } });
  await flushOutbox(async () => { throw new Error("offline"); });
  expect((await readOutbox())[0]?.attempts).toBe(1);
});
