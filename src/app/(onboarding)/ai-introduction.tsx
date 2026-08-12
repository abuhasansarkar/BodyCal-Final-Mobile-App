import { Image } from "expo-image";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { Text, View } from "@/tw";

export default function AiIntroductionRoute() {
  const { t } = useTranslation();
  const features: { icon: AppIconName; text: string }[] = [
    { icon: "analysis", text: t("onboarding.ai.analysis") },
    { icon: "scan", text: t("onboarding.ai.recognition") },
    { icon: "checkCircle", text: t("onboarding.ai.simple") },
  ];

  return (
    <OnboardingStageScreen
      description={t("onboarding.ai.description")}
      footerLabel={t("onboarding.ai.button")}
      onContinue={() => router.push("/(onboarding)/notifications")}
      progressStep={11}
      title={t("onboarding.ai.title")}
    >
      <View className="flex-1 justify-center gap-5">
        <View className="relative overflow-hidden rounded-[24px] bg-[#F7F7F7]">
          <Image
            accessibilityLabel={t("onboarding.ai.imageLabel")}
            contentFit="cover"
            source={require("@/../assets/images/welcome-meal-hero.png")}
            style={{ aspectRatio: 1.25, width: "100%" }}
            transition={180}
          />
          <View pointerEvents="none" className="absolute inset-5">
            <View className="absolute left-0 top-0 h-10 w-10 rounded-tl-lg border-l-[3px] border-t-[3px] border-white" />
            <View className="absolute right-0 top-0 h-10 w-10 rounded-tr-lg border-r-[3px] border-t-[3px] border-white" />
            <View className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-lg border-b-[3px] border-l-[3px] border-white" />
            <View className="absolute bottom-0 right-0 h-10 w-10 rounded-br-lg border-b-[3px] border-r-[3px] border-white" />
          </View>
        </View>

        <View className="gap-3 px-1">
          {features.map((feature) => (
            <View className="min-h-11 flex-row items-center gap-3" key={feature.text}>
              <View className="h-9 w-9 items-center justify-center rounded-full bg-[#F7F7F7]">
                <AppIcon name={feature.icon} size={20} weight="semibold" />
              </View>
              <Text className="flex-1 text-[15px] font-medium leading-[21px] text-[#111111]">{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>
    </OnboardingStageScreen>
  );
}
