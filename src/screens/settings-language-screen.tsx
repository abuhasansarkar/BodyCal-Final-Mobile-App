import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { Pressable, Text, View } from "@/tw";

const languages = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "es", label: "Spanish", nativeName: "Español" },
  { code: "de", label: "German", nativeName: "Deutsch" },
  { code: "fr", label: "French", nativeName: "Français" },
  { code: "pt-BR", label: "Portuguese (Brazil)", nativeName: "Português (Brasil)" },
  { code: "it", label: "Italian", nativeName: "Italiano" },
  { code: "ja", label: "Japanese", nativeName: "日本語" },
  { code: "ko", label: "Korean", nativeName: "한국어" },
];

export function SettingsLanguageScreen() {
  const { i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage || "en";

  const handleSelect = (code: string) => {
    void i18n.changeLanguage(code);
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Language
      </Text>
      <Text className="text-sm text-app-muted">
        Select your preferred language. All app copy and date formats will update immediately.
      </Text>

      <View className="overflow-hidden rounded-3xl border border-app-border bg-white" style={{ borderCurve: "continuous" }}>
        {languages.map((lang, index) => {
          const selected = currentLang === lang.code || currentLang.startsWith(lang.code);
          return (
            <Pressable
              key={lang.code}
              accessibilityRole="button"
              className={
                index < languages.length - 1
                  ? "min-h-16 flex-row items-center justify-between border-b border-app-border px-4 active:bg-app-surface"
                  : "min-h-16 flex-row items-center justify-between px-4 active:bg-app-surface"
              }
              onPress={() => handleSelect(lang.code)}
            >
              <View>
                <Text className="text-base font-semibold text-app-text">{lang.nativeName}</Text>
                <Text className="text-sm font-medium text-app-muted">{lang.label}</Text>
              </View>
              {selected ? <AppIcon color="#111111" name="check" size={20} /> : null}
            </Pressable>
          );
        })}
      </View>
    </AppScreen>
  );
}
