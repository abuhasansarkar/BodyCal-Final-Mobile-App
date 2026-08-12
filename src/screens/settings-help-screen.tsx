import { Linking } from "react-native";
import React from "react";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { Pressable, Text, View } from "@/tw";

const faqItems = [
  {
    q: "How does BodyCal calculate calorie targets?",
    a: "BodyCal uses the Mifflin-St Jeor formula based on your age, biological sex, height, weight, and activity level to estimate your Basal Metabolic Rate (BMR) and Total Daily Energy Expenditure (TDEE).",
  },
  {
    q: "Are AI meal scan results exact medical measurements?",
    a: "No. AI meal scan results are editable estimates designed for general wellness guidance. Always review and adjust portion sizes as needed.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "Subscriptions are managed directly by Apple App Store (iOS) or Google Play Store (Android). You can manage or cancel auto-renewal in your device account settings.",
  },
];

export function SettingsHelpScreen() {
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Help & Support
      </Text>

      <View className="gap-3">
        <Text className="px-1 text-lg font-bold text-app-text">Frequently Asked Questions</Text>
        {faqItems.map((item, idx) => (
          <View key={idx} className="gap-1.5 rounded-3xl border border-app-border bg-white p-4">
            <Text className="text-base font-bold text-app-text">{item.q}</Text>
            <Text className="text-sm leading-6 text-app-muted">{item.a}</Text>
          </View>
        ))}
      </View>

      <View className="gap-3 rounded-3xl border border-app-border bg-app-surface p-5">
        <Text className="text-lg font-bold text-app-text">Contact Support</Text>
        <Text className="text-sm leading-6 text-app-muted">Need additional assistance with your account or food logs?</Text>
        <Pressable
          accessibilityRole="button"
          className="min-h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-[#111111] px-4 active:opacity-80"
          onPress={() => void Linking.openURL("mailto:support@bodycal.app")}
        >
          <AppIcon color="#FFFFFF" name="help" size={18} />
          <Text className="text-sm font-semibold text-white">Email Support Team</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
