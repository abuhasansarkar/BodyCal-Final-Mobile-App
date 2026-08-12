import { NumberScreen } from "@/screens/onboarding/number-screen";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { UnitToggle } from "@/screens/onboarding/unit-toggle";
import { useTranslation } from "react-i18next";

export default function HeightRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();
  const imperial = draft.heightUnit === "imperial";
  const totalInches = Math.round(draft.heightCm / 2.54);
  const display = imperial ? `${Math.floor(totalInches / 12)}′ ${totalInches % 12}″` : String(Math.round(draft.heightCm));
  return <NumberScreen
    description={t("onboarding.height.description")}
    displayValue={display}
    labelEvery={imperial ? 2 : 5}
    maximum={imperial ? 91 : 230}
    minimum={imperial ? 47 : 120}
    nextHref="/(onboarding)/current-weight"
    onChange={(next) => update({ heightCm: imperial ? Number((next * 2.54).toFixed(1)) : next })}
    screenStep={4}
    step={1}
    suffix={imperial ? "" : t("onboarding.units.cm")}
    title={t("onboarding.height.title")}
    value={imperial ? totalInches : Math.round(draft.heightCm)}
  >
    <UnitToggle accessibilityLabel={t("onboarding.height.unitLabel")} onChange={(heightUnit) => update({ heightUnit })} options={[{ value: "cm", label: t("onboarding.units.cm") }, { value: "imperial", label: t("onboarding.units.ft") }]} value={draft.heightUnit} />
  </NumberScreen>;
}
