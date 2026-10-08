import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

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

import { availableWorkspaceOptions } from "@/lib/workspace-menu";
import {
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_ABSENT,
  WORKSPACE_SWITCHER_HEADER_CLASS,
  WORKSPACE_WAFFLE_FORBIDDEN_LABELS,
  WORKSPACE_WAFFLE_HOME_CHECK_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_IDLE_CLASS,
  WORKSPACE_WAFFLE_HOME_ICON_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_ON_CLASS,
  WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_BARE_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_NAME_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS,
  workspaceSwitcherSegmentTabIndex,
  workspaceWaffleTiles,
  WORKSPACE_BAND_CLASS,
  WORKSPACE_BAND_PILL_CLASS,
  WORKSPACE_BAND_PILL_CURRENT_CLASS,
  WORKSPACE_BAND_ROW_CLASS,
  WORKSPACE_BAND_FOLD_OPEN_CLASS,
  WORKSPACE_BAND_FOLD_TUCKED_CLASS,
} from "@/lib/workspace-switcher";
import { HOUSE_LEAD_GRIP_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS } from "@/lib/house-phone-shell";
import { HouseLeadChrome } from "./house-lead-chrome";
import { HousePhoneBottomNav } from "./house-phone-bottom-nav";
import { HousePhoneChromeContext } from "./house-phone-chrome-state";
import { WorkspaceSwitcher } from "./workspace-switcher";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "workspace-switcher.tsx"), "utf8");
const lanes = readFileSync(join(here, "../../lib/workspace-switcher.ts"), "utf8");
const shellSrc = readFileSync(join(here, "app-shell.tsx"), "utf8");
const leadSrc = readFileSync(join(here, "house-lead-chrome.tsx"), "utf8");
const sheetSrc = readFileSync(join(here, "account-sheet.tsx"), "utf8");
const userMenuSrc = readFileSync(join(here, "../../lib/user-menu.ts"), "utf8");

function tileIds(html: string): string[] {
  return [...html.matchAll(/data-workspace-waffle-tile="([^"]+)"/g)].map((row) => row[1] ?? "");
}

function homeExit(html: string): string {
  const marker = 'data-workspace-waffle-home=""';
  const start = html.indexOf(marker);
  const tagStart = html.lastIndexOf("<", start);
  const closer = html.startsWith("<button", tagStart) ? "</button>" : "</a>";
  const end = html.indexOf(closer, tagStart);
  return html.slice(tagStart, end + closer.length);
}

describe("workspace waffle header control", () => {
  // Coinbase register (Adam 2026-10-05): the grey workspace pill names
  // the current workspace — the segment the desktop slider lights — and
  // is the grid alone where none is lit. No chevron, no accent.
  it("is the grey workspace pill with the current workspace's name — no chevron", () => {
    try {
      for (const [path, current, name] of [
        ["/aggregation/dashboard", "aggregation", "Aggregation"],
        ["/social", "social", "Social"],
        ["/education", "education", "Education"],
        ["/home", "social", "Home"],
        ["/home/news", "aggregation", "Home"],
      ] as const) {
        navigation.pathname = path;
        const html = renderToStaticMarkup(<WorkspaceSwitcher current={current} />);
        expect(html, path).toContain(
          `<span aria-hidden="true" data-workspace-waffle-name="" class="${WORKSPACE_WAFFLE_TRIGGER_NAME_CLASS}">${name}</span>`,
        );
        expect(html, path).toContain(`aria-label="${name}, ${WORKSPACE_SWITCHER.heading}"`);
      }
      // Staff is not a lane (staff-account-menu-lock-v1): on a Staff page
      // the pill names no workspace — the grid alone, as on Settings.
      navigation.pathname = "/staff/queue";
      const staff = renderToStaticMarkup(<WorkspaceSwitcher current="staff" isGcStaff />);
      expect(staff).not.toContain("data-workspace-waffle-name");
      expect(staff).not.toContain(">Staff<");
      expect(staff).toContain(`aria-label="${WORKSPACE_SWITCHER.heading}"`);
      for (const path of ["/settings", "/activity", "/help", "/co-productions"]) {
        navigation.pathname = path;
        const html = renderToStaticMarkup(<WorkspaceSwitcher current="social" />);
        expect(html, path).not.toContain("data-workspace-waffle-name");
        expect(html, path).toContain(`aria-label="${WORKSPACE_SWITCHER.heading}"`);
        // Nameless: the 44 circle.
        expect(html, path).toContain(WORKSPACE_WAFFLE_TRIGGER_BARE_CLASS);
      }
    } finally {
      navigation.pathname = "/";
    }
    navigation.pathname = "/aggregation/dashboard";
    const html = renderToStaticMarkup(<WorkspaceSwitcher current="aggregation" />);
    navigation.pathname = "/";
    expect(html).toContain("data-workspace-switcher");
    expect(html).toContain('data-workspace-switcher-presentation="waffle"');
    expect(html).toContain("data-workspace-waffle");
    expect(html).toContain(WORKSPACE_WAFFLE_TRIGGER_CLASS);
    expect(html).toContain("rounded-full bg-surface-muted");
    expect(html).not.toContain("data-workspace-switcher-current");
    expect(html).not.toContain("data-workspace-switcher-chevron");
    expect(html).not.toContain("data-workspace-switcher-slider");
    expect(html).not.toContain('data-workspace-switcher-tone="pill"');
    expect(html).not.toContain("bg-accent");
    // Band (phone), waffle (md to lg), slider (lg+): one face per width.
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(3);
    expect(leadSrc).toContain('presentation="band"');
    expect(leadSrc).toContain('presentation="slider"');
    expect(leadSrc).not.toContain('presentation="lanes"');
    expect(leadSrc).toContain('presentation="waffle"');
    expect(leadSrc).not.toContain('tone="pill"');
    expect(leadSrc).not.toContain("data-app-header-workspace-pill");
    expect(leadSrc).toContain("data-app-header-workspace-desktop");
    expect(leadSrc).toContain("data-app-header-workspace-waffle");
    expect(shellSrc).not.toContain("data-workspace-switcher-rail");
    expect(shellSrc).not.toContain("data-workspace-switcher-lead");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    const triggerAt = src.indexOf("data-workspace-switcher-trigger");
    const triggerSrc = src.slice(triggerAt, src.indexOf("</button>", triggerAt));
    expect(triggerSrc).toContain("data-workspace-waffle");
    expect(triggerSrc).toContain("DotsNine");
    expect(triggerSrc).toContain("workspaceSwitcherTriggerLabel(triggerName)");
    expect(triggerSrc).toContain("data-workspace-waffle-name");
    expect(triggerSrc).not.toContain("data-workspace-switcher-current");
    expect(triggerSrc).not.toContain("CaretDown");
    expect(src).toContain("createPortal");
    expect(src).toContain("workspaceSwitcherMenuStyle");
    // The desktop switcher is the house SegmentedTrack (one component
    // per pattern), not a second slider.
    expect(src).toContain("<SegmentedTrack");
    expect(src).not.toContain('data-workspace-switcher-presentation="lanes"');
    expect(src).not.toContain('tone="pill"');
  });

  it("opens Layer 1 tiles on the sheet and the desktop panel — current marked", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher current="social" defaultOpen />,
    );
    expect(html).toContain("data-workspace-switcher-sheet");
    expect(html).toContain("data-workspace-switcher-sheet-scrim");
    expect(html).toContain("data-workspace-switcher-popover");
    expect(html).toContain(`aria-label="${WORKSPACE_SWITCHER.close}"`);
    expect(html).toContain(WORKSPACE_SWITCHER_HEADER_CLASS);
    expect(html).toContain(WORKSPACE_SWITCHER.heading);
    expect(html).toContain("data-workspace-waffle-grid");
    const popover = html.slice(
      html.indexOf("data-workspace-switcher-popover"),
      html.indexOf("data-workspace-switcher-sheet"),
    );
    const sheet = html.slice(html.indexOf("data-workspace-switcher-sheet"));
    expect(tileIds(popover)).toEqual(["aggregation", "social", "education"]);
    expect(tileIds(sheet)).toEqual(["aggregation", "social", "education"]);
    expect(popover).toContain('data-workspace-waffle-current=""');
    expect(popover).toContain('data-workspace-waffle-tile="social"');
    expect(sheet).toContain('data-workspace-waffle-tile="social"');
    expect(html).not.toContain('data-workspace-waffle-tile="home"');
    expect(html).not.toContain('data-workspace-waffle-tile="co-productions"');
    expect(html).not.toContain("Co-Productions");
    expect(popover).not.toContain('href="/home"');
    expect(popover).not.toContain("data-workspace-waffle-home");
    expect(popover).not.toContain(">Home<");
    expect(sheet).toContain('data-workspace-waffle-home=""');
    expect(sheet).toContain('href="/home"');
    expect(sheet).toContain(">Home<");
    expect(sheet).not.toContain("Industry news");
    expect(sheet.indexOf("data-workspace-waffle-home")).toBeLessThan(
      sheet.indexOf("data-workspace-switcher-header"),
    );
    expect(sheet.indexOf("data-workspace-switcher-header")).toBeLessThan(
      sheet.indexOf("data-workspace-waffle-grid"),
    );
    const home = homeExit(sheet);
    expect(home).toContain(WORKSPACE_WAFFLE_HOME_EXIT_CLASS);
    expect(home).toContain(WORKSPACE_WAFFLE_HOME_EXIT_IDLE_CLASS);
    expect(home).toContain(WORKSPACE_WAFFLE_HOME_ICON_CLASS);
    const exitFn = src.slice(
      src.indexOf("function WorkspaceWaffleHomeExit"),
      src.indexOf("function WorkspaceWaffleTiles"),
    );
    expect(exitFn).toContain("<ArrowLeft");
    expect(exitFn).toContain("event.preventDefault()");
    expect(exitFn).toContain("router.push(dest)");
    expect(exitFn).toContain("house?.navigateOwned(dest, event)");
    const idleTile = src.slice(src.indexOf("if (!selected)"), src.indexOf('data-workspace-waffle-current=""'));
    expect(idleTile).toContain("houseNavIgnorePendingClick(event)");
    expect(idleTile).toContain("selectWorkspaceTile(");
    expect(idleTile).toContain("event.preventDefault()");
    expect(idleTile).toContain("onNavigate()");
    expect(idleTile.indexOf("selectWorkspaceTile(")).toBeLessThan(idleTile.indexOf("event.preventDefault()"));
    expect(idleTile.indexOf("event.preventDefault()")).toBeLessThan(idleTile.indexOf("onNavigate()"));
    expect(idleTile).toContain("markPending");
    expect(exitFn).not.toMatch(/<House[\s/>]/);
    expect(exitFn).not.toContain("CaretLeft");
    expect(exitFn).not.toContain("lucide-react");
    expect(home).toContain(">Home<");
    expect(home).not.toContain(WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS);
    expect(home).not.toContain("min-h-12");
    expect(home).not.toContain("bg-surface-muted");
    expect(home).not.toContain("text-accent");
    expect(home).not.toContain("data-appearance-check");
    expect(home).not.toContain('role="option"');
    const panelJsx = src.slice(
      src.indexOf("data-workspace-switcher-popover"),
      src.indexOf("data-workspace-switcher-sheet"),
    );
    expect(panelJsx).not.toContain("WorkspaceWaffleHomeExit");
    expect(src.slice(src.indexOf("data-workspace-switcher-sheet"))).toContain(
      "WorkspaceWaffleHomeExit",
    );
    expect(html).toContain('href="/aggregation/dashboard"');
    expect(html).toContain('href="/education"');
    expect(html).not.toContain(">Explore<");
    const dockSrc = readFileSync(join(here, "house-phone-bottom-nav.tsx"), "utf8");
    expect(dockSrc).not.toContain("data-workspace-waffle-home");
    expect(dockSrc).not.toContain("WORKSPACE_WAFFLE_HOME");
    expect(html).not.toContain(">Create<");
    expect(html).not.toContain(">Messages<");
    expect(html).not.toContain(">Profile<");
    for (const label of WORKSPACE_WAFFLE_FORBIDDEN_LABELS) {
      expect(workspaceWaffleTiles().map((tile) => tile.label)).not.toContain(label);
    }
    expect(html).not.toContain("Settings");
    expect(html).not.toContain("Get Help");
    expect(html).not.toContain("/account/workspace");
    expect(src).toContain("prefetchHrefList");
    expect(src).toContain("phoneWorkspaceSwitcherPrefetchHrefs");
    expect(src).toContain("prefetchWorkspaceWaffleIntent");
    expect(src).toContain("workspaceWaffleIntentPrefetchHrefs");
    expect(lanes).toContain('kind: WORKSPACE_WAFFLE_INTENT_PREFETCH_KIND');
    const tilesFn = src.slice(
      src.indexOf("function WorkspaceWaffleTiles"),
      src.indexOf("function WorkspaceLanes"),
    );
    expect(tilesFn).toContain("onPointerDown={() => onIntent(tile.href)}");
    expect(tilesFn).toContain("onPointerEnter={() => onIntent(tile.href)}");
    expect(tilesFn).toContain("<HouseLink");
    expect(tilesFn).not.toContain("router.push");
    expect(src).toContain("onPointerDown={() => {");
    expect(src).toContain("if (open) return;");
    expect(src).toContain("warmWorkspaceWaffleIntent(router.prefetch, intentKey.split(");
    expect(src).toContain("workspaceSwitcherPersistLane");
    expect(src).not.toContain("persistWorkspaceCookie");
    expect(lanes).toContain("workspaceHome(option.mode)");
    const triggerAt = html.indexOf("data-workspace-switcher-trigger");
    const trigger = html.slice(triggerAt, html.indexOf("</button>", triggerAt));
    expect(trigger).toContain(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS);
    expect(trigger).not.toContain("bg-accent");
  });

  it("marks Home current on /home and still links back from the news history", () => {
    try {
      navigation.pathname = "/home";
      const landed = renderToStaticMarkup(
        <WorkspaceSwitcher current="social" defaultOpen />,
      );
      const landedSheet = landed.slice(landed.indexOf("data-workspace-switcher-sheet"));
      expect(landedSheet).toContain('data-workspace-waffle-home-current=""');
      expect(landedSheet).not.toContain('href="/home"');
      expect(landedSheet).toContain(">Home<");
      const landedHome = homeExit(landedSheet);
      expect(landedHome).toContain(WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS);
      expect(landedHome).toContain(WORKSPACE_WAFFLE_HOME_CHECK_CLASS);
      expect(landedHome).toContain("data-appearance-check");
      expect(landedHome).not.toContain("bg-surface-muted");
      expect(landedHome).not.toContain("text-accent");
      expect(landedHome).not.toContain("min-h-12");
      expect(landedHome).not.toContain('role="option"');

      navigation.pathname = "/home/news";
      const news = renderToStaticMarkup(
        <WorkspaceSwitcher current="aggregation" defaultOpen />,
      );
      const newsSheet = news.slice(news.indexOf("data-workspace-switcher-sheet"));
      expect(newsSheet).toContain('data-workspace-waffle-home=""');
      expect(newsSheet).toContain('href="/home"');
      expect(newsSheet).not.toContain("data-workspace-waffle-home-current");

      navigation.pathname = "/staff/queue";
      const staff = renderToStaticMarkup(
        <WorkspaceSwitcher current="staff" isGcStaff defaultOpen />,
      );
      const staffSheet = staff.slice(staff.indexOf("data-workspace-switcher-sheet"));
      expect(staffSheet).toContain('href="/home"');
      expect(staffSheet).not.toContain('data-workspace-waffle-tile="staff"');
    } finally {
      navigation.pathname = "/";
    }
  });

  // Adam 2026-10-08 (staff-account-menu-lock-v1): Staff left the
  // switcher for the account menu. No face draws a Staff tile — not for
  // GC staff, not from a forged "staff" option.
  it("never shows a Staff tile — not for GC staff, not from a forged option", () => {
    const forgedOptions = [
      ...availableWorkspaceOptions(),
      { mode: "staff" as const, label: "Staff", href: "/staff/queue" },
    ];
    const memberHtml = renderToStaticMarkup(
      <WorkspaceSwitcher current="aggregation" defaultOpen />,
    );
    const staffHtml = renderToStaticMarkup(
      <WorkspaceSwitcher current="staff" isGcStaff defaultOpen />,
    );
    const forgedOption = renderToStaticMarkup(
      <WorkspaceSwitcher current="staff" isGcStaff options={forgedOptions} defaultOpen />,
    );
    const forged = renderToStaticMarkup(
      <WorkspaceSwitcher current="staff" defaultOpen />,
    );
    for (const html of [memberHtml, staffHtml, forgedOption, forged]) {
      expect(tileIds(html)).not.toContain("staff");
      expect(html).not.toContain(">Staff<");
      expect(html).not.toContain('href="/staff/queue"');
    }
    const staffPopover = staffHtml.slice(
      staffHtml.indexOf("data-workspace-switcher-popover"),
      staffHtml.indexOf("data-workspace-switcher-sheet"),
    );
    expect(tileIds(staffPopover)).toEqual(["aggregation", "social", "education"]);
    // A forged staff workspace without the gate still clamps to Aggregation.
    expect(forged).toContain('data-workspace-waffle-tile="aggregation"');
    expect(forged).toContain('data-workspace-waffle-current=""');
    expect(leadSrc).toContain("availableWorkspaceOptions()");
    expect(leadSrc).not.toContain("availableWorkspaceOptions({ isGcStaff })");
  });

  it("hides a missing lane instead of a dead tile", () => {
    const reachable = availableWorkspaceOptions().filter((option) => option.mode !== "education");
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher current="aggregation" options={reachable} defaultOpen />,
    );
    expect(tileIds(html)).toEqual(["aggregation", "social", "aggregation", "social"]);
    expect(html).not.toContain('data-workspace-waffle-tile="education"');
    expect(html).not.toContain(">Education<");
    expect(html).not.toContain("Co-Productions");
  });

  it("keeps a single entitled lane on the waffle — no labeled fallback", () => {
    const [only] = availableWorkspaceOptions();
    expect(only).toBeDefined();
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher current={only!.mode} options={[only!]} defaultOpen />,
    );
    expect(html).toContain("data-workspace-waffle");
    expect(html).toContain(`data-workspace-waffle-tile="${only!.mode}"`);
    expect(html).not.toContain("data-workspace-switcher-chevron");
    expect(html).not.toContain("data-workspace-switcher-lanes");
    expect(tileIds(html)).toEqual([only!.mode, only!.mode]);
  });

  it("does not list forbidden Layer 2 destinations in the open panel", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher current="social" defaultOpen />,
    );
    for (const absent of WORKSPACE_SWITCHER_ABSENT) {
      expect(html).not.toContain(absent);
    }
  });
});

describe("workspace waffle placement", () => {
  it("puts the band above the bar on phone, the grey pill (md to lg) and the slider (lg+) in the lead; trailing has no switcher", () => {
    expect(leadSrc).toContain("data-brand-emblem");
    expect(leadSrc).toContain("data-app-header-trailing");
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(3);
    // The band is the stack's first child, before the bar (not in the lead).
    expect(leadSrc.indexOf('presentation="band"')).toBeLessThan(leadSrc.indexOf("<header"));
    expect(shellSrc).toContain("<HouseLeadChrome");
    const leading = leadSrc.slice(
      leadSrc.indexOf("data-app-header-leading"),
      leadSrc.indexOf("data-app-header-trailing"),
    );
    expect(leading).toContain('presentation="slider"');
    expect(leading).toContain('presentation="waffle"');
    // No hairline divider: the brand mark lives in the side menu's band.
    expect(leading).not.toContain("data-app-header-divider");
    expect(leading.indexOf("<HouseLeadMark")).toBeLessThan(leading.indexOf('presentation="waffle"'));
    expect(leading.indexOf('presentation="waffle"')).toBeLessThan(leading.indexOf('presentation="slider"'));
    expect(leading.indexOf('presentation="slider"')).toBeLessThan(leading.indexOf("{headerExit}"));
    const trailing = leadSrc.slice(
      leadSrc.indexOf("data-app-header-trailing"),
      leadSrc.indexOf("</header>"),
    );
    expect(trailing).not.toContain("WorkspaceSwitcher");
    expect(trailing).not.toContain("data-app-header-workspace-waffle");
    expect(trailing).toContain("<AskAssistantHeaderLink />");
    expect(trailing).toContain("<ActivityBell");
    expect(trailing).toContain("{accountMenu}");
    expect(trailing.indexOf("{search}")).toBeLessThan(
      trailing.indexOf("<AskAssistantHeaderLink />"),
    );
    expect(trailing.indexOf("<AskAssistantHeaderLink />")).toBeLessThan(
      trailing.indexOf("<ActivityBell"),
    );
    expect(trailing.indexOf("<ActivityBell")).toBeLessThan(trailing.indexOf("{accountMenu}"));
    expect(trailing).not.toContain("ThemeToggle");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
  });

  it("keeps the phone lead free of overflow-hidden so the emblem is not crushed", () => {
    expect(leadSrc).toContain("APP_HEADER_LEADING_CLASS");
    expect(src).toContain("WORKSPACE_SWITCHER_HOST_CLASS");
    expect(leadSrc).toContain("<BrandLogo />");
    expect(leadSrc).not.toContain("BrandEmblem");
  });
});

function escapeRe(value: string): string {
  return value.replace(/[[\]().*+?^$|{}]/g, "\\$&");
}

function segmentIds(html: string): string[] {
  return [...html.matchAll(/data-workspace-switcher-segment="([^"]+)"/g)].map((row) => row[1] ?? "");
}

function selectedSegment(html: string): string | null {
  const match = html.match(/aria-selected="true"[^>]*data-workspace-switcher-segment="([^"]+)"|data-workspace-switcher-segment="([^"]+)"[^>]*aria-selected="true"/);
  return match ? (match[1] ?? match[2] ?? null) : null;
}

describe("desktop workspace slider", () => {
  it("lists Home then the Layer 1 segments — no dock tabs", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher presentation="slider" current="social" />,
    );
    expect(html).toContain('data-workspace-switcher-presentation="slider"');
    expect(html).toContain("data-workspace-switcher-slider");
    expect(html).toContain('role="tablist"');
    // The house SegmentedTrack: every segment is a track item, one thumb.
    expect(html.match(/data-segmented-item=""/g)?.length).toBe(4);
    expect(html.match(/data-segmented-thumb=""/g)?.length).toBe(1);
    expect(html).toContain(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS);
    expect(segmentIds(html)).toEqual(["home", "aggregation", "social", "education"]);
    expect(html).not.toContain('data-workspace-switcher-segment="staff"');
    expect(html).not.toContain("data-workspace-waffle");
    expect(html).toContain(">Home<");
    expect(html).not.toContain(">Feed<");
    expect(html).not.toContain(">Explore<");
    expect(html).not.toContain(">Create<");
    expect(html).not.toContain(">Messages<");
    expect(html).not.toContain(">Profile<");
    expect(html).not.toContain("Co-Productions");
    // GC staff get the same four segments; Staff is the account menu's row.
    navigation.pathname = "/staff/queue";
    try {
      const staff = renderToStaticMarkup(
        <WorkspaceSwitcher presentation="slider" current="staff" isGcStaff />,
      );
      expect(segmentIds(staff)).toEqual(["home", "aggregation", "social", "education"]);
      expect(staff).not.toContain(">Staff<");
      expect(selectedSegment(staff)).toBeNull();
    } finally {
      navigation.pathname = "/";
    }
  });

  it("lights Home on /home and /home/news and the workspace elsewhere — one current segment on the thumb", () => {
    try {
      for (const [path, current, expected] of [
        ["/home", "aggregation", "home"],
        ["/home/news", "aggregation", "home"],
        ["/social", "social", "social"],
        ["/aggregation/titles", "aggregation", "aggregation"],
        ["/education", "education", "education"],
      ] as const) {
        navigation.pathname = path;
        const html = renderToStaticMarkup(
          <WorkspaceSwitcher presentation="slider" current={current} />,
        );
        expect(selectedSegment(html), path).toBe(expected);
        expect(html.match(/aria-selected="true"/g)?.length, path).toBe(1);
        // The lit segment is the page: aria-current and the label on the
        // ink thumb (page colour); the rest stay ink.
        expect(html.match(/aria-current="page"/g)?.length, path).toBe(1);
        expect(html.match(new RegExp(`${escapeRe(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS)}"`, "g"))?.length, path).toBe(1);
        expect(html.match(new RegExp(`${escapeRe(WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS)}"`, "g"))?.length, path).toBe(3);
        const lit = html.slice(html.lastIndexOf("<button", html.indexOf('aria-current="page"')));
        expect(lit.slice(0, lit.indexOf("</button>")), path).toContain(`${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS}"`);
      }
      navigation.pathname = "/settings";
      const settings = renderToStaticMarkup(
        <WorkspaceSwitcher presentation="slider" current="social" />,
      );
      expect(settings).not.toContain('aria-selected="true"');
      expect(settings).not.toContain('aria-current="page"');
      expect(settings).not.toContain(`${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS}"`);
      // No lit segment: the thumb is hidden, not parked on Home.
      expect(settings).toContain('data-segmented-thumb="" class="');
      expect(settings).toMatch(/data-segmented-thumb=""[^>]*style="opacity:0"/);
    } finally {
      navigation.pathname = "/";
    }
  });

  // The pill is lg:hidden, so on a route that lights no segment the
  // desktop slider must still own one Tab stop (Home).
  it("keeps exactly one Tab stop — Home when no segment is lit (Settings, Activity, Help, Co-Productions)", () => {
    const tabStops = (html: string) =>
      [...html.matchAll(/data-workspace-switcher-segment="([a-z]+)"[^>]*tabindex="0"/g)].map((m) => m[1]);
    try {
      for (const path of ["/settings", "/activity", "/help", "/co-productions"]) {
        navigation.pathname = path;
        const html = renderToStaticMarkup(
          <WorkspaceSwitcher presentation="slider" current="aggregation" isGcStaff />,
        );
        expect(html, path).not.toContain('aria-selected="true"');
        expect(html.match(/tabindex="0"/g)?.length, path).toBe(1);
        expect(tabStops(html), path).toEqual(["home"]);
      }
      for (const [path, current, lane] of [
        ["/home", "aggregation", "home"],
        ["/social", "social", "social"],
        ["/aggregation/dashboard", "aggregation", "aggregation"],
      ] as const) {
        navigation.pathname = path;
        const html = renderToStaticMarkup(<WorkspaceSwitcher presentation="slider" current={current} />);
        expect(html.match(/tabindex="0"/g)?.length, path).toBe(1);
        expect(tabStops(html), path).toEqual([lane]);
      }
    } finally {
      navigation.pathname = "/";
    }
    expect(workspaceSwitcherSegmentTabIndex(2, 2, 5)).toBe(0);
    expect(workspaceSwitcherSegmentTabIndex(0, 2, 5)).toBe(-1);
    expect(workspaceSwitcherSegmentTabIndex(0, -1, 5)).toBe(0);
    expect(workspaceSwitcherSegmentTabIndex(1, -1, 5)).toBe(-1);
    expect(workspaceSwitcherSegmentTabIndex(0, 9, 5)).toBe(0);
  });

  it("routes a Home segment click through the shared lane hop — no tile lookup", () => {
    const slider = src.slice(src.indexOf("function WorkspaceSlider"), src.indexOf("export function WorkspaceSwitcher"));
    expect(slider.length).toBeGreaterThan(0);
    expect(slider).toContain("onSegmentKeyDown(event, index)");
    // Arrow keys move focus between segments (no DOM env here, so the
    // wiring is pinned at the source): Right/Left step with wrap, then focus.
    expect(slider).toContain('if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;');
    expect(slider).toContain('event.key === "ArrowRight" ? 1 : -1');
    expect(slider).toContain("segmentRefs.current[next]?.focus();");
    expect(slider).toContain("workspaceSwitcherSegmentTabIndex(index, routeIndex, pills.length)");
    expect(slider).toContain("workspaceSliderSegments(options)");
    // The thumb slides with the house persist key and 220ms flight.
    expect(slider).toContain("persistKey={SEGMENTED_TRACK_PERSIST.workspace}");
    expect(slider).toContain("durationMs={WORKSPACE_SWITCHER_SLIDER_THUMB_DURATION_MS}");
    expect(slider).not.toContain("tiles.find");
    expect(slider).not.toContain("data-workspace-switcher-current");
    const select = src.slice(src.indexOf("function selectWorkspaceTile"), src.indexOf("function WorkspaceWaffleHomeExit"));
    expect(select).toContain("selectWorkspaceLane(");
    expect(select).toContain("lane: { id: OverviewLeadPillId; href: string }");
  });
});

describe("workspace switcher account-menu absence", () => {
  it("keeps Workspace out of the account menu list", () => {
    expect(userMenuSrc).not.toContain('kind: "workspace"');
    expect(sheetSrc).not.toContain("AccountWorkspaceRow");
    expect(sheetSrc).not.toContain("AccountWorkspaceFlyout");
    expect(sheetSrc).not.toContain("AccountSheetWorkspace");
    expect(sheetSrc).not.toContain('data-user-menu-item="workspace"');
    expect(sheetSrc).not.toContain('data-sheet-group-item="workspace"');
    expect(sheetSrc).not.toContain("data-account-menu-workspace");
  });
});

// Phone workspace band (Adam 2026-10-08,
// docs/design-locks/shell-phone-workspace-band-lock-v1.md): the
// slider's segments as icon + word pills on Sporty Blue; one lit pill at
// most; the row slides (no arrow, no fade); never a Staff pill.
describe("workspace band (phone)", () => {
  const pillIds = (html: string) =>
    [...html.matchAll(/data-workspace-band-pill="([^"]+)"/g)].map((row) => row[1] ?? "");
  const litIds = (html: string) =>
    [...html.matchAll(/<a[^>]*data-workspace-band-pill="([^"]+)"[^>]*aria-current="page"/g)].map(
      (row) => row[1] ?? "",
    );
  const band = (path: string, current: "aggregation" | "social" | "education" | "staff", isGcStaff = false) => {
    navigation.pathname = path;
    try {
      return renderToStaticMarkup(
        <WorkspaceSwitcher presentation="band" current={current} isGcStaff={isGcStaff} />,
      );
    } finally {
      navigation.pathname = "/";
    }
  };

  it("draws Home · Aggregation · Social · Education as icon + word pills on the band", () => {
    const html = band("/social", "social");
    expect(html).toContain('data-workspace-switcher-presentation="band"');
    expect(html).toContain(`class="${WORKSPACE_BAND_CLASS}"`);
    expect(html).toContain(`class="${WORKSPACE_BAND_ROW_CLASS}"`);
    expect(pillIds(html)).toEqual(["home", "aggregation", "social", "education"]);
    for (const [id, href, label] of [
      ["home", "/home", "Home"],
      ["aggregation", "/aggregation/dashboard", "Aggregation"],
      ["social", "/social", "Social"],
      ["education", "/education", "Education"],
    ] as const) {
      const at = html.indexOf(`data-workspace-band-pill="${id}"`);
      const tag = html.slice(html.lastIndexOf("<a", at), html.indexOf(">", at) + 1);
      expect(tag, id).toContain(`href="${href}"`);
      const pill = html.slice(at, html.indexOf("</a>", at));
      // An icon, then the word — both inside the pill face.
      expect(pill, id).toContain("<svg");
      expect(pill.indexOf("<svg"), id).toBeLessThan(pill.indexOf(`>${label}<`));
    }
    // The row slides: no arrow, no fade, no control but the pills.
    expect(html).not.toContain("<button");
    expect(html).not.toMatch(/fade|gradient|More/);
  });

  it("lights the route's workspace in the page colour — at most one, none off a workspace", () => {
    const social = band("/social", "social");
    expect(litIds(social)).toEqual(["social"]);
    expect(social).toContain(`class="${WORKSPACE_BAND_PILL_CURRENT_CLASS}"`);
    expect(social.split(`class="${WORKSPACE_BAND_PILL_CLASS}"`).length - 1).toBe(3);
    expect(litIds(band("/home", "aggregation"))).toEqual(["home"]);
    expect(litIds(band("/aggregation/titles", "aggregation"))).toEqual(["aggregation"]);
    expect(litIds(band("/education", "education"))).toEqual(["education"]);
    for (const path of ["/settings", "/activity", "/help", "/co-productions"]) {
      expect(litIds(band(path, "social")), path).toEqual([]);
    }
    // Staff is not a lane: a Staff page lights none and draws no Staff pill.
    const staff = band("/staff/queue", "staff", true);
    expect(litIds(staff)).toEqual([]);
    expect(pillIds(staff)).not.toContain("staff");
    expect(staff).not.toContain(">Staff<");
  });

  it("never draws a Staff pill, even from a forged option", () => {
    navigation.pathname = "/social";
    try {
      const html = renderToStaticMarkup(
        <WorkspaceSwitcher
          presentation="band"
          current="social"
          isGcStaff
          options={[
            ...availableWorkspaceOptions(),
            { mode: "staff" as const, label: "Staff", href: "/staff/queue" },
          ]}
        />,
      );
      expect(pillIds(html)).toEqual(["home", "aggregation", "social", "education"]);
      expect(html).not.toContain('href="/staff/queue"');
    } finally {
      navigation.pathname = "/";
    }
  });
});

describe("the sheet rides over the band (lock §5)", () => {
  const withChrome = (node: React.ReactNode, state: { dockHidden: boolean; bandTucked: boolean }) => (
    <HousePhoneChromeContext.Provider value={{ ...state, open: () => {} }}>{node}</HousePhoneChromeContext.Provider>
  );
  const open = { dockHidden: false, bandTucked: false };
  const tucked = { dockHidden: true, bandTucked: true };

  it("folds the band row under the bar when the shell says tucked, and opens it otherwise", () => {
    navigation.pathname = "/social";
    try {
      const shown = renderToStaticMarkup(
        withChrome(<WorkspaceSwitcher presentation="band" current="social" />, open),
      );
      expect(shown).toContain(`data-workspace-band-fold="" class="${WORKSPACE_BAND_FOLD_OPEN_CLASS}"`);
      expect(shown).not.toContain("data-workspace-band-tucked");
      // The row sits inside the fold, so the fold's height is what moves.
      expect(shown.indexOf("data-workspace-band-fold")).toBeLessThan(shown.indexOf("data-workspace-band-row"));

      const folded = renderToStaticMarkup(
        withChrome(<WorkspaceSwitcher presentation="band" current="social" />, tucked),
      );
      expect(folded).toContain(`data-workspace-band-fold="" class="${WORKSPACE_BAND_FOLD_TUCKED_CLASS}"`);
      expect(folded).toContain('data-workspace-band-tucked=""');
      // Still in the accessibility tree: four pills, the current one marked.
      expect(folded).not.toContain("aria-hidden=\"true\" data-workspace-band");
      expect([...folded.matchAll(/data-workspace-band-pill=/g)]).toHaveLength(4);
      expect(folded).toContain('aria-current="page"');
    } finally {
      navigation.pathname = "/";
    }
  });

  it("draws the grab handle on the bar, decorative only", () => {
    navigation.pathname = "/aggregation/dashboard";
    try {
      const html = renderToStaticMarkup(
        <HouseLeadChrome workspace="aggregation" accountMenu={null} />,
      );
      const header = html.slice(html.indexOf("<header"));
      expect(header).toContain(`<span aria-hidden="true" data-house-lead-grip="" class="${HOUSE_LEAD_GRIP_CLASS}"></span>`);
      // The handle is the bar's first child, above the 56 row.
      expect(header.indexOf("data-house-lead-grip")).toBeLessThan(header.indexOf("data-app-header-leading"));
    } finally {
      navigation.pathname = "/";
    }
  });

  it("hides the dock from the same state", () => {
    navigation.pathname = "/aggregation/dashboard";
    try {
      const shown = renderToStaticMarkup(withChrome(<HousePhoneBottomNav workspace="aggregation" />, open));
      const hidden = renderToStaticMarkup(withChrome(<HousePhoneBottomNav workspace="aggregation" />, tucked));
      expect(shown).not.toContain("data-house-phone-bottom-nav-hidden");
      expect(hidden).toContain('data-house-phone-bottom-nav-hidden=""');
      expect(hidden).toContain(HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS);
    } finally {
      navigation.pathname = "/";
    }
  });
});
