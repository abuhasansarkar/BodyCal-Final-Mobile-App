import { ChoiceScreen } from "@/screens/onboarding/choice-screen";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslation } from "react-i18next";

export default function CalculationBasisRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();
  return <ChoiceScreen
    description={t("onboarding.basis.description")}
    // Two one-word labels, so they sit side by side rather than as full-width rows.
    layout="row"
    nextHref="/(onboarding)/age"
    onChange={(calculationBasis) => update({ calculationBasis })}
    options={[
      { value: "male", icon: "male", label: t("onboarding.basis.male") },
      { value: "female", icon: "female", label: t("onboarding.basis.female") },
    ]}
    step={2}
    title={t("onboarding.basis.title")}
    value={draft.calculationBasis}
  />;
}
