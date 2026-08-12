import { type PropsWithChildren, type ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/primary-button";
import { OnboardingHeader } from "@/screens/onboarding/onboarding-header";
import { ScrollView, Text, View } from "@/tw";

type Props = PropsWithChildren<{
  description: string;
  disabled?: boolean;
  footerLabel?: string;
  onContinue?: () => void;
  progressStep: 7 | 8 | 9 | 10 | 11 | 12;
  title: string;
  titleAccessory?: ReactNode;
}>;

export function OnboardingStageScreen({ children, description, disabled, footerLabel, onContinue, progressStep, title, titleAccessory }: Props) {
  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ backgroundColor: "#FFFFFF", flex: 1 }}>
      <OnboardingHeader currentStep={progressStep} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-5 py-4"
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center">
          <View className="items-center gap-2.5 pb-7">
            {titleAccessory}
            <Text className="max-w-[350px] text-center text-[29px] font-bold leading-[35px] tracking-[-0.7px] text-[#111111]" selectable>{title}</Text>
            <Text className="max-w-[330px] text-center text-[16px] leading-[23px] text-[#737373]" selectable>{description}</Text>
          </View>
          <View className="min-h-[360px] flex-1 justify-center">{children}</View>
        </View>
      </ScrollView>

      {onContinue && footerLabel ? (
        <View className="shrink-0 border-t border-[#F0F0F0] bg-white px-5 pb-1 pt-3">
          <PrimaryButton className="min-h-[60px]" disabled={disabled} label={footerLabel} labelClassName="text-[18px]" onPress={onContinue} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}
