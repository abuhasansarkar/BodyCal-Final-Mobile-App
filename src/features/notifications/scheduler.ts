import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

/**
 * Local reminder scheduling.
 *
 * Every reminder is scheduled under a stable identifier, so re-saving preferences
 * replaces the existing reminder instead of stacking another copy. Delivery is
 * best-effort: the operating system decides whether a scheduled notification is
 * actually shown.
 */

export type ReminderKey = "daily" | "meal" | "hydration" | "progress" | "motivation";

/**
 * One Android channel per reminder category.
 *
 * Every reminder used to be posted to `meal-reminders`, so silencing hydration
 * nudges in Android settings silenced the daily summary too, and all five sat
 * under a label that only described one of them. Channels are the only control
 * Android gives a user over notification categories, so they have to match the
 * categories the app actually offers.
 *
 * `meal` keeps its original id: it is the `defaultChannel` declared in
 * `app.json`, and a channel id is permanent once created on a device.
 */
export const REMINDER_CHANNELS: Record<ReminderKey, string> = {
  daily: "daily-reminders",
  meal: "meal-reminders",
  hydration: "hydration-reminders",
  progress: "progress-reminders",
  motivation: "motivation-reminders",
};

export const PRO_CHANNEL = "subscription-reminders";

/** Stable identifiers keep scheduling idempotent across saves. */
const REMINDER_IDS: Record<ReminderKey, string[]> = {
  daily: ["bodycal.reminder.daily"],
  meal: ["bodycal.reminder.meal.1", "bodycal.reminder.meal.2", "bodycal.reminder.meal.3"],
  hydration: ["bodycal.reminder.hydration"],
  progress: ["bodycal.reminder.progress"],
  motivation: ["bodycal.reminder.motivation"],
};

const TRIAL_NOTIFICATION_ID = "bodycal.trial-reminder";

export type PermissionStatus = "granted" | "denied" | "undetermined" | "not_requested";

/**
 * Creates or renames every channel, using the user's current language.
 *
 * Android updates the name and description of an existing channel id, so calling
 * this on each sync keeps the labels in the language the app is running in
 * rather than whichever one happened to be active at first launch. Channel
 * names were previously hard-coded English — the only user-visible strings in
 * the app that bypassed i18next.
 */
async function configureReminderChannels(copy: ReminderCopy) {
  if (Platform.OS !== "android") return;
  await Promise.all(
    (Object.keys(REMINDER_CHANNELS) as ReminderKey[]).map((key) =>
      Notifications.setNotificationChannelAsync(REMINDER_CHANNELS[key], {
        name: copy[key].title,
        description: copy[key].body,
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    ),
  );
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (current.canAskAgain) return "undetermined";
  return "denied";
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "denied";
  const result = await Notifications.requestPermissionsAsync();
  return result.granted ? "granted" : "denied";
}

function parseClockTime(value: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/** Shifts a time out of quiet hours rather than dropping the reminder. */
export function calculateQuietHoursAdjustedTime(
  time: { hour: number; minute: number },
  quietStart?: string,
  quietEnd?: string,
) {
  const start = quietStart ? parseClockTime(quietStart) : null;
  const end = quietEnd ? parseClockTime(quietEnd) : null;
  if (!start || !end) return time;

  const minutes = time.hour * 60 + time.minute;
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  // Quiet hours may wrap past midnight.
  const inQuietHours =
    startMinutes <= endMinutes
      ? minutes >= startMinutes && minutes < endMinutes
      : minutes >= startMinutes || minutes < endMinutes;

  return inQuietHours ? { hour: end.hour, minute: end.minute } : time;
}

function respectQuietHours(
  time: { hour: number; minute: number },
  quietStart?: string,
  quietEnd?: string,
) {
  return calculateQuietHoursAdjustedTime(time, quietStart, quietEnd);
}

async function cancel(identifiers: string[]) {
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => undefined),
    ),
  );
}

/** Default reminder times, shared by onboarding and Settings. */
export const DEFAULT_REMINDER_TIMES: Record<ReminderKey, string> = {
  daily: "20:00",
  meal: "08:00",
  hydration: "11:00",
  progress: "09:00",
  motivation: "18:00",
};

export type ReminderCopy = Record<ReminderKey, { title: string; body: string }>;

export type ReminderPlan = {
  categories: Record<ReminderKey, boolean>;
  times: Record<ReminderKey, string>;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

/**
 * Reconciles all local reminders with the given plan.
 *
 * Cancels every BodyCal reminder first, then schedules only what is enabled, so
 * toggling a category off actually removes its notification.
 */
export async function syncReminders(
  plan: ReminderPlan,
  copy: ReminderCopy,
  destination = "/(app)/(tabs)/today",
) {
  const allIds = Object.values(REMINDER_IDS).flat();
  await cancel(allIds);

  // Channels must exist before anything is scheduled against them, and this is
  // the only place reminders are scheduled — so it is also the right place to
  // keep their localized names current.
  await configureReminderChannels(copy);

  const scheduled: string[] = [];
  for (const key of Object.keys(REMINDER_IDS) as ReminderKey[]) {
    if (!plan.categories[key]) continue;

    const baseTime = parseClockTime(plan.times[key]);
    if (!baseTime) continue;

    const identifiers = REMINDER_IDS[key];
    for (const [index, identifier] of identifiers.entries()) {
      // Meal reminders spread across the day from the configured first time.
      const shifted = { hour: (baseTime.hour + index * 5) % 24, minute: baseTime.minute };
      const time = respectQuietHours(shifted, plan.quietHoursStart, plan.quietHoursEnd);

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: copy[key].title,
          body: copy[key].body,
          data: { destination },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: time.hour,
          minute: time.minute,
          channelId: REMINDER_CHANNELS[key],
        },
      });
      scheduled.push(identifier);
    }
  }

  return scheduled;
}

export async function syncTrialReminder(
  expiresAt: number | undefined,
  copy: { title: string; body: string },
) {
  await Notifications.cancelScheduledNotificationAsync(TRIAL_NOTIFICATION_ID).catch(() => undefined);
  if (!expiresAt) return false;

  const triggerAt = expiresAt - 24 * 60 * 60 * 1_000;
  if (triggerAt <= Date.now()) return false;

  // Its own channel, named from the same localized copy as the notification, so
  // a trial reminder can be silenced without silencing meal reminders.
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(PRO_CHANNEL, {
      name: copy.title,
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_NOTIFICATION_ID,
    content: {
      title: copy.title,
      body: copy.body,
      data: { destination: "/(app)/settings/subscription" },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(triggerAt),
      channelId: PRO_CHANNEL,
    },
  });
  return true;
}

export async function clearBodyCalNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.dismissAllNotificationsAsync();
}
