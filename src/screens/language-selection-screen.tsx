import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { languageOptions, setAppLanguage, type SupportedLanguage } from "@/locales/i18n";
import { Pressable, ScrollView, Text, View } from "@/tw";

export function LanguageSelectionScreen() {
  const { i18n, t } = useTranslation();
  const [saving, setSaving] = React.useState<SupportedLanguage | null>(null);

  const selectLanguage = async (language: SupportedLanguage) => {
    if (saving) return;
    setSaving(language);
    try {
      await setAppLanguage(language);
      router.dismissTo("/(public)/welcome");
    } finally {
      setSaving(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-2 px-5 py-4"
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text className="pb-2 text-base leading-6 text-[#737373]" selectable>{t("language.description")}</Text>
      <View accessibilityRole="radiogroup" className="gap-2">
        {languageOptions.map((option) => {
          const selected = i18n.resolvedLanguage === option.code;
          return (
            <Pressable
              accessibilityLabel={option.name}
              accessibilityRole="radio"
              accessibilityState={{ disabled: saving !== null, selected }}
              className={`min-h-14 flex-row items-center gap-3 rounded-2xl border px-4 ${selected ? "border-[#111111] bg-[#FAFAFA]" : "border-[#E8E8E8] bg-white"}`}
              disabled={saving !== null}
              key={option.code}
              onPress={() => void selectLanguage(option.code)}
            >
              <Text className="text-2xl">{option.flag}</Text>
              <Text className="flex-1 text-base font-semibold text-[#111111]" selectable>{option.name}</Text>
              {selected ? <View accessibilityLabel={t("language.selected")}><AppIcon name="check" size={22} weight="semibold" /></View> : null}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
