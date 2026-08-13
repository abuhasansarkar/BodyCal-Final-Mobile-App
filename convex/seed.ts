import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Seed data.
 *
 * Every entry point here is an INTERNAL mutation. These functions were previously
 * public, which let any caller write to the shared food catalog on production and
 * let any signed-in user inject fabricated weight and nutrition history into their
 * own health record. Run them from the Convex dashboard or CLI:
 *
 *   npx convex run seed:seedCatalog
 *   npx convex run seed:seedDemoDataForUser '{"clerkUserId":"user_..."}'
 *
 * The demo-data function requires an explicit target account, so writing
 * synthetic health data is always a deliberate act rather than a side effect.
 */

type GoalType = "lose" | "maintain" | "gain";
type MealType = "breakfast" | "lunch" | "dinner" | "snack";

type SeedCatalogItem = {
  slug: string;
  titles: Record<string, string>;
  descriptions: Record<string, string>;
  goalTypes: GoalType[];
  mealTypes: MealType[];
  serving: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  ingredients: string[];
};

const catalogSeedItems: SeedCatalogItem[] = [
  {
    slug: "chicken-rice-power-bowl",
    titles: {
      en: "Chicken & Rice Power Bowl",
      es: "Tazón de Pollo y Arroz",
      de: "Hähnchen & Reis Power Bowl",
      fr: "Bol Énergie Poulet et Riz",
      "pt-BR": "Tigela de Frango e Arroz",
      it: "Bowl Proteica con Pollo e Riso",
      ja: "チキン＆ライスパワーボウル",
      ko: "치킨 & 라이스 파워 보울",
    },
    descriptions: {
      en: "Grilled chicken breast, jasmine rice, avocado, and garlic aioli.",
      es: "Pechuga de pollo a la plancha, arroz jazmín, aguacate y alioli de ajo.",
      de: "Gegrillte Hähnchenbrust, Jasminreis, Avocado und Knoblauch-Aioli.",
      fr: "Poitrine de poulet grillée, riz jasmin, avocat et aïoli à l'ail.",
      "pt-BR": "Peito de frango grelhado, arroz jasmim, abacate e aioli de alho.",
      it: "Petto di pollo grigliato, riso jasmin, avocado e aioli all'aglio.",
      ja: "グリルチキン胸肉、ジャスミンライス、アボカド、ガーリックアイオリ。",
      ko: "구운 닭가슴살, 자스민 쌀, 아보카도, 마늘 아이올리.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 bowl (450g)",
    calories: 720,
    proteinGrams: 45,
    carbsGrams: 78,
    fatGrams: 28,
    ingredients: ["Chicken Breast", "Jasmine Rice", "Avocado", "Garlic Aioli", "Olive Oil"],
  },
  {
    slug: "steak-alfredo-pasta",
    titles: {
      en: "Steak Alfredo Pasta",
      es: "Pasta Alfredo con Filete",
      de: "Steak Alfredo Pasta",
      fr: "Pâtes Alfredo au Steak",
      "pt-BR": "Massa Alfredo com Bife",
      it: "Pasta Alfredo con Bistecca",
      ja: "ステーキアルフレードパスタ",
      ko: "스테이크 알프레도 파스타",
    },
    descriptions: {
      en: "Creamy alfredo fettuccine with tender grilled steak slices and parmesan.",
      es: "Fettuccine alfredo cremoso con finas tiras de filete a la plancha y parmesano.",
      de: "Cremige Fettuccine Alfredo mit zarten gegrillten Steakstreifen und Parmesan.",
      fr: "Fettuccine alfredo crémeuses avec fines tranches de steak grillé et parmesan.",
      "pt-BR": "Fettuccine alfredo cremoso com tiras de bife grelhado e parmesão.",
      it: "Fettuccine alfredo cremose con fettine di bistecca grigliata e parmigiano.",
      ja: "やわらかいグリルステーキとパルメザンチーズのクリーミーアルフレードパスタ。",
      ko: "부드러운 구운 스테이크 조각과 파마산 치즈를 더한 크림 알프레도 파스타.",
    },
    goalTypes: ["gain"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (500g)",
    calories: 980,
    proteinGrams: 55,
    carbsGrams: 96,
    fatGrams: 38,
    ingredients: ["Beef Sirloin Steak", "Fettuccine Pasta", "Heavy Cream", "Parmesan Cheese", "Butter"],
  },
  {
    slug: "protein-pancake-stack",
    titles: {
      en: "Protein Pancake Stack",
      es: "Torre de Pancakes Proteicos",
      de: "Proteinpancake-Stapel",
      fr: "Pancakes Protéinés Stack",
      "pt-BR": "Panquecas Proteicas",
      it: "Pancake Proteici",
      ja: "プロテインパンケーキ",
      ko: "프로틴 팬케이크 스택",
    },
    descriptions: {
      en: "Fluffy whey protein pancakes served with fresh eggs, bacon, and pure maple syrup.",
      es: "Pancakes esponjosos de proteína con huevos frescos, tocino y jarabe de arce.",
      de: "Fluffige Proteinpancakes serviert mit frischen Eiern, Speck und Ahornsirup.",
      fr: "Pancakes moelleux à la protéine servis avec œufs frais, bacon et sirop d'érable.",
      "pt-BR": "Panquecas fofas de proteína servidas com ovos frescos, bacon e xarope de bordo.",
      it: "Soffici pancake proteici serviti con uova fresche, bacon e sciroppo d'acero.",
      ja: "ふんわりプロテインパンケーキ。卵、ベーコン、メープルシロップ添え。",
      ko: "푹신한 프로틴 팬케이크에 달걀, 베이컨, 메이플 시럽을 첨가한 아침 식사.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["breakfast"],
    serving: "1 stack (3 pancakes)",
    calories: 850,
    proteinGrams: 42,
    carbsGrams: 102,
    fatGrams: 30,
    ingredients: ["Whey Protein Concentrate", "Oat Flour", "Eggs", "Turkey Bacon", "Maple Syrup"],
  },
  {
    slug: "peanut-butter-mass-shake",
    titles: {
      en: "Peanut Butter Mass Shake",
      es: "Batido Proteico de Mantequilla de Maní",
      de: "Erdnussbutter Mass Shake",
      fr: "Smoothie Beurre de Cacahuète",
      "pt-BR": "Shake de Pasta de Amendoim",
      it: "Frullato al Burro di Arachidi",
      ja: "ピーナッツバタープロテインシェイク",
      ko: "피넛버터 매스 프로틴 셰이크",
    },
    descriptions: {
      en: "Creamy blend of natural peanut butter, banana, rolled oats, whey protein, and whole milk.",
      es: "Mezcla cremosa de mantequilla de maní natural, plátano, avena, proteína y leche entera.",
      de: "Cremige Mischung aus natürlicher Erdnussbutter, Banane, Haferflocken, Molkenprotein und Vollmilch.",
      fr: "Mélange crémeux de beurre de cacahuète naturel, banane, avoine, protéine et lait entier.",
      "pt-BR": "Mistura cremosa de pasta de amendoim natural, banana, aveia, proteína e leite integral.",
      it: "Frullato cremoso con burro di arachidi naturale, banana, avena, proteine e latte intero.",
      ja: "ピーナッツバター、バナナ、オートミール、ホエイプロテイン、牛乳の濃厚シェイク。",
      ko: "천연 피넛버터, 바나나, 오트밀, 호에이 프로틴, 우유를 넣은 고칼로리 셰이크.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["snack", "breakfast"],
    serving: "1 large glass (600ml)",
    calories: 650,
    proteinGrams: 32,
    carbsGrams: 88,
    fatGrams: 22,
    ingredients: ["Natural Peanut Butter", "Banana", "Rolled Oats", "Whey Protein Powder", "Whole Milk"],
  },
  {
    slug: "greek-yogurt-berries",
    titles: {
      en: "Greek Yogurt & Fresh Berries",
      es: "Yogur Griego con Frutas Frescas",
      de: "Griechischer Joghurt mit Beeren",
      fr: "Yaourt Grec et Fruits Rouges",
      "pt-BR": "Iogurte Grego com Frutas Vermelhas",
      it: "Yogurt Greco con Frutti di Bosco",
      ja: "ギリシャヨーグルトとベリー",
      ko: "그릭 요거트와 신선한 베리",
    },
    descriptions: {
      en: "High-protein nonfat Greek yogurt topped with blueberries, strawberries, and a drizzle of honey.",
      es: "Yogur griego desnatado rico en proteínas con arándanos, fresas y un toque de miel.",
      de: "Fettarmer griechischer Joghurt mit Blaubeeren, Erdbeeren und einem Hauch Honig.",
      fr: "Yaourt grec 0% riche en protéines garni de myrtilles, fraises et d'un filet de miel.",
      "pt-BR": "Iogurte grego desnatado rico em proteínas com mirtilos, morangos e um fio de mel.",
      it: "Yogurt greco magro ad alto contenuto proteico con mirtilli, fragole e un filo di miele.",
      ja: "高タンパク無脂肪ギリシャヨーグルトにブルーベリー、ストロベリー、ハチミツをプラス。",
      ko: "고단백 무지방 그릭 요거트에 블루베리, 딸기, 꿀을 얹은 깔끔한 간식.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["breakfast", "snack"],
    serving: "1 bowl (250g)",
    calories: 280,
    proteinGrams: 25,
    carbsGrams: 32,
    fatGrams: 6,
    ingredients: ["Nonfat Greek Yogurt", "Blueberries", "Strawberries", "Natural Honey"],
  },
  {
    slug: "salmon-avocado-quinoa-bowl",
    titles: {
      en: "Salmon Avocado Quinoa Bowl",
      es: "Tazón de Salmón, Aguacate y Quinoa",
      de: "Lachs Avocado Quinoa Bowl",
      fr: "Bol Saumon Avocat et Quinoa",
      "pt-BR": "Tigela de Salmão, Abacate e Quinoa",
      it: "Bowl di Salmone, Avocado e Quinoa",
      ja: "サーモンアボカドキヌアボウル",
      ko: "연어 아보카도 퀴노아 보울",
    },
    descriptions: {
      en: "Pan-seared Atlantic salmon fillet with fluffy quinoa, avocado slices, and sesame ginger dressing.",
      es: "Filete de salmón del Atlántico a la plancha con quinoa, aguacate y aderezo de sésamo y jengibre.",
      de: "Gebratenes Atlantik-Lachsfilet mit fluffiger Quinoa, Avocadoscheiben und Sesam-Ingwer-Dressing.",
      fr: "Pavé de saumon de l'Atlantique poêlé avec quinoa moelleux, tranches d'avocat et sauce sésame gingembre.",
      "pt-BR": "Filé de salmão grelhado com quinoa, fatias de abacate e molho de gergelim e gengibre.",
      it: "Filetto di salmone dell'Atlantico scottato con quinoa, fette di avocado e condimento al sesamo e zenzero.",
      ja: "香ばしく焼いたサーモンフィレ、キヌア、アボカド、セサミジンジャードレッシング。",
      ko: "구운 아틀란틱 연어 필렛, 부드러운 퀴노아, 아보카도, 참깨 생강 드레싱.",
    },
    goalTypes: ["lose", "maintain", "gain"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 bowl (400g)",
    calories: 610,
    proteinGrams: 38,
    carbsGrams: 48,
    fatGrams: 24,
    ingredients: ["Atlantic Salmon Fillet", "Cooked Quinoa", "Avocado", "Edamame", "Sesame Dressing"],
  },
  {
    slug: "turkey-avocado-wrap",
    titles: {
      en: "Grilled Turkey & Avocado Wrap",
      es: "Wrap de Pavo a la Plancha y Aguacate",
      de: "Puten Avocado Wrap",
      fr: "Wrap Dinde Grillée et Avocat",
      "pt-BR": "Wrap de Peru Grelhado e Abacate",
      it: "Wrap con Tacchino e Avocado",
      ja: "ターキー＆アボカドラップ",
      ko: "칠면조 아보카도 랩",
    },
    descriptions: {
      en: "Sliced roast turkey breast, mashed avocado, crisp lettuce, and tomato in a spinach tortilla.",
      es: "Pechuga de pavo asada, aguacate, lechuga crujiente y tomate en tortilla de espinaca.",
      de: "Putenbrust, Avocado, knackiger Salat und Tomate in einer Spinattortilla.",
      fr: "Poitrine de dinde rôtie, avocat, laitue croquante et tomate dans une tortilla d'épinard.",
      "pt-BR": "Peito de peru assado, abacate, alface e tomate em tortilla de espinafre.",
      it: "Fesa di tacchino arrostita, avocado, lattuga croccante e pomodoro in tortilla agli spinaci.",
      ja: "ターキー胸肉、アボカド、レタス、トマトをスピナッチトルティーヤでラップ。",
      ko: "칠면조 가슴살, 아보카도, 시금치 또띠아로 싼 깔끔한 클린 샌드위치.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["lunch", "snack"],
    serving: "1 wrap (280g)",
    calories: 480,
    proteinGrams: 36,
    carbsGrams: 42,
    fatGrams: 18,
    ingredients: ["Roast Turkey Breast", "Spinach Tortilla Wrap", "Avocado", "Lettuce", "Roma Tomatoes"],
  },
  {
    slug: "berry-spinach-protein-smoothie",
    titles: {
      en: "Berry Spinach Protein Smoothie",
      es: "Smoothie Proteico de Berries y Espinacas",
      de: "Beeren Spinat Protein Smoothie",
      fr: "Smoothie Protéiné Épinards et Fruits Rouges",
      "pt-BR": "Smoothie Proteico de Frutas Vermelhas e Espinafre",
      it: "Smoothie Proteico ai Frutti di Bosco e Spinaci",
      ja: "ベリーベリーベリーベリー・スモチ",
      ko: "베리 시금치 프로틴 스무디",
    },
    descriptions: {
      en: "Nutrient-dense blend of mixed berries, baby spinach, vanilla plant protein, and almond milk.",
      es: "Mezcla nutritiva de frutas rojas, espinacas baby, proteína vegetal de vainilla y leche de almendra.",
      de: "Nährstoffreicher Mix aus Beeren, Baby-Spinat, Vanille-Pflanzenprotein und Mandelmilch.",
      fr: "Mélange riche en nutriments de fruits rouges, jeunes pousses d'épinard, protéine végétale et lait d'amande.",
      "pt-BR": "Smoothie nutritivo de frutas vermelhas, espinafre, proteína vegetal e leite de amêndoa.",
      it: "Frullato ricco di nutrienti con frutti di bosco, spinacini, proteine vegetali alla vaniglia e latte di mandorla.",
      ja: "ミックスベリー、ベビーエスピナッチ、植物性プロテイン、アーモンドミルクのスムージー。",
      ko: "베리, 시금치, 식물성 바닐라 프로틴, 아몬드 밀크로 만든 건강 스무디.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["breakfast", "snack"],
    serving: "1 glass (500ml)",
    calories: 340,
    proteinGrams: 30,
    carbsGrams: 40,
    fatGrams: 5,
    ingredients: ["Mixed Frozen Berries", "Baby Spinach", "Vanilla Protein Powder", "Unsweetened Almond Milk"],
  },
];

/** All localized titles joined so one search index serves every launch language. */
function buildSearchText(item: SeedCatalogItem) {
  return [...Object.values(item.titles), ...item.ingredients].join(" ").slice(0, 1_000);
}

export const seedCatalog = internalMutation({
  args: {},
  returns: v.object({ inserted: v.number(), updated: v.number(), total: v.number() }),
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const item of catalogSeedItems) {
      const existing = await ctx.db
        .query("foodCatalog")
        .withIndex("by_slug", (q) => q.eq("slug", item.slug))
        .unique();

      const value = {
        slug: item.slug,
        titles: item.titles,
        descriptions: item.descriptions,
        goalTypes: item.goalTypes,
        mealTypes: item.mealTypes,
        serving: item.serving,
        calories: item.calories,
        proteinGrams: item.proteinGrams,
        carbsGrams: item.carbsGrams,
        fatGrams: item.fatGrams,
        ingredients: item.ingredients,
        searchText: buildSearchText(item),
        active: true,
      };

      if (existing) {
        await ctx.db.replace(existing._id, { ...value, version: existing.version + 1 });
        updated += 1;
      } else {
        await ctx.db.insert("foodCatalog", { ...value, version: 1 });
        inserted += 1;
      }
    }

    return { inserted, updated, total: catalogSeedItems.length };
  },
});

/** Removes a catalog entry from search and recommendations without deleting history. */
export const deactivateCatalogItem = internalMutation({
  args: { slug: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { slug }) => {
    const existing = await ctx.db
      .query("foodCatalog")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!existing) return false;
    await ctx.db.patch(existing._id, { active: false, version: existing.version + 1 });
    return true;
  },
});

/**
 * Writes synthetic profile, goal, weight and food-log data for ONE named account.
 *
 * For local demos and screenshots only. It refuses to touch an account that
 * already has data, so it can never overwrite somebody's real history.
 */
export const seedDemoDataForUser = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.object({
    profileCreated: v.boolean(),
    goalCreated: v.boolean(),
    weightLogsInserted: v.number(),
    foodLogsInserted: v.number(),
  }),
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) throw new Error(`No BodyCal user for Clerk id ${clerkUserId}`);

    const now = Date.now();
    const todayLocalDate = new Date(now).toISOString().slice(0, 10);

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    let profileCreated = false;
    if (!existingProfile) {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        dateOfBirth: "1998-05-15",
        dateOfBirthPrecision: "day",
        calculationBasis: "male",
        heightCm: 178,
        currentWeightKg: 72.5,
        goalWeightKg: 78,
        weightUnit: "kg",
        heightUnit: "cm",
        activityLevel: "active",
        goalType: "gain",
        goalPace: "recommended",
        locale: "en",
        timezone: "America/New_York",
        updatedAt: now,
      });
      profileCreated = true;
    }

    const existingGoal = await ctx.db
      .query("nutritionGoals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    let goalCreated = false;
    if (!existingGoal) {
      await ctx.db.insert("nutritionGoals", {
        userId: user._id,
        calories: 2_850,
        proteinGrams: 160,
        carbsGrams: 320,
        fatGrams: 85,
        effectiveFrom: todayLocalDate,
        formulaVersion: "mifflin-st-jeor-v1",
        calculationMetadata: {
          bmr: 1_750,
          tdee: 2_600,
          appliedAdjustment: 250,
          paceWasCapped: false,
          aiGenerated: false,
        },
        isManualOverride: false,
        createdAt: now,
      });
      goalCreated = true;
    }

    const existingWeights = await ctx.db
      .query("weightLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(1);

    let weightLogsInserted = 0;
    if (existingWeights.length === 0) {
      for (const entry of [
        { daysAgo: 21, weight: 70.8 },
        { daysAgo: 14, weight: 71.3 },
        { daysAgo: 7, weight: 71.9 },
        { daysAgo: 0, weight: 72.5 },
      ]) {
        const at = now - entry.daysAgo * 86_400_000;
        await ctx.db.insert("weightLogs", {
          userId: user._id,
          normalizedKg: entry.weight,
          displayValue: entry.weight,
          displayUnit: "kg",
          localDate: new Date(at).toISOString().slice(0, 10),
          timezone: "America/New_York",
          clientRequestId: `seed_weight_${entry.daysAgo}`,
          createdAt: at,
          updatedAt: at,
        });
        weightLogsInserted += 1;
      }
    }

    const existingLogs = await ctx.db
      .query("foodLogs")
      .withIndex("by_user_date", (q) => q.eq("userId", user._id).eq("localDate", todayLocalDate))
      .take(1);

    let foodLogsInserted = 0;
    if (existingLogs.length === 0) {
      const demoLogs = [
        {
          mealType: "breakfast" as const,
          foodName: "Protein Pancake Stack",
          serving: "1 stack",
          calories: 850,
          proteinGrams: 42,
          carbsGrams: 102,
          fatGrams: 30,
        },
        {
          mealType: "lunch" as const,
          foodName: "Chicken & Rice Power Bowl",
          serving: "1 bowl",
          calories: 720,
          proteinGrams: 45,
          carbsGrams: 78,
          fatGrams: 28,
        },
        {
          mealType: "snack" as const,
          foodName: "Peanut Butter Mass Shake",
          serving: "1 glass",
          calories: 650,
          proteinGrams: 32,
          carbsGrams: 88,
          fatGrams: 22,
        },
      ];

      for (const [index, log] of demoLogs.entries()) {
        const at = now - (demoLogs.length - index) * 3_600_000;
        await ctx.db.insert("foodLogs", {
          userId: user._id,
          localDate: todayLocalDate,
          timezone: "America/New_York",
          mealType: log.mealType,
          source: "catalog",
          foodName: log.foodName,
          serving: log.serving,
          servingUnit: "portion",
          quantity: 1,
          calories: log.calories,
          proteinGrams: log.proteinGrams,
          carbsGrams: log.carbsGrams,
          fatGrams: log.fatGrams,
          clientRequestId: `seed_food_${index}`,
          createdAt: at,
          updatedAt: at,
        });
        foodLogsInserted += 1;
      }
    }

    return { profileCreated, goalCreated, weightLogsInserted, foodLogsInserted };
  },
});

/** Convenience wrapper for local setup: catalog plus one named demo account. */
export const seedAll = internalMutation({
  args: { clerkUserId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    await ctx.runMutation(internal.seed.seedCatalog, {});
    if (clerkUserId) await ctx.runMutation(internal.seed.seedDemoDataForUser, { clerkUserId });
    return null;
  },
});
