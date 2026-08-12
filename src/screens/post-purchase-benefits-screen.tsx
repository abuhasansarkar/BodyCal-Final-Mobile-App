import { router, type Href } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PostPurchaseShell } from "@/components/post-purchase-shell";
import { Text, View } from "@/tw";

const features: AppIconName[] = ["scan", "goal", "macros", "progress", "notification"];

export function PostPurchaseBenefitsScreen() {
  const { t } = useTranslation();
  return (
    <PostPurchaseShell buttonIcon="check" buttonLabel={t("postPurchase.benefits.button")} onContinue={() => router.push("/(app)/review" as Href)} showBack={false} step={1}>
      <View className="items-center gap-3 px-2">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-[#F4F1FF]"><AppIcon color="#6D5BD0" name="subscription" size={38} weight="semibold" /></View>
        <Text className="text-center text-[34px] font-bold leading-[40px] tracking-[-0.8px] text-[#111111]" selectable>{t("postPurchase.benefits.title")}</Text>
        <Text className="text-center text-[16px] leading-6 text-[#737373]" selectable>{t("postPurchase.benefits.description")}</Text>
      </View>

      <View className="gap-3">
        {features.map((icon, index) => (
          <View className="min-h-[76px] flex-row items-center gap-4 rounded-[20px] border border-[#E8E8E8] bg-white px-4 py-3" key={icon}>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name={icon} size={24} weight="semibold" /></View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-[16px] font-semibold leading-5 text-[#111111]" selectable>{t(`postPurchase.benefits.features.${index}.title`)}</Text>
              <Text className="text-[13px] leading-[18px] text-[#737373]" selectable>{t(`postPurchase.benefits.features.${index}.description`)}</Text>
            </View>
            <AppIcon color="#22A06B" name="checkCircle" size={22} />
          </View>
        ))}
      </View>
    </PostPurchaseShell>
  );
}
