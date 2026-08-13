import NetInfo from "@react-native-community/netinfo";
import React, { type PropsWithChildren } from "react";
import { AppState, type NativeEventSubscription } from "react-native";
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PACKAGE_TYPE,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";

import { publicEnv } from "@/config/env";
import { isNonFatalRevenueCatUiConfigMessage } from "@/features/subscription/revenuecat-logging";
import { deriveSubscriptionState } from "@/features/subscription/subscription-state";
import type { SubscriptionState } from "@/types/domain";

type SubscriptionContextValue = {
  state: SubscriptionState;
  annualPackage: PurchasesPackage | null;
  monthlyPackage: PurchasesPackage | null;
  error: string | null;
  refresh: () => Promise<void>;
  purchase: (plan: "annual" | "monthly") => Promise<void>;
  restore: () => Promise<{ restored: boolean }>;
  trialEligible: Record<"annual" | "monthly", boolean | null>;
};

const SubscriptionContext = React.createContext<SubscriptionContextValue | null>(null);

let loggingConfigured = false;
let configurationQueue = Promise.resolve();

function configureRevenueCatLogging() {
  if (loggingConfigured) return;

  Purchases.setLogHandler((level, message) => {
    if (isNonFatalRevenueCatUiConfigMessage(message)) return;
    // Only ERROR and WARN are surfaced. RevenueCat's INFO/DEBUG stream carries
    // subscriber detail that must not reach console breadcrumbs or crash reports.
    if (level === LOG_LEVEL.ERROR) console.error(`[RevenueCat] ${message}`);
    else if (level === LOG_LEVEL.WARN) console.warn(`[RevenueCat] ${message}`);
  });
  loggingConfigured = true;
}

function ensureConfigured(apiKey: string, userId: string) {
  configurationQueue = configurationQueue
    .catch(() => undefined)
    .then(async () => {
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey, appUserID: userId });
        return;
      }
      if ((await Purchases.getAppUserID()) !== userId) await Purchases.logIn(userId);
    });
  return configurationQueue;
}

/**
 * Detaches RevenueCat from the signed-out account.
 *
 * Without this, the SDK keeps the previous Clerk id as its App User ID and the
 * next person to use the device inherits that subscriber.
 */
export async function releaseRevenueCatIdentity() {
  configurationQueue = configurationQueue
    .catch(() => undefined)
    .then(async () => {
      if (!(await Purchases.isConfigured())) return;
      if (await Purchases.isAnonymous()) return;
      await Purchases.logOut().catch(() => undefined);
    });
  return configurationQueue;
}

function revenueCatKey() {
  return process.env.EXPO_OS === "ios"
    ? publicEnv.revenueCatIosKey
    : publicEnv.revenueCatAndroidKey;
}

export function SubscriptionProvider({ children, userId }: PropsWithChildren<{ userId?: string }>) {
  const [state, setState] = React.useState<SubscriptionState>(userId ? "loading" : "free");
  const [annualPackage, setAnnualPackage] = React.useState<PurchasesPackage | null>(null);
  const [monthlyPackage, setMonthlyPackage] = React.useState<PurchasesPackage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [trialEligible, setTrialEligible] = React.useState<Record<"annual" | "monthly", boolean | null>>({
    annual: null,
    monthly: null,
  });
  const key = revenueCatKey();

  const applyCustomerInfo = React.useCallback((info: CustomerInfo) => {
    setState(deriveSubscriptionState(info));
    setError(null);
  }, []);

  /**
   * A network failure is reported as `offlineUnknown`, not `error`.
   * RevenueCat serves a cached CustomerInfo when it can, and losing connectivity
   * must never read as "your subscription is broken".
   */
  const handleFailure = React.useCallback(async (cause: unknown) => {
    const network = await NetInfo.fetch().catch(() => null);
    if (network && !network.isConnected) {
      setState("offlineUnknown");
      setError(null);
      return;
    }
    setState("error");
    setError(cause instanceof Error ? cause.message : "Unable to refresh subscription.");
  }, []);

  const refresh = React.useCallback(async () => {
    if (!key || !userId) return;
    try {
      applyCustomerInfo(await Purchases.getCustomerInfo());
    } catch (cause) {
      await handleFailure(cause);
    }
  }, [applyCustomerInfo, handleFailure, key, userId]);

  React.useEffect(() => {
    if (!key || !userId) return;
    configureRevenueCatLogging();

    let cancelled = false;
    let listenerRegistered = false;
    let appStateSubscription: NativeEventSubscription | null = null;
    const listener = (info: CustomerInfo) => applyCustomerInfo(info);

    void ensureConfigured(key, userId)
      .then(async () => {
        if (cancelled) return;
        Purchases.addCustomerInfoUpdateListener(listener);
        listenerRegistered = true;
        appStateSubscription = AppState.addEventListener("change", (nextState) => {
          if (nextState === "active") void refresh();
        });

        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);
        if (cancelled) return;

        applyCustomerInfo(info);
        const packages = offerings.current?.availablePackages ?? [];
        const annual = packages.find((item) => item.packageType === PACKAGE_TYPE.ANNUAL) ?? null;
        const monthly = packages.find((item) => item.packageType === PACKAGE_TYPE.MONTHLY) ?? null;
        setAnnualPackage(annual);
        setMonthlyPackage(monthly);

        const ids = [annual?.product.identifier, monthly?.product.identifier].filter(
          (id): id is string => Boolean(id),
        );
        if (ids.length === 0) return;

        try {
          const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(ids);
          if (cancelled) return;
          const eligible = (item: PurchasesPackage | null) =>
            item
              ? eligibility[item.product.identifier]?.status ===
                INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
              : null;
          setTrialEligible({ annual: eligible(annual), monthly: eligible(monthly) });
        } catch {
          // Unknown eligibility must never render as "eligible".
          if (!cancelled) setTrialEligible({ annual: null, monthly: null });
        }
      })
      .catch(async (cause: unknown) => {
        if (!cancelled) await handleFailure(cause);
      });

    return () => {
      cancelled = true;
      if (listenerRegistered) Purchases.removeCustomerInfoUpdateListener(listener);
      appStateSubscription?.remove();
    };
  }, [applyCustomerInfo, handleFailure, key, refresh, userId]);

  const purchase = React.useCallback(
    async (plan: "annual" | "monthly") => {
      const selected = plan === "annual" ? annualPackage : monthlyPackage;
      if (!selected) throw new Error("This subscription option is unavailable.");
      const result = await Purchases.purchasePackage(selected);
      applyCustomerInfo(result.customerInfo);
    },
    [annualPackage, applyCustomerInfo, monthlyPackage],
  );

  /** An empty restore is informative, not an error. */
  const restore = React.useCallback(async () => {
    if (!key || !userId) throw new Error("RevenueCat is not configured.");
    const info = await Purchases.restorePurchases();
    applyCustomerInfo(info);
    return { restored: Object.keys(info.entitlements.active).length > 0 };
  }, [applyCustomerInfo, key, userId]);

  const effectiveState: SubscriptionState = !key || !userId ? "free" : state;
  const value = React.useMemo(
    () => ({
      state: effectiveState,
      annualPackage,
      monthlyPackage,
      error,
      refresh,
      purchase,
      restore,
      trialEligible,
    }),
    [annualPackage, effectiveState, error, monthlyPackage, purchase, refresh, restore, trialEligible],
  );

  return <SubscriptionContext value={value}>{children}</SubscriptionContext>;
}

export function useSubscription() {
  const value = React.use(SubscriptionContext);
  if (!value) throw new Error("useSubscription must be used inside SubscriptionProvider.");
  return value;
}

/** Single definition of "has premium access", used by every gated surface. */
export const PRO_STATES: readonly SubscriptionState[] = [
  "trial",
  "active",
  "cancelledActive",
  "billingIssueActive",
];

export function isProState(state: SubscriptionState) {
  return PRO_STATES.includes(state);
}
