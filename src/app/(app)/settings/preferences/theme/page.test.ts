import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { APPEARANCE } from "@/lib/appearance";
import { SETTINGS } from "@/lib/settings";
import { getOrgContext } from "@/lib/supabase/context";
import SettingsThemePage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));

function ctx() {
  return {
    user: { id: "u1", email: "ada@example.com", name: "Ada" },
    rows: [],
    orgs: [],
    activeOrg: null,
    activeRole: null,
    canOperate: true,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

const here = dirname(fileURLToPath(import.meta.url));
const pageSrc = readFileSync(join(here, "page.tsx"), "utf8");

describe("SettingsThemePage", () => {
  beforeEach(() => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
  });

  it("is a Preferences Theme edit pane — nested href, back to Preferences", async () => {
    const html = renderToStaticMarkup(await SettingsThemePage());
    expect(html).toContain('data-settings-edit-pane=""');
    expect(html).toContain('data-settings-hub="preferences"');
    expect(html).toMatch(/<h1[^>]*>Theme<\/h1>/);
    expect(html).toContain(SETTINGS.themeHelper);
    expect(html).toContain(`href="${SETTINGS.preferencesHref}"`);
    expect(html).toContain(">Preferences<");
    expect(html).not.toMatch(/href="\/settings"/);
    expect(html).toContain('data-settings-appearance=""');
    expect(html).toContain('data-settings-appearance-option="auto"');
    expect(html).toContain('data-settings-appearance-option="dark"');
    expect(html).toContain('data-settings-appearance-option="light"');
    expect(html).toContain(APPEARANCE.auto);
    expect(html).not.toContain(APPEARANCE.systemDefault);
    expect(html).toContain(APPEARANCE.dark);
    expect(html).toContain(APPEARANCE.light);
    expect(html).not.toMatch(/<h3[^>]*>Appearance<\/h3>/);
    expect(html).not.toContain("data-settings-notification-matrix");
    expect(pageSrc).toContain("AppearanceThemePicker");
    expect(pageSrc).toContain("SettingsEditPane");
    expect(pageSrc).toContain('hub="preferences"');
    expect(pageSrc).not.toContain("AppearancePreferences");
    expect(pageSrc).not.toContain("NotificationPreferences");
    expect(pageSrc).not.toContain("permanentRedirect");
  });

  it("sends an unauthenticated visitor to login", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(SettingsThemePage()).rejects.toThrow("REDIRECT:/login");
  });
});
