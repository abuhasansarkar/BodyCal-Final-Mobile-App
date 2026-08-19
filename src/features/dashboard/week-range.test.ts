import { describe, expect, it } from "@jest/globals";

import {
  clampSelectableLocalDate,
  localDateToDate,
  dateInWeekForWeekday,
  formatWeekRange,
  getDashboardWeeks,
  isSelectableLocalDate,
  startOfWeek,
} from "./week-range";

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

describe("selectable day bounds", () => {
  const bounds = { earliestLocalDate: "2026-08-10", todayLocalDate: "2026-08-19" };

  it("allows every day from sign-up to today, inclusive at both ends", () => {
    expect(isSelectableLocalDate("2026-08-10", bounds)).toBe(true);
    expect(isSelectableLocalDate("2026-08-14", bounds)).toBe(true);
    expect(isSelectableLocalDate("2026-08-19", bounds)).toBe(true);
  });

  it("refuses a day before the account existed", () => {
    // The strip renders three whole weeks, so it reaches back past sign-up for
    // any account younger than that.
    expect(isSelectableLocalDate("2026-08-09", bounds)).toBe(false);
    expect(isSelectableLocalDate("2026-07-30", bounds)).toBe(false);
  });

  it("refuses a day that has not happened", () => {
    expect(isSelectableLocalDate("2026-08-20", bounds)).toBe(false);
  });

  it("leaves the range open below when the sign-up day is unknown", () => {
    const open = { todayLocalDate: "2026-08-19" };
    expect(isSelectableLocalDate("2020-01-01", open)).toBe(true);
    expect(isSelectableLocalDate("2026-08-20", open)).toBe(false);
  });

  it("clamps a swipe to the nearest day the user could have tapped", () => {
    expect(clampSelectableLocalDate("2026-08-02", bounds)).toBe("2026-08-10");
    expect(clampSelectableLocalDate("2026-08-25", bounds)).toBe("2026-08-19");
    expect(clampSelectableLocalDate("2026-08-14", bounds)).toBe("2026-08-14");
  });
});

describe("localDateToDate", () => {
  it("parses a local date at noon", () => {
    expect(localDateToDate("2026-08-19")).toEqual(new Date(2026, 7, 19, 12));
  });

  /*
    Reached from render on the dashboard's week strip, where a throw costs the
    whole screen: a missing prop once surfaced as "Cannot read property 'split'
    of undefined" and the error boundary reported it as a failed dashboard load.
  */
  it.each([undefined, null, "", "not-a-date", "2026-8-9"])(
    "falls back to today rather than throwing on %p",
    (value) => {
      const result = localDateToDate(value as unknown as string);
      expect(result).toBeInstanceOf(Date);
      expect(Number.isNaN(result.getTime())).toBe(false);
      expect(result.getHours()).toBe(12);
    },
  );
});
