import { useTranslation } from "react-i18next";

import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { StageChoiceScreen } from "@/screens/onboarding/stage-choice-screen";

export default function ActivityRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();

  return (
    <StageChoiceScreen
      buttonLabel={t("common.continue")}
      description={t("onboarding.activity.description")}
      nextHref="/(onboarding)/pace"
      onChange={(activityLevel) => update({ activityLevel })}
      options={[
        { value: "sedentary", icon: "sedentary", label: t("onboarding.activity.sedentary.title"), description: t("onboarding.activity.sedentary.description") },
        { value: "light", icon: "lightActivity", label: t("onboarding.activity.light.title"), description: t("onboarding.activity.light.description") },
        { value: "active", icon: "activeActivity", label: t("onboarding.activity.active.title"), description: t("onboarding.activity.active.description") },
        { value: "veryActive", icon: "veryActive", label: t("onboarding.activity.veryActive.title"), description: t("onboarding.activity.veryActive.description") },
      ]}
      progressStep={7}
      title={t("onboarding.activity.title")}
      value={draft.activityLevel}
    />
  );
}
