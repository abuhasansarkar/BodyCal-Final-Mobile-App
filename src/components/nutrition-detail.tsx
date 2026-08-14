import { useTranslation } from "react-i18next";

import { SectionCard, SectionHeader } from "@/components/ui/section-card";
import { Text, View } from "@/tw";
import type { EstimateNutrition } from "@/types/domain";

type Row = { key: string; label: string; value: number | null | undefined; unit: "g" | "mg" };

/**
 * The nutrition an AI estimate reports beyond the four values that drive the
 * day's totals.
 *
 * Every row is rendered even when the provider could not judge it, because a row
 * that appears on one scan and vanishes on the next reads as a bug rather than
 * as missing information. An unjudged value shows an em dash and announces as
 * "not estimated" — never as zero, which would be a measurement claim.
 */
export function NutritionDetail({ nutrition }: { nutrition: EstimateNutrition }) {
  const { i18n, t } = useTranslation();
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 });

  const rows: Row[] = [
    { key: "saturatedFat", label: t("scan.saturatedFat"), value: nutrition.saturatedFatGrams, unit: "g" },
    { key: "fiber", label: t("scan.fiber"), value: nutrition.fiberGrams, unit: "g" },
    { key: "sugar", label: t("scan.sugar"), value: nutrition.sugarGrams, unit: "g" },
    { key: "sodium", label: t("scan.sodium"), value: nutrition.sodiumMilligrams, unit: "mg" },
  ];

  // Nothing to show at all: an older estimate, or a photo the model could read
  // for calories but not for anything else.
  if (rows.every((row) => row.value == null)) return null;

  return (
    <SectionCard>
      <View className="gap-1">
        <SectionHeader icon="nutrition" title={t("scan.detailTitle")} />
        {rows.map((row) => {
          const known = row.value != null;
          const formatted = known
            ? t(row.unit === "g" ? "scan.gramsValue" : "scan.milligramsValue", {
                value: number.format(row.value as number),
              })
            : t("scan.notEstimated");
          return (
            <View
              accessibilityLabel={`${row.label}: ${formatted}`}
              accessible
              className="min-h-11 flex-row items-center justify-between gap-3 border-b border-app-border py-2.5 last:border-b-0"
              key={row.key}
            >
              <Text className="min-w-0 flex-1 text-sm text-app-text" selectable>
                {row.label}
              </Text>
              <Text
                className={known ? "text-sm font-semibold text-app-text" : "text-sm text-app-muted"}
                selectable
                style={known ? { fontVariant: ["tabular-nums"] } : undefined}
              >
                {known ? formatted : "—"}
              </Text>
            </View>
          );
        })}
      </View>
    </SectionCard>
  );
}
