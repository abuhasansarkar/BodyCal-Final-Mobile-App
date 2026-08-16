import { useQuery } from "convex/react";
import React from "react";

import { api } from "@/lib/convex-api";

const ACTIVE_STATES = new Set(["trial", "active", "cancelledActive", "billingIssueActive"]);

/** Premium backend features follow the RevenueCat mirror used by Convex authorization. */
export function useServerProAccess() {
  const mirror = useQuery(api.subscriptions.getMirror, {});
  const [mountedAt] = React.useState(Date.now);
  return Boolean(
    mirror &&
      ACTIVE_STATES.has(mirror.state) &&
      (mirror.expirationAt === undefined || mirror.expirationAt > mountedAt),
  );
}
