import NetInfo from "@react-native-community/netinfo";
import { useConvexAuth, useMutation } from "convex/react";
import type { PropsWithChildren } from "react";
import React from "react";
import { AppState } from "react-native";

import { flushOutbox, type OutboxRecord } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { foodLogPayloadSchema, weightPayloadSchema } from "@/features/outbox/payloads";

/**
 * Drains the offline queue.
 *
 * Each payload is re-validated before it is sent: the queue is persisted JSON, so
 * a record written by an older build could otherwise be pushed to the server
 * untyped. An invalid record is dropped rather than retried forever.
 *
 * Three triggers, because connectivity alone was not enough. A write can fail
 * while the device is online — a cold Convex client, a token still refreshing, a
 * transient server error — and a NetInfo listener does not fire again until the
 * network actually changes state. On stable Wi-Fi that stranded an entry until
 * something else happened to toggle the radio.
 */
export function OutboxSyncProvider({ children }: PropsWithChildren) {
  const { isAuthenticated } = useConvexAuth();
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

  /** Serialized by `flushing`, so overlapping triggers cannot double-send. */
  const drain = React.useCallback(async () => {
    if (flushing.current || !isAuthenticated) return;
    flushing.current = true;
    try {
      await flushOutbox(send);
    } finally {
      flushing.current = false;
    }
  }, [isAuthenticated, send]);

  // Connectivity returning.
  React.useEffect(() => {
    const subscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) void drain();
    });
    return () => subscription();
  }, [drain]);

  // Returning to the foreground, which is when a user notices a missing entry.
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") void drain();
    });
    return () => subscription.remove();
  }, [drain]);

  // Authentication settling. Anything queued before the Convex token arrived
  // would otherwise sit until one of the triggers above happened to fire.
  React.useEffect(() => {
    if (isAuthenticated) void drain();
  }, [drain, isAuthenticated]);

  return children;
}
