import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import type { PropsWithChildren } from "react";
import React from "react";

import { resolveNotificationDestination } from "@/features/notifications/destinations";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Navigates from a tapped notification, but only to an allowlisted route.
 * The payload is attacker-controllable, so an unknown destination is ignored.
 */
function navigateFromResponse(response: Notifications.NotificationResponse) {
  const destination = resolveNotificationDestination(
    response.notification.request.content.data?.destination,
  );
  if (destination) router.push(destination);
}

export function NotificationProvider({ children }: PropsWithChildren) {
  React.useEffect(() => {
    // Channels are created by `syncReminders`, which has the localized copy their
    // names come from and runs before anything is scheduled against them.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) navigateFromResponse(response);
    });
    const subscription = Notifications.addNotificationResponseReceivedListener(navigateFromResponse);
    return () => subscription.remove();
  }, []);

  return children;
}
