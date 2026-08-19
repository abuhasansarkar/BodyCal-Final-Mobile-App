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
  /*
    The splash used to hide on a fixed 50 ms timer, well before Clerk, Convex and
    the translation bundle were ready — so the branded splash was replaced by the
    localization gate's blank fill, and every cold start flashed white. It now
    hides from `AppProviders` once translations have resolved, which is the first
    moment there is real content to show.
  */
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
