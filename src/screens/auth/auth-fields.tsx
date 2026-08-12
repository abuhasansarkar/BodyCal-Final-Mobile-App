import type { ComponentProps } from "react";

import { Text, TextInput, View } from "@/tw";

type Props = ComponentProps<typeof TextInput> & { label: string; error?: string | null };

export function AuthField({ error, label, ...props }: Props) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-app-text">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        className="min-h-12 rounded-2xl border border-app-border bg-app-background px-4 text-base text-app-text"
        placeholderTextColor="gray"
        {...props}
      />
      {error ? <Text accessibilityLiveRegion="polite" className="text-sm text-app-error" selectable>{error}</Text> : null}
    </View>
  );
}
