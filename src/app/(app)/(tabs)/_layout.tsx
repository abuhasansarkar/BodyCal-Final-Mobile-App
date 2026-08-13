import { router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useTranslation } from "react-i18next";

import { colors } from "@/config/theme";

const { Trigger } = NativeTabs;

/**
 * Native bottom tabs.
 *
 * This renders a real `UITabBar` on iOS and a Material 3 navigation bar on
 * Android, which is what gives the platform's own selection animation, haptics,
 * blur and Dynamic Type handling for free — none of which the JavaScript tab bar
 * reproduced.
 *
 * The trade-off, accepted deliberately: `NativeTabs` accepts only `Icon`,
 * `Label` and `Badge` as children, so the elevated centre Scan button in
 * `main-dashbaord.png` cannot exist here. Scan is a flat tab like the others.
 *
 * Selected/unselected artwork is handed to the platform via the `default` and
 * `selected` icon forms rather than being switched in JavaScript. Progress,
 * Scan and Foods have no filled counterpart in either icon set, so the tint
 * carries their selected state.
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      labelStyle={{ fontSize: 11, fontWeight: "600" }}
      tintColor={colors.text}
    >
      <Trigger name="today">
        <Trigger.Icon md={{ default: "home", selected: "home_filled" }} sf={{ default: "house", selected: "house.fill" }} />
        <Trigger.Label>{t("tabs.home")}</Trigger.Label>
      </Trigger>

      <Trigger name="progress">
        <Trigger.Icon md="monitoring" sf="chart.line.uptrend.xyaxis" />
        <Trigger.Label>{t("tabs.progress")}</Trigger.Label>
      </Trigger>

      {/*
        Scan pushes the camera instead of switching tab. The native `tabPress` is
        not cancelable, so selection is blocked with `disabled` — which maps to
        `preventNativeSelection`, refusing the selection at the tab-bar
        controller rather than dimming the item — while the event still fires so
        the push can run. Without this the scan tab would activate, `scan.tsx`
        would redirect to the camera, and closing the camera would land back on
        the scan tab and reopen it. `scan.tsx` stays as the deep-link fallback.
      */}
      <Trigger
        disabled
        listeners={{ tabPress: () => router.push("/(app)/scan/camera") }}
        name="scan"
      >
        <Trigger.Icon md="photo_camera" sf="camera.fill" />
        <Trigger.Label>{t("tabs.scan")}</Trigger.Label>
      </Trigger>

      <Trigger name="foods">
        <Trigger.Icon md="restaurant" sf="fork.knife" />
        <Trigger.Label>{t("tabs.foods")}</Trigger.Label>
      </Trigger>

      <Trigger name="profile">
        <Trigger.Icon md="person" sf={{ default: "person", selected: "person.fill" }} />
        <Trigger.Label>{t("tabs.profile")}</Trigger.Label>
      </Trigger>
    </NativeTabs>
  );
}
