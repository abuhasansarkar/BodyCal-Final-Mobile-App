import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

const bodyCalLogo = require("@/../assets/images/BodyCal-Black-Logo.png");

export function StartupScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView
      accessibilityLabel={t("common.loading")}
      accessibilityRole="progressbar"
      edges={["top", "right", "bottom", "left"]}
      style={{ flex: 1, backgroundColor: "#FFFFFF" }}
    >
      <StatusBar style="dark" />
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Image
          accessibilityLabel="BodyCal"
          contentFit="contain"
          source={bodyCalLogo}
          style={{ width: 180, height: 180 }}
        />
        <Text
          allowFontScaling
          selectable
          style={{
            color: "#111111",
            fontSize: 40,
            fontWeight: "700",
            letterSpacing: -1.2,
            marginTop: -20,
          }}
        >
          BodyCal
        </Text>
      </View>
      <View style={{ alignItems: "center", height: "24%" }}>
        <ActivityIndicator
          accessibilityLabel={t("common.loading")}
          color="#111111"
          size="small"
        />
      </View>
    </SafeAreaView>
  );
}
