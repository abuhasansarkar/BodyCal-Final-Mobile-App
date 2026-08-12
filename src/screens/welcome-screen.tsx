import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/primary-button";
import { languageOptions } from "@/locales/i18n";
import { Image } from "@/tw/image";
import { Link, Pressable, ScrollView, Text, View } from "@/tw";

const scanHero = require("@/../assets/images/welcome-food-scan-hero.png");

export function WelcomeScreen() {
  const { i18n, t } = useTranslation();
  const currentLanguage = languageOptions.find((option) => option.code === i18n.resolvedLanguage) ?? languageOptions[0];

  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow gap-5 px-5 pb-3"
        contentInsetAdjustmentBehavior="never"
      >
        <View className="flex-row items-center justify-between pt-2">
          <View accessibilityLabel="BodyCal" accessible className="flex-row items-center">
            <Image
              className="h-12 w-12"
              contentFit="contain"
              source={require("@/../assets/images/BodyCal-Black-Logo.png")}
            />
            <Text className="-ml-1 text-xl font-bold tracking-tight text-[#111111]">BodyCal</Text>
          </View>

          <Link asChild href="/(public)/language">
            <Pressable
              accessibilityLabel={t("language.title")}
              accessibilityRole="button"
              className="min-h-11 flex-row items-center gap-2 rounded-full bg-[#F8F7FB] px-4 active:opacity-70"
            >
              <Text className="text-xl">{currentLanguage.flag}</Text>
              <Text className="text-base font-semibold text-[#111111]">{currentLanguage.code === "pt-BR" ? "PT" : currentLanguage.code.toUpperCase()}</Text>
            </Pressable>
          </Link>
        </View>

        <Image
          accessibilityLabel={t("welcome.scanHeroImage")}
          className="w-full rounded-[28px] bg-[#F7F7F7]"
          contentFit="cover"
          contentPosition="center"
          source={scanHero}
          style={{ aspectRatio: 0.82 }}
          transition={180}
        />

        <View className="flex-1 justify-end gap-5 pt-1">
          <Text
            className="text-center text-[44px] font-bold leading-[48px] tracking-[-1.4px] text-[#111111]"
            selectable
          >
            {t("welcome.title")}
          </Text>

          <PrimaryButton
            className="min-h-[58px] rounded-full"
            label={t("welcome.start")}
            onPress={() => router.push("/(onboarding)/goal")}
          />

          <Link asChild href="/(auth)/sign-in">
            <Pressable accessibilityRole="button" className="min-h-11 flex-row flex-wrap items-center justify-center gap-1 px-2">
              <Text className="text-center text-base text-[#111111]">{t("welcome.accountPrompt")}</Text>
              <Text className="text-center text-base font-semibold text-[#111111] underline">{t("welcome.signInAction")}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
