import { Stack } from "expo-router/stack";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: "minimal", headerTransparent: true, title: "" }}>
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="email-sign-in" />
    </Stack>
  );
}
