import type { GoalType, MealType, NutritionValues } from "@/types/domain";

export type CatalogFood = NutritionValues & {
  id: string;
  title: string;
  serving: string;
  mealTypes: MealType[];
  goalTypes: GoalType[];
  description: string;
};

export const curatedFoods: CatalogFood[] = [
  { id: "protein-oats", title: "Peanut Butter Banana Oats", serving: "1 bowl", calories: 680, proteinGrams: 24, carbsGrams: 84, fatGrams: 29, mealTypes: ["breakfast", "snack"], goalTypes: ["gain", "maintain"], description: "Calorie-dense oats with protein and satisfying fats." },
  { id: "chicken-bowl", title: "Chicken Rice Bowl", serving: "1 bowl", calories: 685, proteinGrams: 48, carbsGrams: 76, fatGrams: 20, mealTypes: ["lunch", "dinner"], goalTypes: ["lose", "maintain", "gain"], description: "A balanced bowl with a strong protein base." },
  { id: "yogurt-berries", title: "Greek Yogurt and Berries", serving: "1 bowl", calories: 280, proteinGrams: 25, carbsGrams: 32, fatGrams: 6, mealTypes: ["breakfast", "snack"], goalTypes: ["lose", "maintain"], description: "High protein with fruit and a moderate calorie total." },
];
