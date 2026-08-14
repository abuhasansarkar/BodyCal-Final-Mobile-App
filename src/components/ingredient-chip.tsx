import { AppIcon } from "@/components/app-icon";
import { colors } from "@/config/theme";
import { ingredientIcon } from "@/lib/ingredient-icon";
import { Text, View } from "@/tw";

/**
 * One food component: the glyph its name suggests, the name, and optionally what
 * was on the plate — a catalog ingredient has no portion, a scanned component
 * does.
 *
 * The glyph is decorative and marked so: it is guessed from the name and carries
 * nothing the adjacent text does not already say.
 */
export function IngredientChip({ detail, name }: { detail?: string; name: string }) {
  return (
    <View
      className="min-h-11 flex-row items-center gap-2 rounded-2xl border border-app-border bg-white px-3 py-2"
      style={{ borderCurve: "continuous" }}
    >
      <AppIcon color={colors.muted} name={ingredientIcon(name)} size={17} />
      <View className="min-w-0 shrink">
        <Text className="text-[14px] font-medium text-app-text" selectable>
          {name}
        </Text>
        {detail ? (
          <Text className="text-[12px] text-app-muted" numberOfLines={1} selectable>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
