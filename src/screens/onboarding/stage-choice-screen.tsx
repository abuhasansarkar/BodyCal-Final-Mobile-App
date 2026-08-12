import { router } from "expo-router";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { OnboardingStageScreen } from "@/screens/onboarding/onboarding-stage-screen";
import { Pressable, Text, View } from "@/tw";

type Option<T extends string> = {
  description: string;
  icon: AppIconName;
  label: string;
  value: T;
};

type Props<T extends string> = {
  description: string;
  nextHref: Parameters<typeof router.push>[0];
  onChange: (value: T) => void;
  options: Option<T>[];
  progressStep: 7 | 8 | 9 | 10 | 11 | 12;
  title: string;
  value: T;
  buttonLabel: string;
};

export function StageChoiceScreen<T extends string>({ buttonLabel, description, nextHref, onChange, options, progressStep, title, value }: Props<T>) {
  return (
    <OnboardingStageScreen description={description} footerLabel={buttonLabel} onContinue={() => router.push(nextHref)} progressStep={progressStep} title={title}>
      <View accessibilityRole="radiogroup" className="justify-center gap-3">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              className={`min-h-[82px] flex-row items-center gap-4 rounded-[18px] border bg-white px-4 py-3 ${selected ? "border-[1.5px] border-[#111111]" : "border-[#E8E8E8]"}`}
              key={option.value}
              onPress={() => onChange(option.value)}
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F7F7F7]">
                <AppIcon name={option.icon} size={25} weight="semibold" />
              </View>
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-[17px] font-semibold leading-[22px] text-[#111111]">{option.label}</Text>
                <Text className="text-[13px] leading-[18px] text-[#737373]">{option.description}</Text>
              </View>
              <View className={`h-7 w-7 items-center justify-center rounded-full border ${selected ? "border-[#111111] bg-[#111111]" : "border-[#D4D4D4] bg-white"}`}>
                {selected ? <View className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </OnboardingStageScreen>
  );
}
