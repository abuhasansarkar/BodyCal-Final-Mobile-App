import { useUser } from "@clerk/expo";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { hasBackendConfiguration } from "@/config/env";
import { calculateNutritionPlan } from "@/domain/nutrition-calculator";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { requestNotificationPermission } from "@/features/notifications/scheduler";
import { api } from "@/lib/convex-api";
import { i18n } from "@/locales/i18n";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { Text, View } from "@/tw";

type ReminderKey = "daily" | "meal" | "hydration" | "progress" | "motivation";
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
  const [saving, setSaving] = React.useState(false);

  const finish = async (selection: ReminderSelection) => {
    if (!user || !hydrated || saving) return;
    setSaving(true);
    try {
      const hasEnabledReminder = Object.values(selection).some(Boolean);
      const permission = hasEnabledReminder ? await requestNotificationPermission() : null;
      await sync({ email: user.primaryEmailAddress?.emailAddress ?? "", name: user.fullName ?? undefined, avatarUrl: user.imageUrl ?? undefined });
      const plan = calculateNutritionPlan(draft);
      const now = new Date();
      await updatePreferences({
        categories: selection,
        enabled: hasEnabledReminder && permission?.granted === true,
        permissionStatus: permission?.status ?? "not_requested",
        times: { daily: "09:00", hydration: "every_2_hours", meal: "08:00,13:00,19:00", motivation: "occasional", progress: "weekly" },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      await complete({
        dateOfBirth: `${now.getFullYear() - draft.age}-01-01`,
        calculationBasis: draft.calculationBasis,
        heightCm: draft.heightCm,
        currentWeightKg: draft.currentWeightKg,
        goalWeightKg: draft.goalWeightKg,
        weightUnit: draft.weightUnit,
        heightUnit: draft.heightUnit,
        activityLevel: draft.activityLevel,
        goalType: draft.goal,
        goalPace: draft.pace,
        locale: i18n.resolvedLanguage ?? "en",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        calories: plan.calories,
        proteinGrams: plan.proteinGrams,
        carbsGrams: plan.carbsGrams,
        fatGrams: plan.fatGrams,
        effectiveFrom: now.toISOString().slice(0, 10),
        calculationMetadata: { ...draft, bmr: plan.bmr, tdee: plan.tdee, formulaVersion: plan.formulaVersion },
      });
      await clear();
      router.replace("/(app)/paywall");
    } finally {
      setSaving(false);
    }
  };

  return <NotificationContent disabled={saving || !hydrated} finish={finish} />;
}

function NotificationContent({ disabled = false, finish }: { disabled?: boolean; finish: (selection: ReminderSelection) => Promise<void> }) {
  const { t } = useTranslation();
  const [selection, setSelection] = React.useState(initialSelection);
  const [failed, setFailed] = React.useState(false);
  const reminders: { description: string; icon: AppIconName; key: ReminderKey; title: string }[] = [
    { key: "daily", icon: "notification", title: t("onboarding.notifications.daily.title"), description: t("onboarding.notifications.daily.description") },
    { key: "meal", icon: "foods", title: t("onboarding.notifications.meal.title"), description: t("onboarding.notifications.meal.description") },
    { key: "hydration", icon: "hydration", title: t("onboarding.notifications.hydration.title"), description: t("onboarding.notifications.hydration.description") },
    { key: "progress", icon: "progress", title: t("onboarding.notifications.progressReminder.title"), description: t("onboarding.notifications.progressReminder.description") },
    { key: "motivation", icon: "motivation", title: t("onboarding.notifications.motivation.title"), description: t("onboarding.notifications.motivation.description") },
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
        {reminders.map((reminder) => (
          <View className="min-h-[72px] flex-row items-center gap-3 rounded-[16px] border border-[#E8E8E8] bg-white px-4 py-2.5" key={reminder.key}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-[#F7F7F7]">
              <AppIcon name={reminder.icon} size={21} weight="semibold" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-[15px] font-semibold leading-5 text-[#111111]">{reminder.title}</Text>
              <Text className="text-[12px] leading-4 text-[#737373]">{reminder.description}</Text>
            </View>
            <Switch
              accessibilityLabel={reminder.title}
              ios_backgroundColor="#E8E8E8"
              onValueChange={(value) => setSelection((current) => ({ ...current, [reminder.key]: value }))}
              thumbColor="#FFFFFF"
              trackColor={{ false: "#D8D8D8", true: "#111111" }}
              value={selection[reminder.key]}
            />
          </View>
        ))}
        {failed ? <Text accessibilityLiveRegion="polite" className="px-2 text-center text-[14px] leading-5 text-[#EF4444]" selectable>{t("onboarding.notifications.error")}</Text> : null}
      </View>
    </OnboardingStageScreen>
  );
}

export default function NotificationRoute() {
  if (hasBackendConfiguration) return <ConfiguredNotificationRoute />;
  return <NotificationContent finish={async (selection) => { if (Object.values(selection).some(Boolean)) await requestNotificationPermission(); router.replace("/(app)/paywall"); }} />;
}
