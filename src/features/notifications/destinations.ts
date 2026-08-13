/**
 * Routes a notification is allowed to open.
 *
 * Notification payloads are untrusted input: anything holding a device's push
 * token can set `data.destination`. Only these routes are navigable, so a payload
 * cannot deep-link into destructive screens such as account deletion.
 */
export const NOTIFICATION_DESTINATIONS = [
  "/(app)/(tabs)/today",
  "/(app)/(tabs)/progress",
  "/(app)/(tabs)/foods",
  "/(app)/(tabs)/profile",
  "/(app)/add-food",
  "/(app)/history",
  "/(app)/scan/camera",
  "/(app)/weight/add",
  "/(app)/settings/subscription",
  "/(app)/settings/notifications",
] as const;

export type NotificationDestination = (typeof NOTIFICATION_DESTINATIONS)[number];

const ALLOWED = new Set<string>(NOTIFICATION_DESTINATIONS);

/** Returns the destination when it is on the allowlist, otherwise null. */
export function resolveNotificationDestination(value: unknown): NotificationDestination | null {
  if (typeof value !== "string") return null;
  return ALLOWED.has(value) ? (value as NotificationDestination) : null;
}
