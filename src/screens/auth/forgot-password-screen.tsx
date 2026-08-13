import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field } from "@/components/ui/form";
import { ScreenTitle } from "@/components/ui/section-card";
import { InlineNotice } from "@/components/ui/states";

export function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { fetchStatus, signIn } = useSignIn();
  const [emailAddress, setEmailAddress] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const created = await signIn.create({ identifier: emailAddress.trim() });
    if (created.error) return setMessage(created.error.message);
    const sent = await signIn.resetPasswordEmailCode.sendCode();
    if (sent.error) return setMessage(sent.error.message);
    router.push({ pathname: "/(auth)/reset-password", params: { email: emailAddress.trim() } });
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("authFlow.forgotBody")} title={t("authFlow.forgotTitle")} />
      <Field
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        label={t("auth.email")}
        onChangeText={setEmailAddress}
        value={emailAddress}
      />
      {message ? <InlineNotice message={message} tone="error" /> : null}
      <PrimaryButton
        disabled={!emailAddress || fetchStatus === "fetching"}
        icon="feedback"
        label={t("authFlow.sendResetCode")}
        onPress={() => void submit()}
      />
    </AppScreen>
  );
}
