import { Pressable, Text, View } from "@/tw";

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  accessibilityLabel: string;
  onChange: (value: T) => void;
  options: [Option<T>, Option<T>];
  value: T;
};

export function UnitToggle<T extends string>({ accessibilityLabel, onChange, options, value }: Props<T>) {
  return (
    <View accessibilityLabel={accessibilityLabel} accessibilityRole="radiogroup" className="h-[52px] flex-row rounded-[14px] border border-[#E8E8E8] bg-white p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            className={`min-w-24 flex-1 items-center justify-center rounded-xl px-6 ${selected ? "bg-[#111111]" : "bg-white"}`}
            key={option.value}
            onPress={() => onChange(option.value)}
          >
            <Text className={`text-[16px] font-semibold ${selected ? "text-white" : "text-[#737373]"}`}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
