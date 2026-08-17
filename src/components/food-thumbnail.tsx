import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { ingredientIcon } from "@/lib/ingredient-icon";
import { Image, Text, View } from "@/tw";

type ThemeStyle = {
  bg: string;
  badgeBg: string;
  iconColor: string;
  icon: AppIconName;
  emoji: string;
};

function getDishTheme(name: string): ThemeStyle {
  const lower = name.toLowerCase();
  const icon = ingredientIcon(name);

  if (lower.includes("pancake") || lower.includes("waffle") || lower.includes("oat") || lower.includes("porridge")) {
    return { bg: "bg-amber-50", badgeBg: "bg-amber-100", iconColor: "#d97706", icon: "ingredientGrain", emoji: "🥞" };
  }
  if (lower.includes("steak") || lower.includes("beef") || lower.includes("sirloin") || lower.includes("burger") || lower.includes("bolognese")) {
    return { bg: "bg-rose-50", badgeBg: "bg-rose-100", iconColor: "#e11d48", icon: "ingredientMeat", emoji: "🥩" };
  }
  if (lower.includes("salmon") || lower.includes("tuna") || lower.includes("cod") || lower.includes("fish") || lower.includes("poke") || lower.includes("seafood")) {
    return { bg: "bg-sky-50", badgeBg: "bg-sky-100", iconColor: "#0284c7", icon: "ingredientFish", emoji: "🐟" };
  }
  if (lower.includes("chicken") || lower.includes("turkey") || lower.includes("poultry") || lower.includes("fajita") || lower.includes("wrap")) {
    return { bg: "bg-orange-50", badgeBg: "bg-orange-100", iconColor: "#ea580c", icon: "ingredientMeat", emoji: "🍗" };
  }
  if (lower.includes("salad") || lower.includes("caesar") || lower.includes("spinach") || lower.includes("broccoli") || lower.includes("veggie") || lower.includes("green") || lower.includes("zucchini") || lower.includes("asparagus")) {
    return { bg: "bg-emerald-50", badgeBg: "bg-emerald-100", iconColor: "#059669", icon: "ingredientVegetable", emoji: "🥗" };
  }
  if (lower.includes("shake") || lower.includes("smoothie") || lower.includes("berry") || lower.includes("yogurt") || lower.includes("parfait")) {
    return { bg: "bg-purple-50", badgeBg: "bg-purple-100", iconColor: "#9333ea", icon: "ingredientFruit", emoji: "🥤" };
  }
  if (lower.includes("egg") || lower.includes("toast") || lower.includes("omelet") || lower.includes("avocado")) {
    return { bg: "bg-yellow-50", badgeBg: "bg-yellow-100", iconColor: "#ca8a04", icon: "ingredientEgg", emoji: "🍳" };
  }
  if (lower.includes("nut") || lower.includes("almond") || lower.includes("peanut") || lower.includes("apple") || lower.includes("snack") || lower.includes("hummus") || lower.includes("cottage")) {
    return { bg: "bg-amber-50/70", badgeBg: "bg-amber-100/80", iconColor: "#b45309", icon: "ingredientNut", emoji: "🥜" };
  }
  return { bg: "bg-stone-50", badgeBg: "bg-stone-100", iconColor: "#57534e", icon, emoji: "🍽️" };
}

/**
 * Visual thumbnail for food items and scanned entries.
 *
 * If a real photographed image exists (e.g. from an AI meal scan or user upload),
 * it displays the authentic photo. Otherwise, it renders a visually distinct,
 * beautifully styled category badge with matching culinary iconography.
 */
export function FoodThumbnail({
  className,
  imageUrl,
  name,
}: {
  className?: string;
  imageUrl: string | null;
  name: string;
}) {
  const { t } = useTranslation();

  if (imageUrl) {
    return (
      <Image
        accessibilityLabel={t("dashboard.mealPhoto", { name })}
        cachePolicy="memory"
        className={className ?? "h-36 w-32"}
        contentFit="cover"
        source={{ uri: imageUrl }}
        transition={150}
      />
    );
  }

  const theme = getDishTheme(name);

  return (
    <View
      accessibilityLabel={t("dashboard.noMealPhoto")}
      className={`${className ?? "h-36 w-32"} items-center justify-center ${theme.bg} relative overflow-hidden`}
    >
      <View className="items-center justify-center gap-1.5 p-3">
        <View className={`h-14 w-14 items-center justify-center rounded-2xl ${theme.badgeBg} shadow-sm`}>
          <Text className="text-2xl">{theme.emoji}</Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 shadow-xs">
          <AppIcon color={theme.iconColor} name={theme.icon} size={11} weight="semibold" />
          <Text className="text-[10px] font-bold text-app-text tracking-wide uppercase" numberOfLines={1}>
            {name.split(" ")[0]}
          </Text>
        </View>
      </View>
    </View>
  );
}
