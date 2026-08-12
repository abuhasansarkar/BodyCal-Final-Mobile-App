import { describe, expect, it } from "@jest/globals";

import { dateInWeekForWeekday, formatWeekRange, getDashboardWeeks, startOfWeek } from "./week-range";

describe("dashboard week range", () => {
  const today = new Date(2026, 7, 12, 9);

  it("contains exactly the previous two weeks and the current week", () => {
    const weeks = getDashboardWeeks(today);
    expect(weeks).toHaveLength(3);
    expect(weeks[0][0]).toEqual(new Date(2026, 6, 26, 12));
    expect(weeks[1][0]).toEqual(new Date(2026, 7, 2, 12));
    expect(weeks[2][0]).toEqual(new Date(2026, 7, 9, 12));
    expect(weeks[2][0]).toEqual(startOfWeek(today));
  });

  it("never creates a future-week page", () => {
    const weeks = getDashboardWeeks(today);
    expect(weeks.at(-1)?.at(-1)).toEqual(new Date(2026, 7, 15, 12));
    expect(weeks.every((week) => week[0] <= startOfWeek(today))).toBe(true);
  });

  it("preserves the selected weekday while swiping", () => {
    const weeks = getDashboardWeeks(today);
    expect(dateInWeekForWeekday(weeks[1], today.getDay())).toEqual(new Date(2026, 7, 5, 12));
  });

  it("formats an accessible week range without Intl formatRange", () => {
    const weeks = getDashboardWeeks(today);
    expect(formatWeekRange(weeks[2][0], weeks[2][6], "en-US")).toBe("Aug 9 – Aug 15");
  });
});
