import { useTranslation } from "react-i18next";

import { AppScreen } from "@/components/app-screen";
import { ChoiceRow, RowGroup } from "@/components/ui/rows";
import { ScreenTitle } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/states";
import { SUPPORTS_DARK_APPEARANCE } from "@/config/theme";

/**
 * Appearance.
 *
 * BodyCal ships a single light appearance: `design/TOKENS.md` documents only light
 * values and AGENTS.md forbids inventing product colours, so offering a dark
 * option here would have been a control that changed nothing. The previous build
 * declared `userInterfaceStyle: "automatic"` while painting light colours, which
 * rendered white status-bar glyphs on a white background.
 */
export function SettingsAppearanceScreen() {
  const { t } = useTranslation();

  return (
    <AppScreen>
      <ScreenTitle description={t("appearanceSettings.subtitle")} title={t("appearanceSettings.title")} />

      <RowGroup>
        {[
          <ChoiceRow
            description={t("appearanceSettings.lightDescription")}
            icon="appearance"
            key="light"
            onPress={() => undefined}
            selected
            title={t("appearanceSettings.lightTitle")}
          />,
        ]}
      </RowGroup>

      {SUPPORTS_DARK_APPEARANCE ? null : (
        <EmptyState
          description={t("appearanceSettings.unavailableDescription")}
          icon="appearance"
          title={t("appearanceSettings.unavailableTitle")}
        />
      )}
    </AppScreen>
  );
}
