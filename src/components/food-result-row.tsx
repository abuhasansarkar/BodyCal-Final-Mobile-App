import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { colors } from "@/config/theme";
import { Pressable, Text, View } from "@/tw";

/**
 * One food result. Shared by search, the catalog list and the recents list so all
 * three keep the same row height, hit target and typography.
 */
export function FoodResultRow({
  calories,
  onPress,
  serving,
  title,
  trailing,
}: {
  calories: number;
  onPress: () => void;
  serving: string;
  title: string;
  /** Optional action rendered instead of the chevron, e.g. favourite or delete. */
  trailing?: ReactNode;
}) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });

  return (
    <Pressable
      accessibilityLabel={`${title}, ${t("dashboard.logCalories", { calories: number.format(calories) })}`}
      accessibilityRole="button"
      className="min-h-[68px] flex-row items-center gap-3 rounded-2xl border border-app-border bg-white p-4 active:bg-app-surface"
      onPress={onPress}
      style={{ borderCurve: "continuous" }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-app-surface">
        <AppIcon color={colors.text} name="foods" size={20} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base font-semibold text-app-text" numberOfLines={1} selectable>
          {title}
        </Text>
        <Text className="text-[13px] text-app-muted" numberOfLines={1} selectable>
          {serving}
        </Text>
      </View>
      <Text
        className="text-sm font-bold text-app-text"
        selectable
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {number.format(calories)}
      </Text>
      {trailing ?? <AppIcon color={colors.subtle} name="chevronRight" size={18} />}
    </Pressable>
  );
}
