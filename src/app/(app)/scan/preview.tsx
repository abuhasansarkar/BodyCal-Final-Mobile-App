import { router, useLocalSearchParams } from "expo-router";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { prepareMealImage } from "@/features/scan/prepare-image";
import { Image } from "@/tw/image";
import { Text } from "@/tw";

export default function PreviewRoute() {
  const params = useLocalSearchParams<{ uri: string; width?: string; height?: string }>();
  const [error, setError] = React.useState<string | null>(null);
  const analyze = async () => { try { const image = await prepareMealImage({ uri: params.uri, width: Number(params.width) || undefined, height: Number(params.height) || undefined }); router.replace({ pathname: "/(app)/scan/analyzing", params: { uri: image.uri } }); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to prepare image."); } };
  return <AppScreen><Text className="text-2xl font-bold text-app-text">Use this photo?</Text><Image className="h-96 w-full rounded-3xl object-cover" source={{ uri: params.uri }} />{error ? <Text className="text-app-error">{error}</Text> : null}<PrimaryButton icon="analysis" label="Analyze meal" onPress={() => void analyze()} /><PrimaryButton icon="refresh" label="Retake" onPress={() => router.back()} /></AppScreen>;
}
