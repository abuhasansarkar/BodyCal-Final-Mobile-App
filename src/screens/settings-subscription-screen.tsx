import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { DetailRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { InlineNotice, OfflineBanner } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { isProState, useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { Pressable, Text, View } from "@/tw";

/**
 * Subscription management.
 *
 * State comes from RevenueCat through the subscription provider; the Convex mirror
 * is read only for the renewal/expiry dates it recorded. Restore always stays
 * visible and an empty restore is reported as information, not an error.
 */
export function SettingsSubscriptionScreen() {
  const { t } = useTranslation();
  const { error, restore, state } = useSubscription();
  const mirror = useQuery(api.subscriptions.getMirror, hasBackendConfiguration ? {} : "skip");

  const [restoring, setRestoring] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "error" } | null>(null);

  const isPro = isProState(state);
  const { i18n } = useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: "medium" });

  const handleRestore = async () => {
    setRestoring(true);
    setNotice(null);
    try {
      const result = await restore();
      setNotice({
        message: result.restored
          ? t("subscriptionSettings.restored")
          : t("subscriptionSettings.restoreEmpty"),
        tone: "info",
      });
    } catch {
      setNotice({ message: t("subscriptionSettings.restoreError"), tone: "error" });
    } finally {
      setRestoring(false);
    }
  };

  const features = [
    t("subscriptionSettings.featureScans"),
    t("subscriptionSettings.featureHistory"),
    t("subscriptionSettings.featureTargets"),
    t("subscriptionSettings.featureSupport"),
  ];

  return (
    <AppScreen>
      <ScreenTitle
        description={t("subscriptionSettings.subtitle")}
        title={t("subscriptionSettings.title")}
      />

      {state === "offlineUnknown" ? (
        <OfflineBanner message={t("subscriptionSettings.offlineNotice")} />
      ) : null}
      {state === "error" && error ? <InlineNotice message={t("errors.loadFailed")} tone="error" /> : null}

      <SectionCard>
        <View className="gap-4">
          <View className="flex-row items-center gap-3">
            <View
              className={
                isPro
                  ? "h-12 w-12 items-center justify-center rounded-full bg-[#111111]"
                  : "h-12 w-12 items-center justify-center rounded-full bg-app-surface"
              }
            >
              <AppIcon
                color={isPro ? colors.white : colors.muted}
                name="subscription"
                size={24}
                weight="semibold"
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-xs font-semibold uppercase tracking-[0.08em] text-app-muted">
                {t("subscriptionSettings.currentPlan")}
              </Text>
              <Text className="text-2xl font-bold tracking-[-0.4px] text-app-text" selectable>
                {isPro ? t("subscriptionSettings.proName") : t("subscriptionSettings.freeName")}
              </Text>
            </View>
            {state === "trial" ? (
              <View className="rounded-full bg-app-surface px-3 py-1.5">
                <Text className="text-xs font-semibold text-app-text">
                  {t("subscriptionSettings.trialLabel")}
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-sm leading-6 text-app-muted" selectable>
            {isPro
              ? t("subscriptionSettings.proDescription")
              : t("subscriptionSettings.freeDescription")}
          </Text>

          {state === "cancelledActive" ? (
            <InlineNotice message={t("subscriptionSettings.cancelledNotice")} />
          ) : null}
          {state === "billingIssueActive" ? (
            <InlineNotice message={t("subscriptionSettings.billingIssueNotice")} tone="error" />
          ) : null}
        </View>
      </SectionCard>

      {mirror?.expirationAt ? (
        <RowGroup>
          {[
            <DetailRow
              key="expiry"
              label={
                mirror.willRenew
                  ? t("subscriptionSettings.renewsOn", { date: "" }).trim()
                  : t("subscriptionSettings.expiresOn", { date: "" }).trim()
              }
              value={dateFormatter.format(new Date(mirror.expirationAt))}
            />,
          ]}
        </RowGroup>
      ) : null}

      {!isPro ? (
        <SectionCard>
          <View className="gap-3">
            <SectionHeader icon="subscription" title={t("subscriptionSettings.featuresTitle")} />
            <View className="gap-2.5">
              {features.map((feature) => (
                <View className="flex-row items-center gap-2.5" key={feature}>
                  <AppIcon color={colors.text} name="check" size={17} weight="semibold" />
                  <Text className="min-w-0 flex-1 text-sm font-medium text-app-text" selectable>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
            <PrimaryButton
              icon="subscription"
              label={t("subscriptionSettings.upgrade")}
              onPress={() => router.push("/(app)/paywall")}
            />
          </View>
        </SectionCard>
      ) : null}

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy: restoring, disabled: restoring }}
        className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
        disabled={restoring}
        onPress={() => void handleRestore()}
      >
        <AppIcon color={colors.text} name="refresh" size={19} />
        <Text className="text-base font-semibold text-app-text">
          {restoring ? t("subscriptionSettings.restoring") : t("subscriptionSettings.restore")}
        </Text>
      </Pressable>

      <InlineNotice message={t("subscriptionSettings.manageNote")} />
    </AppScreen>
  );
}
