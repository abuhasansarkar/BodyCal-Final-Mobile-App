import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { SectionCard } from "@/components/ui/section-card";
import { colors } from "@/config/theme";
import { ingredientIcon } from "@/lib/ingredient-icon";
import { Text, View } from "@/tw";

export type DetectedFood = {
  name: string;
  preparation: string | null;
  portion: string;
  estimatedWeightGrams: number | null;
  nutrition: { calories: number } | null;
};

/**
 * Every food the scan identified, one row each, with the meal total underneath.
 *
 * The per-item rows are what make a meal estimate checkable: a total of 940 kcal
 * is impossible to sanity-check, but "chips, 180 g, 520 kcal" is something a
 * person can immediately agree or disagree with — and disagreeing is the point,
 * since the numbers stay editable.
 *
 * A row whose per-item nutrition is missing still appears with its portion. That
 * happens for scans recorded before per-item nutrition existed, and a food
 * silently vanishing from its own meal would be worse than a row without a
 * number.
 */
export function DetectedFoodList({
  foods,
  totalCalories,
}: {
  foods: DetectedFood[];
  totalCalories: number;
}) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });

  if (foods.length === 0) return null;

  return (
    <SectionCard padded={false}>
      <View className="px-5 py-2">
        {foods.map((food, index) => {
          // Prefer the weight, which is comparable across foods; fall back to
          // the portion the model described when it could not judge grams.
          const measure =
            food.estimatedWeightGrams != null
              ? t("scan.gramsValue", { value: number.format(food.estimatedWeightGrams) })
              : food.portion;
          const energy =
            food.nutrition != null
              ? t("scan.kcalValue", { value: number.format(food.nutrition.calories) })
              : null;
          const detail = [food.preparation, measure].filter(Boolean).join(" · ");

          return (
            <View
              accessibilityLabel={[food.name, detail, energy].filter(Boolean).join(", ")}
              accessible
              className="min-h-11 flex-row items-center gap-3 border-b border-app-border py-3 last:border-b-0"
              key={`${food.name}-${index}`}
            >
              <AppIcon color={colors.muted} name={ingredientIcon(food.name)} size={19} />
              <View className="min-w-0 flex-1">
                <Text className="text-[15px] font-medium text-app-text" selectable>
                  {food.name}
                </Text>
                {detail ? (
                  <Text className="text-[13px] text-app-muted" selectable>
                    {detail}
                  </Text>
                ) : null}
              </View>
              {energy ? (
                <Text
                  className="shrink-0 text-[15px] font-semibold text-app-text"
                  selectable
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {energy}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View
        accessibilityLabel={`${t("scan.mealTotal")}, ${t("scan.kcalValue", { value: number.format(totalCalories) })}`}
        accessible
        className="min-h-11 flex-row items-center justify-between gap-3 border-t border-app-border bg-app-surface px-5 py-3"
      >
        <Text className="min-w-0 flex-1 text-[15px] font-bold text-app-text" selectable>
          {t("scan.mealTotal")}
        </Text>
        <Text
          className="shrink-0 text-[15px] font-bold text-app-text"
          selectable
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {t("scan.kcalValue", { value: number.format(totalCalories) })}
        </Text>
      </View>
    </SectionCard>
  );
}
