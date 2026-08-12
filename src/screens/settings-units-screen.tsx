import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { Pressable, Text, View } from "@/tw";

export function SettingsUnitsScreen() {
  if (hasBackendConfiguration) return <ConfiguredUnitsScreen />;
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Units</Text>
      <Text className="text-app-muted">Configure Convex to save unit preferences.</Text>
    </AppScreen>
  );
}

function ConfiguredUnitsScreen() {
  const profile = useQuery(api.profiles.getCurrent, {});

  if (profile === undefined) {
    return <AppScreen><Text className="text-app-muted">Loading unit settings…</Text></AppScreen>;
  }

  return <UnitsForm key={profile?._id ?? "new"} profile={profile} />;
}

type ProfileUnitsRecord = {
  weightUnit?: "kg" | "lb";
  heightUnit?: "cm" | "imperial";
} | null;

function UnitsForm({ profile }: { profile: ProfileUnitsRecord }) {
  const updateProfile = useMutation(api.profiles.update);

  const [weightUnit, setWeightUnit] = React.useState<"kg" | "lb">(profile?.weightUnit ?? "kg");
  const [heightUnit, setHeightUnit] = React.useState<"cm" | "imperial">(profile?.heightUnit ?? "cm");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        weightUnit,
        heightUnit,
      });
      setMessage("Units updated.");
      setTimeout(() => router.back(), 1000);
    } catch {
      setMessage("Could not save unit preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Units System</Text>
      <Text className="text-sm text-app-muted">Select measurement display and input units.</Text>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">Weight Unit</Text>
        <View className="flex-row gap-3">
          {(["kg", "lb"] as const).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="button"
              className={weightUnit === u ? "flex-1 rounded-2xl bg-[#111111] py-3.5 items-center" : "flex-1 rounded-2xl border border-app-border bg-white py-3.5 items-center"}
              onPress={() => setWeightUnit(u)}
            >
              <Text className={weightUnit === u ? "text-base font-bold text-white uppercase" : "text-base font-bold text-app-text uppercase"}>{u === "kg" ? "Kilograms (kg)" : "Pounds (lb)"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">Height Unit</Text>
        <View className="flex-row gap-3">
          {(["cm", "imperial"] as const).map((u) => (
            <Pressable
              key={u}
              accessibilityRole="button"
              className={heightUnit === u ? "flex-1 rounded-2xl bg-[#111111] py-3.5 items-center" : "flex-1 rounded-2xl border border-app-border bg-white py-3.5 items-center"}
              onPress={() => setHeightUnit(u)}
            >
              <Text className={heightUnit === u ? "text-base font-bold text-white uppercase" : "text-base font-bold text-app-text uppercase"}>{u === "cm" ? "Centimeters (cm)" : "Feet & Inches (ft/in)"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {message ? <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted">{message}</Text> : null}
      <PrimaryButton disabled={saving} icon="check" label={saving ? "Saving…" : "Save unit settings"} onPress={() => void handleSave()} />
    </AppScreen>
  );
}
