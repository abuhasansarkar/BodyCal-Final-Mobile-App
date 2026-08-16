import { useClerk, useReverification } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field } from "@/components/ui/form";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { ErrorState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import { colors } from "@/config/theme";
import { getInstallationId, leaveUserScope } from "@/features/auth/session-scope";
import { releaseRevenueCatIdentity } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { Pressable, Text, View } from "@/tw";

export function SettingsDeleteAccountScreen() {
  const { t } = useTranslation();
  if (!hasBackendConfiguration) {
    return (
      <AppScreen>
        <ScreenTitle description={t("config.body")} title={t("deleteAccount.title")} />
      </AppScreen>
    );
  }
  return <ConfiguredDeleteAccount />;
}

function ConfiguredDeleteAccount() {
  const { t } = useTranslation();
  const { signOut } = useClerk();
  const status = useQuery(api.users.getDeletionStatus, {});
  const requestDeletion = useMutation(api.users.requestDeletion);
  const cancelDeletion = useMutation(api.users.cancelDeletion);
  const unregisterDevice = useMutation(api.notifications.unregisterDevice);

  const [confirmation, setConfirmation] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "info" | "error" } | null>(null);

  const start = useReverification(async () => {
    const installationId = await getInstallationId();
    await unregisterDevice({ installationId }).catch(() => undefined);
    await requestDeletion({});
    await Promise.all([leaveUserScope(), releaseRevenueCatIdentity()]);
    await signOut();
  });

  if (status === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={2} />
      </AppScreen>
    );
  }

  const confirmWord = t("deleteAccount.confirmWord");
  const canDelete = confirmation.trim().toUpperCase() === confirmWord && !busy;

  const run = async () => {
    if (!canDelete) return;
    setBusy(true);
    setNotice(null);
    try {
      await start();
    } catch {
      setNotice({ message: t("deleteAccount.startError"), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await cancelDeletion({});
      setNotice({ message: t("deleteAccount.cancelled"), tone: "info" });
    } catch {
      setNotice({ message: t("errors.generic"), tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (status?.status === "pending" || status?.status === "dataCleared") {
    return (
      <AppScreen>
        <ScreenTitle title={t("deleteAccount.title")} />
        <SectionCard>
          <View className="items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-app-surface">
              <AppIcon color={colors.muted} name="delete" size={26} />
            </View>
            <Text accessibilityRole="header" className="text-center text-lg font-bold text-app-text">
              {t("deleteAccount.pendingTitle")}
            </Text>
            <Text className="text-center text-sm leading-5 text-app-muted" selectable>
              {t("deleteAccount.pendingDescription")}
            </Text>
          </View>
        </SectionCard>
      </AppScreen>
    );
  }

  if (status?.status === "failed") {
    return (
      <AppScreen>
        <ScreenTitle title={t("deleteAccount.title")} />
        <ErrorState
          description={t("deleteAccount.failedDescription")}
          title={t("deleteAccount.failedTitle")}
        />
        {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}
        <PrimaryButton
          disabled={busy}
          icon="refresh"
          label={t("deleteAccount.retry")}
          onPress={() => void run()}
        />
        <Pressable
          accessibilityRole="button"
          className="min-h-14 items-center justify-center rounded-2xl border border-app-border bg-white px-4 active:bg-app-surface"
          disabled={busy}
          onPress={() => void cancel()}
        >
          <Text className="text-base font-semibold text-app-text">{t("deleteAccount.cancel")}</Text>
        </Pressable>
      </AppScreen>
    );
  }

  const consequences = [
    t("deleteAccount.consequenceData"),
    t("deleteAccount.consequencePhotos"),
    t("deleteAccount.consequenceStore"),
  ];

  return (
    <AppScreen>
      <ScreenTitle title={t("deleteAccount.title")} />

      <SectionCard>
        <View className="gap-3">
          <SectionHeader icon="warning" title={t("deleteAccount.title")} />
          <Text className="text-sm leading-6 text-app-muted" selectable>
            {t("deleteAccount.warning")}
          </Text>
          <View className="gap-2.5">
            {consequences.map((point) => (
              <View className="flex-row gap-2.5" key={point}>
                <View className="pt-1">
                  <AppIcon color={colors.danger} name="close" size={13} weight="semibold" />
                </View>
                <Text className="min-w-0 flex-1 text-sm leading-5 text-app-muted" selectable>
                  {point}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </SectionCard>

      <Field
        autoCapitalize="characters"
        autoCorrect={false}
        label={t("deleteAccount.confirmLabel")}
        onChangeText={setConfirmation}
        placeholder={confirmWord}
        value={confirmation}
      />

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ busy, disabled: !canDelete }}
        className="min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-app-error px-4 active:opacity-75 disabled:opacity-45"
        disabled={!canDelete}
        onPress={() => void run()}
      >
        <AppIcon color={colors.white} name="delete" size={20} weight="semibold" />
        <Text className="text-base font-semibold text-white">
          {busy ? t("common.saving") : t("deleteAccount.confirmAction")}
        </Text>
      </Pressable>
    </AppScreen>
  );
}
