import { Stack } from "expo-router/stack";

import { ResetPasswordScreen } from "@/screens/auth/reset-password-screen";

export default function ResetPasswordRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerShadowVisible: false,
          headerTintColor: "#111111",
          headerTransparent: false,
          title: "Reset password",
        }}
      />
      <ResetPasswordScreen />
    </>
  );
}

