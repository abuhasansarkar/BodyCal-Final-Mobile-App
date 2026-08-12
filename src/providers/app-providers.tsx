import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import React, { type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { hasBackendConfiguration, publicEnv } from "@/config/env";
import { SubscriptionProvider } from "@/features/subscription/subscription-provider";
import { hydrateAppLanguage, i18n } from "@/locales/i18n";
import { AnalyticsProvider } from "@/providers/analytics-provider";
import { ConvexUserGate } from "@/providers/convex-user-gate";
import { NotificationProvider } from "@/providers/notification-provider";
import { OutboxSyncProvider } from "@/providers/outbox-sync-provider";

const convexClient = publicEnv.convexUrl ? new ConvexReactClient(publicEnv.convexUrl) : null;

function LocalizationGate({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    void hydrateAppLanguage().finally(() => setIsReady(true));
  }, []);

  return isReady ? children : <View style={{ flex: 1, backgroundColor: "#FFFFFF" }} />;
}

function AuthenticatedProviders({ children }: PropsWithChildren) {
  const { user } = useUser();
  return (
    <ConvexUserGate>
      <SubscriptionProvider userId={user?.id}>
        <OutboxSyncProvider>{children}</OutboxSyncProvider>
      </SubscriptionProvider>
    </ConvexUserGate>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const content = hasBackendConfiguration && convexClient && publicEnv.clerkPublishableKey ? (
    <ClerkProvider publishableKey={publicEnv.clerkPublishableKey} tokenCache={tokenCache}>
      <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
        <AuthenticatedProviders>{children}</AuthenticatedProviders>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  ) : (
    <SubscriptionProvider>{children}</SubscriptionProvider>
  );

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <I18nextProvider i18n={i18n}>
        <LocalizationGate>
          <AnalyticsProvider>
            <NotificationProvider>{content}</NotificationProvider>
          </AnalyticsProvider>
        </LocalizationGate>
      </I18nextProvider>
    </SafeAreaProvider>
  );
}
