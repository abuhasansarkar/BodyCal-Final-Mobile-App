import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import {
  authAccountTranslations,
  cameraTranslations,
  dashboardExtraTranslations,
  dashboardTranslations,
  onboardingTranslations,
  paywallFlowTranslations,
  paywallTranslations,
  postPurchaseTranslations,
  profileTranslations,
  resources,
  tabExtraTranslations,
} from "@/locales/resources";
import { screenTranslations } from "@/locales/screens";

const LANGUAGE_STORAGE_KEY = "bodycal.language.v1";

export const languageOptions = [
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "pt-BR", flag: "🇧🇷", name: "Português (Brasil)" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "ja", flag: "🇯🇵", name: "日本語" },
  { code: "ko", flag: "🇰🇷", name: "한국어" },
] as const;

export type SupportedLanguage = (typeof languageOptions)[number]["code"];

export const supportedLanguages: SupportedLanguage[] = languageOptions.map((option) => option.code);

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value !== null && (supportedLanguages as string[]).includes(value);
}

/**
 * Builds one language bundle.
 *
 * Every language — English included — goes through the same merge. English used to
 * take a shorter path that skipped most namespace modules, which is precisely why
 * the missing French and Italian keys went unnoticed for so long.
 */
/**
 * Reads a per-language namespace module.
 *
 * `onboardingTranslations` carries only the seven non-English languages because
 * English lives in `resources.en.translation`; this keeps that asymmetry in one
 * place instead of forking the whole merge.
 */
function pick<T>(map: Record<string, T>, language: SupportedLanguage): T | undefined {
  return map[language];
}

function buildBundle(language: SupportedLanguage) {
  const base = resources[language].translation;
  const screens = screenTranslations[language];

  return {
    translation: {
      ...base,
      auth: { ...base.auth, ...(authAccountTranslations[language] ?? {}) },
      tabs: { ...base.tabs, ...(tabExtraTranslations[language] ?? {}) },
      profile: profileTranslations[language],
      camera: cameraTranslations[language],
      paywall: paywallTranslations[language],
      paywallFlow: paywallFlowTranslations[language],
      dashboard: { ...dashboardTranslations[language], ...dashboardExtraTranslations[language] },

      onboarding: {
        // English onboarding copy lives in `resources`, the other seven in
        // `onboardingTranslations`. Read whichever exists, then apply the shared keys.
        ...((base as Record<string, object | undefined>).onboarding ?? {}),
        ...(pick(onboardingTranslations as Record<string, object>, language) ?? {}),
        ...screens.onboarding,
      },
      postPurchase: {
        ...postPurchaseTranslations[language],
        review: {
          ...postPurchaseTranslations[language].review,
          honestTitle: screens.postPurchaseReview.honestTitle,
          honestDescription: screens.postPurchaseReview.honestDescription,
          submitting: screens.postPurchaseReview.submitting,
          submitError: screens.postPurchaseReview.submitError,
          reasons: [
            {
              title: screens.postPurchaseReview.reasonAccuracyTitle,
              description: screens.postPurchaseReview.reasonAccuracyDescription,
            },
            {
              title: screens.postPurchaseReview.reasonSpeedTitle,
              description: screens.postPurchaseReview.reasonSpeedDescription,
            },
          ],
        },
      },

      common: { ...base.common, ...screens.common },
      config: screens.config,
      errors: screens.errors,
      authFlow: screens.authFlow,
      progress: screens.progress,
      foodLogEdit: screens.foodLogEdit,
      goalSettings: screens.goalSettings,
      personalDetails: screens.personalDetails,
      nutritionTargets: screens.nutritionTargets,
      notificationSettings: screens.notificationSettings,
      unitSettings: screens.unitSettings,
      appearanceSettings: screens.appearanceSettings,
      languageSettings: screens.languageSettings,
      subscriptionSettings: screens.subscriptionSettings,
      privacySettings: screens.privacySettings,
      helpSettings: screens.helpSettings,
      termsSettings: screens.termsSettings,
      deleteAccount: screens.deleteAccount,
      foodSearch: screens.foodSearch,
      foodDetail: screens.foodDetail,
      manualFood: screens.manualFood,
      foodHeadline: screens.foodHeadline,
      foodCategories: screens.foodCategories,
      scan: screens.scan,
      weight: screens.weight,
      history: screens.history,
    },
  };
}

const localizedResources = Object.fromEntries(
  supportedLanguages.map((language) => [language, buildBundle(language)]),
);

function resolveDeviceLanguage(): SupportedLanguage {
  const tag = getLocales()[0]?.languageTag ?? "en";
  if (isSupportedLanguage(tag)) return tag;
  const base = tag.split("-")[0];
  const match = supportedLanguages.find((language) => language.split("-")[0] === base);
  return match ?? "en";
}

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: localizedResources,
  lng: resolveDeviceLanguage(),
  fallbackLng: "en",
  compatibilityJSON: "v4",
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function hydrateAppLanguage() {
  const persisted = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isSupportedLanguage(persisted) && i18n.resolvedLanguage !== persisted) {
    await i18n.changeLanguage(persisted);
  }
}

export async function setAppLanguage(languageCode: SupportedLanguage) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  await i18n.changeLanguage(languageCode);
}

/** Clears the manual language choice so the device language applies again. */
export async function useDeviceLanguage() {
  await AsyncStorage.removeItem(LANGUAGE_STORAGE_KEY);
  await i18n.changeLanguage(resolveDeviceLanguage());
}

export { i18n };
