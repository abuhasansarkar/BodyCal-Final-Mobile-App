export const DASHBOARD_WEEK_OFFSETS = [-2, -1, 0] as const;

export function atLocalNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export function startOfWeek(date: Date) {
  const value = atLocalNoon(date);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

export function getDashboardWeeks(today: Date) {
  const currentWeek = startOfWeek(today);
  return DASHBOARD_WEEK_OFFSETS.map((offset) => {
    const weekStart = new Date(currentWeek);
    weekStart.setDate(currentWeek.getDate() + offset * 7);
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return day;
    });
  });
}

export function dateInWeekForWeekday(week: Date[], weekday: number) {
  return atLocalNoon(week[Math.min(Math.max(weekday, 0), 6)]);
}

export function formatWeekRange(start: Date, end: Date, locale?: string) {
  const formatter = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}
