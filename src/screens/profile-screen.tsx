import { useClerk, useUser } from "@clerk/expo";
import { useQuery } from "convex/react";
import { Link } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { hasBackendConfiguration } from "@/config/env";
import { clearBodyCalNotifications } from "@/features/notifications/scheduler";
import { clearOutbox } from "@/features/outbox/outbox";
import { useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { Image, Pressable, Text, View } from "@/tw";

type SettingsRoute = "personal-details" | "goal" | "nutrition-targets" | "notifications" | "units" | "appearance" | "language" | "subscription" | "help" | "privacy" | "terms" | "delete-account";
type Setting = { icon: AppIconName; route: SettingsRoute; titleKey: string; destructive?: boolean };

const primarySettings: Setting[] = [
  { icon: "personalDetails", route: "personal-details", titleKey: "personalDetails" },
  { icon: "goal", route: "goal", titleKey: "goals" },
  { icon: "nutrition", route: "nutrition-targets", titleKey: "nutritionTargets" },
  { icon: "notification", route: "notifications", titleKey: "notifications" },
  { icon: "units", route: "units", titleKey: "units" },
  { icon: "appearance", route: "appearance", titleKey: "appearance" },
  { icon: "language", route: "language", titleKey: "language" },
];

const supportSettings: Setting[] = [
  { icon: "subscription", route: "subscription", titleKey: "subscription" },
  { icon: "help", route: "help", titleKey: "help" },
  { icon: "privacy", route: "privacy", titleKey: "privacy" },
  { icon: "terms", route: "terms", titleKey: "terms" },
];

const accountSettings: Setting[] = [
  { icon: "delete", route: "delete-account", titleKey: "deleteAccount", destructive: true },
];

function ConfiguredProfile() {
  const { user } = useUser();
  const profile = useQuery(api.profiles.getCurrent, {});
  const latestWeights = useQuery(api.weights.getHistory, { limit: 1 });

  if (profile === undefined || latestWeights === undefined) return <ProfileLoading />;
  return <ProfileContent identity={{ email: user?.primaryEmailAddress?.emailAddress ?? null, imageUrl: user?.imageUrl ?? null, name: user?.fullName || user?.firstName || null }} latestWeightKg={latestWeights[0]?.normalizedKg ?? null} profile={profile} />;
}

function ProfileLoading() {
  return (
    <AppScreen>
      <View className="h-28 rounded-3xl bg-app-surface" />
      <View className="h-44 rounded-3xl bg-app-surface" />
      <View className="h-80 rounded-3xl bg-app-surface" />
    </AppScreen>
  );
}

type ProfileData = {
  goalType: "lose" | "maintain" | "gain";
  currentWeightKg: number;
  goalWeightKg: number;
  weightUnit: "kg" | "lb";
} | null;

function ProfileContent({ identity, latestWeightKg, profile }: { identity: { email: string | null; imageUrl: string | null; name: string | null }; latestWeightKg: number | null; profile: ProfileData }) {
  const { t, i18n } = useTranslation();
  const { state } = useSubscription();
  const isPremium = state === "active" || state === "trial" || state === "cancelledActive" || state === "billingIssueActive";
  const name = identity.name || t("profile.bodyCalMember");
  const currentKg = latestWeightKg ?? profile?.currentWeightKg ?? null;
  const weightUnit = profile?.weightUnit ?? "kg";
  const formatWeight = (kilograms: number | null) => {
    if (kilograms === null) return "—";
    const value = weightUnit === "lb" ? kilograms * 2.2046226218 : kilograms;
    return `${new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(value)} ${weightUnit}`;
  };
  const toGo = currentKg !== null && profile ? Math.abs(currentKg - profile.goalWeightKg) : null;

  return (
    <AppScreen edges={["top", "left", "right"]}>
      {/* Native tabs render no header, so the title and its action live here. */}
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className="min-w-0 flex-1 text-[28px] font-bold tracking-[-0.6px] text-app-text" numberOfLines={1} selectable>
          {t("profile.title")}
        </Text>
        <Link href="/(app)/settings/notifications" asChild>
          <Pressable accessibilityLabel={t("profile.settings.notifications")} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full active:bg-app-surface">
            <AppIcon name="notification" size={23} />
          </Pressable>
        </Link>
      </View>

      <View className="flex-row items-center gap-4 px-1 py-2">
        {identity.imageUrl ? (
          <Image accessibilityLabel={t("profile.photoOf", { name })} cachePolicy="memory" className="h-24 w-24 rounded-full bg-app-surface" contentFit="cover" source={{ uri: identity.imageUrl }} transition={150} />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full bg-[#F1F1F1]">
            <Text className="text-3xl font-bold text-app-text" selectable>{initials(name)}</Text>
          </View>
        )}
        <View className="min-w-0 flex-1 items-start gap-1.5">
          <Text accessibilityRole="header" className="text-2xl font-bold tracking-[-0.4px] text-app-text" numberOfLines={2} selectable>{name}</Text>
          {identity.email ? <Text className="text-sm text-app-muted" numberOfLines={1} selectable>{identity.email}</Text> : null}
          <View className={isPremium ? "flex-row items-center gap-1.5 rounded-full bg-[#111111] px-3 py-1.5" : "flex-row items-center gap-1.5 rounded-full bg-app-surface px-3 py-1.5"}>
            <AppIcon color={isPremium ? "#FFFFFF" : "#737373"} name={isPremium ? "subscription" : "profile"} size={15} weight="semibold" />
            <Text className={isPremium ? "text-sm font-semibold text-white" : "text-sm font-semibold text-app-muted"} selectable>{isPremium ? t("profile.premium") : t("profile.freePlan")}</Text>
          </View>
        </View>
        <Link href="/(app)/settings/personal-details" asChild>
          <Pressable accessibilityLabel={t("profile.editProfile")} accessibilityRole="button" className="h-11 w-11 items-center justify-center rounded-full border border-app-border bg-white active:bg-app-surface">
            <AppIcon name="edit" size={19} />
          </Pressable>
        </Link>
      </View>

      <View className="gap-4 rounded-3xl border border-app-border bg-white p-5" style={{ borderCurve: "continuous", boxShadow: "0 6px 24px rgba(0, 0, 0, 0.045)" }}>
        <View className="flex-row items-center gap-2.5">
          <AppIcon name="goal" size={24} weight="semibold" />
          <Text accessibilityRole="header" className="text-lg font-bold text-app-text" selectable>{t("profile.goalSummary")}</Text>
        </View>
        {profile ? (
          <View className="flex-row">
            <SummaryValue label={t("profile.currentGoal")} value={t(`profile.goals.${profile.goalType}`)} supporting={t("profile.personalizedPlan")} />
            <View className="w-px bg-app-border" />
            <SummaryValue label={t("profile.currentWeight")} value={formatWeight(currentKg)} supporting={latestWeightKg === null ? t("profile.startingWeight") : t("profile.latestEntry")} />
            <View className="w-px bg-app-border" />
            <SummaryValue label={t("profile.goalWeight")} value={formatWeight(profile.goalWeightKg)} supporting={toGo === null ? t("profile.notAvailable") : t("profile.weightToGo", { value: formatWeight(toGo) })} />
          </View>
        ) : (
          <Link href="/(app)/settings/personal-details" asChild>
            <Pressable accessibilityRole="button" className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-app-surface px-4 active:opacity-70">
              <AppIcon name="personalDetails" size={22} />
              <Text className="min-w-0 flex-1 text-sm font-medium text-app-text" selectable>{t("profile.completeProfile")}</Text>
              <AppIcon color="#737373" name="chevronRight" size={18} />
            </Pressable>
          </Link>
        )}
      </View>

      <SettingsSection items={primarySettings} title={t("profile.settingsTitle")} />
      <SettingsSection items={supportSettings} />
      <SettingsSection items={accountSettings} />
      {hasBackendConfiguration ? <SignOutRow /> : null}
    </AppScreen>
  );
}

function SummaryValue({ label, supporting, value }: { label: string; supporting: string; value: string }) {
  return (
    <View className="min-w-0 flex-1 items-center gap-2 px-2">
      <Text className="text-center text-sm font-semibold text-app-muted" selectable>{label}</Text>
      <Text className="text-center text-base font-bold leading-5 text-app-text" selectable>{value}</Text>
      <Text className="text-center text-xs font-medium leading-4 text-app-muted" selectable>{supporting}</Text>
    </View>
  );
}

function SettingsSection({ items, title }: { items: Setting[]; title?: string }) {
  const { t } = useTranslation();
  return (
    <View className="gap-3">
      {title ? <Text accessibilityRole="header" className="px-1 text-lg font-bold text-app-text" selectable>{title}</Text> : null}
      <View className="overflow-hidden rounded-3xl border border-app-border bg-white" style={{ borderCurve: "continuous" }}>
        {items.map((item, index) => {
          const color = item.destructive ? "#DC2626" : "#111111";
          return (
            <Link key={item.route} href={`/(app)/settings/${item.route}` as never} asChild>
              <Pressable accessibilityRole="button" className={index < items.length - 1 ? "min-h-16 flex-row items-center gap-4 border-b border-app-border px-4 active:bg-app-surface" : "min-h-16 flex-row items-center gap-4 px-4 active:bg-app-surface"}>
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-app-surface"><AppIcon color={color} name={item.icon} size={21} /></View>
                <Text className={item.destructive ? "min-w-0 flex-1 text-base font-medium text-[#DC2626]" : "min-w-0 flex-1 text-base font-medium text-app-text"} selectable>{t(`profile.settings.${item.titleKey}`)}</Text>
                <AppIcon color="#A3A3A3" name="chevronRight" size={19} />
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

function SignOutRow() {
  const { signOut } = useClerk();
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState(false);
  const run = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await Promise.all([clearOutbox(), clearBodyCalNotifications()]);
      await signOut();
    } catch {
      setError(true);
      setBusy(false);
    }
  };
  return (
    <View className="gap-2">
      <Pressable accessibilityRole="button" accessibilityState={{ busy, disabled: busy }} className="min-h-16 flex-row items-center gap-4 rounded-3xl border border-app-border bg-white px-4 active:bg-[#FFF4F4]" disabled={busy} onPress={() => void run()}>
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F1]"><AppIcon color="#DC2626" name="logout" size={22} /></View>
        <Text className="min-w-0 flex-1 text-base font-semibold text-[#DC2626]" selectable>{busy ? t("profile.signingOut") : t("profile.signOut")}</Text>
      </Pressable>
      {error ? <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" className="px-2 text-sm text-[#DC2626]" selectable>{t("profile.signOutError")}</Text> : null}
    </View>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "BC";
}

export function ProfileScreen() {
  return hasBackendConfiguration ? <ConfiguredProfile /> : <ProfileContent identity={{ email: null, imageUrl: null, name: null }} latestWeightKg={null} profile={{ goalType: "maintain", currentWeightKg: 70, goalWeightKg: 70, weightUnit: "kg" }} />;
}
