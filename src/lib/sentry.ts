import * as Sentry from "@sentry/react-native";

import { publicEnv } from "@/config/env";

Sentry.init({
  dsn: publicEnv.sentryDsn || undefined,
  enabled: Boolean(publicEnv.sentryDsn),
  sendDefaultPii: false,
  tracesSampleRate: __DEV__ ? 0 : 0.1,
  beforeSend(event) {
    delete event.request;
    if (event.user) event.user = event.user.id ? { id: event.user.id } : undefined;
    return event;
  },
});

export { Sentry };
