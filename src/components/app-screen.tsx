import type { PropsWithChildren } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { ScrollView } from "@/tw";

export function AppScreen({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={["left", "right"]} style={{ flex: 1 }}>
      <ScrollView
        className="flex-1 bg-app-background"
        contentContainerClassName="gap-5 px-5 py-6"
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
