import React from "react";

import { AppScreen } from "@/components/app-screen";
import { Text, View } from "@/tw";

export function SettingsTermsScreen() {
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Terms of Service
      </Text>
      <Text className="text-sm text-app-muted">
        Last updated: August 2026
      </Text>

      <View className="gap-4 rounded-3xl border border-app-border bg-white p-5">
        <Text className="text-base font-bold text-app-text">1. Wellness & Calorie Guidance Disclaimer</Text>
        <Text className="text-sm leading-6 text-app-muted">
          BodyCal is intended for wellness, fitness, and nutritional guidance for healthy adults (ages 18–80). BodyCal is not a medical device, diagnosis tool, or clinical treatment. Calculated calorie targets and AI photo scan results are estimates, never measured medical facts.
        </Text>

        <Text className="text-base font-bold text-app-text">2. Subscriptions & Billing</Text>
        <Text className="text-sm leading-6 text-app-muted">
          Pro subscriptions auto-renew unless cancelled at least 24 hours before the end of the current billing cycle. Auto-renewal can be managed or cancelled in your Apple App Store or Google Play Store account settings.
        </Text>

        <Text className="text-base font-bold text-app-text">3. Data Usage & Ownership</Text>
        <Text className="text-sm leading-6 text-app-muted">
          You retain full ownership of your logged nutrition data, weights, and account profile. You may export or permanently delete your account data at any time.
        </Text>
      </View>
    </AppScreen>
  );
}
