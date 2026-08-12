import { ChoiceScreen } from "@/screens/onboarding/choice-screen";
import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { useTranslation } from "react-i18next";

export default function GoalRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();
  const meal = require("@/../assets/images/welcome-meal-hero.png");
  return <ChoiceScreen
    description={t("onboarding.goal.description")}
    nextHref="/(onboarding)/calculation-basis"
    onChange={(goal) => update({ goal, goalWeightKg: goal === "lose" ? draft.currentWeightKg - 5 : goal === "gain" ? draft.currentWeightKg + 5 : draft.currentWeightKg })}
    options={[
      { value: "lose", icon: "goalLose", image: meal, label: t("onboarding.goal.lose.title"), description: t("onboarding.goal.lose.description") },
      { value: "maintain", icon: "goalMaintain", image: meal, label: t("onboarding.goal.maintain.title"), description: t("onboarding.goal.maintain.description") },
      { value: "gain", icon: "goalGain", image: meal, label: t("onboarding.goal.gain.title"), description: t("onboarding.goal.gain.description") },
    ]}
    step={1}
    title={t("onboarding.goal.title")}
    value={draft.goal}
  />;
}
