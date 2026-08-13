import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import type { AppIconName } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { NavigationRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle } from "@/components/ui/section-card";

type Method = {
  href: "/(app)/scan/camera" | "/(app)/food/search" | "/(app)/food/manual";
  icon: AppIconName;
  subtitleKey?: string;
  titleKey: string;
};

const METHODS: Method[] = [
  { href: "/(app)/scan/camera", icon: "scan", titleKey: "authFlow.scanWithAi", subtitleKey: "authFlow.proBadge" },
  { href: "/(app)/food/search", icon: "search", titleKey: "authFlow.searchFoods" },
  { href: "/(app)/food/manual", icon: "add", titleKey: "foodSearch.addManually" },
];

export default function AddFoodRoute() {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <ScreenTitle title={t("authFlow.addTitle")} />
      <RowGroup>
        {METHODS.map((method) => (
          <NavigationRow
            description={method.subtitleKey ? t(method.subtitleKey) : undefined}
            icon={method.icon}
            key={method.href}
            onPress={() => router.push(method.href)}
            title={t(method.titleKey)}
          />
        ))}
      </RowGroup>
    </AppScreen>
  );
}
