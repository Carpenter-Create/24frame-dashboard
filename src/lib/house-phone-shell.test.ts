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
  HOUSE_ASK_AI_MARK_CLASS,
  HOUSE_ASK_AI_MARK_INK_CLASS,
  HOUSE_HEADER_ROUND_GLYPH_CLASS,
  HOUSE_HEADER_TRAILING_ICON_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV,
  HOUSE_PHONE_BOTTOM_NAV_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT,
  HOUSE_PHONE_CHROME_ICON_CLASS,
  HOUSE_PHONE_CHROME_ICON_WEIGHT,
  HOUSE_PHONE_CHROME_IDLE_INK_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_WEIGHT,
  HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS,
  HOUSE_PHONE_DEST_CHIPS,
  HOUSE_PHONE_WORKSPACE_TABS,
  SOCIAL_PHONE_DESTS,
  housePhoneDestActiveIndex,
  housePhoneDestinations,
  housePhoneDockDestinations,
  housePhoneDestGlyph,
  housePhonePrefetchDestHrefs,
  housePhoneShowsBottomDests,
  housePhoneWorkspaceSelected,
} from "@/lib/house-phone-shell";
import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import {
  HOUSE_HEADER_TRAILING_HIT_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import { HOUSE_SHELL_QUIET_INK_CLASS } from "@/lib/house-shell";
import { PHOSPHOR_CHROME_ICON_CLASS } from "@/lib/phosphor-icon";
import { SOCIAL_ROUTES } from "@/lib/social";
import {
  APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS,
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
} from "@/lib/workspace-switcher";

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
  // Phone workspace band (Adam 2026-10-08, shell-phone-workspace-band-lock-v1):
  // the band on phone, the grey pill from md to lg, the slider from lg.
  it("shows the workspace band on phone, the grey pill from md to lg, and the slider from lg", () => {
    expect(leadSrc).toContain("<WorkspaceSwitcher");
    expect(leadSrc).not.toContain("data-app-header-workspace-pill");
    expect(leadSrc).not.toContain('tone="pill"');
    expect(leadSrc).toContain('presentation="slider"');
    expect(leadSrc).toContain('presentation="waffle"');
    expect(leadSrc).toContain("data-app-header-workspace-desktop");
    expect(leadSrc).toContain("APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS");
    expect(leadSrc).toContain("APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS");
    expect(leadSrc).toContain('presentation="band"');
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(3);
    expect(APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS.split(" ")).toEqual(
      expect.arrayContaining(["hidden", "md:block", "lg:hidden"]),
    );

    const aggregation = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "aggregation",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    expect(aggregation).toContain("data-workspace-waffle");
    expect(aggregation).toContain('data-workspace-switcher-presentation="band"');
    expect(aggregation.indexOf("data-workspace-band")).toBeLessThan(
      aggregation.indexOf("data-house-lead-chrome"),
    );
    expect(aggregation).toContain('data-workspace-switcher-presentation="waffle"');
    expect(aggregation).toContain('data-workspace-switcher-presentation="slider"');
    expect(aggregation).not.toContain("data-app-header-workspace-pill");
    expect(aggregation).toContain("data-app-header-workspace-desktop");
    expect(aggregation).toContain(APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS);

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

  // Screening chrome (Adam 2026-10-04): the grid button sits right
  // after the emblem and names the workspace; trailing is search
  // (Social) · Ask · bell · account.
  it("keeps the emblem on the left, then the named grid button, and kills the hamburger on every workspace", () => {
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
      expect(lead).toContain("data-workspace-waffle");
      expect(lead.indexOf("data-brand-emblem")).toBeLessThan(lead.indexOf("data-workspace-waffle"));
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
        html.indexOf("data-workspace-waffle"),
      );
      expect(html.indexOf("data-workspace-waffle")).toBeLessThan(
        html.indexOf("data-ask-assistant-header"),
      );
      expect(html.indexOf("data-ask-assistant-header")).toBeLessThan(
        html.indexOf("data-activity-bell"),
      );
      expect(html.indexOf("data-activity-bell")).toBeLessThan(
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
    // One pb-[max(...)]: house-phone-dock reads the float from this class.
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toBe(
      "fixed inset-x-0 bottom-0 z-40 flex justify-center px-[var(--space-4)] pb-[max(16px,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out md:hidden",
    );
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("md:hidden");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("z-40");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("env(safe-area-inset-bottom)");
    // The pill floats 16 off the bottom (the board); safe area replaces it.
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("pb-[max(16px,env(safe-area-inset-bottom))]");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("rounded-full");
    // Coinbase register: the pill is 56 with no hairline; the soft float stays.
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("h-14");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).not.toContain("h-12");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).not.toMatch(/(?:^|\s)border/);
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

  // Coinbase register: the dock glyph stays 24; the header round-button
  // glyph is 20 on phone and desktop — two separate literals.
  it("keeps dock glyphs at 24 and header glyphs at 20 — separate literals", () => {
    expect(HOUSE_PHONE_CHROME_ICON_CLASS).toBe("size-6 shrink-0");
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS).toBe(HOUSE_PHONE_CHROME_ICON_CLASS);
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS).not.toBe(PHOSPHOR_CHROME_ICON_CLASS);
    expect(HOUSE_PHONE_CHROME_ICON_WEIGHT).toBe("regular");
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT).toBe(HOUSE_PHONE_CHROME_ICON_WEIGHT);
    // The current dest is the filled glyph (the board), not Bold.
    expect(HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT).toBe("fill");
    // Create: a 22 Bold plus (the board's stroke 2.25) in the 44 circle.
    expect(HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS).toBe("size-[22px] shrink-0");
    expect(HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_WEIGHT).toBe("bold");
    expect(HOUSE_HEADER_ROUND_GLYPH_CLASS).toBe("size-5 shrink-0");
    expect(HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS).toBe(HOUSE_HEADER_ROUND_GLYPH_CLASS);
    expect(HOUSE_HEADER_ROUND_GLYPH_CLASS).not.toBe(HOUSE_PHONE_CHROME_ICON_CLASS);
    expect(phoneShellSrc).toMatch(
      /export const HOUSE_PHONE_CHROME_ICON_CLASS = "size-6 shrink-0";/,
    );
    expect(phoneShellSrc).toMatch(
      /export const HOUSE_HEADER_ROUND_GLYPH_CLASS = "size-5 shrink-0";/,
    );
    expect(phoneShellSrc).not.toContain(
      "HOUSE_PHONE_CHROME_ICON_CLASS = HOUSE_HEADER_ROUND_GLYPH_CLASS",
    );
    expect(HOUSE_HEADER_ROUND_GLYPH_CLASS).not.toBe(PHOSPHOR_CHROME_ICON_CLASS);
    expect(HOUSE_HEADER_TRAILING_ICON_CLASS).toBe("size-5 shrink-0");
    // The screening chrome's split phone 20 / desktop 18 glyphs are gone.
    expect(phoneShellSrc).not.toContain("HOUSE_HEADER_TRAILING_DESKTOP_CLASS");
    expect(phoneShellSrc).not.toContain("HOUSE_HEADER_TRAILING_PHONE_CLASS");
    expect(phoneShellSrc).not.toContain("size-4.5");
    expect(bottomNavSrc).toContain("HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS");
    expect(bottomNavSrc).not.toContain("HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS");
    expect(bottomNavSrc).not.toContain("size-5");
    expect(bottomNavSrc).not.toContain("size-4");
    expect(phoneShellSrc).not.toContain('"size-7 shrink-0"');
    expect(phoneShellSrc).toContain('"size-6 shrink-0"');
    expect(phoneShellSrc).not.toContain('"size-4 shrink-0"');
    expect(phoneShellSrc.match(/"size-\d shrink-0"/g) ?? []).toEqual([
      '"size-6 shrink-0"',
      '"size-5 shrink-0"',
      '"size-5 shrink-0"',
    ]);
    expect(bottomNavSrc).toContain("aria-label={unread ? socialMessagesNavLabel(item.label, messagesUnread) : item.label}");
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
    for (const label of ["Dashboard", "Titles", "Recent activity", "Reports"]) {
      expect(html).toContain(`aria-label="${label}"`);
      expect(html).not.toContain(`>${label}<`);
    }
    expect(html).toContain('aria-label="Aggregation"');
  });

  it("uses the 20px round-button glyph for AI + bell + search on phone and desktop", () => {
    // Ask is the round grey 44 with one accent sparkle (Adam 2026-10-04,
    // "Blue, as in the mockup"; founder 2026-10-05, decision 1). Bell and
    // search take the button's ink.
    expect(askHeaderSrc).toContain("HOUSE_ASK_AI_MARK_CLASS");
    expect(askHeaderSrc).not.toContain("HOUSE_ASK_AI_MARK_PHONE_CLASS");
    expect(askHeaderSrc).not.toContain("HOUSE_ASK_AI_MARK_DESKTOP_CLASS");
    expect(HOUSE_ASK_AI_MARK_INK_CLASS).toBe("text-accent");
    expect(HOUSE_ASK_AI_MARK_CLASS).toBe(`${HOUSE_HEADER_ROUND_GLYPH_CLASS} ${HOUSE_ASK_AI_MARK_INK_CLASS}`);
    expect(HOUSE_ASK_AI_MARK_CLASS).not.toContain(HOUSE_PHONE_CHROME_IDLE_INK_CLASS);
    expect(bellSrc).toContain("HOUSE_HEADER_ROUND_GLYPH_CLASS");
    expect(searchSheetSrc).toContain("HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS");
    expect(searchSheetSrc).not.toContain("HOUSE_PHONE_CHROME_ICON_CLASS");
    expect(accountSheetSrc).toContain("HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS");
    expect(accountSheetSrc).toContain("faceClassName={HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS}");
    expect(accountSheetSrc).toContain("HOUSE_HEADER_DESKTOP_AVATAR_CLASS");
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("md:size-[var(--header-desktop-control-size)]");

    const lead = renderLead("social");
    const trailing = lead.slice(
      lead.indexOf("data-app-header-trailing"),
      lead.indexOf("</header>"),
    );
    expect(trailing).toContain("data-ask-assistant-header");
    expect(trailing).toContain("data-activity-bell");
    expect(trailing).toContain("size-5");
    expect(trailing).not.toContain("size-4.5");
    expect(trailing).not.toContain("size-6");
    expect(trailing).not.toContain("size-7");
    const askAt = trailing.indexOf("data-ask-assistant-header");
    const ask = trailing.slice(askAt, trailing.indexOf("</button>", askAt));
    expect(ask).toContain(`class="${HOUSE_ASK_AI_MARK_CLASS}"`);
    expect(ask.match(/<svg/g)?.length).toBe(1);
    const bell = trailing.slice(trailing.indexOf("data-activity-bell"));
    expect(bell).toContain(`class="${HOUSE_HEADER_ROUND_GLYPH_CLASS}"`);
    expect(bell.slice(0, bell.indexOf("</button>"))).not.toContain(HOUSE_ASK_AI_MARK_INK_CLASS);
    // Idle dock glyphs stay the quiet ink; header buttons carry ink on
    // the muted circle.
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS).toBe(HOUSE_SHELL_QUIET_INK_CLASS);
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS).not.toBe(HOUSE_PHONE_CHROME_IDLE_INK_CLASS);
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain("bg-surface-muted text-ink");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("text-ink-3");
  });

  // Coinbase register (Adam 2026-10-05, supersedes the screening chrome's
  // ink dot): every dock (Home, Aggregation, Social, Education, Staff)
  // marks the current dest with the FILLED glyph painted accent — no dot,
  // no chip. The filled shape is the non-colour cue. Create (and its
  // ring) stays Social-only: a 44 accent circle, never the current mark.
  it("marks the current glyph filled and accent on the sliding pill in every dock — no dot; Social rings an active Create", () => {
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS).toBe("text-accent");
    expect(phoneShellSrc).not.toContain("HOUSE_PHONE_BOTTOM_NAV_MARK_CLASS");
    expect(bottomNavSrc).not.toContain("data-house-phone-bottom-nav-mark");
    // Every target fills the pill's 56 row (≥ 44). The row is the dock's
    // SegmentedTrack; each dest is the press group
    // (shell-phone-nav-motion-lock-v1).
    expect(HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS).toBe("relative flex h-full w-full items-center");
    expect(HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS).toBe(
      "relative flex h-full min-w-0 flex-1 items-center justify-center group/nav",
    );
    expect(HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS).toBe(
      "flex size-11 items-center justify-center rounded-full bg-accent text-accent-contrast",
    );
    expect(HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS).toBe(
      "ring-2 ring-accent ring-offset-1 ring-offset-surface",
    );
    // The per-workspace scoping and the old static chip are gone, not
    // parked. The current dest's pill is the track's sliding thumb.
    expect(phoneShellSrc).not.toContain("housePhoneDockActiveStyle");
    expect(phoneShellSrc).not.toContain("HOUSE_PHONE_BOTTOM_NAV_CHIP_CLASS");
    expect(bottomNavSrc).not.toContain("housePhoneDockActiveStyle");
    expect(bottomNavSrc).not.toContain("data-house-phone-bottom-nav-chip");

    const dockItems = [
      ...housePhoneDockDestinations({ isGcStaff: true, workspace: "aggregation" }),
      ...housePhoneDockDestinations({ isGcStaff: true, workspace: "aggregation", homeOwned: true }),
      ...housePhoneDockDestinations({ isGcStaff: true, workspace: "education" }),
      ...housePhoneDockDestinations({ isGcStaff: true, workspace: "staff" }),
      ...housePhoneDockDestinations({ isGcStaff: false, workspace: "social" }),
    ];
    // The glyph's paths for a weight (Phosphor paths differ by weight).
    const paths = (svg: string) => svg.slice(svg.indexOf(">") + 1, svg.lastIndexOf("</svg>"));
    function glyphHtml(label: string, weight: "fill" | "regular") {
      const item = [...dockItems].find((row) => row.label === label);
      expect(item, label).toBeDefined();
      const Glyph = housePhoneDestGlyph(item!);
      return paths(renderToStaticMarkup(createElement(Glyph, { className: HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS, weight })));
    }
    // Both weights are drawn and crossfade; the shown one is opacity-100.
    function shownGlyph(slot: string) {
      const svgs = [...slot.matchAll(/<svg[^>]*class="([^"]*)"[^>]*>[\s\S]*?<\/svg>/g)];
      expect(svgs).toHaveLength(2);
      const shown = svgs.filter((svg) => (svg[1] ?? "").split(" ").includes("opacity-100"));
      expect(shown).toHaveLength(1);
      return paths(shown[0]![0]);
    }
    function expectMarkedDock(html: string, activeDest: string, idleDest: string) {
      expect(html).not.toContain("data-house-phone-bottom-nav-chip");
      expect(html).not.toContain("data-house-phone-bottom-nav-mark");
      // One sliding pill: the track's thumb.
      expect(html.match(/data-segmented-thumb=""/g)?.length).toBe(1);
      // React escapes the ' in after:content-[''].
      expect(html).toContain(`class="${HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS.replaceAll("'", "&#x27;")}"`);
      expect(html.match(/data-house-phone-bottom-nav-item-active=""/g)?.length).toBe(1);
      expect(html.match(/aria-current="page"/g)?.length).toBe(1);
      const destAt = (label: string) => html.indexOf(`data-house-phone-dest="${label}"`);
      const on = html.slice(html.lastIndexOf("<a ", destAt(activeDest)), html.indexOf("</a>", destAt(activeDest)));
      expect(on).toContain('aria-current="page"');
      expect(on).toContain(`class="${HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS} ${HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS}"`);
      expect(on).toContain("size-6");
      // The current glyph shows Fill; idle shows Regular.
      expect(shownGlyph(on)).toBe(glyphHtml(activeDest, "fill"));
      const off = html.slice(html.lastIndexOf("<a ", destAt(idleDest)), html.indexOf("</a>", destAt(idleDest)));
      expect(off).not.toContain('aria-current="page"');
      expect(off).toContain(`class="${HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS} ${HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS}"`);
      expect(shownGlyph(off)).toBe(glyphHtml(idleDest, "regular"));
      expect(off).not.toContain("text-accent");
      // Create is Social-only.
      expect(html).not.toContain("data-house-phone-bottom-nav-create");
      expect(html).not.toContain("data-house-phone-dest-create");
    }

    navigation.pathname = "/aggregation/dashboard";
    const aggregation = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation" }),
    );
    expectMarkedDock(aggregation, "Dashboard", "Titles");

    navigation.pathname = "/home";
    const home = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "aggregation", homeOwned: true }),
    );
    expectMarkedDock(home, "Home", "Industry news");

    navigation.pathname = "/education/manage";
    const education = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "education", isGcStaff: true }),
    );
    expectMarkedDock(education, "Manage courses", "Education");

    navigation.pathname = "/staff/queue";
    const staff = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "staff", isGcStaff: true }),
    );
    expectMarkedDock(staff, "Queue", "Channels");

    navigation.pathname = "/social/explore";
    const social = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(social).not.toContain("data-house-phone-bottom-nav-chip");
    expect(social).not.toContain("data-house-phone-bottom-nav-mark");
    const explore = social.slice(
      social.indexOf('data-house-phone-dest="Explore"'),
      social.indexOf("</a>", social.indexOf('data-house-phone-dest="Explore"')),
    );
    expect(explore).toContain(HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS);
    expect(explore).toContain(glyphHtml("Explore", "fill"));
    const feed = social.slice(
      social.indexOf('data-house-phone-dest="Feed"'),
      social.indexOf("</a>", social.indexOf('data-house-phone-dest="Feed"')),
    );
    expect(feed).toContain(glyphHtml("Feed", "regular"));
    const createAt = social.indexOf("data-house-phone-dest-create");
    const createTag = social.slice(social.lastIndexOf("<button", createAt), social.indexOf("</button>", createAt));
    expect(createTag).toContain('data-house-phone-bottom-nav-create=""');
    expect(createTag).toContain(`class="${HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS}"`);
    expect(createTag).toContain(`class="${HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS}"`);
    expect(createTag).not.toContain("ring-2");
    // Create is the dock's only accent fill.
    expect(social.match(/bg-accent/g)?.length).toBe(1);
    // The trigger itself takes no ON/OFF ink — accent on accent would erase the glyph.
    const triggerClass = createTag.match(/<button[^>]*class="([^"]*)"/)?.[1] ?? "";
    expect(triggerClass).toBe(HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS);
    expect(social.match(/data-house-phone-bottom-nav-create=""/g)?.length).toBe(1);
    expect(social.match(/data-house-phone-bottom-nav-item-active=""/g)?.length).toBe(1);

    navigation.pathname = "/social/live";
    const live = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social" }),
    );
    expect(live).toContain("data-house-phone-bottom-nav");
    const liveAt = live.indexOf("data-house-phone-dest-create");
    const liveTag = live.slice(live.lastIndexOf("<button", liveAt), live.indexOf("</button>", liveAt));
    expect(liveTag).toContain('aria-current="page"');
    expect(liveTag).toContain(
      `class="${HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS} ${HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS}"`,
    );
    expect(liveTag.match(/<button[^>]*class="([^"]*)"/)?.[1]).toBe(HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS);
  });

  it("dots Messages in the dock when DMs are unread — 8 accent with a 2px dock ring; nothing at zero", () => {
    expect(HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS).toBe(
      "pointer-events-none absolute -right-[3px] -top-0.5 size-3 rounded-full border-2 border-surface bg-accent",
    );
    navigation.pathname = "/social";
    const idle = renderToStaticMarkup(createElement(HousePhoneBottomNav, { workspace: "social" }));
    expect(idle).not.toContain("data-house-phone-bottom-nav-unread");
    expect(idle).toContain('aria-label="Messages"');
    const html = renderToStaticMarkup(
      createElement(HousePhoneBottomNav, { workspace: "social", messagesUnread: 3 }),
    );
    expect(html.match(/data-house-phone-bottom-nav-unread=""/g)?.length).toBe(1);
    const at = html.indexOf('data-house-phone-dest="Messages"');
    const messages = html.slice(html.lastIndexOf("<a ", at), html.indexOf("</a>", at));
    expect(messages).toContain('aria-label="Messages, 3 unread"');
    expect(messages).toContain(`class="${HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS}"`);
    // Other docks have no Messages dest, so no dot.
    navigation.pathname = "/aggregation/dashboard";
    expect(
      renderToStaticMarkup(createElement(HousePhoneBottomNav, { workspace: "aggregation", messagesUnread: 3 })),
    ).not.toContain("data-house-phone-bottom-nav-unread");
  });

  it("hides the shared phone bottom bar with social-tab-bar-scroll", () => {
    // One tracker for the dock and the workspace band (lock §5): the
    // shell owns it, the dock reads it.
    const tuckLib = readFileSync("src/lib/house-phone-chrome.ts", "utf8");
    expect(tuckLib).toContain('from "./social-tab-bar-scroll"');
    expect(tuckLib).toContain("stepSocialTabBarScroll(tracker, y)");
    expect(phoneAppShellSrc).toContain("useHousePhoneChromeTracker(rootRef, pathname)");
    expect(phoneAppShellSrc).toContain("<HousePhoneChromeContext.Provider value={phoneChrome}>");
    expect(bottomNavSrc).toContain("const { dockHidden: hidden } = useHousePhoneChrome();");
    expect(bottomNavSrc).not.toContain("addEventListener(\"scroll\"");
    expect(phoneAppShellSrc).toContain("HousePhoneBottomNav");
    expect(HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS).toBe("pointer-events-none translate-y-full");

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
      ASK_FRAME_AI.headline,
    );
    expect(housePhoneDestinations(false, "education").map((item) => item.label)).toEqual([
      "Education",
    ]);
    expect(housePhoneDestinations(true, "education").map((item) => item.label)).toEqual([
      "Education",
      "Manage courses",
    ]);
    expect(SOCIAL_PHONE_DESTS.map((item) => item.label)).toEqual([
      "Feed",
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
      "Feed",
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
    expect(aggregation).not.toContain(ASK_FRAME_AI.headline);

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
    expect(social).toContain('data-house-phone-dest="Feed"');
    expect(social).toContain('data-house-phone-dest="Explore"');
    expect(social).toContain('data-house-phone-dest="Create"');
    expect(social).toContain('data-house-phone-dest="Messages"');
    expect(social).toContain('data-house-phone-dest="Profile"');
    expect(social).not.toContain('data-house-phone-dest="Home"');
    expect(social.indexOf('data-house-phone-dest="Feed"')).toBeLessThan(
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
      /<a[^>]+href="\/social"[^>]*aria-current="page"[^>]*data-house-phone-dest="Feed"/,
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
    expect(home).toContain('data-workspace-switcher-presentation="slider"');
    expect(home).toContain(APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS);
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
    expect(social).toContain('data-house-phone-dest="Feed"');
    expect(social).toContain('data-house-phone-dest="Explore"');
    expect(social).toContain('data-house-phone-dest="Create"');
    expect(social).toContain('data-house-phone-dest="Messages"');
    expect(social).toContain('data-house-phone-dest="Profile"');
    expect(social).not.toContain('data-house-phone-dest="Home"');
    expect(social.indexOf('data-house-phone-dest="Feed"')).toBeLessThan(
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
