import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { macroColors } from "@/config/theme";
import { Text, View } from "@/tw";
import type { NutritionValues } from "@/types/domain";

function MacroValue({
  color,
  icon,
  label,
  value,
}: {
  color: string;
  icon: AppIconName;
  label: string;
  value: number;
}) {
  return (
    <View accessibilityLabel={`${label} ${value}`} className="min-w-0 flex-1 gap-1">
      <View className="flex-row items-center gap-1.5">
        <AppIcon color={color} name={icon} size={16} weight="semibold" />
        <Text className="text-sm font-medium text-app-text" numberOfLines={1} selectable>
          {label}
        </Text>
      </View>
      <Text
        className="text-base font-semibold text-app-text"
        selectable
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}g
      </Text>
    </View>
  );
}

/** Calories and macro breakdown. Labels and number formatting follow the active locale. */
export function NutritionSummary({ calories, carbsGrams, fatGrams, proteinGrams }: NutritionValues) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });

  return (
    <View className="gap-3 rounded-3xl border border-app-border bg-app-surface p-5">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#FFF3E6]">
          <AppIcon color={macroColors.carbs} name="calories" size={23} weight="semibold" />
        </View>
        <Text
          className="text-3xl font-bold text-app-text"
          selectable
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {t("dashboard.logCalories", { calories: number.format(calories) })}
        </Text>
      </View>
      <View className="flex-row justify-between gap-3">
        <MacroValue
          color={macroColors.protein}
          icon="protein"
          label={t("onboarding.result.protein")}
          value={proteinGrams}
        />
        <MacroValue
          color={macroColors.carbs}
          icon="carbs"
          label={t("onboarding.result.carbs")}
          value={carbsGrams}
        />
        <MacroValue
          color={macroColors.fat}
          icon="fat"
          label={t("onboarding.result.fat")}
          value={fatGrams}
        />
      </View>
    </View>
  );
}
