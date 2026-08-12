import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { Image, Link, Pressable, Text, View } from "@/tw";

export type RecentUpload = {
  _id: string;
  foodName: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  localDate: string;
  createdAt: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  imageUrl: string | null;
};

export function DashboardRecentUploads({ items }: { items: RecentUpload[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage;
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const dateTime = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className="min-w-0 flex-1 text-xl font-bold text-app-text" selectable>{t("dashboard.recentlyUploaded")}</Text>
        <Link accessibilityRole="link" className="min-h-11 justify-center px-1 text-sm font-medium text-app-muted" href="/(app)/history">{t("dashboard.viewAll")}</Link>
      </View>

      {items.length === 0 ? (
        <Pressable
          accessibilityHint={t("dashboard.emptyRecentHint")}
          accessibilityLabel={t("dashboard.addFirstMeal")}
          accessibilityRole="button"
          className="min-h-32 flex-row items-center gap-4 rounded-3xl border border-dashed border-app-border bg-white p-4 active:opacity-75"
          onPress={() => router.push("/(app)/scan/camera")}
          style={{ borderCurve: "continuous" }}
        >
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-app-surface">
            <AppIcon name="add" size={28} weight="semibold" />
          </View>
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-base font-semibold text-app-text" selectable>{t("dashboard.addFirstMeal")}</Text>
            <Text className="text-sm leading-5 text-app-muted" selectable>{t("dashboard.emptyRecentHint")}</Text>
          </View>
          <AppIcon color="#737373" name="chevronRight" size={20} />
        </Pressable>
      ) : (
        <View className="overflow-hidden rounded-3xl border border-app-border bg-white" style={{ borderCurve: "continuous", boxShadow: "0 6px 24px rgba(0, 0, 0, 0.04)" }}>
          {items.map((item, index) => (
            <Pressable
              key={item._id}
              accessibilityLabel={`${item.foodName}, ${t("dashboard.logCalories", { calories: number.format(item.calories) })}`}
              accessibilityRole="button"
              className={index === items.length - 1 ? "min-h-24 flex-row items-center gap-3 p-3 active:bg-app-surface" : "min-h-24 flex-row items-center gap-3 border-b border-app-border p-3 active:bg-app-surface"}
              onPress={() => router.push({ pathname: "/(app)/food/log/[id]", params: { id: item._id } })}
            >
              {item.imageUrl ? (
                <Image
                  accessibilityLabel={t("dashboard.mealPhoto", { name: item.foodName })}
                  cachePolicy="memory"
                  className="h-[76px] w-[76px] rounded-2xl bg-app-surface"
                  contentFit="cover"
                  source={{ uri: item.imageUrl }}
                  transition={150}
                />
              ) : (
                <View accessibilityLabel={t("dashboard.noMealPhoto")} className="h-[76px] w-[76px] items-center justify-center rounded-2xl bg-app-surface">
                  <AppIcon color="#737373" name="foods" size={28} />
                </View>
              )}
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-semibold text-app-text" numberOfLines={1} selectable>{item.foodName}</Text>
                <Text className="text-xs text-app-muted" numberOfLines={1} selectable>{dateTime.format(new Date(item.createdAt))}</Text>
                <Text className="text-xs text-app-muted" numberOfLines={1} selectable>
                  {t("dashboard.recentNutrition", {
                    protein: number.format(item.proteinGrams),
                    carbs: number.format(item.carbsGrams),
                    fat: number.format(item.fatGrams),
                  })}
                </Text>
              </View>
              <View className="items-end gap-2">
                <Text className="text-sm font-bold text-app-text" selectable style={{ fontVariant: ["tabular-nums"] }}>{number.format(item.calories)}</Text>
                <Text className="text-xs text-app-muted" selectable>{t("dashboard.kcal")}</Text>
              </View>
              <AppIcon color="#737373" name="chevronRight" size={18} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
