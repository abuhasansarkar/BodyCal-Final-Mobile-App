const UI_CONFIG_FALLBACK_MESSAGES = [
  "Could not resolve remote config blob(s)",
  "Failed to ready ui_config before getOfferings; proceeding without it",
] as const;

export function isNonFatalRevenueCatUiConfigMessage(message: string) {
  return (
    message.includes("ui_config") &&
    UI_CONFIG_FALLBACK_MESSAGES.some((fragment) => message.includes(fragment))
  );
}
