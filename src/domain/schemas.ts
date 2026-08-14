import { z } from "zod";

export const nutritionValuesSchema = z.object({
  calories: z.number().finite().min(0).max(10_000),
  proteinGrams: z.number().finite().min(0).max(1_000),
  carbsGrams: z.number().finite().min(0).max(2_000),
  fatGrams: z.number().finite().min(0).max(1_000),
});

/**
 * What an AI estimate reports, which is more than a day total is built from.
 *
 * The four values in `nutritionValuesSchema` drive targets and daily totals and
 * are always present. These four are descriptive detail for the scan result, and
 * are `nullish` on purpose: the provider returns null when the photo does not
 * support a value, and estimates stored before this field existed have no key at
 * all. Both mean "not estimated", which is displayed as such rather than as 0.
 */
export const estimateNutritionSchema = nutritionValuesSchema.extend({
  saturatedFatGrams: z.number().finite().min(0).max(1_000).nullish(),
  fiberGrams: z.number().finite().min(0).max(500).nullish(),
  sugarGrams: z.number().finite().min(0).max(1_000).nullish(),
  sodiumMilligrams: z.number().finite().min(0).max(50_000).nullish(),
});

export const nutritionEstimateSchema = z.object({
  mealName: z.string().trim().min(1).max(120),
  components: z.array(
    z.object({
      name: z.string().trim().min(1).max(100),
      portion: z.string().trim().min(1).max(100),
    }),
  ).min(1).max(25),
  nutrition: estimateNutritionSchema,
  confidence: z.enum(["low", "medium", "high"]),
  warnings: z.array(z.string().trim().max(240)).max(10),
});

export type NutritionEstimate = z.infer<typeof nutritionEstimateSchema>;

export interface NutritionAIProvider {
  analyzeMeal(input: {
    storageId: string;
    locale: string;
    requestId: string;
  }): Promise<NutritionEstimate>;
}
