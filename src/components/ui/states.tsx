import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { colors, shadows } from "@/config/theme";
import { Pressable, Text, View } from "@/tw";

/**
 * The five states every data-driven screen owes the user: loading, empty, error,
 * offline/stale, and a retry affordance. Centralised so no screen ships with only
 * a success path.
 */

/** Skeleton block. Compose several to mirror the real layout. */
export function Skeleton({ className = "h-16" }: { className?: string }) {
  return <View className={`rounded-3xl bg-app-surface ${className}`} />;
}

export function ScreenSkeleton({ lines = 4 }: { lines?: number }) {
  const { t } = useTranslation();
  return (
    <View accessibilityLabel={t("common.loading")} accessibilityRole="progressbar" className="gap-4">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-5 w-64" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton className="h-20" key={index} />
      ))}
    </View>
  );
}

/** Empty state with an optional primary action. */
export function EmptyState({
  action,
  description,
  icon = "foods",
  onAction,
  title,
}: {
  action?: string;
  description: string;
  icon?: AppIconName;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View
      className="items-center gap-3 rounded-3xl border border-dashed border-app-border bg-white p-6"
      style={{ borderCurve: "continuous" }}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-app-surface">
        <AppIcon color={colors.muted} name={icon} size={26} />
      </View>
      <Text accessibilityRole="header" className="text-center text-lg font-bold text-app-text" selectable>
        {title}
      </Text>
      <Text className="text-center text-sm leading-5 text-app-muted" selectable>
        {description}
      </Text>
      {action && onAction ? (
        <PrimaryButton className="mt-1 w-full" icon="add" label={action} onPress={onAction} />
      ) : null}
    </View>
  );
}

/** Error state. Always paired with a retry action. */
export function ErrorState({
  description,
  onRetry,
  title,
}: {
  description?: string;
  onRetry?: () => void;
  title: string;
}) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="alert"
      className="items-center gap-4 rounded-3xl border border-app-border bg-white p-6"
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-app-error-surface">
        <AppIcon color={colors.danger} name="warning" size={26} />
      </View>
      <Text className="text-center text-lg font-bold text-app-text" selectable>
        {title}
      </Text>
      {description ? (
        <Text className="text-center text-sm leading-5 text-app-muted" selectable>
          {description}
        </Text>
      ) : null}
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-12 flex-row items-center gap-2 rounded-2xl bg-[#111111] px-6 active:opacity-75"
          onPress={onRetry}
        >
          <AppIcon color={colors.white} name="refresh" size={19} />
          <Text className="font-semibold text-white">{t("common.retry")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Quiet banner for stale or offline data. Announced politely, never blocking. */
export function OfflineBanner({ message }: { message?: string }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-2.5 rounded-2xl bg-app-surface px-4 py-3"
    >
      <AppIcon color={colors.muted} name="warning" size={18} />
      <Text className="min-w-0 flex-1 text-[13px] leading-[18px] text-app-muted" selectable>
        {message ?? t("dashboard.offlineData")}
      </Text>
    </View>
  );
}

/** Inline result message. `tone` carries meaning through icon and text, not colour alone. */
export function InlineNotice({
  message,
  tone = "info",
}: {
  message: string;
  tone?: "info" | "success" | "error";
}) {
  const icon: AppIconName = tone === "error" ? "warning" : tone === "success" ? "checkCircle" : "info";
  const color = tone === "error" ? colors.danger : tone === "success" ? colors.text : colors.muted;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === "error" ? "alert" : undefined}
      className="flex-row items-start gap-2 px-1"
    >
      <View className="pt-0.5">
        <AppIcon color={color} name={icon} size={16} />
      </View>
      <Text
        className={
          tone === "error"
            ? "min-w-0 flex-1 text-sm leading-5 text-app-error"
            : "min-w-0 flex-1 text-sm leading-5 text-app-muted"
        }
        selectable
      >
        {message}
      </Text>
    </View>
  );
}
