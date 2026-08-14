import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { NutritionDetail } from "@/components/nutrition-detail";
import { NutritionSummary } from "@/components/nutrition-summary";
import { PrimaryButton } from "@/components/primary-button";
import { SectionCard, SectionHeader, ScreenTitle } from "@/components/ui/section-card";
import { EmptyState, InlineNotice } from "@/components/ui/states";
import { nutritionEstimateSchema } from "@/domain/schemas";
import { Image } from "@/tw/image";
import { Text, View } from "@/tw";

const CONFIDENCE_KEY = {
  low: "scan.confidenceLow",
  medium: "scan.confidenceMedium",
  high: "scan.confidenceHigh",
} as const;

export default function ScanResultRoute() {
  const { t } = useTranslation();
  const { uri, estimate: rawEstimate, scanId } = useLocalSearchParams<{
    uri: string;
    estimate?: string;
    scanId?: string;
  }>();

  let estimate: ReturnType<typeof nutritionEstimateSchema.parse> | null = null;
  try {
    estimate = nutritionEstimateSchema.parse(JSON.parse(rawEstimate ?? "null"));
  } catch {
    estimate = null;
  }

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
      <Image
        accessibilityLabel={estimate.mealName}
        className="h-52 w-full rounded-3xl bg-app-surface"
        contentFit="cover"
        source={{ uri }}
      />

      <ScreenTitle description={t(CONFIDENCE_KEY[estimate.confidence])} title={estimate.mealName} />

      <NutritionSummary {...estimate.nutrition} />

      <NutritionDetail nutrition={estimate.nutrition} />

      <SectionCard>
        <View className="gap-2.5">
          <SectionHeader icon="analysis" title={t("scan.componentsTitle")} />
          {estimate.components.map((component) => (
            <Text
              className="text-sm text-app-text"
              key={`${component.name}-${component.portion}`}
              selectable
            >
              {component.name} · {component.portion}
            </Text>
          ))}
        </View>
      </SectionCard>

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

      <PrimaryButton
        icon="edit"
        label={t("scan.reviewAndAdd")}
        onPress={() =>
          router.push({ pathname: "/(app)/scan/edit", params: { estimate: rawEstimate, scanId } })
        }
      />
      <PrimaryButton
        icon="refresh"
        label={t("scan.retake")}
        onPress={() => router.replace("/(app)/scan/camera")}
      />
    </AppScreen>
  );
}
