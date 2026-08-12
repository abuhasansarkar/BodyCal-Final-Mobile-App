import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

import { ForgotPasswordScreen } from "@/screens/auth/forgot-password-screen";

export default function ForgotPasswordRoute() {
  const { t } = useTranslation();

  return (
    <>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: "#FFFFFF" },
          headerShadowVisible: false,
          headerTintColor: "#111111",
          headerTransparent: false,
          title: t("auth.forgotPassword"),
        }}
      />
      <ForgotPasswordScreen />
    </>
  );
}

