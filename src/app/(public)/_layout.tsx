import { Stack } from "expo-router/stack";
import { useTranslation } from "react-i18next";

export default function PublicLayout() {
  const { t } = useTranslation();
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen
        name="language"
        options={{
          contentStyle: { backgroundColor: "#FFFFFF" },
          headerShown: true,
          presentation: "formSheet",
          sheetAllowedDetents: [0.75],
          sheetGrabberVisible: true,
          title: t("language.title"),
        }}
      />
    </Stack>
  );
}
