import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { AppIcon } from "@/components/app-icon";
import { Text, View } from "@/tw";

type Props = {
  title: string;
  description: string;
};

export function FeatureScreen({ description, title }: Props) {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <View className="gap-2 rounded-3xl border border-app-border bg-app-surface p-5">
        <View className="mb-1 h-11 w-11 items-center justify-center rounded-full bg-[#F7F7F7]"><AppIcon name="info" size={23} weight="semibold" /></View>
        <Text className="text-2xl font-bold text-app-text" selectable>{title}</Text>
        <Text className="text-base leading-6 text-app-muted" selectable>{description}</Text>
        <Text className="text-sm text-app-muted" selectable>{t("common.estimated")}</Text>
      </View>
    </AppScreen>
  );
}
