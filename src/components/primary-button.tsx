import type { ComponentProps } from "react";
import { clsx } from "clsx";

import { AppIcon, type AppIconName } from "@/components/app-icon";
import { Pressable, Text } from "@/tw";

type Props = ComponentProps<typeof Pressable> & { icon?: AppIconName; label: string; labelClassName?: string };

export function PrimaryButton({ className, disabled, icon, label, labelClassName, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      className={clsx("min-h-14 flex-row items-center justify-center gap-2 rounded-2xl bg-[#111111] px-5 active:opacity-75 disabled:opacity-45", className)}
      disabled={disabled}
      {...props}
    >
      {icon ? <AppIcon color="#FFFFFF" name={icon} size={20} weight="semibold" /> : null}
      <Text className={clsx("text-base font-semibold text-white", labelClassName)}>{label}</Text>
    </Pressable>
  );
}
