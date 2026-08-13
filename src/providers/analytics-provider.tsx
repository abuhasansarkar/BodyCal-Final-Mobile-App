import AsyncStorage from "@react-native-async-storage/async-storage";
import { PostHogProvider } from "posthog-react-native";
import type { PropsWithChildren } from "react";
import React from "react";

import { publicEnv } from "@/config/env";

/**
 * Opt-in analytics.
 *
 * Nothing is initialized until the user grants consent in Settings → Privacy.
 * Autocapture is off, identity stays anonymous (`identify` is never called), and
 * only categorical metadata is ever recorded — never nutrition values, meal names,
 * weights or notes.
 */

export const ANALYTICS_CONSENT_KEY = "bodycal.analytics-consent.v1";

type ConsentState = "unknown" | "granted" | "denied";

type AnalyticsContextValue = {
  consent: ConsentState;
  setConsent: (granted: boolean) => Promise<void>;
  isAvailable: boolean;
};

const AnalyticsContext = React.createContext<AnalyticsContextValue | null>(null);

export async function readAnalyticsConsent(): Promise<ConsentState> {
  const value = await AsyncStorage.getItem(ANALYTICS_CONSENT_KEY);
  if (value === "granted") return "granted";
  if (value === "denied") return "denied";
  return "unknown";
}

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const [consent, setConsentState] = React.useState<ConsentState>("unknown");

  React.useEffect(() => {
    let cancelled = false;
    void readAnalyticsConsent().then((value) => {
      if (!cancelled) setConsentState(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setConsent = React.useCallback(async (granted: boolean) => {
    const next: ConsentState = granted ? "granted" : "denied";
    await AsyncStorage.setItem(ANALYTICS_CONSENT_KEY, next);
    setConsentState(next);
  }, []);

  const isAvailable = Boolean(publicEnv.analyticsKey);
  const value = React.useMemo(
    () => ({ consent, setConsent, isAvailable }),
    [consent, setConsent, isAvailable],
  );

  const content =
    consent === "granted" && publicEnv.analyticsKey ? (
      <PostHogProvider
        // Remounting on consent change ensures the SDK is torn down on withdrawal.
        key="posthog-consented"
        apiKey={publicEnv.analyticsKey}
        autocapture={false}
        options={{ host: publicEnv.analyticsHost || undefined, disabled: false }}
      >
        {children}
      </PostHogProvider>
    ) : (
      children
    );

  return <AnalyticsContext value={value}>{content}</AnalyticsContext>;
}

export function useAnalyticsConsent() {
  const value = React.use(AnalyticsContext);
  if (!value) throw new Error("useAnalyticsConsent must be used inside AnalyticsProvider.");
  return value;
}
