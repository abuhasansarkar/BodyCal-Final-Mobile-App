import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/states";
import { Text, View } from "@/tw";

/**
 * Terms and privacy.
 *
 * The published documents are an external blocker, so this screen states that
 * plainly rather than presenting placeholder legal text as if it were binding.
 */
export function SettingsTermsScreen() {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <ScreenTitle description={t("termsSettings.subtitle")} title={t("termsSettings.title")} />

      <SectionCard>
        <View className="gap-3">
          <SectionHeader icon="terms" title={t("termsSettings.termsTitle")} />
          <Text className="text-sm leading-6 text-app-muted" selectable>
            {t("termsSettings.subtitle")}
          </Text>
        </View>
      </SectionCard>

      <EmptyState
        description={t("termsSettings.pendingDescription")}
        icon="terms"
        title={t("termsSettings.pendingTitle")}
      />
    </AppScreen>
  );
}
