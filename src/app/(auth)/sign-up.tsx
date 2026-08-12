import { useAuth } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";

import { hasBackendConfiguration } from "@/config/env";
import { resolveAuthDestination } from "@/features/auth/auth-destination";
import { ConfigRequiredScreen } from "@/screens/auth/config-required-screen";
import { EmailSignInScreen } from "@/screens/auth/email-sign-in-screen";

function ConfiguredSignUpRoute({ destination }: { destination: ReturnType<typeof resolveAuthDestination> }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href={destination} />;
  return <EmailSignInScreen destination={destination} initialMode="signUp" />;
}

export default function SignUpRoute() {
  const { destination } = useLocalSearchParams<{ destination?: string }>();
  const authDestination = resolveAuthDestination(destination);

  return hasBackendConfiguration ? <ConfiguredSignUpRoute destination={authDestination} /> : <ConfigRequiredScreen />;
}

