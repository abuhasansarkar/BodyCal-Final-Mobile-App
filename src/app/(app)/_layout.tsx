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
  if (decision === appAccessDestinations.signedOut) return <Redirect href={appAccessDestinations.signedOut} />;
  if (decision === appAccessDestinations.onboarding) return <Redirect href={appAccessDestinations.onboarding} />;
  return <AppStack />;
}

function AppStack() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: "#FFFFFF" },
        headerBackButtonDisplayMode: "minimal",
        /*
          Every screen in this group draws its own heading, and an undeclared
          route falls back to its file path for the header title — which is why
          headers read "food/log/[id]" and "settings/nutrition-targets". Blanking
          it leaves the back chevron and lets each screen's own title stand.
          Sheets below opt back in with `headerTitle`.
        */
        headerTitle: "",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-food" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1], headerTitle: t("authFlow.addSheetTitle") }} />
      <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="benefits" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="review" options={{ headerShown: false }} />
      <Stack.Screen name="thank-you" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="scan/camera" options={{ headerShown: false }} />
      {/*
        Analysing draws its own header — a back control and the "BodyCal AI"
        badge — and its own top safe-area inset. Without this declaration it also
        received the native one, so the screen showed two back chevrons, a stray
        divider, and a double top inset. Its siblings (preview, edit, result) use
        `AppScreen`, which insets only left and right, so they keep the native
        header and are deliberately left alone.
      */}
      <Stack.Screen name="scan/analyzing" options={{ headerShown: false }} />
      <Stack.Screen name="weight/add" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.5], headerTitle: t("weight.addTitle") }} />
    </Stack>
  );
}

export default function AppLayout() {
  return hasBackendConfiguration ? <ProtectedAppLayout /> : <AppStack />;
}
