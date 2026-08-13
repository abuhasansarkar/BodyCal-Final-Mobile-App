import type { ComponentProps } from "react";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { colors } from "@/config/theme";
import { Pressable, Text, TextInput, View } from "@/tw";

/**
 * Form primitives shared by every editing screen.
 *
 * `AuthField` used to be borrowed for nutrition and settings forms; these are the
 * general-purpose versions, with focus and error states drawn from the design
 * system rather than restated per screen.
 */

type FieldProps = ComponentProps<typeof TextInput> & {
  error?: string | null;
  hint?: string;
  label: string;
  suffix?: string;
};

export function Field({ error, hint, label, secureTextEntry, suffix, ...props }: FieldProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = React.useState(false);
  const [hidden, setHidden] = React.useState(secureTextEntry ?? false);
  const isPassword = Boolean(secureTextEntry);

  const borderClass = error
    ? "border-app-error"
    : isFocused
      ? "border-[#111111]"
      : "border-app-border";

  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-semibold text-app-text">{label}</Text>
      <View className={`min-h-14 flex-row items-center rounded-2xl border bg-white px-4 ${borderClass}`}>
        <TextInput
          accessibilityLabel={label}
          className="min-h-12 min-w-0 flex-1 text-base text-app-text"
          placeholderTextColor={colors.subtle}
          secureTextEntry={isPassword ? hidden : false}
          {...props}
          onBlur={(event) => {
            setIsFocused(false);
            props.onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            props.onFocus?.(event);
          }}
        />
        {suffix ? <Text className="pl-2 text-sm font-medium text-app-muted">{suffix}</Text> : null}
        {isPassword ? (
          <Pressable
            accessibilityLabel={hidden ? t("common.showPassword") : t("common.hidePassword")}
            accessibilityRole="button"
            accessibilityState={{ selected: !hidden }}
            className="-mr-2 h-11 w-11 items-center justify-center rounded-full active:opacity-60"
            hitSlop={8}
            onPress={() => setHidden((previous) => !previous)}
          >
            <AppIcon color={colors.muted} name={hidden ? "eye" : "eyeOff"} size={20} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="px-1 text-sm text-app-error"
          selectable
        >
          {error}
        </Text>
      ) : hint ? (
        <Text className="px-1 text-[13px] leading-[18px] text-app-muted" selectable>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Horizontal single-select control. Replaces the hand-rolled pill rows that were
 * duplicated across goal, meal-type and unit pickers.
 */
export function SegmentedControl<T extends string>({
  accessibilityLabel,
  onChange,
  options,
  value,
}: {
  accessibilityLabel: string;
  onChange: (next: T) => void;
  options: { value: T; label: string }[];
  value: T;
}) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup" className="flex-row gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={
              selected
                ? "min-h-11 flex-1 items-center justify-center rounded-2xl bg-[#111111] px-2 py-3"
                : "min-h-11 flex-1 items-center justify-center rounded-2xl border border-app-border bg-white px-2 py-3 active:bg-app-surface"
            }
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <Text
              className={
                selected
                  ? "text-[13px] font-semibold text-white"
                  : "text-[13px] font-semibold text-app-text"
              }
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Labelled group wrapper, so label-to-control spacing is consistent. */
export function FieldGroup({
  children,
  hint,
  label,
}: {
  children: React.ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-semibold text-app-text">{label}</Text>
      {children}
      {hint ? (
        <Text className="px-1 text-[13px] leading-[18px] text-app-muted" selectable>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** Stepper for quantities, with explicit labels on both targets. */
export function Stepper({
  decreaseLabel,
  increaseLabel,
  max = 10,
  min = 0.5,
  onChange,
  step = 0.5,
  value,
}: {
  decreaseLabel: string;
  increaseLabel: string;
  max?: number;
  min?: number;
  onChange: (next: number) => void;
  step?: number;
  value: number;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Pressable
        accessibilityLabel={decreaseLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: value <= min }}
        className="h-11 w-11 items-center justify-center rounded-full bg-app-surface active:bg-app-border"
        disabled={value <= min}
        onPress={() => onChange(Math.max(min, Number((value - step).toFixed(2))))}
      >
        <AppIcon color={colors.text} name="close" size={14} weight="semibold" />
      </Pressable>
      <Text
        className="min-w-10 text-center text-lg font-bold text-app-text"
        selectable
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}x
      </Text>
      <Pressable
        accessibilityLabel={increaseLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: value >= max }}
        className="h-11 w-11 items-center justify-center rounded-full bg-app-surface active:bg-app-border"
        disabled={value >= max}
        onPress={() => onChange(Math.min(max, Number((value + step).toFixed(2))))}
      >
        <AppIcon color={colors.text} name="add" size={16} weight="semibold" />
      </Pressable>
    </View>
  );
}
