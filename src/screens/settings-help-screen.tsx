import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { Text, View } from "@/tw";

const SUPPORT_EMAIL = "support@bodycal.app";

export function SettingsHelpScreen() {
  const { t } = useTranslation();

  const faqs = [
    { title: t("helpSettings.faqEstimatesTitle"), body: t("helpSettings.faqEstimatesBody") },
    { title: t("helpSettings.faqScanTitle"), body: t("helpSettings.faqScanBody") },
    { title: t("helpSettings.faqHistoryTitle"), body: t("helpSettings.faqHistoryBody") },
    { title: t("helpSettings.faqDataTitle"), body: t("helpSettings.faqDataBody") },
  ];

  return (
    <AppScreen>
      <ScreenTitle description={t("helpSettings.subtitle")} title={t("helpSettings.title")} />

      <View className="gap-3">
        {faqs.map((faq) => (
          <SectionCard key={faq.title}>
            <View className="gap-2">
              <Text className="text-base font-bold leading-[22px] text-app-text" selectable>
                {faq.title}
              </Text>
              <Text className="text-sm leading-6 text-app-muted" selectable>
                {faq.body}
              </Text>
            </View>
          </SectionCard>
        ))}
      </View>

      <SectionCard>
        <View className="gap-3">
          <SectionHeader
            description={t("helpSettings.contactDescription")}
            icon="help"
            title={t("helpSettings.contactTitle")}
          />
          <PrimaryButton
            icon="feedback"
            label={t("helpSettings.contactAction")}
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}
          />
        </View>
      </SectionCard>
    </AppScreen>
  );
}
