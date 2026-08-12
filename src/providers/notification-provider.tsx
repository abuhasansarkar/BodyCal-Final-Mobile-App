import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import React from "react";

import { configureNotificationChannels } from "@/features/notifications/scheduler";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function navigateFromResponse(response: Notifications.NotificationResponse) {
  const destination = response.notification.request.content.data?.destination;
  if (typeof destination === "string" && destination.startsWith("/")) router.push(destination as never);
}

export function NotificationProvider({ children }: PropsWithChildren) {
  React.useEffect(() => {
    void configureNotificationChannels();
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigateFromResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
    return () => subscription.remove();
  }, []);
  return children;
}
