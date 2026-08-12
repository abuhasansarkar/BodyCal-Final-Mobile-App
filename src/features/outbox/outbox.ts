import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "bodycal.offline-outbox.v1";

export type OutboxRecord = {
  id: string;
  kind: "foodLog.create" | "weight.create";
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
};

export async function readOutbox(): Promise<OutboxRecord[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isOutboxRecord) : [];
  } catch {
    return [];
  }
}

export async function enqueueOutbox(record: Omit<OutboxRecord, "createdAt" | "attempts">) {
  const current = await readOutbox();
  if (current.some((item) => item.id === record.id)) return;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...current, { ...record, createdAt: Date.now(), attempts: 0 }]));
}

export async function flushOutbox(send: (record: OutboxRecord) => Promise<void>) {
  const current = await readOutbox();
  const remaining: OutboxRecord[] = [];
  for (const record of current) {
    try {
      await send(record);
    } catch {
      remaining.push({ ...record, attempts: record.attempts + 1 });
    }
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  return { sent: current.length - remaining.length, remaining: remaining.length };
}

export async function clearOutbox() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

function isOutboxRecord(value: unknown): value is OutboxRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OutboxRecord>;
  return typeof candidate.id === "string"
    && (candidate.kind === "foodLog.create" || candidate.kind === "weight.create")
    && typeof candidate.payload === "object"
    && typeof candidate.createdAt === "number"
    && typeof candidate.attempts === "number";
}
