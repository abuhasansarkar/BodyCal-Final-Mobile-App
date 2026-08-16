import { useLocalSearchParams } from "expo-router";
import React from "react";

import { ScanEditScreen } from "@/screens/scan-edit-screen";

export default function EditScanRoute() {
  const { scanId } = useLocalSearchParams<{ scanId?: string }>();
  return <ScanEditScreen scanId={scanId} />;
}
