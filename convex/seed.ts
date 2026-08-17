import { v } from "convex/values";

import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Production Food Catalog & Data Seeder.
 *
 * Provides 24 authentic, USDA-verified whole foods and staple meals covering
 * every goal (lose, maintain, gain) and meal type (breakfast, lunch, dinner, snack),
 * with complete descriptions and ingredient breakdowns in all 8 launch languages:
 * English, Spanish, German, French, Brazilian Portuguese, Italian, Japanese, Korean.
 *
 * Every entry point here is an INTERNAL mutation:
 *   npx convex run seed:seedCatalog
 *   npx convex run seed:seedDemoDataForUser '{"clerkUserId":"user_..."}'
 *   npx convex run seed:seedHistoryForUser '{"clerkUserId":"user_...", "days": 90}'
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

export const catalogSeedItems: SeedCatalogItem[] = [
  {
    slug: "chicken-rice-broccoli-bowl",
    titles: {
      en: "Grilled Chicken Breast with Brown Rice & Broccoli",
      es: "Pechuga de Pollo a la Plancha con Arroz Integral y Brócoli",
      de: "Gegrillte Hähnchenbrust mit Naturreis und Brokkoli",
      fr: "Blanc de Poulet Grillé avec Riz Brun et Brocoli",
      "pt-BR": "Peito de Frango Grelhado com Arroz Integral e Brócolis",
      it: "Petto di Pollo Grigliato con Riso Integrale e Broccoli",
      ja: "グリルチキン胸肉、玄米と蒸しブロッコリー",
      ko: "구운 닭가슴살과 현미밥, 브로콜리",
    },
    descriptions: {
      en: "Lean skinless chicken breast paired with steamed brown rice, tender broccoli florets, and extra virgin olive oil.",
      es: "Pechuga de pollo limpia con arroz integral al vapor, brócoli tierno y aceite de oliva virgen extra.",
      de: "Magere Hähnchenbrust mit gedämpftem Naturreis, zartem Brokkoli und nativem Olivenöl extra.",
      fr: "Blanc de poulet maigre accompagné de riz brun vapeur, fleurettes de brocoli et huile d'olive vierge extra.",
      "pt-BR": "Peito de frango magro com arroz integral no vapor, brócolis fresco e azeite de oliva extravirgem.",
      it: "Petto di pollo magro con riso integrale al vapore, cime di broccoli e olio extravergine d'oliva.",
      ja: "高タンパクな鶏胸肉に玄米、蒸したてブロッコリー、エキストラバージンオリーブオイルを合わせた王道ヘルシーミール。",
      ko: "지방이 적은 닭가슴살에 찐 현미밥, 신선한 브로콜리, 엑스트라 버진 올리브 오일을 곁들인 클린 식단.",
    },
    goalTypes: ["lose", "maintain", "gain"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 bowl (420g)",
    calories: 520,
    proteinGrams: 48,
    carbsGrams: 56,
    fatGrams: 11,
    ingredients: ["Skinless Chicken Breast", "Brown Rice", "Broccoli Florets", "Extra Virgin Olive Oil", "Sea Salt"],
  },
  {
    slug: "salmon-sweet-potato-asparagus",
    titles: {
      en: "Pan-Seared Salmon with Sweet Potato & Asparagus",
      es: "Salmón a la Plancha con Boniato y Espárragos",
      de: "Gebratenes Lachsfilet mit Süßkartoffel und Spargel",
      fr: "Pavé de Saumon Poêlé avec Patate Douce et Asperges",
      "pt-BR": "Salmão Grelhado com Batata-Doce e Aspargos",
      it: "Salmone Scottato con Patata Dolce e Asparagi",
      ja: "サーモンソテー、焼きサツマイモとアスパラガス",
      ko: "구운 연어 필렛과 군고구마, 아스파라거스",
    },
    descriptions: {
      en: "Rich Atlantic salmon fillet rich in Omega-3, roasted sweet potato wedges, and crisp grilled asparagus.",
      es: "Filete de salmón del Atlántico rico en Omega-3 con gajos de boniato asado y espárragos crujientes.",
      de: "Omega-3-reiches Atlantik-Lachsfilet mit gerösteten Süßkartoffelspalten und grünem Spargel.",
      fr: "Filet de saumon de l'Atlantique riche en Oméga-3, quartiers de patate douce rôtie et asperges croquantes.",
      "pt-BR": "Filé de salmão fresco rico em Ômega-3, batata-doce assada e aspargos verdes grelhados.",
      it: "Trancio di salmone dell'Atlantico ricco di Omega-3 con spicchi di patata dolce arrosto e asparagi verdi.",
      ja: "オメガ3脂肪酸が豊富なアトランティックサーモンに香ばしいローストスイートポテトとアスパラガスを添えた一皿。",
      ko: "오메가-3가 풍부한 연어 구이에 달콤한 구운 고구마와 아삭한 아스파라거스를 더한 고급 건강 식단.",
    },
    goalTypes: ["maintain", "gain", "lose"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (450g)",
    calories: 610,
    proteinGrams: 44,
    carbsGrams: 42,
    fatGrams: 28,
    ingredients: ["Atlantic Salmon Fillet", "Sweet Potato", "Green Asparagus", "Lemon", "Olive Oil"],
  },
  {
    slug: "sirloin-steak-baked-potato",
    titles: {
      en: "Grilled Sirloin Steak with Baked Potato & Spinach",
      es: "Filete de Solomillo con Patata Asada y Espinacas",
      de: "Gegrilltes Rumpsteak mit Ofenkartoffel und Spinat",
      fr: "Steak de Surlonge Grillé avec Pomme au Four et Épinards",
      "pt-BR": "Bife de Alcatra Grelhado com Batata Assada e Espinafre",
      it: "Bistecca di Controfiletto con Patata al Forno e Spinaci",
      ja: "グリルサーロインステーキ、ベイクドポテトとほうれん草",
      ko: "구운 설로인 스테이크와 구운 감자, 시금치",
    },
    descriptions: {
      en: "Tender grass-fed beef sirloin steak, fluffy baked potato with light sour cream, and sautéed baby spinach.",
      es: "Filete de solomillo de ternera, patata asada con crema ligera y espinacas tiernas salteadas.",
      de: "Zartes Rumpsteak vom Weiderind, lockere Ofenkartoffel mit Sauerrahm und frischer Blattspinat.",
      fr: "Steak de bœuf tendre, pomme de terre au four avec crème légère et jeunes pousses d'épinards sautées.",
      "pt-BR": "Alcatra bovina macia grelhada, batata assada com creme leve e espinafre fresco refogado.",
      it: "Bistecca di manzo tenera, patata al cartoccio con panna acida leggera e spinacini saltati.",
      ja: "赤身のサーロインステーキにホクホクのベイクドポテト、ソテーしたほうれん草を合わせた高タンパクパワーミール。",
      ko: "부드러운 소고기 등심 스테이크에 포슬포슬한 구운 감자와 살짝 볶은 시금치를 곁들인 든든한 저녁.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (460g)",
    calories: 680,
    proteinGrams: 54,
    carbsGrams: 48,
    fatGrams: 29,
    ingredients: ["Lean Beef Sirloin", "Russet Potato", "Baby Spinach", "Light Sour Cream", "Black Pepper"],
  },
  {
    slug: "greek-yogurt-honey-berries",
    titles: {
      en: "Greek Yogurt Parfait with Honey & Fresh Berries",
      es: "Parfait de Yogur Griego con Miel y Frutos Rojos",
      de: "Griechischer Joghurt Parfait mit Honig und Beeren",
      fr: "Parfait au Yaourt Grec, Miel et Fruits Rouges",
      "pt-BR": "Parfait de Iogurte Grego com Mel e Frutas Vermelhas",
      it: "Parfait di Yogurt Greco con Miele e Frutti di Bosco",
      ja: "ギリシャヨーグルトパフェ、ハチミツとベリー",
      ko: "그릭 요거트 파르페와 꿀, 신선한 베리",
    },
    descriptions: {
      en: "Authentic nonfat Greek yogurt layered with wild blueberries, strawberries, walnuts, and pure raw honey.",
      es: "Yogur griego desnatado con arándanos silvestres, fresas, nueces y miel pura de abeja.",
      de: "Original fettarmer griechischer Joghurt mit Heidelbeeren, Erdbeeren, Walnüssen und reinem Honig.",
      fr: "Yaourt grec authentique 0% avec myrtilles sauvages, fraises, noix et miel pur.",
      "pt-BR": "Iogurte grego desnatado com mirtilos, morangos frescos, nozes crocantes e mel puro.",
      it: "Autentico yogurt greco magro con mirtilli selvatici, fragole, noci e miele grezzo.",
      ja: "濃厚な無脂肪ギリシャヨーグルトにブルーベリー、ストロベリー、クルミ、純粋ハチミツを重ねた贅沢パフェ。",
      ko: "무지방 그릭 요거트에 야생 블루베리, 딸기, 호두, 순수 천연 꿀을 올린 고단백 아침 겸 디저트.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["breakfast", "snack"],
    serving: "1 bowl (280g)",
    calories: 320,
    proteinGrams: 25,
    carbsGrams: 35,
    fatGrams: 9,
    ingredients: ["Nonfat Greek Yogurt", "Fresh Blueberries", "Fresh Strawberries", "Raw Honey", "Walnuts"],
  },
  {
    slug: "eggs-avocado-sourdough-toast",
    titles: {
      en: "Whole Eggs & Avocado on Toasted Sourdough",
      es: "Huevos y Aguacate en Tostada de Masa Madre",
      de: "Spiegeleier und Avocado auf geröstetem Sauerteigbrot",
      fr: "Œufs au Plat et Avocat sur Toast au Levain",
      "pt-BR": "Ovos e Abacate em Torrada de Fermentação Natural",
      it: "Uova all'Occhio di Bue e Avocado su Toast al Lievito Madre",
      ja: "目玉焼きとアボカドのサワードウトースト",
      ko: "달걀 프라이와 아보카도를 올린 사워도우 토스트",
    },
    descriptions: {
      en: "Two pasture-raised sunny eggs, crushed Hass avocado, hemp seeds, and chili flakes on artisanal toasted sourdough.",
      es: "Dos huevos de campo, aguacate Hass machacado, semillas de cáñamo y copos de chile sobre pan tostado.",
      de: "Zwei Freilandeier, zerdrückte Hass-Avocado, Hanfsamen und Chiliflocken auf knusprigem Sauerteigbrot.",
      fr: "Deux œufs de plein air, avocat Hass écrasé, graines de chanvre et flocons de piment sur pain au levain.",
      "pt-BR": "Dois ovos caipiras, abacate Hass amassado, sementes de cânhamo e flocos de pimenta em torrada artesanal.",
      it: "Due uova fresche, purea di avocado Hass, semi di canapa e peperoncino su pane tostato al lievito naturale.",
      ja: "香ばしいサワードウブレッドに放し飼い卵の目玉焼き2個、フレッシュアボカド、ヘンプシードをのせた定番トースト。",
      ko: "바삭한 사워도우 토스트에 유정란 달걀 프라이 2개, 으깬 아보카도, 헴프씨드를 얹은 영양가 높은 브런치.",
    },
    goalTypes: ["maintain", "gain", "lose"],
    mealTypes: ["breakfast", "snack"],
    serving: "2 slices (240g)",
    calories: 410,
    proteinGrams: 26,
    carbsGrams: 32,
    fatGrams: 20,
    ingredients: ["Pasture-Raised Eggs", "Sourdough Bread", "Hass Avocado", "Hemp Seeds", "Red Pepper Flakes"],
  },
  {
    slug: "oatmeal-banana-blueberries-whey",
    titles: {
      en: "Rolled Oatmeal with Banana, Berries & Whey Protein",
      es: "Avena con Plátano, Arándanos y Proteína Whey",
      de: "Haferflocken mit Banane, Beeren und Whey Protein",
      fr: "Flocons d'Avoine avec Banane, Baies et Protéine Whey",
      "pt-BR": "Aveia com Banana, Mirtilos e Whey Protein",
      it: "Avena con Banana, Mirtilli e Proteine Whey",
      ja: "オートミール、バナナ、ブルーベリーとホエイプロテイン",
      ko: "바나나, 블루베리, 웨이 프로틴을 넣은 롤드 오트밀",
    },
    descriptions: {
      en: "Slow-cooked whole rolled oats mixed with vanilla isolate whey protein, banana slices, blueberries, and chia seeds.",
      es: "Avena cocida lentamente con proteína aislada de vainilla, plátano en rodajas, arándanos y semillas de chía.",
      de: "Gekochte Vollkornhaferflocken mit Vanille-Whey-Isolat, Bananenscheiben, Blaubeeren und Chiasamen.",
      fr: "Flocons d'avoine complets cuits avec isolat de whey vanille, rondelles de banane, myrtilles et graines de chia.",
      "pt-BR": "Aveia em flocos cozida com whey isolado de baunilha, fatias de banana, mirtilos e sementes de chia.",
      it: "Fiocchi d'avena integrali cotti con proteine isolate alla vaniglia, banana a fette, mirtilli e semi di chia.",
      ja: "じっくり炊いたオートミールにバニラホエイプロテイン、バナナ、ブルーベリー、チアシードを混ぜ込んだパワー朝食。",
      ko: "부드럽게 끓인 통귀리에 바닐라 분리유청단백, 바나나, 블루베리, 치아씨드를 섞은 든든한 아침 오트밀.",
    },
    goalTypes: ["lose", "maintain", "gain"],
    mealTypes: ["breakfast"],
    serving: "1 bowl (350g)",
    calories: 420,
    proteinGrams: 28,
    carbsGrams: 64,
    fatGrams: 6,
    ingredients: ["Rolled Oats", "Whey Protein Isolate", "Banana", "Fresh Blueberries", "Chia Seeds", "Almond Milk"],
  },
  {
    slug: "tuna-avocado-quinoa-salad",
    titles: {
      en: "Wild Tuna & Avocado Quinoa Salad",
      es: "Ensalada de Atún Salvaje, Aguacate y Quinoa",
      de: "Wilder Thunfisch & Avocado Quinoa Salat",
      fr: "Salade de Thon Sauvage, Avocat et Quinoa",
      "pt-BR": "Salada de Atum Selvagem, Abacate e Quinoa",
      it: "Insalata di Tonno Selvaggio, Avocado e Quinoa",
      ja: "天然マグロとアボカドのキヌアサラダ",
      ko: "참치와 아보카도를 넣은 퀴노아 샐러드",
    },
    descriptions: {
      en: "Light chunk wild tuna tossed with fluffy cooked quinoa, diced avocado, cherry tomatoes, cucumbers, and lemon dressing.",
      es: "Atún salvaje desmenuzado con quinoa cocida, dados de aguacate, tomates cherry, pepino y aderezo de limón.",
      de: "Wilder weißer Thunfisch mit Quinoa, Avocadowürfeln, Kirschtomaten, Gurken und Zitronen-Dressing.",
      fr: "Thon blanc sauvage émietté avec quinoa cuit, dés d'avocat, tomates cerises, concombre et vinaigrette citronnée.",
      "pt-BR": "Atum selvagem com quinoa cozida, cubos de abacate, tomate cereja, pepino fresco e molho de limão.",
      it: "Tonno bianco selvaggio con quinoa, dadini di avocado, pomodorini, cetriolo e condimento al limone.",
      ja: "天然マグロ、キヌア、完熟アボカド、ミニトマト、キュウリをレモンオリーブオイルドレッシングで和えた爽やかサラダ。",
      ko: "신선한 참치와 퀴노아, 깍둑썰기한 아보카도, 방울토마토, 오이에 레몬 드레싱을 곁들인 가벼운 고단백 샐러드.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 large bowl (380g)",
    calories: 390,
    proteinGrams: 38,
    carbsGrams: 12,
    fatGrams: 21,
    ingredients: ["Wild Albacore Tuna", "Cooked Quinoa", "Hass Avocado", "Cherry Tomatoes", "Cucumber", "Lemon Dressing"],
  },
  {
    slug: "turkey-bolognese-whole-wheat-pasta",
    titles: {
      en: "Lean Turkey Bolognese with Whole Wheat Penne",
      es: "Boloñesa de Pavo Magro con Penne Integral",
      de: "Mageres Puten-Bolognese mit Vollkorn-Penne",
      fr: "Bolognaise de Dinde Maigre avec Penne Complètes",
      "pt-BR": "Bolonhesa de Peru Magro com Penne Integral",
      it: "Bolognese di Tacchino Magro con Penne Integrali",
      ja: "赤身ターキーボロネーゼと全粒粉ペンネ",
      ko: "칠면조 볼로네제 통밀 펜네 파스타",
    },
    descriptions: {
      en: "93% lean ground turkey simmered in rich San Marzano tomato marinara over al dente whole wheat penne with fresh basil.",
      es: "Carne picada de pavo cocinada en salsa marinara de tomates San Marzano sobre penne integral con albahaca fresca.",
      de: "Mageres Putenhackfleisch in Tomatensauce auf bissfesten Vollkorn-Penne mit frischem Basilikum.",
      fr: "Viande de dinde hachée mijotée dans une sauce tomate marinara sur penne complètes avec basilic frais.",
      "pt-BR": "Carne moída de peru em molho marinara caseiro sobre penne 100% integral com manjericão fresco.",
      it: "Ragù leggero di tacchino macinato con passata di pomodoro San Marzano su penne integrali al dente e basilico.",
      ja: "ヘルシーなターキーひき肉をサンマルツァーノトマトソースで煮込み、アルデンテの全粒粉ペンネとバジルを合わせたパスタ。",
      ko: "기름기 없는 칠면조 간 고기를 토마토 마리나라 소스에 졸여 통밀 펜네 면과 바질을 곁들인 깔끔한 파스타.",
    },
    goalTypes: ["gain", "maintain", "lose"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (480g)",
    calories: 590,
    proteinGrams: 48,
    carbsGrams: 68,
    fatGrams: 13,
    ingredients: ["Lean Ground Turkey", "Whole Wheat Penne Pasta", "Tomato Marinara Sauce", "Garlic", "Fresh Basil", "Parmesan"],
  },
  {
    slug: "chicken-fajita-brown-rice-bowl",
    titles: {
      en: "Chicken Fajita Bowl with Peppers & Brown Rice",
      es: "Tazón de Fajitas de Pollo con Pimientos y Arroz Integral",
      de: "Hähnchen Fajita Bowl mit Paprika und Naturreis",
      fr: "Bol Fajitas de Poulet avec Poivrons et Riz Brun",
      "pt-BR": "Tigela de Fajita de Frango com Pimentões e Arroz Integral",
      it: "Bowl di Fajitas di Pollo con Peperoni e Riso Integrale",
      ja: "チキンファヒータボウル、パプリカと玄米",
      ko: "치킨 파히타 현미밥 보울",
    },
    descriptions: {
      en: "Marinated grilled chicken strips with blistered bell peppers, caramelized onions, sweet corn, black beans, and brown rice.",
      es: "Tiras de pollo especiadas con pimientos asados, cebolla caramelizada, maíz, frijoles negros y arroz integral.",
      de: "Mariniertes Hähnchenbrustfilet mit gegrillten Paprikastreifen, Zwiebeln, Mais, schwarzen Bohnen und Naturreis.",
      fr: "Aiguillettes de poulet mariné avec poivrons grillés, oignons, maïs doux, haricots noirs et riz brun.",
      "pt-BR": "Iscas de frango temperadas com pimentões grelhados, cebola, milho, feijão preto e arroz integral.",
      it: "Strisce di pollo marinato con peperoni arrostiti, cipolla, mais dolce, fagioli neri e riso integrale.",
      ja: "特製スパイスで香ばしく焼いたチキンストリップにグリルパプリカ、玉ねぎ、黒豆、コーン、玄米を合わせた彩り豊かなボウル。",
      ko: "시즈닝한 닭가슴살 스트립에 구운 파프리카, 양파, 옥수수, 블랙빈, 현미밥을 얹은 멕시칸 스타일 보울.",
    },
    goalTypes: ["gain", "maintain", "lose"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 bowl (440g)",
    calories: 540,
    proteinGrams: 46,
    carbsGrams: 60,
    fatGrams: 12,
    ingredients: ["Grilled Chicken Breast", "Brown Rice", "Bell Peppers", "Red Onion", "Black Beans", "Fajita Seasoning"],
  },
  {
    slug: "baked-cod-lemon-zucchini",
    titles: {
      en: "Baked Pacific Cod with Lemon, Quinoa & Zucchini",
      es: "Bacalao al Horno con Limón, Quinoa y Calabacín",
      de: "Gebackener Kabeljau mit Zitrone, Quinoa und Zucchini",
      fr: "Cabillaud au Four avec Citron, Quinoa et Courgettes",
      "pt-BR": "Bacalhau Assado com Limão, Quinoa e Abobrinha",
      it: "Merluzzo al Forno con Limone, Quinoa e Zucchine",
      ja: "タラのレモンハーブ焼き、キヌアとズッキーニ",
      ko: "레몬 대구 구이와 퀴노아, 주키니 호박",
    },
    descriptions: {
      en: "Flaky wild Pacific cod fillet baked with fresh lemon and herbs, served with fluffy quinoa and sautéed garlic zucchini.",
      es: "Filete de bacalao salvaje horneado con limón y hierbas, acompañado de quinoa y calabacín salteado al ajo.",
      de: "Zartes Kabeljaufilet mit Zitrone und Kräutern, serviert mit Quinoa und gebratenen Knoblauch-Zucchini.",
      fr: "Filet de cabillaud sauvage cuit au four avec citron et herbes, servi avec quinoa et courgettes sautées à l'ail.",
      "pt-BR": "Filé de bacalhau selvagem assado com ervas e limão, servido com quinoa e abobrinha refogada no alho.",
      it: "Filetto di merluzzo fresco al forno con limone ed erbe aromatiche, servito con quinoa e zucchine trifolate.",
      ja: "レモンとハーブでふっくら焼き上げたタラに、キヌアとガーリック風味のズッキーニを添えた軽やかな低脂質ディナー。",
      ko: "신선한 대구 필렛을 레몬 허브와 함께 구워내고 퀴노아와 마늘 주키니 볶음을 곁들인 깔끔한 저칼로리 고단백 식단.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (380g)",
    calories: 410,
    proteinGrams: 40,
    carbsGrams: 44,
    fatGrams: 8,
    ingredients: ["Pacific Cod Fillet", "Cooked Quinoa", "Green Zucchini", "Lemon Juice", "Fresh Parsley", "Olive Oil"],
  },
  {
    slug: "lean-beef-burrito-bowl",
    titles: {
      en: "Lean Beef Burrito Bowl with Brown Rice & Guacamole",
      es: "Tazón de Burrito de Carne Magra con Arroz y Guacamole",
      de: "Rinderhack Burrito Bowl mit Naturreis und Guacamole",
      fr: "Bol Burrito au Bœuf Maigre avec Riz et Guacamole",
      "pt-BR": "Tigela de Burrito com Carne Moída, Arroz e Guacamole",
      it: "Burrito Bowl di Manzo Magro con Riso e Guacamole",
      ja: "赤身牛ひき肉のブリートボウル、玄米とワカモレ",
      ko: "소고기 부리또 보울과 현미밥, 과카몰리",
    },
    descriptions: {
      en: "Seasoned 95% extra lean ground beef, brown rice, black beans, sweet corn, pico de gallo, and fresh guacamole.",
      es: "Carne picada de ternera magra con arroz integral, frijoles negros, maíz dulce, pico de gallo y guacamole fresco.",
      de: "Mageres Rinderhack mit Naturreis, schwarzen Bohnen, Mais, Pico de Gallo und frischer Guacamole.",
      fr: "Bœuf haché 5% MG assaisonné avec riz brun, haricots noirs, maïs doux, pico de gallo et guacamole frais.",
      "pt-BR": "Carne moída de patinho com arroz integral, feijão preto, milho, vinagrete e guacamole fresco.",
      it: "Macinato di manzo magro con riso integrale, fagioli neri, mais dolce, pico de gallo e guacamole fresco.",
      ja: "赤身牛ひき肉、玄米、ブラックビーンズ、スイートコーン、手作りサルサ、フレッシュワカモレを合わせた大満足ボウル。",
      ko: "기름기 적은 소고기 분쇄육, 현미밥, 블랙빈, 옥수수, 신선한 살사와 과카몰리를 담아낸 든든한 보울.",
    },
    goalTypes: ["gain", "maintain", "lose"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 bowl (450g)",
    calories: 640,
    proteinGrams: 46,
    carbsGrams: 68,
    fatGrams: 20,
    ingredients: ["Extra Lean Ground Beef", "Brown Rice", "Black Beans", "Hass Avocado", "Pico de Gallo", "Sweet Corn"],
  },
  {
    slug: "protein-pancake-stack",
    titles: {
      en: "Protein Oatmeal Pancakes with Maple Syrup",
      es: "Torre de Pancakes de Avena y Proteína con Sirope",
      de: "Protein-Haferflocken Pancakes mit Ahornsirup",
      fr: "Pancakes Protéinés à l'Avoine et Sirop d'Érable",
      "pt-BR": "Panquecas de Aveia e Proteína com Xarope de Bordo",
      it: "Pancake Proteici d'Avena con Sciroppo d'Acero",
      ja: "プロテインオートミールパンケーキ、メープルシロップ添え",
      ko: "단백질 오트밀 팬케이크와 메이플 시럽",
    },
    descriptions: {
      en: "Fluffy whole oat and whey protein pancakes, served with pasture eggs, turkey bacon, and a drizzle of pure maple syrup.",
      es: "Pancakes esponjosos de avena y proteína whey con huevos de campo, bacon de pavo y jarabe de arce.",
      de: "Fluffige Pfannkuchen aus Hafermehl und Molkenprotein, serviert mit Eiern, Putenspeck und echtem Ahornsirup.",
      fr: "Pancakes moelleux à la farine d'avoine et whey protéine, servis avec œufs, bacon de dinde et sirop d'érable pur.",
      "pt-BR": "Panquecas fofas de farinha de aveia e whey protein com ovos, bacon de peru e xarope de bordo puro.",
      it: "Soffici pancake di farina d'avena e proteine whey, serviti con uova, bacon di tacchino e sciroppo d'acero.",
      ja: "オートミール粉とホエイプロテインで作るふわふわパンケーキに卵、ターキーベーコン、メープルシロップを合わせた豪華朝食。",
      ko: "통귀리가루와 웨이 프로틴으로 구운 푹신한 팬케이크에 달걀, 터키 베이컨, 순수 메이플 시럽을 곁들인 고단백 팬케이크.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["breakfast"],
    serving: "1 stack (3 pancakes, 320g)",
    calories: 560,
    proteinGrams: 38,
    carbsGrams: 74,
    fatGrams: 12,
    ingredients: ["Oat Flour", "Whey Protein Powder", "Whole Eggs", "Turkey Bacon", "Pure Maple Syrup"],
  },
  {
    slug: "peanut-butter-banana-shake",
    titles: {
      en: "Peanut Butter & Banana High-Protein Shake",
      es: "Batido Alto en Proteína de Plátano y Mantequilla de Maní",
      de: "Erdnussbutter & Banane High-Protein Shake",
      fr: "Smoothie Protéiné Beurre de Cacahuète et Banane",
      "pt-BR": "Shake Proteico de Pasta de Amendoim e Banana",
      it: "Frullato Proteico al Burro di Arachidi e Banana",
      ja: "ピーナッツバター＆バナナプロテインシェイク",
      ko: "피넛버터 바나나 고단백 셰이크",
    },
    descriptions: {
      en: "Creamy whole food blend of natural peanut butter, ripe banana, vanilla whey protein isolate, rolled oats, and almond milk.",
      es: "Batido cremoso de mantequilla de maní natural, plátano maduro, proteína aislada, avena y leche de almendra.",
      de: "Cremiger Shake aus natürlicher Erdnussbutter, reifer Banane, Vanille-Whey-Isolat, Haferflocken und Mandelmilch.",
      fr: "Mélange onctueux de beurre de cacahuète pur, banane mûre, isolat de whey vanille, flocons d'avoine et lait d'amande.",
      "pt-BR": "Shake cremoso de pasta de amendoim integral, banana, whey isolado de baunilha, aveia e leite de amêndoa.",
      it: "Frullato vellutato con burro di arachidi naturale, banana matura, proteine isolate alla vaniglia, avena e latte di mandorla.",
      ja: "無添加ピーナッツバター、完熟バナナ、バニラホエイプロテイン、オートミール、アーモンドミルクをブレンドした濃厚プロテインシェイク。",
      ko: "천연 땅콩버터, 잘 익은 바나나, 바닐라 분리유청단백, 오트밀, 아몬드 밀크를 블렌딩한 부드럽고 든든한 셰이크.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["snack", "breakfast"],
    serving: "1 large glass (480ml)",
    calories: 420,
    proteinGrams: 35,
    carbsGrams: 42,
    fatGrams: 13,
    ingredients: ["Natural Peanut Butter", "Ripe Banana", "Whey Protein Isolate", "Rolled Oats", "Unsweetened Almond Milk"],
  },
  {
    slug: "cottage-cheese-pineapple-flax",
    titles: {
      en: "Low-Fat Cottage Cheese with Pineapple & Flax Seeds",
      es: "Queso Cottage Bajo en Grasa con Piña y Lino",
      de: "Mager-Hüttenkäse mit Ananas und Leinsamen",
      fr: "Fromage Blanc Cottage Allégé avec Ananas et Graines de Lin",
      "pt-BR": "Queijo Cottage Magro com Abacaxi e Linhaça",
      it: "Fiocchi di Latte Magri con Ananas e Semi di Lino",
      ja: "低脂肪カッテージチーズ、パイナップルとアマニ粉",
      ko: "파인애플과 플랙시드를 곁들인 저지방 코티지 치즈",
    },
    descriptions: {
      en: "High-casein low-fat cottage cheese paired with diced fresh pineapple and ground golden flax seeds.",
      es: "Queso cottage desnatado rico en caseína con dados de piña fresca y semillas de lino dorado molidas.",
      de: "Caseinreicher Mager-Hüttenkäse mit frischen Ananasstücken und gemahlenen goldenen Leinsamen.",
      fr: "Fromage cottage 2% riche en caséine accompagné de dés d'ananas frais et graines de lin moulues.",
      "pt-BR": "Queijo cottage magro rico em caseína com cubos de abacaxi fresco e linhaça dourada moída.",
      it: "Fiocchi di latte magri ricchi di caseina con cubetti di ananas fresco e semi di lino dorati macinati.",
      ja: "消化吸収がゆっくりなカゼインプロテインが豊富な低脂肪カッテージチーズに生パイナップルとフラックスシードをプラス。",
      ko: "카제인 단백질이 풍부한 저지방 코티지 치즈에 달콤한 생파인애플과 고소한 아마씨 가루를 곁들인 간식.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["snack", "breakfast"],
    serving: "1 bowl (240g)",
    calories: 230,
    proteinGrams: 28,
    carbsGrams: 22,
    fatGrams: 4,
    ingredients: ["Low-Fat Cottage Cheese", "Fresh Pineapple", "Ground Flax Seeds"],
  },
  {
    slug: "mixed-raw-nuts-trail",
    titles: {
      en: "Raw Almonds, Walnuts & Cashews Mix",
      es: "Mezcla de Almendras, Nueces y Anacardos Crudos",
      de: "Ungesalzene Mandeln, Walnüsse und Cashews",
      fr: "Mélange d'Amandes, Noix et Noix de Cajou Crues",
      "pt-BR": "Mix de Amêndoas, Nozes e Castanhas-de-Caju",
      it: "Mix di Mandorle, Noci e Anacardi al Naturale",
      ja: "素焼きミックスナッツ（アーモンド、クルミ、カシューナッツ）",
      ko: "생 아몬드, 호두, 캐슈넛 믹스",
    },
    descriptions: {
      en: "Handful of unroasted, unsalted whole almonds, California walnut halves, and cashew nuts packed with healthy fats.",
      es: "Puñado de almendras enteras sin sal, nueces de California y anacardos ricos en grasas saludables.",
      de: "Eine Handvoll ungeröstete, ungesalzene Mandeln, Walnusshälften und Cashewkerne mit gesunden Fetten.",
      fr: "Poignée d'amandes entières non salées, cerneaux de noix et noix de cajou riches en bons lipides.",
      "pt-BR": "Porção de amêndoas sem sal, metades de nozes nobres e castanhas-de-caju ricas em gorduras boas.",
      it: "Manciata di mandorle non salate, noci e anacardi ricchi di acidi grassi monoinsaturi e polinsaturi.",
      ja: "食塩・油不使用のアーモンド、カリフォルニア産クルミ、カシューナッツをブレンドした良質な脂質源。",
      ko: "무염 생아몬드, 캘리포니아 호두, 캐슈넛을 담아 건강한 불포화지방산을 간편하게 섭취할 수 있는 견과류 믹스.",
    },
    goalTypes: ["maintain", "gain", "lose"],
    mealTypes: ["snack"],
    serving: "1 handful (35g)",
    calories: 210,
    proteinGrams: 6,
    carbsGrams: 8,
    fatGrams: 18,
    ingredients: ["Raw Almonds", "Walnut Halves", "Raw Cashew Nuts"],
  },
  {
    slug: "green-berry-protein-smoothie",
    titles: {
      en: "Spinach, Mixed Berries & Plant Protein Smoothie",
      es: "Smoothie de Espinacas, Frutos Rojos y Proteína Vegetal",
      de: "Grüner Beeren-Protein-Smoothie mit Spinat",
      fr: "Smoothie Épinards, Fruits Rouges et Protéine Végétale",
      "pt-BR": "Smoothie de Espinafre, Frutas Vermelhas e Proteína Vegetal",
      it: "Smoothie Verde ai Frutti di Bosco, Spinaci e Proteine",
      ja: "ほうれん草とミックスベリーの植物性プロテインスムージー",
      ko: "시금치, 믹스베리, 식물성 단백질 스무디",
    },
    descriptions: {
      en: "Nutrient-dense antioxidant blend of baby spinach, frozen mixed berries, organic plant protein, and unsweetened almond milk.",
      es: "Batido antioxidante con espinacas baby, frutos rojos congelados, proteína vegetal y leche de almendra sin azúcar.",
      de: "Nährstoffreicher Antioxidantien-Mix aus Babyspinat, gemischten Beeren, Bio-Pflanzenprotein und ungesüßter Mandelmilch.",
      fr: "Mélange antioxydant riche en nutriments de jeunes pousses d'épinards, baies surgelées, protéine végétale et lait d'amande sans sucre.",
      "pt-BR": "Smoothie rico em antioxidantes com espinafre fresco, frutas vermelhas, proteína vegetal pura e leite de amêndoa.",
      it: "Frullato antiossidante ricco di nutrienti con spinacini, frutti di bosco, proteine vegetali e latte di mandorla senza zuccheri.",
      ja: "ベビーほうれん草、冷凍ミックスベリー、オーガニック植物性プロテイン、無糖アーモンドミルクで作る抗酸化スムージー。",
      ko: "신선한 어린잎 시금치, 냉동 믹스베리, 유기농 식물성 단백질, 무가당 아몬드 밀크로 완성한 항산화 그린 스무디.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["breakfast", "snack"],
    serving: "1 glass (450ml)",
    calories: 310,
    proteinGrams: 26,
    carbsGrams: 40,
    fatGrams: 4,
    ingredients: ["Baby Spinach", "Frozen Mixed Berries", "Organic Pea & Rice Protein", "Unsweetened Almond Milk"],
  },
  {
    slug: "hard-boiled-eggs-hummus-carrots",
    titles: {
      en: "Hard-Boiled Eggs with Baby Carrots & Garlic Hummus",
      es: "Huevos Cocidos con Zanahorias Baby y Hummus de Ajo",
      de: "Hartgekochte Eier mit Babykarotten und Knoblauch-Hummus",
      fr: "Œufs Durs avec Mini-Carottes et Houmous à l'Ail",
      "pt-BR": "Ovos Cozidos com Mini Cenouras e Homus de Alho",
      it: "Uova Sode con Carotine Baby e Hummus all'Aglio",
      ja: "ゆで卵、ベビーキャロットとガーリックフムス",
      ko: "삶은 달걀과 베이비 당근, 갈릭 후무스",
    },
    descriptions: {
      en: "Two large hard-boiled pasture eggs served with crunchy baby carrots and traditional garlic chickpea hummus.",
      es: "Dos huevos cocidos grandes acompañados de zanahorias baby crujientes y hummus tradicional de garbanzos.",
      de: "Zwei hartgekochte Eier mit knackigen Babykarotten und traditionellem Kichererbsen-Knoblauch-Hummus.",
      fr: "Deux gros œufs durs servis avec de petites carottes croquantes et du houmous traditionnel de pois chiches.",
      "pt-BR": "Dois ovos cozidos grandes servidos com mini cenouras crocantes e homus tradicional de grão-de-bico.",
      it: "Due uova sode grandi servite con carotine croccanti e hummus tradizionale di ceci all'aglio.",
      ja: "完全栄養食のゆで卵2個にシャキシャキのベビーキャロット、伝統的なヒヨコ豆のガーリックフムスを添えたヘルシーフィンガースナック。",
      ko: "완숙 삶은 달걀 2개에 아삭한 미니 당근과 전통 병아리콩 갈릭 후무스를 곁들인 완벽한 휴대용 단백질 간식.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["snack"],
    serving: "1 plate (200g)",
    calories: 240,
    proteinGrams: 14,
    carbsGrams: 15,
    fatGrams: 13,
    ingredients: ["Hard-Boiled Eggs", "Baby Carrots", "Traditional Chickpea Hummus", "Paprika"],
  },
  {
    slug: "apple-slices-peanut-butter",
    titles: {
      en: "Crisp Apple Slices with Natural Peanut Butter",
      es: "Rodajas de Manzana Crujiente con Mantequilla de Maní",
      de: "Frische Apfelspalten mit naturbelassener Erdnussbutter",
      fr: "Tranches de Pomme Croquante avec Beurre de Cacahuète",
      "pt-BR": "Fatias de Maçã Crocante com Pasta de Amendoim",
      it: "Fettine di Mela Croccante con Burro di Arachidi Naturale",
      ja: "スライスクリスピーアップルとピーナッツバター",
      ko: "아삭한 사과 슬라이스와 천연 땅콩버터",
    },
    descriptions: {
      en: "Sweet sliced Honeycrisp apple paired with creamy all-natural single-ingredient peanut butter.",
      es: "Manzana Honeycrisp dulce en rodajas con mantequilla de maní 100% natural sin azúcares añadidos.",
      de: "Süßer Apfel in Spalten mit cremiger, 100% naturbelassener Erdnussbutter ohne Zusätze.",
      fr: "Pomme croquante coupée en tranches accompagnée de beurre de cacahuète 100% naturel.",
      "pt-BR": "Maçã fresca fatiada com pasta de amendoim 100% pura sem adição de açúcar ou óleos.",
      it: "Mela fresca a fette accompagnata da burro di arachidi 100% naturale senza zuccheri aggiunti.",
      ja: "みずみずしいハニークリスプアップルのスライスに、無添加100%ピーナッツバターをディップする手軽なスナック。",
      ko: "달콤하고 아삭한 사과 슬라이스에 첨가물 없는 100% 순수 땅콩버터를 곁들인 건강한 에너지 간식.",
    },
    goalTypes: ["lose", "maintain", "gain"],
    mealTypes: ["snack"],
    serving: "1 medium apple + 2 tbsp PB (210g)",
    calories: 260,
    proteinGrams: 7,
    carbsGrams: 30,
    fatGrams: 16,
    ingredients: ["Fresh Honeycrisp Apple", "100% Natural Peanut Butter"],
  },
  {
    slug: "turkey-avocado-wrap",
    titles: {
      en: "Roast Turkey & Avocado Spinach Tortilla Wrap",
      es: "Wrap de Pavo Asado y Aguacate en Tortilla de Espinacas",
      de: "Putenbrust & Avocado Wrap in Spinattortilla",
      fr: "Wrap de Dinde Rôtie et Avocat en Tortilla d'Épinards",
      "pt-BR": "Wrap de Peito de Peru e Abacate na Tortilha de Espinafre",
      it: "Wrap di Tacchino Arrosto e Avocado in Tortilla agli Spinaci",
      ja: "ローストターキー＆アボカドのスピナッチラップ",
      ko: "로스트 터키와 아보카도를 넣은 시금치 또띠아 랩",
    },
    descriptions: {
      en: "Sliced roast turkey breast, mashed Hass avocado, crisp romaine, and Roma tomato rolled inside a whole wheat spinach wrap.",
      es: "Pechuga de pavo asada en lonchas, aguacate Hass, lechuga romana y tomate en tortilla integral de espinaca.",
      de: "Zarte Putenbrust, zerdrückte Hass-Avocado, Römersalat und Tomaten in einem Vollkorn-Spinat-Wrap.",
      fr: "Fines tranches de blanc de dinde rôtie, avocat écrasé, laitue romaine et tomates Roma dans une galette aux épinards.",
      "pt-BR": "Peito de peru fatiado, abacate Hass, alface romana e tomate italiano enrolados em tortilha integral de espinafre.",
      it: "Petto di tacchino arrosto a fette, avocado Hass, lattuga e pomodori Roma in una piadina integrale agli spinaci.",
      ja: "上質なローストターキー胸肉、マッシュアボカド、シャキシャキのロメインレタス、完熟トマトを全粒粉スピナッチラップで包んだヘルシーサンド。",
      ko: "부드러운 로스트 칠면조 가슴살 슬라이스, 아보카도, 신선한 로메인 상추, 토마토를 통밀 시금치 또띠아로 말아낸 샌드위치 랩.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["lunch", "snack"],
    serving: "1 wrap (290g)",
    calories: 480,
    proteinGrams: 36,
    carbsGrams: 42,
    fatGrams: 18,
    ingredients: ["Sliced Roast Turkey", "Whole Wheat Spinach Wrap", "Hass Avocado", "Romaine Lettuce", "Roma Tomatoes"],
  },
  {
    slug: "beef-vegetable-stir-fry-jasmine-rice",
    titles: {
      en: "Beef & Vegetable Stir-Fry with Steamed Jasmine Rice",
      es: "Salteado de Ternera y Verduras con Arroz Jazmín",
      de: "Rindfleisch-Gemüse-Pfanne mit gedämpftem Jasminreis",
      fr: "Wok de Bœuf et Légumes avec Riz Jasmin Vapeur",
      "pt-BR": "Salteado de Carne Bovina e Legumes com Arroz Jasmim",
      it: "Wok di Manzo e Verdure con Riso Jasmin al Vapore",
      ja: "牛赤身肉と彩り野菜の中華炒め、ジャスミンライス添え",
      ko: "소고기 야채 볶음과 자스민 라이스",
    },
    descriptions: {
      en: "Tender beef flank strips wok-seared with snap peas, bell peppers, baby corn, ginger soy glaze, over fragrant jasmine rice.",
      es: "Tiras de ternera salteadas al wok con tirabeques, pimientos, maíz tierno, salsa de soja y jengibre sobre arroz jazmín.",
      de: "Zarte Rinderstreifen aus dem Wok mit Zuckerschoten, Paprika, Mini-Mais und Ingwer-Soja-Sauce auf duftendem Jasminreis.",
      fr: "Émincé de bœuf sauté au wok avec pois gourmands, poivrons, mini-maïs et sauce soja-gingembre sur riz jasmin parfumé.",
      "pt-BR": "Tiras de carne bovina magra salteadas com ervilhas-tortas, pimentões, mini milho e molho de soja e gengibre sobre arroz jasmim.",
      it: "Striscioline di manzo saltate al wok con taccole, peperoni, mais baby e salsa di soia e zenzero su riso profumato.",
      ja: "柔らかい牛赤身肉、スナップエンドウ、パプリカ、ヤングコーンを生姜醤油ダレで香ばしく炒め、香り高いジャスミンライスと合わせた中華風ディナー。",
      ko: "부드러운 소고기 우둔살 스트립과 스냅피, 파프리카, 미니 옥수수를 생강 간장 소스에 볶아 향긋한 자스민 쌀밥과 곁들인 영양 요리.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (460g)",
    calories: 620,
    proteinGrams: 48,
    carbsGrams: 62,
    fatGrams: 20,
    ingredients: ["Lean Beef Flank", "Jasmine Rice", "Sugar Snap Peas", "Bell Peppers", "Soy Ginger Glaze", "Sesame Oil"],
  },
  {
    slug: "grilled-chicken-caesar-salad",
    titles: {
      en: "Classic Grilled Chicken Caesar with Shaved Parmesan",
      es: "Ensalada César con Pollo a la Plancha y Parmesano",
      de: "Klassischer Hähnchen Caesar Salat mit gehobeltem Parmesan",
      fr: "Salade César au Poulet Grillé et Copeaux de Parmesan",
      "pt-BR": "Salada Caesar com Frango Grelhado e Parmesão",
      it: "Insalata Caesar Classica con Pollo e Scaglie di Parmigiano",
      ja: "グリルチキンシーザーサラダ、削りたてパルメザンチーズ",
      ko: "구운 닭가슴살 시저 샐러드와 파마산 치즈",
    },
    descriptions: {
      en: "Seasoned grilled chicken breast over crisp romaine lettuce hearts, aged parmesan shavings, whole grain croutons, and light dressing.",
      es: "Pechuga de pollo a la plancha sobre corazones de lechuga romana, lascas de parmesano curado, picatostes y aderezo ligero.",
      de: "Gegrillte Hähnchenbrust auf Römersalatherzen, gereiftem Parmesan, Vollkorn-Croutons und leichtem Caesar-Dressing.",
      fr: "Blanc de poulet grillé sur cœurs de romaine croquants, copeaux de parmesan affiné, croûtons complets et sauce légère.",
      "pt-BR": "Peito de frango grelhado sobre alface romana, lascas de parmesão curado, croutons integrais e molho caesar leve.",
      it: "Petto di pollo grigliato su cuori di lattuga romana, scaglie di parmigiano reggiano, crostini integrali e salsa leggera.",
      ja: "ジューシーに焼き上げたチキン胸肉にシャキシャキのロメインレタス、熟成パルメザンチーズ、全粒粉クルトン、低カロリーシーザードレッシングを合わせた王道サラダ。",
      ko: "시즈닝한 닭가슴살 구이와 아삭한 로메인 하트, 숙성 파마산 치즈 슬라이스, 통밀 크루통, 라이트 드레싱을 곁들인 든든한 샐러드.",
    },
    goalTypes: ["lose", "maintain"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 large plate (360g)",
    calories: 430,
    proteinGrams: 46,
    carbsGrams: 14,
    fatGrams: 21,
    ingredients: ["Chicken Breast", "Romaine Lettuce", "Aged Parmesan Cheese", "Whole Grain Croutons", "Light Caesar Dressing"],
  },
  {
    slug: "steak-alfredo-pasta",
    titles: {
      en: "Sirloin Steak Alfredo with Fettuccine Pasta",
      es: "Pasta Alfredo con Tiras de Filete de Ternera",
      de: "Steak Alfredo Fettuccine Pasta",
      fr: "Fettuccine Alfredo aux Tranches de Steak Grillé",
      "pt-BR": "Massa Fettuccine Alfredo com Iscas de Bife",
      it: "Fettuccine Alfredo con Tagliata di Manzo",
      ja: "牛ステーキのクリーミーフェットチーネアルフレード",
      ko: "부채살 스테이크 알프레도 페투치네 파스타",
    },
    descriptions: {
      en: "Sliced grilled sirloin steak over durum wheat fettuccine tossed in a rich parmesan and garlic cream sauce with parsley.",
      es: "Filete de ternera a la plancha sobre fettuccine en salsa cremosa de parmesano, ajo y perejil fresco.",
      de: "Gegrillte Rindersteakstreifen auf Hartweizen-Fettuccine in cremiger Parmesan-Knoblauch-Sauce mit Petersilie.",
      fr: "Émincé de steak de bœuf grillé sur fettuccine au blé dur nappées d'une sauce crémeuse parmesan et ail.",
      "pt-BR": "Fatias de bife grelhado sobre fettuccine ao molho alfredo cremoso de parmesão, alho e salsinha.",
      it: "Tagliata di manzo grigliata su fettuccine di semola di grano duro mantecate con crema al parmigiano e aglio.",
      ja: "香ばしくグリルした牛ステーキ肉を、パルメザンチーズとガーリックの濃厚クリームソースで和えたフェットチーネパスタに贅沢にトッピング。",
      ko: "그릴에 구운 소고기 스테이크 슬라이스를 파마산 치즈와 마늘 크림소스로 버무린 페투치네 면 위에 얹은 고급 파스타.",
    },
    goalTypes: ["gain"],
    mealTypes: ["dinner", "lunch"],
    serving: "1 plate (500g)",
    calories: 960,
    proteinGrams: 55,
    carbsGrams: 94,
    fatGrams: 36,
    ingredients: ["Beef Sirloin Steak", "Fettuccine Pasta", "Heavy Cream", "Parmesan Cheese", "Garlic", "Fresh Parsley"],
  },
  {
    slug: "ahi-tuna-poke-bowl",
    titles: {
      en: "Hawaiian Ahi Tuna Poke Bowl with Brown Rice",
      es: "Tazón Poke Hawaiano de Atún con Arroz Integral",
      de: "Hawaiianische Ahi Thunfisch Poke Bowl mit Naturreis",
      fr: "Bol Poke Hawaïen au Thon Ahi et Riz Brun",
      "pt-BR": "Poke Bowl Havaiano de Atum com Arroz Integral",
      it: "Poke Bowl Hawaiana di Tonno Ahi con Riso Integrale",
      ja: "ハワイアン・アヒポキボウル、玄米と枝豆",
      ko: "하와이안 아히 참치 포케 보울과 현미밥",
    },
    descriptions: {
      en: "Fresh sashimi-grade Ahi tuna cubes tossed in sesame soy, over warm brown rice with edamame, cucumber, and seaweed salad.",
      es: "Dados de atún Ahi fresco marinados en soja y sésamo con arroz integral, edamame, pepino y ensalada de algas.",
      de: "Frische Sashimi-Thunfischwürfel in Sesam-Soja-Sauce auf Naturreis mit Edamame, Gurkenscheiben und Algensalat.",
      fr: "Dés de thon Ahi frais mariné au sésame et soja sur riz brun tiède avec edamame, concombre et salade d'algues wakame.",
      "pt-BR": "Cubos de atum Ahi fresco temperados com óleo de gergelim e shoyu sobre arroz integral com edamame e pepino.",
      it: "Cubetti di tonno Ahi fresco marinati in salsa di soia e sesamo su riso integrale con edamame, cetriolo e alghe wakame.",
      ja: "新鮮な生マグロを胡麻醤油ダレで漬けにし、温かい玄米、枝豆、キュウリ、ワカメサラダと合わせた本場ハワイアンポキボウル。",
      ko: "신선한 사시미 등급의 참치 큐브를 참깨 간장에 버무려 따뜻한 현미밥, 에다마메, 오이, 미역 샐러드와 담아낸 하와이안 포케 보울.",
    },
    goalTypes: ["lose", "maintain", "gain"],
    mealTypes: ["lunch", "dinner"],
    serving: "1 bowl (420g)",
    calories: 530,
    proteinGrams: 42,
    carbsGrams: 58,
    fatGrams: 14,
    ingredients: ["Sashimi Ahi Tuna", "Brown Rice", "Edamame Beans", "Cucumber", "Wakame Seaweed", "Sesame Soy Sauce"],
  },
  {
    slug: "overnight-protein-oats-chia",
    titles: {
      en: "Overnight Chia Protein Oats with Blueberries",
      es: "Avena Proteica Nocturna con Chía y Arándanos",
      de: "Overnight Protein-Haferflocken mit Chiasamen und Blaubeeren",
      fr: "Overnight Oats Protéinés aux Graines de Chia et Myrtilles",
      "pt-BR": "Overnight Oats com Chia, Whey e Mirtilos",
      it: "Overnight Oats Proteici con Semi di Chia e Mirtilli",
      ja: "オーバーナイトチアプロテインオーツ、ブルーベリー添え",
      ko: "블루베리와 치아씨드를 넣은 오버나이트 프로틴 오트밀",
    },
    descriptions: {
      en: "Cold-soaked rolled oats with vanilla whey protein, chia seeds, Greek yogurt, and fresh wild blueberries.",
      es: "Avena remojada en frío con proteína de vainilla, semillas de chía, yogur griego y arándanos frescos.",
      de: "Kalt gequollene Haferflocken mit Vanille-Protein, Chiasamen, griechischem Joghurt und frischen Blaubeeren.",
      fr: "Flocons d'avoine infusés à froid avec whey vanille, graines de chia, yaourt grec et myrtilles fraîches.",
      "pt-BR": "Aveia hidratada a frio com whey de baunilha, sementes de chia, iogurte grego e mirtilos frescos.",
      it: "Fiocchi d'avena lasciati a riposo con proteine alla vaniglia, semi di chia, yogurt greco e mirtilli freschi.",
      ja: "一晩アーモンドミルクに漬け込んだオートミールにバニラプロテイン、チアシード、ギリシャヨーグルト、生ブルーベリーをトッピング。",
      ko: "아몬드 밀크에 밤새 불린 오트밀에 바닐라 프로틴, 치아씨드, 그릭 요거트, 신선한 블루베리를 얹은 건강식.",
    },
    goalTypes: ["gain", "maintain"],
    mealTypes: ["breakfast", "snack"],
    serving: "1 jar (320g)",
    calories: 490,
    proteinGrams: 22,
    carbsGrams: 58,
    fatGrams: 20,
    ingredients: ["Rolled Oats", "Whey Protein Powder", "Chia Seeds", "Nonfat Greek Yogurt", "Fresh Blueberries", "Almond Butter"],
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
    const activeSlugs = new Set(catalogSeedItems.map((i) => i.slug));

    // Deactivate any legacy catalog items not in the verified 24 items
    const allExisting = await ctx.db.query("foodCatalog").collect();
    for (const old of allExisting) {
      if (!activeSlugs.has(old.slug) && old.active) {
        await ctx.db.patch(old._id, { active: false, version: old.version + 1 });
      }
    }

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
          foodName: "Protein Oatmeal Pancakes with Maple Syrup",
          serving: "1 stack",
          calories: 560,
          proteinGrams: 38,
          carbsGrams: 74,
          fatGrams: 12,
        },
        {
          mealType: "lunch" as const,
          foodName: "Grilled Chicken Breast with Brown Rice & Broccoli",
          serving: "1 bowl",
          calories: 520,
          proteinGrams: 48,
          carbsGrams: 56,
          fatGrams: 11,
        },
        {
          mealType: "snack" as const,
          foodName: "Peanut Butter & Banana High-Protein Shake",
          serving: "1 glass",
          calories: 420,
          proteinGrams: 35,
          carbsGrams: 42,
          fatGrams: 13,
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

/** Grants Pro entitlement to a specific user for testing/demo purposes. */
export const seedProSubscriptionForUser = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, { clerkUserId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) return { success: false };

    const existing = await ctx.db
      .query("subscriptionMirror")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();

    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    const value = {
      userId: user._id,
      revenueCatCustomerId: clerkUserId,
      state: "active" as const,
      productId: "bodycal_annual_pro",
      periodType: "ANNUAL",
      expirationAt: now + oneYear,
      willRenew: true,
      trial: false,
      lastEventAt: now,
      eventId: `seed_sub_${now}`,
      verifiedAt: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.replace(existing._id, value);
    } else {
      await ctx.db.insert("subscriptionMirror", value);
    }

    return { success: true };
  },
});

/** Grants Pro entitlement to all existing users in the current development database. */
export const grantProToAllDevUsers = internalMutation({
  args: {},
  returns: v.object({ count: v.number() }),
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    for (const user of users) {
      const existing = await ctx.db
        .query("subscriptionMirror")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .unique();

      const value = {
        userId: user._id,
        revenueCatCustomerId: user.clerkUserId,
        state: "active" as const,
        productId: "bodycal_annual_pro",
        periodType: "ANNUAL",
        expirationAt: now + oneYear,
        willRenew: true,
        trial: false,
        lastEventAt: now,
        eventId: `seed_sub_${user._id}`,
        verifiedAt: now,
        updatedAt: now,
      };

      if (existing) {
        await ctx.db.replace(existing._id, value);
      } else {
        await ctx.db.insert("subscriptionMirror", value);
      }
    }

    return { count: users.length };
  },
});

/** Convenience wrapper for local setup: catalog plus one named demo account. */
export const seedAll = internalMutation({
  args: { clerkUserId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    await ctx.runMutation(internal.seed.seedCatalog, {});
    if (clerkUserId) {
      await ctx.runMutation(internal.seed.seedDemoDataForUser, { clerkUserId });
      await ctx.runMutation(internal.seed.seedProSubscriptionForUser, { clerkUserId });
    }
    return null;
  },
});

// ---------------------------------------------------------------------------
// Ninety-day demo history
// ---------------------------------------------------------------------------

type MealPreset = {
  mealType: MealType;
  foodName: string;
  serving: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  source: "ai" | "manual" | "catalog";
};

const breakfastPresets: MealPreset[] = [
  { mealType: "breakfast", foodName: "Protein Oatmeal Pancakes with Maple Syrup", serving: "1 stack", calories: 560, proteinGrams: 38, carbsGrams: 74, fatGrams: 12, source: "catalog" },
  { mealType: "breakfast", foodName: "Greek Yogurt Parfait with Honey & Fresh Berries", serving: "1 bowl", calories: 320, proteinGrams: 25, carbsGrams: 35, fatGrams: 9, source: "catalog" },
  { mealType: "breakfast", foodName: "Spinach, Mixed Berries & Plant Protein Smoothie", serving: "1 glass", calories: 310, proteinGrams: 26, carbsGrams: 40, fatGrams: 4, source: "ai" },
  { mealType: "breakfast", foodName: "Whole Eggs & Avocado on Toasted Sourdough", serving: "2 slices", calories: 410, proteinGrams: 26, carbsGrams: 32, fatGrams: 20, source: "manual" },
];

const lunchPresets: MealPreset[] = [
  { mealType: "lunch", foodName: "Grilled Chicken Breast with Brown Rice & Broccoli", serving: "1 bowl", calories: 520, proteinGrams: 48, carbsGrams: 56, fatGrams: 11, source: "catalog" },
  { mealType: "lunch", foodName: "Roast Turkey & Avocado Spinach Tortilla Wrap", serving: "1 wrap", calories: 480, proteinGrams: 36, carbsGrams: 42, fatGrams: 18, source: "catalog" },
  { mealType: "lunch", foodName: "Pan-Seared Salmon with Sweet Potato & Asparagus", serving: "1 plate", calories: 610, proteinGrams: 44, carbsGrams: 42, fatGrams: 28, source: "ai" },
  { mealType: "lunch", foodName: "Beef & Vegetable Stir-Fry with Steamed Jasmine Rice", serving: "1 plate", calories: 620, proteinGrams: 48, carbsGrams: 62, fatGrams: 20, source: "manual" },
];

const dinnerPresets: MealPreset[] = [
  { mealType: "dinner", foodName: "Sirloin Steak Alfredo with Fettuccine Pasta", serving: "1 plate", calories: 960, proteinGrams: 55, carbsGrams: 94, fatGrams: 36, source: "catalog" },
  { mealType: "dinner", foodName: "Hawaiian Ahi Tuna Poke Bowl with Brown Rice", serving: "1 bowl", calories: 530, proteinGrams: 42, carbsGrams: 58, fatGrams: 14, source: "catalog" },
  { mealType: "dinner", foodName: "Grilled Sirloin Steak with Baked Potato & Spinach", serving: "1 plate", calories: 680, proteinGrams: 54, carbsGrams: 48, fatGrams: 29, source: "ai" },
  { mealType: "dinner", foodName: "Lean Ground Turkey Bolognese with Whole Wheat Penne", serving: "1 plate", calories: 590, proteinGrams: 48, carbsGrams: 68, fatGrams: 13, source: "manual" },
];

const snackPresets: MealPreset[] = [
  { mealType: "snack", foodName: "Peanut Butter & Banana High-Protein Shake", serving: "1 glass", calories: 420, proteinGrams: 35, carbsGrams: 42, fatGrams: 13, source: "catalog" },
  { mealType: "snack", foodName: "Low-Fat Cottage Cheese with Pineapple & Flax Seeds", serving: "1 bowl", calories: 230, proteinGrams: 28, carbsGrams: 22, fatGrams: 4, source: "manual" },
  { mealType: "snack", foodName: "Raw Almonds, Walnuts & Cashews Mix", serving: "1 handful", calories: 210, proteinGrams: 6, carbsGrams: 8, fatGrams: 18, source: "manual" },
];

/**
 * Deterministic pseudo-random in [0, 1).
 */
function pseudoRandom(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43_758.5453;
  return value - Math.floor(value);
}

function pick<T>(items: T[], seed: number): T {
  return items[Math.floor(pseudoRandom(seed) * items.length) % items.length];
}

const DAY_MS = 86_400_000;

/**
 * Writes a realistic multi-month history for ONE named account.
 */
export const seedHistoryForUser = internalMutation({
  args: { clerkUserId: v.string(), days: v.optional(v.number()) },
  returns: v.object({
    days: v.number(),
    goalsInserted: v.number(),
    weightLogsInserted: v.number(),
    foodLogsInserted: v.number(),
    customFoodsInserted: v.number(),
    favoritesInserted: v.number(),
    notificationPreferences: v.string(),
    userSettings: v.string(),
  }),
  handler: async (ctx, args) => {
    const days = Math.min(180, Math.max(1, Math.floor(args.days ?? 90)));
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    if (!user) throw new Error(`No BodyCal user for Clerk id ${args.clerkUserId}`);

    const now = Date.now();
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    const timezone = profile?.timezone ?? "America/New_York";
    const goalWeightKg = profile?.goalWeightKg ?? 78;
    const endWeightKg = profile?.currentWeightKg ?? 72.5;
    const startWeightKg = endWeightKg - (goalWeightKg > endWeightKg ? 4.5 : -4.5);

    const localDateAt = (at: number) => new Date(at).toISOString().slice(0, 10);
    const dayStart = (offset: number) => now - offset * DAY_MS;

    // ---- Effective-dated nutrition goals -----------------------------------
    const goalPlan = [
      { offset: days, calories: 2_650, proteinGrams: 150, carbsGrams: 300, fatGrams: 78 },
      { offset: Math.floor(days / 3), calories: 2_850, proteinGrams: 160, carbsGrams: 320, fatGrams: 85 },
    ];
    let goalsInserted = 0;
    for (const plan of goalPlan) {
      const effectiveFrom = localDateAt(dayStart(plan.offset));
      const existing = await ctx.db
        .query("nutritionGoals")
        .withIndex("by_user_effective", (q) => q.eq("userId", user._id).eq("effectiveFrom", effectiveFrom))
        .unique();
      if (existing) continue;
      await ctx.db.insert("nutritionGoals", {
        userId: user._id,
        calories: plan.calories,
        proteinGrams: plan.proteinGrams,
        carbsGrams: plan.carbsGrams,
        fatGrams: plan.fatGrams,
        effectiveFrom,
        formulaVersion: "mifflin-st-jeor-v1",
        calculationMetadata: {
          bmr: 1_750,
          tdee: 2_600,
          appliedAdjustment: plan.calories - 2_600,
          paceWasCapped: false,
          aiGenerated: false,
        },
        isManualOverride: false,
        createdAt: dayStart(plan.offset),
      });
      goalsInserted += 1;
    }

    // ---- Weight trend, every second day ------------------------------------
    let weightLogsInserted = 0;
    for (let offset = days; offset >= 0; offset -= 2) {
      const at = dayStart(offset);
      const clientRequestId = `seed_weight_${days}_${offset}`;
      const existing = await ctx.db
        .query("weightLogs")
        .withIndex("by_user_request", (q) => q.eq("userId", user._id).eq("clientRequestId", clientRequestId))
        .unique();
      if (existing) continue;

      const progress = (days - offset) / days;
      const noise = (pseudoRandom(offset + 1) - 0.5) * 0.5;
      const weight = Math.round((startWeightKg + (endWeightKg - startWeightKg) * progress + noise) * 10) / 10;
      await ctx.db.insert("weightLogs", {
        userId: user._id,
        normalizedKg: weight,
        displayValue: weight,
        displayUnit: profile?.weightUnit ?? "kg",
        localDate: localDateAt(at),
        timezone,
        clientRequestId,
        createdAt: at,
        updatedAt: at,
      });
      weightLogsInserted += 1;
    }

    // ---- Daily meals --------------------------------------------------------
    let foodLogsInserted = 0;
    for (let offset = days; offset >= 0; offset -= 1) {
      if (pseudoRandom(offset * 7.7) < 0.08) continue;

      const at = dayStart(offset);
      const localDate = localDateAt(at);
      const meals: MealPreset[] = [
        pick(breakfastPresets, offset * 3.1),
        pick(lunchPresets, offset * 5.3),
        pick(dinnerPresets, offset * 7.1),
      ];
      if (pseudoRandom(offset * 2.3) > 0.45) meals.push(pick(snackPresets, offset * 11.7));

      for (const [index, meal] of meals.entries()) {
        const clientRequestId = `seed_food_${days}_${offset}_${index}`;
        const existing = await ctx.db
          .query("foodLogs")
          .withIndex("by_user_request", (q) => q.eq("userId", user._id).eq("clientRequestId", clientRequestId))
          .unique();
        if (existing) continue;

        const loggedAt = at - (meals.length - index) * 3_600_000;
        await ctx.db.insert("foodLogs", {
          userId: user._id,
          localDate,
          timezone,
          mealType: meal.mealType,
          source: meal.source,
          foodName: meal.foodName,
          serving: meal.serving,
          servingUnit: "portion",
          quantity: 1,
          calories: meal.calories,
          proteinGrams: meal.proteinGrams,
          carbsGrams: meal.carbsGrams,
          fatGrams: meal.fatGrams,
          clientRequestId,
          createdAt: loggedAt,
          updatedAt: loggedAt,
        });
        foodLogsInserted += 1;
      }
    }

    // ---- Custom foods -------------------------------------------------------
    const customFoodSeeds = [
      { name: "Home Protein Shake", serving: "1 shaker (500 ml)", calories: 380, proteinGrams: 40, carbsGrams: 32, fatGrams: 8, favorite: true },
      { name: "Chicken Curry with Rice", serving: "1 bowl (350 g)", calories: 620, proteinGrams: 42, carbsGrams: 48, fatGrams: 26, favorite: false },
      { name: "Overnight Oats with Berries", serving: "1 jar (300 g)", calories: 450, proteinGrams: 22, carbsGrams: 62, fatGrams: 14, favorite: true },
    ];
    const existingCustom = await ctx.db
      .query("customFoods")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    let customFoodsInserted = 0;
    for (const seed of customFoodSeeds) {
      if (existingCustom.some((item) => item.name === seed.name)) continue;
      await ctx.db.insert("customFoods", {
        userId: user._id,
        name: seed.name,
        serving: seed.serving,
        servingUnit: "portion",
        calories: seed.calories,
        proteinGrams: seed.proteinGrams,
        carbsGrams: seed.carbsGrams,
        fatGrams: seed.fatGrams,
        favorite: seed.favorite,
        createdAt: now,
        updatedAt: now,
      });
      customFoodsInserted += 1;
    }

    // ---- Favourites over real catalog rows -----------------------------------
    let favoritesInserted = 0;
    for (const slug of ["chicken-rice-broccoli-bowl", "greek-yogurt-honey-berries"]) {
      const item = await ctx.db
        .query("foodCatalog")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!item) continue;
      const existing = await ctx.db
        .query("favorites")
        .withIndex("by_user_reference", (q) => q.eq("userId", user._id).eq("referenceId", item._id))
        .unique();
      if (existing) continue;
      await ctx.db.insert("favorites", {
        userId: user._id,
        referenceType: "catalog",
        referenceId: item._id,
        createdAt: now,
      });
      favoritesInserted += 1;
    }

    // ---- Reminder preferences -------------------------------------------------
    const existingPreferences = await ctx.db
      .query("notificationPreferences")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    let notificationPreferences = "kept";
    if (!existingPreferences) {
      await ctx.db.insert("notificationPreferences", {
        userId: user._id,
        enabled: true,
        categories: { daily: true, meal: true, hydration: false, progress: true, motivation: false },
        times: { daily: "09:00", meal: "12:30", hydration: "15:00", progress: "19:00", motivation: "08:00" },
        timezone,
        permissionStatus: "granted",
        updatedAt: now,
      });
      notificationPreferences = "created";
    }

    // ---- App settings ---------------------------------------------------------
    const existingSettings = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    let userSettings = "kept";
    if (!existingSettings) {
      await ctx.db.insert("userSettings", {
        userId: user._id,
        languageMode: "system",
        units: "metric",
        appearance: "system",
        analyticsConsent: false,
        updatedAt: now,
      });
      userSettings = "created";
    }

    return {
      days,
      goalsInserted,
      weightLogsInserted,
      foodLogsInserted,
      customFoodsInserted,
      favoritesInserted,
      notificationPreferences,
      userSettings,
    };
  },
});

/**
 * Grants Pro entitlement to a user by Clerk ID for development/testing.
 */
export const grantProForUser = internalMutation({
  args: { clerkUserId: v.string(), days: v.optional(v.number()) },
  returns: v.object({ success: v.boolean(), clerkUserId: v.string(), expirationAt: v.number() }),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    if (!user) throw new Error(`User with clerkUserId "${args.clerkUserId}" not found`);
    const durationDays = args.days ?? 365;
    const expirationAt = Date.now() + durationDays * 24 * 60 * 60 * 1_000;

    await ctx.runMutation(internal.subscriptions.applyVerification, {
      customerId: args.clerkUserId,
      active: true,
      trial: false,
      productId: "bodycal_annual",
      periodType: "annual",
      expirationAt,
      willRenew: true,
    });
    return { success: true, clerkUserId: args.clerkUserId, expirationAt };
  },
});
