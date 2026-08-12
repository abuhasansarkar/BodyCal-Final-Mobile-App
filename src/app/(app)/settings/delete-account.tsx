import { useClerk, useReverification } from "@clerk/expo";
import { useMutation } from "convex/react";
import React from "react";

import { AppScreen } from "@/components/app-screen";
import { PrimaryButton } from "@/components/primary-button";
import { clearBodyCalNotifications } from "@/features/notifications/scheduler";
import { clearOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { AuthField } from "@/screens/auth/auth-fields";
import { Text } from "@/tw";

export default function DeleteAccountRoute() {
  const { signOut } = useClerk();
  const requestDeletion = useMutation(api.users.requestDeletion);
  const [confirmation, setConfirmation] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const request = useReverification(async () => {
    await requestDeletion({});
    await Promise.all([clearOutbox(), clearBodyCalNotifications()]);
    await signOut();
  });
  return <AppScreen><Text className="text-3xl font-bold text-app-error">Delete account</Text><Text className="text-base leading-6 text-app-muted">This permanently deletes your BodyCal account, nutrition history, weights, settings, and stored photos. Store subscriptions must be cancelled separately.</Text><AuthField label="Type DELETE to confirm" autoCapitalize="characters" value={confirmation} onChangeText={setConfirmation} />{error ? <Text accessibilityLiveRegion="polite" className="text-app-error">{error}</Text> : null}<PrimaryButton disabled={confirmation !== "DELETE"} icon="delete" label="Permanently delete account" onPress={() => void request().catch(() => setError("Deletion could not be started. Reauthenticate and try again."))} /></AppScreen>;
}
