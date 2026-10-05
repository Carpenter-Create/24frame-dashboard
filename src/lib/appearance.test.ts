import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { USER_MENU } from "./user-menu";
import {
  APPEARANCE,
  APPEARANCE_FLYOUT_OPTIONS,
  APPEARANCE_OPTIONS,
  APPEARANCE_SETTINGS_CARD_CLASS,
  APPEARANCE_SETTINGS_LIST_CLASS,
  APPEARANCE_SETTINGS_OPTION_ACTIVE_CLASS,
  APPEARANCE_SETTINGS_OPTION_CLASS,
  APPEARANCE_SETTINGS_TITLE_CLASS,
  appearancePreferenceLabel,
} from "./appearance";
import { HOUSE_MODULE_CLASS } from "./house-shell";
import {
  SETTINGS_CONTENT_MEASURE_CLASS,
  SETTINGS_PREF_BLOCK_CLASS,
  SETTINGS_PREF_TITLE_CLASS,
} from "./settings";

const here = dirname(fileURLToPath(import.meta.url));
const prefsSrc = readFileSync(join(here, "../components/settings/appearance-preferences.tsx"), "utf8");
const themeSrc = readFileSync(join(here, "theme.ts"), "utf8");
const sheetSrc = readFileSync(join(here, "../components/chrome/account-sheet.tsx"), "utf8");

describe("appearance copy", () => {
  it("keeps Auto / Dark / Light — not a page", () => {
    expect(APPEARANCE.title).toBe("Appearance");
    expect(APPEARANCE.title).toBe(USER_MENU.appearance);
    expect(APPEARANCE.back).toBe("Back");
    expect(APPEARANCE.back).not.toBe("Back to main menu");
    expect(APPEARANCE.light).toBe("Light");
    expect(APPEARANCE.dark).toBe("Dark");
    expect(APPEARANCE.systemDefault).toBe("System default");
    expect(APPEARANCE.systemDefaultHelper).toBe("We'll match your system preferences");
    expect(APPEARANCE_FLYOUT_OPTIONS.map((option) => option.kind)).toEqual([
      "auto",
      "dark",
      "light",
    ]);
    expect(APPEARANCE_FLYOUT_OPTIONS.map((option) => option.label)).toEqual([
      "Auto",
      "Dark",
      "Light",
    ]);
    expect(APPEARANCE_FLYOUT_OPTIONS[0]).toMatchObject({
      helper: APPEARANCE.systemDefaultHelper,
    });
    expect(appearancePreferenceLabel("light")).toBe("Light");
    expect(appearancePreferenceLabel("dark")).toBe("Dark");
    expect(appearancePreferenceLabel("auto")).toBe("Auto");
    expect(APPEARANCE_FLYOUT_OPTIONS.map((option) => option.label)).not.toContain(
      APPEARANCE.systemDefault,
    );
    expect(APPEARANCE).not.toHaveProperty("href");
    expect(`${APPEARANCE.title} ${APPEARANCE.systemDefault}`).not.toMatch(
      /seamless|frictionless|elevate|amplify|unleash|supercharge/i,
    );
    expect(existsSync(join(here, "../app/(app)/account/appearance/page.tsx"))).toBe(false);
  });

  it("uses Auto on the theme face — the same word as the stored mode", () => {
    expect(APPEARANCE.auto).toBe("Auto");
    expect(APPEARANCE_OPTIONS.map((option) => option.label)).toEqual(["Light", "Dark", "Auto"]);
    expect(APPEARANCE_FLYOUT_OPTIONS.map((option) => option.label)).toContain("Auto");
  });

  it("shares gc-theme with the avatar Theme page — no second store", () => {
    const themePage = readFileSync(
      join(here, "../app/(app)/settings/preferences/theme/page.tsx"),
      "utf8",
    );
    const preferencesPane = readFileSync(
      join(here, "../components/settings/preferences-settings.tsx"),
      "utf8",
    );
    const drillSrc = readFileSync(
      join(here, "../components/settings/pref-drill-group.tsx"),
      "utf8",
    );
    expect(themeSrc).toContain("THEME_STORAGE_KEY");
    expect(themeSrc).toContain("applyDocumentThemePreference");
    expect(prefsSrc).toContain("applyDocumentThemePreference");
    expect(prefsSrc).toContain("APPEARANCE_FLYOUT_OPTIONS");
    expect(prefsSrc).toContain("useThemePreference");
    expect(prefsSrc).toContain("AppearanceThemePicker");
    expect(prefsSrc).not.toContain("AppearanceThemeRow");
    expect(prefsSrc).not.toContain("AppearancePreferences");
    expect(prefsSrc).not.toContain("localStorage.setItem");
    expect(prefsSrc).not.toContain("THEME_STORAGE_KEY");
    expect(themePage).toContain("AppearanceThemePicker");
    expect(themePage).toContain("SETTINGS.themeHref");
    expect(preferencesPane).toContain("PrefDrillGroup");
    expect(preferencesPane).not.toContain("AppearanceThemePicker");
    expect(preferencesPane).not.toContain("AppearanceThemeRow");
    expect(preferencesPane).not.toContain("AppearancePreferences");
    expect(drillSrc).toContain("SETTINGS.themeHref");
    expect(drillSrc).toContain("useThemePreference");
    expect(drillSrc).toContain("appearancePreferenceLabel");
    expect(drillSrc).toContain("appearancePreferenceLabel(preference)");
    expect(drillSrc).toContain('layout="value-trail"');
    expect(drillSrc).not.toContain("resolveTheme");
    expect(drillSrc).not.toContain("useTheme(");
    expect(drillSrc).not.toContain("AppearanceThemePicker");
    expect(drillSrc).not.toContain("localStorage");
    expect(drillSrc).not.toContain("THEME_STORAGE_KEY");
    expect(sheetSrc).not.toContain("applyDocumentThemePreference");
    expect(sheetSrc).toContain("appearancePreferenceLabel");
    expect(sheetSrc).toContain("USER_MENU.themeHref");
    expect(sheetSrc).not.toContain("data-account-menu-theme-switch");
    expect(sheetSrc).not.toContain("THEME_STORAGE_KEY");
    expect(sheetSrc).not.toContain("localStorage");
    expect(sheetSrc).not.toContain("APPEARANCE_FLYOUT_OPTIONS");
    expect(existsSync(join(here, "../app/(app)/settings/appearance/page.tsx"))).toBe(false);
    expect(existsSync(join(here, "../app/(app)/settings/preferences/theme/page.tsx"))).toBe(true);
    expect(existsSync(join(here, "../app/(app)/settings/theme/page.tsx"))).toBe(false);
    expect(existsSync(join(here, "../app/(app)/settings/theme/[[...slug]]/page.tsx"))).toBe(true);
  });

  it("sections Appearance on the house muted module — selected reads on gray", () => {
    expect(APPEARANCE_SETTINGS_CARD_CLASS).toBe(SETTINGS_PREF_BLOCK_CLASS);
    expect(APPEARANCE_SETTINGS_CARD_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(APPEARANCE_SETTINGS_TITLE_CLASS).toBe(SETTINGS_PREF_TITLE_CLASS);
    expect(APPEARANCE_SETTINGS_OPTION_ACTIVE_CLASS).toBe("bg-surface");
    expect(APPEARANCE_SETTINGS_OPTION_CLASS).toContain("hover:bg-surface");
    expect(APPEARANCE_SETTINGS_OPTION_CLASS).toContain("py-[var(--space-3)]");
    expect(APPEARANCE_SETTINGS_OPTION_CLASS).toContain("justify-start");
    expect(APPEARANCE_SETTINGS_OPTION_CLASS).toContain("gap-[var(--space-3)]");
    expect(APPEARANCE_SETTINGS_OPTION_CLASS).not.toContain("justify-between");
    expect(APPEARANCE_SETTINGS_CARD_CLASS).toContain(SETTINGS_CONTENT_MEASURE_CLASS);
    expect(APPEARANCE_SETTINGS_LIST_CLASS).toContain(SETTINGS_CONTENT_MEASURE_CLASS);
    expect(prefsSrc).toContain("APPEARANCE_SETTINGS_LIST_CLASS");
    expect(prefsSrc).not.toContain("APPEARANCE_SETTINGS_CARD_CLASS");
    expect(prefsSrc).not.toContain("t-section");
  });
});
