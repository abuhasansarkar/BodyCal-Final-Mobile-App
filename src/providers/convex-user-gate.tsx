import { useAuth, useUser } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import React, { type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/app-icon";
import { PrimaryButton } from "@/components/primary-button";
import { colors } from "@/config/theme";
import { enterUserScope, leaveUserScope } from "@/features/auth/session-scope";
import { api } from "@/lib/convex-api";
import { StartupScreen } from "@/screens/startup-screen";
import { Text, View } from "@/tw";

/**
 * Ensures a Convex user row exists for the signed-in Clerk identity, and binds
 * device-local state to that account.
 *
 * The scope binding is what stops one user's queued offline writes and scheduled
 * reminders from carrying into the next account on a shared device.
 */
export function ConvexUserGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const syncFromClerk = useMutation(api.users.syncFromClerk);

  const [syncedUserId, setSyncedUserId] = React.useState<string | null>(null);
  const [syncErrorUserId, setSyncErrorUserId] = React.useState<string | null>(null);
  const syncingUserId = React.useRef<string | null>(null);
  const scopedUserId = React.useRef<string | null>(null);
  // Do not even subscribe to profile-dependent app data until the identity row
  // has been synchronized. This prevents a newly authenticated session (or an
  // account switch) from briefly mounting screens that all fail with
  // "User profile is unavailable" before `syncFromClerk` finishes.
  const userSynchronized = Boolean(user?.id && syncedUserId === user.id);
  const currentUser = useQuery(
    api.users.getCurrent,
    isAuthenticated && userSynchronized ? {} : "skip",
  );
  const syncError = syncErrorUserId === user?.id;

  const synchronize = React.useCallback(async () => {
    if (!user || !isAuthenticated) return;
    const targetUserId = user.id;
    syncingUserId.current = targetUserId;
    try {
      await syncFromClerk({
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      });
      setSyncedUserId(targetUserId);
      setSyncErrorUserId(null);
    } catch {
      setSyncErrorUserId(targetUserId);
    } finally {
      if (syncingUserId.current === targetUserId) syncingUserId.current = null;
    }
  }, [isAuthenticated, syncFromClerk, user]);

  React.useEffect(() => {
    if (!isSignedIn) {
      syncingUserId.current = null;
      scopedUserId.current = null;
      void leaveUserScope();
      return;
    }

    if (
      clerkLoaded &&
      userLoaded &&
      isAuthenticated &&
      user &&
      syncedUserId !== user.id &&
      syncingUserId.current !== user.id &&
      !syncError
    ) {
      void synchronize();
    }
  }, [clerkLoaded, isAuthenticated, isSignedIn, syncError, syncedUserId, synchronize, user, userLoaded]);

  // Bind local caches to this account as soon as its identity is known.
  React.useEffect(() => {
    if (!user?.id || scopedUserId.current === user.id) return;
    scopedUserId.current = user.id;
    void enterUserScope(user.id);
  }, [user?.id]);

  if (!clerkLoaded || !userLoaded) return <StartupScreen />;
  if (!isSignedIn) return children;
  if (syncError) {
    return (
      <SafeAreaView
        edges={["top", "right", "bottom", "left"]}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View className="flex-1 justify-center gap-5 px-5">
          <View className="items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-app-surface">
              <AppIcon color={colors.muted} name="warning" size={26} />
            </View>
            <Text accessibilityRole="alert" className="text-center text-base text-app-muted" selectable>
              {t("errors.accountSyncFailed")}
            </Text>
          </View>
          <PrimaryButton icon="refresh" label={t("common.retry")} onPress={() => void synchronize()} />
        </View>
      </SafeAreaView>
    );
  }

  if (convexLoading || !isAuthenticated || !userSynchronized || currentUser === undefined) {
    return <StartupScreen />;
  }

  if (currentUser === null) return <StartupScreen />;
  return children;
}
