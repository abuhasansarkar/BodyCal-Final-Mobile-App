import React from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView as ScrollViewType } from "react-native";
import { useTranslation } from "react-i18next";

import { dateInWeekForWeekday, formatWeekRange, getDashboardWeeks } from "@/features/dashboard/week-range";
import { Pressable, ScrollView, Text, View } from "@/tw";

const CURRENT_WEEK_PAGE = 2;

export function DashboardWeekCarousel({ locale, onSelectDate, selectedDate }: { locale?: string; onSelectDate: (date: Date) => void; selectedDate: Date }) {
  const { t } = useTranslation();
  const scrollRef = React.useRef<ScrollViewType>(null);
  const [pageWidth, setPageWidth] = React.useState(0);
  const weeks = React.useMemo(() => getDashboardWeeks(new Date()), []);
  const selectedLocalDate = selectedDate.toDateString();
  const selectedPage = Math.max(0, weeks.findIndex((week) => week.some((day) => day.toDateString() === selectedLocalDate)));

  React.useEffect(() => {
    if (!pageWidth) return;
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ animated: false, x: pageWidth * selectedPage }));
    return () => cancelAnimationFrame(frame);
  }, [pageWidth, selectedPage]);

  const handleSwipeEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!pageWidth) return;
    const page = Math.min(CURRENT_WEEK_PAGE, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / pageWidth)));
    const nextDate = dateInWeekForWeekday(weeks[page], selectedDate.getDay());
    if (nextDate.toDateString() !== selectedLocalDate) onSelectDate(nextDate);
  };

  return (
    <View
      accessibilityHint={t("dashboard.weekSwipeHint")}
      accessibilityLabel={t("dashboard.threeWeekCalendar")}
      className="min-h-[76px] overflow-hidden"
      onLayout={(event) => {
        const width = Math.round(event.nativeEvent.layout.width);
        if (width > 0 && width !== pageWidth) setPageWidth(width);
      }}
    >
      <ScrollView
        ref={scrollRef}
        accessibilityRole="adjustable"
        bounces={false}
        className="flex-1"
        decelerationRate="fast"
        horizontal
        onMomentumScrollEnd={handleSwipeEnd}
        overScrollMode="never"
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      >
        {pageWidth ? weeks.map((week) => (
          <View
            key={week[0].toISOString()}
            accessibilityLabel={formatWeekRange(week[0], week[6], locale)}
            className="flex-row justify-between px-1 py-1"
            style={{ width: pageWidth }}
          >
            {week.map((day) => {
              const selected = day.toDateString() === selectedLocalDate;
              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityLabel={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  className="min-h-16 min-w-10 items-center gap-2"
                  onPress={() => onSelectDate(day)}
                >
                  <Text className={selected ? "text-xs font-semibold text-app-text" : "text-xs text-app-muted"} selectable>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</Text>
                  <View className={selected ? "h-11 w-11 items-center justify-center rounded-full bg-[#111111]" : "h-11 w-11 items-center justify-center rounded-full border border-dashed border-app-border bg-white"}>
                    <Text className={selected ? "text-base font-bold text-white" : "text-base font-semibold text-app-text"} selectable style={{ fontVariant: ["tabular-nums"] }}>{day.getDate()}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )) : null}
      </ScrollView>
    </View>
  );
}
