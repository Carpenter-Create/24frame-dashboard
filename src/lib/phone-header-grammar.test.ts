import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/aggregation/dashboard",
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
import { AccountSheet, AccountMenuDropdown } from "@/components/chrome/account-sheet";
import {
  HOUSE_HEADER_TRAILING_AVATAR_CLASS,
  HOUSE_HEADER_TRAILING_HIT_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS,
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_PHONE_PAD_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import { HOUSE_PHONE_TRAILING_GUTTER_CLASS } from "@/lib/house-shell";
import { ASSISTANT_NAME } from "@/lib/product";
import { USER_MENU, USER_MENU_ACTIONS, USER_MENU_PHONE_ACTIONS } from "@/lib/user-menu";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
} from "@/lib/workspace-switcher";
import { ACCOUNT_SHEET_ITEMS, ACCOUNT_SHEET_PHONE_ITEMS } from "@/lib/account-sheet";

const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const leadLib = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
const switcherSrc = readFileSync("src/lib/workspace-switcher.ts", "utf8");
const sheetSrc = readFileSync("src/components/chrome/account-sheet.tsx", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");

function htmlClass(html: string, attr: string): string {
  const start = html.indexOf(attr);
  if (start < 0) return "";
  const tag = html.slice(html.lastIndexOf("<", start), html.indexOf(">", start));
  return tag.match(/class="([^"]*)"/)?.[1] ?? "";
}

describe("phone header grammar A — trim trailing", () => {
  it("keeps phone trailing as search · AI · bell · avatar", () => {
    expect(leadSrc).not.toContain("data-app-header-desktop-trailing");
    expect(leadSrc).not.toContain("APP_HEADER_DESKTOP_TRAILING_CLASS");
    expect(switcherSrc).not.toContain("APP_HEADER_DESKTOP_TRAILING_CLASS");
    expect(leadSrc).toContain("data-app-header-trailing-nav");
    expect(leadSrc).toContain('data-app-header-trailing-nav="" className="md:hidden"');
    expect(leadSrc.indexOf("{trailingSearch")).toBeLessThan(
      leadSrc.indexOf("data-app-header-trailing-nav"),
    );
    expect(leadSrc.indexOf("data-app-header-trailing-nav")).toBeLessThan(
      leadSrc.indexOf("<AskAssistantHeaderLink"),
    );
    expect(leadSrc).not.toContain("ThemeToggle");
    expect(leadSrc).not.toContain("data-theme-toggle");
    expect(leadSrc.indexOf("<AskAssistantHeaderLink")).toBeLessThan(leadSrc.indexOf("<ActivityBell"));
    expect(leadSrc.indexOf("<ActivityBell")).toBeLessThan(leadSrc.indexOf("{accountMenu}"));
    // Screening chrome: the grid button leads; nothing switches workspace
    // after the bell.
    expect(leadSrc).toMatch(/<WorkspaceSwitcher[\s\S]*<AskAssistantHeaderLink \/>[\s\S]*<ActivityBell/);
    expect(leadSrc).not.toMatch(/<ActivityBell[\s\S]*<WorkspaceSwitcher/);

    const aggregation = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "aggregation",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    const leading = aggregation.slice(
      aggregation.indexOf("data-app-header-leading"),
      aggregation.indexOf("data-app-header-trailing"),
    );
    const trailing = aggregation.slice(
      aggregation.indexOf("data-app-header-trailing"),
      aggregation.indexOf("</header>"),
    );
    expect(leading).toContain("data-brand-emblem");
    expect(leading).not.toContain("data-mobile-nav-trigger");
    expect(trailing).not.toContain("data-mobile-nav-trigger");
    expect(aggregation).not.toContain("data-mobile-nav-trigger");
    expect(trailing).not.toContain("data-app-header-desktop-trailing");
    expect(trailing).toContain("data-ask-assistant-header");
    expect(trailing).not.toContain("data-theme-toggle");
    expect(trailing).toContain("data-activity-bell");
    expect(trailing).toContain("data-user-menu-host");
    expect(trailing.indexOf("data-ask-assistant-header")).toBeLessThan(
      trailing.indexOf("data-activity-bell"),
    );
    expect(trailing.indexOf("data-activity-bell")).toBeLessThan(
      trailing.indexOf("data-user-menu-host"),
    );
    const askToBell = trailing.slice(
      trailing.indexOf("data-ask-assistant-header"),
      trailing.indexOf("data-activity-bell"),
    );
    expect(askToBell).not.toContain("data-theme-toggle");
    expect(askToBell).not.toContain("data-user-menu-host");
    expect(trailing).toContain("data-ask-ai-open");
    expect(trailing).not.toContain('href="/messages"');
    expect(trailing).not.toContain('href="/dashboard"');
    expect(trailing).not.toContain('href="/ai"');
    expect(trailing).not.toContain("data-social-header-actions");

    const education = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "education",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    const eduLead = education.slice(
      education.indexOf("data-app-header-leading"),
      education.indexOf("data-app-header-trailing"),
    );
    expect(eduLead).toContain("data-brand-emblem");
    expect(eduLead).not.toContain("data-mobile-nav-trigger");
    expect(education).not.toContain("data-mobile-nav-trigger");

    const social = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "social",
        logoVisible: "always",
        search: createElement(HouseLeadSearch, { tone: "live" }),
        trailingSearch: createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
        accountMenu: createElement(UserMenu, { email: "ada@example.com", name: "Ada" }),
      }),
    );
    expect(social).not.toContain("data-mobile-nav-trigger");
    expect(social.indexOf("data-social-header-search-icon")).toBeGreaterThan(
      social.indexOf("data-app-header-trailing"),
    );
    expect(social.indexOf("data-social-header-search-icon")).toBeLessThan(
      social.indexOf("data-ask-assistant-header"),
    );
    expect(social).not.toContain("data-theme-toggle");
    expect(social.indexOf("data-ask-assistant-header")).toBeLessThan(
      social.indexOf("data-activity-bell"),
    );
    expect(social.indexOf("data-activity-bell")).toBeLessThan(
      social.indexOf("data-account-sheet-trigger"),
    );
  });

  // Coinbase register: 16 lead (the emblem on the chrome gutter) and 12
  // trail (the board's 0 12 0 16); the 44 avatar photo sits 12 from the
  // viewport — not flush.
  it("houses phone right air so the avatar is not flush", () => {
    expect(tokens).toMatch(/--chrome-gutter:\s*16px;/);
    expect(HOUSE_PHONE_TRAILING_GUTTER_CLASS).toBe("max-md:pr-[var(--space-3)]");
    expect(HOUSE_LEAD_PHONE_PAD_CLASS).toBe(
      "max-md:pl-[var(--chrome-gutter)] max-md:pr-[var(--space-3)]",
    );
    expect(HOUSE_LEAD_CHROME_CLASS).toContain(HOUSE_PHONE_TRAILING_GUTTER_CLASS);
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("max-md:pl-[var(--chrome-gutter)]");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("md:px-[var(--chrome-gutter)]");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("px-[var(--space-6)]");
    expect(leadLib).toContain("HOUSE_PHONE_TRAILING_GUTTER_CLASS");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
  });

  it("keeps phone trailing AI · bell · avatar on one gap without collapsing hits", () => {
    // Coinbase register: phone hits 4 apart (the board); desktop 8.
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-1\)\](?:\s|$)/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toMatch(/-m[xlr]-/);
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("p-[var(--space-2)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("size-4");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).toContain("size-[var(--header-avatar-size)]");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).not.toContain("h-8 w-8");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).not.toContain("-mx-");
    expect(HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS).toBe("contents md:hidden");
    // Phone: a 44 hit around the 30 face; desktop: the 28 avatar.
    expect(sheetSrc).toContain("HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS");
    expect(sheetSrc).toContain("HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS");
    expect(sheetSrc).toContain("HOUSE_HEADER_DESKTOP_AVATAR_CLASS");
    expect(readFileSync("src/components/activity/activity-bell.tsx", "utf8")).toContain(
      "HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS",
    );
  });

  it("does not reintroduce lead-row overflow-hidden from #412", () => {
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(HOUSE_LEAD_STACK_CLASS).not.toMatch(/overflow-hidden/);
    expect(HOUSE_LEAD_CHROME_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);

    const html = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "aggregation",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    for (const attr of [
      'data-app-header=""',
      'data-app-header-leading=""',
    ]) {
      expect(htmlClass(html, attr)).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    }
  });

  it("keeps the same Settings — Theme — Get Help stack on phone and desktop — 24Frame AI stays header-only", () => {
    expect(USER_MENU_PHONE_ACTIONS.map((item) => item.kind)).toEqual([
      "settings",
      "theme",
      "help",
    ]);
    expect(USER_MENU_PHONE_ACTIONS).toBe(USER_MENU_ACTIONS);
    expect(USER_MENU).not.toHaveProperty("askAssistant");
    expect(USER_MENU).not.toHaveProperty("askAssistantHref");
    expect(ACCOUNT_SHEET_PHONE_ITEMS).toBe(USER_MENU_PHONE_ACTIONS);
    expect(ACCOUNT_SHEET_ITEMS).toBe(USER_MENU_ACTIONS);
    expect(ACCOUNT_SHEET_ITEMS.map((item) => item.kind)).toEqual(["settings", "theme", "help"]);

    const sheet = renderToStaticMarkup(
      createElement(AccountSheet, {
        email: "ada@example.com",
        pathname: "/",
        onClose: () => undefined,
      }),
    );
    expect(sheet).not.toContain('data-sheet-group-item="profile"');
    expect(sheet).toContain('data-sheet-group-item="settings"');
    expect(sheet).toContain('data-sheet-group-item="theme"');
    expect(sheet).not.toContain('data-sheet-group-item="askAssistant"');
    expect(sheet).not.toContain('data-sheet-group-item="appearance"');
    expect(sheet).toContain('data-sheet-group-item="help"');
    expect(sheet).toContain(USER_MENU.theme);
    expect(sheet).toContain(USER_MENU.themeHref);
    expect(sheet).toContain(USER_MENU.help);
    expect(sheet).not.toContain(ASSISTANT_NAME);
    expect(sheet).not.toContain('href="/messages"');
    expect(sheet).not.toContain(USER_MENU.appearance);
    expect(sheet.indexOf('data-sheet-group-item="settings"')).toBeLessThan(
      sheet.indexOf('data-sheet-group-item="theme"'),
    );
    expect(sheet.indexOf('data-sheet-group-item="theme"')).toBeLessThan(
      sheet.indexOf('data-sheet-group-item="help"'),
    );
    expect(sheet).not.toContain("data-account-menu-appearance-mode");
    expect(sheet).not.toContain("data-account-menu-theme-switch");
    expect(sheet).toContain("data-sheet-group-inset");
    expect(sheetSrc).not.toContain("AccountSheetAppearance");
    expect(sheetSrc).not.toContain("/account/appearance");

    const dropdown = renderToStaticMarkup(
      createElement(AccountMenuDropdown, {
        email: "ada@example.com",
        pathname: "/",
        onClose: () => undefined,
      }),
    );
    expect(dropdown).not.toContain("data-sheet-group");
    expect(dropdown).toContain('data-account-menu-row="settings"');
    expect(dropdown).toContain('data-account-menu-row="theme"');
    expect(dropdown).not.toContain('data-account-menu-row="askAssistant"');
    expect(dropdown).not.toContain('data-account-menu-row="appearance"');
    expect(dropdown).toContain('data-account-menu-row="help"');
    expect(dropdown).toContain(USER_MENU.theme);
    expect(dropdown).toContain(USER_MENU.help);
    expect(dropdown).toContain("w-full");
    expect(dropdown).toContain("h-[4px]");
    expect(dropdown.indexOf('data-account-menu-row="settings"')).toBeLessThan(
      dropdown.indexOf('data-account-menu-row="theme"'),
    );
    expect(dropdown.indexOf('data-account-menu-row="theme"')).toBeLessThan(
      dropdown.indexOf('data-account-menu-row="help"'),
    );
    expect(dropdown).not.toContain(ASSISTANT_NAME);
    expect(dropdown).not.toContain(USER_MENU.appearance);
  });
});
