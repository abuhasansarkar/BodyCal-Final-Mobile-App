import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { Stack } from "expo-router/stack";

import { hasBackendConfiguration } from "@/config/env";

function ProtectedAppLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return null;
  if (!isSignedIn) return <Redirect href="/(auth)/sign-in" />;
  return <AppStack />;
}

function AppStack() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-food" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.5, 1], title: "Add food" }} />
      <Stack.Screen name="paywall" options={{ presentation: "fullScreenModal", headerShown: false }} />
      <Stack.Screen name="benefits" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="review" options={{ headerShown: false }} />
      <Stack.Screen name="thank-you" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="scan/camera" options={{ headerShown: false }} />
      <Stack.Screen name="weight/add" options={{ presentation: "formSheet", sheetGrabberVisible: true, sheetAllowedDetents: [0.5], title: "Add weight" }} />
    </Stack>
  );
}

export default function AppLayout() {
  return hasBackendConfiguration ? <ProtectedAppLayout /> : <AppStack />;
}
