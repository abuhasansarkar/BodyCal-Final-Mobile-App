import { useQuery } from "convex/react";

import { AppScreen } from "@/components/app-screen";
import { hasBackendConfiguration } from "@/config/env";
import { useSubscription } from "@/features/subscription/subscription-provider";
import { api } from "@/lib/convex-api";
import { currentLocalDate } from "@/lib/local-day";
import { Text, View } from "@/tw";

function dateDaysAgo(days: number) { const value = new Date(); value.setDate(value.getDate() - days); return currentLocalDate(value); }

function ConfiguredHistory() {
  const { state } = useSubscription();
  const isPro = ["trial", "active", "cancelledActive", "billingIssueActive"].includes(state);
  const logs = useQuery(api.foodLogs.getHistory, { fromDate: dateDaysAgo(isPro ? 3650 : 6), toDate: currentLocalDate(), limit: isPro ? 500 : 200 });
  if (logs === undefined) return <AppScreen><Text className="text-app-muted">Loading history…</Text></AppScreen>;
  return <AppScreen><Text className="text-3xl font-bold text-app-text">Daily history</Text><Text className="text-sm text-app-muted">{isPro ? "Complete history" : "Latest seven days · upgrade for complete history"}</Text>{logs.length === 0 ? <Text className="text-app-muted">No food logs in this period.</Text> : logs.map((log: { _id: string; foodName: string; localDate: string; mealType: string; calories: number }) => <View key={log._id} className="gap-1 border-b border-app-border py-3"><Text className="font-semibold text-app-text">{log.foodName}</Text><Text className="text-sm text-app-muted">{log.localDate} · {log.mealType} · {Math.round(log.calories)} kcal</Text></View>)}</AppScreen>;
}

export default function HistoryRoute() { return hasBackendConfiguration ? <ConfiguredHistory /> : <AppScreen><Text className="text-3xl font-bold text-app-text">Daily history</Text><Text className="text-app-muted">Cloud history becomes available after Convex is configured.</Text></AppScreen>; }
