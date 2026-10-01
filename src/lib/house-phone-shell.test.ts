import { createElement } from "react";
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
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

import { BookOpen, FilmStrip, House, SquaresFour, Users } from "@phosphor-icons/react";

import { HouseLeadChrome } from "@/components/chrome/house-lead-chrome";
import { HousePhoneAppShell } from "@/components/chrome/house-phone-app-shell";
import { HousePhoneBottomNav } from "@/components/chrome/house-phone-bottom-nav";
import { HouseLeadSearch } from "@/components/chrome/house-lead-search";
import { UserMenu } from "@/components/chrome/user-menu";
import {
  HOME_PHONE_DESTS,
  HOUSE_HEADER_TRAILING_DESKTOP_CLASS,
  HOUSE_HEADER_TRAILING_ICON_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV,
  HOUSE_PHONE_BOTTOM_NAV_CHIP_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT,
  HOUSE_PHONE_CHROME_ICON_CLASS,
  HOUSE_PHONE_CHROME_ICON_WEIGHT,
  HOUSE_PHONE_CHROME_IDLE_INK_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS,
  HOUSE_PHONE_DEST_CHIPS,
  HOUSE_PHONE_WORKSPACE_TABS,
  SOCIAL_PHONE_DESTS,
  housePhoneDestActiveIndex,
  housePhoneDestinations,
  housePhoneDockDestinations,
  housePhonePrefetchDestHrefs,
  housePhoneShowsBottomDests,
  housePhoneWorkspaceSelected,
} from "@/lib/house-phone-shell";
import { ASK_GLOBEE } from "@/lib/ask-globee";
import {
  HOUSE_HEADER_TRAILING_AVATAR_CLASS,
  HOUSE_HEADER_TRAILING_HIT_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import { PHOSPHOR_CHROME_ICON_CLASS } from "@/lib/phosphor-icon";
import { SOCIAL_ROUTES } from "@/lib/social";

const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const shellSrc = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const phoneShellSrc = readFileSync("src/lib/house-phone-shell.ts", "utf8");
const bottomNavSrc = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
const phoneAppShellSrc = readFileSync("src/components/chrome/house-phone-app-shell.tsx", "utf8");
const askHeaderSrc = readFileSync("src/components/chrome/ask-assistant-header.tsx", "utf8");
const bellSrc = readFileSync("src/components/activity/activity-bell.tsx", "utf8");
const searchSheetSrc = readFileSync("src/components/social/social-search-sheet.tsx", "utf8");
const accountSheetSrc = readFileSync("src/components/chrome/account-sheet.tsx", "utf8");

function renderLead(workspace: "aggregation" | "social" | "education") {
  return renderToStaticMarkup(
    createElement(HouseLeadChrome, {
      workspace,
      trailingSearch:
        workspace === "social"
          ? createElement("button", { "data-social-header-search-icon": "" })
          : undefined,
      accountMenu: createElement("div", { "data-account-sheet-trigger": "" }),
    }),
  );
}

describe("phone app-shell IA A — dest dock + header workspace sheet", () => {
  it("shows the waffle in the header and no workspace name pill", () => {
    expect(leadSrc).toContain("<WorkspaceSwitcher");
    expect(leadSrc).not.toContain("data-app-header-workspace-pill");
    expect(leadSrc).not.toContain('tone="pill"');
    expect(leadSrc).toContain('presentation="pills"');
    expect(leadSrc).toContain('presentation="waffle"');
    expect(leadSrc).toContain("data-app-header-workspace-desktop");
    expect(leadSrc).toContain("APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS");
    expect(leadSrc).toContain("APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS");
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(2);

    const aggregation = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "aggregation",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    expect(aggregation).toContain("data-workspace-waffle");
    expect(aggregation).toContain('data-workspace-switcher-presentation="waffle"');
    expect(aggregation).toContain('data-workspace-switcher-presentation="pills"');
    expect(aggregation).not.toContain("data-app-header-workspace-pill");
    expect(aggregation).toContain("data-app-header-workspace-desktop");
    expect(aggregation).toContain("hidden md:contents");

    const top = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "social",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    expect(top).toContain("data-house-lead-chrome");
    expect(top).toContain("data-workspace-waffle");
    expect(top).not.toContain("data-app-header-workspace-pill");
  });

  it("keeps the emblem on the left and kills the hamburger on every workspace", () => {
    expect(shellSrc).not.toContain("trailingNav=");
    expect(shellSrc).not.toContain("MobileNav");
    expect(shellSrc).not.toContain("destChips=");
    expect(existsSync("src/components/chrome/mobile-nav.tsx")).toBe(false);
    expect(existsSync("src/components/social/social-phone-dests.tsx")).toBe(false);
    expect(existsSync("src/components/chrome/house-phone-dest-chips.tsx")).toBe(false);
    expect(bottomNavSrc).toContain("SocialCreateFan");
    expect(bottomNavSrc).toContain('data-social-create-fan-trigger=""');
    expect(bottomNavSrc).not.toContain("SocialCreateSheet");
    expect(bottomNavSrc).not.toContain('data-social-create-sheet="dest"');
    expect(bottomNavSrc).not.toContain("HousePhoneDestChips");

    for (const workspace of ["aggregation", "education", "social"] as const) {
      const html = renderLead(workspace);
      const lead = html.slice(
        html.indexOf("data-app-header-leading"),
        html.indexOf("data-app-header-trailing"),
      );
      expect(lead).toContain("data-brand-emblem");
      expect(lead).not.toContain("data-app-header-workspace-pill");
      expect(lead).not.toContain("data-workspace-waffle");
      expect(lead).not.toContain("data-mobile-nav-trigger");
      expect(lead).not.toContain("data-house-phone-dest-chips");
      expect(html).not.toContain("data-mobile-nav-trigger");
      expect(html).not.toContain("Open menu");
      expect(html).not.toContain("data-house-phone-dest-chips");
      expect(html).toContain("data-ask-assistant-header");
      expect(html).toContain("data-ask-ai-open");
      expect(html).not.toContain('href="/messages"');
      expect(html).not.toContain('href="/ai"');
      expect(html).toContain("data-activity-bell");
      expect(html).toContain("data-account-sheet-trigger");
      expect(html.indexOf("data-brand-emblem")).toBeLessThan(
        html.indexOf("data-ask-assistant-header"),
      );
      expect(html.indexOf("data-ask-assistant-header")).toBeLessThan(
        html.indexOf("data-activity-bell"),
      );
      expect(html.indexOf("data-activity-bell")).toBeLessThan(
        html.indexOf("data-workspace-waffle"),
      );
      expect(html.indexOf("data-workspace-waffle")).toBeLessThan(
        html.indexOf("data-account-sheet-trigger"),
      );
    }

    const social = renderLead("social");
    expect(social.indexOf("data-social-header-search-icon")).toBeGreaterThan(
      social.indexOf("data-app-header-trailing"),
    );
    expect(social.indexOf("data-social-header-search-icon")).toBeLessThan(
      social.indexOf("data-ask-assistant-header"),
    );
  });

  it("ships four phone workspace sheet lanes — no Co-Productions in the dock", () => {
    expect(HOUSE_PHONE_WORKSPACE_TABS.map((tab) => tab.id)).toEqual([
      "home",
      "aggregation",
      "social",
      "education",
    ]);
    expect(HOUSE_PHONE_WORKSPACE_TABS.map((tab) => tab.label)).toEqual([
      "Home",
      "Aggregation",
      "Social",
      "Education",
    ]);
    expect(HOUSE_PHONE_WORKSPACE_TABS.map((tab) => tab.href)).toEqual([
      "/home",
      "/aggregation/dashboard",
      "/social",
      "/education",
    ]);
    expect(HOUSE_PHONE_WORKSPACE_TABS.map((tab) => tab.icon)).toEqual([
      House,
      FilmStrip,
      Users,
      BookOpen,
    ]);
    expect(HOUSE_PHONE_WORKSPACE_TABS.find((tab) => tab.id === "aggregation")?.icon).not.toBe(
      SquaresFour,
    );
    expect(HOUSE_PHONE_BOTTOM_NAV.label).toBe("Destinations");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("md:hidden");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("env(safe-area-inset-bottom)");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("rounded-full");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("h-12");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("border-hairline");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("bg-surface");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("shadow-[var(--elevation-float)]");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).not.toContain("backdrop-blur");
    expect(HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS).toContain("max-md:pb-");
    expect(HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS).toContain("var(--house-phone-dock-clearance)");
    const socialChrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    expect(socialChrome).toContain('from "@/lib/house-phone-dock"');
    expect(socialChrome).not.toContain("house-phone-shell");
    expect(phoneShellSrc).toContain("IA A");
    expect(phoneShellSrc).toContain("FilmStrip");
    expect(phoneShellSrc).not.toContain("CO_PRODUCTIONS_ICON");
    expect(phoneShellSrc).not.toContain("SquaresFour");
    expect(existsSync("src/components/social/social-mobile-tab-bar.tsx")).toBe(false);

    navigation.pathname = "/aggregation/dashboard";
    const html = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation" }),
    );
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain("data-house-phone-bottom-nav-pill");
    expect(html).toContain('data-house-phone-dest="Dashboard"');
    expect(html).toContain('data-house-phone-dest="Titles"');
    expect(html).not.toContain('data-house-phone-bottom-nav-item="home"');
    expect(html).not.toContain('data-house-phone-bottom-nav-item="social"');
    expect(html).not.toContain("data-social-tab-bar");
    expect(housePhonePrefetchDestHrefs(housePhoneDockDestinations({
      isGcStaff: false,
      workspace: "aggregation",
    }))).toEqual(
      housePhoneDockDestinations({ isGcStaff: false, workspace: "aggregation" }).map(
        (item) => item.href,
      ),
    );
    expect(bottomNavSrc).toContain("prefetchHrefList");
    expect(bottomNavSrc).toContain("useHouseNavPending");
    expect(bottomNavSrc).toContain("housePhonePrefetchDestHrefs");
    expect(housePhoneWorkspaceSelected("aggregation", "/aggregation/dashboard", "aggregation")).toBe(true);
    expect(housePhoneWorkspaceSelected("home", "/home", "aggregation")).toBe(true);
    expect(housePhoneWorkspaceSelected("social", "/social/explore", "social")).toBe(true);
    expect(housePhoneWorkspaceSelected("education", "/education", "education")).toBe(true);
    expect(housePhoneWorkspaceSelected("aggregation", "/home", "aggregation")).toBe(false);
    expect(housePhoneWorkspaceSelected("social", "/settings", "social")).toBe(false);
  });

  it("matches dock glyphs to the phone header trailing size — separate literals", () => {
    expect(HOUSE_PHONE_CHROME_ICON_CLASS).toBe("size-6 shrink-0");
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS).toBe(HOUSE_PHONE_CHROME_ICON_CLASS);
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS).not.toBe(PHOSPHOR_CHROME_ICON_CLASS);
    expect(PHOSPHOR_CHROME_ICON_CLASS).toBe("size-4 shrink-0");
    expect(HOUSE_PHONE_CHROME_ICON_WEIGHT).toBe("regular");
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT).toBe(HOUSE_PHONE_CHROME_ICON_WEIGHT);
    expect(HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS).toBe("size-6 shrink-0");
    expect(HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS).toBe(HOUSE_PHONE_CHROME_ICON_CLASS);
    expect(phoneShellSrc).toMatch(
      /export const HOUSE_PHONE_CHROME_ICON_CLASS = "size-6 shrink-0";/,
    );
    expect(phoneShellSrc).toMatch(
      /export const HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS = "size-6 shrink-0";/,
    );
    expect(phoneShellSrc).not.toContain(
      "HOUSE_PHONE_CHROME_ICON_CLASS = HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS",
    );
    expect(HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS).not.toBe(PHOSPHOR_CHROME_ICON_CLASS);
    expect(HOUSE_HEADER_TRAILING_ICON_CLASS).toBe("size-6 shrink-0");
    expect(HOUSE_HEADER_TRAILING_PHONE_CLASS).toBe(
      "size-6 shrink-0 md:hidden text-ink-2",
    );
    expect(HOUSE_HEADER_TRAILING_DESKTOP_CLASS).toBe("size-6 shrink-0 hidden md:block");
    expect(bottomNavSrc).toContain("HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS");
    expect(bottomNavSrc).not.toContain("HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS");
    expect(bottomNavSrc).not.toContain("size-5");
    expect(bottomNavSrc).not.toContain("size-4");
    expect(phoneShellSrc).not.toContain('"size-7 shrink-0"');
    expect(phoneShellSrc).toContain('"size-6 shrink-0"');
    expect(phoneShellSrc).not.toContain('"size-4 shrink-0"');
    expect(phoneShellSrc.match(/"size-\d shrink-0"/g) ?? []).toEqual([
      '"size-6 shrink-0"',
      '"size-6 shrink-0"',
      '"size-6 shrink-0"',
    ]);
    expect(phoneShellSrc).toMatch(
      /export const HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS = "size-6 shrink-0";/,
    );
    expect(phoneShellSrc).not.toContain("bold");
    expect(phoneShellSrc).not.toContain('"fill"');
    expect(bottomNavSrc).toContain("aria-label={item.label}");
    expect(bottomNavSrc).not.toContain("{item.label}</span>");
    expect(bottomNavSrc).not.toContain("truncate");

    navigation.pathname = "/aggregation/dashboard";
    const html = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation" }),
    );
    expect(html).toContain(HOUSE_PHONE_CHROME_ICON_CLASS);
    expect(html).toContain("size-6");
    expect(html).not.toContain("size-7");
    expect(html).not.toContain("size-5");
    expect(html).not.toContain("size-4");
    expect(html).not.toContain('weight="bold"');
    expect(html).not.toContain('weight="fill"');
    for (const label of ["Dashboard", "Titles", "Recent activity", "Reports"]) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).not.toContain(`>${label}<`);
    }
    expect(html).toContain('aria-label="Aggregation"');
  });

  it("uses the 24px header-trailing SoT for phone AI + bell + search", () => {
    expect(askHeaderSrc).toContain("HOUSE_HEADER_TRAILING_PHONE_CLASS");
    expect(askHeaderSrc).toContain("HOUSE_HEADER_TRAILING_DESKTOP_CLASS");
    expect(bellSrc).toContain("HOUSE_HEADER_TRAILING_PHONE_CLASS");
    expect(searchSheetSrc).toContain("HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS");
    expect(searchSheetSrc).not.toContain("HOUSE_PHONE_CHROME_ICON_CLASS");
    expect(searchSheetSrc).toContain("HOUSE_PHONE_CHROME_IDLE_INK_CLASS");
    expect(accountSheetSrc).toContain("HOUSE_HEADER_TRAILING_AVATAR_CLASS");
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("size-4");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).toContain("size-[var(--header-avatar-size)]");
    expect(HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS).toBe("contents md:hidden");

    const lead = renderLead("social");
    const trailing = lead.slice(
      lead.indexOf("data-app-header-trailing"),
      lead.indexOf("</header>"),
    );
    expect(trailing).toContain("data-ask-assistant-header");
    expect(trailing).toContain("data-activity-bell");
    expect(trailing).toContain("size-6");
    expect(trailing).not.toContain("size-5");
    expect(trailing).not.toContain("size-7");
    expect(trailing).not.toContain("size-4");
    expect(HOUSE_HEADER_TRAILING_PHONE_CLASS).toContain(HOUSE_PHONE_CHROME_IDLE_INK_CLASS);
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS).toBe(HOUSE_PHONE_CHROME_IDLE_INK_CLASS);
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain("text-ink-3");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("text-ink-2");
  });

  it("puts a light house chip behind the active dest glyph only", () => {
    expect(HOUSE_PHONE_BOTTOM_NAV_CHIP_CLASS).toContain("bg-surface-muted");
    expect(HOUSE_PHONE_BOTTOM_NAV_CHIP_CLASS).toContain("rounded-full");
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS).toBe("text-accent");
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS).toBe("text-ink-2");
    expect(bottomNavSrc).toContain("data-house-phone-bottom-nav-chip");

    navigation.pathname = "/aggregation/dashboard";
    const aggregation = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation" }),
    );
    expect(aggregation.match(/data-house-phone-bottom-nav-chip=/g)?.length).toBe(1);
    const dash = aggregation.slice(
      aggregation.indexOf('data-house-phone-dest="Dashboard"'),
      aggregation.indexOf('data-house-phone-dest="Titles"'),
    );
    expect(dash).toContain("data-house-phone-bottom-nav-chip");
    expect(dash).toContain("size-6");
    const titles = aggregation.slice(aggregation.indexOf('data-house-phone-dest="Titles"'));
    expect(titles).not.toContain("data-house-phone-bottom-nav-chip");

    navigation.pathname = "/home";
    const home = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation", homeOwned: true }),
    );
    expect(home.match(/data-house-phone-bottom-nav-chip=/g)?.length).toBe(1);
    expect(home).toContain('data-house-phone-dest="Home"');
    expect(home).toContain('data-house-phone-dest="Industry news"');
  });

  it("hides the shared phone bottom bar with social-tab-bar-scroll", () => {
    expect(bottomNavSrc).toContain('from "@/lib/social-tab-bar-scroll"');
    expect(bottomNavSrc).toContain("useHousePhoneBottomNavHidden(pathname)");
    expect(phoneAppShellSrc).toContain("HousePhoneBottomNav");
    expect(HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS).toBe("pointer-events-none translate-y-full");
    expect(HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS).toContain("var(--house-phone-dock-clearance)");

    const html = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).not.toContain("data-house-phone-bottom-nav-hidden");
  });

  it("wires real dest lists into the dock and keeps Ask off the dests", () => {
    expect(housePhoneShowsBottomDests({ workspace: "aggregation" })).toBe(true);
    expect(housePhoneShowsBottomDests({ workspace: "education" })).toBe(true);
    expect(housePhoneShowsBottomDests({ workspace: "social" })).toBe(true);
    expect(housePhoneShowsBottomDests({ workspace: "staff" })).toBe(true);
    expect(housePhoneShowsBottomDests({ workspace: "aggregation", homeOwned: true })).toBe(true);
    expect(housePhoneShowsBottomDests({ workspace: "aggregation", accountChrome: true })).toBe(false);
    expect(housePhoneShowsBottomDests({ workspace: "education", accountChrome: true })).toBe(false);
    expect(housePhoneShowsBottomDests({ workspace: "aggregation", coProductions: true })).toBe(false);

    expect(housePhoneDestinations(false, "aggregation").map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(housePhoneDestinations(true, "aggregation").map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(housePhoneDestinations(true, "staff").map((item) => item.label)).toEqual([
      "Queue",
      "Avails",
      "Licensing Status",
      "Channels",
      "Finance",
      "Clients",
    ]);
    expect(housePhoneDestinations(true, "aggregation").map((item) => item.label)).not.toContain(
      "Queue",
    );
    expect(housePhoneDestinations(false, "aggregation").map((item) => item.label)).not.toContain(
      ASK_GLOBEE.headline,
    );
    expect(housePhoneDestinations(false, "education").map((item) => item.label)).toEqual([
      "Education",
    ]);
    expect(housePhoneDestinations(true, "education").map((item) => item.label)).toEqual([
      "Education",
      "Manage courses",
    ]);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.href)).toEqual([
      SOCIAL_ROUTES.home,
      SOCIAL_ROUTES.explore,
      SOCIAL_ROUTES.create,
      SOCIAL_ROUTES.dms,
      SOCIAL_ROUTES.profile,
    ]);
    expect(HOME_PHONE_DESTS.map((item) => item.label)).toEqual(["Home", "Industry news"]);
    expect(housePhoneDockDestinations({ isGcStaff: false, workspace: "social" }).map((item) => item.label)).toEqual([
      "Home",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(HOUSE_PHONE_DEST_CHIPS.label).toBe("Destinations");
    expect(housePhoneDestActiveIndex("/social/explore", housePhoneDestinations(false, "social"), "social")).toBe(1);
    expect(phoneShellSrc).not.toContain("HOUSE_PILL_SELECTED_CLASS");

    navigation.pathname = "/aggregation/titles";
    const aggregation = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation" }),
    );
    expect(aggregation).toContain('data-house-phone-dest="Dashboard"');
    expect(aggregation).toContain('data-house-phone-dest="Titles"');
    expect(aggregation).not.toContain('data-house-phone-dest="Queue"');
    expect(aggregation).not.toContain(ASK_GLOBEE.headline);

    navigation.pathname = "/staff/queue";
    const staff = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "staff", isGcStaff: true }),
    );
    expect(staff).toContain('data-house-phone-dest="Queue"');
    expect(staff).toContain('data-house-phone-dest="Channels"');
    expect(staff).not.toContain('data-house-phone-dest="Dashboard"');

    const staffOnAggregation = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation", isGcStaff: true }),
    );
    expect(staffOnAggregation).toContain('data-house-phone-dest="Dashboard"');
    expect(staffOnAggregation).not.toContain('data-house-phone-dest="Queue"');

    navigation.pathname = "/education";
    const education = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "education" }),
    );
    expect(education).toContain('data-house-phone-dest="Education"');
    expect(education).not.toContain('data-house-phone-dest="Dashboard"');

    navigation.pathname = "/social/explore";
    const social = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(social).toContain('data-house-phone-dest="Home"');
    expect(social).toContain('data-house-phone-dest="Explore"');
    expect(social).toContain('data-house-phone-dest="Create"');
    expect(social).toContain('data-house-phone-dest="Messages"');
    expect(social).toContain('data-house-phone-dest="Profile"');
    expect(social).not.toContain('data-house-phone-dest="Feed"');
    expect(social.indexOf('data-house-phone-dest="Home"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Explore"'),
    );
    expect(social.indexOf('data-house-phone-dest="Explore"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Create"'),
    );
    expect(social.indexOf('data-house-phone-dest="Create"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Messages"'),
    );
    expect(social.indexOf('data-house-phone-dest="Messages"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Profile"'),
    );
    expect(social).toContain(`href="${SOCIAL_ROUTES.home}"`);
    expect(social).toContain("data-house-phone-dest-create");
    expect(social).toContain('data-social-create-fan-trigger=""');
    expect(social).not.toContain("data-social-create-sheet");
    expect(social).not.toContain("data-social-create-fan-item");

    navigation.pathname = SOCIAL_ROUTES.home;
    const socialFeed = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(socialFeed).toMatch(
      /<a[^>]+href="\/social"[^>]*aria-current="page"[^>]*data-house-phone-dest="Home"/,
    );

    navigation.pathname = "/social/create";
    const socialCreate = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(socialCreate).not.toContain("data-house-phone-bottom-nav");
    expect(socialCreate).not.toContain("data-house-phone-dest-create");

    navigation.pathname = SOCIAL_ROUTES.stories;
    const socialStories = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(socialStories).not.toMatch(
      /<a[^>]+href="\/social"[^>]*aria-current="page"/,
    );

    navigation.pathname = SOCIAL_ROUTES.storiesNew;
    const socialStoryNew = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(socialStoryNew).not.toContain("data-house-phone-bottom-nav");
  });

  it("mounts one HousePhoneAppShell on every workspace and keeps Social off a second float", () => {
    expect(shellSrc).toContain("<HousePhoneAppShell");
    expect(shellSrc.match(/<HousePhoneAppShell/g)?.length).toBe(1);
    expect(shellSrc).toContain("One return tree");
    expect(shellSrc).toContain("chrome={chrome}");
    expect(phoneAppShellSrc).toContain("PhoneDockFromChrome");
    expect(phoneAppShellSrc).toContain("data.isGcStaff");
    expect(phoneAppShellSrc).toContain("clampWorkspaceMode");
    expect(shellSrc).not.toContain("SocialMobileTabBar");
    expect(shellSrc).not.toContain("HousePhoneDestChips");
    expect(shellSrc).toContain("HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS");

    navigation.pathname = "/home";
    const home = renderToStaticMarkup(
      createElement(
        HousePhoneAppShell,
        { workspace: "aggregation", homeOwned: true },
        createElement(HouseLeadChrome, {
          workspace: "aggregation",
          accountMenu: createElement("div", { "data-user-menu-host": "" }),
        }),
      ),
    );
    expect(home).toContain("data-house-phone-app-shell");
    expect(home).toContain("data-house-phone-bottom-nav");
    expect(home).toContain("data-workspace-waffle");
    expect(home).toContain('data-house-phone-dest="Home"');
    expect(home).not.toContain("data-social-tab-bar");
    expect(home).not.toContain("data-house-phone-dest-chips");
    expect(home).toContain('data-workspace-switcher-presentation="waffle"');
    expect(home).toContain('data-workspace-switcher-presentation="pills"');
    expect(home).toContain("hidden md:contents");
    expect(home).toContain("md:hidden");

    navigation.pathname = "/social";
    const social = renderToStaticMarkup(
      createElement(
        HousePhoneAppShell,
        { workspace: "social" },
        createElement(HouseLeadChrome, {
          workspace: "social",
          accountMenu: createElement("div", { "data-user-menu-host": "" }),
        }),
      ),
    );
    expect(social).toContain("data-house-phone-bottom-nav");
    expect(social).toContain('data-house-phone-dest="Home"');
    expect(social).toContain('data-house-phone-dest="Explore"');
    expect(social).toContain('data-house-phone-dest="Create"');
    expect(social).toContain('data-house-phone-dest="Messages"');
    expect(social).toContain('data-house-phone-dest="Profile"');
    expect(social).not.toContain('data-house-phone-dest="Feed"');
    expect(social.indexOf('data-house-phone-dest="Home"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Explore"'),
    );
    expect(social.indexOf('data-house-phone-dest="Explore"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Create"'),
    );
    expect(social.indexOf('data-house-phone-dest="Create"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Messages"'),
    );
    expect(social.indexOf('data-house-phone-dest="Messages"')).toBeLessThan(
      social.indexOf('data-house-phone-dest="Profile"'),
    );
    expect(social).not.toContain("data-house-phone-dest-chips");
    expect(social).toContain("data-workspace-waffle");
    expect(social).not.toContain("data-app-header-workspace-pill");
    expect((social.match(/data-house-phone-bottom-nav=""/g) ?? []).length).toBe(1);

    navigation.pathname = "/education";
    const education = renderToStaticMarkup(
      createElement(
        HousePhoneAppShell,
        { workspace: "education" },
        createElement(HouseLeadChrome, {
          workspace: "education",
          accountMenu: createElement("div", { "data-user-menu-host": "" }),
        }),
      ),
    );
    expect(education).toContain("data-house-phone-bottom-nav");
    expect(education).toContain('data-house-phone-dest="Education"');
    expect(education).toContain('data-workspace-switcher-presentation="waffle"');

    const wrapped = renderToStaticMarkup(
      createElement(
        HousePhoneAppShell,
        { workspace: "aggregation" },
        createElement(HouseLeadChrome, {
          workspace: "social",
          logoVisible: "always",
          search: createElement(HouseLeadSearch, { tone: "live" }),
          trailingSearch: createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
          accountMenu: createElement(UserMenu, { email: "ada@example.com" }),
        }),
      ),
    );
    expect(wrapped).toContain("data-house-phone-app-shell");
    expect(wrapped).toContain("data-house-phone-bottom-nav");
    expect(wrapped).toContain("data-house-lead-chrome");
  });
});
