import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ProgressRing } from "@/components/progress-ring";
import { colors, macroColors, shadows } from "@/config/theme";
import { Text, View } from "@/tw";
import type { NutritionValues } from "@/types/domain";

/** Energy each macro contributes, using the Atwater factors the app calculates targets with. */
const energyPerGram = { protein: 4, carbs: 4, fat: 9 } as const;

const ringSize = 78;

type MacroKey = keyof typeof energyPerGram;

/**
 * One macro line: colour key, grams, the share of the meal's energy it carries,
 * and a bar of that share.
 *
 * The share is measured against the energy of the three macros rather than
 * against the stated calorie figure, so the three bars always describe one whole
 * and never sum to something other than 100%.
 */
function MacroRow({ color, grams, label, share }: { color: string; grams: number; label: string; share: number }) {
  const { t } = useTranslation();
  const percent = Math.round(share);

  return (
    <View
      accessibilityLabel={t("nutritionBreakdown.macroSummary", { grams, label, percent })}
      accessible
      className="gap-1.5"
    >
      <View className="flex-row items-center gap-2">
        <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <Text className="min-w-0 flex-1 text-[13px] font-medium text-app-muted" numberOfLines={1}>
          {label}
        </Text>
        <Text
          className="shrink-0 text-[15px] font-bold text-app-text"
          numberOfLines={1}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {t("nutritionBreakdown.gramsValue", { grams })}
        </Text>
        <Text
          className="shrink-0 text-[13px] font-medium text-app-muted"
          numberOfLines={1}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {t("nutritionBreakdown.percentOfEnergy", { percent })}
        </Text>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-app-surface">
        <View
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${Math.min(100, Math.max(0, share))}%` }}
        />
      </View>
    </View>
  );
}

/**
 * The calorie figure, what it costs against a day's target, and the macro split
 * behind it.
 *
 * Shared by the catalog food detail and the logged-entry detail so a meal reads
 * the same before and after it is logged. Every value is either passed in or
 * derived from the four macros — nothing here estimates anything on its own.
 *
 * `goalCalories` is optional because the ring is only meaningful once a target
 * exists: a share of nothing is not a percentage, and rendering `0%` or an empty
 * ring would read as "this meal is free".
 */
export function NutritionBreakdownCard({
  calories,
  caption,
  carbsGrams,
  fatGrams,
  footer,
  goalCalories,
  proteinGrams,
}: NutritionValues & {
  caption?: string;
  footer?: ReactNode;
  goalCalories?: number | null;
}) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });

  const macros: { color: string; grams: number; key: MacroKey; label: string }[] = [
    { color: macroColors.protein, grams: proteinGrams, key: "protein", label: t("dashboard.protein") },
    { color: macroColors.carbs, grams: carbsGrams, key: "carbs", label: t("dashboard.carbs") },
    { color: macroColors.fat, grams: fatGrams, key: "fat", label: t("dashboard.fat") },
  ];
  const macroEnergy = macros.reduce((total, macro) => total + macro.grams * energyPerGram[macro.key], 0);

  const goalShare = goalCalories && goalCalories > 0 ? (calories / goalCalories) * 100 : null;

  return (
    <View
      className="gap-4 rounded-3xl border border-app-border bg-white p-4"
      style={{ borderCurve: "continuous", boxShadow: shadows.card }}
    >
      <View className="flex-row items-center gap-4">
        <View className="min-w-0 flex-1 gap-0.5">
          <View className="flex-row items-baseline gap-1.5">
            <Text
              className="text-[36px] font-bold leading-10.5 tracking-[-1px] text-app-text"
              selectable
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {number.format(calories)}
            </Text>
            <Text className="text-[15px] font-semibold text-app-muted">{t("dashboard.kcal")}</Text>
          </View>
          {caption ? (
            <Text className="text-[13px] text-app-muted" numberOfLines={2} selectable>
              {caption}
            </Text>
          ) : null}
        </View>

        {goalShare === null ? null : (
          <View
            accessibilityLabel={t("nutritionBreakdown.dailyGoalShare", { percent: Math.round(goalShare) })}
            accessibilityRole="progressbar"
            accessibilityValue={{ max: 100, min: 0, now: Math.round(Math.min(100, goalShare)) }}
          >
            <ProgressRing color={colors.text} size={ringSize} thickness={6} value={goalShare}>
              {/* Bounded to the ring's inner diameter: the ring's own child slot
                  is the full outer square, so an unconstrained label — "des
                  Tagesziels", say — would render straight over the stroke. */}
              <View className="items-center" style={{ width: ringSize - 20 }}>
                <Text
                  className="text-[16px] font-bold text-app-text"
                  numberOfLines={1}
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {t("nutritionBreakdown.percent", { percent: Math.round(goalShare) })}
                </Text>
                <Text className="text-center text-[10px] font-medium leading-2.75 text-app-muted" numberOfLines={2}>
                  {t("nutritionBreakdown.ofDailyGoal")}
                </Text>
              </View>
            </ProgressRing>
          </View>
        )}
      </View>

      <View className="h-px bg-app-border-soft" />

      <View className="gap-3">
        {macros.map((macro) => (
          <MacroRow
            color={macro.color}
            grams={macro.grams}
            key={macro.key}
            label={macro.label}
            share={macroEnergy > 0 ? ((macro.grams * energyPerGram[macro.key]) / macroEnergy) * 100 : 0}
          />
        ))}
      </View>

      {footer}
    </View>
  );
}
