import { useAuth } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";

import { hasBackendConfiguration } from "@/config/env";
import { resolveAuthDestination } from "@/features/auth/auth-destination";
import { ConfigRequiredScreen } from "@/screens/auth/config-required-screen";
import { SignInScreen } from "@/screens/auth/sign-in-screen";

function ConfiguredSignInRoute({ destination }: { destination: ReturnType<typeof resolveAuthDestination> }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect href={destination} />;
  return <SignInScreen destination={destination} />;
}

export default function SignInRoute() {
  const { destination } = useLocalSearchParams<{ destination?: string }>();
  const authDestination = resolveAuthDestination(destination);

  return hasBackendConfiguration ? <ConfiguredSignInRoute destination={authDestination} /> : <ConfigRequiredScreen />;
}
