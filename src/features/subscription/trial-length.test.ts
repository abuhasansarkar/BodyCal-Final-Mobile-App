import { describe, expect, it } from "@jest/globals";

import { freeTrialDays, type IntroPriceLike } from "@/features/subscription/trial-length";

const intro = (overrides: Partial<IntroPriceLike>): IntroPriceLike => ({
  price: 0,
  periodUnit: "DAY",
  periodNumberOfUnits: 7,
  cycles: 1,
  ...overrides,
});

describe("free trial length", () => {
  it("reads a trial measured in days", () => {
    expect(freeTrialDays(intro({ periodUnit: "DAY", periodNumberOfUnits: 7 }))).toBe(7);
  });

  it("converts week, month and year trials instead of reporting no length", () => {
    // A one-week trial previously produced null, which the paywall rendered as "0 days free".
    expect(freeTrialDays(intro({ periodUnit: "WEEK", periodNumberOfUnits: 1 }))).toBe(7);
    expect(freeTrialDays(intro({ periodUnit: "MONTH", periodNumberOfUnits: 1 }))).toBe(30);
    expect(freeTrialDays(intro({ periodUnit: "YEAR", periodNumberOfUnits: 1 }))).toBe(365);
  });

  it("accepts the unit in either case", () => {
    expect(freeTrialDays(intro({ periodUnit: "week", periodNumberOfUnits: 2 }))).toBe(14);
  });

  it("never reports a length for a priced introductory offer", () => {
    expect(freeTrialDays(intro({ price: 4.99 }))).toBeNull();
  });

  it("reports no length when the unit is unrecognised", () => {
    expect(freeTrialDays(intro({ periodUnit: "FORTNIGHT" }))).toBeNull();
    expect(freeTrialDays(intro({ periodUnit: "" }))).toBeNull();
  });

  it("never returns zero days", () => {
    expect(freeTrialDays(intro({ periodNumberOfUnits: 0 }))).toBeNull();
  });

  it("treats a missing intro price as no trial", () => {
    expect(freeTrialDays(null)).toBeNull();
    expect(freeTrialDays(undefined)).toBeNull();
  });
});
