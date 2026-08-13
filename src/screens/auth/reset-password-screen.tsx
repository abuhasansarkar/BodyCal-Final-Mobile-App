import { useSignIn } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field } from "@/components/ui/form";
import { ScreenTitle } from "@/components/ui/section-card";
import { InlineNotice } from "@/components/ui/states";

export function ResetPasswordScreen() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { fetchStatus, signIn } = useSignIn();

  const [code, setCode] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const verified = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
    if (verified.error) return setMessage(verified.error.message);

    const submitted = await signIn.resetPasswordEmailCode.submitPassword({ password });
    if (submitted.error) return setMessage(submitted.error.message);

    if (signIn.status !== "complete") return setMessage(t("authFlow.extraVerification"));
    await signIn.finalize({ navigate: () => router.replace("/(app)/(tabs)/today") });
  };

  return (
    <AppScreen>
      <ScreenTitle
        description={email ? t("authFlow.codeSentTo", { email }) : undefined}
        title={t("authFlow.newPasswordTitle")}
      />
      <Field
        autoComplete="one-time-code"
        keyboardType="number-pad"
        label={t("authFlow.resetCode")}
        onChangeText={setCode}
        value={code}
      />
      <Field
        autoComplete="new-password"
        label={t("authFlow.newPassword")}
        onChangeText={setPassword}
        secureTextEntry
        value={password}
      />
      {message ? <InlineNotice message={message} tone="error" /> : null}
      <PrimaryButton
        disabled={!code || password.length < 8 || fetchStatus === "fetching"}
        icon="check"
        label={t("authFlow.setNewPassword")}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}
