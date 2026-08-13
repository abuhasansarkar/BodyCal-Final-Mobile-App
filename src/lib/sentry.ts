import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import { publicEnv } from "@/config/env";

/**
 * Crash reporting with PII disabled.
 *
 * Two scrubbers, not one. `beforeSend` strips request payloads and reduces the
 * user to an opaque id; `beforeBreadcrumb` drops console and network breadcrumbs,
 * which would otherwise carry RevenueCat log lines, request URLs, and anything
 * else the app happens to print.
 */
Sentry.init({
  dsn: publicEnv.sentryDsn || undefined,
  enabled: Boolean(publicEnv.sentryDsn),
  sendDefaultPii: false,
  environment: __DEV__ ? "development" : "production",
  release: Constants.expoConfig?.version ?? undefined,
  tracesSampleRate: __DEV__ ? 0 : 0.1,
  beforeSend(event) {
    delete event.request;
    if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    // Nutrition, weights, meal names and notes must never leave the device.
    if (event.extra) delete event.extra;
    if (event.contexts?.response) delete event.contexts.response;
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    // Console output and HTTP breadcrumbs can contain user content or tokens.
    if (breadcrumb.category === "console" || breadcrumb.category === "xhr") return null;
    if (breadcrumb.category === "fetch") return null;
    if (breadcrumb.data) delete breadcrumb.data;
    return breadcrumb;
  },
});

export { Sentry };
