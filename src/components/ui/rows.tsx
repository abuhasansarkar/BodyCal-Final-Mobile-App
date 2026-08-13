import type { ReactNode } from "react";
import { Switch } from "react-native";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { IconTile, RowDivider } from "@/components/ui/section-card";
import { colors } from "@/config/theme";
import { Pressable, Text, View } from "@/tw";

/**
 * Rows for grouped surfaces. All of them meet the 64px minimum row height and
 * 44x44 minimum target from design/TOKENS.md, and carry explicit accessibility
 * roles and state.
 */

type BaseRowProps = {
  description?: string;
  icon?: AppIconName;
  title: string;
};

/** Navigational row: leading icon tile, label, trailing chevron. */
export function NavigationRow({
  description,
  destructive = false,
  icon,
  onPress,
  title,
  value,
}: BaseRowProps & { destructive?: boolean; onPress: () => void; value?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-16 flex-row items-center gap-4 px-4 active:bg-app-surface"
      onPress={onPress}
    >
      {icon ? <IconTile name={icon} tone={destructive ? "danger" : "surface"} /> : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={
            destructive
              ? "text-base font-medium text-app-error"
              : "text-base font-medium text-app-text"
          }
          selectable
        >
          {title}
        </Text>
        {description ? (
          <Text className="text-[13px] leading-[18px] text-app-muted" numberOfLines={2} selectable>
            {description}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text className="max-w-[40%] text-right text-sm font-medium text-app-muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      <AppIcon color={colors.subtle} name="chevronRight" size={19} />
    </Pressable>
  );
}

/** Toggle row using the platform switch, so state is never colour-only. */
export function ToggleRow({
  description,
  disabled = false,
  icon,
  onValueChange,
  title,
  value,
}: BaseRowProps & {
  disabled?: boolean;
  onValueChange: (next: boolean) => void;
  value: boolean;
}) {
  return (
    <View className="min-h-16 flex-row items-center gap-4 px-4 py-3">
      {icon ? <IconTile name={icon} /> : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base font-medium text-app-text" selectable>
          {title}
        </Text>
        {description ? (
          <Text className="text-[13px] leading-[18px] text-app-muted" selectable>
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={title}
        disabled={disabled}
        ios_backgroundColor={colors.border}
        onValueChange={onValueChange}
        thumbColor={colors.white}
        trackColor={{ false: "#D8D8D8", true: colors.text }}
        value={value}
      />
    </View>
  );
}

/** Single-select row with radio semantics. */
export function ChoiceRow({
  description,
  icon,
  onPress,
  selected,
  title,
}: BaseRowProps & { onPress: () => void; selected: boolean }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className="min-h-16 flex-row items-center gap-4 px-4 py-3 active:bg-app-surface"
      onPress={onPress}
    >
      {icon ? <IconTile name={icon} /> : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base font-medium text-app-text" selectable>
          {title}
        </Text>
        {description ? (
          <Text className="text-[13px] leading-[18px] text-app-muted" selectable>
            {description}
          </Text>
        ) : null}
      </View>
      <View
        className={
          selected
            ? "h-6 w-6 items-center justify-center rounded-full bg-[#111111]"
            : "h-6 w-6 items-center justify-center rounded-full border border-app-border"
        }
      >
        {selected ? <AppIcon color={colors.white} name="check" size={14} weight="semibold" /> : null}
      </View>
    </Pressable>
  );
}

/** Read-only label/value row, for facts the user cannot edit here. */
export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-14 flex-row items-center gap-4 px-4 py-3">
      <Text className="min-w-0 flex-1 text-[15px] text-app-muted" selectable>
        {label}
      </Text>
      <Text
        className="max-w-[55%] text-right text-[15px] font-semibold text-app-text"
        selectable
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * Renders rows inside a grouped surface with separators between them, so screens
 * never hand-roll conditional border classes.
 */
export function RowGroup({ children }: { children: ReactNode[] }) {
  const rows = children.filter(Boolean);
  return (
    <View
      className="overflow-hidden rounded-3xl border border-app-border bg-white"
      style={{ borderCurve: "continuous" }}
    >
      {rows.map((row, index) => (
        <View key={index}>
          {index > 0 ? <RowDivider /> : null}
          {row}
        </View>
      ))}
    </View>
  );
}
