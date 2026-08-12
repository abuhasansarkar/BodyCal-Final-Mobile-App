import { type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/primary-button";
import { OnboardingHeader } from "@/screens/onboarding/onboarding-header";
import { ScrollView, Text, View } from "@/tw";

type Props = PropsWithChildren<{
  description: string;
  onContinue: () => void;
  step: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
}>;

export function OnboardingScreen({ children, description, onContinue, step, title }: Props) {
  const { t } = useTranslation();

  return (
    <SafeAreaView
      edges={["top", "right", "bottom", "left"]}
      style={{ backgroundColor: "#FFFFFF", flex: 1 }}
    >
      <OnboardingHeader currentStep={step} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-5 py-5"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center">
          <View className="items-center gap-2.5 pb-8">
            <Text className="max-w-[350px] text-center text-[30px] font-bold leading-[36px] tracking-[-0.7px] text-[#111111]" selectable>
              {title}
            </Text>
            <Text className="max-w-[330px] text-center text-[16px] leading-[23px] text-[#737373]" selectable>
              {description}
            </Text>
          </View>
          <View className="min-h-[380px] flex-1 justify-center">{children}</View>
        </View>
      </ScrollView>

      <View className="shrink-0 border-t border-[#F0F0F0] bg-white px-5 pb-1 pt-3">
        <PrimaryButton className="min-h-[60px]" label={t("common.continue")} labelClassName="text-[18px]" onPress={onContinue} />
      </View>
    </SafeAreaView>
  );
}
