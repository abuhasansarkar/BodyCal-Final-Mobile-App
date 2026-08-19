/**
 * RevenueCat log lines that are noise rather than faults.
 *
 * `ui_config` is the remote-config blob behind RevenueCat's own prebuilt paywall
 * UI. BodyCal draws its paywall itself and does not depend on
 * `react-native-purchases-ui`, so nothing in the app reads that blob — but the
 * SDK still tries to assemble it on launch and complains at WARN when the
 * dashboard has no paywall published to assemble it from. Offerings, products,
 * prices and CustomerInfo are all fetched separately and are unaffected.
 *
 * Left unfiltered these lines appear on every cold start, which trains everyone
 * reading the console to skip RevenueCat warnings — including the ones that
 * matter. The `ui_config` guard is deliberate: the same wording about a
 * different topic is not this, and must still surface.
 */
const UI_CONFIG_FALLBACK_MESSAGES = [
  "Could not resolve remote config blob(s)",
  "Failed to ready ui_config before getOfferings; proceeding without it",
  // Emitted as a pair when the blob is absent: the merge reports which parts are
  // missing, then assembly gives up. Both are expected without a published paywall.
  "Unable to merge remote config blob data",
  "Failed to assemble ui_config",
] as const;

export function isNonFatalRevenueCatUiConfigMessage(message: string) {
  return (
    message.includes("ui_config") &&
    UI_CONFIG_FALLBACK_MESSAGES.some((fragment) => message.includes(fragment))
  );
}
