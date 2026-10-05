import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { appearancePreferenceLabel } from "@/lib/appearance";
import {
  SETTINGS,
  SETTINGS_DRILL_COPY_CLASS,
  SETTINGS_DRILL_ROW_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS,
  SETTINGS_GROUP_LIST_CLASS,
} from "@/lib/settings";
import { PrefDrillGroup } from "./pref-drill-group";

vi.mock("@/components/theme-toggle", () => ({
  useThemePreference: () => "auto" as const,
}));

describe("PrefDrillGroup", () => {
  it("shows stored Auto on the Theme row, not a resolved Light or Dark", () => {
    // theme-sot-auto-lock-v1 G4 — face is the stored preference.
    expect(appearancePreferenceLabel("auto")).toBe("Auto");
    expect(appearancePreferenceLabel("auto")).not.toBe("Light");
    expect(appearancePreferenceLabel("auto")).not.toBe("Dark");
    const src = readFileSync("src/components/settings/pref-drill-group.tsx", "utf8");
    expect(src).toContain("appearancePreferenceLabel(preference)");
    expect(src).toContain("useThemePreference");
    expect(src).not.toContain("resolveTheme");
    expect(src).not.toContain("useTheme(");
    const html = renderToStaticMarkup(
      createElement(PrefDrillGroup, { locationValue: "Dallas, TX, US" }),
    );
    const theme = html.slice(html.indexOf('data-settings-drill-row="theme"'));
    expect(theme).toContain(">Auto<");
    expect(theme).not.toContain(">Light<");
    expect(theme).not.toContain(">Dark<");
  });

  it("lays Location and Theme out as a horizontal value trail with a hairline between them", () => {
    const html = renderToStaticMarkup(
      createElement(PrefDrillGroup, { locationValue: "Dallas, TX, US" }),
    );
    expect(html).toContain(SETTINGS_DRILL_VALUE_TRAIL_CLASS);
    expect(html).toContain(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS);
    expect(html).toContain(SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS);
    expect(html).toContain(SETTINGS_DRILL_ROW_CLASS);
    expect(html).not.toContain(SETTINGS_DRILL_COPY_CLASS);
    expect(html).toContain(`<ul class="${SETTINGS_GROUP_LIST_CLASS}">`);
    expect(html).not.toContain("truncate");
    const copyAt = html.indexOf('data-settings-drill-value-copy=""');
    const chevronAt = html.indexOf('data-settings-drill-chevron=""');
    expect(copyAt).toBeGreaterThan(-1);
    expect(chevronAt).toBeGreaterThan(copyAt);
    expect(html.indexOf('data-settings-drill-row="location"')).toBeLessThan(
      html.indexOf('data-settings-drill-row="theme"'),
    );
    expect(html).toContain(`href="${SETTINGS.locationHref}"`);
    expect(html).toContain(`href="${SETTINGS.themeHref}"`);
  });
});
