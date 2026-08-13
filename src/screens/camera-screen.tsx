import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
// `Image` comes from the tw wrapper, not expo-image directly: only the wrapper
// pipes `className` through to a style. Imported bare, the hero's sizing classes
// were dropped and it collapsed to zero height.
import { Image, Pressable, ScrollView, Text, View } from "@/tw";

const scanHero = require("@/../assets/images/welcome-food-scan-hero.png");

export function CameraScreen() {
  const { t } = useTranslation();
  const cameraRef = React.useRef<CameraView>(null);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = React.useState(false);

  const continueWith = (asset: { uri: string; width?: number; height?: number }) => router.push({ pathname: "/(app)/scan/preview", params: { uri: asset.uri, width: String(asset.width ?? ""), height: String(asset.height ?? "") } });
  const capture = async () => { const picture = await cameraRef.current?.takePictureAsync({ quality: 0.85 }); if (picture) continueWith(picture); };
  const pick = async () => { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 }); const asset = result.assets?.[0]; if (asset) continueWith(asset); };

  if (!permission) return <View className="flex-1 bg-[#111111]" />;
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
      <CameraView ref={cameraRef} className="flex-1" facing="back" onCameraReady={() => setReady(true)} />
      <View className="absolute inset-x-0 flex-row items-center justify-between px-6" style={{ bottom: insets.bottom + 16 }}>
        <Pressable accessibilityLabel={t("camera.close")} accessibilityRole="button" className="min-h-12 min-w-12 items-center justify-center rounded-full bg-black/60" onPress={() => router.back()}><AppIcon color="#FFFFFF" name="close" size={24} weight="semibold" /></Pressable>
        <Pressable accessibilityLabel={t("camera.takePhoto")} accessibilityRole="button" accessibilityState={{ disabled: !ready }} disabled={!ready} className="h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/30 disabled:opacity-40" onPress={() => void capture()}><View className="h-16 w-16 rounded-full bg-white" /></Pressable>
        <Pressable accessibilityLabel={t("camera.choosePhoto")} accessibilityRole="button" className="min-h-12 min-w-12 items-center justify-center rounded-full bg-black/60" onPress={() => void pick()}><AppIcon color="#FFFFFF" name="photos" size={24} weight="semibold" /></Pressable>
      </View>
      <Text className="absolute inset-x-0 px-16 text-center text-base font-semibold text-white" style={{ top: insets.top + 24 }}>{t("camera.frameMeal")}</Text>
    </View>
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
