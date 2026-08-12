import { router } from "expo-router";

import { OnboardingScreen } from "@/screens/onboarding/onboarding-screen";
import { RulerControl } from "@/screens/onboarding/ruler-control";
import { Text, View } from "@/tw";

type Props = {
  description: string;
  displayValue?: string;
  labelEvery: number;
  maximum: number;
  minimum: number;
  nextHref: Parameters<typeof router.push>[0];
  onChange: (value: number) => void;
  step: number;
  suffix: string;
  title: string;
  value: number;
  screenStep: 1 | 2 | 3 | 4 | 5 | 6;
  children?: React.ReactNode;
};

export function NumberScreen({ children, description, displayValue, labelEvery, maximum, minimum, nextHref, onChange, screenStep, step, suffix, title, value }: Props) {
  return (
    <OnboardingScreen description={description} onContinue={() => router.push(nextHref)} step={screenStep} title={title}>
      <View className="flex-1 items-center justify-center gap-10 pb-3">
        {children}
        <View className="items-center gap-1">
          <View className="flex-row items-end gap-1">
            <Text className="text-[68px] font-semibold leading-[74px] tracking-[-1.8px] text-[#111111]" selectable style={{ fontVariant: ["tabular-nums"] }}>
              {displayValue ?? value}
            </Text>
            <Text className="pb-2.5 text-[18px] font-medium text-[#111111]">{suffix}</Text>
          </View>
        </View>
        <View className="w-full">
          <RulerControl accessibilityLabel={title} labelEvery={labelEvery} maximum={maximum} minimum={minimum} onChange={onChange} step={step} value={value} />
        </View>
      </View>
    </OnboardingScreen>
  );
}
