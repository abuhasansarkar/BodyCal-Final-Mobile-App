import { useSSO } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { getPostSignUpRoute, type AuthDestination } from "@/features/auth/auth-destination";
import { Image } from "@/tw/image";
import { Pressable, Text } from "@/tw";

export function SocialAuthButtons({ destination }: { destination: AuthDestination }) {
  const { t } = useTranslation();
  const { startSSOFlow } = useSSO();
  const [error, setError] = React.useState<string | null>(null);
  const [activeProvider, setActiveProvider] = React.useState<"apple" | "google" | null>(null);

  const complete = async (provider: "apple" | "google") => {
    setError(null);
    setActiveProvider(provider);
    try {
      const result = await startSSOFlow({ strategy: provider === "apple" ? "oauth_apple" : "oauth_google" });
      if (result.authSessionResult?.type === "cancel" || result.authSessionResult?.type === "dismiss") return;
      if (!result.createdSessionId || !result.setActive) throw new Error(t("auth.authenticationFailed"));
      await result.setActive({ session: result.createdSessionId });
      const targetDestination = result.signUp?.status === "complete"
        ? getPostSignUpRoute(destination)
        : destination;
      router.replace(targetDestination);
    } catch {
      setError(t("auth.authenticationFailed"));
    } finally {
      setActiveProvider(null);
    }
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        className="min-h-14 flex-row items-center justify-center gap-3 rounded-2xl bg-[#111111] px-5 active:opacity-75 disabled:opacity-45"
        disabled={activeProvider !== null}
        onPress={() => void complete("apple")}
      >
        <AppIcon color="#FFFFFF" name="apple" size={22} weight="semibold" />
        <Text className="text-base font-semibold text-white">
          {activeProvider === "apple" ? t("auth.signingIn") : t("auth.apple")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="min-h-14 flex-row items-center justify-center gap-3 rounded-2xl border border-[#E8E8E8] bg-white px-5 active:opacity-70 disabled:opacity-45"
        disabled={activeProvider !== null}
        onPress={() => void complete("google")}
      >
        <Image
          accessibilityIgnoresInvertColors
          className="h-5 w-5"
          contentFit="contain"
          source={require("@/../assets/images/google-g-logo.png")}
        />
        <Text className="text-base font-semibold text-[#111111]">
          {activeProvider === "google" ? t("auth.signingIn") : t("auth.google")}
        </Text>
      </Pressable>
      {error ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error" selectable>{error}</Text> : null}
    </>
  );
}
