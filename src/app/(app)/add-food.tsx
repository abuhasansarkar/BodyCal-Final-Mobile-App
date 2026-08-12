import { Link } from "expo-router";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { Pressable, Text, View } from "@/tw";

const methods: { href: "/(app)/scan/camera" | "/(app)/food/search" | "/(app)/food/manual"; icon: AppIconName; subtitle?: string; title: string }[] = [
  { href: "/(app)/scan/camera", icon: "scan", title: "Scan with AI", subtitle: "Pro" },
  { href: "/(app)/food/search", icon: "search", title: "Search foods" },
  { href: "/(app)/food/manual", icon: "add", title: "Add manually" },
];

export default function AddFoodRoute() {
  return (
    <AppScreen>
      <Text className="text-2xl font-bold text-app-text">How would you like to log?</Text>
      <View className="gap-3">
        {methods.map((method) => (
          <Link key={method.href} href={method.href} asChild>
            <Pressable className="min-h-[72px] flex-row items-center gap-3 rounded-2xl border border-app-border p-4">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name={method.icon} size={22} weight="semibold" /></View>
              <View className="min-w-0 flex-1"><Text className="text-base font-semibold text-app-text">{method.title}</Text>{method.subtitle ? <Text className="text-sm text-app-muted">{method.subtitle}</Text> : null}</View>
              <AppIcon color="#737373" name="chevronRight" size={20} />
            </Pressable>
          </Link>
        ))}
      </View>
    </AppScreen>
  );
}
