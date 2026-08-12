import { useAuth } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

import { hasBackendConfiguration } from "@/config/env";
import { resolveAuthDestination } from "@/features/auth/auth-destination";
import { ConfigRequiredScreen } from "@/screens/auth/config-required-screen";
import { SignUpScreen } from "@/screens/auth/sign-up-screen";

function ConfiguredSignUpRoute({ destination }: { destination: ReturnType<typeof resolveAuthDestination> }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href={destination} />;
  return <SignUpScreen destination={destination} />;
}

export default function SignUpRoute() {
  const { t } = useTranslation();
  const { destination } = useLocalSearchParams<{ destination?: string }>();
  const authDestination = resolveAuthDestination(destination);

  return (
    <>
      <Stack.Screen options={{ headerTransparent: false, title: t("auth.createAccount") }} />
      {hasBackendConfiguration ? <ConfiguredSignUpRoute destination={authDestination} /> : <ConfigRequiredScreen />}
    </>
  );
}
