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
  restore: () => Promise<void>;
  trialEligible: Record<"annual" | "monthly", boolean | null>;
};

const SubscriptionContext = React.createContext<SubscriptionContextValue | null>(null);
let loggingConfigured = false;
let revenueCatConfigurationQueue = Promise.resolve();

function configureRevenueCatLogging() {
  if (loggingConfigured) return;

  Purchases.setLogHandler((level, message) => {
    if (isNonFatalRevenueCatUiConfigMessage(message)) {
      return;
    }

    const formattedMessage = `[RevenueCat] ${message}`;
    switch (level) {
      case LOG_LEVEL.ERROR:
        console.error(formattedMessage);
        break;
      case LOG_LEVEL.WARN:
        console.warn(formattedMessage);
        break;
      case LOG_LEVEL.INFO:
        console.info(formattedMessage);
        break;
      case LOG_LEVEL.DEBUG:
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  });
  loggingConfigured = true;
}

function ensureRevenueCatConfigured(apiKey: string, userId: string) {
  revenueCatConfigurationQueue = revenueCatConfigurationQueue
    .catch(() => undefined)
    .then(async () => {
      if (!(await Purchases.isConfigured())) {
        Purchases.configure({ apiKey, appUserID: userId });
        return;
      }

      if ((await Purchases.getAppUserID()) !== userId) {
        await Purchases.logIn(userId);
      }
    });
  return revenueCatConfigurationQueue;
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
  const [trialEligible, setTrialEligible] = React.useState<Record<"annual" | "monthly", boolean | null>>({ annual: null, monthly: null });
  const key = revenueCatKey();

  const applyCustomerInfo = React.useCallback((info: CustomerInfo) => {
    setState(deriveSubscriptionState(info));
    setError(null);
  }, []);

  const refresh = React.useCallback(async () => {
    if (!key || !userId) {
      return;
    }
    try {
      applyCustomerInfo(await Purchases.getCustomerInfo());
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error ? cause.message : "Unable to refresh subscription.");
    }
  }, [applyCustomerInfo, key, userId]);

  React.useEffect(() => {
    if (!key || !userId) return;
    configureRevenueCatLogging();
    let cancelled = false;
    let listenerRegistered = false;
    let appStateSubscription: NativeEventSubscription | null = null;
    const listener = (info: CustomerInfo) => applyCustomerInfo(info);
    void ensureRevenueCatConfigured(key, userId)
      .then(async () => {
        if (cancelled) return;
        Purchases.addCustomerInfoUpdateListener(listener);
        listenerRegistered = true;
        appStateSubscription = AppState.addEventListener("change", (nextState) => {
          if (nextState === "active") void refresh();
        });

        const [info, offerings] = await Promise.all([Purchases.getCustomerInfo(), Purchases.getOfferings()]);
        if (cancelled) return;
        applyCustomerInfo(info);
        const packages = offerings.current?.availablePackages ?? [];
        setAnnualPackage(packages.find((item) => item.packageType === PACKAGE_TYPE.ANNUAL) ?? null);
        setMonthlyPackage(packages.find((item) => item.packageType === PACKAGE_TYPE.MONTHLY) ?? null);
        const annual = packages.find((item) => item.packageType === PACKAGE_TYPE.ANNUAL);
        const monthly = packages.find((item) => item.packageType === PACKAGE_TYPE.MONTHLY);
        const ids = [annual?.product.identifier, monthly?.product.identifier].filter((id): id is string => Boolean(id));
        if (ids.length) {
          void Purchases.checkTrialOrIntroductoryPriceEligibility(ids)
            .then((eligibility) => {
              if (!cancelled) setTrialEligible({
                annual: annual ? eligibility[annual.product.identifier]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE : null,
                monthly: monthly ? eligibility[monthly.product.identifier]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE : null,
              });
            })
            .catch(() => {
              if (!cancelled) setTrialEligible({ annual: null, monthly: null });
            });
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setState("error");
          setError(cause instanceof Error ? cause.message : "Unable to load subscription options.");
        }
      });

    return () => {
      cancelled = true;
      if (listenerRegistered) Purchases.removeCustomerInfoUpdateListener(listener);
      appStateSubscription?.remove();
    };
  }, [applyCustomerInfo, key, refresh, userId]);

  const purchase = React.useCallback(async (plan: "annual" | "monthly") => {
    const selectedPackage = plan === "annual" ? annualPackage : monthlyPackage;
    if (!selectedPackage) throw new Error("This subscription option is unavailable.");
    const result = await Purchases.purchasePackage(selectedPackage);
    applyCustomerInfo(result.customerInfo);
  }, [annualPackage, applyCustomerInfo, monthlyPackage]);

  const restore = React.useCallback(async () => {
    if (!key || !userId) throw new Error("RevenueCat is not configured.");
    applyCustomerInfo(await Purchases.restorePurchases());
  }, [applyCustomerInfo, key, userId]);

  const effectiveState = !key || !userId ? "free" : state;
  const value = React.useMemo(() => ({
    state: effectiveState, annualPackage, monthlyPackage, error, refresh, purchase, restore, trialEligible,
  }), [annualPackage, effectiveState, error, monthlyPackage, purchase, refresh, restore, trialEligible]);

  return <SubscriptionContext value={value}>{children}</SubscriptionContext>;
}

export function useSubscription() {
  const value = React.use(SubscriptionContext);
  if (!value) throw new Error("useSubscription must be used inside SubscriptionProvider.");
  return value;
}
