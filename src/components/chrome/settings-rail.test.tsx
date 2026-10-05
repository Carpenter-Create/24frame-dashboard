import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/settings/profile" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    prefetch?: boolean;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink, useLinkStatus: () => ({ pending: false }) };
});

import {
  SETTINGS,
  SETTINGS_HUB_NAV,
  SETTINGS_RAIL_ABSENT,
  SETTINGS_RAIL_NAV_CLASS,
} from "@/lib/settings";
import {
  HOUSE_RAIL_ACTIVE_CLASS,
  HOUSE_RAIL_IDLE_CLASS,
  HOUSE_RAIL_ITEM_CLASS,
  HOUSE_RAIL_TITLE_CLASS,
} from "@/lib/house-shell";
import { SettingsRail } from "./settings-rail";

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "settings-rail.tsx"), "utf8");

describe("SettingsRail", () => {
  it("is Settings title + Profile / Organization / Preferences / Security", () => {
    navigation.pathname = "/settings/profile";
    const html = renderToStaticMarkup(<SettingsRail />);
    expect(html).toContain('data-settings-rail-nav=""');
    expect(html).toContain('data-settings-rail-title=""');
    expect(html).toContain(SETTINGS.title);
    expect(html).toContain(SETTINGS_RAIL_NAV_CLASS);
    expect(html).toContain(HOUSE_RAIL_TITLE_CLASS);
    for (const item of SETTINGS_HUB_NAV) {
      expect(html).toContain(`data-settings-rail-item="${item.kind}"`);
      expect(html).toContain(`href="${item.href}"`);
      expect(html).toContain(item.label);
    }
    expect(html).toContain(HOUSE_RAIL_ITEM_CLASS);
    expect(html).not.toContain("Home");
    expect(html).not.toContain("Manage courses");
    expect(html).not.toContain('href="/education"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain(HOUSE_RAIL_ACTIVE_CLASS);
    expect(src).toContain("settingsHubSection(activePath)");
    expect(src).toContain("useHouseNavPending");
    expect(src).toContain("markPending(item.href, event)");
    expect(src).toContain("HouseNavPendingProbe");
    expect(src).not.toContain('usePathname');
    expect(src).not.toContain("persistWorkspaceCookie");
    expect(src).not.toContain("availableWorkspaceOptions");
    expect(src).not.toContain("ChevronLeft");
    expect(src).not.toContain("lucide-react");
    expect(src).not.toContain("SettingsLocalNav");
  });

  it("washes the hub section that matches the path", () => {
    navigation.pathname = "/settings/preferences";
    const preferences = renderToStaticMarkup(<SettingsRail />);
    expect(preferences).toMatch(
      /data-settings-rail-item="preferences"[^>]*aria-current="page"/,
    );
    expect(preferences).not.toMatch(
      /data-settings-rail-item="profile"[^>]*aria-current="page"/,
    );

    navigation.pathname = "/settings/profile";
    const profile = renderToStaticMarkup(<SettingsRail />);
    expect(profile).toMatch(/data-settings-rail-item="profile"[^>]*aria-current="page"/);
    expect(profile).not.toMatch(
      /data-settings-rail-item="preferences"[^>]*aria-current="page"/,
    );

    navigation.pathname = "/settings/agreements";
    const agreements = renderToStaticMarkup(<SettingsRail />);
    expect(agreements).toMatch(/data-settings-rail-item="profile"[^>]*aria-current="page"/);

    navigation.pathname = "/settings/preferences/theme";
    const theme = renderToStaticMarkup(<SettingsRail />);
    expect(theme).toMatch(
      /data-settings-rail-item="preferences"[^>]*aria-current="page"/,
    );
    expect(theme).not.toMatch(
      /data-settings-rail-item="profile"[^>]*aria-current="page"/,
    );

    navigation.pathname = "/settings/security";
    const security = renderToStaticMarkup(<SettingsRail />);
    expect(security).toMatch(
      /data-settings-rail-item="security"[^>]*aria-current="page"/,
    );
    expect(security).not.toMatch(
      /data-settings-rail-item="profile"[^>]*aria-current="page"/,
    );
  });

  it("does not invent Account / Users / API or the Access destinations", () => {
    navigation.pathname = "/settings/profile";
    const html = renderToStaticMarkup(<SettingsRail />);
    for (const absent of SETTINGS_RAIL_ABSENT) {
      expect(html).not.toContain(absent);
    }
    expect(html).not.toContain("GLOBAL CONTENT");
    expect(src).not.toContain("GC_NAV");
    expect(src).not.toContain("@/lib/nav");
    expect(src).not.toContain("purple");
  });

  it("uses the house workspace-rail SoT — same tokens as Aggregation", () => {
    expect(src).not.toContain("SETTINGS_RAIL_ITEM_CLASS");
    expect(src).not.toContain("SETTINGS_RAIL_ACTIVE_CLASS");
    expect(src).not.toContain("SETTINGS_RAIL_IDLE_CLASS");
    expect(src).not.toContain("SETTINGS_RAIL_TITLE_CLASS");
    expect(src).toContain('@/lib/house-shell');

    navigation.pathname = "/settings/profile";
    const html = renderToStaticMarkup(<SettingsRail />);
    expect(html).toContain(HOUSE_RAIL_ACTIVE_CLASS);
    expect(html).toContain(HOUSE_RAIL_IDLE_CLASS);
    expect(html).toContain(HOUSE_RAIL_ITEM_CLASS);
    expect(html).toContain(HOUSE_RAIL_TITLE_CLASS);
    expect(html).not.toContain("bg-surface-muted text-ink");
    expect(html).not.toContain("t-section");
  });
});
