import { ConvexError } from "convex/values";

import { NUTRITION_LIMITS } from "./nutrition";

/**
 * Server-side argument validation. Convex validators guarantee the *shape* of an
 * argument; these helpers guarantee its *meaning*. Every public mutation that
 * accepts a number, a date, or a free-text string routes through here so a
 * modified client cannot persist implausible health data.
 */

export const LIMITS = {
  foodName: 120,
  serving: 60,
  servingUnit: 24,
  note: 500,
  locale: 35,
  timezone: 64,
  searchQuery: 80,
  feedback: 1_000,
  maxQuantity: 100,
  maxCaloriesPerEntry: 20_000,
  maxMacroGrams: 2_000,
} as const;

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const CLOCK_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
/** BCP-47-ish: letters, digits and hyphens only. Deliberately conservative. */
const LOCALE_TAG = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{2,8})*$/;
/** IANA zone names: `Area/Location`, `Area/Region/Location`, or `UTC`. */
const TIMEZONE = /^(UTC|[A-Za-z]+(?:_[A-Za-z]+)*(?:\/[A-Za-z0-9+\-_]+){1,2})$/;

function fail(message: string): never {
  throw new ConvexError(message);
}

export function isValidLocalDate(value: string) {
  const match = LOCAL_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (year < 1_900 || year > 2_200 || month < 1 || month > 12 || day < 1) return false;
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function assertLocalDate(value: string, field = "date"): string {
  if (!isValidLocalDate(value)) fail(`${field} must be a real calendar date in YYYY-MM-DD format`);
  return value;
}

export function assertLocalDateRange(fromDate: string, toDate: string) {
  assertLocalDate(fromDate, "fromDate");
  assertLocalDate(toDate, "toDate");
  if (fromDate > toDate) fail("fromDate must not be after toDate");
  return { fromDate, toDate };
}

export function assertClockTime(value: string, field = "time"): string {
  if (!CLOCK_TIME.test(value)) fail(`${field} must be a 24-hour HH:MM time`);
  return value;
}

export function assertLocale(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > LIMITS.locale || !LOCALE_TAG.test(trimmed)) {
    fail("locale must be a valid language tag");
  }
  return trimmed;
}

export function assertTimezone(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 3 || trimmed.length > LIMITS.timezone || !TIMEZONE.test(trimmed)) {
    fail("timezone must be a valid IANA time zone name");
  }
  return trimmed;
}

export function assertBoundedString(value: string, max: number, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) fail(`${field} must not be empty`);
  if (trimmed.length > max) fail(`${field} must be ${max} characters or fewer`);
  return trimmed;
}

export function assertOptionalBoundedString(
  value: string | undefined,
  max: number,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > max) fail(`${field} must be ${max} characters or fewer`);
  return trimmed;
}

export function assertFiniteInRange(value: number, min: number, max: number, field: string): number {
  if (!Number.isFinite(value)) fail(`${field} must be a finite number`);
  if (value < min || value > max) fail(`${field} must be between ${min} and ${max}`);
  return value;
}

export function assertInteger(value: number, min: number, max: number, field: string): number {
  if (!Number.isInteger(value)) fail(`${field} must be a whole number`);
  return assertFiniteInRange(value, min, max, field);
}

/** Nutrition attached to a single logged entry. */
export function assertEntryNutrition(input: {
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}) {
  assertFiniteInRange(input.quantity, 0.05, LIMITS.maxQuantity, "quantity");
  assertFiniteInRange(input.calories, 0, LIMITS.maxCaloriesPerEntry, "calories");
  assertFiniteInRange(input.proteinGrams, 0, LIMITS.maxMacroGrams, "proteinGrams");
  assertFiniteInRange(input.carbsGrams, 0, LIMITS.maxMacroGrams, "carbsGrams");
  assertFiniteInRange(input.fatGrams, 0, LIMITS.maxMacroGrams, "fatGrams");
}

/** Daily targets stored on a nutritionGoals row. */
export function assertDailyTargets(input: {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}) {
  assertFiniteInRange(input.calories, NUTRITION_LIMITS.minCalories, NUTRITION_LIMITS.maxCalories, "calories");
  assertFiniteInRange(input.proteinGrams, 20, 600, "proteinGrams");
  assertFiniteInRange(input.carbsGrams, 0, 1_500, "carbsGrams");
  assertFiniteInRange(input.fatGrams, 10, 600, "fatGrams");
}

export function assertBodyMetrics(input: {
  heightCm: number;
  currentWeightKg: number;
  goalWeightKg: number;
}) {
  assertFiniteInRange(
    input.heightCm,
    NUTRITION_LIMITS.minHeightCm,
    NUTRITION_LIMITS.maxHeightCm,
    "heightCm",
  );
  assertFiniteInRange(
    input.currentWeightKg,
    NUTRITION_LIMITS.minWeightKg,
    NUTRITION_LIMITS.maxWeightKg,
    "currentWeightKg",
  );
  assertFiniteInRange(
    input.goalWeightKg,
    NUTRITION_LIMITS.minWeightKg,
    NUTRITION_LIMITS.maxWeightKg,
    "goalWeightKg",
  );
}

/**
 * Adults only. `dateOfBirth` must be a real date that puts the user inside the
 * supported 18–80 window today.
 */
export function assertAdultDateOfBirth(dateOfBirth: string, now = new Date()): string {
  assertLocalDate(dateOfBirth, "dateOfBirth");
  const birthYear = Number(dateOfBirth.slice(0, 4));
  const age = now.getUTCFullYear() - birthYear;
  if (age < NUTRITION_LIMITS.minAge - 1 || age > NUTRITION_LIMITS.maxAge + 1) {
    fail(`BodyCal supports adults ages ${NUTRITION_LIMITS.minAge} to ${NUTRITION_LIMITS.maxAge}`);
  }
  return dateOfBirth;
}

/** Clamp a client-supplied page size into a server-controlled window. */
export function boundedLimit(value: number | undefined, fallback: number, max: number) {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 1), max);
}

/**
 * Validates image bytes by inspecting signature magic bytes.
 * Returns the verified MIME type or null if the signature does not match supported image formats.
 */
export function detectImageMimeType(buffer: Uint8Array): string | null {
  if (buffer.length < 8) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  // WEBP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }
  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 && // G
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x38 && // 8
    (buffer[4] === 0x37 || buffer[4] === 0x39) && // 7 or 9
    buffer[5] === 0x61 // a
  ) {
    return "image/gif";
  }

  return null;
}

export function assertImageMimeType(buffer: Uint8Array): string {
  const mime = detectImageMimeType(buffer);
  if (!mime) {
    fail("Uploaded image file is corrupted or does not have a supported image format (JPEG, PNG, WebP, GIF).");
  }
  return mime;
}
