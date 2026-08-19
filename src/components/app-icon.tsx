import { SymbolView, type AndroidSymbol, type SFSymbol, type SymbolViewProps } from "expo-symbols";
import regular from "expo-symbols/androidWeights/regular";
import semiBold from "expo-symbols/androidWeights/semiBold";
import type { ColorValue } from "react-native";

const appSymbols = {
  activity: { ios: "figure.run", android: "directions_run", web: "directions_run" },
  activeActivity: { ios: "figure.run", android: "directions_run", web: "directions_run" },
  add: { ios: "plus", android: "add", web: "add" },
  analysis: { ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" },
  appearance: { ios: "circle.lefthalf.filled", android: "palette", web: "palette" },
  back: { ios: "chevron.left", android: "arrow_back", web: "arrow_back" },
  calendar: { ios: "calendar", android: "calendar_today", web: "calendar_today" },
  calories: { ios: "flame.fill", android: "local_fire_department", web: "local_fire_department" },
  camera: { ios: "camera.fill", android: "camera", web: "camera" },
  carbs: { ios: "leaf.fill", android: "nutrition", web: "nutrition" },
  check: { ios: "checkmark", android: "check", web: "check" },
  checkCircle: { ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" },
  celebration: { ios: "hands.clap.fill", android: "celebration", web: "celebration" },
  chevronRight: { ios: "chevron.right", android: "chevron_right", web: "chevron_right" },
  close: { ios: "xmark", android: "close", web: "close" },
  delete: { ios: "trash.fill", android: "delete", web: "delete" },
  edit: { ios: "pencil", android: "edit", web: "edit" },
  eye: { ios: "eye.fill", android: "visibility", web: "visibility" },
  eyeOff: { ios: "eye.slash.fill", android: "visibility_off", web: "visibility_off" },
  fastPace: { ios: "hare.fill", android: "bolt", web: "bolt" },
  fat: { ios: "drop.fill", android: "water_drop", web: "water_drop" },
  feedback: { ios: "bubble.left.and.text.bubble.right.fill", android: "feedback", web: "feedback" },
  /*
    The calculation-basis pair. Both used to be `person.fill` on iOS, so the two
    options on that screen rendered the identical glyph and the icon told the
    user nothing — Android was fine, because Material's `male`/`female` are the
    distinct Mars and Venus marks. SF Symbols has no Mars/Venus, so iOS uses the
    standing-figure pair instead; both are SF Symbols 4 (iOS 16), inside the
    project's deployment target.
  */
  female: { ios: "figure.stand.dress", android: "female", web: "female" },
  foods: { ios: "fork.knife", android: "restaurant", web: "restaurant" },
  goal: { ios: "target", android: "track_changes", web: "track_changes" },
  goalGain: { ios: "arrow.up.right", android: "trending_up", web: "trending_up" },
  goalLose: { ios: "arrow.down.right", android: "trending_down", web: "trending_down" },
  goalMaintain: { ios: "equal", android: "horizontal_rule", web: "horizontal_rule" },
  help: { ios: "questionmark.circle", android: "help", web: "help" },
  history: { ios: "clock.arrow.circlepath", android: "history", web: "history" },
  heart: { ios: "heart.fill", android: "favorite", web: "favorite" },
  heartOutline: { ios: "heart", android: "favorite_border", web: "favorite_border" },
  home: { ios: "house.fill", android: "home", web: "home" },
  /** Unselected tab-bar variant. Selected tabs use the filled symbol. */
  homeOutline: { ios: "house", android: "home", web: "home" },
  hydration: { ios: "drop.fill", android: "water_drop", web: "water_drop" },
  info: { ios: "info.circle.fill", android: "info", web: "info" },
  /*
    Ingredient glyphs for the food-detail list.

    SF Symbols carries no meat, grain or nut glyph, so those iOS entries settle
    on the nearest honest stand-in (a pan, a laurel, a seed grid) while Android
    uses Material's literal food symbols. Everything here is available at the
    project's iOS 16.4 deployment target — SF Symbols 5 additions such as
    `waterbottle.fill` are deliberately avoided, because an unavailable symbol
    renders as nothing at all.
  */
  ingredientBeverage: { ios: "cup.and.saucer.fill", android: "local_cafe", web: "local_cafe" },
  ingredientDairy: { ios: "mug.fill", android: "local_drink", web: "local_drink" },
  ingredientEgg: { ios: "oval.fill", android: "egg", web: "egg" },
  ingredientFat: { ios: "drop.fill", android: "opacity", web: "opacity" },
  ingredientFish: { ios: "fish.fill", android: "set_meal", web: "set_meal" },
  ingredientFruit: { ios: "leaf.fill", android: "nutrition", web: "nutrition" },
  ingredientGrain: { ios: "laurel.leading", android: "grain", web: "grain" },
  ingredientMeat: { ios: "frying.pan.fill", android: "kebab_dining", web: "kebab_dining" },
  ingredientNut: { ios: "circle.grid.2x2.fill", android: "spa", web: "spa" },
  ingredientSupplement: { ios: "dumbbell.fill", android: "fitness_center", web: "fitness_center" },
  ingredientSweetener: { ios: "birthday.cake.fill", android: "icecream", web: "icecream" },
  ingredientVegetable: { ios: "carrot.fill", android: "eco", web: "eco" },
  language: { ios: "globe", android: "language", web: "language" },
  light: { ios: "sun.max.fill", android: "light_mode", web: "light_mode" },
  lightActivity: { ios: "figure.walk", android: "directions_walk", web: "directions_walk" },
  logout: { ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" },
  macros: { ios: "chart.pie.fill", android: "pie_chart", web: "pie_chart" },
  male: { ios: "figure.stand", android: "male", web: "male" },
  motivation: { ios: "sparkles", android: "auto_awesome", web: "auto_awesome" },
  notification: { ios: "bell.fill", android: "notifications", web: "notifications" },
  nutrition: { ios: "chart.bar.fill", android: "nutrition", web: "nutrition" },
  personalDetails: { ios: "person.text.rectangle", android: "person", web: "person" },
  photos: { ios: "photo.on.rectangle", android: "photo_library", web: "photo_library" },
  privacy: { ios: "hand.raised.fill", android: "privacy_tip", web: "privacy_tip" },
  profile: { ios: "person.fill", android: "person", web: "person" },
  /** Unselected tab-bar variant. Selected tabs use the filled symbol. */
  profileOutline: { ios: "person", android: "person", web: "person" },
  progress: { ios: "chart.line.uptrend.xyaxis", android: "monitoring", web: "monitoring" },
  protein: { ios: "dumbbell.fill", android: "fitness_center", web: "fitness_center" },
  recommendedPace: { ios: "gauge.with.dots.needle.50percent", android: "speed", web: "speed" },
  refresh: { ios: "arrow.clockwise", android: "refresh", web: "refresh" },
  scan: { ios: "viewfinder", android: "center_focus_strong", web: "center_focus_strong" },
  search: { ios: "magnifyingglass", android: "search", web: "search" },
  sedentary: { ios: "chair.fill", android: "chair", web: "chair" },
  settings: { ios: "gearshape.fill", android: "settings", web: "settings" },
  slowPace: { ios: "tortoise.fill", android: "speed", web: "speed" },
  star: { ios: "star.fill", android: "star", web: "star" },
  subscription: { ios: "crown.fill", android: "workspace_premium", web: "workspace_premium" },
  terms: { ios: "doc.text.fill", android: "description", web: "description" },
  /** Camera torch. The bolt, not `light`'s sun — this switches the LED, not a theme. */
  torch: { ios: "bolt.fill", android: "flash_on", web: "flash_on" },
  torchOff: { ios: "bolt.slash.fill", android: "flash_off", web: "flash_off" },
  units: { ios: "ruler", android: "straighten", web: "straighten" },
  unlock: { ios: "lock.open.fill", android: "lock_open", web: "lock_open" },
  veryActive: { ios: "dumbbell.fill", android: "fitness_center", web: "fitness_center" },
  warning: { ios: "exclamationmark.triangle.fill", android: "warning", web: "warning" },
  weight: { ios: "scalemass.fill", android: "scale", web: "scale" },
} satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol }>;

export type AppIconName = keyof typeof appSymbols;

type AppIconProps = Omit<SymbolViewProps, "name" | "size" | "tintColor" | "weight"> & {
  color?: ColorValue;
  name: AppIconName;
  size?: number;
  weight?: "regular" | "semibold";
};

export function AppIcon({ color = "#111111", name, size = 24, weight = "regular", ...props }: AppIconProps) {
  return <SymbolView accessible={false} name={appSymbols[name]} size={size} tintColor={color} weight={{ android: weight === "semibold" ? semiBold : regular, ios: weight }} {...props} />;
}
