import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "convex/react";
import type { PropsWithChildren } from "react";
import React from "react";

import { flushOutbox, type OutboxRecord } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { foodLogPayloadSchema, weightPayloadSchema } from "@/features/outbox/payloads";

/**
 * Drains the offline queue when connectivity returns.
 *
 * Each payload is re-validated before it is sent: the queue is persisted JSON, so
 * a record written by an older build could otherwise be pushed to the server
 * untyped. An invalid record is dropped rather than retried forever.
 */
export function OutboxSyncProvider({ children }: PropsWithChildren) {
  const createFood = useMutation(api.foodLogs.create);
  const createWeight = useMutation(api.weights.create);
  const flushing = React.useRef(false);

  const send = React.useCallback(
    async (record: OutboxRecord) => {
      if (record.kind === "foodLog.create") {
        const payload = foodLogPayloadSchema.parse(record.payload);
        await createFood(payload);
        return;
      }
      const payload = weightPayloadSchema.parse(record.payload);
      await createWeight(payload);
    },
    [createFood, createWeight],
  );

  React.useEffect(() => {
    const subscription = NetInfo.addEventListener((state) => {
      if (!state.isConnected || flushing.current) return;
      flushing.current = true;
      void flushOutbox(send).finally(() => {
        flushing.current = false;
      });
    });
    return () => subscription();
  }, [send]);

  return children;
}
