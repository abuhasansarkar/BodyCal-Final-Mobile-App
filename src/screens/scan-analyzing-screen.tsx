import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { router } from "expo-router";
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
import { uploadImageToStorage } from "@/features/scan/upload-image";
import { FeatureScreen } from "@/screens/feature-screen";
import { Pressable, Text } from "@/tw";
import type { Id } from "../../convex/_generated/dataModel";

type Failure = { text: string; showUpgrade: boolean; canRetry: boolean; title?: string };

function describeStartFailure(cause: unknown, t: (key: string) => string): Failure {
  const data = cause instanceof ConvexError ? cause.data : undefined;
  const message =
    typeof data === "string" ? data : cause instanceof Error ? cause.message : String(cause ?? "");

  if (message.includes("entitlement") || message.includes("Pro entitlement")) {
    return { text: t("scan.errorEntitlement"), showUpgrade: true, canRetry: false };
  }
  if (message.includes("fair-use") || message.includes("limit")) {
    return { text: t("scan.errorQuota"), showUpgrade: false, canRetry: false };
  }
  if (message.includes("image_too_large") || message.includes("4 MB")) {
    return { text: t("scan.errorTooLarge"), showUpgrade: false, canRetry: false };
  }
  if (message.includes("upload_failed")) {
    return { text: t("scan.errorUpload"), showUpgrade: false, canRetry: true };
  }
  if (message.includes("not configured")) {
    return { text: t("scan.errorUnavailable"), showUpgrade: false, canRetry: false };
  }
  if (message.toLowerCase().includes("network")) {
    return { text: t("scan.errorOffline"), showUpgrade: false, canRetry: true };
  }
  return { text: t("scan.errorGeneric"), showUpgrade: false, canRetry: true };
}

function describeScanFailure(
  category: string | null,
  retryable: boolean,
  t: (key: string) => string,
): Failure {
  const base = { showUpgrade: false, canRetry: retryable };
  if (category === "no_food") {
    return {
      ...base,
      canRetry: false,
      text: t("scan.errorNoFood"),
      title: t("scan.errorNoFoodTitle"),
    };
  }
  if (category === "not_configured") {
    return { ...base, text: t("scan.errorUnavailable"), canRetry: false };
  }
  if (category === "image_unavailable") {
    return { ...base, text: t("scan.errorImageGone"), canRetry: false };
  }
  if (category === "timeout" || category === "connection") {
    return { ...base, text: t("scan.errorTimeout") };
  }
  if (category === "provider:429") return { ...base, text: t("scan.errorBusy") };
  return { ...base, text: t("scan.errorGeneric") };
}

const STEP_KEYS = [
  "scan.stepIdentifying",
  "scan.stepPortions",
  "scan.stepCalories",
  "scan.stepNutrition",
] as const;

function useAnalysisStep(active: boolean) {
  const [index, setIndex] = React.useState(0);
  React.useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setIndex((value) => (value + 1) % STEP_KEYS.length), 2_600);
    return () => clearInterval(timer);
  }, [active]);
  return STEP_KEYS[index];
}

export function ScanAnalyzingScreen({ uri, scanId }: { uri?: string; scanId?: string }) {
  const { t } = useTranslation();

  if (!hasBackendConfiguration) {
    return <FeatureScreen description={t("config.body")} title={t("config.title")} />;
  }
  if (!uri && !scanId) {
    return (
      <AppScreen>
        <ErrorState title={t("scan.noEstimateTitle")} description={t("scan.noEstimateDescription")} />
      </AppScreen>
    );
  }
  return <ConfiguredAnalyzing resumedScanId={scanId as Id<"aiScans"> | undefined} uri={uri} />;
}

function ConfiguredAnalyzing({ uri, resumedScanId }: { uri?: string; resumedScanId?: Id<"aiScans"> }) {
  const { t } = useTranslation();
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const claimUpload = useMutation(api.uploads.claim);
  const startScan = useAction(api.ai.startScan);
  const retryScan = useMutation(api.aiDb.retryScan);

  const [scanId, setScanId] = React.useState<Id<"aiScans"> | null>(resumedScanId ?? null);
  const [startFailure, setStartFailure] = React.useState<Failure | null>(null);
  const [attempt, setAttempt] = React.useState(0);
  const startedAttempt = React.useRef(-1);

  React.useEffect(() => {
    if (resumedScanId || !uri) return;
    if (startedAttempt.current === attempt) return;
    startedAttempt.current = attempt;

    void (async () => {
      try {
        const uploadUrl = await generateUploadUrl({});
        const { storageId } = await uploadImageToStorage(uploadUrl, uri);

        await claimUpload({ storageId, purpose: "mealScan" });

        const started = await startScan({
          storageId,
          locale: i18n.resolvedLanguage ?? "en",
          requestId: createClientRequestId(),
        });

        setScanId(started.scanId);
        router.setParams({ scanId: started.scanId });
      } catch (cause) {
        console.error("Meal scan upload/start error:", cause);
        setStartFailure(describeStartFailure(cause, t));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, claimUpload, generateUploadUrl, resumedScanId, startScan, uri]);

  const scan = useQuery(api.aiDb.getScan, scanId ? { scanId } : "skip");

  React.useEffect(() => {
    if (scan?.status === "completed" && scanId) {
      router.replace({ pathname: "/(app)/scan/result", params: { scanId } });
    }
  }, [scan?.status, scanId]);

  const failure =
    startFailure ??
    (scan?.status === "failed"
      ? describeScanFailure(scan.failureCategory, scan.retryable, t)
      : null);

  const step = useAnalysisStep(failure === null);

  if (failure) {
    return (
      <AppScreen>
        <ErrorState description={failure.text} title={failure.title ?? t("scan.errorTitle")} />
        <Text className="px-1 text-[13px] leading-4.5 text-app-muted" selectable>
          {t("scan.errorHint")}
        </Text>

        {failure.showUpgrade ? (
          <PrimaryButton
            icon="subscription"
            label={t("scan.upgradeAction")}
            onPress={() => router.replace("/(app)/paywall")}
          />
        ) : failure.canRetry ? (
          <PrimaryButton
            icon="refresh"
            label={t("scan.retryAction")}
            onPress={() => {
              setStartFailure(null);
              if (scanId) void retryScan({ scanId }).catch(() => setAttempt((v) => v + 1));
              else setAttempt((value) => value + 1);
            }}
          />
        ) : null}

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

  const waitingOnUpload = scanId === null;
  return (
    <FeatureScreen
      description={waitingOnUpload ? t("scan.uploadingDescription") : t(step)}
      title={waitingOnUpload ? t("scan.uploadingTitle") : t("scan.analyzingTitle")}
    />
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
