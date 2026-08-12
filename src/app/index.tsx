import { useAuth } from "@clerk/expo";
import { useConvexAuth, useQuery } from "convex/react";
import { Redirect } from "expo-router";

import { hasBackendConfiguration } from "@/config/env";
import { resolveStartupDestination } from "@/features/onboarding/startup-destination";
import { api } from "@/lib/convex-api";
import { StartupScreen } from "@/screens/startup-screen";

function ConfiguredBootstrap() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const current = useQuery(api.users.getCurrent, isAuthenticated ? {} : "skip");

  if (!isLoaded || convexLoading) return <StartupScreen />;
  if (!isSignedIn) return <Redirect href="/(public)/welcome" />;
  if (!isAuthenticated || current == null) return <StartupScreen />;
  return <Redirect href={resolveStartupDestination(current.onboardingCompleted)} />;
}

export default function Index() {
  return hasBackendConfiguration ? <ConfiguredBootstrap /> : <Redirect href="/(public)/welcome" />;
}
