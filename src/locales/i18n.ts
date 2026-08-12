import AsyncStorage from "@react-native-async-storage/async-storage";
import { getLocales } from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import { authAccountTranslations, cameraTranslations, dashboardExtraTranslations, dashboardTranslations, onboardingTranslations, paywallFlowTranslations, paywallTranslations, postPurchaseTranslations, profileTranslations, resources, tabExtraTranslations } from "@/locales/resources";

const LANGUAGE_STORAGE_KEY = "bodycal.language.v1";
const supportedLanguages = Object.keys(resources);
export type SupportedLanguage = keyof typeof resources;
export const languageOptions: { code: SupportedLanguage; flag: string; name: string }[] = [
  { code: "en", flag: "🇺🇸", name: "English" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "pt-BR", flag: "🇧🇷", name: "Português (Brasil)" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "ja", flag: "🇯🇵", name: "日本語" },
  { code: "ko", flag: "🇰🇷", name: "한국어" },
];

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value !== null && supportedLanguages.includes(value);
}

const i18n = createInstance();
const localizedResources = {
  en: { translation: { ...resources.en.translation, profile: profileTranslations.en } },
  es: { translation: { ...resources.es.translation, auth: { ...resources.es.translation.auth, ...authAccountTranslations.es }, tabs: { ...resources.es.translation.tabs, ...tabExtraTranslations.es }, profile: profileTranslations.es, onboarding: onboardingTranslations.es, paywall: paywallTranslations.es, postPurchase: postPurchaseTranslations.es, dashboard: { ...dashboardTranslations.es, ...dashboardExtraTranslations.es }, paywallFlow: paywallFlowTranslations.es, camera: cameraTranslations.es } },
  de: { translation: { ...resources.de.translation, auth: { ...resources.de.translation.auth, ...authAccountTranslations.de }, tabs: { ...resources.de.translation.tabs, ...tabExtraTranslations.de }, profile: profileTranslations.de, onboarding: onboardingTranslations.de, paywall: paywallTranslations.de, postPurchase: postPurchaseTranslations.de, dashboard: { ...dashboardTranslations.de, ...dashboardExtraTranslations.de }, paywallFlow: paywallFlowTranslations.de, camera: cameraTranslations.de } },
  fr: { translation: { ...resources.fr.translation, auth: { ...resources.fr.translation.auth, ...authAccountTranslations.fr }, tabs: { ...resources.fr.translation.tabs, ...tabExtraTranslations.fr }, profile: profileTranslations.fr, onboarding: onboardingTranslations.fr, paywall: paywallTranslations.fr, postPurchase: postPurchaseTranslations.fr, dashboard: { ...dashboardTranslations.fr, ...dashboardExtraTranslations.fr }, paywallFlow: paywallFlowTranslations.fr, camera: cameraTranslations.fr } },
  "pt-BR": { translation: { ...resources["pt-BR"].translation, auth: { ...resources["pt-BR"].translation.auth, ...authAccountTranslations["pt-BR"] }, tabs: { ...resources["pt-BR"].translation.tabs, ...tabExtraTranslations["pt-BR"] }, profile: profileTranslations["pt-BR"], onboarding: onboardingTranslations["pt-BR"], paywall: paywallTranslations["pt-BR"], postPurchase: postPurchaseTranslations["pt-BR"], dashboard: { ...dashboardTranslations["pt-BR"], ...dashboardExtraTranslations["pt-BR"] }, paywallFlow: paywallFlowTranslations["pt-BR"], camera: cameraTranslations["pt-BR"] } },
  it: { translation: { ...resources.it.translation, auth: { ...resources.it.translation.auth, ...authAccountTranslations.it }, tabs: { ...resources.it.translation.tabs, ...tabExtraTranslations.it }, profile: profileTranslations.it, onboarding: onboardingTranslations.it, paywall: paywallTranslations.it, postPurchase: postPurchaseTranslations.it, dashboard: { ...dashboardTranslations.it, ...dashboardExtraTranslations.it }, paywallFlow: paywallFlowTranslations.it, camera: cameraTranslations.it } },
  ja: { translation: { ...resources.ja.translation, auth: { ...resources.ja.translation.auth, ...authAccountTranslations.ja }, tabs: { ...resources.ja.translation.tabs, ...tabExtraTranslations.ja }, profile: profileTranslations.ja, onboarding: onboardingTranslations.ja, paywall: paywallTranslations.ja, postPurchase: postPurchaseTranslations.ja, dashboard: { ...dashboardTranslations.ja, ...dashboardExtraTranslations.ja }, paywallFlow: paywallFlowTranslations.ja, camera: cameraTranslations.ja } },
  ko: { translation: { ...resources.ko.translation, auth: { ...resources.ko.translation.auth, ...authAccountTranslations.ko }, tabs: { ...resources.ko.translation.tabs, ...tabExtraTranslations.ko }, profile: profileTranslations.ko, onboarding: onboardingTranslations.ko, paywall: paywallTranslations.ko, postPurchase: postPurchaseTranslations.ko, dashboard: { ...dashboardTranslations.ko, ...dashboardExtraTranslations.ko }, paywallFlow: paywallFlowTranslations.ko, camera: cameraTranslations.ko } },
};
const deviceTag = getLocales()[0]?.languageTag ?? "en";
const deviceLanguage = supportedLanguages.includes(deviceTag)
  ? deviceTag
  : supportedLanguages.includes(deviceTag.split("-")[0])
    ? deviceTag.split("-")[0]
    : "en";
void i18n.use(initReactI18next).init({
  resources: localizedResources,
  lng: deviceLanguage,
  fallbackLng: "en",
  compatibilityJSON: "v4",
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export async function hydrateAppLanguage() {
  const persistedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (isSupportedLanguage(persistedLanguage) && i18n.resolvedLanguage !== persistedLanguage) {
    await i18n.changeLanguage(persistedLanguage);
  }
}

export async function setAppLanguage(languageCode: SupportedLanguage) {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
  await i18n.changeLanguage(languageCode);
}

export { i18n, supportedLanguages };
