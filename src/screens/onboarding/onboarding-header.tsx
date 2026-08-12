import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { Pressable, Text, View } from "@/tw";

type Props = {
  currentStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
};

const previousRouteByStep: Record<Props["currentStep"], Href> = {
  1: "/(public)/welcome",
  2: "/(onboarding)/goal",
  3: "/(onboarding)/calculation-basis",
  4: "/(onboarding)/age",
  5: "/(onboarding)/height",
  6: "/(onboarding)/current-weight",
  7: "/(onboarding)/goal-weight",
  8: "/(onboarding)/activity",
  9: "/(onboarding)/pace",
  10: "/(onboarding)/pace",
  11: "/(onboarding)/result",
  12: "/(onboarding)/ai-introduction",
};

export function OnboardingHeader({ currentStep }: Props) {
  const { t } = useTranslation();

  return (
    <>
      <View className="flex-row items-center justify-between px-5 pb-3 pt-1">
        <Pressable
          accessibilityLabel={t("common.back")}
          accessibilityRole="button"
          className="h-12 w-12 items-center justify-center rounded-full active:bg-[#F7F7F7]"
          hitSlop={8}
          onPress={() => router.dismissTo(previousRouteByStep[currentStep])}
        >
          <AppIcon name="back" size={25} weight="semibold" />
        </Pressable>

        <View accessibilityLabel="BodyCal" accessible className="flex-row items-center gap-2.5">
          <Image
            accessibilityIgnoresInvertColors
            contentFit="contain"
            source={require("@/../assets/images/BodyCal-Black-Logo.png")}
            style={{ height: 54, width: 54 }}
          />
          <Text className="text-[24px] font-bold tracking-[-0.7px] text-[#111111]">BodyCal</Text>
        </View>

        <View className="h-12 w-12" />
      </View>

      <View className="items-center px-5 pb-4">
        <View
          accessibilityLabel={t("onboarding.progress", { current: currentStep, total: 12 })}
          className="w-[92%] max-w-[350px] flex-row items-center"
        >
          {Array.from({ length: 12 }, (_, index) => {
            const item = index + 1;
            const reached = item <= currentStep;

            return (
              <Fragment key={item}>
                <View className={`h-2.5 w-2.5 rounded-full ${reached ? "bg-[#111111]" : "border border-[#D8D8D8] bg-white"}`} />
                {item < 12 ? <View className={`h-[1.5px] flex-1 ${item < currentStep ? "bg-[#111111]" : "bg-[#E2E2E2]"}`} /> : null}
              </Fragment>
            );
          })}
        </View>
      </View>
    </>
  );
}
