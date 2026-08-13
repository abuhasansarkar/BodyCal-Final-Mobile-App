import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Offline write queue for manual food and weight entries.
 *
 * Records carry an attempt count and an expiry. A write the server permanently
 * rejects is dropped instead of being retried on every connectivity change
 * forever, and the queue is cleared whenever the signed-in account changes so one
 * user's pending entries can never land in another user's account.
 */

const STORAGE_KEY = "bodycal.offline-outbox.v2";
const OWNER_KEY = "bodycal.offline-outbox.owner.v1";

export const OUTBOX_MAX_ATTEMPTS = 5;
export const OUTBOX_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const MAX_RECORDS = 200;

export type OutboxKind = "foodLog.create" | "weight.create";

export type OutboxRecord = {
  id: string;
  kind: OutboxKind;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

export type FlushResult = {
  sent: number;
  remaining: number;
  dropped: number;
};

function isOutboxRecord(value: unknown): value is OutboxRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OutboxRecord>;
  return (
    typeof candidate.id === "string" &&
    (candidate.kind === "foodLog.create" || candidate.kind === "weight.create") &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null &&
    typeof candidate.createdAt === "number" &&
    typeof candidate.attempts === "number"
  );
}

function isExpired(record: OutboxRecord, now: number) {
  return now - record.createdAt > OUTBOX_TTL_MS;
}

async function write(records: OutboxRecord[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-MAX_RECORDS)));
}

export async function readOutbox(): Promise<OutboxRecord[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter(isOutboxRecord).filter((record) => !isExpired(record, now));
  } catch {
    return [];
  }
}

export async function enqueueOutbox(record: Pick<OutboxRecord, "id" | "kind" | "payload">) {
  const current = await readOutbox();
  if (current.some((item) => item.id === record.id)) return;
  await write([...current, { ...record, createdAt: Date.now(), attempts: 0 }]);
}

/**
 * Attempts every queued record once.
 *
 * A record is dropped when it exceeds `OUTBOX_MAX_ATTEMPTS` or ages past
 * `OUTBOX_TTL_MS`, so a permanently invalid payload cannot wedge the queue.
 */
export async function flushOutbox(
  send: (record: OutboxRecord) => Promise<void>,
): Promise<FlushResult> {
  const current = await readOutbox();
  if (current.length === 0) return { sent: 0, remaining: 0, dropped: 0 };

  const retained: OutboxRecord[] = [];
  let sent = 0;
  let dropped = 0;
  const now = Date.now();

  for (const record of current) {
    if (isExpired(record, now)) {
      dropped += 1;
      continue;
    }
    try {
      await send(record);
      sent += 1;
    } catch (cause) {
      const attempts = record.attempts + 1;
      if (attempts >= OUTBOX_MAX_ATTEMPTS) {
        dropped += 1;
        continue;
      }
      retained.push({
        ...record,
        attempts,
        lastError: cause instanceof Error ? cause.name : "unknown",
      });
    }
  }

  await write(retained);
  return { sent, remaining: retained.length, dropped };
}

export async function clearOutbox() {
  await AsyncStorage.multiRemove([STORAGE_KEY, OWNER_KEY]);
}

/**
 * Binds the queue to one account. Call on every sign-in: if the stored owner
 * differs, the queue belonged to a previous session and is discarded.
 *
 * Returns true when a foreign queue was cleared.
 */
export async function bindOutboxToUser(userId: string): Promise<boolean> {
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  if (owner === userId) return false;

  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.setItem(OWNER_KEY, userId);
  return owner !== null;
}
