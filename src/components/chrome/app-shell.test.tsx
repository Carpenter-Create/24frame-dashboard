import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_PHOTO_HREF } from "@/lib/account-avatar";
import {
  rememberAccountChromeIdentity,
  resetAccountChromeIdentityForTests,
} from "@/lib/account-chrome-identity";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

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
vi.mock("@/app/(app)/aggregation/messages/ask-frame-ai-actions", () => ({
  startAskFrameAiConversation: vi.fn(),
  appendAskFrameAiTurn: vi.fn(),
  completeAskFrameAiTurn: vi.fn(),
  setAskFrameAiThumb: vi.fn(),
  renameAskFrameAiConversation: vi.fn(),
  pinAskFrameAiConversation: vi.fn(),
  deleteAskFrameAiConversation: vi.fn(),
  loadAskAiOverlay: vi.fn(async () => ({
    surface: "ask-frame-ai-landing",
    initials: "A",
    displayName: "Ada Lovelace",
    conversations: [],
    conversation: null,
    messages: [],
  })),
}));
// The shell renders the collapse control at the side menu's foot (H
// register), outside SideNav, so the mock is the rows' host alone.
vi.mock("./side-nav", () => ({
  SideNav: ({
    isGcStaff,
    workspace,
    collapsed,
    homeOwned,
    messagesUnread,
  }: {
    isGcStaff?: boolean;
    workspace?: string;
    collapsed?: boolean;
    homeOwned?: boolean;
    messagesUnread?: number;
  }) =>
    createElement("nav", {
      "data-side-nav": "",
      "data-gc-staff": isGcStaff ? "" : undefined,
      "data-workspace": workspace ?? "aggregation",
      "data-collapsed": collapsed ? "" : undefined,
      "data-home-owned": homeOwned ? "" : undefined,
      "data-messages-unread": messagesUnread ?? 0,
    }),
}));
vi.mock("./user-menu", () => ({
  UserMenu: ({
    email,
    name,
    photoUrl,
  }: {
    email: string;
    name?: string | null;
    photoUrl?: string | null;
  }) =>
    createElement("div", {
      "data-user-menu-host": "",
      "data-email": email,
      "data-name": name ?? "",
      "data-photo": photoUrl ?? "",
    }),
}));

import { AppShell } from "./app-shell";
import type { AppShellChrome } from "@/lib/app-shell-chrome";
import type { MessagesSurface } from "@/lib/ask-frame-ai";
import {
  HOUSE_HEADER_EXIT_COMPACT_CLASS,
  HOUSE_HEADER_EXIT_LABEL_CLASS,
} from "@/lib/house-lead-chrome";
import { HOUSE_CANVAS_X_CLASS } from "@/lib/house-shell";
import {
  RAIL_COLLAPSE_CHEVRON,
  RAIL_COLLAPSE_CHEVRON_CLASS,
  RAIL_EXPAND_CHEVRON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_CLASS,
  RAIL_WIDTH_CLASS,
} from "@/lib/rail-collapse";
import { APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS } from "@/lib/workspace-switcher";
import { SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS } from "@/lib/social-chrome";
import { BRAND_LOGO_LIGHT_SRC, BRAND_LOGO_DARK_SRC } from "@/lib/brand";

afterEach(() => {
  resetAccountChromeIdentityForTests();
});

const shellSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "app-shell.tsx"), "utf8");
const railCollapseSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "rail-collapse.tsx"),
  "utf8",
);
const leadSrc = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "house-lead-chrome.tsx"),
  "utf8",
);

function fulfilledChrome(data: AppShellChrome): Promise<AppShellChrome> {
  const chrome = Promise.resolve(data) as Promise<AppShellChrome> & {
    status: "fulfilled";
    value: AppShellChrome;
  };
  chrome.status = "fulfilled";
  chrome.value = data;
  return chrome;
}

function homeFrameMarkup(html: string): string {
  const attr = html.indexOf("data-app-home-frame");
  expect(attr).toBeGreaterThan(-1);
  const tagStart = html.lastIndexOf("<div", attr);
  const tagEnd = html.indexOf(">", attr);
  expect(tagStart).toBeGreaterThan(-1);
  expect(tagEnd).toBeGreaterThan(tagStart);
  return html.slice(tagStart, tagEnd + 1);
}

function houseMeasureMarkup(html: string): string {
  const style = html.indexOf("max-width:var(--page-max-width)");
  expect(style).toBeGreaterThan(-1);
  const tagStart = html.lastIndexOf("<div", style);
  const tagEnd = html.indexOf(">", style);
  expect(tagStart).toBeGreaterThan(-1);
  expect(tagEnd).toBeGreaterThan(tagStart);
  return html.slice(tagStart, tagEnd + 1);
}

function renderShell(
  messagesSurface?: MessagesSurface,
  name?: string | null,
  defaultCollapsed = false,
  photoUrl?: string | null,
): string {
  return renderToStaticMarkup(
    <AppShell
      email="ada@example.com"
      name={name}
      photoUrl={photoUrl}
      orgs={[{ id: "org-1", name: "Acme" }]}
      activeOrgId="org-1"
      messagesUnread={Promise.resolve(0)}
      messagesSurface={messagesSurface}
      defaultCollapsed={defaultCollapsed}
    >
      page
    </AppShell>,
  );
}

describe("AppShell header", () => {
  it("keeps Ask between workspace names and the bell, then the avatar", () => {
    navigation.pathname = "/";
    const html = renderShell();
    expect(html).toContain("data-user-menu-host");
    expect(html).not.toContain("data-theme-toggle");
    expect(html).not.toContain("Switch to dark mode");
    // H register: emblem · grey pill (phone, md to lg) · slider (lg+)
    // lead; Ask · bell · avatar trail. No hairline divider.
    expect(html).not.toContain("data-app-header-divider");
    expect(html.indexOf("data-workspace-waffle")).toBeLessThan(
      html.indexOf('data-workspace-switcher-presentation="slider"'),
    );
    expect(html.indexOf('data-workspace-switcher-presentation="slider"')).toBeLessThan(
      html.indexOf("data-ask-assistant-header"),
    );
    expect(html.indexOf("data-ask-assistant-header")).toBeLessThan(html.indexOf("data-activity-bell"));
    expect(html.indexOf("data-activity-bell")).toBeLessThan(html.indexOf("data-user-menu-host"));
    expect(shellSrc).not.toContain("ThemeToggle");
    expect(shellSrc).not.toContain("ThemeGlyph");
    expect(leadSrc).not.toContain("ThemeToggle");
    expect(leadSrc).toContain("<ActivityBell");
    expect(leadSrc).toContain("<AskAssistantHeaderLink");
    expect(shellSrc).not.toContain("<ActivityBell");
    expect(shellSrc).not.toMatch(/⌘K|CommandK|command-k/i);
    expect(shellSrc).not.toContain("SearchField");
    expect(shellSrc).not.toContain("TitlesHeaderSearch");
  });

  it("keeps the account menu in the header", () => {
    navigation.pathname = "/";
    const html = renderShell();
    expect(html).toContain('data-email="ada@example.com"');
    expect(html).toContain('data-name=""');
    expect(html).toContain('data-photo=""');
    expect(renderShell(undefined, "Ada Lovelace")).toContain('data-name="Ada Lovelace"');
    expect(renderShell(undefined, "Ada Lovelace", false, "https://s3.example/signed-avatar")).toContain(
      'data-photo="https://s3.example/signed-avatar"',
    );
    expect(shellSrc).toContain("Phone avatar opens 544:561");
    expect(shellSrc).toContain("Asset 8 emblem on every workspace");
    expect(shellSrc).toContain('logoVisible="always"');
    expect(shellSrc).not.toContain('homeChrome ? "always" : "desktop"');
    expect(leadSrc).toContain('logoVisible = "always"');
    expect(shellSrc).toContain("HouseLeadChrome");
    expect(shellSrc).toContain("HouseLeadChromeSlot");
    expect(shellSrc).toContain("isGcStaff={data.isGcStaff}");
    expect(leadSrc).toContain("WorkspaceSwitcher");
    expect(leadSrc).not.toContain('tone="pill"');
    expect(leadSrc).toContain('presentation="slider"');
    expect(leadSrc).toContain('presentation="waffle"');
    expect(html).toContain("data-workspace-switcher");
    expect(html).toContain("data-house-lead-scroll");
    expect(html).toContain("h-dvh");
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("data-workspace-waffle");
    expect((html.match(/data-workspace-switcher=""/g) ?? []).length).toBe(2);
    expect(html).toContain('data-workspace-switcher-presentation="waffle"');
    expect(html).toContain('data-workspace-switcher-presentation="slider"');
    expect(html).toContain("data-workspace-switcher-slider");
    expect(html).not.toContain("data-workspace-switcher-lanes");
    expect(html).toContain('data-workspace-switcher-segment="social"');
    expect(html).toContain('data-workspace-switcher-segment="home"');
    expect(html).toContain(APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS);
    expect(html).not.toContain("data-app-header-workspace-pill");
    expect(html).not.toContain("data-workspace-switcher-rail");
    expect(html).not.toContain("data-workspace-switcher-lead");
    expect(html.indexOf("data-workspace-switcher")).toBeLessThan(html.indexOf("data-user-menu-host"));
    expect(shellSrc).not.toContain("DestChipsSlot");
    expect(shellSrc).not.toContain("AccountOverlay");
    expect(shellSrc).not.toContain("AccountSheet");
  });

  it("is avatar-only on every Access route — no org switcher", () => {
    expect(shellSrc).not.toContain("OrganizationSwitcher");
    expect(leadSrc).toContain("HOUSE_LEAD_CHROME_CLASS");
    expect(leadSrc).not.toContain('tone="pill"');
    expect(leadSrc).toContain('presentation="slider"');
    expect(leadSrc).toContain('presentation="waffle"');

    for (const path of ["/", "/aggregation/titles", "/aggregation/attention", "/activity"]) {
      navigation.pathname = path;
      const html = renderShell();
      expect(html).not.toContain("data-org-switcher");
      expect(html).toContain("justify-end");
      expect(html).toContain("data-user-menu-host");
      expect(html).toContain("data-app-header");
      // H register: the bar's lead pad is 24 beside a side menu and the
      // shell gutter 32 where it carries the brand mark (no side menu,
      // e.g. Activity); the end pad is always the shell gutter 32.
      const bar = html.slice(html.indexOf('data-app-header=""'), html.indexOf(">", html.indexOf('data-app-header=""')));
      expect(bar, path).toContain("md:pr-[var(--shell-gutter-inline-end)]");
      if (html.includes("data-app-rail")) {
        expect(bar, path).toContain("md:pl-[var(--space-6)]");
        expect(bar, path).not.toContain('data-app-header-brand=""');
      } else {
        expect(bar, path).toContain("md:pl-[var(--shell-gutter-inline-start)]");
        expect(bar, path).toContain('data-app-header-brand=""');
      }
    }
  });
});

describe("AppShell Home chrome", () => {
  it("shows the Home rail on /home and keeps rails on workspace destinations", () => {
    navigation.pathname = "/home";
    const home = renderShell();
    expect(home).toContain('data-home-chrome=""');
    expect(home).toContain("data-app-home-frame");
    expect(homeFrameMarkup(home)).not.toContain("mx-auto");
    expect(homeFrameMarkup(home)).not.toContain("page-max-width");
    expect(homeFrameMarkup(home)).toContain("md:ml-[var(--shell-gutter-inline-start)]");
    expect(homeFrameMarkup(home)).toContain("md:mr-[var(--shell-gutter-inline-end)]");
    expect(homeFrameMarkup(home)).toContain(
      "md:w-[calc(100%-var(--shell-gutter-inline-start)-var(--shell-gutter-inline-end))]",
    );
    expect(homeFrameMarkup(home)).not.toContain("access-rail-width");
    expect(homeFrameMarkup(home)).not.toContain("67.5rem");
    expect(homeFrameMarkup(home)).not.toContain("1080");
    expect(home).toContain("data-house-lead-chrome");
    expect(home).toContain("data-workspace-switcher");
    expect(home).toContain("data-workspace-waffle");
    expect(home).toContain('data-workspace-switcher-segment="social"');
    expect(home).toContain('data-workspace-switcher-segment="home"');
    expect(home).toContain("data-brand-emblem");
    expect(home).not.toContain("data-theme-toggle");
    expect(home).toContain("data-activity-bell");
    expect(home).toContain("data-user-menu-host");
    // Adam 2026-10-04: Home gets the same rail as every workspace.
    expect(home).toContain("data-app-rail");
    expect(home).toContain('data-home-owned=""');
    expect(home).not.toContain("data-social-rail");
    expect(home).toContain("Collapse sidebar");
    expect(home).toContain("margin-left:var(--sidebar-width)");
    expect(home).toContain("data-brand-logo");
    expect(home).toContain('data-brand-logo-mark="emblem"');
    expect(home).not.toMatch(/data-house-lead=""[^>]*[\s"]hidden(?:\s|")/);
    expect(home).not.toContain("data-mobile-nav-trigger");
    expect(home).not.toContain("data-house-phone-dest-chips");
    expect(home).not.toContain("--sidebar-width:0px");
    expect(home).not.toContain("--sidebar-width-collapsed:0px");
    expect(shellSrc).toContain("overviewHidesRail");
    expect(shellSrc).toContain("OVERVIEW_RAIL_OFF_WIDTH");
    const homeArm = shellSrc.slice(shellSrc.indexOf(": homePage"), shellSrc.indexOf(": cn(\"mx-auto"));
    expect(homeArm).not.toContain("mx-auto");
    expect(homeArm).not.toContain("page-max-width");
    expect(homeArm).toContain("HOUSE_HOME_RAIL_COLUMN_CLASS");
    expect(homeArm).toContain("HOUSE_CANVAS_X_CLASS");
    expect(shellSrc.match(/<HouseScreenOutlet>/g)?.length).toBe(1);

    for (const path of ["/aggregation/dashboard", "/social", "/education"]) {
      navigation.pathname = path;
      const html = renderShell();
      expect(html).toContain("data-app-rail");
      expect(html).toContain("Collapse sidebar");
      expect(html).not.toContain('data-home-chrome=""');
      expect(html).not.toContain("data-home-owned");
    }
  });

  it("keeps /home/news on Home chrome with the Home rail — no News workspace pill", () => {
    navigation.pathname = "/home/news";
    const news = renderShell();
    expect(news).toContain('data-home-chrome=""');
    expect(news).toContain("data-app-home-frame");
    expect(news).toContain("data-workspace-waffle");
    expect(news).toContain('data-workspace-switcher-segment="social"');
    expect(news).toContain('data-workspace-switcher-segment="home"');
    expect(news).not.toContain('data-workspace-switcher-segment="news"');
    expect(news).not.toContain('data-workspace-waffle-tile="news"');
    expect(news).toContain("data-app-rail");
    expect(news).toContain('data-home-owned=""');
    expect(news).not.toContain("data-social-rail");
    expect(news).not.toContain("data-social-tab-bar");
    expect(news).not.toContain("data-mobile-nav-trigger");
    expect(news).not.toContain("--sidebar-width:0px");
    expect(homeFrameMarkup(news)).toContain("md:ml-[var(--shell-gutter-inline-start)]");
  });

  it("keeps /co-productions on unify-lead chrome — no dest rail, Co-Productions pill only", () => {
    navigation.pathname = "/co-productions";
    const page = renderShell();
    expect(page).toContain('data-home-chrome=""');
    expect(page).toContain("data-app-home-frame");
    expect(page).toContain("data-workspace-waffle");
    expect(page).toContain('data-workspace-switcher-segment="social"');
    expect(page).not.toContain('data-workspace-switcher-segment="co-productions"');
    expect(page).not.toContain('data-workspace-waffle-tile="co-productions"');
    expect(page).not.toContain("data-app-rail");
    expect(page).not.toContain("data-side-nav");
    expect(page).not.toContain("data-social-rail");
    expect(page).not.toContain("data-house-phone-dest-chips");
    expect(page).toContain("--sidebar-width:0px");
  });
});

describe("AppShell Access rail and home frame", () => {
  it("uses the house dest-rail slot and the locked `/` page pad", () => {
    const tokens = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/tokens.css"),
      "utf8",
    );
    expect(tokens).not.toMatch(/--sidebar-width:\s*190px;/);

    navigation.pathname = "/";
    const html = renderShell();
    expect(html).toContain("data-app-rail");
    // Screening chrome: the side menu sits on the page canvas with a
    // hairline right edge — not a surface card.
    expect(html).toMatch(/<aside class="[^"]*\bbg-bg\b[^"]*" data-app-rail=""/);
    expect(html).toMatch(/<aside class="[^"]*\bborder-r border-hairline\b[^"]*" data-app-rail=""/);
    expect(html).not.toMatch(/<aside class="[^"]*bg-surface-muted/);
    expect(html).not.toMatch(/<aside class="[^"]*rounded-/);
    expect(html).toContain("data-app-home-frame");
    expect(html).toContain(HOUSE_CANVAS_X_CLASS);
    expect(html).toContain("py-[var(--space-8)]");
    expect(homeFrameMarkup(html)).not.toContain("mx-auto");
    expect(homeFrameMarkup(html)).not.toContain("page-max-width");
    expect(homeFrameMarkup(html)).not.toContain("access-rail-width");
    expect(tokens).toMatch(/--page-max-width:\s*67\.5rem;/);
    expect(shellSrc).toContain('maxWidth: "var(--page-max-width)"');
    expect(html).not.toContain("px-6 pb-24 pt-8");
    expect(html).not.toContain("px-6 ");
    expect(html).not.toContain("Search");
    expect(html).not.toContain("data-org-switcher");
  });

  it("does not restyle the titles bleed or other page frames", () => {
    navigation.pathname = "/aggregation/titles";
    const titles = renderShell();
    expect(titles).toContain("w-full pb-24");
    expect(titles).not.toContain("data-app-home-frame");
    expect(titles).not.toContain("data-app-messages-frame");
    expect(titles).not.toContain("data-org-switcher");
    expect(titles).not.toContain("data-titles-header-search");
    expect(titles).not.toContain("Search titles...");
    expect(titles).not.toContain("⌘K");

    navigation.pathname = "/staff/queue";
    const queue = renderShell();
    expect(queue).toContain("w-full pb-24");
    expect(queue).not.toContain("data-app-home-frame");
    expect(queue).not.toContain("data-app-messages-frame");
    expect(queue).not.toContain("pb-24 pt-8");

    navigation.pathname = "/activity";
    const activity = renderShell();
    expect(activity).toContain(HOUSE_CANVAS_X_CLASS);
    expect(activity).toContain("pb-24 pt-8");
    expect(activity).not.toContain("px-6 pb-24 pt-8");
    expect(activity).not.toContain("data-app-home-frame");
    expect(activity).not.toContain("data-app-messages-frame");
    expect(activity).not.toContain("data-org-switcher");

    navigation.pathname = "/aggregation/attention";
    const health = renderShell();
    expect(health).toContain(HOUSE_CANVAS_X_CLASS);
    expect(health).toContain("pb-24 pt-8");
    expect(health).not.toContain("px-6 pb-24 pt-8");
    expect(health).not.toContain("data-app-home-frame");
    expect(health).not.toContain("data-app-messages-frame");
    expect(health).not.toContain("data-org-switcher");
  });

  it("flushes Aggregation Dashboard cards to the shell gutter and keeps Education on the page cap", () => {
    navigation.pathname = "/aggregation/dashboard";
    const dashboard = renderShell();
    const columnAt = dashboard.indexOf('data-aggregation-shell-column=""');
    const columnTag = dashboard.slice(
      dashboard.lastIndexOf("<div", columnAt),
      dashboard.indexOf(">", columnAt) + 1,
    );
    expect(dashboard).not.toContain("data-app-home-frame");
    expect(columnAt).toBeGreaterThan(-1);
    expect(columnTag).toContain("md:pr-[var(--shell-gutter-inline-end)]");
    expect(columnTag).toContain("md:pl-[var(--chrome-gutter)]");
    expect(columnTag).toContain("max-md:px-[var(--chrome-gutter)]");
    expect(columnTag).not.toContain("mx-auto");
    expect(dashboard).not.toContain("max-width:var(--page-max-width)");
    expect(dashboard).not.toContain("ml-[var(--access-rail-width)]");
    expect(dashboard).toContain("data-app-rail");
    expect(dashboard).not.toContain('data-home-chrome=""');

    navigation.pathname = "/education";
    const education = renderShell();
    const educationCanvas = houseMeasureMarkup(education);
    expect(education).not.toContain("data-app-home-frame");
    expect(education).not.toContain("data-aggregation-shell-column");
    expect(educationCanvas).toContain("mx-auto");
    expect(educationCanvas).toContain("max-width:var(--page-max-width)");
    expect(educationCanvas).toContain(HOUSE_CANVAS_X_CLASS);
    expect(educationCanvas).toContain("pb-24 pt-8");

    expect(shellSrc).toContain('const homePage = pathname === "/" || homeChrome');
    expect(shellSrc).not.toContain('pathname === "/dashboard" || homeChrome');
  });

  it("mounts 24Frame AI as a shell overlay — leftover /messages is not an AI land", () => {
    expect(shellSrc).toContain("AskAiOverlayProvider");
    expect(shellSrc).not.toContain("data-app-messages-frame");
    expect(shellSrc).not.toContain("MessagesHeaderSlot");
    expect(shellSrc).not.toContain("messagesPage");

    navigation.pathname = "/activity";
    const activity = renderShell("ask-frame-ai-landing");
    expect(activity).not.toContain("data-app-messages-frame");
    expect(activity).not.toContain("data-header-search");
    expect(activity).not.toContain("data-header-thread");
    expect(activity).not.toContain("⌘K");
    expect(activity).toContain("data-ask-assistant-header");

    navigation.pathname = "/home";
    expect(renderShell("ask-frame-ai-landing")).toContain("data-ask-assistant-header");
    navigation.pathname = "/";
    expect(renderShell("access-gate")).not.toContain("data-header-search");
    expect(renderShell("access-gate")).not.toContain("data-titles-header-search");
    navigation.pathname = "/aggregation/titles";
    expect(renderShell("access-gate")).not.toContain("data-header-search");
    expect(shellSrc).not.toContain("SearchField");
  });
});

describe("AppShell client mobile chrome", () => {
  it("hides the persistent rail below the house mobile breakpoint and keeps the desktop rail", () => {
    const tokens = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/tokens.css"),
      "utf8",
    );
    expect(tokens).toMatch(/@media \(max-width:\s*767px\)/);

    navigation.pathname = "/";
    const html = renderShell();
    expect(html).toMatch(
      /<aside class="[^"]*\bhidden\b[^"]*\bmd:flex\b[^"]*" data-app-rail=""/,
    );
    expect(html).not.toContain("data-mobile-nav-trigger");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain('data-house-phone-dest="Dashboard"');
    expect(html).toContain("data-brand-emblem");
    expect(html).toContain("data-brand-logo");
    expect(html).toContain('data-brand-logo-mark="emblem"');
    expect(html.indexOf("data-brand-emblem")).toBeLessThan(
      html.indexOf("data-house-phone-bottom-nav"),
    );
    expect(html.indexOf("data-house-phone-bottom-nav")).toBeGreaterThan(
      html.indexOf("data-app-header-trailing"),
    );
    expect(html).not.toMatch(/data-house-lead=""[^>]*[\s"]hidden(?:\s|")/);
    expect(html).not.toContain("Open menu");
    expect(html).not.toContain("data-mobile-nav-sheet");
    expect(html).not.toContain("data-tab-bar");
    expect(html).not.toContain("data-social-mobile-pill");
    expect(html).not.toContain("data-social-create-fab");
    expect(shellSrc).toContain("HOUSE_RAIL_COLUMN_CLASS");
    expect(shellSrc).not.toContain("DestChipsSlot");
    expect(shellSrc).not.toContain("GC_NAV");
    expect(shellSrc).not.toMatch(/key=\{pathname\}/);

    const layoutSrc = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../../app/(app)/layout.tsx"),
      "utf8",
    );
    expect(layoutSrc).toContain("<AppShell");
    expect(layoutSrc).toContain("{children}");
    expect(layoutSrc).not.toMatch(/key=\{pathname\}/);
    expect(layoutSrc).not.toMatch(/key=\{ctx/);
  });

  it("keeps mobile chrome on Activity — Search stays off the page header", () => {
    navigation.pathname = "/activity";
    const leftover = renderShell("ask-frame-ai-landing");
    expect(leftover).not.toContain("data-mobile-nav-trigger");
    expect(leftover).not.toContain("data-house-phone-dest-chips");
    expect(leftover).toContain("data-app-header");
    expect(leftover).not.toContain("data-header-search");
    expect(leftover).not.toContain("⌘K");
    expect(leftover).not.toContain("data-app-rail");
  });
});

describe("AppShell /activity account chrome", () => {
  function renderActivity(defaultWorkspace: "aggregation" | "social" | "education" = "education") {
    return renderToStaticMarkup(
      <AppShell
        email="ada@example.com"
        name="Ada Lovelace"
        orgs={[{ id: "org-1", name: "Acme" }]}
        activeOrgId="org-1"
        messagesUnread={Promise.resolve(0)}
        defaultWorkspace={defaultWorkspace}
      >
        page
      </AppShell>,
    );
  }

  it("keeps /activity on Get Help account chrome — zero left rail", () => {
    for (const path of ["/activity", "/activity/x"] as const) {
      navigation.pathname = path;
      for (const workspace of ["aggregation", "social", "education"] as const) {
        const html = renderActivity(workspace);
        expect(html).toContain('data-activity-chrome=""');
        expect(html).not.toContain("data-home-chrome");
        expect(html).not.toContain("data-app-home-frame");
        expect(html).not.toContain("<aside");
        expect(html).not.toContain("data-app-rail");
        expect(html).not.toContain("data-side-nav");
        expect(html).not.toContain("data-settings-rail");
        expect(html).not.toContain("data-settings-rail-nav");
        expect(html).not.toContain("data-settings-rail-item");
        expect(html).not.toContain("data-social-rail");
        expect(html).not.toContain("data-social-workspace");
        expect(html).not.toContain("data-education-workspace");
        expect(html).not.toContain("data-education-header-search");
        expect(html).not.toContain("data-house-phone-dest-chips");
        expect(html).not.toContain("data-mobile-nav-trigger");
        expect(html).not.toContain("Collapse sidebar");
        expect(html).not.toContain("Expand sidebar");
        expect(html).toContain("--sidebar-width:0px");
        expect(html).toContain("data-workspace-switcher");
        expect(html).toContain("data-workspace-waffle");
        expect(html).toContain('data-workspace-switcher-segment="social"');
        expect(html).toContain('data-workspace-switcher-segment="home"');
        expect(html).toContain("data-user-menu-host");
        expect(html).toContain("data-house-lead-chrome");
        expect(html).toContain(HOUSE_CANVAS_X_CLASS);
        expect(html).toContain("pb-24 pt-8");
        expect(html).toContain("max-width:var(--page-max-width)");
        expect(html).not.toContain("/aggregation/activity");
      }
    }
    expect(shellSrc).toContain("isAccountChromeNoRailPath");
    expect(shellSrc).toContain("overviewHidesRail(pathname) || accountChromeNoRail");
    expect(shellSrc).toContain(
      "const hideDestRail = hideProductRail || storyCreateStage || storyOpenStage || exploreStage",
    );
    expect(shellSrc).toContain("{hideDestRail ? null : (");
    expect(shellSrc).toContain("settingsPage ? (");
    expect(shellSrc).toContain("<SettingsRail />");
    expect(shellSrc).not.toContain("activityPage ? (\n              <SettingsRail");
    expect(shellSrc).toContain("isActivityPath");
    expect(shellSrc).toContain("hideProductRail");
    expect(shellSrc).not.toContain("/aggregation/activity");
  });

  it("matches Get Help left chrome exactly — no Settings twin rail", () => {
    navigation.pathname = "/activity";
    const activity = renderActivity("aggregation");
    navigation.pathname = "/help";
    const help = renderToStaticMarkup(
      <AppShell
        email="ada@example.com"
        name="Ada Lovelace"
        orgs={[{ id: "org-1", name: "Acme" }]}
        activeOrgId="org-1"
        messagesUnread={Promise.resolve(0)}
        defaultWorkspace="aggregation"
      >
        page
      </AppShell>,
    );
    const beforeMain = (html: string) => html.slice(0, html.indexOf("<main"));
    const activityLead = beforeMain(activity);
    const helpLead = beforeMain(help);
    for (const chrome of [activityLead, helpLead]) {
      expect(chrome).not.toContain("<aside");
      expect(chrome).not.toContain("data-app-rail");
      expect(chrome).not.toContain("data-settings-rail");
      expect(chrome).not.toContain("data-settings-rail-nav");
      expect(chrome).not.toContain("data-side-nav");
      expect(chrome).not.toContain("Rights Holder");
    }
    expect(activityLead.includes("<aside")).toBe(helpLead.includes("<aside"));
    expect(activity).toContain(HOUSE_CANVAS_X_CLASS);
    expect(help).toContain(HOUSE_CANVAS_X_CLASS);
    expect(activity).toContain("max-width:var(--page-max-width)");
    expect(help).toContain("max-width:var(--page-max-width)");
  });
});

describe("AppShell /help account chrome", () => {
  function renderHelp(defaultWorkspace: "aggregation" | "social" | "education" = "education") {
    return renderToStaticMarkup(
      <AppShell
        email="ada@example.com"
        name="Ada Lovelace"
        orgs={[{ id: "org-1", name: "Acme" }]}
        activeOrgId="org-1"
        messagesUnread={Promise.resolve(0)}
        defaultWorkspace={defaultWorkspace}
      >
        page
      </AppShell>,
    );
  }

  it("keeps /help on account chrome — no Education pill, no product rail", () => {
    for (const path of ["/help", "/help/center", "/help/support", "/help/feedback"] as const) {
      navigation.pathname = path;
      for (const workspace of ["aggregation", "social", "education"] as const) {
        const html = renderHelp(workspace);
        expect(html).toContain('data-help-chrome=""');
        expect(html).not.toContain("data-home-chrome");
        expect(html).not.toContain("data-app-home-frame");
        expect(html).not.toContain("<aside");
        expect(html).not.toContain("data-app-rail");
        expect(html).not.toContain("data-side-nav");
        expect(html).not.toContain("data-settings-rail");
        expect(html).not.toContain("data-social-rail");
        expect(html).not.toContain("data-social-workspace");
        expect(html).not.toContain("data-education-workspace");
        expect(html).not.toContain("data-education-header-search");
        expect(html).not.toContain("data-house-phone-dest-chips");
        expect(html).not.toContain("data-mobile-nav-trigger");
        expect(html).not.toContain("Collapse sidebar");
        expect(html).not.toContain("Expand sidebar");
        expect(html).toContain("--sidebar-width:0px");
        expect(html).toContain("data-workspace-switcher");
        expect(html).toContain("data-workspace-waffle");
        expect(html).toContain('data-workspace-switcher-segment="social"');
        expect(html).toContain('data-workspace-switcher-segment="home"');
        expect(html).toContain("data-user-menu-host");
        expect(html).toContain("data-house-lead-chrome");
        expect(html).toContain(HOUSE_CANVAS_X_CLASS);
        expect(html).toContain("pb-24 pt-8");
        expect(html).toContain("max-width:var(--page-max-width)");
        expect(html).not.toContain("/education/help");
      }
    }
    expect(shellSrc).toContain("isHelpPath");
    expect(shellSrc).toContain("hideProductRail");
    expect(shellSrc).not.toContain("/education/help");
  });
});

describe("AppShell /settings rail", () => {
  it("puts one house dest rail in the Access slot and kills the dashboard destinations", () => {
    navigation.pathname = "/settings";
    const html = renderShell();
    expect(html).toContain("data-app-rail");
    expect(html).toContain('data-settings-rail=""');
    expect(html).toContain("data-settings-rail-nav");
    expect(html).toContain("data-user-menu-host");
    expect(html).toContain("data-workspace-waffle");
    expect(html).toContain("Settings");
    const settingsRail = html.slice(
      html.indexOf("data-settings-rail"),
      html.indexOf("data-house-lead-stack"),
    );
    expect(settingsRail).toContain("Profile");
    expect(settingsRail).toContain("Rights Holder");
    expect(settingsRail).toContain("Preferences");
    expect(settingsRail).not.toContain("You");
    expect(settingsRail).not.toContain("Social");
    expect(settingsRail).not.toContain("Education");
    expect(settingsRail).not.toContain("Aggregation");
    expect(html).not.toContain("Agreements");
    expect(html).not.toContain("Refer a friend");
    expect(html).not.toContain("data-side-nav");
    expect(html).not.toContain("Titles");
    expect(html).not.toContain("Deliveries");
    expect(html).not.toContain("Catalog Health");
    expect(html).not.toContain("Attention");
    expect(html).not.toContain("Recent activity");
    const rail = html.slice(html.indexOf("data-settings-rail"), html.indexOf("data-house-lead-stack"));
    expect(rail).not.toContain("Ask 24Frame AI");
    expect(html).toContain("data-ask-assistant-header");
    expect(html).not.toContain("data-side-nav-ask-ai");
    expect(html).not.toContain("data-mobile-nav-ask-ai");
    expect(html).not.toContain("Queue");
    expect(html).not.toContain("Expand sidebar");
    expect(html).not.toContain("Collapse sidebar");
    expect(html).not.toContain("data-mobile-nav-trigger");
    expect(html).not.toContain("data-house-phone-dest-chips");
    expect(html).not.toContain("data-settings-header-back");
    expect(html).not.toContain("SettingsHeaderBack");
    expect(html).not.toContain("Search");
    expect(html).not.toContain("data-header-search");
    expect(html).not.toContain("data-titles-header-search");
    expect(html.match(/data-app-rail=""/g) ?? []).toHaveLength(1);
    expect(html.match(/data-settings-rail=""/g) ?? []).toHaveLength(1);
    expect(shellSrc).toContain("isSettingsPath");
    expect(shellSrc).toContain("SettingsRail");
    expect(shellSrc).not.toContain("SettingsHeaderBack");
    expect(shellSrc).not.toContain("leadingNav");
    expect(shellSrc).toContain("SETTINGS_RAIL_PAD_CLASS");
    expect(shellSrc).toContain("collapsed && !settingsPage");
    expect(shellSrc).not.toContain("SettingsLocalNav");
    expect(shellSrc).not.toContain("md:w-[220px]");
    expect(html).not.toContain(`data-rail-collapse="${RAIL_COLLAPSE_CHEVRON}"`);
  });

  it("keeps the Access rail on neighboring routes", () => {
    for (const path of ["/", "/aggregation/titles", "/aggregation/attention"]) {
      navigation.pathname = path;
      const html = renderShell();
      expect(html).toContain("data-side-nav");
      expect(html).not.toContain("data-settings-rail");
      expect(html).not.toContain("data-settings-rail-nav");
      expect(html).not.toContain("data-mobile-nav-trigger");
      expect(html).toContain("data-house-phone-bottom-nav");
      expect(html).not.toContain("data-settings-header-back");
      expect(html).toContain("Collapse sidebar");
    }
  });

  it("keeps the focused dest rail on every /settings path", () => {
    for (const path of [
      "/settings/profile",
      "/settings/organization",
      "/settings/preferences",
      "/settings/agreements",
      "/settings/refer",
      "/settings/security",
      "/settings/team",
    ]) {
      navigation.pathname = path;
      const html = renderShell();
      expect(html).toContain('data-settings-rail=""');
      expect(html).toContain("data-settings-rail-nav");
      expect(html).toContain("Profile");
      expect(html).toContain("Rights Holder");
      expect(html).toContain("Preferences");
      expect(html).not.toContain("data-side-nav");
      expect(html).not.toContain("data-mobile-nav-trigger");
      expect(html).not.toContain("data-house-phone-dest-chips");
      expect(html).not.toContain("data-settings-header-back");
      expect(html).not.toContain("SettingsHeaderBack");
      expect(html).not.toContain("Collapse sidebar");
      expect(html).not.toContain(`data-rail-collapse="${RAIL_COLLAPSE_CHEVRON}"`);
    }
  });
});

describe("AppShell rail-collapse chevron", () => {
  // H register: the collapse control is a quiet 44 round button at the
  // bottom of the side menu (« expanded, » collapsed), Phosphor Regular.
  it("uses CaretDoubleLeft at the foot of the expanded side menu with house tokens", () => {
    for (const path of ["/", "/social", "/education"]) {
      navigation.pathname = path;
      const html = renderShell();
      expect(html).toContain("Collapse sidebar");
      expect(html).toContain(`title="Collapse sidebar"`);
      expect(html).toContain('viewBox="0 0 256 256"');
      expect(html).toContain('fill="currentColor"');
      expect(html).not.toContain("lucide-");
      expect(html).not.toContain('stroke-width="1.33"');
      expect(html).not.toContain("data-theme-toggle");
      expect(html).toContain("data-user-menu-host");
      expect(html).toContain(`data-rail-collapse="${RAIL_COLLAPSE_CHEVRON}"`);
      expect(html).toContain(RAIL_COLLAPSE_CHEVRON_CLASS);
      expect(html).toContain(RAIL_COLLAPSE_CHEVRON_ICON_CLASS);
      expect(html).not.toContain("Expand sidebar");
      // The control sits in the foot, after the rows.
      expect(html.indexOf("data-app-rail-foot")).toBeGreaterThan(html.indexOf("data-side-nav"));
      expect(html.indexOf("Collapse sidebar")).toBeGreaterThan(html.indexOf("data-app-rail-foot"));
      expect(html).toContain("24Frame");
    }
    expect(railCollapseSrc).toContain("weight={RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT}");
    expect(railCollapseSrc).toContain("CaretDoubleLeft");
    expect(railCollapseSrc).toContain("CaretDoubleRight");
    expect(railCollapseSrc).toContain("RAIL_COLLAPSE_CHEVRON");
    expect(shellSrc).toContain("<RailCollapse collapsed={collapsed} onToggle={toggle} />");
    expect(shellSrc).not.toContain("RAIL_COLLAPSE_RL");
    expect(shellSrc).not.toMatch(/\brl-/);
    expect(shellSrc).not.toContain("AskFrameAiChromeProvider");
    expect(shellSrc).toContain("AskAssistantChromeProvider");
    expect(shellSrc).not.toContain("SocialMobileDock");
    expect(shellSrc).toContain('workspace === "social" && !settingsPage');
    expect(shellSrc).toContain('workspace === "education"');
    expect(shellSrc).not.toContain("PanelLeftOpen");
    expect(shellSrc).not.toContain("PanelLeftClose");
    expect(shellSrc).not.toContain("PanelLeft");
    expect(shellSrc).not.toContain("collapsed={false}");
  });

  it("shows the shared full wordmark in expanded, collapsed, settings, and Social rails", () => {
    navigation.pathname = "/";
    const expanded = renderShell();
    expect(expanded).toContain("data-brand-emblem");
    expect(expanded).toContain("data-brand-logo");
    expect(expanded).toContain(BRAND_LOGO_LIGHT_SRC);
    expect(expanded).toContain(BRAND_LOGO_DARK_SRC);
    expect(expanded).toContain('aria-label="24Frame"');
    expect(expanded).toContain('href="/aggregation/dashboard"');
    expect(expanded).not.toContain("data-brand-emblem-mark");
    expect(expanded).not.toContain("t-body font-medium text-ink");
    expect(shellSrc).not.toContain("24frame-wordmark");
    expect(shellSrc).not.toContain("BrandWordmark");

    const collapsed = renderShell(undefined, undefined, true);
    expect(collapsed).toContain("data-brand-emblem");
    expect(collapsed).toContain('aria-label="24Frame"');
    expect(collapsed).toContain('href="/aggregation/dashboard"');

    navigation.pathname = "/social";
    const social = renderShell();
    expect(social).toContain("data-brand-emblem");
    expect(social).toContain('href="/social"');

    navigation.pathname = "/settings";
    const settings = renderShell();
    expect(settings).toContain("data-brand-emblem");
    expect(settings).toContain('href="/aggregation/dashboard"');
  });

  // H register: collapsed, the same 44 round control (») sits centred at
  // the foot of the 80 column.
  it("puts CaretDoubleRight at the foot of the collapsed column", () => {
    for (const path of ["/", "/social", "/education"]) {
      navigation.pathname = path;
      const html = renderShell(undefined, undefined, true);
      expect(html).toContain("Expand sidebar");
      expect(html).toContain(`title="Expand sidebar"`);
      expect(html).toContain('viewBox="0 0 256 256"');
      expect(html).toContain('fill="currentColor"');
      expect(html).not.toContain("lucide-");
      expect(html).not.toContain('stroke-width="1.33"');
      expect(html).not.toContain("data-theme-toggle");
      expect(html).toContain("data-user-menu-host");
      expect(html).toContain(`data-rail-collapse="${RAIL_COLLAPSE_CHEVRON}"`);
      expect(html).toContain(RAIL_EXPAND_CHEVRON_CLASS);
      expect(RAIL_EXPAND_CHEVRON_CLASS).toBe(RAIL_COLLAPSE_CHEVRON_CLASS);
      expect(html).toContain(RAIL_COLLAPSE_CHEVRON_ICON_CLASS);
      expect(html).not.toContain("Collapse sidebar");
      expect(html).toContain("data-rail-brand-collapsed");
      const expandIdx = html.indexOf(RAIL_EXPAND_CHEVRON_CLASS);
      const navIdx = html.indexOf("data-side-nav");
      expect(expandIdx).toBeGreaterThan(-1);
      expect(expandIdx).toBeGreaterThan(navIdx);
      const expandButton = html.slice(html.lastIndexOf("<button", expandIdx), html.indexOf("</button>", expandIdx));
      expect(expandButton).not.toContain("bg-hairline");
      expect(expandButton).not.toContain("border-hairline");
    }
  });

  it("keeps collapse off on settings and persistence on the house cookie", () => {
    expect(shellSrc).toContain("persistSidebarCollapsed");
    expect(shellSrc).toContain("migrateSidebarCollapsedCookie");
    expect(shellSrc).not.toContain("gc_sidebar_collapsed");
    expect(shellSrc).toContain("defaultCollapsed");
    expect(shellSrc).not.toContain("DestChipsSlot");
    navigation.pathname = "/settings";
    expect(renderShell(undefined, undefined, true)).not.toContain("Expand sidebar");
    expect(renderShell(undefined, undefined, true)).not.toContain(RAIL_EXPAND_CHEVRON_CLASS);
  });

  it("restores staff destinations from chrome without blocking children", () => {
    navigation.pathname = "/";
    const pending = renderToStaticMarkup(
      <AppShell chrome={new Promise(() => {})} messagesUnread={new Promise(() => {})}>
        page
      </AppShell>,
    );
    expect(pending).toContain("page");
    expect(pending).toContain("data-side-nav");
    expect(pending).not.toContain("data-gc-staff");
    expect(pending).not.toContain("data-mobile-nav-trigger");
    expect(pending).toContain("data-house-phone-bottom-nav");

    navigation.pathname = "/aggregation/dashboard";
    const aggregationStaff = renderToStaticMarkup(
      <AppShell
        isGcStaff
        chrome={fulfilledChrome({
          email: "ada@example.com",
          name: "Ada",
          photoUrl: null,
          orgs: [],
          activeOrgId: null,
          unread: Promise.resolve(0),
          activityItems: Promise.resolve([]),
          dmUnread: Promise.resolve(0),
          isGcStaff: true,
          defaultCollapsed: false,
          messagesSurface: "staff-inbox",
          defaultWorkspace: "aggregation",
        })}
        messagesUnread={Promise.resolve(0)}
      >
        page
      </AppShell>,
    );
    expect(aggregationStaff).toContain("data-gc-staff");
    expect(aggregationStaff).toContain('data-email="ada@example.com"');
    expect(aggregationStaff).toContain("page");
    expect(aggregationStaff).toContain('data-house-phone-dest="Dashboard"');
    expect(aggregationStaff).not.toContain('data-house-phone-dest="Queue"');
    expect(aggregationStaff).not.toContain('data-house-phone-dest="Ask 24Frame AI"');

    navigation.pathname = "/staff/queue";
    const staff = renderToStaticMarkup(
      <AppShell
        isGcStaff
        chrome={fulfilledChrome({
          email: "ada@example.com",
          name: "Ada",
          photoUrl: null,
          orgs: [],
          activeOrgId: null,
          unread: Promise.resolve(0),
          activityItems: Promise.resolve([]),
          dmUnread: Promise.resolve(0),
          isGcStaff: true,
          defaultCollapsed: false,
          messagesSurface: "staff-inbox",
          defaultWorkspace: "aggregation",
        })}
        messagesUnread={Promise.resolve(0)}
      >
        page
      </AppShell>,
    );
    expect(staff).toContain("data-gc-staff");
    expect(staff).toContain('data-house-phone-dest="Queue"');
    expect(staff).toContain('data-house-phone-dest="Channels"');
    expect(staff).not.toContain('data-house-phone-dest="Dashboard"');
    expect(staff).not.toContain('data-house-phone-dest="Ask 24Frame AI"');

    const chromeStaff = renderToStaticMarkup(
      <AppShell
        chrome={fulfilledChrome({
          email: "ada@example.com",
          name: "Ada",
          photoUrl: null,
          orgs: [],
          activeOrgId: null,
          unread: Promise.resolve(0),
          activityItems: Promise.resolve([]),
          dmUnread: Promise.resolve(0),
          isGcStaff: true,
          defaultCollapsed: false,
          messagesSurface: "staff-inbox",
          defaultWorkspace: "aggregation",
        })}
        messagesUnread={Promise.resolve(0)}
      >
        page
      </AppShell>,
    );
    expect(chromeStaff).toContain('data-house-phone-dest="Queue"');
    expect(chromeStaff).toContain('data-house-phone-dest="Channels"');
    expect(chromeStaff).toContain("data-gc-staff");

    expect(shellSrc).toContain("chrome={chrome}");
    expect(shellSrc).toContain("SideNavFromChrome");
    expect(shellSrc).toContain("isGcStaff={isGcStaff}");
    expect(shellSrc).toContain("ChromeCookieSync");
    expect(shellSrc).toContain("data.isGcStaff");
    expect(shellSrc).toContain("isGcStaff={data.isGcStaff}");
    expect(shellSrc).toContain("data.defaultCollapsed");
    expect(shellSrc).toContain("data.defaultWorkspace");
    expect(shellSrc).toContain("clampWorkspaceMode");
    expect(shellSrc).toContain("clampWorkspaceMode(workspaceCookie, isGcStaff)");
    const appShellFn = shellSrc.slice(
      shellSrc.indexOf("export function AppShell"),
      shellSrc.indexOf("function AccountMenuSlot"),
    );
    expect(appShellFn).not.toMatch(/\buse\(chrome\)/);
  });

  it("never paints Staff chrome for a member with a forged staff cookie", () => {
    const memberChrome = {
      email: "ada@example.com",
      name: "Ada",
      photoUrl: null,
      orgs: [],
      activeOrgId: null,
      unread: Promise.resolve(0),
      activityItems: Promise.resolve([]),
      dmUnread: Promise.resolve(0),
      isGcStaff: false,
      defaultCollapsed: false,
      messagesSurface: "access-gate" as const,
      defaultWorkspace: "staff" as const,
    };

    for (const pathname of ["/settings", "/help", "/home"]) {
      navigation.pathname = pathname;
      const html = renderToStaticMarkup(
        <AppShell
          defaultWorkspace="staff"
          chrome={fulfilledChrome(memberChrome)}
          messagesUnread={Promise.resolve(0)}
        >
          page
        </AppShell>,
      );
      expect(html, pathname).not.toContain(">Staff<");
      expect(html, pathname).not.toContain('data-workspace-switcher-segment="staff"');
      expect(html, pathname).not.toContain('data-workspace-switcher-option="staff"');
      expect(html, pathname).not.toContain('data-house-phone-dest="Queue"');
    }

    navigation.pathname = "/settings";
    const propOnly = renderToStaticMarkup(
      <AppShell defaultWorkspace="staff" messagesUnread={Promise.resolve(0)}>
        page
      </AppShell>,
    );
    expect(propOnly).not.toContain(">Staff<");
    expect(propOnly).toContain("data-workspace-waffle");
    expect(propOnly).not.toContain('data-workspace-waffle-tile="staff"');

    expect(shellSrc).toContain("clampWorkspaceMode");
    expect(shellSrc).toContain("clampWorkspaceMode(defaultWorkspace, isGcStaff)");
    expect(shellSrc).toContain("clampWorkspaceMode(workspaceCookie, isGcStaff)");
  });

  it("applies resolved chrome cookies from a Suspense slot without persisting defaults", () => {
    navigation.pathname = "/";
    const pending = renderToStaticMarkup(
      <AppShell chrome={new Promise(() => {})} messagesUnread={new Promise(() => {})}>
        page
      </AppShell>,
    );
    expect(pending).toContain("Collapse sidebar");
    expect(pending).not.toContain("Expand sidebar");
    expect(pending).toContain("data-side-nav");
    expect(pending).not.toContain("data-social-rail");

    expect(shellSrc).toContain("onCookies={applyChromeCookies}");
    expect(shellSrc).toContain("onIdentity={applyChromeIdentity}");
    expect(shellSrc).toContain("if (cookiesApplied.current) return");
    expect(shellSrc).toContain("if (!collapseTouched.current)");
    expect(shellSrc).toContain("setCollapsed(next.defaultCollapsed)");
    expect(shellSrc).toContain("setWorkspaceCookie(clampWorkspaceMode(next.defaultWorkspace, next.isGcStaff))");
    expect(shellSrc).toContain("collapseTouched.current = true");
    const applyFn = shellSrc.slice(
      shellSrc.indexOf("const applyChromeCookies"),
      shellSrc.indexOf("const cookieSync"),
    );
    expect(applyFn).toContain("if (cookiesApplied.current) return");
    expect(applyFn).toContain("if (!collapseTouched.current)");
    const syncFn = shellSrc.slice(shellSrc.indexOf("function ChromeCookieSync"));
    const syncBody = syncFn.slice(0, syncFn.indexOf("\nfunction SideNavSlot"));
    expect(syncBody).toContain("use(chrome)");
    expect(syncBody).toContain("data.defaultCollapsed");
    expect(syncBody).toContain("data.defaultWorkspace");
    expect(syncBody).toContain("onIdentity");
    expect(syncBody).toContain("data.email");
    expect(syncBody).toContain("data.photoUrl");
    expect(syncBody).not.toContain("persistSidebarCollapsed");
    expect(syncBody).not.toContain("persistWorkspaceCookie");
    const appShellFn = shellSrc.slice(
      shellSrc.indexOf("export function AppShell"),
      shellSrc.indexOf("function AccountMenuSlot"),
    );
    expect(appShellFn).not.toMatch(/\buse\(chrome\)/);
    expect(appShellFn).toContain("cookieSync");
    expect(shellSrc).toContain("One return tree");
    expect(appShellFn).not.toMatch(/if \(socialChrome\) \{\s*return/);
    expect(appShellFn.match(/<HousePhoneAppShell/g)?.length).toBe(1);
  });

  it("keeps the header photo when chrome is pending after a known session face", () => {
    rememberAccountChromeIdentity({
      email: "ada@example.com",
      name: "Ada Lovelace",
      photoUrl: ACCOUNT_PHOTO_HREF,
    });
    navigation.pathname = "/social";
    const html = renderToStaticMarkup(
      <AppShell chrome={new Promise(() => {})} messagesUnread={new Promise(() => {})}>
        destination-page
      </AppShell>,
    );
    expect(html).toContain(`data-photo="${ACCOUNT_PHOTO_HREF}"`);
    expect(html).toContain('data-email="ada@example.com"');
    expect(html).not.toContain('data-email=""');
    expect(html).toContain("destination-page");
    expect(html).toContain("data-social-workspace");
  });

  it("paints Social chrome and children before layout chrome resolves", () => {
    navigation.pathname = "/social";
    const chrome = new Promise<AppShellChrome>(() => {});
    const html = renderToStaticMarkup(
      <AppShell chrome={chrome} messagesUnread={new Promise(() => {})}>
        destination-page
      </AppShell>,
    );
    expect(html).toContain("data-social-workspace");
    expect(html).toContain("data-social-top-bar");
    expect(html).toContain("data-workspace-switcher");
    expect(html).toContain("Social");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain('data-house-phone-dest="Create"');
    expect(html).not.toContain("data-social-tab-bar");
    expect(html).toContain("destination-page");
    expect(html).toContain("data-app-social-frame");
    expect(html).toContain("data-house-lead-scroll");
    expect(html).toContain("h-dvh");
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("overflow-y-auto");
  });

  it("hides the Social shell and phone dock on a DM thread", () => {
    navigation.pathname = "/social/dms/thread-1";
    const html = renderShell();
    expect(html).toContain('data-social-dm-thread=""');
    expect(html).not.toContain("data-house-lead-chrome");
    expect(html).not.toContain("data-house-phone-bottom-nav");
    expect(html).toContain("min-h-full w-full");
    expect(html).toContain("data-app-rail");
  });

  it("hides phone Social chrome on write compose and restores it on Home", () => {
    navigation.pathname = "/social/create";
    const compose = renderShell();
    expect(compose).toContain('data-social-write-compose=""');
    expect(compose).toContain("min-h-dvh w-full");
    expect(compose).not.toContain("data-house-phone-bottom-nav");
    expect(compose).not.toContain("data-house-lead-chrome");
    expect(compose).toContain("data-app-rail");

    navigation.pathname = "/social";
    const home = renderShell();
    expect(home).not.toContain("data-social-write-compose");
    expect(home).toContain("data-house-lead-chrome");
    expect(home).toContain("data-house-phone-bottom-nav");

    navigation.pathname = "/social/live";
    const live = renderShell();
    expect(live).not.toContain("data-social-write-compose");
    expect(live).toContain("data-house-phone-bottom-nav");
  });

  it("keeps Social chrome on the DM inbox", () => {
    navigation.pathname = "/social/dms";
    const inbox = renderShell();
    expect(inbox).not.toContain("data-social-dm-thread");
    expect(inbox).not.toContain("data-social-dm-compose");
    expect(inbox).toContain("data-house-lead-chrome");
    expect(inbox).toContain("data-house-phone-bottom-nav");
  });

  it("hides the Social shell and phone dock on DM compose", () => {
    navigation.pathname = "/social/dms/new";
    const direct = renderShell();
    expect(direct).toContain('data-social-dm-compose=""');
    expect(direct).not.toContain("data-social-dm-thread");
    expect(direct).not.toContain("data-house-lead-chrome");
    expect(direct).not.toContain("data-house-phone-bottom-nav");
    expect(direct).toContain("min-h-full w-full");
    expect(direct).toContain("data-app-rail");

    navigation.pathname = "/social/dms/new/group";
    const group = renderShell();
    expect(group).toContain('data-social-dm-compose=""');
    expect(group).not.toContain("data-house-lead-chrome");
    expect(group).not.toContain("data-house-phone-bottom-nav");
    expect(group).toContain("data-app-rail");
  });

  it("keeps For You as full-bleed media, not a card on the page", () => {
    navigation.pathname = "/social";
    expect(renderShell()).not.toContain("data-social-explore-exit");

    navigation.pathname = "/social/explore";
    const html = renderShell();
    expect(html).toContain('data-social-explore-stage=""');
    expect(html).toContain("data-house-lead-chrome");
    expect(html.indexOf("data-house-lead-chrome")).toBeLessThan(html.indexOf("data-social-explore-stage"));
    const desktopHeader = html.slice(
      html.indexOf("data-social-explore-desktop-header"),
      html.indexOf("data-social-explore-stage"),
    );
    expect(desktopHeader).toContain("hidden md:contents");
    expect(desktopHeader).toContain('data-house-home=""');
    expect(desktopHeader).toContain('data-social-explore-exit=""');
    expect(desktopHeader).toContain('href="/social"');
    expect(desktopHeader).toContain(">Exit<");
    expect(desktopHeader).toContain('data-workspace-switcher-presentation="slider"');
    expect(desktopHeader).toContain("data-app-header-workspace-waffle");
    expect(desktopHeader).toContain("lg:hidden");
    // No side menu on Explore: the brand mark heads the bar (ink at 32).
    expect(desktopHeader).toContain('data-app-header-brand=""');
    expect(desktopHeader).toContain("hidden shrink-0 items-center md:inline-flex");
    expect(html).not.toContain("data-app-rail");
    expect(html).not.toContain("data-social-rail");
    expect(html).toContain("--sidebar-width:0px");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain(SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS);
    expect(html).toContain("relative overflow-hidden");
    const stage = html.slice(html.indexOf("data-social-explore-stage"), html.indexOf("data-house-phone-bottom-nav"));
    expect(stage).not.toContain("rounded-");
    expect(stage).not.toContain("border-hairline");
    expect(stage).not.toContain("bg-surface");
    expect(stage).not.toContain("shadow-");
    expect(stage).not.toContain("max-w-");
  });

  // H register: the brand mark, the switcher (the grey pill below lg,
  // the slider from lg) and Exit lead; below lg Exit keeps only its X.
  // Explore's header search shows only as the xl pill (no icon form), so
  // GC staff fit from lg (measured: 980 at 1024).
  it("fits desktop Explore from 768: brand never shrinks, Exit compacts, no search icon on Explore", () => {
    navigation.pathname = "/social/explore";
    const html = renderShell();
    const desktopHeader = html.slice(
      html.indexOf("data-social-explore-desktop-header"),
      html.indexOf("data-social-explore-stage"),
    );
    const leadAt = desktopHeader.indexOf("data-house-lead=");
    const leadTag = desktopHeader.slice(leadAt, desktopHeader.indexOf(">", leadAt));
    expect(leadTag).toContain("md:shrink-0");

    const exitAt = desktopHeader.indexOf("data-social-explore-exit");
    const exitTag = desktopHeader.slice(exitAt, desktopHeader.indexOf(">", exitAt));
    for (const token of HOUSE_HEADER_EXIT_COMPACT_CLASS.split(" ")) {
      expect(exitTag).toContain(token);
    }
    const exitLink = desktopHeader.slice(exitAt, desktopHeader.indexOf("</a>", exitAt));
    expect(exitLink).toContain(`<span class="${HOUSE_HEADER_EXIT_LABEL_CLASS}">Exit</span>`);

    expect(desktopHeader).not.toContain("data-explore-header-search");
    expect(desktopHeader).not.toContain("data-social-header-search-icon");
    // The xl pill still mounts on Explore (one search: the header's).
    expect(desktopHeader).toContain("data-social-header-search");

    navigation.pathname = "/social";
    const social = renderShell();
    expect(social).not.toContain("data-explore-header-search");
    expect(social).toContain("data-social-header-search-icon");
  });

  it("hides the Social shell on an open story", () => {
    navigation.pathname = "/social/stories/story-1";
    const html = renderShell();
    expect(html).toContain('data-social-story-open=""');
    expect(html).toContain("data-social-workspace");
    expect(html).not.toContain("data-house-lead-chrome");
    expect(html).not.toContain("data-social-rail");
    expect(html).not.toContain("data-app-rail");
    expect(html).not.toContain("data-house-phone-bottom-nav");
    expect(html).toContain("min-h-full w-full");
  });

  it("drops the Social dest-rail on the create-story stage and keeps the house lead", () => {
    navigation.pathname = "/social/stories/new";
    const html = renderShell();
    expect(html).toContain("data-social-workspace");
    expect(html).toContain("data-house-lead");
    expect(html).toContain("data-social-header-search");
    expect(html).not.toContain("data-social-rail");
    expect(html).not.toContain("data-app-rail");
    expect(html).toContain("--sidebar-width:0px");
    expect(html).toContain("flex min-h-full w-full flex-col");
    expect(html).not.toContain("data-house-phone-bottom-nav");
  });

  it("paints one dest-rail width on every workspace that shows the rail", () => {
    const railWidth = RAIL_WIDTH_CLASS;
    for (const path of [
      "/aggregation/titles",
      "/education",
      "/social",
      "/staff/queue",
      "/settings",
    ]) {
      navigation.pathname = path;
      const html = renderShell();
      const aside = html.slice(html.indexOf("<aside"), html.indexOf("</aside>"));
      expect(aside, path).toContain(railWidth);
      expect(aside, path).not.toContain("calc(200px");
      expect(html, path).toContain("margin-left:var(--sidebar-width)");
      expect(html, path).not.toContain("md:ml-[200px]");
    }
    navigation.pathname = "/co-productions";
    const coProductions = renderShell();
    expect(coProductions).not.toContain("data-app-rail");
    expect(coProductions).toContain("--sidebar-width:0px");
  });

  it("adds Social X-lane chrome on the shared house rail collapse", () => {
    navigation.pathname = "/social";
    const html = renderShell(undefined, "Ada Lovelace");
    expect(html).toContain("data-social-workspace");
    expect(html).toContain("data-social-top-bar");
    expect(html).toContain("data-social-header-search");
    expect(html).not.toContain("data-social-rail-create");
    expect(html).not.toContain("Destinations");
    expect(html).not.toContain("data-social-rail-account");
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain('data-house-phone-dest="Create"');
    expect(html).not.toContain("data-social-mobile-pill");
    expect(html).not.toContain("data-social-create-fab");
    expect(html).not.toContain("data-social-mobile-dock");
    expect(html).not.toContain("data-social-tab-bar");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).not.toContain("data-social-header-tray");
    expect(html).toContain(`data-rail-collapse="${RAIL_COLLAPSE_CHEVRON}"`);
    expect(html).toContain("Collapse sidebar");
    expect(html).not.toContain("data-mobile-nav-trigger");
    expect(html).toContain("data-brand-emblem");
    expect(html).toContain("data-brand-logo");
    expect(html).toContain('data-brand-logo-mark="emblem"');
    expect(html).not.toMatch(/data-house-lead=""[^>]*[\s"]hidden(?:\s|")/);
    expect(html).toContain("24Frame");
    expect(shellSrc).toContain("AskAssistantChromeProvider");
    expect(shellSrc).toContain("<RailCollapse collapsed={collapsed} onToggle={toggle} />");
    expect(shellSrc).toContain("persistSidebarCollapsed");
    expect(shellSrc).toContain("RAIL_COLLAPSE_WIDTH_VAR");
    expect(shellSrc).not.toContain("AskFrameAiChromeProvider");
    expect(shellSrc).not.toContain("RAIL_COLLAPSE_RL");
  });

  it("collapses the Social rail to icon-only nav and follows collapsed width vars", () => {
    navigation.pathname = "/social";
    const html = renderShell(undefined, "Ada Lovelace", true);
    expect(html).toContain("data-social-workspace");
    expect(html).toContain("data-social-rail");
    expect(html).not.toContain("data-social-rail-account");
    expect(html).toContain("data-collapsed");
    expect(html).toContain("Expand sidebar");
    expect(html).toContain(`data-rail-collapse="${RAIL_COLLAPSE_CHEVRON}"`);
    expect(html).toContain(RAIL_EXPAND_CHEVRON_CLASS);
    expect(html).toContain("--sidebar-width:var(--sidebar-width-collapsed)");
    expect(html).toContain("margin-left:var(--sidebar-width)");
    expect(html).not.toContain("md:ml-[200px]");
    expect(html).toContain("data-app-social-frame");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).not.toContain("data-social-tab-bar");
    expect(html).not.toContain("data-mobile-nav-trigger");
  });

  it("uses house chrome on Education routes — no Social feed chrome", () => {
    navigation.pathname = "/education";
    const html = renderShell();
    expect(html).toContain("data-education-workspace");
    expect(html).toContain('data-workspace="education"');
    expect(html).toContain("data-workspace-switcher");
    expect(html).toContain("data-workspace-waffle");
    expect(html).toContain('data-workspace-switcher-segment="education"');
    expect(html).toContain('data-workspace-switcher-segment="home"');
    expect(html).toContain('data-education-header-search-host="phone"');
    expect(html).toContain('data-education-header-search-host="desktop"');
    expect(html).toContain("data-education-header-search");
    expect(html).toContain("data-app-header-brand-search");
    expect(html).toContain("data-house-under-nav");
    expect(html.indexOf("data-brand-emblem")).toBeLessThan(
      html.indexOf('data-education-header-search-host="desktop"'),
    );
    // The grid button leads now (after the emblem), before the trailing search.
    expect(html.indexOf('data-workspace-switcher-presentation="waffle"')).toBeLessThan(
      html.indexOf('data-education-header-search-host="desktop"'),
    );
    expect(html.indexOf("data-house-lead-chrome")).toBeLessThan(
      html.indexOf("data-house-under-nav"),
    );
    expect(html.indexOf("data-app-header-trailing")).toBeLessThan(
      html.indexOf('data-education-header-search-host="phone"'),
    );
    expect(html.indexOf('data-workspace-switcher-presentation="waffle"')).toBeLessThan(
      html.indexOf("data-user-menu-host"),
    );
    expect(html).toContain("data-app-header");
    expect(html).not.toContain("data-mobile-nav-trigger");
    expect(html).toContain("data-house-phone-bottom-nav");
    expect(html).toContain('data-house-phone-dest="Education"');
    expect(html).toContain("data-brand-emblem");
    expect(html).toContain("data-brand-logo");
    expect(html).toContain('data-brand-logo-mark="emblem"');
    expect(html.indexOf("data-brand-emblem")).toBeLessThan(
      html.indexOf("data-house-phone-bottom-nav"),
    );
    expect(html.indexOf("data-house-phone-bottom-nav")).toBeGreaterThan(
      html.indexOf("data-app-header-trailing"),
    );
    expect(html).not.toMatch(/data-house-lead=""[^>]*[\s"]hidden(?:\s|")/);
    expect(html).toContain('href="/education"');
    expect(html).not.toContain("data-social-workspace");
    expect(html).not.toContain("data-social-top-bar");
    expect(html).not.toContain("data-social-tab-bar");
    expect(html).not.toContain("data-social-rail");
    expect(html).not.toContain('data-social-tab-item="Create"');

    navigation.pathname = "/education/welcome-to-24frame";
    const detail = renderShell();
    expect(detail).toContain("data-education-workspace");
    expect(detail).toContain('data-workspace="education"');
    expect(detail).toContain("data-app-header");
    expect(detail).not.toContain("data-social-workspace");
  });
});
