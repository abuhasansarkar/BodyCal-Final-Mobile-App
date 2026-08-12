import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { getAuthDestinationKey, getAuthDismissRoute, type AuthDestination } from "@/features/auth/auth-destination";
import { SocialAuthButtons } from "@/screens/auth/social-auth-buttons";
import { Image } from "@/tw/image";
import { Link, Pressable, ScrollView, Text, View } from "@/tw";

type Props = {
  destination?: AuthDestination;
};

export function SignInScreen({ destination = "/(app)/(tabs)/today" }: Props) {
  const { t } = useTranslation();

  const dismiss = () => {
    router.dismissTo(getAuthDismissRoute(destination));
  };

  return (
    <SafeAreaView edges={["right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="flex-grow gap-6 px-6 pb-6 pt-6"
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="flex-row items-center justify-between">
          <View accessibilityLabel="BodyCal" accessible className="flex-row items-center">
            <Image
              className="h-12 w-12"
              contentFit="contain"
              source={require("@/../assets/images/BodyCal-Black-Logo.png")}
            />
            <Text className="-ml-1 text-xl font-bold tracking-tight text-[#111111]">BodyCal</Text>
          </View>

          <Pressable
            accessibilityLabel={t("auth.dismiss")}
            accessibilityRole="button"
            className="h-11 w-11 items-center justify-center rounded-full bg-[#F2F2F2] active:opacity-70"
            onPress={dismiss}
          >
            <AppIcon color="#737373" name="close" size={23} weight="semibold" />
          </Pressable>
        </View>

        <View className="gap-2 py-1">
          <Text className="text-[28px] font-bold leading-9 tracking-[-0.5px] text-[#111111]" selectable>
            {t("auth.title")}
          </Text>
          <Text className="text-base leading-6 text-[#737373]" selectable>
            {t("auth.subtitle")}
          </Text>
        </View>

        <View className="gap-3">
          <SocialAuthButtons destination={destination} />

          <Link
            asChild
            href={{
              pathname: "/(auth)/email-sign-in",
              params: { destination: getAuthDestinationKey(destination) },
            }}
          >
            <Pressable
              accessibilityRole="button"
              className="min-h-14 flex-row items-center justify-center gap-3 rounded-2xl border border-[#E8E8E8] bg-white px-5 active:opacity-70"
            >
              <Image
                accessibilityIgnoresInvertColors
                className="h-5 w-5"
                contentFit="contain"
                source={require("@/../assets/images/email-sign-in-icon.png")}
              />
              <Text className="text-base font-semibold text-[#111111]">{t("auth.emailSignIn")}</Text>
            </Pressable>
          </Link>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
