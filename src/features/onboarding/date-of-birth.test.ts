import { describe, expect, it } from "@jest/globals";

import { ageFromDateOfBirth, NUTRITION_LIMITS } from "@/domain/nutrition-calculator";
import { deriveDateOfBirth } from "@/features/onboarding/date-of-birth";

/**
 * `onboarding.complete` recomputes the age from the derived date of birth and
 * rejects anything outside the supported range. A derivation that does not
 * round-trip therefore fails the very last step of onboarding with no way past
 * it, which is exactly what a mid-year placeholder birthday did to every
 * 18-year-old signing up between January and June.
 */
describe("deriveDateOfBirth", () => {
  const daysOfYear = ["01-01", "02-28", "06-30", "07-01", "07-02", "12-31"];
  const ages = [NUTRITION_LIMITS.minAge, 25, 47, NUTRITION_LIMITS.maxAge];

  it.each(daysOfYear)("round-trips every supported age on %s", (day) => {
    const now = new Date(`2026-${day}T12:00:00.000Z`);
    for (const age of ages) {
      const derived = deriveDateOfBirth(age, now);
      expect(derived.age).toBe(age);
      expect(ageFromDateOfBirth(derived.dateOfBirth, now)).toBe(age);
    }
  });

  it("round-trips either side of midnight on New Year", () => {
    for (const instant of ["2026-01-01T00:00:00.000Z", "2026-12-31T23:59:59.000Z"]) {
      const now = new Date(instant);
      const derived = deriveDateOfBirth(NUTRITION_LIMITS.minAge, now);
      expect(ageFromDateOfBirth(derived.dateOfBirth, now)).toBe(NUTRITION_LIMITS.minAge);
    }
  });

  it("clamps an out-of-range age into the supported window", () => {
    const now = new Date("2026-03-15T12:00:00.000Z");
    expect(deriveDateOfBirth(12, now).age).toBe(NUTRITION_LIMITS.minAge);
    expect(deriveDateOfBirth(120, now).age).toBe(NUTRITION_LIMITS.maxAge);
  });

  it("records that the month and day were not supplied by the user", () => {
    expect(deriveDateOfBirth(30, new Date("2026-03-15T12:00:00.000Z")).precision).toBe("year");
  });
});
