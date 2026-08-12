import { NumberScreen } from "@/screens/onboarding/number-screen";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslation } from "react-i18next";

export default function AgeRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();
  return <NumberScreen description={t("onboarding.age.description")} labelEvery={2} maximum={80} minimum={18} nextHref="/(onboarding)/height" onChange={(age) => update({ age })} screenStep={3} step={1} suffix={t("onboarding.age.suffix")} title={t("onboarding.age.title")} value={draft.age} />;
}
