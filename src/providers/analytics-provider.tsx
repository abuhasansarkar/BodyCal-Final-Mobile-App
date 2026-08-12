import AsyncStorage from "@react-native-async-storage/async-storage";
import { PostHogProvider } from "posthog-react-native";
import type { PropsWithChildren } from "react";
import React from "react";

import { publicEnv } from "@/config/env";

export const ANALYTICS_CONSENT_KEY = "bodycal.analytics-consent.v1";

export function AnalyticsProvider({ children }: PropsWithChildren) {
  const [consented, setConsented] = React.useState(false);
  React.useEffect(() => {
    void AsyncStorage.getItem(ANALYTICS_CONSENT_KEY).then((value) => setConsented(value === "granted"));
  }, []);

  if (!consented || !publicEnv.analyticsKey) return children;
  return (
    <PostHogProvider
      apiKey={publicEnv.analyticsKey}
      autocapture={false}
      options={{ host: publicEnv.analyticsHost || undefined, disabled: false }}
    >
      {children}
    </PostHogProvider>
  );
}
