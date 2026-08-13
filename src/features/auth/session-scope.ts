import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import { clearBodyCalNotifications } from "@/features/notifications/scheduler";
import { bindOutboxToUser, clearOutbox } from "@/features/outbox/outbox";

/**
 * Keeps device-local state tied to exactly one account.
 *
 * AGENTS.md requires account switching to clear user-scoped caches, the offline
 * outbox and scheduled notifications. Doing this only on the Sign out button was
 * not enough: a session can end through token revocation or an app switch, and the
 * next account would then inherit the previous user's queued writes and reminders.
 */

const INSTALLATION_KEY = "bodycal.installation-id.v1";

/** Stable per-install identifier used to deduplicate push device registrations. */
export async function getInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALLATION_KEY, created);
  return created;
}

/**
 * Called whenever an authenticated user id becomes known. Clears user-scoped
 * device state when the account differs from the one already bound here.
 *
 * Returns true when a switch was detected and local state was cleared.
 */
export async function enterUserScope(userId: string): Promise<boolean> {
  const switched = await bindOutboxToUser(userId);
  if (switched) await clearBodyCalNotifications();
  return switched;
}

/** Called before sign-out so nothing user-scoped survives into the next session. */
export async function leaveUserScope() {
  await Promise.all([clearOutbox(), clearBodyCalNotifications()]);
}
