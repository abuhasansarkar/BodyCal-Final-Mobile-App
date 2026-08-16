import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
import { uploadImageToStorage } from "@/features/scan/upload-image";
import { FeatureScreen } from "@/screens/feature-screen";
import { Pressable, Text } from "@/tw";
import type { Id } from "../../../../convex/_generated/dataModel";

type Failure = { text: string; showUpgrade: boolean; canRetry: boolean; title?: string };

/**
 * Maps a failure raised on the device — before the scan exists — onto localized,
 * actionable copy.
 *
 * A `ConvexError` carries the server's own string in `data`; `message` is the
 * client's wrapped stack trace, which happens to embed it but is not the
 * contract. Reading `data` first is what makes the entitlement and quota
 * branches reliable rather than accidental.
 */
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
  // The photo never left the device: retrying the analysis cannot help, and
  // "we could not analyse this meal" points the user at the wrong problem.
  if (message.includes("upload_failed")) {
    return { text: t("scan.errorUpload"), showUpgrade: false, canRetry: true };
  }
  // Nothing the user can do, and no amount of retrying will change it.
  if (message.includes("not configured")) {
    return { text: t("scan.errorUnavailable"), showUpgrade: false, canRetry: false };
  }
  if (message.toLowerCase().includes("network")) {
    return { text: t("scan.errorOffline"), showUpgrade: false, canRetry: true };
  }
  return { text: t("scan.errorGeneric"), showUpgrade: false, canRetry: true };
}

/**
 * Maps a failure the server recorded on the scan row onto the same copy.
 *
 * Categories come from `ai.runScanAnalysis` and describe our request, never the
 * photo. `retryable` is the server's decision — the client does not get to
 * re-ask for a request the provider will never accept.
 */
function describeScanFailure(
  category: string | null,
  retryable: boolean,
  t: (key: string) => string,
): Failure {
  const base = { showUpgrade: false, canRetry: retryable };
  // Not a failure of the analysis: the analysis worked and its answer was "that
  // is not food". Retrying the same photo would only reach it again.
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

/** Rotating copy while the provider works. Never a fake percentage. */
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

function ConfiguredAnalyzing({ uri, resumedScanId }: { uri?: string; resumedScanId?: Id<"aiScans"> }) {
  const { t } = useTranslation();
  const generateUploadUrl = useMutation(api.uploads.generateUploadUrl);
  const claimUpload = useMutation(api.uploads.claim);
  const startScan = useAction(api.ai.startScan);
  const retryScan = useMutation(api.aiDb.retryScan);

  const [scanId, setScanId] = React.useState<Id<"aiScans"> | null>(resumedScanId ?? null);
  const [startFailure, setStartFailure] = React.useState<Failure | null>(null);
  const [attempt, setAttempt] = React.useState(0);

  /*
    The single guard that decides whether a photo is uploaded and a scan bought.

    The previous version ran the whole upload-and-analyse sequence in an effect
    whose cleanup only set a `cancelled` flag — which stops the *result* being
    used but not the paid work already in flight — and minted the idempotency key
    *inside* the effect body, so every re-run produced a fresh key and defeated
    the server's `by_user_request` dedup. A StrictMode double-mount, or `t`
    changing identity when a language bundle loaded, was enough to buy a second
    analysis of the same photo. A ref survives the re-run; state and flags do not.
  */
  const startedAttempt = React.useRef(-1);

  React.useEffect(() => {
    // Resumed from a scan already in flight: there is nothing to upload.
    if (resumedScanId || !uri) return;
    if (startedAttempt.current === attempt) return;
    startedAttempt.current = attempt;

    void (async () => {
      try {
        const uploadUrl = await generateUploadUrl({});
        const { storageId } = await uploadImageToStorage(uploadUrl, uri);

        // Claim the blob before it is used, so the server can prove ownership
        // before attaching it to a scan or serving a URL for it.
        await claimUpload({ storageId, purpose: "mealScan" });

        const started = await startScan({
          storageId,
          locale: i18n.resolvedLanguage ?? "en",
          requestId: createClientRequestId(),
        });

        // Recorded unconditionally. The scan is already paid for by this point,
        // so dropping its id on the floor because the effect was torn down is
        // how a completed analysis becomes unreachable.
        setScanId(started.scanId);
        // Put the scan in the URL too, so reopening this screen rejoins the same
        // analysis instead of paying for a second one.
        router.setParams({ scanId: started.scanId });
      } catch (cause) {
        console.error("Meal scan upload/start error:", cause);
        setStartFailure(describeStartFailure(cause, t));
      }
    })();
    // `t` is deliberately absent: it is only read inside the catch, and
    // react-i18next changes its identity when a bundle loads, which would
    // re-run this effect mid-upload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, claimUpload, generateUploadUrl, resumedScanId, startScan, uri]);

  // The scan itself is durable and reactive: this is what carries
  // pending → processing → completed, regardless of what the client was doing.
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
              // A scan that already exists is re-queued against the image it
              // already has; only a start that never got that far re-uploads.
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

  // Uploading until the scan exists; analysing once the server owns it.
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

export default function AnalyzingRoute() {
  const { t } = useTranslation();
  const { uri, scanId } = useLocalSearchParams<{ uri?: string; scanId?: string }>();

  if (!hasBackendConfiguration) {
    return <FeatureScreen description={t("config.body")} title={t("config.title")} />;
  }
  // Either a photo to send, or a scan already in flight to rejoin.
  if (!uri && !scanId) {
    return (
      <AppScreen>
        <ErrorState title={t("scan.noEstimateTitle")} description={t("scan.noEstimateDescription")} />
      </AppScreen>
    );
  }
  return <ConfiguredAnalyzing resumedScanId={scanId as Id<"aiScans"> | undefined} uri={uri} />;
}
