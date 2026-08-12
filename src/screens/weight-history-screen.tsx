import type { Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import React from "react";
import { useTranslation } from "react-i18next";

import { AppIcon } from "@/components/app-icon";
import { AppScreen } from "@/components/app-screen";
import { hasBackendConfiguration } from "@/config/env";
import { useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { Pressable, Text, View } from "@/tw";

export function WeightHistoryScreen() {
  const { state } = useSubscription();
  const isPro = ["trial", "active", "cancelledActive", "billingIssueActive"].includes(state);

  if (hasBackendConfiguration) {
    return <ConfiguredWeightHistory isPro={isPro} />;
  }

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Weight history
      </Text>
      <Text className="text-app-muted">
        Configure Convex to record and view weight entries over time.
      </Text>
    </AppScreen>
  );
}

function ConfiguredWeightHistory({ isPro }: { isPro: boolean }) {
  const limit = isPro ? 365 : 30;
  const weights = useQuery(api.weights.getHistory, { limit });
  const profile = useQuery(api.profiles.getCurrent, {});
  const removeWeight = useMutation(api.weights.remove);
  const { i18n } = useTranslation();

  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  if (weights === undefined || profile === undefined) {
    return (
      <AppScreen>
        <Text className="text-app-muted">Loading weight history…</Text>
      </AppScreen>
    );
  }

  const unit = profile?.weightUnit ?? "kg";
  const formatWeight = (kilograms: number) => {
    const val = unit === "lb" ? kilograms * 2.2046226218 : kilograms;
    return `${new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(val)} ${unit}`;
  };

  const handleDelete = async (id: Id<"weightLogs">) => {
    setDeletingId(id);
    try {
      await removeWeight({ id });
    } catch {
      // Ignore or log error
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AppScreen>
      <Text accessibilityRole="header" className="text-3xl font-bold text-app-text">
        Weight history
      </Text>
      <Text className="text-sm text-app-muted">
        {isPro ? "Complete measurement history" : "Showing past 30 days · Upgrade to Pro for complete history"}
      </Text>

      {weights.length === 0 ? (
        <View className="items-center justify-center rounded-3xl border border-app-border bg-white p-8">
          <AppIcon color="#737373" name="weight" size={32} />
          <Text className="mt-2 text-base font-semibold text-app-text">No weight entries yet</Text>
          <Text className="mt-1 text-center text-sm text-app-muted">
            Log your first measurement to start tracking your weight progress over time.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {weights.map((item) => (
            <View
              key={item._id}
              className="flex-row items-center justify-between rounded-2xl border border-app-border bg-white p-4"
              style={{ borderCurve: "continuous" }}
            >
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-xl font-bold text-app-text" selectable>
                  {formatWeight(item.normalizedKg)}
                </Text>
                <Text className="text-sm font-medium text-app-muted" selectable>
                  {item.localDate} {item.note ? `· ${item.note}` : ""}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Delete entry"
                accessibilityRole="button"
                className="h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1F1] active:bg-[#FFE4E4]"
                disabled={deletingId === item._id}
                onPress={() => void handleDelete(item._id as Id<"weightLogs">)}
              >
                <AppIcon color="#DC2626" name="delete" size={18} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </AppScreen>
  );
}
