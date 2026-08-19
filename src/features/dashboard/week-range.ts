export const DASHBOARD_WEEK_OFFSETS = [-2, -1, 0] as const;

export function atLocalNoon(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

/**
 * A local `YYYY-MM-DD` back to a Date at local noon.
 *
 * Noon rather than midnight so a daylight-saving shift cannot push the value
 * onto the neighbouring day. Callers pass the date string rather than
 * `new Date()` so that "which day is it" is an explicit input — which is what
 * lets the dashboard recompute its week strip when the day actually changes.
 */
export function localDateToDate(localDate: string) {
  /*
    Guarded because this parses the value every dashboard read is keyed on, and
    it is reached from render. A malformed or missing date used to throw
    `Cannot read property 'split' of undefined` straight out of the week strip,
    which the dashboard error boundary then reported as "we couldn't load your
    dashboard" — a whole screen lost to one bad string. Today is the honest
    fallback: it is what every caller here is asking about anyway.
  */
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate ?? "");
  if (!match) return atLocalNoon(new Date());
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
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

/**
 * The days the dashboard strip will let you open.
 *
 * Two bounds, for two different reasons. Nothing can be logged after today, and
 * nothing can be logged before the account existed — the strip always renders
 * three whole weeks, so a day-old account reaches back as far as twenty days it
 * never had. Those days used to open an empty diary, which reads as data that
 * went missing rather than as a day that never happened.
 *
 * Both bounds are inclusive, and all three values are local `YYYY-MM-DD`, which
 * compares correctly as a string.
 */
export type SelectableDayBounds = { earliestLocalDate?: string; todayLocalDate: string };

export function isSelectableLocalDate(localDate: string, bounds: SelectableDayBounds) {
  if (localDate > bounds.todayLocalDate) return false;
  return bounds.earliestLocalDate === undefined || localDate >= bounds.earliestLocalDate;
}

/** The nearest day the user could actually have tapped. */
export function clampSelectableLocalDate(localDate: string, bounds: SelectableDayBounds) {
  if (localDate > bounds.todayLocalDate) return bounds.todayLocalDate;
  if (bounds.earliestLocalDate !== undefined && localDate < bounds.earliestLocalDate) {
    return bounds.earliestLocalDate;
  }
  return localDate;
}
