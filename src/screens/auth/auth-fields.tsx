import type { ComponentProps } from "react";
import React from "react";

import { AppIcon } from "@/components/app-icon";
import { Pressable, Text, TextInput, View } from "@/tw";

type Props = ComponentProps<typeof TextInput> & { label: string; error?: string | null };

export function AuthField({ error, label, secureTextEntry, ...props }: Props) {
  const [isFocused, setIsFocused] = React.useState(false);
  const [hidePassword, setHidePassword] = React.useState(secureTextEntry ?? false);

  const isPassword = Boolean(secureTextEntry);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-[#111111]">{label}</Text>
      <View
        className={`min-h-14 flex-row items-center rounded-2xl border bg-white px-4 ${
          error ? "border-[#EF4444]" : isFocused ? "border-[#111111]" : "border-[#E8E8E8]"
        }`}
      >
        <TextInput
          accessibilityLabel={label}
          className="min-h-12 flex-1 text-base text-[#111111]"
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword ? hidePassword : false}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          {...props}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={hidePassword ? "Show password" : "Hide password"}
            accessibilityRole="button"
            className="-mr-2 h-11 w-11 items-center justify-center rounded-full active:opacity-60"
            hitSlop={8}
            onPress={() => setHidePassword((prev) => !prev)}
          >
            <AppIcon color="#737373" name={hidePassword ? "eye" : "eyeOff"} size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text accessibilityLiveRegion="polite" className="text-sm text-[#EF4444]" selectable>{error}</Text> : null}
    </View>
  );
}

