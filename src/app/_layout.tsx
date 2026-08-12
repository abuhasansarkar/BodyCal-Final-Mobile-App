import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";

import "@/global.css";
import { AppProviders } from "@/providers/app-providers";
import { Sentry } from "@/lib/sentry";

SplashScreen.setOptions({
  duration: 250,
  fade: true,
});

function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
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
  );
}

export default Sentry.wrap(RootLayout);
