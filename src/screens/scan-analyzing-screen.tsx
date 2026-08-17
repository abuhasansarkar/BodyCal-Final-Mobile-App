import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { ErrorState } from "@/components/ui/states";
import { colors, macroColors } from "@/config/theme";
import { hasBackendConfiguration } from "@/config/env";
import { api } from "@/lib/convex-api";
import { createClientRequestId } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { uploadImageToStorage } from "../features/scan/upload-image";
import { FeatureScreen } from "@/screens/feature-screen";
import { Pressable, Text, View } from "@/tw";
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
  if (message.includes("image_unreadable")) {
    return { text: t("scan.errorImageGone"), showUpgrade: false, canRetry: false };
  }
  if (message.includes("upload_timeout")) {
    return { text: t("scan.errorTimeout"), showUpgrade: false, canRetry: true };
  }
  if (message.includes("upload_failed") || message.includes("upload_invalid_response")) {
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
  const [activeStepIndex, setActiveStepIndex] = React.useState(0);
  const startedAttempt = React.useRef(-1);

  // Animation values initialized with lazy state to satisfy React 19 compiler
  const [scanLineAnim] = React.useState(() => new Animated.Value(0));
  const [pulseAnim] = React.useState(() => new Animated.Value(1));

  // Step ticker
  React.useEffect(() => {
    if (startFailure) return;
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => (prev < STEP_KEYS.length - 1 ? prev + 1 : prev));
    }, 2_400);
    return () => clearInterval(timer);
  }, [startFailure]);

  // Laser scan line & radar animations
  React.useEffect(() => {
    const scanLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    scanLoop.start();
    pulseLoop.start();

    return () => {
      scanLoop.stop();
      pulseLoop.stop();
    };
  }, [pulseAnim, scanLineAnim]);

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
        const failure = describeStartFailure(cause, t);
        if (failure.showUpgrade) {
          console.log("[scan] Pro entitlement required for AI meal scan");
        } else {
          console.error("Meal scan upload/start error:", cause);
        }
        setStartFailure(failure);
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

  const translateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* Header */}
      <View className="h-14 flex-row items-center justify-between px-5">
        <Pressable
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
          className="h-10 w-10 items-center justify-center rounded-full active:bg-[#F5F5F5]"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/today"))}
        >
          <AppIcon name="back" size={22} />
        </Pressable>
        <View className="flex-row items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3.5 py-1.5">
          <AppIcon color="#111111" name="motivation" size={15} />
          <Text className="text-xs font-semibold text-[#111111]">BodyCal AI</Text>
        </View>
        <View className="w-10" />
      </View>

      <View className="flex-1 justify-between px-5 pb-6 pt-2">
        {/* Main Content Card */}
        <View className="gap-5">
          {/* Visual Scanner Area */}
          {uri ? (
            <View
              className="relative h-60 w-full overflow-hidden rounded-[26px] border border-[#E8E8E8] bg-[#F7F7F7]"
              style={{ borderCurve: "continuous" }}
            >
              <Image
                accessibilityLabel={t("scan.analyzingTitle")}
                contentFit="cover"
                source={{ uri }}
                style={StyleSheet.absoluteFill}
              />
              {/* Dark vignette gradient overlay */}
              <View className="absolute inset-0 bg-black/25" />

              {/* Viewfinder Target Markers */}
              <View className="absolute inset-4 rounded-2xl border border-white/40 pointer-events-none" />

              {/* Animated Laser Scan Line */}
              <Animated.View
                style={[
                  {
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: 10,
                    height: 3,
                    backgroundColor: "#FFFFFF",
                    shadowColor: "#FFFFFF",
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.9,
                    shadowRadius: 10,
                    elevation: 6,
                    transform: [{ translateY }],
                  },
                ]}
              />

              {/* Floating Pill Status */}
              <View className="absolute bottom-3 left-3 right-3 flex-row items-center justify-between rounded-xl bg-black/60 px-3.5 py-2 backdrop-blur-md">
                <View className="flex-row items-center gap-2">
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <View className="h-2.5 w-2.5 rounded-full bg-[#22A06B]" />
                  </Animated.View>
                  <Text className="text-xs font-semibold text-white">
                    {t(STEP_KEYS[activeStepIndex])}
                  </Text>
                </View>
                <Text className="text-[11px] font-medium text-white/70">
                  {activeStepIndex + 1}/{STEP_KEYS.length}
                </Text>
              </View>
            </View>
          ) : (
            <View
              className="h-44 w-full items-center justify-center rounded-[26px] border border-[#E8E8E8] bg-[#F7F7F7]"
              style={{ borderCurve: "continuous" }}
            >
              <Animated.View
                className="h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm"
                style={{ transform: [{ scale: pulseAnim }] }}
              >
                <AppIcon color="#111111" name="scan" size={36} weight="semibold" />
              </Animated.View>
            </View>
          )}

          {/* Heading and Subtitle */}
          <View className="gap-1 px-1">
            <Text
              accessibilityRole="header"
              className="text-[26px] font-bold tracking-[-0.6px] text-[#111111]"
              selectable
            >
              {t("scan.analyzingTitle")}
            </Text>
            <Text className="text-[14px] leading-5 text-[#737373]" selectable>
              {t("scan.analyzingDescription")}
            </Text>
          </View>

          {/* Step Progression Card */}
          <View
            className="gap-3 rounded-[22px] border border-[#ECECEC] bg-white p-4 shadow-sm"
            style={{ borderCurve: "continuous" }}
          >
            {STEP_KEYS.map((key, index) => {
              const isCompleted = index < activeStepIndex;
              const isCurrent = index === activeStepIndex;

              return (
                <View className="flex-row items-center gap-3.5 py-1" key={key}>
                  <View
                    className={`h-7 w-7 items-center justify-center rounded-full ${
                      isCompleted
                        ? "bg-[#22A06B]"
                        : isCurrent
                          ? "border-2 border-[#111111] bg-white"
                          : "bg-[#F0F0F0]"
                    }`}
                  >
                    {isCompleted ? (
                      <AppIcon color="#FFFFFF" name="check" size={15} weight="semibold" />
                    ) : isCurrent ? (
                      <View className="h-2.5 w-2.5 rounded-full bg-[#111111]" />
                    ) : (
                      <View className="h-1.5 w-1.5 rounded-full bg-[#B0B0B0]" />
                    )}
                  </View>
                  <Text
                    className={`min-w-0 flex-1 text-[15px] ${
                      isCompleted
                        ? "font-semibold text-[#111111]"
                        : isCurrent
                          ? "font-bold text-[#111111]"
                          : "font-medium text-[#A3A3A3]"
                    }`}
                    selectable
                  >
                    {t(key)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Macro Skeletons Teaser */}
          <View className="flex-row gap-2.5">
            <MacroTeaser color={macroColors.calories} label={t("common.calories", "Calories")} />
            <MacroTeaser color={macroColors.protein} label={t("common.protein", "Protein")} />
            <MacroTeaser color={macroColors.carbs} label={t("common.carbs", "Carbs")} />
            <MacroTeaser color={macroColors.fat} label={t("common.fat", "Fat")} />
          </View>
        </View>

        {/* Footer Actions */}
        <View className="gap-3 pt-4">
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-2xl border border-[#E8E8E8] bg-white px-4 active:bg-[#F7F7F7]"
            onPress={() => router.replace("/(app)/food/manual")}
          >
            <Text className="text-sm font-semibold text-[#525252]">{t("scan.manualAction")}</Text>
          </Pressable>
          <Text className="text-center text-[12px] text-[#A3A3A3]" selectable>
            {t("common.estimated")}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function MacroTeaser({ color, label }: { color: string; label: string }) {
  return (
    <View
      className="min-h-[56px] flex-1 items-center justify-center gap-1 rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] p-2"
      style={{ borderCurve: "continuous" }}
    >
      <View className="flex-row items-center gap-1">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="text-[11px] font-semibold text-[#737373]">{label}</Text>
      </View>
      <View className="h-3 w-10 rounded-full bg-[#E5E5E5]" />
    </View>
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
