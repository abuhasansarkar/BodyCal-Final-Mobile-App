import { router } from "expo-router";
import React from "react";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { useSubscription } from "@/features/subscription/subscription-provider";
import { Pressable, Text, View } from "@/tw";

export function SettingsSubscriptionScreen() {
  const { state, restore } = useSubscription();
  const [restoring, setRestoring] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const isPro = ["trial", "active", "cancelledActive", "billingIssueActive"].includes(state);

  const handleRestore = async () => {
    setRestoring(true);
    setMessage(null);
    try {
      await restore();
      setMessage("Purchases restored successfully.");
    } catch {
      setMessage("Could not restore purchases. If you have an active store subscription, please try again.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Subscription & Pro
      </Text>
      <Text className="text-sm text-app-muted">
        Manage your subscription status and unlock premium AI features.
      </Text>

      <View className="gap-3 rounded-3xl border border-app-border bg-white p-5" style={{ borderCurve: "continuous", boxShadow: "0 6px 24px rgba(0, 0, 0, 0.045)" }}>
        <View className="flex-row items-center gap-3">
          <View className={isPro ? "h-12 w-12 items-center justify-center rounded-full bg-[#111111]" : "h-12 w-12 items-center justify-center rounded-full bg-app-surface"}>
            <AppIcon color={isPro ? "#FFFFFF" : "#737373"} name="subscription" size={24} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold uppercase text-app-muted">Current Plan</Text>
            <Text className="text-2xl font-bold text-app-text">{isPro ? "BodyCal Pro" : "Free Plan"}</Text>
          </View>
        </View>

        <Text className="text-sm leading-6 text-app-muted">
          {isPro
            ? "Your account has active Pro access to unlimited AI meal scanning and complete history."
            : "Free members can access 30-day weight history and standard calorie tracking."}
        </Text>
      </View>

      {!isPro ? (
        <View className="gap-3 rounded-3xl border border-app-border bg-app-surface p-5">
          <Text className="text-lg font-bold text-app-text">Pro Features Included</Text>
          <View className="gap-2">
            {[
              "Unlimited AI Meal Photo Scanning",
              "Complete Multi-Year Weight History",
              "Advanced Macro & Calorie Analytics",
              "Priority Customer Support",
            ].map((feat) => (
              <View key={feat} className="flex-row items-center gap-2.5">
                <AppIcon color="#111111" name="check" size={18} />
                <Text className="text-sm font-medium text-app-text">{feat}</Text>
              </View>
            ))}
          </View>
          <PrimaryButton icon="subscription" label="View Paywall & Upgrade" onPress={() => router.push("/(app)/paywall")} />
        </View>
      ) : null}

      {message ? <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted">{message}</Text> : null}

      <Pressable
        accessibilityRole="button"
        className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
        disabled={restoring}
        onPress={() => void handleRestore()}
      >
        <AppIcon name="refresh" size={19} />
        <Text className="text-sm font-semibold text-app-text">
          {restoring ? "Restoring purchases…" : "Restore Purchases"}
        </Text>
      </Pressable>
    </AppScreen>
  );
}
