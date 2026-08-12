import type { PropsWithChildren } from "react";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { ScrollView } from "@/tw";

type AppScreenProps = PropsWithChildren<{
  edges?: Edge[];
}>;

export function AppScreen({ children, edges = ["left", "right"] }: AppScreenProps) {
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView
        className="flex-1 bg-white"
        contentContainerClassName="gap-6 px-5 pb-8 pt-6"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
