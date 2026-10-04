// Header workspace switch. Lives in lib/, not JSX.
// docs/design-locks/shell-unified-chrome-lock-v1.md (Adam 2026-10-04)
// docs/design-locks/shell-workspace-waffle-layer-lock-v1.md
// One Layer 1 inventory. Two faces by host (md = 768).
// Desktop md+: sliding segmented row in the header LEADING slot,
// right after the brand mark: Home · Aggregation · Social ·
// Education · Staff (when isGcStaff, last). Home is a real
// segment — /home, no workspace cookie, lit on /home and
// /home/news. Raised surface thumb, ink label, muted track.
// Phone/tablet max-md: icon-only waffle in the trailing utility
// cluster — search · optional (Ask) · bell · waffle · avatar.
// No labeled Social pill. No workspace-name dropdown. No slider
// on the phone. Waffle tiles use the slider's lane order:
// Aggregation · Social · Education · Staff (when isGcStaff).
// Hide lanes the caller omits. No dead tiles. Social Layer 2
// dests stay out of the tiles and the slider (Feed / Explore /
// Create / Messages / Profile). Account / Settings / Help stay on
// the avatar menu. Phone face is the existing app sheet.
// Phone sheet: Home is quiet header-exit chrome under the
// sheet top — ArrowLeft (page-lead back) + "Home", text-sm, muted.
// No house glyph. No banner fill and no full-width bar. Exact
// /home gets a tiny muted check.
// Not a waffle tile and not a Social dock tab. WORKSPACES + the
// 2×2 sit below. Dock dests stay in-workspace only.
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
// Desktop md+ hosts the sliding segmented row (hidden md:contents)
// in the leading slot. The labeled workspace pill stays retired.
// Do not restore tone="pill". No rail / header-lead #321 duplicate.
// Do not invent Move / search.
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
// Link + prefetch. That full prefetch belongs to the anchor; closing
// the sheet unmounts it and cancels the task, so a fast Staff or
// Aggregation tap still waits on the dynamic RSC. Mount
// prefetchHrefList is AUTO — loading.js only. Intent prefetch is
// router-owned and kind full: waffle pointerdown, open, and tile
// pointerdown / enter. Skip the current land. Painted lands still
// soft-swap through HouseLink. Do not router.push over that.
// Do not invent /education, /account/workspace, or /settings/workspace.

import {
  HOUSE_LEAD_SEARCH_DESKTOP_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_SEGMENTED_ITEM_OFF_CLASS,
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
import {
  OVERVIEW_HREF,
  OVERVIEW_PAGE,
  overviewLeadShouldNavigate,
  type OverviewLeadPill,
  type OverviewLeadPillId,
} from "@/lib/overview";
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

// Phone sheet rhythm, variant C. The sheet surface already pads
// --space-4 (16), so this label does not add a second side inset.
// pt --space-3 (12) plus the exit's pb --space-1 (4) is 16 after
// Home — no 14 token; the next step above the previous 12.
// pb --space-3 (12) is the gap before the grid. Weight and color
// stay t-label / text-ink-3.
export const WORKSPACE_SWITCHER_HEADER_CLASS =
  "pb-[var(--space-3)] pt-[var(--space-3)] t-label text-ink-3";

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
// the track is a leading-slot flex item from md up, right after the
// brand mark.
export const APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS = "hidden md:contents";

// Waffle is the phone/tablet face. Hidden from md up.
export const APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS = "shrink-0 md:hidden";

// Desktop workspace track — switcher-only variant (Adam 2026-10-04,
// shell-unified-chrome-lock-v1). Muted bar with a --space-1 inset;
// the thumb is a raised surface pill with the soft house elevation
// and the label stays ink. Dark: the muted track stays and the thumb
// lifts one ramp stop (hairline). Other SegmentedTracks keep the
// accent thumb — do not fold this back into HOUSE_SEGMENTED_*.
// Full words, never truncated. Items are --space-2 side pad below
// lg so five lanes + search · Ask · bell · avatar fit at 768, and
// --space-4 from lg. shrink-0.
export const WORKSPACE_SWITCHER_SEGMENTS_CLASS =
  `${HOUSE_SEGMENTED_TRACK_CLASS} p-[var(--space-1)]`;

export const WORKSPACE_SWITCHER_SEGMENTS_THUMB_CLASS =
  "pointer-events-none absolute inset-y-[var(--space-1)] rounded-full bg-surface shadow-[var(--elevation)] dark:bg-hairline transition-[left,width] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

export const WORKSPACE_SWITCHER_SEGMENT_CLASS =
  "relative z-10 inline-flex shrink-0 cursor-pointer select-none items-center whitespace-nowrap rounded-full px-[var(--space-2)] py-[var(--space-2)] t-body-sm lg:px-[var(--space-4)]";

export const WORKSPACE_SWITCHER_SEGMENT_ON_CLASS = "text-ink";

export const WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS = HOUSE_SEGMENTED_ITEM_OFF_CLASS;

export function workspaceSwitcherOptions(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): readonly WorkspaceMenuOption[] {
  return options;
}

/**
 * Layer 1 lane order — the desktop slider after Home and the phone
 * waffle tiles. Entitlement stays on `options` — omit a lane to hide it.
 */
export const WORKSPACE_WAFFLE_ORDER = [
  "aggregation",
  "social",
  "education",
  "staff",
] as const satisfies readonly WorkspaceMode[];

/** Social Layer 2 dock labels plus Home. Never waffle tiles. */
export const WORKSPACE_WAFFLE_FORBIDDEN_LABELS = [
  "Home",
  "Feed",
  "Explore",
  "Create",
  "Messages",
  "Profile",
] as const;

/**
 * House homepage — the industry news feed lives on this route. First
 * desktop slider segment and the phone sheet's header exit. Not a
 * waffle tile. Social's own Feed stays /social.
 */
export const WORKSPACE_WAFFLE_HOME = {
  id: "home",
  label: OVERVIEW_PAGE.title,
  href: OVERVIEW_HREF,
} as const;

// Phone sheet header exit. Hugs its label — not a list bar.
// Idle is muted; exact /home steps up one ink stop. No fill.
// No horizontal pad: the sheet's --space-4 is the side inset, so
// the chevron lines up with WORKSPACES and the tiles.
export const WORKSPACE_WAFFLE_HOME_EXIT_CLASS =
  "inline-flex w-fit max-w-full items-center gap-[var(--space-2)] self-start py-[var(--space-1)] text-left t-body-sm";

export const WORKSPACE_WAFFLE_HOME_EXIT_IDLE_CLASS = "text-ink-3";

export const WORKSPACE_WAFFLE_HOME_EXIT_CURRENT_CLASS = "text-ink-2";

/** Page-lead back arrow. Same 16px box as PageHeader ArrowLeft. */
export const WORKSPACE_WAFFLE_HOME_ICON_CLASS = "size-4 shrink-0";

/** Muted mark on the header exit. Not the accent tile check. */
export const WORKSPACE_WAFFLE_HOME_CHECK_CLASS = "size-3 shrink-0 text-ink-3";

/** Quiet circular hit — same box as the bell. Open wash is muted, not accent fill. */
export const WORKSPACE_WAFFLE_TRIGGER_CLASS =
  `${HOUSE_THEME_TOGGLE_CLASS} relative hover:bg-surface-muted`;

export const WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS = "bg-surface-muted";

// Same tiles, no sheet pad. --space-4 keeps the side inset once
// the shared rows stop adding their own.
export const WORKSPACE_WAFFLE_DESKTOP_PANEL_CLASS =
  `${WORKSPACE_SWITCHER_PANEL_CLASS} px-[var(--space-4)] max-md:hidden`;

// Variant C. gap --space-3 (12). No extra px — the sheet pad is the
// 16 side inset. pb --space-4 (16) plus that pad is the modest close.
export const WORKSPACE_WAFFLE_GRID_CLASS =
  "grid grid-cols-2 gap-[var(--space-3)] pb-[var(--space-4)]";

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

/**
 * Roving tab stop: exactly one segment is tabbable. The lit segment
 * owns it; on a route that lights none (Settings, Activity, Help,
 * Co-Productions) the first segment (Home) does, so a keyboard user
 * can still reach the desktop switcher (the waffle is md:hidden).
 */
export function workspaceSwitcherSegmentTabIndex(
  index: number,
  selectedIndex: number,
  count: number,
): number {
  const lit = selectedIndex >= 0 && selectedIndex < count;
  if (lit) return index === selectedIndex ? 0 : -1;
  return index === 0 ? 0 : -1;
}

export function workspaceSwitcherNextSegmentIndex(
  index: number,
  count: number,
  direction: 1 | -1,
): number {
  if (count <= 0) return 0;
  return (index + direction + count) % count;
}

/**
 * Desktop slider segments: Home first, then the waffle lanes in the
 * same order and gate (Aggregation · Social · Education · Staff).
 */
export function workspaceSliderSegments(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): OverviewLeadPill[] {
  return [
    { ...WORKSPACE_WAFFLE_HOME },
    ...workspaceWaffleTiles(options).map((tile) => ({
      id: tile.mode,
      label: tile.label,
      href: tile.href,
    })),
  ];
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

/**
 * Phone sheet Home exit dest, or null when the shell is already on
 * exact /home. /home/news still returns /home. Does not write the
 * workspace cookie.
 */
export function workspaceWaffleHomeDest(
  shellPath: string,
  workspace: WorkspaceMode,
): string | null {
  return workspacePillClickDest({
    shellPath,
    workspace,
    pill: { id: WORKSPACE_WAFFLE_HOME.id, href: WORKSPACE_WAFFLE_HOME.href },
    options: [],
  });
}

/** Persist the workspace cookie for a lane hop. Home and Co-Productions do not write. */
export function workspaceSwitcherPersistLane(
  id: OverviewLeadPillId,
  isGcStaff?: boolean,
): void {
  if (id === "home" || id === "co-productions") return;
  persistWorkspaceCookie(id, isGcStaff);
}

/**
 * One lane hop for a slider segment or a waffle tile. Home goes to
 * /home and writes no cookie; a workspace lane writes the existing
 * cookie first. `navigate` is the host's pending + router hop.
 * Returns the dest, or null when the shell is already there.
 */
export function selectWorkspaceLane(input: {
  shellPath: string;
  workspace: WorkspaceMode;
  lane: { id: OverviewLeadPillId; href: string };
  options: readonly { mode: WorkspaceMode }[];
  isGcStaff?: boolean;
  navigate: (dest: string) => void;
}): string | null {
  const dest = workspacePillClickDest({
    shellPath: input.shellPath,
    workspace: input.workspace,
    pill: input.lane,
    options: input.options,
  });
  if (!dest) return null;
  workspaceSwitcherPersistLane(input.lane.id, input.isGcStaff);
  input.navigate(dest);
  return dest;
}

export function phoneWorkspaceSwitcherPrefetchHrefs(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): string[] {
  return [
    WORKSPACE_WAFFLE_HOME.href,
    ...workspaceWaffleTiles(options).map((tile) => tile.href),
  ];
}

/** Next router.prefetch kind. AUTO warms loading.js. Full fetches the RSC. */
export const WORKSPACE_WAFFLE_INTENT_PREFETCH_KIND = "full" as const;

/**
 * Homes a waffle tap can open, minus the land already showing.
 * Staff is included only when `options` already entitled it.
 */
export function workspaceWaffleIntentPrefetchHrefs(
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
  current?: WorkspaceMode,
): string[] {
  return workspaceWaffleTiles(options)
    .filter((tile) => tile.mode !== current)
    .map((tile) => tile.href);
}

export function prefetchWorkspaceWaffleIntent(
  prefetch: (href: string, options: { kind: typeof WORKSPACE_WAFFLE_INTENT_PREFETCH_KIND }) => void,
  hrefs: readonly string[],
): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const href of hrefs) {
    if (seen.has(href)) continue;
    seen.add(href);
    unique.push(href);
    prefetch(href, { kind: WORKSPACE_WAFFLE_INTENT_PREFETCH_KIND });
  }
  return unique;
}
