import { useLocalSearchParams } from "expo-router";
import React from "react";

import { FoodDetailScreen } from "@/screens/food-detail-screen";

export default function FoodDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <FoodDetailScreen id={id} />;
}
