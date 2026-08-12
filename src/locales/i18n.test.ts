import { afterEach, describe, expect, it } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { hydrateAppLanguage, i18n, setAppLanguage } from "@/locales/i18n";

afterEach(async () => {
  await AsyncStorage.clear();
  await setAppLanguage("en");
});

describe("i18n startup", () => {
  it("resolves nested welcome keys before the first screen render", () => {
    expect(i18n.isInitialized).toBe(true);
    expect(i18n.t("welcome.title", { lng: "en" })).toBe("Calorie tracking made easy");
    expect(i18n.t("welcome.accountPrompt", { lng: "en" })).toBe("Already have an account?");
    expect(i18n.t("welcome.scanHeroImage", { lng: "en" })).toBe("A person photographing a healthy meal");
  });

  it("provides localized sign-in copy for every launch language", () => {
    for (const language of ["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"] as const) {
      expect(i18n.t("auth.title", { lng: language })).not.toBe("auth.title");
      expect(i18n.t("auth.signIn", { lng: language })).not.toBe("auth.signIn");
      expect(i18n.t("auth.emailSignIn", { lng: language })).not.toBe("auth.emailSignIn");
      expect(i18n.t("auth.verificationCode", { lng: language })).not.toBe("auth.verificationCode");
      expect(i18n.t("auth.createAccountTitle", { lng: language })).not.toBe("auth.createAccountTitle");
      expect(i18n.t("auth.name", { lng: language })).not.toBe("auth.name");
      expect(i18n.t("auth.authenticationFailed", { lng: language })).not.toBe("auth.authenticationFailed");
    }
  });

  it("provides localized paywall copy for every launch language", () => {
    for (const language of ["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"] as const) {
      expect(i18n.t("paywall.title", { lng: language })).not.toBe("paywall.title");
      expect(i18n.t("paywall.startTrialDays", { lng: language, count: 3 })).not.toBe("paywall.startTrialDays");
      expect(i18n.t("paywall.restore", { lng: language })).not.toBe("paywall.restore");
    }
  });

  it("provides localized dashboard navigation and streak labels", () => {
    for (const language of ["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"] as const) {
      expect(i18n.t("tabs.home", { lng: language })).not.toBe("tabs.home");
      expect(i18n.t("tabs.scan", { lng: language })).not.toBe("tabs.scan");
      expect(i18n.t("dashboard.streakLabel", { lng: language, count: 4 })).not.toBe("dashboard.streakLabel");
    }
  });

  it("provides localized profile copy for every launch language", () => {
    for (const language of ["en", "es", "de", "fr", "pt-BR", "it", "ja", "ko"] as const) {
      expect(i18n.t("profile.title", { lng: language })).not.toBe("profile.title");
      expect(i18n.t("profile.goalSummary", { lng: language })).not.toBe("profile.goalSummary");
      expect(i18n.t("profile.settings.nutritionTargets", { lng: language })).not.toBe("profile.settings.nutritionTargets");
      expect(i18n.t("profile.signOut", { lng: language })).not.toBe("profile.signOut");
    }
  });

  it("changes the active translations and persists the choice", async () => {
    await setAppLanguage("es");

    expect(i18n.t("welcome.title")).toBe("Controlar calorías ahora es fácil");
    expect(i18n.t("language.title")).toBe("Idioma");
    expect(await AsyncStorage.getItem("bodycal.language.v1")).toBe("es");
  });

  it("restores the persisted language before the app is shown", async () => {
    await AsyncStorage.setItem("bodycal.language.v1", "fr");
    await hydrateAppLanguage();

    expect(i18n.t("language.title")).toBe("Langue");
  });
});
