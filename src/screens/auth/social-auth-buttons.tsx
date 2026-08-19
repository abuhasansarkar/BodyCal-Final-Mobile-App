import { useSSO } from "@clerk/expo";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import React from "react";
import { useTranslation } from "react-i18next";
import { Platform } from "react-native";

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
        {/*
          Apple's own glyph, from the OS.

          This was briefly a bundled PNG, on the reasoning that Material Symbols
          has no Apple counterpart so the Android button would otherwise carry no
          logo. The file that shipped was not the Apple mark though — it was a
          filled rounded square, 97% opaque black — so tinting it white for the
          black button drew a plain white tile on every platform, which is worse
          than the gap it was added to close.

          `apple.logo` is the mark itself, shipped by iOS since SF Symbols 1.0
          and so safely inside the project's deployment target. It is the only
          copy of the artwork available to the app that is guaranteed correct.

          Android renders the label alone rather than an approximation of a
          trademark. Restoring the glyph there means downloading the official
          artwork from Apple's Sign in with Apple design resources and bundling
          it — an asset/licensing task, not a code one.
        */}
        {Platform.OS === "ios" ? (
          <SymbolView accessible={false} name="apple.logo" size={19} tintColor="#FFFFFF" />
        ) : null}
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
