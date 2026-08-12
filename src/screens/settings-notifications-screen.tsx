import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import {
  requestNotificationPermission,
  scheduleDailyReminder,
} from "@/features/notifications/scheduler";
import { Pressable, Text, View } from "@/tw";

export function SettingsNotificationsScreen() {
  const [dailyEnabled, setDailyEnabled] = React.useState(true);
  const [mealReminders, setMealReminders] = React.useState(true);
  const [weeklyProgress, setWeeklyProgress] = React.useState(true);
  const [permissionStatus, setPermissionStatus] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleRequestPermission = async () => {
    setMessage(null);
    try {
      const res = await requestNotificationPermission();
      if (res.granted) {
        setPermissionStatus("Granted");
        if (dailyEnabled) {
          await scheduleDailyReminder({
            hour: 20,
            minute: 0,
            title: "Log your daily meals",
            body: "Keep your logging streak alive by recording today's meals.",
            destination: "/(app)/(tabs)",
          });
        }
        setMessage("Notifications enabled & daily reminder scheduled for 8:00 PM.");
      } else {
        setPermissionStatus("Denied");
        setMessage("Notification permission was not granted by your operating system.");
      }
    } catch {
      setMessage("Could not request notification permissions.");
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Notifications
      </Text>
      <Text className="text-sm text-app-muted">
        Configure reminders to stay consistent with logging and progress checks.
      </Text>

      <View className="gap-3 rounded-3xl border border-app-border bg-white p-4">
        <View className="flex-row items-center justify-between py-2">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-base font-bold text-app-text">Daily Goal Reminder</Text>
            <Text className="text-sm font-medium text-app-muted">Reminds you every evening at 8:00 PM to log remaining meals.</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: dailyEnabled }}
            className={dailyEnabled ? "h-8 w-14 rounded-full bg-[#111111] p-1 items-end" : "h-8 w-14 rounded-full bg-[#E5E5E5] p-1 items-start"}
            onPress={() => setDailyEnabled((v) => !v)}
          >
            <View className="h-6 w-6 rounded-full bg-white" />
          </Pressable>
        </View>

        <View className="h-px bg-app-border" />

        <View className="flex-row items-center justify-between py-2">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-base font-bold text-app-text">Meal Reminders</Text>
            <Text className="text-sm font-medium text-app-muted">Up to 3 reminders per day near breakfast, lunch, and dinner.</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: mealReminders }}
            className={mealReminders ? "h-8 w-14 rounded-full bg-[#111111] p-1 items-end" : "h-8 w-14 rounded-full bg-[#E5E5E5] p-1 items-start"}
            onPress={() => setMealReminders((v) => !v)}
          >
            <View className="h-6 w-6 rounded-full bg-white" />
          </Pressable>
        </View>

        <View className="h-px bg-app-border" />

        <View className="flex-row items-center justify-between py-2">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-base font-bold text-app-text">Weekly Progress Reminder</Text>
            <Text className="text-sm font-medium text-app-muted">Prompts you once a week to log your weight measurement.</Text>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: weeklyProgress }}
            className={weeklyProgress ? "h-8 w-14 rounded-full bg-[#111111] p-1 items-end" : "h-8 w-14 rounded-full bg-[#E5E5E5] p-1 items-start"}
            onPress={() => setWeeklyProgress((v) => !v)}
          >
            <View className="h-6 w-6 rounded-full bg-white" />
          </Pressable>
        </View>
      </View>

      {permissionStatus ? (
        <Text className="px-1 text-sm font-semibold text-app-muted">
          OS Permission Status: {permissionStatus}
        </Text>
      ) : null}

      {message ? <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted">{message}</Text> : null}

      <PrimaryButton icon="notification" label="Save & Enable Notifications" onPress={() => void handleRequestPermission()} />
    </AppScreen>
  );
}
