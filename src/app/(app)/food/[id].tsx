import { useLocalSearchParams } from "expo-router";

import { AppScreen } from "@/components/app-screen";
import { NutritionSummary } from "@/components/nutrition-summary";
import { PrimaryButton } from "@/components/primary-button";
import { curatedFoods } from "@/features/food/catalog";
import { Text } from "@/tw";

export default function FoodDetailRoute() { const { id } = useLocalSearchParams<{ id: string }>(); const food = curatedFoods.find((item) => item.id === id); if (!food) return <AppScreen><Text className="text-app-error">Food not found.</Text></AppScreen>; return <AppScreen><Text className="text-3xl font-bold text-app-text">{food.title}</Text><Text className="text-base leading-6 text-app-muted">{food.description}</Text><NutritionSummary {...food} /><Text className="text-sm text-app-muted">Serving: {food.serving}. Nutrition is approximate.</Text><PrimaryButton icon="add" label="Add to Today" onPress={() => undefined} /></AppScreen>; }
