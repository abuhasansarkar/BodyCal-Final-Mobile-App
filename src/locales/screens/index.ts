import { de } from "./de";
import { en, type ScreenTranslations } from "./en";
import { es } from "./es";
import { fr } from "./fr";
import { it } from "./it";
import { ja } from "./ja";
import { ko } from "./ko";
import { ptBR } from "./pt-BR";

export type { ScreenTranslations } from "./en";

/**
 * Screen translations for every launch language.
 *
 * Each entry is typed `ScreenTranslations`, derived from the English file, so a
 * missing or misspelled key fails `tsc` instead of falling back to English at
 * runtime. That is what previously let French and Italian drift 76 keys behind.
 */
export const screenTranslations: Record<
  "en" | "es" | "de" | "fr" | "pt-BR" | "it" | "ja" | "ko",
  ScreenTranslations
> = {
  en,
  es,
  de,
  fr,
  "pt-BR": ptBR,
  it,
  ja,
  ko,
};
