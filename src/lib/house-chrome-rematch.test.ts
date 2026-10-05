import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/education",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
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

import { HouseLeadChrome } from "@/components/chrome/house-lead-chrome";
import { HouseLeadSearch } from "@/components/chrome/house-lead-search";
import { UserMenu } from "@/components/chrome/user-menu";
import {
  HOUSE_MODULE_CLASS,
  HOUSE_RAIL_ACTIVE_CLASS,
  HOUSE_RAIL_COLUMN_CLASS,
  HOUSE_SEARCH_PILL_CLASS,
} from "@/lib/house-shell";
import { EDUCATION_SEARCH } from "@/lib/course-search";
import { SOCIAL_DESKTOP_NAV } from "@/lib/nav";
import { SOCIAL_FOR_YOU_CARD_CLASS } from "@/lib/social-chrome";

const tokens = readFileSync("src/app/tokens.css", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const lead = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const leadSearch = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");
const sideNav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
const titlesPage = readFileSync("src/app/(app)/aggregation/titles/page.tsx", "utf8");
const titlesCatalog = readFileSync("src/lib/titles-catalog.ts", "utf8");
const nav = readFileSync("src/lib/nav.ts", "utf8");
const switcher = readFileSync("src/lib/workspace-switcher.ts", "utf8");
const mobileChrome = readFileSync("src/lib/mobile-chrome.ts", "utf8");
const collapse = readFileSync("src/lib/rail-collapse.ts", "utf8");
const socialChrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const houseShell = readFileSync("src/lib/house-shell.ts", "utf8");
const settings = readFileSync("src/lib/settings.ts", "utf8");

const FUN_CHROME_PATHS = [
  "src/lib/house-shell.ts",
  "src/lib/house-lead-chrome.ts",
  "src/components/chrome/app-shell.tsx",
  "src/components/chrome/house-lead-chrome.tsx",
  "src/components/chrome/side-nav.tsx",
  "src/components/chrome/house-lead-search.tsx",
  "src/components/social/social-search-sheet.tsx",
  "src/lib/social-search.ts",
  "src/lib/social-chrome.ts",
  "src/lib/workspace-switcher.ts",
  "src/lib/mobile-chrome.ts",
  "src/lib/rail-collapse.ts",
  "src/components/chrome/rail-collapse.tsx",
  "src/lib/settings.ts",
  "src/components/theme-toggle.tsx",
] as const;

describe("house chrome rematch miss list v1.1", () => {
  it("uses Social side nav + full-width top on Aggregation and Education — no third chrome", () => {
    expect(shell).toContain('workspace === "social" && !settingsPage');
    expect(lead).toContain("data-house-full-width-top");
    expect(shell).toContain("<HouseLeadChrome");
    expect(shell).toContain("HOUSE_RAIL_PANEL_CLASS");
    // H register: the side menu is a full-height column; the header
    // starts at its edge.
    expect(shell).toContain("HOUSE_RAIL_COLUMN_CLASS");
    expect(shell).not.toContain("border-r border-hairline");
    expect(shell).not.toMatch(/style=\{\{ height: "var\(--header-height\)", marginLeft: "var\(--sidebar-width\)" \}\}/);
    expect(lead).toContain("<BrandLogo />");
    expect(shell).toContain("<SideNav");
    expect(shell).not.toContain("StudioRail");
    expect(shell).not.toContain("data-studio-rail");
    expect(existsSync("src/components/chrome/studio-rail.tsx")).toBe(false);
  });

  it("keeps a white page canvas and grey r16 modules only when needed", () => {
    expect(tokens).not.toMatch(/--bg:\s*#fafafb;/);
    expect(HOUSE_MODULE_CLASS).toContain("bg-surface-muted");
    expect(HOUSE_MODULE_CLASS).toContain("shadow-none");
    expect(shell).toContain("HousePhoneAppShell");
    expect(readFileSync("src/components/chrome/house-phone-app-shell.tsx", "utf8")).toContain(
      "HOUSE_PAGE_CANVAS_CLASS",
    );
    expect(shell).not.toMatch(/shadow-(?:sm|md|lg|xl)/);
  });

  it("keeps Aggregation without top search, Education quiet, Social live", () => {
    expect(shell).not.toContain("SearchField");
    expect(shell).toContain("HouseLeadSearch");
    expect(shell).toContain('workspace === "education" && !settingsPage');
    expect(lead).toContain('data-education-header-search-host={education ? "desktop" : undefined}');
    expect(lead).toContain('data-education-header-search-host={education ? "phone" : undefined}');

    const education = renderToStaticMarkup(createElement(HouseLeadSearch, { tone: "quiet" }));
    expect(education).toContain("data-education-header-search");
    expect(education).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(education).toContain(EDUCATION_SEARCH.placeholder);
    expect(education).toContain('action="/education"');
    expect(leadSearch).not.toContain("md:w-[420px]");
    expect(leadSearch).not.toContain("md:flex-none");
  });

  it("places Social and Education search first in the trailing cluster — never beside the logo", () => {
    expect(lead).toContain("HOUSE_LEAD_SLOT_CLASS");
    expect(lead).not.toContain("left-1/2");
    expect(lead).not.toContain("-translate-x-1/2");
    expect(lead.indexOf("data-brand-emblem")).toBeLessThan(
      lead.indexOf("data-app-header-workspace-desktop"),
    );
    expect(lead.indexOf("data-app-header-workspace-desktop")).toBeLessThan(
      lead.indexOf("data-app-header-trailing"),
    );
    expect(lead.indexOf("data-app-header-trailing")).toBeLessThan(
      lead.indexOf("data-house-lead-search"),
    );
    expect(lead.indexOf("data-social-header-actions")).toBeLessThan(
      lead.indexOf("data-house-lead-search"),
    );

    const social = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "social",
        logoVisible: "always",
        search: createElement(HouseLeadSearch, { tone: "live" }),
        trailingSearch: createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
        accountMenu: createElement(UserMenu, { email: "ada@example.com", name: "Ada" }),
      }),
    );
    expect(social).toContain("data-social-header-lead");
    expect(social.indexOf("data-brand-emblem")).toBeLessThan(
      social.indexOf("data-workspace-switcher-slider"),
    );
    expect(social.indexOf("data-workspace-switcher-slider")).toBeLessThan(
      social.indexOf("data-app-header-trailing"),
    );
    expect(social.indexOf("data-app-header-trailing")).toBeLessThan(
      social.indexOf("data-social-header-search"),
    );
    expect(social.indexOf("data-social-header-search")).toBeLessThan(
      social.indexOf("data-ask-assistant-header"),
    );
    expect(social).not.toContain("left-1/2");

    const leading = lead.slice(
      lead.indexOf("data-app-header-leading"),
      lead.indexOf("data-app-header-trailing"),
    );
    const trailing = lead.slice(
      lead.indexOf("data-app-header-trailing"),
      lead.indexOf("</header>"),
    );
    expect(leading).toContain("data-app-header-brand-search");
    expect(leading).toContain("HOUSE_LEAD_SLOT_CLASS");
    expect(leading).not.toContain("data-education-header-search-host");
    expect(leading).not.toContain("{search}");
    expect(lead).toContain("data-house-under-nav");
    expect(lead.indexOf("</header>")).toBeLessThan(lead.indexOf("data-house-under-nav"));
    expect(lead).toContain('data-education-header-search-host={education ? "phone" : undefined}');
    // H register: both faces lead — the grey pill (phone, md to lg) and
    // the slider (lg+); the trailing cluster holds no switcher.
    expect(leading).toContain("<WorkspaceSwitcher");
    expect(leading).toContain('presentation="slider"');
    expect(leading).toContain('presentation="waffle"');
    expect(trailing).not.toContain("<WorkspaceSwitcher");
    expect(trailing).toContain("{accountMenu}");
    expect(trailing).toContain("{trailingSearch");
    expect(trailing).toContain("data-social-header-actions");
    expect(trailing).toContain('data-education-header-search-host={education ? "desktop" : undefined}');
    expect(trailing.indexOf("{search}")).toBeLessThan(trailing.indexOf("<AskAssistantHeaderLink"));
    expect(shell).not.toContain("SearchField");
  });

  it("removes the Social Messages icon from the top bar — side nav only", () => {
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(lead).not.toContain("data-social-header-tray");
    expect(lead).not.toContain("SOCIAL_ROUTES.dms");
    const header = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "social",
        logoVisible: "always",
        search: createElement(HouseLeadSearch, { tone: "live" }),
        trailingSearch: createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
        accountMenu: createElement(UserMenu, { email: "ada@example.com", name: "Ada" }),
      }),
    );
    expect(header).toContain("data-social-header-search");
    expect(header).not.toContain("data-social-header-tray");
    expect(SOCIAL_DESKTOP_NAV.map((item) => item.href)).toContain("/social/dms");
  });

  it("keeps one phone workspace switcher, Staff as its own workspace, one Sporty Blue pill", () => {
    expect(lead.match(/<WorkspaceSwitcher/g)?.length).toBe(2);
    expect(shell).toContain("<HouseLeadChrome");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(lead).toContain('presentation="slider"');
    expect(lead).toContain('presentation="waffle"');
    expect(lead).not.toContain('tone="pill"');
    expect(lead).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(lead).toContain("APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS");
    expect(lead).toContain("APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS");
    expect(nav).toContain('if (workspace === "social") return { items: SOCIAL_NAV, staffItems: [] }');
    expect(sideNav).toContain("staffItems");
    expect(switcher).not.toContain("HOUSE_CONTROL_PILL_CLASS");
    expect(switcher).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(switcher).toContain("WORKSPACE_WAFFLE_TRIGGER_CLASS");
    // Screening chrome: the grid button is its own 44-tall named box.
    expect(switcher).not.toContain("HOUSE_THEME_TOGGLE_CLASS");
    expect(switcher).not.toContain("rounded-[var(--radius-sm)]");
    expect(mobileChrome).toContain("HOUSE_ICON_BUTTON_CLASS");
    // H register: the quiet collapse glyph is ink-2 (the board).
    expect(collapse).toContain("text-ink-2");
    expect(collapse).not.toContain("HOUSE_SHELL_QUIET_INK_CLASS");
    expect(socialChrome).toContain("HOUSE_RAIL_PANEL_CLASS");
    expect(readFileSync("src/components/social/social-search-sheet.tsx", "utf8")).toContain(
      "HOUSE_HEADER_TRAILING_HIT_CLASS",
    );
    expect(lead).not.toContain("ThemeToggle");
    expect(readFileSync("src/lib/house-lead-chrome.ts", "utf8")).toContain("HOUSE_THEME_TOGGLE_CLASS");
    // H register: header controls are the one round grey 44
    // (HOUSE_HEADER_ROUND_BUTTON_CLASS, rounded-full), not the bare icon hit.
    expect(readFileSync("src/lib/house-lead-chrome.ts", "utf8")).toContain("HOUSE_HEADER_ROUND_BUTTON_CLASS");
    expect(readFileSync("src/lib/house-lead-chrome.ts", "utf8")).not.toContain("HOUSE_ICON_BUTTON_CLASS");
  });

  it("uses one register on Aggregation, Social, and Education", () => {
    expect(shell.match(/HOUSE_RAIL_COLUMN_CLASS/g)?.length).toBe(2);
    expect(shell).not.toContain("fixed left-0 top-[calc(var(--header-height)+16px)]");
    expect(socialChrome).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
    expect(SOCIAL_FOR_YOU_CARD_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(switcher).toContain("WORKSPACE_WAFFLE_TRIGGER_CLASS");
    expect(switcher).not.toContain("HOUSE_CONTROL_PILL_CLASS");
    expect(mobileChrome).toContain("HOUSE_ICON_BUTTON_CLASS");
    // H register: the collapse control is a round 44 like every chrome
    // circle (not the screening chrome's radius-6 / radius-10 boxes).
    expect(collapse).toContain("rounded-full");
    expect(collapse).not.toContain("rounded-[var(--radius-sm)]");
    expect(socialChrome).toContain("HOUSE_MODULE_CLASS");
  });

  it("stays on the 24Frame social/fun chrome lane — not a professional flatten", () => {
    expect(houseShell).toMatch(/social\/fun chrome lane/);
    expect(houseShell).toMatch(/do not flatten/);
    expect(shell).toContain("data-social-workspace");
    expect(lead).toContain("data-house-full-width-top");
    expect(HOUSE_RAIL_ACTIVE_CLASS).not.toContain("bg-ink");
    expect(HOUSE_RAIL_ACTIVE_CLASS).not.toMatch(/(?:^|[\s"])bg-accent(?:[\s"]|$)/);
    expect(tokens).not.toMatch(/#f97316|#ea580c|#ff6a00|#ff7a00/i);
    expect(settings).toContain("house-shell.ts");
    for (const path of FUN_CHROME_PATHS) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(/Royalogic/i);
      expect(src, path).not.toMatch(/\brl-/);
    }
  });

  it("locks Social onto the shared rail-collapse SoT (G1–G5)", () => {
    const railUi = readFileSync("src/components/chrome/rail-collapse.tsx", "utf8");
    expect(existsSync("src/components/social/social-rail-extras.tsx")).toBe(false);
    expect(existsSync("src/components/chrome/rail-collapse.tsx")).toBe(true);
    expect(shell.match(/<RailCollapse collapsed=\{collapsed\} onToggle=\{toggle\} \/>/g)?.length).toBe(1);
    expect(shell).not.toContain("collapsed={false}");
    expect(shell).not.toContain("SocialRailCollapse");
    expect(shell).not.toContain("data-social-rail-collapse");
    expect(railUi).toContain("RAIL_COLLAPSE_CHEVRON");
    expect(railUi).toContain("CaretDoubleLeft");
    expect(railUi).toContain("CaretDoubleRight");
    expect(railUi).toContain("RAIL_COLLAPSE_CHEVRON_CLASS");
    expect(railUi).toContain("RAIL_EXPAND_CHEVRON_CLASS");
    expect(railUi).not.toMatch(/Royalogic/i);
    expect(railUi).not.toMatch(/\brl-/);

    expect(shell).toContain("persistSidebarCollapsed");
    expect(shell).toContain("RAIL_COLLAPSE_WIDTH_VAR");
    expect(shell).toContain("RAIL_WIDTH_CLASS");
    expect(shell).toContain('style={collapseWidthStyle}');
    expect(collapse).toContain('SIDEBAR_COLLAPSED_COOKIE = "24frame_sidebar_collapsed"');
    expect(collapse).toContain('RAIL_COLLAPSE_WIDTH_VAR = "var(--sidebar-width-collapsed)"');

    const socialAside = shell.slice(
      shell.indexOf("data-social-rail="),
      shell.indexOf("data-app-social-frame="),
    );
    // H register: the collapse control sits at the side menu's foot,
    // after the rows (not in a top row).
    expect(socialAside).toContain("data-app-rail-foot");
    expect(socialAside).not.toContain("collapseControl=");
    expect(socialAside.indexOf("<SideNavSlot")).toBeLessThan(socialAside.indexOf("<RailCollapse"));
    expect(socialAside).toContain("collapsed={collapsed}");
    expect(socialAside).toContain('workspace={socialChrome ? "social" : workspace}');
    expect(socialAside).not.toContain("SocialRailAccountChip");
    expect(socialAside).not.toContain("data-social-rail-account");

    expect(shell).not.toContain("SOCIAL_RAIL_MAIN_OFFSET_CLASS");
    expect(shell).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
    expect(shell).toContain("RAIL_WIDTH_CLASS");
    expect(shell).toContain('style={{ marginLeft: "var(--sidebar-width)" }}');
    expect(shell).toContain("data-social-workspace");
    expect(shell).toContain("<HouseLeadChrome");
    expect(shell).toContain("SOCIAL_RAIL_PANEL_CLASS");
    expect(shell).not.toContain("StudioRail");
    expect(socialChrome).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
  });

  it("locks lead ↔ rail chrome gutter (G6)", () => {
    const leadLib = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
    // H register: the column is flush (no gutter inset) and runs the
    // viewport's full height; its 80 top band matches the header.
    expect(HOUSE_RAIL_COLUMN_CLASS).not.toContain("var(--chrome-gutter)");
    expect(leadLib).toContain("HOUSE_SHELL_GUTTER_X_CLASS");
    expect(leadLib).not.toContain("md:px-[var(--chrome-gutter)]");
    expect(leadLib).not.toContain("md:px-[var(--content-inset)]");
    expect(lead).not.toContain("md:px-[var(--content-inset)]");
    expect(lead).not.toContain("md:pl-5");
    expect(shell.match(/HOUSE_RAIL_COLUMN_CLASS/g)?.length).toBe(2);
    expect(shell).toContain("HOUSE_CANVAS_X_CLASS");
    expect(shell).toContain("HOUSE_HOME_RAIL_COLUMN_CLASS");
    expect(shell).not.toContain("data-app-messages-frame");
    expect(shell).not.toContain("left-4 ");
    expect(shell).not.toContain("md:px-[var(--content-inset)]");
    expect(collapse).toContain("w-[var(--sidebar-width)]");
    expect(collapse).not.toContain("var(--chrome-gutter)");
    expect(socialChrome).toContain("px-[var(--chrome-gutter)]");
    expect(socialChrome).not.toContain("w-[calc(200px-var(--chrome-gutter))]");
    expect(socialChrome).not.toContain("md:ml-[200px]");
    expect(socialChrome).not.toContain("md:px-[var(--content-inset)]");
    expect(houseShell).toContain("HOUSE_CHROME_GUTTER");
    expect(houseShell).not.toContain("SOCIAL_CHROME_GUTTER");
    expect(houseShell).not.toContain("AGG_CHROME_GUTTER");
  });

  it("keeps house tokens, Titles content, and Delete/Archive unmixed", () => {
    expect(existsSync("src/app/tokens-social.css")).toBe(false);
    expect(titlesPage).toContain("HousePageSearch");
    expect(titlesCatalog).not.toMatch(/\bDelete\b/);
    expect(titlesPage).not.toMatch(/\bDelete\b/);
    expect(titlesPage).not.toMatch(/\bArchive\b/);
  });
});
