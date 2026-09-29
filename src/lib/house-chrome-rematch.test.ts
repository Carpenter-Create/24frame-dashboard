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
  HOUSE_CONTROL_PILL_CLASS,
  HOUSE_FILTER_ON_CLASS,
  HOUSE_ICON_BUTTON_CLASS,
  HOUSE_MODULE_CLASS,
  HOUSE_PAGE_CANVAS_CLASS,
  HOUSE_RAIL_ACTIVE_CLASS,
  HOUSE_RAIL_ITEM_CLASS,
  HOUSE_RAIL_FLOAT_CLASS,
  HOUSE_RAIL_PANEL_CLASS,
  HOUSE_SHELL_GUTTER_X_CLASS,
  HOUSE_CANVAS_X_CLASS,
  HOUSE_HEADER_SEARCH_GAP_CLASS,
  HOUSE_SEARCH_PILL_CLASS,
} from "@/lib/house-shell";
import { EDUCATION_SEARCH } from "@/lib/course-search";
import { SOCIAL_DESKTOP_NAV } from "@/lib/nav";
import { RAIL_WIDTH_CLASS } from "@/lib/rail-collapse";
import { SOCIAL_FOR_YOU_CARD_CLASS } from "@/lib/social-chrome";

const tokens = readFileSync("src/app/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
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
    expect(shell).toContain("HOUSE_RAIL_FLOAT_CLASS");
    expect(HOUSE_RAIL_FLOAT_CLASS).toContain("left-[var(--chrome-gutter)]");
    expect(HOUSE_RAIL_FLOAT_CLASS).toContain("top-[calc(var(--header-height)+var(--chrome-gutter))]");
    expect(shell).not.toContain("border-r border-hairline");
    expect(shell).not.toMatch(/style=\{\{ height: "var\(--header-height\)", marginLeft: "var\(--sidebar-width\)" \}\}/);
    expect(lead).toContain("<BrandLogo />");
    expect(shell).toContain("<SideNav");
    expect(shell).not.toContain("StudioRail");
    expect(shell).not.toContain("data-studio-rail");
    expect(existsSync("src/components/chrome/studio-rail.tsx")).toBe(false);
  });

  it("keeps a white page canvas and grey r16 modules only when needed", () => {
    expect(tokens).toMatch(/--bg:\s*#ffffff;/);
    expect(tokens).not.toMatch(/--bg:\s*#fafafb;/);
    expect(tokens).toMatch(/--surface-muted:\s*#f4f4f6;/);
    expect(tokens).toMatch(/--radius-lg:\s*16px;/);
    expect(HOUSE_PAGE_CANVAS_CLASS).toBe("bg-bg");
    expect(HOUSE_MODULE_CLASS).toContain("bg-surface-muted");
    expect(HOUSE_MODULE_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(HOUSE_MODULE_CLASS).toContain("shadow-none");
    expect(HOUSE_RAIL_PANEL_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(HOUSE_CONTROL_PILL_CLASS).toBe("rounded-full");
    expect(HOUSE_ICON_BUTTON_CLASS).toBe("rounded-full");
    expect(HOUSE_SEARCH_PILL_CLASS).toContain("rounded-full");
    expect(shell).toContain("HousePhoneAppShell");
    expect(readFileSync("src/components/chrome/house-phone-app-shell.tsx", "utf8")).toContain(
      "HOUSE_PAGE_CANVAS_CLASS",
    );
    expect(globals).toMatch(/\.card-surface\s*\{[\s\S]*?box-shadow:\s*none/);
    expect(shell).not.toMatch(/shadow-(?:sm|md|lg|xl)/);
  });

  it("keeps Aggregation without top search, Education quiet, Social live", () => {
    expect(shell).not.toContain("SearchField");
    expect(shell).toContain("HouseLeadSearch");
    expect(shell).toContain('workspace === "education" && !settingsPage');
    expect(lead).toContain('data-education-header-search-host={education ? "desktop" : undefined}');
    expect(lead).toContain('data-education-header-search-host={education ? "phone" : undefined}');
    expect(leadSearch).toContain("data-social-header-search");
    expect(leadSearch).toContain("HOUSE_SEARCH_PILL_CLASS");

    const education = renderToStaticMarkup(createElement(HouseLeadSearch, { tone: "quiet" }));
    expect(education).toContain("data-education-header-search");
    expect(education).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(education).toContain(EDUCATION_SEARCH.placeholder);
    expect(education).toContain('action="/education"');
    expect(leadSearch).not.toContain("md:w-[420px]");
    expect(leadSearch).not.toContain("md:flex-none");
  });

  it("places Social and Education search beside the logo — not center-floating", () => {
    expect(HOUSE_HEADER_SEARCH_GAP_CLASS).toBe("gap-[var(--space-4)]");
    expect(lead).toContain("data-social-header-lead");
    expect(lead).toContain("HOUSE_LEAD_SLOT_CLASS");
    expect(lead).not.toContain("left-1/2");
    expect(lead).not.toContain("-translate-x-1/2");
    expect(lead.indexOf("data-brand-emblem")).toBeLessThan(
      lead.indexOf("data-house-lead-search"),
    );
    expect(lead.indexOf("data-house-lead-search")).toBeLessThan(
      lead.indexOf("data-social-header-actions"),
    );
    expect(lead.indexOf("data-social-header-lead")).toBeLessThan(
      lead.indexOf("data-house-lead-search"),
    );
    expect(lead.indexOf("data-house-lead-search")).toBeLessThan(
      lead.indexOf("data-app-header-trailing"),
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
    expect(social).toContain(HOUSE_HEADER_SEARCH_GAP_CLASS);
    expect(social.indexOf("data-brand-emblem")).toBeLessThan(
      social.indexOf("data-social-header-search"),
    );
    expect(social.indexOf("data-social-header-search")).toBeLessThan(
      social.indexOf("data-app-header-trailing"),
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
    expect(leading).toContain('data-education-header-search-host={education ? "desktop" : undefined}');
    expect(leading).not.toContain('data-education-header-search-host={education ? "phone" : undefined}');
    expect(leading.indexOf("data-brand-emblem")).toBeLessThan(
      leading.indexOf('data-education-header-search-host={education ? "desktop" : undefined}'),
    );
    expect(lead).toContain("data-house-under-nav");
    expect(lead.indexOf("</header>")).toBeLessThan(lead.indexOf("data-house-under-nav"));
    expect(lead).toContain('data-education-header-search-host={education ? "phone" : undefined}');
    expect(trailing).toContain("<WorkspaceSwitcher");
    expect(trailing).not.toContain('presentation="pills"');
    expect(trailing).toContain("{accountMenu}");
    expect(trailing).toContain("{trailingSearch");
    expect(trailing).toContain("data-social-header-actions");
    expect(trailing).not.toContain("data-education-header-search-host");
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
    expect(lead.match(/<WorkspaceSwitcher/g)?.length).toBe(1);
    expect(shell).toContain("<HouseLeadChrome");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(lead).not.toContain('presentation="pills"');
    expect(lead).not.toContain('tone="pill"');
    expect(lead).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(lead).toContain("<WorkspaceSwitcher current={workspace} options={workspaceOptions} isGcStaff={isGcStaff} />");
    expect(nav).toContain('if (workspace === "social") return { items: SOCIAL_NAV, staffItems: [] }');
    expect(sideNav).toContain("staffItems");
    expect(HOUSE_RAIL_ACTIVE_CLASS).toBe("bg-accent-wash text-accent");
    expect(HOUSE_FILTER_ON_CLASS).toBe("bg-ink text-surface");
    expect(switcher).not.toContain("HOUSE_CONTROL_PILL_CLASS");
    expect(switcher).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(switcher).toContain("WORKSPACE_WAFFLE_TRIGGER_CLASS");
    expect(switcher).toContain("HOUSE_THEME_TOGGLE_CLASS");
    expect(switcher).not.toContain("rounded-[var(--radius-sm)]");
    expect(mobileChrome).toContain("HOUSE_ICON_BUTTON_CLASS");
    expect(collapse).toContain("HOUSE_ICON_BUTTON_CLASS");
    expect(socialChrome).toContain("HOUSE_RAIL_PANEL_CLASS");
    expect(leadSearch).toContain("HOUSE_SEARCH_PILL_CLASS");
    expect(readFileSync("src/components/social/social-search-sheet.tsx", "utf8")).toContain(
      "HOUSE_HEADER_TRAILING_HIT_CLASS",
    );
    expect(lead).not.toContain("ThemeToggle");
    expect(readFileSync("src/lib/house-lead-chrome.ts", "utf8")).toContain("HOUSE_THEME_TOGGLE_CLASS");
    expect(readFileSync("src/lib/house-lead-chrome.ts", "utf8")).toContain("HOUSE_ICON_BUTTON_CLASS");
  });

  it("uses one rounded register on Aggregation, Social, and Education", () => {
    expect(shell.match(/HOUSE_RAIL_FLOAT_CLASS/g)?.length).toBe(2);
    expect(shell).not.toContain("fixed left-0 top-[calc(var(--header-height)+16px)]");
    expect(RAIL_WIDTH_CLASS).toBe("w-[calc(var(--sidebar-width)-var(--chrome-gutter))]");
    expect(socialChrome).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
    expect(SOCIAL_FOR_YOU_CARD_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("rounded-full");
    expect(switcher).toContain("HOUSE_THEME_TOGGLE_CLASS");
    expect(switcher).not.toContain("HOUSE_CONTROL_PILL_CLASS");
    expect(mobileChrome).toContain("HOUSE_ICON_BUTTON_CLASS");
    expect(collapse).toContain("HOUSE_ICON_BUTTON_CLASS");
    expect(socialChrome).toContain("HOUSE_MODULE_CLASS");
  });

  it("stays on the 24Frame social/fun chrome lane — not a professional flatten", () => {
    expect(houseShell).toMatch(/social\/fun chrome lane/);
    expect(houseShell).toMatch(/do not flatten/);
    expect(shell).toContain("data-social-workspace");
    expect(lead).toContain("data-house-full-width-top");
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("rounded-full");
    expect(HOUSE_RAIL_ACTIVE_CLASS).toBe("bg-accent-wash text-accent");
    expect(HOUSE_RAIL_ACTIVE_CLASS).not.toMatch(/font-(?:normal|medium|semibold|bold)/);
    expect(HOUSE_RAIL_ACTIVE_CLASS).not.toContain("bg-ink");
    expect(HOUSE_RAIL_ACTIVE_CLASS).not.toMatch(/(?:^|[\s"])bg-accent(?:[\s"]|$)/);
    expect(HOUSE_SEARCH_PILL_CLASS).toContain("rounded-full");
    expect(HOUSE_CONTROL_PILL_CLASS).toBe("rounded-full");
    expect(HOUSE_ICON_BUTTON_CLASS).toBe("rounded-full");
    expect(HOUSE_MODULE_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(tokens).toMatch(/--accent:\s*#1769ff;/);
    expect(tokens).not.toMatch(/#f97316|#ea580c|#ff6a00|#ff7a00/i);
    expect(settings).toContain("house-shell.ts");
    expect(leadSearch).toContain("HOUSE_SEARCH_PILL_CLASS");
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
    expect(railUi).toContain("RAIL_COLLAPSE_EXPAND_ROW_CLASS");
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
    expect(socialAside.indexOf("<RailCollapse")).toBeLessThan(socialAside.indexOf("<SideNav"));
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
    expect(RAIL_WIDTH_CLASS).toBe("w-[calc(var(--sidebar-width)-var(--chrome-gutter))]");
    expect(socialChrome).not.toContain("SOCIAL_RAIL_WIDTH_CLASS");
  });

  it("locks lead ↔ rail chrome gutter (G6)", () => {
    const leadLib = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
    expect(tokens).toMatch(/--chrome-gutter:\s*16px;/);
    expect(tokens).toMatch(/--sidebar-width:\s*256px;/);
    expect(tokens).toMatch(/--access-rail-width:\s*var\(--sidebar-width\);/);
    expect(tokens).toMatch(/--home-content-width:\s*1376px;/);
    expect(tokens).toMatch(/--shell-gutter-inline-start:\s*32px;/);
    expect(tokens).toMatch(/--shell-gutter-inline-end:\s*32px;/);
    expect(HOUSE_SHELL_GUTTER_X_CLASS).toBe(
      "md:pl-[var(--shell-gutter-inline-start)] md:pr-[var(--shell-gutter-inline-end)]",
    );
    expect(HOUSE_CANVAS_X_CLASS).toBe("px-[var(--chrome-gutter)]");
    expect(HOUSE_RAIL_FLOAT_CLASS).toContain("left-[var(--chrome-gutter)]");
    expect(HOUSE_RAIL_FLOAT_CLASS).toContain("top-[calc(var(--header-height)+var(--chrome-gutter))]");
    expect(HOUSE_RAIL_FLOAT_CLASS).toContain(
      "h-[calc(100dvh-var(--header-height)-calc(var(--chrome-gutter)*2))]",
    );
    expect(leadLib).toContain("HOUSE_SHELL_GUTTER_X_CLASS");
    expect(leadLib).not.toContain("md:px-[var(--chrome-gutter)]");
    expect(leadLib).not.toContain("md:px-[var(--content-inset)]");
    expect(lead).not.toContain("md:px-[var(--content-inset)]");
    expect(lead).not.toContain("md:pl-5");
    expect(shell.match(/HOUSE_RAIL_FLOAT_CLASS/g)?.length).toBe(2);
    expect(shell).toContain("HOUSE_CANVAS_X_CLASS");
    expect(shell).toContain("HOUSE_HOME_RAIL_COLUMN_CLASS");
    expect(shell).not.toContain("data-app-messages-frame");
    expect(shell).not.toContain("left-4 ");
    expect(shell).not.toContain("md:px-[var(--content-inset)]");
    expect(collapse).toContain("var(--chrome-gutter)");
    expect(socialChrome).toContain("px-[var(--chrome-gutter)]");
    expect(socialChrome).not.toContain("w-[calc(200px-var(--chrome-gutter))]");
    expect(socialChrome).not.toContain("md:ml-[200px]");
    expect(socialChrome).not.toContain("md:px-[var(--content-inset)]");
    expect(houseShell).toContain("HOUSE_CHROME_GUTTER");
    expect(houseShell).not.toContain("SOCIAL_CHROME_GUTTER");
    expect(houseShell).not.toContain("AGG_CHROME_GUTTER");
  });

  it("keeps house tokens, Titles content, and Delete/Archive unmixed", () => {
    expect(tokens).toMatch(/--accent:\s*#1769ff;/);
    expect(existsSync("src/app/tokens-social.css")).toBe(false);
    expect(titlesPage).toContain("HousePageSearch");
    expect(titlesCatalog).not.toMatch(/\bDelete\b/);
    expect(titlesPage).not.toMatch(/\bDelete\b/);
    expect(titlesPage).not.toMatch(/\bArchive\b/);
  });
});
