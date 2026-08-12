import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const MEAL_CHANNEL = "meal-reminders";
const PRO_CHANNEL = "subscription-reminders";
const TRIAL_NOTIFICATION_ID = "bodycal-trial-reminder";

export async function configureNotificationChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all([
    Notifications.setNotificationChannelAsync(MEAL_CHANNEL, {
      name: "Meal reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync(PRO_CHANNEL, {
      name: "Subscription reminders",
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
  ]);
}

export async function requestNotificationPermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return current;
  return Notifications.requestPermissionsAsync();
}

export async function scheduleDailyReminder(input: {
  identifier?: string;
  hour: number;
  minute: number;
  title: string;
  body: string;
  destination: string;
}) {
  if (input.identifier) await Notifications.cancelScheduledNotificationAsync(input.identifier).catch(() => undefined);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: { destination: input.destination },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: input.hour,
      minute: input.minute,
      channelId: MEAL_CHANNEL,
    },
  });
}

export async function syncTrialReminder(expiresAt?: number) {
  await Notifications.cancelScheduledNotificationAsync(TRIAL_NOTIFICATION_ID).catch(() => undefined);
  if (!expiresAt) return false;
  const triggerAt = expiresAt - 24 * 60 * 60 * 1_000;
  if (triggerAt <= Date.now()) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_NOTIFICATION_ID,
    content: {
      title: "Your BodyCal trial ends soon",
      body: "Review your subscription before your trial period ends.",
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
