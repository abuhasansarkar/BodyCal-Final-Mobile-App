import { useLocalSearchParams } from "expo-router";
import React from "react";

import { ScanAnalyzingScreen } from "@/screens/scan-analyzing-screen";

export default function AnalyzingRoute() {
  const { uri, scanId } = useLocalSearchParams<{ uri?: string; scanId?: string }>();
  return <ScanAnalyzingScreen scanId={scanId} uri={uri} />;
}
