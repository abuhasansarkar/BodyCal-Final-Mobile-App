import { NUTRITION_LIMITS } from "@/domain/nutrition-calculator";

/**
 * Onboarding collects an age, not a birthday.
 *
 * A date of birth is therefore derived, and the derivation is labelled
 * `precision: "year"` so the server and any later consumer know the month and day
 * were not supplied by the user.
 *
 * The derived birthday must be one that has *already passed* in the current year,
 * because `onboarding.complete` recomputes the age with `ageFromDateOfBirth` and
 * rejects anything outside 18–80. A mid-year 1 July date failed that check for
 * every 18-year-old who onboarded between January and June: the recomputed age
 * came back as 17 and the final step threw, with no way past it.
 *
 * 1 January is the only day of the year that round-trips exactly whatever the
 * current date is, so the age the user picked is the age the server recomputes.
 * The cost is that the stored month and day are a placeholder — which is what
 * `precision: "year"` exists to record.
 */
export function deriveDateOfBirth(age: number, now = new Date()) {
  const clampedAge = Math.min(
    NUTRITION_LIMITS.maxAge,
    Math.max(NUTRITION_LIMITS.minAge, Math.round(age)),
  );
  // UTC, because `ageFromDateOfBirth` reads the current date in UTC. Taking the
  // local year here would put the two a year apart either side of New Year.
  const birthYear = now.getUTCFullYear() - clampedAge;
  return { dateOfBirth: `${birthYear}-01-01`, precision: "year" as const, age: clampedAge };
}
