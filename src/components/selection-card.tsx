import { Pressable, Text } from "@/tw";

type Props = {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

export function SelectionCard({ description, label, onPress, selected }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={`min-h-16 gap-1 rounded-2xl border p-4 ${selected ? "border-app-accent bg-app-surface" : "border-app-border bg-app-background"}`}
      onPress={onPress}
    >
      <Text className="text-base font-semibold text-app-text">{label}</Text>
      {description ? <Text className="text-sm text-app-muted">{description}</Text> : null}
    </Pressable>
  );
}
