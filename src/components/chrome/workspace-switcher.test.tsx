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
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_ABSENT,
  WORKSPACE_SWITCHER_HEADER_CLASS,
  WORKSPACE_WAFFLE_FORBIDDEN_LABELS,
  WORKSPACE_WAFFLE_GRID_CLASS,
  WORKSPACE_WAFFLE_HOME_CHECK_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS,
  WORKSPACE_WAFFLE_HOME_EXIT_IDLE_CLASS,
  WORKSPACE_WAFFLE_HOME_ICON_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS,
  workspaceWaffleTiles,
} from "@/lib/workspace-switcher";
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
  it("is an icon-only waffle — no workspace name, pill, or chevron", () => {
    const html = renderToStaticMarkup(<WorkspaceSwitcher current="aggregation" />);
    expect(html).toContain("data-workspace-switcher");
    expect(html).toContain('data-workspace-switcher-presentation="waffle"');
    expect(html).toContain("data-workspace-waffle");
    expect(html).toContain(`aria-label="${WORKSPACE_SWITCHER.heading}"`);
    expect(html).toContain(WORKSPACE_WAFFLE_TRIGGER_CLASS);
    expect(html).not.toContain("data-workspace-switcher-current");
    expect(html).not.toContain("data-workspace-switcher-chevron");
    expect(html).not.toContain("data-workspace-switcher-pills");
    expect(html).not.toContain('data-workspace-switcher-tone="pill"');
    expect(html).not.toContain(">Aggregation<");
    expect(html).not.toContain(">Social<");
    expect(html).not.toContain("bg-accent");
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(2);
    expect(leadSrc).toContain('presentation="pills"');
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
    expect(triggerSrc).not.toContain("data-workspace-switcher-current");
    expect(triggerSrc).not.toContain("CaretDown");
    expect(src).toContain("createPortal");
    expect(src).toContain("workspaceSwitcherMenuStyle");
    expect(src).toContain("SegmentedTrack");
    expect(src).toContain('data-workspace-switcher-presentation="pills"');
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
    expect(tileIds(popover)).toEqual(["social", "education", "aggregation"]);
    expect(tileIds(sheet)).toEqual(["social", "education", "aggregation"]);
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
    expect(exitFn).toContain("WORKSPACE_WAFFLE_HOME_ICON_CLASS");
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
    expect(WORKSPACE_WAFFLE_GRID_CLASS).toContain("grid-cols-2");
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
    expect(src).toContain("workspaceSwitcherPersistLane");
    expect(src).not.toContain("persistWorkspaceCookie");
    expect(lanes).toContain("workspaceHome(option.mode)");
    const triggerAt = html.indexOf("data-workspace-switcher-trigger");
    const trigger = html.slice(triggerAt, html.indexOf("</button>", triggerAt));
    expect(trigger).not.toContain("Social");
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
        <WorkspaceSwitcher
          current="staff"
          isGcStaff
          options={availableWorkspaceOptions({ isGcStaff: true })}
          defaultOpen
        />,
      );
      const staffSheet = staff.slice(staff.indexOf("data-workspace-switcher-sheet"));
      expect(staffSheet).toContain('href="/home"');
      expect(staffSheet).toContain('data-workspace-waffle-tile="staff"');
    } finally {
      navigation.pathname = "/";
    }
  });

  it("shows Staff only when the existing staff gate includes it", () => {
    const staffOptions = availableWorkspaceOptions({ isGcStaff: true });
    const memberHtml = renderToStaticMarkup(
      <WorkspaceSwitcher current="aggregation" defaultOpen />,
    );
    const staffHtml = renderToStaticMarkup(
      <WorkspaceSwitcher current="staff" isGcStaff options={staffOptions} defaultOpen />,
    );
    const forged = renderToStaticMarkup(
      <WorkspaceSwitcher current="staff" defaultOpen />,
    );
    expect(tileIds(memberHtml)).not.toContain("staff");
    expect(memberHtml).not.toContain(">Staff<");
    const staffPopover = staffHtml.slice(
      staffHtml.indexOf("data-workspace-switcher-popover"),
      staffHtml.indexOf("data-workspace-switcher-sheet"),
    );
    expect(tileIds(staffPopover)).toEqual(["social", "education", "aggregation", "staff"]);
    expect(staffHtml).toContain(">Staff<");
    expect(staffHtml).not.toContain("Team");
    expect(staffHtml).not.toContain("Ops");
    expect(tileIds(forged)).not.toContain("staff");
    expect(forged).toContain('data-workspace-waffle-tile="aggregation"');
    expect(forged).toContain('data-workspace-waffle-current=""');
    expect(leadSrc).toContain("availableWorkspaceOptions({ isGcStaff })");
  });

  it("hides a missing lane instead of a dead tile", () => {
    const reachable = availableWorkspaceOptions().filter((option) => option.mode !== "education");
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher current="aggregation" options={reachable} defaultOpen />,
    );
    expect(tileIds(html)).toEqual(["social", "aggregation", "social", "aggregation"]);
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
    expect(html).not.toContain("data-workspace-switcher-pills");
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
  it("sits in the utility cluster after the bell and before the avatar", () => {
    expect(leadSrc).toContain("data-brand-emblem");
    expect(leadSrc).toContain("data-app-header-trailing");
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(2);
    expect(shellSrc).toContain("<HouseLeadChrome");
    const leading = leadSrc.slice(
      leadSrc.indexOf("data-app-header-leading"),
      leadSrc.indexOf("data-app-header-trailing"),
    );
    expect(leading).not.toContain("WorkspaceSwitcher");
    const trailing = leadSrc.slice(
      leadSrc.indexOf("data-app-header-trailing"),
      leadSrc.indexOf("</header>"),
    );
    expect(trailing).toContain("WorkspaceSwitcher");
    expect(trailing).toContain("<AskAssistantHeaderLink />");
    expect(trailing).toContain("<ActivityBell");
    expect(trailing).toContain("{accountMenu}");
    expect(trailing.indexOf('presentation="pills"')).toBeLessThan(
      trailing.indexOf("<AskAssistantHeaderLink />"),
    );
    expect(trailing.indexOf("<AskAssistantHeaderLink />")).toBeLessThan(
      trailing.indexOf("<ActivityBell"),
    );
    expect(trailing.indexOf("<ActivityBell")).toBeLessThan(
      trailing.indexOf('presentation="waffle"'),
    );
    expect(trailing.indexOf('presentation="waffle"')).toBeLessThan(
      trailing.indexOf("{accountMenu}"),
    );
    expect(trailing).not.toContain("ThemeToggle");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
  });

  it("keeps the phone lead free of overflow-hidden so the emblem is not crushed", () => {
    expect(leadSrc).toContain("APP_HEADER_LEADING_CLASS");
    expect(src).toContain("WORKSPACE_SWITCHER_HOST_CLASS");
    expect(leadSrc).toContain("<BrandLogo />");
    expect(leadSrc).not.toContain("BrandEmblem");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).toContain("min-w-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(
      /(?:^|\s)gap-\[var\(--space-3\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
  });
});

describe("desktop sliding workspace row", () => {
  it("lists Layer 1 lanes only — same inventory as the waffle, no dock tabs", () => {
    const html = renderToStaticMarkup(
      <WorkspaceSwitcher presentation="pills" current="social" />,
    );
    expect(html).toContain('data-workspace-switcher-presentation="pills"');
    expect(html).toContain("data-workspace-switcher-pills");
    expect(html).toContain('data-workspace-switcher-segment="social"');
    expect(html).toContain('data-workspace-switcher-segment="education"');
    expect(html).toContain('data-workspace-switcher-segment="aggregation"');
    expect(html).not.toContain('data-workspace-switcher-segment="home"');
    expect(html).not.toContain('data-workspace-switcher-segment="staff"');
    expect(html).not.toContain("data-workspace-waffle");
    expect(html).not.toContain(">Home<");
    expect(html).not.toContain(">Explore<");
    expect(html).not.toContain(">Create<");
    expect(html).not.toContain(">Messages<");
    expect(html).not.toContain(">Profile<");
    expect(html).not.toContain("Co-Productions");
    const staff = renderToStaticMarkup(
      <WorkspaceSwitcher
        presentation="pills"
        current="staff"
        isGcStaff
        options={availableWorkspaceOptions({ isGcStaff: true })}
      />,
    );
    expect(staff).toContain('data-workspace-switcher-segment="staff"');
    expect(staff).toContain(">Staff<");
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
