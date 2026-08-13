import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

import { ResetPasswordScreen } from "@/screens/auth/reset-password-screen";

export default function ResetPasswordRoute() {
  const { t } = useTranslation();
  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerShadowVisible: false,
          headerTintColor: "#111111",
          headerTransparent: false,
          title: t("authFlow.forgotTitle"),
        }}
      />
      <ResetPasswordScreen />
    </>
  );
}

