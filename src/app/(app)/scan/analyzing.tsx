import { useAction, useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { ErrorState } from "@/components/ui/states";
import { colors } from "@/config/theme";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { createClientRequestId } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { FeatureScreen } from "@/screens/feature-screen";
import { Pressable, Text } from "@/tw";
import type { Id } from "../../../../convex/_generated/dataModel";

/** Maps a server failure onto localized, actionable copy. */
function describeFailure(cause: unknown, t: (key: string) => string) {
  const message = cause instanceof Error ? cause.message : String(cause ?? "");
  if (message.includes("entitlement") || message.includes("Pro entitlement")) {
    return { text: t("scan.errorEntitlement"), showUpgrade: true };
  }
  if (message.includes("fair-use") || message.includes("limit")) {
    return { text: t("scan.errorQuota"), showUpgrade: false };
  }
  if (message.includes("timed out") || message.includes("timeout")) {
    return { text: t("scan.errorTimeout"), showUpgrade: false };
  }
  if (message.includes("image_too_large") || message.includes("4 MB")) {
    return { text: t("scan.errorTooLarge"), showUpgrade: false };
  }
  if (message.toLowerCase().includes("network")) {
    return { text: t("scan.errorOffline"), showUpgrade: false };
  }
  return { text: t("scan.errorGeneric"), showUpgrade: false };
}

function ConfiguredAnalyzing({ uri }: { uri: string }) {
  const { t } = useTranslation();
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const claimUpload = useMutation(api.uploads.claim);
  const analyzeMeal = useAction(api.ai.analyzeMeal);

  const [failure, setFailure] = React.useState<{ text: string; showUpgrade: boolean } | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const blob = await (await fetch(uri)).blob();
        if (blob.size > 4_000_000) throw new Error("image_too_large");

        const uploadUrl = await generateUploadUrl({});
        const upload = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: blob,
        });
        if (!upload.ok) throw new Error("upload_failed");

        const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> };

        // Claim the blob before it is used, so the server can prove ownership
        // before attaching it to a scan or serving a URL for it.
        await claimUpload({ storageId, purpose: "mealScan" });

        const estimate = await analyzeMeal({
          storageId,
          locale: i18n.resolvedLanguage ?? "en",
          requestId: createClientRequestId(),
        });

        if (!cancelled) {
          router.replace({
            pathname: "/(app)/scan/result",
            params: { uri, estimate: JSON.stringify(estimate), scanId: estimate.scanId },
          });
        }
      } catch (cause) {
        if (!cancelled) setFailure(describeFailure(cause, t));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analyzeMeal, attempt, claimUpload, generateUploadUrl, t, uri]);

  if (failure) {
    return (
      <AppScreen>
        <ErrorState description={failure.text} title={t("scan.errorTitle")} />
        <Text className="px-1 text-[13px] leading-[18px] text-app-muted" selectable>
          {t("scan.errorHint")}
        </Text>

        {failure.showUpgrade ? (
          <PrimaryButton
            icon="subscription"
            label={t("scan.upgradeAction")}
            onPress={() => router.replace("/(app)/paywall")}
          />
        ) : (
          <PrimaryButton
            icon="refresh"
            label={t("scan.retryAction")}
            onPress={() => {
              setFailure(null);
              setAttempt((value) => value + 1);
            }}
          />
        )}

        <SecondaryAction
          icon="camera"
          label={t("scan.retake")}
          onPress={() => router.replace("/(app)/scan/camera")}
        />
        <SecondaryAction
          icon="edit"
          label={t("scan.manualAction")}
          onPress={() => router.replace("/(app)/food/manual")}
        />
      </AppScreen>
    );
  }

  return (
    <FeatureScreen description={t("scan.analyzingDescription")} title={t("scan.analyzingTitle")} />
  );
}

function SecondaryAction({
  icon,
  label,
  onPress,
}: {
  icon: "camera" | "edit";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
      onPress={onPress}
    >
      <AppIcon color={colors.text} name={icon} size={20} />
      <Text className="text-base font-semibold text-app-text">{label}</Text>
    </Pressable>
  );
}

export default function AnalyzingRoute() {
  const { t } = useTranslation();
  const { uri } = useLocalSearchParams<{ uri: string }>();

  if (!hasBackendConfiguration) {
    return <FeatureScreen description={t("config.body")} title={t("config.title")} />;
  }
  if (!uri) {
    return (
      <AppScreen>
        <ErrorState title={t("scan.noEstimateTitle")} description={t("scan.noEstimateDescription")} />
      </AppScreen>
    );
  }
  return <ConfiguredAnalyzing uri={uri} />;
}
