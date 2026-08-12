import { useAction, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { createClientRequestId } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { FeatureScreen } from "@/screens/feature-screen";
import { Pressable, Text, View } from "@/tw";

function ConfiguredAnalyzing({ uri }: { uri: string }) {
  const generateUploadUrl = useMutation(api.aiDb.generateUploadUrl);
  const analyzeMeal = useAction(api.ai.analyzeMeal);
  const [error, setError] = React.useState<string | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const blob = await (await fetch(uri)).blob();
        if (blob.size > 4_000_000) throw new Error("The compressed photo is larger than 4 MB.");
        const uploadUrl = await generateUploadUrl({});
        const upload = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob });
        if (!upload.ok) throw new Error("Photo upload failed.");
        const { storageId } = await upload.json() as { storageId: Id<"_storage"> };
        const estimate = await analyzeMeal({ storageId, locale: i18n.resolvedLanguage ?? "en", requestId: createClientRequestId() });
        if (!cancelled) router.replace({ pathname: "/(app)/scan/result", params: { uri, estimate: JSON.stringify(estimate), scanId: estimate.scanId } });
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Meal analysis failed.");
      }
    })();
    return () => { cancelled = true; };
  }, [analyzeMeal, attempt, generateUploadUrl, uri]);

  const handleRetry = () => {
    setError(null);
    setAttempt((a) => a + 1);
  };

  if (error) {
    return (
      <AppScreen>
        <View className="gap-3 rounded-3xl border border-app-border bg-white p-6">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F1]">
            <AppIcon color="#DC2626" name="warning" size={24} />
          </View>
          <Text accessibilityRole="header" className="text-2xl font-bold text-app-text">
            Could not analyze this meal
          </Text>
          <Text className="text-sm leading-6 text-app-muted">
            {error}
          </Text>
          <Text className="text-xs text-app-muted">
            You can retry the analysis, retake the photo, or enter your meal nutrition manually.
          </Text>
        </View>

        <PrimaryButton icon="refresh" label="Retry Analysis" onPress={handleRetry} />

        <Pressable
          accessibilityRole="button"
          className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
          onPress={() => router.replace("/(app)/scan/camera")}
        >
          <AppIcon name="camera" size={20} />
          <Text className="text-base font-semibold text-app-text">Retake Photo</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
          onPress={() => router.replace("/(app)/add-food")}
        >
          <AppIcon name="edit" size={20} />
          <Text className="text-base font-semibold text-app-text">Enter Manually</Text>
        </Pressable>
      </AppScreen>
    );
  }

  return (
    <FeatureScreen
      description="Identifying foods, estimating portions, and calculating nutrition. Results are estimates and must be reviewed."
      title="Analyzing your meal…"
    />
  );
}

export default function AnalyzingRoute() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  if (hasBackendConfiguration) return <ConfiguredAnalyzing uri={uri} />;
  return <FeatureScreen description="Configure Convex, RevenueCat, and the server-side AI provider before meal analysis can run." title="AI setup required" />;
}
