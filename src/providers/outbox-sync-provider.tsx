import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "convex/react";
import type { PropsWithChildren } from "react";
import React from "react";

import { flushOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";

export function OutboxSyncProvider({ children }: PropsWithChildren) {
  const createFood = useMutation(api.foodLogs.create);
  const createWeight = useMutation(api.weights.create);

  React.useEffect(() => NetInfo.addEventListener((state) => {
    if (!state.isConnected) return;
    void flushOutbox(async (record) => {
      if (record.kind === "foodLog.create") await createFood(record.payload as never);
      else await createWeight(record.payload as never);
    });
  }), [createFood, createWeight]);

  return children;
}
