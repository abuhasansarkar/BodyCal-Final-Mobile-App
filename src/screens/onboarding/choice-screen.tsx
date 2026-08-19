import { router } from "expo-router";
import { useTranslation } from "react-i18next";
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
  /**
   * `"row"` lays the options out side by side as equal-width tiles.
   *
   * Only suits a small number of short labels — two or three words, no
   * description — so it stays opt-in rather than a width breakpoint. Everything
   * else keeps the stacked rows, where a label and its description have the full
   * width to wrap into at large text sizes.
   */
  layout?: "list" | "row";
  value: T;
  options: Option<T>[];
  nextHref: Parameters<typeof router.push>[0];
  onChange: (value: T) => void;
  step?: 1 | 2 | 3 | 4 | 5 | 6;
};

export function ChoiceScreen<T extends string>({ description = "", layout = "list", nextHref, onChange, options, step, title, value }: Props<T>) {
  const { t } = useTranslation();

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
        <PrimaryButton label={t("common.continue")} onPress={() => router.push(nextHref)} />
      </AppScreen>
    );
  }

  return (
    <OnboardingScreen description={description} onContinue={() => router.push(nextHref)} step={step} title={title}>
      <View
        accessibilityRole="radiogroup"
        className={layout === "row" ? "flex-row gap-4 py-2" : "justify-center gap-4 py-2"}
      >
        {options.map((option) => {
          const isSelected = value === option.value;

          if (layout === "row") {
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                className={`min-h-[152px] flex-1 items-center justify-center gap-3.5 rounded-[18px] border-[1.5px] bg-white px-3 py-6 ${isSelected ? "border-[#111111]" : "border-[#E8E8E8]"}`}
                key={option.value}
                onPress={() => onChange(option.value)}
              >
                {/*
                  With two tiles side by side, the filled chip is the whole
                  selected state — a radio dot in a corner would be a second,
                  smaller answer to a question the tile has already answered.
                  Screen readers still get it from `accessibilityState`.
                */}
                <View
                  className={`h-[68px] w-[68px] items-center justify-center rounded-full ${isSelected ? "bg-[#111111]" : "bg-[#F7F7F7]"}`}
                >
                  <AppIcon
                    color={isSelected ? "#FFFFFF" : "#111111"}
                    name={option.icon ?? "goal"}
                    size={34}
                    weight="semibold"
                  />
                </View>
                <Text className="text-center text-[17px] font-semibold leading-[22px] text-[#111111]">
                  {option.label}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              /*
                The border keeps a constant 1.5px and only changes colour. It used
                to grow from 1px to 1.5px on selection, which nudged the whole row
                half a point every time the user changed their mind.
              */
              className={`min-h-[92px] flex-row items-center gap-4 overflow-hidden rounded-[18px] border-[1.5px] bg-white pl-4 ${isSelected ? "border-[#111111]" : "border-[#E8E8E8]"}`}
              key={option.value}
              onPress={() => onChange(option.value)}
            >
              {/*
                The icon chip inverts when chosen. Selection previously lived
                entirely in the hairline border and the small radio dot, which is
                a lot of weight for two of the quietest elements on the card; the
                filled chip makes the answer readable at a glance and at distance.
              */}
              <View
                className={`h-[52px] w-[52px] items-center justify-center rounded-full ${isSelected ? "bg-[#111111]" : "bg-[#F7F7F7]"}`}
              >
                <AppIcon
                  color={isSelected ? "#FFFFFF" : "#111111"}
                  name={option.icon ?? "goal"}
                  size={28}
                  weight="semibold"
                />
              </View>
              <View className="min-w-0 flex-1 gap-1 py-4">
                <Text className="text-[17px] font-semibold leading-[22px] text-[#111111]">{option.label}</Text>
                {option.description ? <Text className="text-[14px] font-medium leading-[20px] text-[#525252]">{option.description}</Text> : null}
              </View>
              {option.image ? <Image contentFit="cover" source={option.image} style={{ alignSelf: "stretch", width: 98 }} transition={150} /> : (
                <View className={`mr-5 h-7 w-7 items-center justify-center rounded-full border ${isSelected ? "border-[#111111] bg-[#111111]" : "border-[#D4D4D4] bg-white"}`}>
                  {isSelected ? <View className="h-2.5 w-2.5 rounded-full bg-white" /> : null}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </OnboardingScreen>
  );
}
