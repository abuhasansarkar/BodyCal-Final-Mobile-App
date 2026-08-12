import { Link } from "expo-router";
import React from "react";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { curatedFoods } from "@/features/food/catalog";
import { Pressable, Text, TextInput, View } from "@/tw";

export default function SearchFoodRoute() {
  const [query, setQuery] = React.useState("");
  const results = curatedFoods.filter((food) => food.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <AppScreen>
      <View className="min-h-12 flex-row items-center gap-2 rounded-2xl border border-app-border px-4">
        <AppIcon color="#737373" name="search" size={20} />
        <TextInput accessibilityLabel="Search foods" className="min-h-12 min-w-0 flex-1 text-app-text" placeholder="Search curated, recent, and custom foods" value={query} onChangeText={setQuery} />
        {query ? <Pressable accessibilityLabel="Clear search" accessibilityRole="button" className="h-11 w-11 items-center justify-center" onPress={() => setQuery("")}><AppIcon color="#737373" name="close" size={18} /></Pressable> : null}
      </View>
      {results.map((food) => <Link key={food.id} href={{ pathname: "/(app)/food/[id]", params: { id: food.id } }} asChild><View className="min-h-[68px] flex-row items-center gap-3 rounded-2xl border border-app-border p-4"><AppIcon name="foods" size={21} /><View className="min-w-0 flex-1 gap-1"><Text className="font-semibold text-app-text">{food.title}</Text><Text className="text-app-muted">{food.calories} kcal · {food.serving}</Text></View><AppIcon color="#737373" name="chevronRight" size={18} /></View></Link>)}
      {results.length === 0 ? <Text className="text-app-muted">No matching food. You can add it manually.</Text> : null}
      <Link href="/(app)/food/manual" asChild><Pressable className="min-h-11 flex-row items-center gap-2"><AppIcon color="#2563EB" name="add" size={19} weight="semibold" /><Text className="text-app-accent">Add manually</Text></Pressable></Link>
    </AppScreen>
  );
}
