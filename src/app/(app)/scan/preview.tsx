import { useLocalSearchParams } from "expo-router";
import React from "react";

import { ScanPreviewScreen } from "@/screens/scan-preview-screen";

export default function PreviewRoute() {
  const params = useLocalSearchParams<{ uri?: string; width?: string; height?: string }>();
  return <ScanPreviewScreen height={params.height} uri={params.uri} width={params.width} />;
}
