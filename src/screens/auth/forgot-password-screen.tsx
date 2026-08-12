import { useSignIn } from "@clerk/expo";
import { router } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text } from "@/tw";

export function ForgotPasswordScreen() {
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
      <Text className="text-3xl font-bold text-app-text">Reset your password</Text>
      <Text className="text-base leading-6 text-app-muted">We will send a one-time code to your verified email address.</Text>
      <AuthField label="Email" autoCapitalize="none" keyboardType="email-address" value={emailAddress} onChangeText={setEmailAddress} />
      {message ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error">{message}</Text> : null}
      <PrimaryButton disabled={!emailAddress || fetchStatus === "fetching"} label="Send reset code" onPress={() => void submit()} />
    </AppScreen>
  );
}
