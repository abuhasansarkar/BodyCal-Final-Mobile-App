import type { PropsWithChildren, ReactNode } from "react";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { colors, shadows } from "@/config/theme";
import { Text, View } from "@/tw";

/**
 * The grouped white surface used across settings, profile and detail screens:
 * 24px radius, hairline border, quiet shadow. Matches the "Settings groups" and
 * "Information card" patterns in design/TOKENS.md.
 */
export function SectionCard({
  children,
  className = "",
  padded = true,
}: PropsWithChildren<{ className?: string; padded?: boolean }>) {
  return (
    <View
      className={`overflow-hidden rounded-3xl border border-app-border bg-white ${padded ? "p-5" : ""} ${className}`}
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      {children}
    </View>
  );
}

/**
 * Section heading with optional supporting copy and a trailing action. Keeps
 * every screen on the same vertical rhythm instead of ad-hoc heading markup.
 */
export function SectionHeader({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  description?: string;
  icon?: AppIconName;
  title: string;
}) {
  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2.5">
        {icon ? <AppIcon name={icon} size={22} weight="semibold" /> : null}
        <Text
          accessibilityRole="header"
          className="min-w-0 flex-1 text-lg font-bold tracking-[-0.2px] text-app-text"
          selectable
        >
          {title}
        </Text>
        {action}
      </View>
      {description ? (
        <Text className="text-sm leading-5 text-app-muted" selectable>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

/** Screen title block. One per screen, above the first section. */
export function ScreenTitle({ description, title }: { description?: string; title: string }) {
  return (
    <View className="gap-1.5">
      <Text
        accessibilityRole="header"
        className="text-3xl font-bold tracking-[-0.6px] text-app-text"
        selectable
      >
        {title}
      </Text>
      {description ? (
        <Text className="text-[15px] leading-[21px] text-app-muted" selectable>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

/** Hairline separator matching the grouped-surface row divider. */
export function RowDivider() {
  return <View className="h-px bg-app-border-soft" />;
}

/** The 40px quiet icon tile that leads settings and list rows. */
export function IconTile({
  color = colors.text,
  name,
  size = 21,
  tone = "surface",
}: {
  color?: string;
  name: AppIconName;
  size?: number;
  tone?: "surface" | "danger";
}) {
  return (
    <View
      className={
        tone === "danger"
          ? "h-10 w-10 items-center justify-center rounded-xl bg-app-error-surface"
          : "h-10 w-10 items-center justify-center rounded-xl bg-app-surface"
      }
    >
      <AppIcon color={tone === "danger" ? colors.danger : color} name={name} size={size} />
    </View>
  );
}
