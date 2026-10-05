// Header workspace switch. Lives in lib/, not JSX.
// the shell register lock v1 in docs/design-locks (Adam 2026-10-05)
// docs/design-locks/shell-unified-chrome-lock-v1.md (inventory, keyboard)
// docs/design-locks/shell-workspace-waffle-layer-lock-v1.md
// One Layer 1 inventory. Two faces by width (lg = 1024).
// Desktop lg+: the primary pill slider in the header LEADING slot:
// Home · Aggregation · Social · Education · Staff (when isGcStaff,
// last). Home is a real segment — /home, no workspace cookie, lit on
// /home and /home/news. The slider is the house SegmentedTrack: a muted
// track with no inset, an ink thumb that slides 220ms ease-out to the
// chosen segment, labels 17 / 600 (ink idle, the page colour on the
// thumb), segments 44 tall with 16 side pads, aria-current="page" on
// the lit one. Supersedes the screening chrome's text lanes.
// Phone and md to lg: the grey workspace pill right after the emblem
// (or first in the bar from md), a filled grid and the current
// workspace's name (15 / 600, ink); it opens the sheet (phone) or the
// popover (md to lg). Below 360 the pill is the grid alone. Waffle
// tiles use the slider's order: Aggregation · Social · Education ·
// Staff (when isGcStaff).
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
// Leading air is --space-2 (8): emblem → pill on phone. Not
// --space-1. Do not put overflow-hidden on the leading row (#412).
// Phone trailing: [search if needed] [24Frame AI] [bell] [account].
// No header sun/moon. Phone hits 4 apart; desktop
// md:gap-[var(--space-2)] (8). Phone AI/bell/search hug
// --header-control-size. Do not cancel that hug with -mx.
// #452 stacked AI on the bell. Theme is the avatar drill to
// /settings/preferences/theme. No header glyph writes gc-theme.
// Ask 24Frame AI sits immediately left of the
// bell and opens the Mercury overlay. Ask AI is header + Home
// module only (#465). Do not reintroduce a dest hamburger.
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
// trailing slot (the same grey pill as Social).
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
} from "@/lib/house-lead-chrome";
import {
  HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_ON_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS,
  HOUSE_PILL_SLIDER_THUMB_CLASS,
  HOUSE_PILL_SLIDER_THUMB_DURATION_MS,
  HOUSE_PILL_SLIDER_TRACK_CLASS,
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
  overviewLeadActiveIndex,
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

// Phone trailing hits are 4 apart (the board's 4); desktop trailing
// controls are --space-2 (8) apart. Desktop the cluster may shrink (the
// search pill gives first, down to 240); the leading slider never does.
export const APP_HEADER_TRAILING_CLUSTER_CLASS =
  "flex min-w-0 items-center gap-[var(--space-1)] md:gap-[var(--space-2)] max-md:shrink-0";

export const APP_HEADER_EDUCATION_SEARCH_PHONE_CLASS = HOUSE_LEAD_UNDER_NAV_CLASS;

export const APP_HEADER_EDUCATION_SEARCH_DESKTOP_CLASS = HOUSE_LEAD_SEARCH_DESKTOP_CLASS;

// Leading row: phone 8 (emblem → pill), desktop 16 (brand mark →
// switcher → Exit). Phone it is the bar's flex-1; md+ it is its own
// width and never shrinks, so the trailing cluster gives way instead.
export const APP_HEADER_LEADING_CLASS =
  "mr-auto flex min-w-0 flex-1 items-center gap-[var(--space-2)] overflow-visible md:flex-none md:shrink-0 md:gap-[var(--space-4)]";

export const WORKSPACE_SWITCHER_HOST_CLASS = "relative min-w-0 overflow-visible";

// Desktop lg+ slider. Parent display:none below lg; contents so the
// slider is a leading-slot flex item from lg up.
export const APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS = "hidden lg:contents";

// The grey workspace pill is the phone and md–lg face, in the leading
// row (after the emblem on phone). Hidden from lg up.
export const APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS = "shrink-0 lg:hidden";

// Primary pill slider (H register §3.1; founder 2026-10-05).
// The house SegmentedTrack: muted track, radius full, NO inset (the
// thumb is the full track height). The thumb is ink (the board's
// thumb) and slides 220ms ease-out (the register lock's listed motion).
// Labels 17 / 600, 44 tall, 16 side pads, never truncated; ink idle,
// the page colour on the thumb (the board's onThumb). The label ink
// snaps with the thumb's index (no colour transition), as every house
// SegmentedTrack. Dark: the thumb and labels flip with --text / --bg.
// One pattern: the house primary pill slider (HOUSE_PILL_SLIDER_*),
// shared with the Feed's Following / For you.
export const WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS = HOUSE_PILL_SLIDER_TRACK_CLASS;

export const WORKSPACE_SWITCHER_SLIDER_THUMB_DURATION_MS = HOUSE_PILL_SLIDER_THUMB_DURATION_MS;

export const WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS = HOUSE_PILL_SLIDER_THUMB_CLASS;

// The lit segment paints the thumb's ink until the thumb is placed
// (HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS), so "Social" reads on the
// server paint.
export const WORKSPACE_SWITCHER_SEGMENT_CLASS =
  `relative z-10 inline-flex h-[var(--header-control-size)] shrink-0 cursor-pointer select-none items-center whitespace-nowrap rounded-full px-[var(--space-4)] text-[length:var(--text-base)] font-semibold ${HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS}`;

export const WORKSPACE_SWITCHER_SEGMENT_ON_CLASS = HOUSE_PILL_SLIDER_SEGMENT_ON_CLASS;

export const WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS = HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS;

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

/** Grey workspace pill (phone and md to lg): 44 tall, radius full,
 *  muted, pad 12 / 16, an 18 filled grid, 8, then the current
 *  workspace's name at 15 / 600 ink. Hugs its content — never a fixed
 *  width, never truncated. Below 360 the name steps out (still the
 *  accessible name) and the pill is a 44 circle; where no lane is lit
 *  (Settings, Activity, Help, Co-Productions) it is the 44 circle too.
 *  Open steps the fill to the hairline grey. */
export const WORKSPACE_WAFFLE_TRIGGER_CLASS =
  "relative flex h-[var(--header-control-size)] min-w-[var(--header-control-size)] shrink-0 items-center justify-center gap-[var(--space-2)] whitespace-nowrap rounded-full bg-surface-muted pl-[var(--space-3)] pr-[var(--space-4)] text-[length:var(--text-sm)] font-semibold text-ink transition-colors hover:bg-hairline max-[359px]:w-[var(--header-control-size)] max-[359px]:px-0";

export const WORKSPACE_WAFFLE_TRIGGER_BARE_CLASS = "w-[var(--header-control-size)] px-0";

export const WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS = "bg-hairline";

export const WORKSPACE_WAFFLE_TRIGGER_ICON_CLASS = "size-[18px] shrink-0";

export const WORKSPACE_WAFFLE_TRIGGER_ICON_WEIGHT = "fill" as const;

/** The visible name on the pill; it steps out below 360 so the bar fits
 *  at 320 (the accessible name keeps it). */
export const WORKSPACE_WAFFLE_TRIGGER_NAME_CLASS = "max-[359px]:hidden";

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

export function workspaceSwitcherSegmentClass(on: boolean): string {
  return `${WORKSPACE_SWITCHER_SEGMENT_CLASS} ${on ? WORKSPACE_SWITCHER_SEGMENT_ON_CLASS : WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS}`;
}

/**
 * The workspace pill's visible name: the segment the desktop slider
 * lights on this path (Home on /home and /home/news, otherwise the
 * workspace), or null where none is lit (Settings, Activity, Help,
 * Co-Productions) — the pill is then the grid alone. One source of
 * truth with the slider's thumb (overviewLeadActiveIndex).
 */
export function workspaceSwitcherTriggerName(
  pathname: string,
  workspace: WorkspaceMode,
  options: readonly WorkspaceMenuOption[] = availableWorkspaceOptions(),
): string | null {
  const lanes = workspaceSliderSegments(options);
  const index = overviewLeadActiveIndex(pathname, resolveWorkspaceMode(pathname, workspace), lanes);
  return index < 0 ? null : (lanes[index]?.label ?? null);
}

/** Accessible name: the visible workspace name first, then "Workspaces". */
export function workspaceSwitcherTriggerLabel(name: string | null): string {
  return name ? `${name}, ${WORKSPACE_SWITCHER.heading}` : WORKSPACE_SWITCHER.heading;
}

/**
 * Roving tab stop: exactly one segment is tabbable. The lit segment
 * owns it; on a route that lights none (Settings, Activity, Help,
 * Co-Productions) the first segment (Home) does, so a keyboard user
 * can still reach the desktop slider (the pill is lg:hidden).
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
