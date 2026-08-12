import { useSignIn } from "@clerk/expo";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text } from "@/tw";

export function ResetPasswordScreen() {
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
    if (signIn.status !== "complete") return setMessage("Additional verification is required.");
    await signIn.finalize({ navigate: () => router.replace("/(app)/(tabs)/today") });
  };

  return (
    <AppScreen>
      <Text className="text-3xl font-bold text-app-text">Choose a new password</Text>
      {email ? <Text className="text-sm text-app-muted">Code sent to {email}</Text> : null}
      <AuthField label="Reset code" keyboardType="number-pad" value={code} onChangeText={setCode} />
      <AuthField label="New password" secureTextEntry value={password} onChangeText={setPassword} />
      {message ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error">{message}</Text> : null}
      <PrimaryButton disabled={!code || password.length < 8 || fetchStatus === "fetching"} label="Set new password" onPress={() => void submit()} />
    </AppScreen>
  );
}
