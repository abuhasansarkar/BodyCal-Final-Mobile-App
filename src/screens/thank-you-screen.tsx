import * as StoreReview from "expo-store-review";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { PostPurchaseShell } from "@/components/post-purchase-shell";
import { Text, View } from "@/tw";

export function ThankYouScreen() {
  const { t } = useTranslation();
  const { review } = useLocalSearchParams<{ review?: string }>();

  React.useEffect(() => {
    if (review !== "1") return;
    const timer = setTimeout(() => {
      void Promise.all([StoreReview.isAvailableAsync(), StoreReview.hasAction()])
        .then(([available, hasAction]) => available && hasAction ? StoreReview.requestReview() : undefined)
        .catch(() => undefined);
    }, 750);
    return () => clearTimeout(timer);
  }, [review]);
  return (
    <PostPurchaseShell buttonIcon="heart" buttonLabel={t("postPurchase.thanks.button")} onContinue={() => router.replace("/(app)/(tabs)/today")} showBack={false} step={3}>
      <View className="flex-1 items-center justify-center gap-8 px-3 py-8">
        <View className="h-64 w-64 items-center justify-center rounded-full bg-[#F1EEFA]">
          <View className="h-48 w-48 items-center justify-center rounded-full bg-white"><AppIcon name="celebration" size={92} weight="semibold" /></View>
        </View>
        <View className="items-center gap-4">
          <Text className="text-center text-[42px] font-bold leading-[47px] tracking-[-1.2px] text-[#111111]" selectable>{t("postPurchase.thanks.title")}</Text>
          <Text className="text-center text-[18px] leading-7 text-[#737373]" selectable>{t("postPurchase.thanks.description")}</Text>
        </View>
      </View>
    </PostPurchaseShell>
  );
}
