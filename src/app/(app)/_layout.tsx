import { useAuth } from "@clerk/expo";
import { useConvexAuth, useQuery } from "convex/react";
import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

import { hasBackendConfiguration } from "@/config/env";
import { appAccessDestinations, resolveAppAccess } from "@/features/auth/app-access-gate";
import { api } from "@/lib/convex-api";
import { StartupScreen } from "@/screens/startup-screen";

function ProtectedAppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const current = useQuery(api.users.getCurrent, isAuthenticated ? {} : "skip");
  const decision = resolveAppAccess({
    currentUser: current,
    isAuthLoaded: isLoaded,
    isConvexAuthenticated: isAuthenticated,
    isConvexLoading: convexLoading,
    isSignedIn: isSignedIn ?? false,
  });

  if (decision === appAccessDestinations.loading) return <StartupScreen />;
  if (decision === appAccessDestinations.signIn) return <Redirect href={appAccessDestinations.signIn} />;
  if (decision === appAccessDestinations.onboarding) return <Redirect href={appAccessDestinations.onboarding} />;
  return <AppStack />;
}

function AppStack() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: "#FFFFFF" }, headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-food" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1], title: t("authFlow.addSheetTitle") }} />
      <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="benefits" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="review" options={{ headerShown: false }} />
      <Stack.Screen name="thank-you" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="scan/camera" options={{ headerShown: false }} />
      <Stack.Screen name="weight/add" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.5], title: t("weight.addTitle") }} />
    </Stack>
  );
}

export default function AppLayout() {
  return hasBackendConfiguration ? <ProtectedAppLayout /> : <AppStack />;
}
