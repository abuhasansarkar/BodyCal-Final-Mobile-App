import * as WebBrowser from "expo-web-browser";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { NavigationRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/states";
import { legalUrls } from "@/config/env";
import { Text, View } from "@/tw";

/**
 * Terms and privacy.
 *
 * The documents are hosted, not bundled, so they can be corrected without an app
 * release. `EXPO_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_PRIVACY_URL` are release
 * blockers enforced in `config/env`, so a production build cannot reach the
 * unpublished state below — it exists for development builds, and states the
 * position plainly rather than presenting placeholder text as if it were binding.
 */
export function SettingsTermsScreen() {
  const { t } = useTranslation();
  const published = legalUrls.terms !== null || legalUrls.privacy !== null;

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

      {published ? (
        <RowGroup>
          {legalUrls.terms ? (
            <NavigationRow
              icon="terms"
              onPress={() => void WebBrowser.openBrowserAsync(legalUrls.terms!)}
              title={t("termsSettings.termsTitle")}
            />
          ) : null}
          {legalUrls.privacy ? (
            <NavigationRow
              icon="privacy"
              onPress={() => void WebBrowser.openBrowserAsync(legalUrls.privacy!)}
              title={t("termsSettings.privacyTitle")}
            />
          ) : null}
        </RowGroup>
      ) : (
        <EmptyState
          description={t("termsSettings.pendingDescription")}
          icon="terms"
          title={t("termsSettings.pendingTitle")}
        />
      )}
    </AppScreen>
  );
}
