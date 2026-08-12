import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Text, View } from "@/tw";
import type { NutritionValues } from "@/types/domain";

function MacroValue({ color, icon, label, value }: { color: string; icon: AppIconName; label: string; value: number }) {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <View className="flex-row items-center gap-1.5">
        <AppIcon color={color} name={icon} size={16} weight="semibold" />
        <Text className="text-sm font-medium text-app-text" selectable>{label}</Text>
      </View>
      <Text className="text-base font-semibold text-app-text" selectable>{value}g</Text>
    </View>
  );
}

export function NutritionSummary({ calories, carbsGrams, fatGrams, proteinGrams }: NutritionValues) {
  return (
    <View className="gap-3 rounded-3xl border border-app-border bg-app-surface p-5">
      <View className="flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#FFF3E6]"><AppIcon color="#F97316" name="calories" size={23} weight="semibold" /></View>
        <Text className="text-3xl font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>{calories.toLocaleString()} kcal</Text>
      </View>
      <View className="flex-row justify-between gap-3">
        <MacroValue color="#2F80ED" icon="protein" label="Protein" value={proteinGrams} />
        <MacroValue color="#F97316" icon="carbs" label="Carbs" value={carbsGrams} />
        <MacroValue color="#8B5CF6" icon="fat" label="Fat" value={fatGrams} />
      </View>
    </View>
  );
}
