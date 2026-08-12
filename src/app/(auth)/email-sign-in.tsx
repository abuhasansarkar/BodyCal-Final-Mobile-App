import { useAuth } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";
import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

import { hasBackendConfiguration } from "@/config/env";
import { resolveAuthDestination } from "@/features/auth/auth-destination";
import { ConfigRequiredScreen } from "@/screens/auth/config-required-screen";
import { EmailSignInScreen } from "@/screens/auth/email-sign-in-screen";

function ConfiguredEmailSignInRoute({ destination }: { destination: ReturnType<typeof resolveAuthDestination> }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href={destination} />;
  return <EmailSignInScreen destination={destination} />;
}

export default function EmailSignInRoute() {
  const { t } = useTranslation();
  const { destination } = useLocalSearchParams<{ destination?: string }>();
  const authDestination = resolveAuthDestination(destination);

  return (
    <>
      <Stack.Screen options={{ headerTransparent: false, title: t("auth.emailSignIn") }} />
      {hasBackendConfiguration ? <ConfiguredEmailSignInRoute destination={authDestination} /> : <ConfigRequiredScreen />}
    </>
  );
}
