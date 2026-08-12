import { useQuery } from "convex/react";
import React from "react";
import { Share } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Text, View } from "@/tw";

export function SettingsPrivacyScreen() {
  if (hasBackendConfiguration) return <ConfiguredPrivacyScreen />;
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Privacy Policy & Data</Text>
      <Text className="text-app-muted">BodyCal stores your nutrition and weight data securely in Convex.</Text>
    </AppScreen>
  );
}

function ConfiguredPrivacyScreen() {
  const profile = useQuery(api.profiles.getCurrent, {});
  const logs = useQuery(api.foodLogs.getHistory, { fromDate: "2000-01-01", toDate: currentLocalDate(), limit: 500 });
  const weights = useQuery(api.weights.getHistory, { limit: 500 });

  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        profile,
        foodLogs: logs ?? [],
        weightLogs: weights ?? [],
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      await Share.share({
        title: "BodyCal My Data Export",
        message: jsonStr,
      });
    } catch {
      // Ignore share cancellation
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Privacy & Data Control</Text>
      <Text className="text-sm text-app-muted">
        Your health data belongs to you. You can export or delete your account records at any time.
      </Text>

      <View className="gap-3 rounded-3xl border border-app-border bg-white p-5">
        <Text className="text-base font-bold text-app-text">Privacy Safeguards</Text>
        <View className="gap-2">
          <Text className="text-sm leading-6 text-app-muted">
            • Photos uploaded for AI scanning are retained for maximum 24h if abandoned, or 30 days if attached to a meal log.
          </Text>
          <Text className="text-sm leading-6 text-app-muted">
            • Crash logs and analytics telemetry strictly scrub PII, photos, notes, and calorie amounts.
          </Text>
          <Text className="text-sm leading-6 text-app-muted">
            • We never sell or share user nutrition data with third-party advertisers.
          </Text>
        </View>
      </View>

      <View className="gap-3 rounded-3xl border border-app-border bg-app-surface p-5">
        <Text className="text-base font-bold text-app-text">Export Personal Data</Text>
        <Text className="text-sm leading-6 text-app-muted">
          Download a complete copy of your food logs, body weights, and profile settings in JSON format.
        </Text>
        <PrimaryButton icon="privacy" label={exporting ? "Exporting data…" : "Export My Data (JSON)"} onPress={() => void handleExport()} />
      </View>
    </AppScreen>
  );
}
