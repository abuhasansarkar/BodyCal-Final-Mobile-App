import { useTranslation } from "react-i18next";

import { useOnboarding } from "@/features/onboarding/onboarding-provider";
import { StageChoiceScreen } from "@/screens/onboarding/stage-choice-screen";

export default function PaceRoute() {
  const { draft, update } = useOnboarding();
  const { t } = useTranslation();

  return (
    <StageChoiceScreen
      buttonLabel={t("common.continue")}
      description={t("onboarding.pace.description")}
      nextHref="/(onboarding)/calculating"
      onChange={(pace) => update({ pace })}
      options={[
        { value: "slow", icon: "slowPace", label: t("onboarding.pace.slow.title"), description: t("onboarding.pace.slow.description") },
        { value: "recommended", icon: "recommendedPace", label: t("onboarding.pace.recommended.title"), description: t("onboarding.pace.recommended.description") },
        { value: "faster", icon: "fastPace", label: t("onboarding.pace.faster.title"), description: t("onboarding.pace.faster.description") },
      ]}
      progressStep={8}
      title={t("onboarding.pace.title")}
      value={draft.pace}
    />
  );
}
