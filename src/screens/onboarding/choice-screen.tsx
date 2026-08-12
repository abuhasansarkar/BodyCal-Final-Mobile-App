import { router } from "expo-router";
import { Image, type ImageSource } from "expo-image";

import { AppScreen } from "@/components/app-screen";
import { AppIcon, type AppIconName } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { SelectionCard } from "@/components/selection-card";
import { OnboardingScreen } from "@/screens/onboarding/onboarding-screen";
import { Pressable, Text, View } from "@/tw";

type Option<T extends string> = { description?: string; icon?: AppIconName; image?: ImageSource; label: string; value: T };

type Props<T extends string> = {
  title: string;
  description?: string;
  value: T;
  options: Option<T>[];
  nextHref: Parameters<typeof router.push>[0];
  onChange: (value: T) => void;
  step?: 1 | 2 | 3 | 4 | 5 | 6;
};

export function ChoiceScreen<T extends string>({ description = "", nextHref, onChange, options, step, title, value }: Props<T>) {
  if (step === undefined) {
    return (
      <AppScreen>
        <View className="gap-2">
          <Text className="text-3xl font-bold text-app-text" selectable>{title}</Text>
          {description ? <Text className="text-base leading-6 text-app-muted" selectable>{description}</Text> : null}
        </View>
        <View accessibilityRole="radiogroup" className="gap-3">
          {options.map((option) => <SelectionCard description={option.description} key={option.value} label={option.label} onPress={() => onChange(option.value)} selected={value === option.value} />)}
        </View>
        <PrimaryButton label="Continue" onPress={() => router.push(nextHref)} />
      </AppScreen>
    );
  }

  return (
    <OnboardingScreen description={description} onContinue={() => router.push(nextHref)} step={step} title={title}>
      <View accessibilityRole="radiogroup" className="justify-center gap-4 py-2">
        {options.map((option) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: value === option.value }}
            className={`min-h-[92px] flex-row items-center gap-4 overflow-hidden rounded-[18px] border bg-white pl-4 ${value === option.value ? "border-[1.5px] border-[#111111]" : "border-[#E8E8E8]"}`}
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#F7F7F7]">
              <AppIcon name={option.icon ?? "goal"} size={28} weight="semibold" />
            </View>
            <View className="min-w-0 flex-1 gap-1 py-4">
              <Text className="text-[17px] font-semibold leading-[22px] text-[#111111]">{option.label}</Text>
              {option.description ? <Text className="text-[13px] leading-[18px] text-[#737373]">{option.description}</Text> : null}
            </View>
            {option.image ? <Image contentFit="cover" source={option.image} style={{ alignSelf: "stretch", width: 98 }} transition={150} /> : (
              <View className={`mr-5 h-7 w-7 items-center justify-center rounded-full border ${value === option.value ? "border-[#111111] bg-[#111111]" : "border-[#D4D4D4] bg-white"}`}>
                {value === option.value ? <View className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
              </View>
            )}
          </Pressable>
        ))}
      </View>
    </OnboardingScreen>
  );
}
