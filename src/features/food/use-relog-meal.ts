import NetInfo from "@react-native-community/netinfo";
import { useMutation } from "convex/react";
import React from "react";

import { enqueueOutbox } from "@/features/outbox/outbox";
import { api } from "@/lib/convex-api";
import { createClientRequestId, currentLocalDate, currentTimezone } from "@/lib/local-day";
import type { FoodSource, MealType } from "@/types/domain";

/** The fields a re-log copies. Anything else about the original stays with it. */
export type RelogSource = {
  foodName: string;
  serving: string;
  servingUnit: string;
  quantity: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealType: MealType;
  source: FoodSource;
};

export type RelogOutcome = "logged" | "queued" | "failed";

/**
 * Logs an existing meal against today again.
 *
 * Shared by the Foods tab and the logged-meal detail screen so both behave
 * identically — including offline, where the entry is queued for
 * `OutboxSyncProvider` rather than lost. It deliberately goes through the same
 * validated `foodLogs.create` mutation as manual and catalog logging instead of
 * a server-side copy, because that is the only path the offline queue can
 * replay.
 *
 * The meal photograph is not carried over. An image's lifetime is bound to the
 * scan that produced it, and `foodLogs.remove` reclaims the blob with the entry
 * that owns it — a second entry pointing at the same storage id would lose its
 * picture the moment the original was deleted.
 *
 * `pendingId` is the identifier the caller passed, so a list can disable every
 * re-log button while one is in flight and still show the spinner on the right
 * row.
 */
export function useRelogMeal() {
  const createFoodLog = useMutation(api.foodLogs.create);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const relog = React.useCallback(
    async (id: string, item: RelogSource): Promise<RelogOutcome> => {
      // Guarded here rather than at each call site: two taps must never produce
      // two entries, and the two screens must not each re-derive that rule.
      if (pendingId) return "failed";
      setPendingId(id);

      const payload = {
        localDate: currentLocalDate(),
        timezone: currentTimezone(),
        mealType: item.mealType,
        source: item.source,
        foodName: item.foodName,
        serving: item.serving,
        servingUnit: item.servingUnit,
        quantity: item.quantity,
        calories: item.calories,
        proteinGrams: item.proteinGrams,
        carbsGrams: item.carbsGrams,
        fatGrams: item.fatGrams,
        clientRequestId: createClientRequestId(),
      };

      try {
        const network = await NetInfo.fetch();
        if (!network.isConnected) {
          await enqueueOutbox({ id: payload.clientRequestId, kind: "foodLog.create", payload });
          return "queued";
        }
        await createFoodLog(payload);
        return "logged";
      } catch {
        return "failed";
      } finally {
        setPendingId(null);
      }
    },
    [createFoodLog, pendingId],
  );

  return { pendingId, relog };
}
