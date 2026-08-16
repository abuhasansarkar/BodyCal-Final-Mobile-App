import { useLocalSearchParams } from "expo-router";
import React from "react";

import { ScanResultScreen } from "@/screens/scan-result-screen";

export default function ScanResultRoute() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  return <ScanResultScreen scanId={scanId} />;
}
