import { useTranslation } from "react-i18next";

import { FeatureScreen } from "@/screens/feature-screen";

export default function VerifyEmailRoute() {
  const { t } = useTranslation();
  return <FeatureScreen description={t("authFlow.verifyBody")} title={t("authFlow.verifyTitle")} />;
}
