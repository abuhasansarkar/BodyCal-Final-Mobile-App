import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { getAuthDestinationKey, type AuthDestination } from "@/features/auth/auth-destination";
import { AuthField } from "@/screens/auth/auth-fields";
import { Link, Text, View } from "@/tw";

type Props = {
  destination: AuthDestination;
};

function splitName(value: string) {
  const parts = value.trim().replace(/\s+/g, " ").split(" ");
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || undefined };
}

export function SignUpScreen({ destination }: Props) {
  const { t } = useTranslation();
  const { errors, fetchStatus, signUp } = useSignUp();
  const [fullName, setFullName] = React.useState("");
  const [emailAddress, setEmailAddress] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [code, setCode] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);

  const submit = async () => {
    setFormError(null);
    const { firstName, lastName } = splitName(fullName);

    try {
      const { error } = await signUp.password({
        emailAddress: emailAddress.trim(),
        firstName,
        lastName,
        password,
      });
      if (error) return;
      const { error: verificationError } = await signUp.verifications.sendEmailCode();
      if (verificationError) setFormError(t("auth.authenticationFailed"));
    } catch {
      setFormError(t("auth.authenticationFailed"));
    }
  };

  const verify = async () => {
    setFormError(null);
    try {
      const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
      if (error) return;
      if (signUp.status !== "complete") {
        setFormError(t("auth.additionalVerification"));
        return;
      }
      await signUp.finalize({ navigate: () => router.replace(destination) });
    } catch {
      setFormError(t("auth.authenticationFailed"));
    }
  };

  const resend = async () => {
    setFormError(null);
    try {
      const { error } = await signUp.verifications.sendEmailCode();
      if (error) setFormError(t("auth.authenticationFailed"));
    } catch {
      setFormError(t("auth.authenticationFailed"));
    }
  };

  const isSubmitting = fetchStatus === "fetching";
  const needsCode = signUp.status === "missing_requirements"
    && signUp.unverifiedFields.includes("email_address")
    && signUp.missingFields.length === 0;

  if (signUp.status === "complete") {
    return <AppScreen><Text className="text-base text-app-muted">{t("common.loading")}</Text></AppScreen>;
  }

  if (needsCode) {
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
        <PrimaryButton disabled={isSubmitting} label={t("auth.resendCode")} onPress={() => void resend()} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-app-text" selectable>{t("auth.createAccountTitle")}</Text>
        <Text className="text-base leading-6 text-app-muted" selectable>{t("auth.createAccountSubtitle")}</Text>
      </View>
      <AuthField
        autoCapitalize="words"
        autoComplete="name"
        error={errors.fields.firstName?.message ?? errors.fields.lastName?.message}
        label={t("auth.name")}
        onChangeText={setFullName}
        returnKeyType="next"
        textContentType="name"
        value={fullName}
      />
      <AuthField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.fields.emailAddress?.message}
        keyboardType="email-address"
        label={t("auth.email")}
        onChangeText={setEmailAddress}
        returnKeyType="next"
        textContentType="emailAddress"
        value={emailAddress}
      />
      <AuthField
        autoComplete="new-password"
        error={errors.fields.password?.message}
        label={t("auth.password")}
        onChangeText={setPassword}
        onSubmitEditing={() => void submit()}
        returnKeyType="done"
        secureTextEntry
        textContentType="newPassword"
        value={password}
      />
      <View nativeID="clerk-captcha" />
      {formError ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error" selectable>{formError}</Text> : null}
      <PrimaryButton
        disabled={!fullName.trim() || !emailAddress.trim() || !password || isSubmitting}
        label={isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
        onPress={() => void submit()}
      />
      <View className="min-h-11 flex-row flex-wrap items-center justify-center gap-1">
        <Text className="text-sm text-app-muted">{t("auth.haveAccount")}</Text>
        <Link
          className="py-3 text-sm font-semibold text-[#111111] underline"
          href={{ pathname: "/(auth)/sign-in", params: { destination: getAuthDestinationKey(destination) } }}
        >
          {t("auth.signInAction")}
        </Link>
      </View>
    </AppScreen>
  );
}
