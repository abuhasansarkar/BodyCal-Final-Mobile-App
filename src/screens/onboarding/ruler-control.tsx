import React from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView as RNScrollView } from "react-native";

import { ScrollView, Text, View } from "@/tw";

type Props = {
  accessibilityLabel: string;
  labelEvery: number;
  maximum: number;
  minimum: number;
  onChange: (value: number) => void;
  step: number;
  value: number;
};

const ITEM_WIDTH = 15;

export function RulerControl({ accessibilityLabel, labelEvery, maximum, minimum, onChange, step, value }: Props) {
  const scrollRef = React.useRef<RNScrollView>(null);
  const [viewportWidth, setViewportWidth] = React.useState(0);
  const count = Math.round((maximum - minimum) / step) + 1;
  const values = React.useMemo(() => Array.from({ length: count }, (_, index) => Number((minimum + index * step).toFixed(2))), [count, minimum, step]);
  const selectedIndex = Math.round((value - minimum) / step);

  const scrollToIndex = React.useCallback((index: number, animated: boolean) => {
    scrollRef.current?.scrollTo({ animated, x: Math.max(0, index * ITEM_WIDTH) });
  }, []);

  React.useEffect(() => {
    if (!viewportWidth) return;
    requestAnimationFrame(() => scrollToIndex(selectedIndex, false));
  }, [scrollToIndex, selectedIndex, viewportWidth]);

  const updateFromOffset = (offset: number) => {
    const index = Math.max(0, Math.min(count - 1, Math.round(offset / ITEM_WIDTH)));
    onChange(values[index]);
  };

  const adjust = (direction: -1 | 1) => {
    const index = Math.max(0, Math.min(count - 1, selectedIndex + direction));
    onChange(values[index]);
    scrollToIndex(index, true);
  };

  return (
    <View
      accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityValue={{ max: maximum, min: minimum, now: value }}
      className="relative h-28"
      onAccessibilityAction={(event) => adjust(event.nativeEvent.actionName === "increment" ? 1 : -1)}
      onLayout={(event: LayoutChangeEvent) => setViewportWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: Math.max(0, viewportWidth / 2 - ITEM_WIDTH / 2) }}
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => updateFromOffset(event.nativeEvent.contentOffset.x)}
        onScrollEndDrag={(event: NativeSyntheticEvent<NativeScrollEvent>) => updateFromOffset(event.nativeEvent.contentOffset.x)}
        ref={scrollRef}
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
      >
        {values.map((item, index) => {
          const major = index % labelEvery === 0;
          return (
            <View className="h-28 items-center justify-end" key={item} style={{ width: ITEM_WIDTH }}>
              {major ? (
                <Text className="absolute top-1 text-[12px] font-medium text-[#737373]" style={{ fontVariant: ["tabular-nums"], width: 54, textAlign: "center" }}>
                  {Number.isInteger(item) ? item : item.toFixed(1)}
                </Text>
              ) : null}
              <View className={`w-px bg-[#BEBEBE] ${major ? "h-10" : "h-5"}`} />
            </View>
          );
        })}
      </ScrollView>
      <View pointerEvents="none" className="absolute bottom-0 left-1/2 h-14 w-[2.5px] -translate-x-1/2 bg-[#111111]" />
    </View>
  );
}
