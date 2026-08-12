import type { GoalType, MealType, NutritionValues } from "@/types/domain";

export type CatalogFood = NutritionValues & {
  id: string;
  title: string;
  serving: string;
  category: "breakfast" | "lunch" | "dinner" | "snack" | "shakes";
  mealTypes: MealType[];
  goalTypes: GoalType[];
  description: string;
  imageUrl: string;
};

export const curatedFoods: CatalogFood[] = [
  {
    id: "chicken-rice-power-bowl",
    title: "Chicken & Rice Power Bowl",
    serving: "1 bowl",
    calories: 720,
    proteinGrams: 45,
    carbsGrams: 78,
    fatGrams: 28,
    category: "lunch",
    mealTypes: ["lunch", "dinner"],
    goalTypes: ["gain", "maintain"],
    description: "Grilled chicken, jasmine rice, avocado, and garlic aioli.",
    imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "steak-alfredo-pasta",
    title: "Steak Alfredo Pasta",
    serving: "1 plate",
    calories: 980,
    proteinGrams: 55,
    carbsGrams: 96,
    fatGrams: 38,
    category: "dinner",
    mealTypes: ["dinner", "lunch"],
    goalTypes: ["gain"],
    description: "Creamy alfredo pasta with tender steak and parmesan.",
    imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281288?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "protein-pancake-stack",
    title: "Protein Pancake Stack",
    serving: "1 stack",
    calories: 850,
    proteinGrams: 42,
    carbsGrams: 102,
    fatGrams: 30,
    category: "breakfast",
    mealTypes: ["breakfast"],
    goalTypes: ["gain", "maintain"],
    description: "Fluffy protein pancakes with eggs, bacon, and maple syrup.",
    imageUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "peanut-butter-mass-shake",
    title: "Peanut Butter Mass Shake",
    serving: "1 glass",
    calories: 650,
    proteinGrams: 32,
    carbsGrams: 88,
    fatGrams: 22,
    category: "shakes",
    mealTypes: ["snack", "breakfast"],
    goalTypes: ["gain", "maintain"],
    description: "Peanut butter, banana, oats, protein, and whole milk.",
    imageUrl: "https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80",
  },
  {
    id: "greek-yogurt-berries",
    title: "Greek Yogurt and Berries",
    serving: "1 bowl",
    calories: 280,
    proteinGrams: 25,
    carbsGrams: 32,
    fatGrams: 6,
    category: "snack",
    mealTypes: ["breakfast", "snack"],
    goalTypes: ["lose", "maintain"],
    description: "High protein greek yogurt with fresh mixed berries.",
    imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=80",
  },
];
