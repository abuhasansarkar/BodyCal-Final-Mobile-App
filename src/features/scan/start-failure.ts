import { ConvexError } from "convex/values";

/**
 * Turns whatever `ai.startScan` threw into something the scan screen can say.
 *
 * Extracted from the screen so the mapping is testable. It used to live inline
 * and read `cause.data` only when it was a *string*, which quietly excluded the
 * one failure that carries structured data: `consumeRateLimit` throws
 * `ConvexError({ code: "rate_limited", retryAfterMs })`. An object fell through
 * to `cause.message` — which for a `ConvexError` with object data stringifies to
 * "[object Object]" — matched no branch, and surfaced as "the analysis did not
 * finish". The user was told nothing had worked when in fact they had simply
 * scanned too fast, and `retryAfterMs`, the one number that would have told them
 * when to try again, was discarded.
 *
 * Returns a translation key rather than translated text, so the rule can be
 * asserted without standing up i18next.
 */
export type StartFailure = {
  messageKey: string;
  /** Interpolation values for `messageKey`, when it takes any. */
  messageParams?: Record<string, number>;
  showUpgrade: boolean;
  canRetry: boolean;
};

type StructuredErrorData = {
  code?: unknown;
  message?: unknown;
  retryAfterMs?: unknown;
};

function readErrorData(cause: unknown): { text: string; structured: StructuredErrorData | null } {
  const data = cause instanceof ConvexError ? (cause.data as unknown) : undefined;

  if (data !== null && typeof data === "object") {
    const structured = data as StructuredErrorData;
    return {
      text: typeof structured.message === "string" ? structured.message : "",
      structured,
    };
  }

  if (typeof data === "string") return { text: data, structured: null };
  return { text: cause instanceof Error ? cause.message : String(cause ?? ""), structured: null };
}

/** Whole seconds, rounded up and floored at one — "try again in 0 seconds" is not advice. */
export function retryDelaySeconds(retryAfterMs: unknown): number | null {
  if (typeof retryAfterMs !== "number" || !Number.isFinite(retryAfterMs)) return null;
  return Math.max(1, Math.ceil(retryAfterMs / 1_000));
}

export function describeStartFailure(cause: unknown): StartFailure {
  const { text, structured } = readErrorData(cause);

  // Checked before the text branches below: a rate limit is the one failure that
  // arrives as structured data, and its own message would otherwise be matched
  // by the `limit` branch and reported as an exhausted daily allowance.
  if (structured?.code === "rate_limited") {
    const seconds = retryDelaySeconds(structured.retryAfterMs);
    return seconds === null
      ? { messageKey: "scan.errorRateLimited", showUpgrade: false, canRetry: true }
      : {
          messageKey: "scan.errorRateLimitedSeconds",
          messageParams: { seconds },
          showUpgrade: false,
          canRetry: true,
        };
  }

  if (text.includes("entitlement") || text.includes("Pro entitlement")) {
    return { messageKey: "scan.errorEntitlement", showUpgrade: true, canRetry: false };
  }
  if (text.includes("fair-use") || text.includes("limit")) {
    return { messageKey: "scan.errorQuota", showUpgrade: false, canRetry: false };
  }
  if (text.includes("image_too_large") || text.includes("4 MB")) {
    return { messageKey: "scan.errorTooLarge", showUpgrade: false, canRetry: false };
  }
  if (text.includes("image_unreadable")) {
    return { messageKey: "scan.errorImageGone", showUpgrade: false, canRetry: false };
  }
  if (text.includes("upload_timeout")) {
    return { messageKey: "scan.errorTimeout", showUpgrade: false, canRetry: true };
  }
  if (text.includes("upload_failed") || text.includes("upload_invalid_response")) {
    return { messageKey: "scan.errorUpload", showUpgrade: false, canRetry: true };
  }
  if (text.includes("not configured")) {
    return { messageKey: "scan.errorUnavailable", showUpgrade: false, canRetry: false };
  }
  if (text.toLowerCase().includes("network")) {
    return { messageKey: "scan.errorOffline", showUpgrade: false, canRetry: true };
  }
  return { messageKey: "scan.errorGeneric", showUpgrade: false, canRetry: true };
}
