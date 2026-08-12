import { useAuth, useUser } from "@clerk/expo";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import React, { type PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/primary-button";
import { api } from "@/lib/convex-api";
import { StartupScreen } from "@/screens/startup-screen";
import { Text, View } from "@/tw";

export function ConvexUserGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const { isAuthenticated, isLoading: convexLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrent, isAuthenticated ? {} : "skip");
  const syncFromClerk = useMutation(api.users.syncFromClerk);
  const [syncErrorUserId, setSyncErrorUserId] = React.useState<string | null>(null);
  const syncingUserId = React.useRef<string | null>(null);
  const syncError = syncErrorUserId === user?.id;

  const synchronize = React.useCallback(async () => {
    if (!user || !isAuthenticated) return;

    syncingUserId.current = user.id;
    try {
      await syncFromClerk({
        email: user.primaryEmailAddress?.emailAddress ?? "",
        name: user.fullName ?? undefined,
        avatarUrl: user.imageUrl ?? undefined,
      });
      setSyncErrorUserId(null);
    } catch {
      syncingUserId.current = null;
      setSyncErrorUserId(user.id);
    }
  }, [isAuthenticated, syncFromClerk, user]);

  React.useEffect(() => {
    if (!isSignedIn) {
      syncingUserId.current = null;
      return;
    }

    if (
      clerkLoaded &&
      userLoaded &&
      isAuthenticated &&
      user &&
      currentUser === null &&
      syncingUserId.current !== user.id &&
      !syncError
    ) {
      void synchronize();
    }
  }, [clerkLoaded, currentUser, isAuthenticated, isSignedIn, syncError, synchronize, user, userLoaded]);

  if (!clerkLoaded || !userLoaded) return <StartupScreen />;
  if (!isSignedIn) return children;
  if (convexLoading || !isAuthenticated || currentUser === undefined) return <StartupScreen />;

  if (syncError) {
    return (
      <SafeAreaView edges={["top", "right", "bottom", "left"]} style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <View className="flex-1 justify-center gap-5 px-5">
          <Text accessibilityRole="alert" className="text-center text-base text-app-muted">
            {t("onboarding.notifications.error")}
          </Text>
          <PrimaryButton label={t("common.retry")} onPress={() => void synchronize()} />
        </View>
      </SafeAreaView>
    );
  }

  if (currentUser === null) return <StartupScreen />;
  return children;
}
