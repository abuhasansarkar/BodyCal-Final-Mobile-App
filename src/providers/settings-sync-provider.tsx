import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { PropsWithChildren } from "react";
import React from "react";

import { api } from "@/lib/convex-api";
import {
  i18n,
  readStoredLanguage,
  setAppLanguage,
  supportedLanguages,
  type SupportedLanguage,
} from "@/locales/i18n";
import { useAnalyticsConsent } from "@/providers/analytics-provider";

/**
 * Keeps device preferences and the account's copy of them in step.
 *
 * `userSettings` had a writer and no reader: `settings.update` was called from
 * the units and privacy screens, and `settings.get` had no caller anywhere in
 * the app. So the table recorded choices that were never consulted, and the
 * comment on it — that these preferences "follow the account across devices" —
 * described something that did not happen. Signing in on a new phone came up in
 * the device language with analytics consent unasked, whatever the account had
 * previously chosen.
 *
 * Language was worse than unread: nothing ever wrote it. `setAppLanguage` stores
 * to AsyncStorage alone, so `languageMode`/`language` only ever held the
 * defaults `settings.update` inserts.
 *
 * Two directions, with different rules:
 *
 * - **Pull** runs once, and only fills in what this device has no answer for.
 *   A device with its own stored language keeps it; a device that has already
 *   answered the analytics question keeps that answer. The account's copy is a
 *   starting point for a new device, never an overrule of the one in your hand.
 * - **Push** mirrors this device's choices upward whenever they differ, so the
 *   next device has something to adopt.
 *
 * Units are deliberately not handled here. They live on `userProfiles`, which
 * `profiles.getCurrent` already reads back, so they follow the account through
 * the profile rather than through this table.
 *
 * Everything below is gated on `useConvexAuth`. This provider sits inside
 * `ConvexUserGate`, which renders its children *unwrapped* for a signed-out
 * visitor — the auth and public routes live under the same tree — so subscribing
 * unconditionally threw `Unauthenticated` on the welcome screen, before anyone
 * had signed in to have preferences at all. Past the gate's signed-in branch the
 * Convex user row is guaranteed to exist, so `isAuthenticated` is the only
 * condition this needs.
 */

function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return value !== undefined && (supportedLanguages as string[]).includes(value);
}

export function SettingsSyncProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useConvexAuth();
  const remote = useQuery(api.settings.get, isAuthenticated ? {} : "skip");
  const updateSettings = useMutation(api.settings.update);
  const { consent, isLoaded: consentLoaded, setConsent } = useAnalyticsConsent();

  const [localLanguage, setLocalLanguage] = React.useState<SupportedLanguage | null | undefined>(
    undefined,
  );
  const pulled = React.useRef(false);

  // Track this device's manual choice, re-reading whenever the language changes
  // so the push effect below sees a switch made on either language screen.
  React.useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      void readStoredLanguage().then((value) => {
        if (!cancelled) setLocalLanguage(value);
      });
    };
    refresh();
    i18n.on("languageChanged", refresh);
    return () => {
      cancelled = true;
      i18n.off("languageChanged", refresh);
    };
  }, []);

  React.useEffect(() => {
    if (!isAuthenticated) {
      pulled.current = false;
      return;
    }
    if (remote === undefined || localLanguage === undefined || !consentLoaded) return;
    if (pulled.current) return;
    pulled.current = true;

    void (async () => {
      if (localLanguage === null && remote?.languageMode === "manual") {
        if (isSupportedLanguage(remote.language)) await setAppLanguage(remote.language);
      }
      if (consent === "unknown" && typeof remote?.analyticsConsent === "boolean") {
        await setConsent(remote.analyticsConsent);
      }
    })();
  }, [isAuthenticated, remote, localLanguage, consent, consentLoaded, setConsent]);

  React.useEffect(() => {
    // Only after the pull, or a device with a stored preference would push it up
    // before it had the chance to consider the account's.
    if (!isAuthenticated) return;
    if (!pulled.current || remote === undefined || localLanguage === undefined) return;
    if (!consentLoaded) return;

    const languageMode = localLanguage === null ? ("system" as const) : ("manual" as const);
    const consentValue = consent === "unknown" ? undefined : consent === "granted";

    const languageMatches =
      remote?.languageMode === languageMode &&
      (localLanguage === null || remote?.language === localLanguage);
    const consentMatches = remote?.analyticsConsent === consentValue;
    if (remote !== null && languageMatches && consentMatches) return;

    void updateSettings({
      languageMode,
      ...(localLanguage === null ? {} : { language: localLanguage }),
      ...(consentValue === undefined ? {} : { analyticsConsent: consentValue }),
    }).catch(() => undefined);
  }, [isAuthenticated, remote, localLanguage, consent, consentLoaded, updateSettings]);

  return children;
}
