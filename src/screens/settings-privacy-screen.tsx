import { useMutation, useQuery } from "convex/react";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { NavigationRow, RowGroup, ToggleRow } from "@/components/ui/rows";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { api } from "@/lib/convex-api";
import { useAnalyticsConsent } from "@/providers/analytics-provider";
import { Text, View } from "@/tw";

export function SettingsPrivacyScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredPrivacyScreen />;
  return (
    <AppScreen>
      <ScreenTitle description={t("privacySettings.subtitle")} title={t("privacySettings.title")} />
      <Safeguards />
    </AppScreen>
  );
}

function Safeguards() {
  const { t } = useTranslation();
  const points = [
    t("privacySettings.retentionPhotos"),
    t("privacySettings.retentionTelemetry"),
    t("privacySettings.retentionSharing"),
  ];

  return (
    <SectionCard>
      <View className="gap-3">
        <SectionHeader icon="privacy" title={t("privacySettings.safeguardsTitle")} />
        <View className="gap-2.5">
          {points.map((point) => (
            <View className="flex-row gap-2.5" key={point}>
              <View className="pt-1">
                <AppIcon color={colors.muted} name="checkCircle" size={15} />
              </View>
              <Text className="min-w-0 flex-1 text-sm leading-5 text-app-muted" selectable>
                {point}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SectionCard>
  );
}

/**
 * Privacy and data controls.
 *
 * Export now runs through the server `exportJobs` pipeline and hands back a
 * download URL. It previously serialised up to a thousand records into the OS
 * share sheet as a plain text message.
 */
function ConfiguredPrivacyScreen() {
  const { t } = useTranslation();
  const exportStatus = useQuery(api.users.getExportStatus, {});
  const requestExport = useMutation(api.users.requestExport);
  const updateSettings = useMutation(api.settings.update);
  const { consent, isAvailable, setConsent } = useAnalyticsConsent();

  const [requesting, setRequesting] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "error" | "info" } | null>(null);

  if (exportStatus === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={3} />
      </AppScreen>
    );
  }

  const startExport = async () => {
    setRequesting(true);
    setNotice(null);
    try {
      await requestExport({});
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "";
      setNotice({
        message: message.includes("rate")
          ? t("privacySettings.exportRateLimited")
          : t("privacySettings.exportFailed"),
        tone: "error",
      });
    } finally {
      setRequesting(false);
    }
  };

  const toggleAnalytics = async (granted: boolean) => {
    await setConsent(granted);
    // Mirror the choice server-side so it follows the account across devices.
    await updateSettings({ analyticsConsent: granted }).catch(() => undefined);
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("privacySettings.subtitle")} title={t("privacySettings.title")} />

      <Safeguards />

      <SectionCard>
        <View className="gap-3">
          <SectionHeader
            description={t("privacySettings.exportDescription")}
            icon="privacy"
            title={t("privacySettings.exportTitle")}
          />

          {exportStatus?.status === "pending" ? (
            <InlineNotice message={t("privacySettings.exportPending")} />
          ) : exportStatus?.status === "failed" ? (
            <InlineNotice message={t("privacySettings.exportFailed")} tone="error" />
          ) : null}

          {exportStatus?.status === "complete" && exportStatus.downloadUrl ? (
            <View className="gap-2">
              <Text className="text-sm font-semibold text-app-text" selectable>
                {t("privacySettings.exportReadyTitle")}
              </Text>
              <Text className="text-[13px] leading-[18px] text-app-muted" selectable>
                {t("privacySettings.exportReadyDescription")}
              </Text>
              <PrimaryButton
                icon="privacy"
                label={t("privacySettings.exportDownload")}
                onPress={() => void WebBrowser.openBrowserAsync(exportStatus.downloadUrl!)}
              />
            </View>
          ) : (
            <PrimaryButton
              disabled={requesting || exportStatus?.status === "pending"}
              icon="privacy"
              label={requesting ? t("common.saving") : t("privacySettings.exportStart")}
              onPress={() => void startExport()}
            />
          )}

          {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}
        </View>
      </SectionCard>

      <View className="gap-3">
        <SectionHeader
          description={t("privacySettings.analyticsDescription")}
          icon="analysis"
          title={t("privacySettings.analyticsTitle")}
        />
        {isAvailable ? (
          <RowGroup>
            {[
              <ToggleRow
                icon="analysis"
                key="analytics"
                onValueChange={(value) => void toggleAnalytics(value)}
                title={t("privacySettings.analyticsToggle")}
                value={consent === "granted"}
              />,
            ]}
          </RowGroup>
        ) : (
          <InlineNotice message={t("privacySettings.analyticsUnavailable")} />
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title={t("privacySettings.policyTitle")} />
        <RowGroup>
          {[
            <NavigationRow
              icon="terms"
              key="terms"
              onPress={() => router.push("/(app)/settings/terms")}
              title={t("termsSettings.title")}
            />,
            <NavigationRow
              destructive
              description={t("privacySettings.deleteDescription")}
              icon="delete"
              key="delete"
              onPress={() => router.push("/(app)/settings/delete-account")}
              title={t("privacySettings.deleteTitle")}
            />,
          ]}
        </RowGroup>
      </View>
    </AppScreen>
  );
}
