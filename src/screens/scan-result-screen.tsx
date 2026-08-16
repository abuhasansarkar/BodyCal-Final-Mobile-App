import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { DetectedFoodList } from "@/components/detected-food-list";
import { NutritionBreakdownCard } from "@/components/nutrition-breakdown-card";
import { NutritionDetail } from "@/components/nutrition-detail";
import { PrimaryButton } from "@/components/primary-button";
import { ScreenTitle, SectionCard, SectionHeader } from "@/components/ui/section-card";
import { EmptyState, InlineNotice, ScreenSkeleton } from "@/components/ui/states";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Image } from "@/tw/image";
import { Text, View } from "@/tw";
import type { Id } from "../../convex/_generated/dataModel";

const CONFIDENCE_KEY = {
  low: "scan.confidenceLow",
  medium: "scan.confidenceMedium",
  high: "scan.confidenceHigh",
} as const;

export function ScanResultScreen({ scanId }: { scanId?: string }) {
  const { i18n, t } = useTranslation();

  const scan = useQuery(
    api.aiDb.getScan,
    scanId ? { scanId: scanId as Id<"aiScans"> } : "skip",
  );
  const goal = useQuery(api.nutritionGoals.getActive, { localDate: currentLocalDate() });

  if (scanId && scan === undefined) {
    return (
      <AppScreen>
        <ScreenSkeleton />
      </AppScreen>
    );
  }

  const estimate = scan?.estimate ?? null;
  const number = new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 0 });

  const subtitle = estimate
    ? [
        estimate.confidence ? t(CONFIDENCE_KEY[estimate.confidence]) : null,
        estimate.calorieRange
          ? t("scan.calorieRange", {
              max: number.format(estimate.calorieRange.maxCalories),
              min: number.format(estimate.calorieRange.minCalories),
            })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  if (!estimate) {
    return (
      <AppScreen>
        <EmptyState
          description={t("scan.noEstimateDescription")}
          icon="analysis"
          title={t("scan.noEstimateTitle")}
        />
        <PrimaryButton
          icon="edit"
          label={t("scan.manualAction")}
          onPress={() => router.replace("/(app)/food/manual")}
        />
        <PrimaryButton
          icon="refresh"
          label={t("scan.retake")}
          onPress={() => router.replace("/(app)/scan/camera")}
        />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      {scan?.imageUrl ? (
        <Image
          accessibilityLabel={estimate.mealName}
          className="h-52 w-full rounded-3xl bg-app-surface"
          contentFit="cover"
          source={{ uri: scan.imageUrl }}
        />
      ) : null}

      <ScreenTitle description={subtitle || undefined} title={estimate.mealName} />

      <NutritionBreakdownCard {...estimate.nutrition} goalCalories={goal?.calories} />

      <NutritionDetail nutrition={estimate.nutrition} />

      <View className="gap-3">
        <SectionHeader icon="analysis" title={t("scan.componentsTitle")} />
        <DetectedFoodList foods={estimate.components} totalCalories={estimate.nutrition.calories} />
      </View>

      {estimate.assumptions.length > 0 ? (
        <SectionCard>
          <View className="gap-2">
            <SectionHeader icon="info" title={t("scan.assumptionsTitle")} />
            {estimate.assumptions.map((assumption) => (
              <Text className="text-sm leading-5 text-app-muted" key={assumption} selectable>
                {assumption}
              </Text>
            ))}
          </View>
        </SectionCard>
      ) : null}

      {estimate.warnings.length > 0 ? (
        <SectionCard>
          <View className="gap-2">
            <SectionHeader icon="warning" title={t("scan.warningsTitle")} />
            {estimate.warnings.map((warning) => (
              <Text className="text-sm leading-5 text-app-muted" key={warning} selectable>
                {warning}
              </Text>
            ))}
          </View>
        </SectionCard>
      ) : null}

      <InlineNotice message={t("nutritionTargets.estimateNote")} />
      {estimate.confidence === "low" ? <InlineNotice message={t("scan.portionUncertain")} /> : null}

      <PrimaryButton
        icon="edit"
        label={t("scan.reviewAndAdd")}
        onPress={() => router.push({ pathname: "/(app)/scan/edit", params: { scanId } })}
      />
      <PrimaryButton
        icon="refresh"
        label={t("scan.retake")}
        onPress={() => router.replace("/(app)/scan/camera")}
      />
    </AppScreen>
  );
}
