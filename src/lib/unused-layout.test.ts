import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { COMPANY_PROFILE } from "./account-profile";
import { SETTINGS } from "./settings";

// P1-8 / P1-9 / P1-10 / P1-11 — unused layout seven gone; doctrine
// constants point at live SoT. Generic supabase/client.ts stays
// deleted. browser.ts is the Realtime-only factory.

const UNUSED_LAYOUT = [
  "src/components/layout/data-table.tsx",
  "src/components/layout/banner-card.tsx",
  "src/components/layout/poster-card.tsx",
  "src/components/layout/page-section.tsx",
  "src/components/layout/spotlight-banner.tsx",
  "src/components/layout/view-toggle.tsx",
  "src/components/layout/rail.tsx",
] as const;

const LIVE_LAYOUT = [
  "src/components/layout/stat.tsx",
  "src/components/layout/artwork.tsx",
  "src/components/layout/empty-state.tsx",
  "src/components/layout/title-hero.tsx",
  "src/components/layout/field-list.tsx",
  "src/components/layout/status-chip.tsx",
] as const;

describe("unused layout and doctrine constants (P1-8–11)", () => {
  it("deletes the unused layout seven and the unused browser supabase client", () => {
    for (const path of UNUSED_LAYOUT) {
      expect(existsSync(path), path).toBe(false);
    }
    for (const path of LIVE_LAYOUT) {
      expect(existsSync(path), path).toBe(true);
    }
    expect(existsSync("src/lib/supabase/client.ts")).toBe(false);
    expect(existsSync("src/lib/supabase/browser.ts")).toBe(true);
    expect(existsSync("src/lib/supabase/server.ts")).toBe(true);
    expect(existsSync("src/lib/supabase/admin.ts")).toBe(true);
  });

  it("points Company and Settings aliases at the live hub", () => {
    expect(COMPANY_PROFILE.href).toBe(SETTINGS.organizationHref);
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).not.toContain("SETTINGS_LOCAL_NAV");
    expect(settingsSrc).not.toContain("settingsSectionHref");
    expect(settingsSrc).not.toContain("export function settingsSection(");
    expect(settingsSrc).not.toContain("export type SettingsSection");
    expect(readFileSync("src/lib/vendors-directory.ts", "utf8")).not.toContain("VENDORS_PAGE");
    expect(readFileSync("src/lib/ask-ai-overlay.ts", "utf8")).not.toContain("ASK_AI_LEGACY_PATH");
    expect(readFileSync("src/lib/ask-ai-overlay.ts", "utf8")).not.toContain("isLegacyAskAiPath");
  });
});
