import React from "react";
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollView as ScrollViewType } from "react-native";
import { useTranslation } from "react-i18next";

import { ProgressRing } from "@/components/progress-ring";
import { calendarStatusColors, colors } from "@/config/theme";
import { atLocalNoon, dateInWeekForWeekday, formatWeekRange, getDashboardWeeks } from "@/features/dashboard/week-range";
import { currentLocalDate } from "@/lib/local-day";
import { Pressable, ScrollView, Text, View } from "@/tw";

const CURRENT_WEEK_PAGE = 2;

export function DashboardWeekCarousel({
  locale,
  onSelectDate,
  progressByDate,
  selectedDate,
}: {
  locale?: string;
  onSelectDate: (date: Date) => void;
  /** Share of that day's calorie goal that was logged, 0-100, keyed by local `YYYY-MM-DD`. */
  progressByDate?: ReadonlyMap<string, number>;
  selectedDate: Date;
}) {
  const { t } = useTranslation();
  const scrollRef = React.useRef<ScrollViewType>(null);
  const [pageWidth, setPageWidth] = React.useState(0);
  const weeks = React.useMemo(() => getDashboardWeeks(new Date()), []);
  const todayLocalDate = currentLocalDate();
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
    const candidate = dateInWeekForWeekday(weeks[page], selectedDate.getDay());
    /*
      Carrying the weekday across pages lands on a future day when swiping back
      into the current week -- Thursday of a past week maps to a Thursday that
      has not happened yet. Days ahead of today are not selectable, so settle on
      today instead of a date the user could not have tapped.
    */
    const nextDate = currentLocalDate(candidate) > todayLocalDate ? atLocalNoon(new Date()) : candidate;
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
              const dayLocalDate = currentLocalDate(day);
              const selected = day.toDateString() === selectedLocalDate;
              const upcoming = dayLocalDate > todayLocalDate;
              const progress = upcoming ? 0 : progressByDate?.get(dayLocalDate) ?? 0;
              const goalMet = progress >= 100;
              const fullDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day);
              return (
                <Pressable
                  key={day.toISOString()}
                  accessibilityHint={upcoming ? t("dashboard.dayUpcoming") : undefined}
                  accessibilityLabel={
                    progress > 0
                      ? `${fullDate}, ${t("dashboard.dayCalorieProgress", { percent: Math.round(progress) })}`
                      : fullDate
                  }
                  accessibilityRole="button"
                  accessibilityState={{ disabled: upcoming, selected }}
                  className="min-h-16 min-w-11 items-center gap-2"
                  disabled={upcoming}
                  onPress={() => onSelectDate(day)}
                >
                  <Text className={selected ? "text-xs font-bold text-app-text" : upcoming ? "text-xs font-medium text-app-subtle" : "text-xs font-medium text-app-muted"} selectable>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day)}</Text>
                  {/*
                    The ring reports how much of that day's calorie goal was
                    logged: amber while short of it, green once reached. Days
                    with nothing logged draw no track, so they keep the dashed
                    outline from `main-dashbaord.png` rather than reading as a
                    0% result.
                  */}
                  <ProgressRing
                    color={goalMet ? calendarStatusColors.met : calendarStatusColors.partial}
                    size={44}
                    thickness={3}
                    trackColor={progress > 0 ? colors.border : "transparent"}
                    value={progress}
                  >
                    <View className={selected ? "h-9.5 w-9.5 items-center justify-center rounded-full bg-[#111111]" : progress > 0 ? "h-9.5 w-9.5 items-center justify-center rounded-full bg-white" : "h-9.5 w-9.5 items-center justify-center rounded-full border border-dashed border-app-border bg-white"}>
                      <Text className={selected ? "text-base font-bold text-white" : upcoming ? "text-base font-semibold text-app-subtle" : "text-base font-semibold text-app-text"} selectable style={{ fontVariant: ["tabular-nums"] }}>{day.getDate()}</Text>
                    </View>
                  </ProgressRing>
                </Pressable>
              );
            })}
          </View>
        )) : null}
      </ScrollView>
    </View>
  );
}
