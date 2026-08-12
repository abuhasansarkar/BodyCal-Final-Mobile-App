import { router } from "expo-router";
import type { PropsWithChildren, ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { Pressable, ScrollView, View } from "@/tw";

type Props = PropsWithChildren<{
  buttonLabel: string;
  buttonIcon?: "check" | "heart" | "star";
  footerAccessory?: ReactNode;
  onContinue: () => void;
  showBack?: boolean;
  step: 1 | 2 | 3;
}>;

export function PostPurchaseShell({ buttonIcon, buttonLabel, children, footerAccessory, onContinue, showBack = true, step }: Props) {
  return (
    <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center gap-4 px-5 pb-2 pt-2">
          {showBack ? (
            <Pressable accessibilityLabel="Back" accessibilityRole="button" className="h-12 w-12 items-center justify-center rounded-full bg-[#F5F5F5]" onPress={() => router.back()}>
              <AppIcon name="back" size={24} weight="semibold" />
            </Pressable>
          ) : <View className="h-12 w-12" />}
          <View accessibilityLabel={`Step ${step} of 3`} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step }} className="h-2 flex-1 flex-row gap-1 overflow-hidden rounded-full">
            {[1, 2, 3].map((item) => <View className={`h-full flex-1 rounded-full ${item <= step ? "bg-[#111111]" : "bg-[#ECECEC]"}`} key={item} />)}
          </View>
        </View>

        <ScrollView className="flex-1" contentContainerClassName="flex-grow gap-6 px-5 pb-6 pt-4" contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>

        <View className="gap-2 border-t border-[#EEEEEE] bg-white px-5 pb-1 pt-4">
          <PrimaryButton className="min-h-[60px] rounded-full" icon={buttonIcon} label={buttonLabel} labelClassName="text-[18px]" onPress={onContinue} />
          {footerAccessory}
        </View>
      </View>
    </SafeAreaView>
  );
}
