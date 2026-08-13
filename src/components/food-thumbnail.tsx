import { useTranslation } from "react-i18next";

import { Image } from "@/tw";

const mealPlaceholder = require("@/../assets/images/welcome-meal-hero.png");

/**
 * Photo for a logged food entry.
 *
 * Entries added by hand carry no photo, and a bare cutlery glyph left the
 * dashboard cards looking unfinished. They fall back to a generic meal still
 * instead.
 *
 * That still is decorative only — it is not a picture of what was eaten. The
 * accessibility label therefore says the photo is missing rather than naming the
 * food, so a screen reader is never told the placeholder depicts the entry.
 */
export function FoodThumbnail({
  className,
  imageUrl,
  name,
}: {
  className: string;
  imageUrl: string | null;
  name: string;
}) {
  const { t } = useTranslation();

  return (
    <Image
      accessibilityLabel={imageUrl ? t("dashboard.mealPhoto", { name }) : t("dashboard.noMealPhoto")}
      cachePolicy="memory"
      className={className}
      contentFit="cover"
      source={imageUrl ? { uri: imageUrl } : mealPlaceholder}
      transition={150}
    />
  );
}
