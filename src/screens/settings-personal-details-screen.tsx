import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { AuthField } from "@/screens/auth/auth-fields";
import { Pressable, Text, View } from "@/tw";

type Activity = "sedentary" | "light" | "active" | "veryActive";

export function SettingsPersonalDetailsScreen() {
  if (hasBackendConfiguration) return <ConfiguredPersonalDetails />;
  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Personal Details</Text>
      <Text className="text-app-muted">Configure Convex to save profile updates.</Text>
    </AppScreen>
  );
}

function ConfiguredPersonalDetails() {
  const profile = useQuery(api.profiles.getCurrent, {});

  if (profile === undefined) {
    return <AppScreen><Text className="text-app-muted">Loading details…</Text></AppScreen>;
  }

  return <PersonalDetailsForm key={profile?._id ?? "new"} profile={profile} />;
}

type ProfileRecord = {
  calculationBasis?: "female" | "male";
  heightCm?: number;
  currentWeightKg?: number;
  activityLevel?: string;
} | null;

function PersonalDetailsForm({ profile }: { profile: ProfileRecord }) {
  const updateProfile = useMutation(api.profiles.update);

  const [basis, setBasis] = React.useState<"male" | "female">(profile?.calculationBasis ?? "male");
  const [heightCm, setHeightCm] = React.useState(String(profile?.heightCm ?? 175));
  const [weightKg, setWeightKg] = React.useState(String(profile?.currentWeightKg ?? 70));
  const [activity, setActivity] = React.useState<Activity>((profile?.activityLevel as Activity) ?? "light");
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({
        calculationBasis: basis,
        heightCm: Math.max(100, Math.min(250, Number(heightCm) || 175)),
        currentWeightKg: Math.max(35, Math.min(350, Number(weightKg) || 70)),
        activityLevel: activity,
      });
      setMessage("Personal details saved.");
      setTimeout(() => router.back(), 1000);
    } catch {
      setMessage("Could not save personal details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">Personal Details</Text>
      <Text className="text-sm text-app-muted">Update your biological attributes for accurate calorie calculations.</Text>

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">Calculation Formula Basis</Text>
        <View className="flex-row gap-3">
          {(["male", "female"] as const).map((b) => (
            <Pressable
              key={b}
              accessibilityRole="button"
              className={basis === b ? "flex-1 rounded-2xl bg-[#111111] py-3 items-center" : "flex-1 rounded-2xl border border-app-border bg-white py-3 items-center"}
              onPress={() => setBasis(b)}
            >
              <Text className={basis === b ? "text-sm font-semibold text-white capitalize" : "text-sm font-semibold text-app-text capitalize"}>{b}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <AuthField keyboardType="decimal-pad" label="Height (cm)" onChangeText={setHeightCm} value={heightCm} />
      <AuthField keyboardType="decimal-pad" label="Current Weight (kg)" onChangeText={setWeightKg} value={weightKg} />

      <View className="gap-2">
        <Text className="px-1 text-sm font-semibold text-app-text">Activity Level</Text>
        <View className="gap-2">
          {(["sedentary", "light", "active", "veryActive"] as Activity[]).map((a) => (
            <Pressable
              key={a}
              accessibilityRole="button"
              className={activity === a ? "rounded-2xl border-2 border-[#111111] bg-white p-3.5" : "rounded-2xl border border-app-border bg-white p-3.5"}
              onPress={() => setActivity(a)}
            >
              <Text className="text-base font-bold text-app-text capitalize">{a}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {message ? <Text accessibilityLiveRegion="polite" className="px-1 text-sm text-app-muted">{message}</Text> : null}
      <PrimaryButton disabled={saving} icon="check" label={saving ? "Saving…" : "Save details"} onPress={() => void handleSave()} />
    </AppScreen>
  );
}
