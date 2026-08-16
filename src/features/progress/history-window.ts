/** Returns the first date in an inclusive calendar-day window ending on `today`. */
export function inclusiveWindowStart(todayLocalDate: string, dayCount: number) {
  if (!Number.isInteger(dayCount) || dayCount < 1) throw new Error("invalid_day_count");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(todayLocalDate);
  if (!match) throw new Error("invalid_local_date");
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  value.setUTCDate(value.getUTCDate() - (dayCount - 1));
  return value.toISOString().slice(0, 10);
}
