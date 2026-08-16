import { useLocalSearchParams } from "expo-router";
import React from "react";

import { WeightAddScreen } from "@/screens/weight-add-screen";

export default function AddWeightRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <WeightAddScreen id={id} />;
}
