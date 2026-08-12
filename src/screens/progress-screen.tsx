import { useQuery } from "convex/react";
import { router } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { Text, View } from "@/tw";

function ProgressContent({ progress }: { progress?: any }) {
  const latest = progress?.latest?.normalizedKg ?? progress?.profile?.currentWeightKg;
  return (
    <AppScreen>
      <Text className="text-3xl font-bold text-app-text">Your progress</Text>
      <View className="gap-3 rounded-3xl border border-app-border bg-app-surface p-5">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name="weight" size={25} weight="semibold" /></View>
        {latest ? <><Text className="text-3xl font-bold text-app-text">{latest.toFixed(1)} kg</Text><Text className="text-sm text-app-muted">Goal {progress?.profile?.goalWeightKg?.toFixed(1) ?? "—"} kg · {progress?.count ?? 0} entries</Text></> : <><Text className="text-base font-semibold text-app-text">No weight entries yet</Text><Text className="text-sm text-app-muted">Add your first measurement to begin the chart.</Text></>}
      </View>
      <PrimaryButton icon="weight" label="Add weight" onPress={() => router.push("/(app)/weight/add")} />
    </AppScreen>
  );
}

function ConfiguredProgress() {
  const progress = useQuery(api.weights.getProgress, {});
  if (progress === undefined) return <AppScreen><Text className="text-app-muted">Loading progress…</Text></AppScreen>;
  return <ProgressContent progress={progress} />;
}

export function ProgressScreen() {
  return hasBackendConfiguration ? <ConfiguredProgress /> : <ProgressContent />;
}
