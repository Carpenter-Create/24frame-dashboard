// Header workspace switch. Lives in lib/, not JSX.
// docs/design-locks/shell-workspace-waffle-layer-lock-v1.md
// docs/design-locks/shell-desktop-top-nav-slider-waffle-phone-lock-v1.md
// One Layer 1 inventory. Two faces by host (md = 768).
// Desktop md+: sliding segmented row of workspace names in the
// header trailing cluster, before Ask · bell · avatar. No waffle.
// Phone/tablet max-md: icon-only waffle in the trailing utility
// cluster — search · optional (Ask) · bell · waffle · avatar.
// No labeled Social pill. No workspace-name dropdown. No slider
// on the phone. Panel and slider are Layer 1 only, in lock order:
// Social · Education · Aggregation (when the existing options gate
// includes it) · Staff (when isGcStaff). Hide lanes the caller
// omits. No dead tiles. Social Layer 2 dests stay out (Home /
// Explore / Create / Messages / Profile). Account / Settings /
// Help stay on the avatar menu. Phone face is the existing app
// sheet. Same tile inventory as the desktop slider.
// Dock dests stay in-workspace only.
// Leading air (settings back ↔ emblem) is --space-3 (12). Not
// --space-1. Do not put overflow-hidden on the leading row (#412).
// Phone trailing: [search if needed] [24Frame AI] [bell]
// [waffle] [avatar]. No header sun/moon. --chrome-gutter so the avatar is not flush.
// Cluster gap is phone --space-3 / desktop md:gap-[var(--space-4)] (16).
// Phone AI/bell/search hug --header-control-size so that gap is
// edge-to-edge. Do not cancel that hug with -mx.
// #452 stacked AI on the bell. Theme is the avatar drill to
// /settings/preferences/theme. No header glyph writes gc-theme.
// Ask 24Frame AI sits immediately left of the
// bell and opens the Mercury overlay. Ask AI is header + Home
// module only (#465). Do not reintroduce a dest hamburger.
// Desktop md+ restores the sliding segmented row (hidden md:contents).
// The labeled workspace pill stays retired. Do not restore tone="pill".
// No rail / header-lead #321 duplicate. Rail top-left stays the
// static 24 brand. Do not invent Move / search.
// Do not return the Social Messages icon to the top bar.
//
// Member lanes are Aggregation · Social · Education. Staff is a
// fourth lane, visible only when isGcStaff — hide lanes the
// user/org lacks; no dead tiles. Labels stay full words —
// no Agg, Edu, or ellipsis-as-design. No All Accounts clone.
// No Referrals / billing.
// Staff Manage courses lives on the Education workspace
// (/education/manage), not Settings Preferences and not this
// Staff lane. Education land is /education. Staff land is
// /staff/queue.
// Education quiet search stays Education-only: phone in a
// full-width row under HouseLeadChrome, desktop in the shared
// mid-lead slot (same Facebook-compact geometry as Social).
// Persist with workspaceSwitcherPersistLane → persistWorkspaceCookie.
// Do not invent a second cookie. Unselected waffle tiles are
// Link + prefetch; prefetchHrefList warms the entitled homes on mount.
// Do not invent /education, /account/workspace, or /settings/workspace.

import {
  HOUSE_LEAD_SEARCH_DESKTOP_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_SEGMENTED_ITEM_BASE_CLASS,
  HOUSE_SEGMENTED_ITEM_OFF_CLASS,
  HOUSE_SEGMENTED_ITEM_ON_CLASS,
  HOUSE_SEGMENTED_THUMB_CLASS,
  HOUSE_SEGMENTED_TRACK_CLASS,
} from "@/lib/house-shell";
import {
  APP_SHEET_HOST_CLASS,
  APP_SHEET_SCRIM_CLASS,
  APP_SHEET_SURFACE_CLASS,
} from "@/lib/house-sheet";
import { USER_MENU } from "@/lib/user-menu";
import {
  availableWorkspaceOptions,
  type WorkspaceMenuOption,
} from "@/lib/workspace-menu";
import { overviewLeadShouldNavigate, type OverviewLeadPillId } from "@/lib/overview";
import {
  persistWorkspaceCookie,
  resolveWorkspaceMode,
  workspaceHome,
  type WorkspaceMode,
} from "@/lib/workspace";

export const WORKSPACE_SWITCHER = {
  label: USER_MENU.workspace,
  heading: "Workspaces",
  close: "Close workspaces",
} as const;

export const WORKSPACE_SWITCHER_ABSENT = [
  "All Accounts",
  "Referrals",
  "Refer a friend",
  "billing",
  "Manage courses",
  "Settings",
  "Catalog",
  "Courses",
  "Social workspace",
  "News",
  "Industry news",
] as const;

export const WORKSPACE_SWITCHER_SHORT_LABELS = ["Agg", "Edu"] as const;

// Portaled above dest chips + Education under-nav search. Header
// backdrop-blur traps in-flow z-50 under those rows — do not keep
// the menu `absolute` inside the lead stack. Gap is --space-2.
export const WORKSPACE_SWITCHER_MENU_GAP_PX = 8;

export const WORKSPACE_SWITCHER_CHROME_CLEARANCE_SELECTOR =
  "[data-house-under-nav]";

export const WORKSPACE_SWITCHER_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;

export const WORKSPACE_SWITCHER_SHEET_SURFACE_CLASS = APP_SHEET_SURFACE_CLASS;

export const WORKSPACE_SWITCHER_SHEET_SCRIM_CLASS = APP_SHEET_SCRIM_CLASS;

export const WORKSPACE_SWITCHER_PANEL_SURFACE_CLASS =
  "flex min-w-[16rem] flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface py-[var(--space-2)] shadow-none";

export const WORKSPACE_SWITCHER_PANEL_CLASS =
  `fixed z-50 ${WORKSPACE_SWITCHER_PANEL_SURFACE_CLASS}`;

export function workspaceSwitcherMenuTopPx(
  triggerBottom: number,
  chromeBottoms: readonly number[] = [],
  gapPx: number = WORKSPACE_SWITCHER_MENU_GAP_PX,
): number {
  return Math.max(triggerBottom, ...chromeBottoms, 0) + gapPx;
}

export function workspaceSwitcherMenuStyle({
  trigger,
  chromeBottoms = [],
  viewportWidth,
}: {
  trigger: { bottom: number; left: number; right: number };
  chromeBottoms?: readonly number[];
  viewportWidth: number;
}): { top: number; right: number } {
  const top = workspaceSwitcherMenuTopPx(trigger.bottom, chromeBottoms);
  return { top, right: Math.max(0, viewportWidth - trigger.right) };
}

export function workspaceSwitcherChromeClearanceBottoms(
  root: ParentNode | null | undefined = typeof document === "undefined" ? null : document,
): number[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll(WORKSPACE_SWITCHER_CHROME_CLEARANCE_SELECTOR)).map(
    (node) => node.getBoundingClientRect().bottom,
  );
}

export const WORKSPACE_SWITCHER_HEADER_CLASS =
  "px-[var(--space-4)] pb-[var(--space-1)] pt-[var(--space-2)] t-label text-ink-3";

/** Sporty Blue check on the current Layer 1 tile. */
export const WORKSPACE_SWITCHER_OPTION_CHECK_CLASS = "text-accent";

// Phone header stays space-3. Desktop trailing utilities are space-4 (16).
// Not a 12–16 band and not an invented px. Phone dock glyphs are not this gap.
// docs/design-locks/social-home-density-craft-sequel-lock-v1.md
export const APP_HEADER_TRAILING_CLUSTER_CLASS =
  "flex min-w-0 items-center gap-[var(--space-3)] md:gap-[var(--space-4)] max-md:shrink-0";

export const APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS = HOUSE_LEAD_UNDER_NAV_CLASS;

export const APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS = HOUSE_LEAD_SEARCH_DESKTOP_CLASS;

export const APP_HEADER_LEADING_CLASS =
  "mr-auto flex min-w-0 flex-1 items-center gap-[var(--space-3)] md:gap-[var(--space-2)] overflow-visible";

export const WORKSPACE_SWITCHER_HOST_CLASS = "relative min-w-0 overflow-visible";

// Desktop md+ sliding row. Parent display:none below md; contents so
// the track is a trailing-cluster flex item from md up. Pre-#699 slot.
export const APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS = "hidden md:contents";

// Waffle is the phone/tablet face. Hidden from md up.
export const APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS = "shrink-0 md:hidden";

// Desktop segmented track — one continuous muted bar, sliding accent
// thumb. Same grammar as Top Performing. Full words. shrink-0.
// Hide unavailable lanes in the caller options. No Layer 2 labels.
export const WORKSPACE_SWITCHER_SEGMENTS_CLASS = HOUSE_SEGMENTED_TRACK_CLASS;

export const WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS = HOUSE_SEGMENTED_THUMB_CLASS;

export const WORKSPACE_SWITCHER_SEGMENT_CLASS = HOUSE_SEGMENTED_ITEM_BASE_CLASS;

export const WORKSPACE_SWITCHER_SEGMENT_LABEL_CLASS = "whitespace-nowrap";

export const WORKSPACE_SWITCHER_SEGMENT_ON_CLASS = HOUSE_SEGMENTED_ITEM_ON_CLASS;

export const WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS = HOUSE_SEGMENTED_ITEM_OFF_CLASS;

export const WORKSPACE_SWITCHER_STATIC_CLASS =
  "flex min-w-0 items-center px-2 py-1 t-body-sm font-medium text-ink";

export function workspaceSwitcherOptions(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): readonly WorkspaceMenuOption[] {
  return options;
}

/** Layer 1 waffle order. Entitlement stays on `options` — omit a lane to hide it. */
export const WORKSPACE_WAFFLE_ORDER = [
  "social",
  "education",
  "aggregation",
  "staff",
] as const satisfies readonly WorkspaceMode[];

export const WORKSPACE_WAFFLE_FORBIDDEN_LABELS = [
  "Home",
  "Explore",
  "Create",
  "Messages",
  "Profile",
] as const;

/** Quiet circular hit — same box as the bell. Open wash is muted, not accent fill. */
export const WORKSPACE_WAFFLE_TRIGGER_CLASS =
  `${HOUSE_THEME_TOGGLE_CLASS} relative hover:bg-surface-muted`;

export const WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS = "bg-surface-muted";

export const WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS =
  `${WORKSPACE_SWITCHER_PANEL_CLASS} max-md:hidden`;

export const WORKSPACE_WAFFLE_GRID_CLASS =
  "grid grid-cols-2 gap-[var(--space-2)] px-[var(--space-2)] pb-[var(--space-2)]";

export const WORKSPACE_WAFFLE_TILE_CLASS =
  "relative flex min-h-16 flex-col items-center justify-center gap-[var(--space-1)] rounded-[12px] px-[var(--space-2)] py-[var(--space-3)] text-center t-body-sm text-ink";

export const WORKSPACE_WAFFLE_TILE_CURRENT_CLASS = "bg-surface-muted";

export const WORKSPACE_WAFFLE_TILE_LABEL_CLASS = "whitespace-normal";

export const WORKSPACE_WAFFLE_ICON_CLASS = "size-6 shrink-0";

export function workspaceSwitcherSegmentClass(selected: boolean): string {
  return selected
    ? `${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_ON_CLASS}`
    : `${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS}`;
}

export function workspaceSwitcherSegmentTabIndex(selected: boolean): number {
  return selected ? 0 : -1;
}

export function workspaceSwitcherNextSegmentIndex(
  index: number,
  count: number,
  direction: 1 | -1,
): number {
  if (count <= 0) return 0;
  return (index + direction + count) % count;
}

/** Desktop slider segments. Same lanes, order, and gate as the waffle. */
export function workspaceSliderSegments(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): WorkspaceMenuOption[] {
  return workspaceWaffleTiles(options);
}

export function workspaceWaffleTiles(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): WorkspaceMenuOption[] {
  const byMode = new Map(options.map((option) => [option.mode, option]));
  const tiles: WorkspaceMenuOption[] = [];
  for (const mode of WORKSPACE_WAFFLE_ORDER) {
    const option = byMode.get(mode);
    if (option) tiles.push(option);
  }
  return tiles;
}

/**
 * Dest for a waffle tile click, or null when the shell is already there.
 * Pending chrome is not arrival — a dropped push must stay clickable.
 * `workspace` is the cookie/clamped lane, not the optimistic active path.
 */
export function workspacePillClickDest(input: {
  shellPath: string;
  workspace: WorkspaceMode;
  pill: { id: OverviewLeadPillId; href: string };
  options: readonly { mode: WorkspaceMode }[];
}): string | null {
  const mode = resolveWorkspaceMode(input.shellPath, input.workspace);
  if (!overviewLeadShouldNavigate(input.shellPath, mode, input.pill)) return null;
  if (input.pill.id === "home" || input.pill.id === "co-productions") return input.pill.href;
  const option = input.options.find((row) => row.mode === input.pill.id);
  if (!option) return null;
  return workspaceHome(option.mode);
}

/** Persist the workspace cookie for a lane hop. Home and Co-Productions do not write. */
export function workspaceSwitcherPersistLane(
  id: OverviewLeadPillId,
  isGcStaff?: boolean,
): void {
  if (id === "home" || id === "co-productions") return;
  persistWorkspaceCookie(id, isGcStaff);
}

export function phoneWorkspaceSwitcherPrefetchHrefs(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): string[] {
  return workspaceWaffleTiles(options).map((tile) => tile.href);
}
