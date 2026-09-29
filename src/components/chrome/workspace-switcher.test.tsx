import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(1);
    expect(leadSrc).not.toContain('presentation="pills"');
    expect(leadSrc).not.toContain('tone="pill"');
    expect(leadSrc).not.toContain("data-app-header-workspace-pill");
    expect(leadSrc).not.toContain("data-app-header-workspace-desktop");
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
    expect(src).not.toContain("SegmentedTrack");
    expect(src).not.toContain('presentation="pills"');
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
    expect(html).not.toContain('href="/home"');
    expect(html).toContain('href="/aggregation/dashboard"');
    expect(html).toContain('href="/education"');
    expect(html).not.toContain(">Home<");
    expect(html).not.toContain(">Explore<");
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
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(1);
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
    expect(trailing.indexOf("<AskAssistantHeaderLink />")).toBeLessThan(
      trailing.indexOf("<ActivityBell"),
    );
    expect(trailing.indexOf("<ActivityBell")).toBeLessThan(
      trailing.indexOf("<WorkspaceSwitcher"),
    );
    expect(trailing.indexOf("<WorkspaceSwitcher")).toBeLessThan(
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
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
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
