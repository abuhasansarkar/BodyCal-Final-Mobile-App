import { NUTRITION_LIMITS } from "@/domain/nutrition-calculator";

/**
 * Onboarding collects an age, not a birthday.
 *
 * A date of birth is therefore derived, and the derivation is labelled
 * `precision: "year"` so the server and any later consumer know the month and day
 * were not supplied by the user. Previously the app wrote
 * `${year - age}-01-01` and stored it as if it were a real birthday, which also
 * let the recomputed age drift below the supported minimum.
 *
 * Mid-year (1 July) is used rather than 1 January so the round-trip age stays
 * within a year of what the user actually selected regardless of the current date.
 */
export function deriveDateOfBirth(age: number, now = new Date()) {
  const clampedAge = Math.min(
    NUTRITION_LIMITS.maxAge,
    Math.max(NUTRITION_LIMITS.minAge, Math.round(age)),
  );
  const birthYear = now.getFullYear() - clampedAge;
  return { dateOfBirth: `${birthYear}-07-01`, precision: "year" as const, age: clampedAge };
}
