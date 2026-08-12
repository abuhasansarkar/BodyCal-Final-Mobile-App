import { NumberScreen } from "@/screens/onboarding/number-screen";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { UnitToggle } from "@/screens/onboarding/unit-toggle";
import { useTranslation } from "react-i18next";

export default function CurrentWeightRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();
  const pounds = draft.weightUnit === "lb";
  const displayedValue = pounds ? Math.round(draft.currentWeightKg * 2.2046226218) : draft.currentWeightKg;
  return <NumberScreen
    description={t("onboarding.currentWeight.description")}
    displayValue={pounds ? displayedValue.toFixed(0) : displayedValue.toFixed(1)}
    labelEvery={pounds ? 5 : 10}
    maximum={pounds ? 772 : 350}
    minimum={pounds ? 77 : 35}
    nextHref="/(onboarding)/goal-weight"
    onChange={(next) => update({ currentWeightKg: pounds ? Number((next / 2.2046226218).toFixed(1)) : next })}
    screenStep={5}
    step={pounds ? 1 : 0.5}
    suffix={pounds ? t("onboarding.units.lb") : t("onboarding.units.kg")}
    title={t("onboarding.currentWeight.title")}
    value={displayedValue}
  >
    <UnitToggle accessibilityLabel={t("onboarding.currentWeight.unitLabel")} onChange={(weightUnit) => update({ weightUnit })} options={[{ value: "kg", label: t("onboarding.units.kg") }, { value: "lb", label: t("onboarding.units.lb") }]} value={draft.weightUnit} />
  </NumberScreen>;
}
