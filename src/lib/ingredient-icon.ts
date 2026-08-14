import type { AppIconName } from "@/components/app-icon";

/**
 * Picks the glyph that leads an ingredient row on the food-detail screen.
 *
 * Catalog ingredients are free-form strings, so this is keyword matching, not a
 * lookup: `"Nonfat Greek Yogurt"` has to resolve through `yogurt`. Matching is
 * accent- and case-insensitive and runs longest-keyword-first, so `"almond
 * milk"` is a nut drink rather than dairy and `"peanut butter"` is a nut rather
 * than butter.
 *
 * Anything unrecognised falls back to the neutral cutlery glyph. That fallback
 * is the point: a wrong-but-confident icon reads as information about the food,
 * and this function has none — it only knows what the words look like.
 *
 * Catalog ingredients are stored in English only (`foodCatalog.ingredients` is
 * a plain string array, unlike the localized `titles`/`descriptions` records),
 * so English keywords match the data as it is actually written. Localized
 * ingredient text would need a schema change and re-seeding first.
 */

type Rule = { first?: true; icon: AppIconName; keywords: string[] };

const rules: Rule[] = [
  /*
    Condiments win outright. "Garlic aioli" and "sesame dressing" are a fat and
    a fat, whatever the flavouring in front of them is called, and the flavouring
    is usually the longer word.
  */
  {
    first: true,
    icon: "ingredientFat",
    keywords: ["oil", "aioli", "dressing", "mayo", "mayonnaise", "sauce", "pesto", "hummus", "ghee", "lard", "vinaigrette"],
  },
  {
    icon: "ingredientSupplement",
    keywords: ["whey", "casein", "protein powder", "protein concentrate", "protein isolate", "collagen"],
  },
  {
    icon: "ingredientNut",
    keywords: [
      "peanut",
      "almond",
      "cashew",
      "walnut",
      "pecan",
      "pistachio",
      "hazelnut",
      "sesame",
      "tahini",
      "chia",
      "flax",
      "sunflower seed",
      "pumpkin seed",
      "nut butter",
    ],
  },
  {
    icon: "ingredientFish",
    keywords: ["salmon", "tuna", "cod", "haddock", "sardine", "anchovy", "mackerel", "trout", "shrimp", "prawn", "crab", "fish"],
  },
  {
    icon: "ingredientMeat",
    keywords: [
      "chicken",
      "turkey",
      "beef",
      "steak",
      "sirloin",
      "mince",
      "bacon",
      "pork",
      "ham",
      "lamb",
      "sausage",
      "meatball",
      "prosciutto",
      "salami",
      "venison",
    ],
  },
  { icon: "ingredientEgg", keywords: ["egg"] },
  {
    icon: "ingredientDairy",
    keywords: ["yogurt", "yoghurt", "cheese", "parmesan", "mozzarella", "feta", "ricotta", "cottage", "milk", "cream", "butter", "kefir", "quark"],
  },
  {
    icon: "ingredientGrain",
    keywords: [
      "rice",
      "oat",
      "quinoa",
      "flour",
      "pasta",
      "fettuccine",
      "spaghetti",
      "noodle",
      "bread",
      "tortilla",
      "wrap",
      "bagel",
      "granola",
      "couscous",
      "barley",
      "buckwheat",
      "cereal",
      "bun",
      "wheat",
      "corn",
      "potato",
    ],
  },
  {
    icon: "ingredientFruit",
    keywords: [
      "banana",
      "berry",
      "berries",
      "blueberr",
      "strawberr",
      "raspberr",
      "blackberr",
      "apple",
      "pear",
      "mango",
      "pineapple",
      "peach",
      "orange",
      "grape",
      "melon",
      "kiwi",
      "cherry",
      "date",
      "fig",
      "raisin",
      "lemon",
      "lime",
    ],
  },
  {
    icon: "ingredientVegetable",
    keywords: [
      "spinach",
      "lettuce",
      "kale",
      "rocket",
      "arugula",
      "tomato",
      "avocado",
      "edamame",
      "broccoli",
      "cauliflower",
      "carrot",
      "pepper",
      "onion",
      "garlic",
      "cucumber",
      "courgette",
      "zucchini",
      "aubergine",
      "eggplant",
      "mushroom",
      "pea",
      "bean",
      "lentil",
      "chickpea",
      "cabbage",
      "asparagus",
      "celery",
      "beet",
      "salad",
      "greens",
      "herb",
      "basil",
      "parsley",
      "coriander",
      "cilantro",
    ],
  },
  {
    icon: "ingredientSweetener",
    keywords: ["honey", "syrup", "sugar", "chocolate", "cocoa", "cacao", "vanilla", "jam", "caramel", "molasses", "agave"],
  },
  {
    icon: "ingredientBeverage",
    keywords: ["water", "juice", "coffee", "espresso", "tea", "matcha", "smoothie", "shake", "broth", "stock", "soda"],
  },
];

/**
 * Condiment keywords first, then everything else longest-keyword-first so a
 * two-word keyword beats a one-word keyword that is a substring of the same
 * ingredient. `sort` is stable, so keywords of equal length keep the rule order
 * declared above — which is what makes "peanut butter" a nut and not a dairy.
 */
const matchers = rules
  .flatMap((rule) => rule.keywords.map((keyword) => ({ first: rule.first === true, icon: rule.icon, keyword })))
  .sort((a, b) => Number(b.first) - Number(a.first) || b.keyword.length - a.keyword.length);

/** Strips diacritics and case so `Café`, `CAFÉ` and `cafe` all match `coffee`'s neighbours. */
function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function ingredientIcon(ingredient: string): AppIconName {
  const text = normalize(ingredient);
  return matchers.find((matcher) => text.includes(matcher.keyword))?.icon ?? "foods";
}
