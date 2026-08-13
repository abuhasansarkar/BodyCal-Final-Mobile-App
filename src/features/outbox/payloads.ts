import { z } from "zod";

/**
 * Schemas for queued offline writes.
 *
 * The outbox is persisted JSON, so a record can outlive the build that wrote it.
 * Validating here means a stale or malformed payload is dropped locally instead of
 * being cast to `never` and pushed at the server.
 */

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const nonNegative = z.number().finite().min(0);

export const foodLogPayloadSchema = z.object({
  localDate,
  timezone: z.string().min(3).max(64),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  source: z.enum(["ai", "manual", "catalog"]),
  foodName: z.string().min(1).max(120),
  serving: z.string().min(1).max(60),
  servingUnit: z.string().min(1).max(24),
  quantity: z.number().finite().min(0.05).max(100),
  calories: nonNegative.max(20_000),
  proteinGrams: nonNegative.max(2_000),
  carbsGrams: nonNegative.max(2_000),
  fatGrams: nonNegative.max(2_000),
  clientRequestId: z.string().min(1).max(64),
});

export const weightPayloadSchema = z.object({
  normalizedKg: z.number().finite().min(35).max(350),
  displayValue: z.number().finite().min(1).max(1_000),
  displayUnit: z.enum(["kg", "lb"]),
  localDate,
  timezone: z.string().min(3).max(64),
  note: z.string().max(500).optional(),
  clientRequestId: z.string().min(1).max(64),
});

export type FoodLogPayload = z.infer<typeof foodLogPayloadSchema>;
export type WeightPayload = z.infer<typeof weightPayloadSchema>;
