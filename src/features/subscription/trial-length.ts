/** RevenueCat reports an intro period as DAY, WEEK, MONTH or YEAR. */
const TRIAL_UNIT_DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

export type IntroPriceLike = {
  price: number;
  periodUnit: string;
  periodNumberOfUnits: number;
  cycles: number;
};

/**
 * Confirmed zero-price trial length, in whole days.
 *
 * Reading only `DAY` left the common one-week store trial with no length, which
 * the count-based paywall copy then rendered as "0 days free". Returns null
 * whenever the length cannot be established — the caller must then fall back to
 * non-trial copy rather than promise a duration the store never confirmed.
 */
export function freeTrialDays(intro: IntroPriceLike | null | undefined) {
  if (!intro || intro.price !== 0) return null;
  const unitDays = TRIAL_UNIT_DAYS[intro.periodUnit?.toUpperCase()];
  if (!unitDays) return null;
  const days = unitDays * intro.periodNumberOfUnits * Math.max(1, intro.cycles);
  return days > 0 ? days : null;
}
