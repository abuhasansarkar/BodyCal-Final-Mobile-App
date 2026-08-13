import { router, Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { StyleSheet, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Image, Text, View } from "@/tw";

const brandLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

/** Bar height above the home indicator. The inset is added, never absorbed. */
const TAB_BAR_CONTENT_HEIGHT = 62;

export default function TabsLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        sceneStyle: { backgroundColor: "#FFFFFF" },
        tabBarActiveTintColor: "#111111",
        tabBarInactiveTintColor: "#737373",
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        // A fixed height swallows the bottom inset, so on a device with a home
        // indicator the labels sat underneath it. Add the inset to the height
        // instead of letting it eat into the content.
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E8E8E8",
          borderTopWidth: StyleSheet.hairlineWidth,
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 7,
        },
      }}
    >
      <Tabs.Screen name="today" options={{ headerRightContainerStyle: { paddingRight: 12 }, headerShadowVisible: false, headerTitle: () => <BrandTitle />, headerTitleAlign: "left", title: t("tabs.home"), tabBarIcon: ({ color }) => <TabIcon color={color} name="home" /> }} />
      <Tabs.Screen name="progress" options={{ headerShown: false, title: t("tabs.progress"), tabBarIcon: ({ color }) => <TabIcon color={color} name="progress" /> }} />
      <Tabs.Screen
        name="scan"
        listeners={{ tabPress: (event) => { event.preventDefault(); router.push("/(app)/scan/camera"); } }}
        options={{
          headerShown: false,
          title: t("tabs.scan"),
          tabBarIcon: () => <ScanTabIcon />,
          tabBarIconStyle: { marginTop: -25 },
          tabBarLabel: () => null,
        }}
      />
      <Tabs.Screen name="foods" options={{ headerShown: false, title: t("tabs.foods"), tabBarIcon: ({ color }) => <TabIcon color={color} name="foods" /> }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile"), tabBarIcon: ({ color }) => <TabIcon color={color} name="profile" /> }} />
    </Tabs>
  );
}

function BrandTitle() {
  return <View className="flex-row items-center gap-2"><Image accessibilityLabel="BodyCal" className="h-11 w-11" contentFit="contain" source={brandLogo} /><Text className="text-[26px] font-bold tracking-[-0.5px] text-app-text">BodyCal</Text></View>;
}

function TabIcon({ color, name }: { color: ColorValue; name: AppIconName }) {
  return <AppIcon color={color} name={name} size={25} weight="semibold" />;
}

function ScanTabIcon() {
  return (
    <View
      className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#111111]"
      style={{ boxShadow: "0 5px 16px rgba(0, 0, 0, 0.22)" }}
    >
      <AppIcon color="#FFFFFF" name="camera" size={29} weight="semibold" />
    </View>
  );
}
