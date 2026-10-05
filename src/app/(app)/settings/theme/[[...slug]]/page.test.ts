import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

import SettingsThemeRedirectPage from "./page";

vi.mock("next/navigation", () => ({
  permanentRedirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));

const here = dirname(fileURLToPath(import.meta.url));
const pageSrc = readFileSync(join(here, "page.tsx"), "utf8");

describe("flat /settings/theme redirect", () => {
  it("permanently redirects /settings/theme and /settings/theme/* to the nested Theme page", () => {
    expect(existsSync("src/app/(app)/settings/theme/page.tsx")).toBe(false);
    expect(existsSync("src/app/(app)/settings/preferences/theme/page.tsx")).toBe(true);
    expect(pageSrc).toContain("permanentRedirect");
    expect(pageSrc).toContain("SETTINGS.themeHref");
    expect(pageSrc).not.toContain("AppearanceThemePicker");
    expect(pageSrc).not.toContain("SettingsEditPane");
    expect(() => SettingsThemeRedirectPage()).toThrow(
      "REDIRECT:/settings/preferences/theme",
    );
  });
});
