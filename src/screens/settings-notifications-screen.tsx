import { useConvexAuth, useMutation, useQuery } from "convex/react";
import React from "react";
import { useTranslation } from "react-i18next";
import { Linking } from "react-native";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { Field } from "@/components/ui/form";
import { RowGroup, ToggleRow } from "@/components/ui/rows";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { hasBackendConfiguration } from "@/config/env";
import {
    DEFAULT_REMINDER_TIMES,
    getPermissionStatus,
    requestNotificationPermission,
    syncReminders,
    type PermissionStatus,
    type ReminderKey,
} from "@/features/notifications/scheduler";
import { api } from "@/lib/convex-api";
import { currentTimezone } from "@/lib/local-day";
import { Text, View } from "@/tw";

type Selection = Record<ReminderKey, boolean>;
type Times = Record<ReminderKey, string>;

const REMINDER_KEYS: ReminderKey[] = ["daily", "meal", "hydration", "progress", "motivation"];

const CATEGORY_COPY: Record<ReminderKey, { icon: "notification" | "foods" | "hydration" | "progress" | "motivation"; titleKey: string; descriptionKey: string }> = {
  daily: { icon: "notification", titleKey: "dailyTitle", descriptionKey: "dailyDescription" },
  meal: { icon: "foods", titleKey: "mealTitle", descriptionKey: "mealDescription" },
  hydration: { icon: "hydration", titleKey: "hydrationTitle", descriptionKey: "hydrationDescription" },
  progress: { icon: "progress", titleKey: "progressTitle", descriptionKey: "progressDescription" },
  motivation: { icon: "motivation", titleKey: "motivationTitle", descriptionKey: "motivationDescription" },
};

export function SettingsNotificationsScreen() {
  const { t } = useTranslation();
  if (hasBackendConfiguration) return <ConfiguredNotificationSettings />;
  return (
    <AppScreen>
      <ScreenTitle description={t("config.body")} title={t("notificationSettings.title")} />
    </AppScreen>
  );
}

function ConfiguredNotificationSettings() {
  const { isAuthenticated } = useConvexAuth();
  const preferences = useQuery(api.notifications.getPreferences, isAuthenticated ? {} : "skip");
  const [permission, setPermission] = React.useState<PermissionStatus | null>(null);

  React.useEffect(() => {
    void getPermissionStatus().then(setPermission);
  }, []);

  if (preferences === undefined || permission === null) {
    return (
      <AppScreen>
        <ScreenSkeleton lines={3} />
      </AppScreen>
    );
  }

  return (
    <NotificationForm
      initialPermission={permission}
      key={preferences?.updatedAt ?? "new"}
      preferences={preferences}
    />
  );
}

type Preferences = {
  enabled: boolean;
  categories: Selection;
  times: Times;
  quietHoursStart?: string;
  quietHoursEnd?: string;
} | null;

/**
 * Reminder preferences.
 *
 * Every change is persisted to Convex and reconciled with the local schedule, so a
 * category toggled off actually cancels its notification. The previous version
 * held all of this in local state, saved nothing, and stacked a duplicate 8 PM
 * reminder on every press.
 */
function NotificationForm({
  initialPermission,
  preferences,
}: {
  initialPermission: PermissionStatus;
  preferences: Preferences;
}) {
  const { t } = useTranslation();
  const updatePreferences = useMutation(api.notifications.updatePreferences);

  const [enabled, setEnabled] = React.useState(preferences?.enabled ?? false);
  const [selection, setSelection] = React.useState<Selection>(
    preferences?.categories ?? {
      daily: true,
      meal: true,
      hydration: false,
      progress: true,
      motivation: false,
    },
  );
  const [times, setTimes] = React.useState<Times>(preferences?.times ?? DEFAULT_REMINDER_TIMES);
  const [quietStart, setQuietStart] = React.useState(preferences?.quietHoursStart ?? "22:00");
  const [quietEnd, setQuietEnd] = React.useState(preferences?.quietHoursEnd ?? "07:00");
  const [permission, setPermission] = React.useState(initialPermission);
  const [saving, setSaving] = React.useState(false);
  const [notice, setNotice] = React.useState<{ message: string; tone: "success" | "error" } | null>(null);

  const timeValid = (value: string) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
  const invalidTime = Object.values(times).some((value) => !timeValid(value));
  const invalidQuietHours = !timeValid(quietStart) || !timeValid(quietEnd);

  const copy = React.useMemo(
    () =>
      Object.fromEntries(
        REMINDER_KEYS.map((key) => [
          key,
          {
            title: t(`notificationSettings.${CATEGORY_COPY[key].titleKey}`),
            body: t(`notificationSettings.${CATEGORY_COPY[key].descriptionKey}`),
          },
        ]),
      ) as Record<ReminderKey, { title: string; body: string }>,
    [t],
  );

  const askPermission = async () => {
    const next = await requestNotificationPermission();
    setPermission(next);
    if (next === "granted") setEnabled(true);
  };

  const save = async () => {
    if (saving || invalidTime || invalidQuietHours) return;
    setSaving(true);
    setNotice(null);
    try {
      const effective = enabled && permission === "granted";
      await updatePreferences({
        enabled: effective,
        categories: selection,
        times,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
        timezone: currentTimezone(),
        permissionStatus: permission,
      });

      await syncReminders(
        {
          categories: effective
            ? selection
            : { daily: false, meal: false, hydration: false, progress: false, motivation: false },
          times,
          quietHoursStart: quietStart,
          quietHoursEnd: quietEnd,
        },
        copy,
      );
      setNotice({ message: t("notificationSettings.saved"), tone: "success" });
    } catch {
      setNotice({ message: t("notificationSettings.saveError"), tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <ScreenTitle description={t("notificationSettings.subtitle")} title={t("notificationSettings.title")} />

      {permission === "denied" ? (
        <EmptyState
          action={t("notificationSettings.openSettings")}
          description={t("notificationSettings.permissionDeniedDescription")}
          icon="notification"
          onAction={() => void Linking.openSettings()}
          title={t("notificationSettings.permissionDeniedTitle")}
        />
      ) : permission !== "granted" ? (
        <EmptyState
          action={t("common.enable")}
          description={t("notificationSettings.permissionNeededDescription")}
          icon="notification"
          onAction={() => void askPermission()}
          title={t("notificationSettings.permissionNeededTitle")}
        />
      ) : null}

      <RowGroup>
        {[
          <ToggleRow
            description={t("notificationSettings.masterDescription")}
            disabled={permission !== "granted"}
            icon="notification"
            key="master"
            onValueChange={setEnabled}
            title={t("notificationSettings.masterToggle")}
            value={enabled && permission === "granted"}
          />,
        ]}
      </RowGroup>

      <View className="gap-3">
        <SectionHeader title={t("notificationSettings.categoriesTitle")} />
        <RowGroup>
          {REMINDER_KEYS.map((key) => (
            <ToggleRow
              description={t(`notificationSettings.${CATEGORY_COPY[key].descriptionKey}`)}
              disabled={!enabled || permission !== "granted"}
              icon={CATEGORY_COPY[key].icon}
              key={key}
              onValueChange={(value) => setSelection((current) => ({ ...current, [key]: value }))}
              title={t(`notificationSettings.${CATEGORY_COPY[key].titleKey}`)}
              value={selection[key]}
            />
          ))}
        </RowGroup>
      </View>

      <SectionCard>
        <View className="gap-4">
          <SectionHeader icon="calendar" title={t("notificationSettings.timesTitle")} />
          {REMINDER_KEYS.filter((key) => selection[key]).map((key) => (
            <Field
              error={timeValid(times[key]) ? null : t("errors.saveFailed")}
              key={key}
              keyboardType="numbers-and-punctuation"
              label={t(`notificationSettings.${CATEGORY_COPY[key].titleKey}`)}
              onChangeText={(value) => setTimes((current) => ({ ...current, [key]: value }))}
              placeholder="20:00"
              value={times[key]}
            />
          ))}
          {REMINDER_KEYS.every((key) => !selection[key]) ? (
            <Text className="text-sm text-app-muted" selectable>
              {t("notificationSettings.categoriesTitle")}
            </Text>
          ) : null}
        </View>
      </SectionCard>

      <SectionCard>
        <View className="gap-4">
          <SectionHeader
            description={t("notificationSettings.quietHoursDescription")}
            icon="appearance"
            title={t("notificationSettings.quietHoursTitle")}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Field
                error={timeValid(quietStart) ? null : t("errors.saveFailed")}
                keyboardType="numbers-and-punctuation"
                label={t("notificationSettings.quietStart")}
                onChangeText={setQuietStart}
                placeholder="22:00"
                value={quietStart}
              />
            </View>
            <View className="flex-1">
              <Field
                error={timeValid(quietEnd) ? null : t("errors.saveFailed")}
                keyboardType="numbers-and-punctuation"
                label={t("notificationSettings.quietEnd")}
                onChangeText={setQuietEnd}
                placeholder="07:00"
                value={quietEnd}
              />
            </View>
          </View>
        </View>
      </SectionCard>

      {notice ? <InlineNotice message={notice.message} tone={notice.tone} /> : null}

      <PrimaryButton
        disabled={saving || invalidTime || invalidQuietHours}
        icon="check"
        label={saving ? t("common.saving") : t("common.save")}
        onPress={() => void save()}
      />
    </AppScreen>
  );
}
