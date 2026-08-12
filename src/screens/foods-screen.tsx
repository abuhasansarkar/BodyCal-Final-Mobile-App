import { Link } from "expo-router";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { curatedFoods } from "@/features/food/catalog";
import { Text, View } from "@/tw";

export function FoodsScreen() {
  return (
    <AppScreen>
      <Text className="text-3xl font-bold text-app-text">Foods for your goal</Text>
      <Text className="text-base text-app-muted">Curated ideas, not medical dietary prescriptions.</Text>
      {curatedFoods.map((food) => (
        <Link key={food.id} href={{ pathname: "/(app)/food/[id]", params: { id: food.id } }} asChild>
          <View className="min-h-[82px] flex-row items-center gap-3 rounded-3xl border border-app-border bg-app-surface p-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name="foods" size={22} /></View>
            <View className="min-w-0 flex-1 gap-1"><Text className="text-lg font-semibold text-app-text">{food.title}</Text><Text className="text-sm text-app-muted">≈ {food.calories} kcal · {food.proteinGrams}g protein</Text></View>
            <AppIcon color="#737373" name="chevronRight" size={20} />
          </View>
        </Link>
      ))}
    </AppScreen>
  );
}
