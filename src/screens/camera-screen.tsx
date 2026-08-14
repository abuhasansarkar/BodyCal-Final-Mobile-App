import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
// `Image` comes from the tw wrapper, not expo-image directly: only the wrapper
// pipes `className` through to a style. Imported bare, the hero's sizing classes
// were dropped and it collapsed to zero height.
import { Image, Pressable, ScrollView, Text, View } from "@/tw";

const scanHero = require("@/../assets/images/welcome-food-scan-hero.png");

/**
 * Scrims behind the chrome.
 *
 * The controls and the framing hint are white, and a meal photographed under the
 * "use lots of light" advice from the education screen is frequently white too —
 * a plate, a tablecloth, an overexposed window behind it. Without these the hint
 * disappears against bright food.
 */
const TOP_SCRIM = "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))";
const BOTTOM_SCRIM = "linear-gradient(to top, rgba(0,0,0,0.65), rgba(0,0,0,0))";

export function CameraScreen() {
  const { t } = useTranslation();
  const cameraRef = React.useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = React.useState(false);
  const [torch, setTorch] = React.useState(false);
  const [mountFailed, setMountFailed] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Guards the whole hand-off, not just the native call: `takePictureAsync`
  // resolves before the push commits, so a second tap in that window pushed the
  // preview twice and left a duplicate screen behind the first.
  const [busy, setBusy] = React.useState(false);

  const continueWith = (asset: { uri: string; width?: number; height?: number }) =>
    router.push({
      pathname: "/(app)/scan/preview",
      params: { uri: asset.uri, width: String(asset.width ?? ""), height: String(asset.height ?? "") },
    });

  const capture = async () => {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85 });
      if (picture) continueWith(picture);
      else setError(t("camera.captureError"));
    } catch {
      // A capture can fail for reasons the user can recover from by retrying —
      // an interrupting call, the shutter fired mid-reconfiguration. Surfacing it
      // beats an unhandled rejection and a shutter that appears to do nothing.
      setError(t("camera.captureError"));
    } finally {
      setBusy(false);
    }
  };

  const pick = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
      const asset = result.assets?.[0];
      if (asset) continueWith(asset);
    } catch {
      setError(t("camera.pickError"));
    } finally {
      setBusy(false);
    }
  };

  if (!permission) return <View className="flex-1 bg-black" />;
  if (!permission.granted) {
    return (
      <CameraEducation
        canAskAgain={permission.canAskAgain}
        onBack={() => router.back()}
        onContinue={() => permission.canAskAgain ? void requestPermission() : void Linking.openSettings()}
      />
    );
  }

  return (
    <View className="flex-1 bg-black">
      {/*
        `style`, not `className`: metro runs NativeWind with
        `globalClassNamePolyfill: false`, so only the components wrapped in
        `@/tw` translate a class list into a style. `CameraView` comes straight
        from expo-camera, so `className="flex-1"` was dropped and the preview
        laid out at zero height — the screen rendered as the black backdrop with
        the controls floating on it, and every capture photographed a live but
        invisible camera.
      */}
      {mountFailed ? null : (
        <CameraView
          enableTorch={torch}
          facing="back"
          onCameraReady={() => setReady(true)}
          onMountError={() => setMountFailed(true)}
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
        />
      )}

      {mountFailed ? (
        <CameraUnavailable onBack={() => router.back()} onPick={() => void pick()} />
      ) : (
        <>
          {!ready ? (
            <View className="absolute inset-0 items-center justify-center gap-3">
              <ActivityIndicator color="#FFFFFF" />
              <Text className="text-sm font-medium text-white/80">{t("camera.starting")}</Text>
            </View>
          ) : (
            <ViewfinderGuide />
          )}

          <View
            className="absolute inset-x-0 top-0"
            pointerEvents="none"
            style={{ height: insets.top + 96, experimental_backgroundImage: TOP_SCRIM }}
          />
          <View
            className="absolute inset-x-0 bottom-0"
            pointerEvents="none"
            style={{ height: insets.bottom + 168, experimental_backgroundImage: BOTTOM_SCRIM }}
          />

          <View className="absolute inset-x-0 flex-row items-start justify-between px-6" style={{ top: insets.top + 12 }}>
            <View className="h-12 w-12" />
            <Text
              accessibilityRole="header"
              className="min-w-0 flex-1 px-3 pt-3 text-center text-base font-semibold text-white"
            >
              {t("camera.frameMeal")}
            </Text>
            <Pressable
              accessibilityLabel={torch ? t("camera.torchOff") : t("camera.torchOn")}
              accessibilityRole="button"
              accessibilityState={{ selected: torch }}
              className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
              onPress={() => setTorch((value) => !value)}
              style={{ backgroundColor: torch ? "#FFFFFF" : "rgba(0,0,0,0.6)" }}
            >
              <AppIcon color={torch ? "#111111" : "#FFFFFF"} name={torch ? "torch" : "torchOff"} size={22} weight="semibold" />
            </Pressable>
          </View>

          <View className="absolute inset-x-0 gap-4 px-6" style={{ bottom: insets.bottom + 16 }}>
            {error ? (
              <Text
                accessibilityLiveRegion="assertive"
                accessibilityRole="alert"
                className="self-center rounded-2xl bg-black/70 px-4 py-2.5 text-center text-sm font-medium text-white"
                selectable
              >
                {error}
              </Text>
            ) : null}

            <View className="flex-row items-center justify-between">
              <Pressable
                accessibilityLabel={t("camera.close")}
                accessibilityRole="button"
                className="h-12 w-12 items-center justify-center rounded-full bg-black/60 active:opacity-70"
                onPress={() => router.back()}
              >
                <AppIcon color="#FFFFFF" name="close" size={24} weight="semibold" />
              </Pressable>

              <Pressable
                accessibilityLabel={t("camera.takePhoto")}
                accessibilityRole="button"
                accessibilityState={{ busy, disabled: !ready || busy }}
                className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/25 active:opacity-60 disabled:opacity-40"
                disabled={!ready || busy}
                onPress={() => void capture()}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View className="h-16 w-16 rounded-full bg-white" />
                )}
              </Pressable>

              <Pressable
                accessibilityLabel={t("camera.choosePhoto")}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy }}
                className="h-12 w-12 items-center justify-center rounded-full bg-black/60 active:opacity-70 disabled:opacity-40"
                disabled={busy}
                onPress={() => void pick()}
              >
                <AppIcon color="#FFFFFF" name="photos" size={24} weight="semibold" />
              </Pressable>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

/**
 * Corner marks for "fit the whole meal in frame".
 *
 * Drawn as four L-shaped borders rather than a full rectangle so the guide reads
 * as a hint about framing without implying the estimate only considers what is
 * inside it — the model receives the whole photo.
 */
function ViewfinderGuide() {
  return (
    <View className="absolute inset-0 items-center justify-center pb-24" pointerEvents="none">
      <View className="aspect-square w-[78%]">
        <View className="absolute left-0 top-0 h-10 w-10 rounded-tl-3xl border-l-[3px] border-t-[3px] border-white/70" />
        <View className="absolute right-0 top-0 h-10 w-10 rounded-tr-3xl border-r-[3px] border-t-[3px] border-white/70" />
        <View className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-3xl border-b-[3px] border-l-[3px] border-white/70" />
        <View className="absolute bottom-0 right-0 h-10 w-10 rounded-br-3xl border-b-[3px] border-r-[3px] border-white/70" />
      </View>
    </View>
  );
}

/**
 * The camera hardware refused to start — another app holds it, or the device has
 * none. Manual logging has to stay reachable, so this offers the library and a
 * way out rather than leaving a black screen and a dead shutter.
 */
function CameraUnavailable({ onBack, onPick }: { onBack: () => void; onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1 }}>
      <View className="flex-1 justify-center gap-4 px-6">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
          <AppIcon color="#FFFFFF" name="camera" size={26} weight="semibold" />
        </View>
        <Text accessibilityRole="header" className="text-[26px] font-bold tracking-[-0.5px] text-white" selectable>
          {t("camera.unavailableTitle")}
        </Text>
        <Text accessibilityLiveRegion="polite" className="text-base leading-6 text-white/70" selectable>
          {t("camera.unavailableDescription")}
        </Text>
        <PrimaryButton
          className="mt-2 bg-white"
          icon="photos"
          label={t("camera.choosePhoto")}
          labelClassName="text-[#111111]"
          onPress={onPick}
        />
        <Pressable
          accessibilityLabel={t("camera.close")}
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-2xl border border-white/25 active:opacity-70"
          onPress={onBack}
        >
          <Text className="text-base font-semibold text-white">{t("common.back")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function CameraEducation({ canAskAgain, onBack, onContinue }: { canAskAgain: boolean; onBack: () => void; onContinue: () => void }) {
  const { t } = useTranslation();
  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView className="flex-1 bg-white" contentContainerClassName="flex-grow gap-4 px-5 pb-5 pt-2" contentInsetAdjustmentBehavior="automatic">
        <View className="flex-row items-center justify-between">
          <Pressable accessibilityLabel={t("common.back")} accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-white active:bg-app-surface" onPress={onBack}>
            <AppIcon name="back" size={23} weight="semibold" />
          </Pressable>
          <Text className="text-base font-bold text-[#111111]">{t("camera.aiScan")}</Text>
          <View className="h-12 w-12" />
        </View>

        <Image accessibilityLabel={t("camera.heroLabel")} className="min-h-[310px] w-full flex-1 rounded-[28px]" contentFit="cover" source={scanHero} />

        <View className="gap-1 rounded-[28px] border border-[#EEEEEE] bg-white p-5" style={{ borderCurve: "continuous", boxShadow: "0 8px 28px rgba(0, 0, 0, 0.06)" }}>
          <Text accessibilityRole="header" className="pb-2 text-[28px] font-bold tracking-[-0.6px] text-[#111111]" selectable>{t("camera.bestScan")}</Text>
          {/* Icons follow camera-open-before.png: viewfinder, sun, eye. */}
          <TipRow icon="scan" label={t("camera.holdStill")} />
          <TipRow icon="light" label={t("camera.useLight")} />
          <TipRow icon="eye" label={t("camera.showIngredients")} />
          {!canAskAgain ? <Text accessibilityRole="alert" className="px-1 pb-2 pt-3 text-center text-sm leading-5 text-[#737373]" selectable>{t("camera.settingsDescription")}</Text> : null}
          {/* The reference CTA carries no icon; the settings variant is an adaptation. */}
          <PrimaryButton className="mt-3 min-h-[60px] rounded-2xl" icon={canAskAgain ? undefined : "settings"} label={canAskAgain ? t("camera.gotIt") : t("camera.openSettings")} labelClassName="text-[18px]" onPress={onContinue} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TipRow({ icon, label }: { icon: AppIconName; label: string }) {
  return (
    <View className="min-h-14 flex-row items-center gap-4 border-b border-[#EEEEEE] px-1 py-3 last:border-b-0">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#F7F7F7]"><AppIcon name={icon} size={23} /></View>
      <Text className="min-w-0 flex-1 text-[17px] font-medium text-[#111111]" selectable>{label}</Text>
    </View>
  );
}
