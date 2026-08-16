import { describe, expect, it } from "@jest/globals";

import {
  calculateQuietHoursAdjustedTime,
  DEFAULT_REMINDER_TIMES,
} from "@/features/notifications/scheduler";

describe("notification scheduler", () => {
  it("provides default reminder times for all categories", () => {
    expect(DEFAULT_REMINDER_TIMES.daily).toBe("20:00");
    expect(DEFAULT_REMINDER_TIMES.meal).toBe("08:00");
    expect(DEFAULT_REMINDER_TIMES.hydration).toBe("11:00");
    expect(DEFAULT_REMINDER_TIMES.progress).toBe("09:00");
    expect(DEFAULT_REMINDER_TIMES.motivation).toBe("18:00");
  });

  it("leaves reminder times unchanged when outside quiet hours", () => {
    const time = { hour: 14, minute: 30 };
    const adjusted = calculateQuietHoursAdjustedTime(time, "22:00", "07:00");
    expect(adjusted).toEqual({ hour: 14, minute: 30 });
  });

  it("shifts reminder times to quietEnd when falling inside midnight-spanning quiet hours", () => {
    // 23:30 is between 22:00 and 07:00
    const time = { hour: 23, minute: 30 };
    const adjusted = calculateQuietHoursAdjustedTime(time, "22:00", "07:00");
    expect(adjusted).toEqual({ hour: 7, minute: 0 });

    // 05:15 is between 22:00 and 07:00
    const earlyMorning = { hour: 5, minute: 15 };
    const adjustedEarly = calculateQuietHoursAdjustedTime(earlyMorning, "22:00", "07:00");
    expect(adjustedEarly).toEqual({ hour: 7, minute: 0 });
  });

  it("shifts reminder times to quietEnd when falling inside daytime quiet hours", () => {
    // 14:00 is between 13:00 and 16:00
    const time = { hour: 14, minute: 0 };
    const adjusted = calculateQuietHoursAdjustedTime(time, "13:00", "16:00");
    expect(adjusted).toEqual({ hour: 16, minute: 0 });
  });
});
