import { useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import type { AppIconName } from "@/components/app-icon";
import { InlineNotice } from "@/components/ui/states";
import { ToggleRow } from "@/components/ui/rows";
import { hasBackendConfiguration } from "@/config/env";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import {
  DEFAULT_REMINDER_TIMES,
  requestNotificationPermission,
  syncReminders,
  type PermissionStatus,
  type ReminderKey,
} from "@/features/notifications/scheduler";
import { api } from "@/lib/convex-api";
import { currentTimezone } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { View } from "@/tw";
import { deriveDateOfBirth } from "@/features/onboarding/date-of-birth";

type ReminderSelection = Record<ReminderKey, boolean>;

const initialSelection: ReminderSelection = {
  daily: true,
  meal: true,
  hydration: true,
  progress: true,
  motivation: true,
};

function ConfiguredNotificationRoute() {
  const { draft, clear, hydrated } = useOnboarding();
  const { user } = useUser();
  const sync = useMutation(api.users.syncFromClerk);
  const complete = useMutation(api.onboarding.complete);
  const updatePreferences = useMutation(api.notifications.updatePreferences);
  const { t } = useTranslation();
  const [saving, setSaving] = React.useState(false);

  const finish = async (selection: ReminderSelection) => {
    if (!user || !hydrated || saving) return;
    setSaving(true);
    try {
      const wantsReminders = Object.values(selection).some(Boolean);
      const permission: PermissionStatus = wantsReminders
        ? await requestNotificationPermission()
        : "not_requested";
      const enabled = wantsReminders && permission === "granted";

      await sync({
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      });

      const timezone = currentTimezone();
      const locale = i18n.resolvedLanguage ?? "en";
      const { dateOfBirth, precision } = deriveDateOfBirth(draft.age);

      await updatePreferences({
        enabled,
        categories: selection,
        times: DEFAULT_REMINDER_TIMES,
        timezone,
        permissionStatus: permission,
      });

      // The server recomputes the plan and only accepts the AI numbers when they
      // sit within 10% of its own baseline, so these are advisory.
      await complete({
        dateOfBirth,
        dateOfBirthPrecision: precision,
        calculationBasis: draft.calculationBasis,
        heightCm: draft.heightCm,
        currentWeightKg: draft.currentWeightKg,
        goalWeightKg: draft.goalWeightKg,
        weightUnit: draft.weightUnit,
        heightUnit: draft.heightUnit,
        activityLevel: draft.activityLevel,
        goalType: draft.goal,
        goalPace: draft.pace,
        locale,
        timezone,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        suggestedTargets: draft.aiPlan
          ? {
              calories: draft.aiPlan.calories,
              proteinGrams: draft.aiPlan.proteinGrams,
              carbsGrams: draft.aiPlan.carbsGrams,
              fatGrams: draft.aiPlan.fatGrams,
              source: draft.aiPlan.formulaVersion,
            }
          : undefined,
      });

      if (enabled) {
        await syncReminders(
          { categories: selection, times: DEFAULT_REMINDER_TIMES },
          reminderCopy(t),
        ).catch(() => undefined);
      }

      await clear();
      router.replace("/(app)/paywall");
    } finally {
      setSaving(false);
    }
  };

  return <NotificationContent disabled={saving || !hydrated} finish={finish} />;
}

/** Notification body copy comes from the active language, never a hard-coded string. */
function reminderCopy(t: (key: string) => string) {
  return {
    daily: { title: t("notificationSettings.dailyTitle"), body: t("notificationSettings.dailyDescription") },
    meal: { title: t("notificationSettings.mealTitle"), body: t("notificationSettings.mealDescription") },
    hydration: {
      title: t("notificationSettings.hydrationTitle"),
      body: t("notificationSettings.hydrationDescription"),
    },
    progress: {
      title: t("notificationSettings.progressTitle"),
      body: t("notificationSettings.progressDescription"),
    },
    motivation: {
      title: t("notificationSettings.motivationTitle"),
      body: t("notificationSettings.motivationDescription"),
    },
  };
}

function NotificationContent({
  disabled = false,
  finish,
}: {
  disabled?: boolean;
  finish: (selection: ReminderSelection) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [selection, setSelection] = React.useState(initialSelection);
  const [failed, setFailed] = React.useState(false);

  const reminders: { description: string; icon: AppIconName; key: ReminderKey; title: string }[] = [
    {
      key: "daily",
      icon: "notification",
      title: t("onboarding.notifications.daily.title"),
      description: t("onboarding.notifications.daily.description"),
    },
    {
      key: "meal",
      icon: "foods",
      title: t("onboarding.notifications.meal.title"),
      description: t("onboarding.notifications.meal.description"),
    },
    {
      key: "hydration",
      icon: "hydration",
      title: t("onboarding.notifications.hydration.title"),
      description: t("onboarding.notifications.hydration.description"),
    },
    {
      key: "progress",
      icon: "progress",
      title: t("onboarding.notifications.progressReminder.title"),
      description: t("onboarding.notifications.progressReminder.description"),
    },
    {
      key: "motivation",
      icon: "motivation",
      title: t("onboarding.notifications.motivation.title"),
      description: t("onboarding.notifications.motivation.description"),
    },
  ];

  const submit = () => {
    setFailed(false);
    void finish(selection).catch(() => setFailed(true));
  };

  return (
    <OnboardingStageScreen
      description={t("onboarding.notifications.description")}
      disabled={disabled}
      footerLabel={t("onboarding.notifications.button")}
      onContinue={submit}
      progressStep={12}
      title={t("onboarding.notifications.title")}
    >
      <View className="flex-1 justify-center gap-3">
        <View
          className="overflow-hidden rounded-[18px] border border-app-border bg-white"
          style={{ borderCurve: "continuous" }}
        >
          {reminders.map((reminder, index) => (
            <View key={reminder.key}>
              {index > 0 ? <View className="h-px bg-app-border-soft" /> : null}
              <ToggleRow
                description={reminder.description}
                icon={reminder.icon}
                onValueChange={(value) =>
                  setSelection((current) => ({ ...current, [reminder.key]: value }))
                }
                title={reminder.title}
                value={selection[reminder.key]}
              />
            </View>
          ))}
        </View>
        {failed ? <InlineNotice message={t("errors.accountSyncFailed")} tone="error" /> : null}
      </View>
    </OnboardingStageScreen>
  );
}

export default function NotificationRoute() {
  if (hasBackendConfiguration) return <ConfiguredNotificationRoute />;
  return (
    <NotificationContent
      finish={async (selection) => {
        if (Object.values(selection).some(Boolean)) await requestNotificationPermission();
        router.replace("/(app)/paywall");
      }}
    />
  );
}
