import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React from "react";

import "@/global.css";
import { FatalErrorBoundary } from "@/components/fatal-error-boundary";
import { AppProviders } from "@/providers/app-providers";
import { Sentry } from "@/lib/sentry";

void SplashScreen.preventAutoHideAsync().catch(() => {});

SplashScreen.setOptions({
  duration: 250,
  fade: true,
});

function RootLayout() {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <FatalErrorBoundary>
      <AppProviders>
        <StatusBar style="dark" />
        <Stack screenOptions={{ contentStyle: { backgroundColor: "#FFFFFF" }, headerBackButtonDisplayMode: "minimal" }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(public)" options={{ headerShown: false }} />
          <Stack.Screen
            name="(auth)"
            options={{
              contentStyle: { backgroundColor: "#FFFFFF" },
              headerShown: false,
              presentation: "formSheet",
              sheetAllowedDetents: [0.56, 0.92],
              sheetCornerRadius: 28,
              sheetGrabberVisible: true,
              sheetInitialDetentIndex: 0,
            }}
          />
          <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
        </Stack>
      </AppProviders>
    </FatalErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
