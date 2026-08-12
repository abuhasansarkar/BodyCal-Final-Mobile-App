import React from "react";
import { useColorScheme } from "react-native";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { Pressable, Text, View } from "@/tw";

type ThemeOption = "system" | "light" | "dark";

export function SettingsAppearanceScreen() {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = React.useState<ThemeOption>("system");

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Appearance
      </Text>
      <Text className="text-sm text-app-muted">
        Choose your visual theme preference. Currently active system theme: {systemScheme ?? "light"}.
      </Text>

      <View className="gap-3">
        {[
          { key: "system", title: "System Default", desc: "Match your device theme settings automatically." },
          { key: "light", title: "Light Mode", desc: "Clean, high-contrast light visual interface." },
          { key: "dark", title: "Dark Mode", desc: "Sleek dark theme optimized for low-light environments." },
        ].map((item) => {
          const selected = theme === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              className={
                selected
                  ? "flex-row items-center justify-between rounded-3xl border-2 border-[#111111] bg-white p-4"
                  : "flex-row items-center justify-between rounded-3xl border border-app-border bg-white p-4"
              }
              onPress={() => setTheme(item.key as ThemeOption)}
            >
              <View className="min-w-0 flex-1 pr-3">
                <Text className="text-base font-bold text-app-text">{item.title}</Text>
                <Text className="text-sm font-medium text-app-muted">{item.desc}</Text>
              </View>
              {selected ? <AppIcon color="#111111" name="check" size={22} /> : null}
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}
