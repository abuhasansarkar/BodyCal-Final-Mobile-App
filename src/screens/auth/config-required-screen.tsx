import { Link } from "expo-router";
import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { Text } from "@/tw";

export function ConfigRequiredScreen() {
  const { t } = useTranslation();
  return (
    <AppScreen>
      <Text className="text-3xl font-bold text-app-text" selectable>{t("config.title")}</Text>
      <Text className="text-base leading-6 text-app-muted" selectable>{t("config.body")}</Text>
      <Link className="min-h-12 text-base font-semibold text-app-accent" href="/(onboarding)/ai-introduction">Preview the remaining flow</Link>
    </AppScreen>
  );
}
