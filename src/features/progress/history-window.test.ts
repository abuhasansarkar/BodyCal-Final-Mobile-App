import { describe, expect, it } from "@jest/globals";

import { inclusiveWindowStart } from "@/features/progress/history-window";

describe("inclusiveWindowStart", () => {
  it("uses 29 days of lookback for a 30-date inclusive window", () => {
    expect(inclusiveWindowStart("2026-08-16", 30)).toBe("2026-07-18");
  });

  it("handles month and year boundaries", () => {
    expect(inclusiveWindowStart("2026-01-01", 7)).toBe("2025-12-26");
  });
});
