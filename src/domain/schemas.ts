import { z } from "zod";

export const nutritionValuesSchema = z.object({
  calories: z.number().finite().min(0).max(10_000),
  proteinGrams: z.number().finite().min(0).max(1_000),
  carbsGrams: z.number().finite().min(0).max(2_000),
  fatGrams: z.number().finite().min(0).max(1_000),
});

export const nutritionEstimateSchema = z.object({
  mealName: z.string().trim().min(1).max(120),
  components: z.array(
    z.object({
      name: z.string().trim().min(1).max(100),
      portion: z.string().trim().min(1).max(100),
    }),
  ).min(1).max(25),
  nutrition: nutritionValuesSchema,
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
