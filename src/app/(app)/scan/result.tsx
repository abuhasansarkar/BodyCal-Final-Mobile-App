import { router, useLocalSearchParams } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { NutritionSummary } from "@/components/nutrition-summary";
import { PrimaryButton } from "@/components/primary-button";
import { nutritionEstimateSchema } from "@/domain/schemas";
import { Text } from "@/tw";
import { Image } from "@/tw/image";

export default function ScanResultRoute() {
  const { uri, estimate: rawEstimate, scanId } = useLocalSearchParams<{ uri: string; estimate?: string; scanId?: string }>();
  let estimate;
  try { estimate = nutritionEstimateSchema.parse(JSON.parse(rawEstimate ?? "null")); } catch { estimate = null; }
  if (!estimate) return <AppScreen><Text className="text-3xl font-bold text-app-text">No estimate available</Text><Image className="h-52 w-full rounded-3xl object-cover" source={{ uri }} /><PrimaryButton icon="edit" label="Enter nutrition manually" onPress={() => router.replace("/(app)/food/manual")} /><PrimaryButton icon="refresh" label="Retake" onPress={() => router.replace("/(app)/scan/camera")} /></AppScreen>;
  return <AppScreen><Text className="text-3xl font-bold text-app-text">{estimate.mealName}</Text><Text className="text-sm text-app-muted">Estimated · {estimate.confidence} confidence</Text><Image className="h-52 w-full rounded-3xl object-cover" source={{ uri }} /><NutritionSummary {...estimate.nutrition} />{estimate.components.map((component) => <Text key={`${component.name}-${component.portion}`} className="text-app-text">{component.name} · {component.portion}</Text>)}{estimate.warnings.map((warning) => <Text key={warning} className="text-sm text-app-muted">{warning}</Text>)}<PrimaryButton icon="edit" label="Review and add" onPress={() => router.push({ pathname: "/(app)/scan/edit", params: { estimate: rawEstimate, scanId } })} /><PrimaryButton icon="refresh" label="Retake" onPress={() => router.replace("/(app)/scan/camera")} /></AppScreen>;
}
