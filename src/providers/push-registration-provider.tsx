import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import type { PropsWithChildren } from "react";
import React from "react";
import { Platform } from "react-native";

import { getInstallationId } from "@/features/auth/session-scope";
import { getPermissionStatus } from "@/features/notifications/scheduler";
import { api } from "@/lib/convex-api";
import { currentTimezone } from "@/lib/local-day";
import { i18n } from "@/locales/i18n";

/**
 * Registers this installation's Expo push token once notification permission has
 * been granted.
 *
 * Nothing here requests permission — that only happens from an explicit user
 * action, per AGENTS.md. Registration is skipped on simulators, which cannot hold
 * a real token, and the row is removed when permission is revoked so the server
 * stops targeting a device that can no longer receive anything.
 */
export function PushRegistrationProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useConvexAuth();
  const preferences = useQuery(api.notifications.getPreferences, isAuthenticated ? {} : "skip");
  const registerDevice = useMutation(api.notifications.registerDevice);
  const unregisterDevice = useMutation(api.notifications.unregisterDevice);
  const lastToken = React.useRef<string | null>(null);

  const reconcile = React.useCallback(async () => {
    const installationId = await getInstallationId();
    const status = await getPermissionStatus();

    if (status !== "granted" || !Device.isDevice) {
      if (lastToken.current !== null) {
        lastToken.current = null;
        await unregisterDevice({ installationId }).catch(() => undefined);
      }
      return;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;

    try {
      const token = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      if (token.data === lastToken.current) return;

      await registerDevice({
        installationId,
        expoPushToken: token.data,
        platform: Platform.OS === "ios" ? "ios" : "android",
        locale: i18n.resolvedLanguage ?? "en",
        timezone: currentTimezone(),
      });
      lastToken.current = token.data;
    } catch {
      // A missing EAS project id or an offline device is not an error the user
      // needs to see; reminders remain best-effort either way.
    }
  }, [registerDevice, unregisterDevice]);

  // Re-check whenever preferences change: enabling reminders is what makes a
  // token available, and revoking permission must remove the device row.
  React.useEffect(() => {
    if (preferences === undefined) return;
    void reconcile();
  }, [preferences, reconcile]);

  // Token rotation: Expo emits a new token, which must replace the stored one.
  React.useEffect(() => {
    const subscription = Notifications.addPushTokenListener(() => void reconcile());
    return () => subscription.remove();
  }, [reconcile]);

  return children;
}
