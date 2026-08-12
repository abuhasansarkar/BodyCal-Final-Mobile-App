import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import type { AuthDestination } from "@/features/auth/auth-destination";
import { AuthField } from "@/screens/auth/auth-fields";
import { Link, Text, View } from "@/tw";

type Props = {
  destination?: AuthDestination;
};

export function EmailSignInScreen({ destination = "/(app)/(tabs)/today" }: Props) {
  const { t } = useTranslation();
  const { errors, fetchStatus, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [needsVerification, setNeedsVerification] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const finishSignIn = async () => {
    await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setFormError(t("auth.additionalVerification"));
          return;
        }
        router.replace(destination);
      },
    });
  };

  const submit = async () => {
    setFormError(null);
    try {
      const { error } = await signIn.password({ emailAddress: emailAddress.trim(), password });
      if (error) return;

      if (signIn.status === "complete") {
        await finishSignIn();
        return;
      }

      if (signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor") {
        const emailCodeFactor = signIn.supportedSecondFactors.find((factor) => factor.strategy === "email_code");
        if (!emailCodeFactor) {
          setFormError(t("auth.additionalVerification"));
          return;
        }

        const { error: sendError } = await signIn.mfa.sendEmailCode();
        if (!sendError) setNeedsVerification(true);
        return;
      }

      setFormError(t("auth.additionalVerification"));
    } catch {
      setFormError(t("auth.authenticationFailed"));
    }
  };

  const verify = async () => {
    setFormError(null);
    try {
      const { error } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (error) return;
      if (signIn.status === "complete") await finishSignIn();
      else setFormError(t("auth.additionalVerification"));
    } catch {
      setFormError(t("auth.authenticationFailed"));
    }
  };

  const isSubmitting = fetchStatus === "fetching";

  if (needsVerification) {
    return (
      <AppScreen>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-app-text" selectable>{t("auth.verifyTitle")}</Text>
          <Text className="text-base leading-6 text-app-muted" selectable>{t("auth.verifyBody")}</Text>
        </View>
        <AuthField
          autoComplete="one-time-code"
          error={errors.fields.code?.message}
          keyboardType="number-pad"
          label={t("auth.verificationCode")}
          onChangeText={setCode}
          onSubmitEditing={() => void verify()}
          returnKeyType="done"
          textContentType="oneTimeCode"
          value={code}
        />
        {formError ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error" selectable>{formError}</Text> : null}
        <PrimaryButton disabled={!code.trim() || isSubmitting} label={isSubmitting ? t("auth.verifying") : t("auth.verify")} onPress={() => void verify()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-app-text" selectable>{t("auth.title")}</Text>
        <Text className="text-base leading-6 text-app-muted" selectable>{t("auth.emailSubtitle")}</Text>
      </View>
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.fields.identifier?.message}
        keyboardType="email-address"
        label={t("auth.email")}
        onChangeText={setEmailAddress}
        returnKeyType="next"
        textContentType="emailAddress"
        value={emailAddress}
      />
      <AuthField
        autoComplete="current-password"
        error={errors.fields.password?.message}
        label={t("auth.password")}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
        secureTextEntry
        textContentType="password"
        value={password}
      />
      {formError ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error" selectable>{formError}</Text> : null}
      <PrimaryButton disabled={!emailAddress.trim() || !password || isSubmitting} label={isSubmitting ? t("auth.signingIn") : t("auth.signIn")} onPress={() => void submit()} />
      <Link accessibilityRole="link" className="min-h-11 self-center py-3 text-base font-semibold text-[#111111] underline" href="/(auth)/forgot-password">
        {t("auth.forgotPassword")}
      </Link>
    </AppScreen>
  );
}
