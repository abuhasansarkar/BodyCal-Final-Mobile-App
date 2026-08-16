import { ClerkProvider, useAuth, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient, useAction } from "convex/react";
import React, { type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";
import { View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";

import { hasBackendConfiguration, publicEnv } from "@/config/env";
import { colors } from "@/config/theme";
import {
  isProState,
  SubscriptionProvider,
  useSubscription,
} from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { hydrateAppLanguage, i18n } from "@/locales/i18n";
import { AnalyticsProvider } from "@/providers/analytics-provider";
import { ConvexUserGate } from "@/providers/convex-user-gate";
import { NotificationProvider } from "@/providers/notification-provider";
import { OutboxSyncProvider } from "@/providers/outbox-sync-provider";
import { PushRegistrationProvider } from "@/providers/push-registration-provider";

const convexClient = publicEnv.convexUrl ? new ConvexReactClient(publicEnv.convexUrl) : null;

/** Refreshes the server gate once per signed-in Pro state, including existing subscribers. */
function SubscriptionMirrorSync({ userId }: { userId?: string }) {
  const { state } = useSubscription();
  const verifyEntitlement = useAction(api.subscriptionsActions.verifyEntitlement);
  const lastAttempt = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!userId || !isProState(state)) return;
    const key = `${userId}:${state}`;
    if (lastAttempt.current === key) return;
    lastAttempt.current = key;
    void verifyEntitlement({}).catch(() => undefined);
  }, [state, userId, verifyEntitlement]);

  return null;
}

/** Holds the first paint until translations are ready, so no key ever flashes. */
function LocalizationGate({ children }: PropsWithChildren) {
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    void hydrateAppLanguage().finally(() => setIsReady(true));
  }, []);

  return isReady ? children : <View style={{ flex: 1, backgroundColor: colors.background }} />;
}

function AuthenticatedProviders({ children }: PropsWithChildren) {
  const { user } = useUser();
  return (
    <ConvexUserGate>
      <SubscriptionProvider userId={user?.id}>
        <SubscriptionMirrorSync userId={user?.id} />
        <PushRegistrationProvider>
          <OutboxSyncProvider>{children}</OutboxSyncProvider>
        </PushRegistrationProvider>
      </SubscriptionProvider>
    </ConvexUserGate>
  );
}

export function AppProviders({ children }: PropsWithChildren) {
  const content =
    hasBackendConfiguration && convexClient && publicEnv.clerkPublishableKey ? (
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
