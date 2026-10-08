// Shared phone app-shell — IA A (Adam lock: dests in the dock).
// One primitive for Home · Aggregation · Social · Education · Staff.
// Desktop header + desktop workspace slider stay on HouseLeadChrome.
// Phone header (H register, Adam 2026-10-05,
// the shell register lock v1 in docs/design-locks): emblem, then
// the grey workspace pill naming the current workspace, then trailing
// utilities (search · Ask · bell · account) as round grey 44s and the
// 44 avatar photo. No workspace item in the dock.
// Avatar stays Settings / account — not a second workspace door.
// Destinations live in the Mercury floating dock (in-workspace
// only). Social dest order is Feed · Explore · Create ·
// Messages · Profile (Adam lock 2026-09-20; Feed label Adam
// 2026-10-04) — same SOCIAL_NAV SoT as the desktop Social rail.
// Create sits center as a 44 accent circle inside the pill and opens
// the fan. Feed is /social; the Home workspace keeps "Home".
// Create is Social-only. Aggregation · Education · Home each
// keep their own dests. Dock hops use the
// house pending / prefetch SoT — prefetchHrefList on mount,
// optimistic dest light on tap. No under-top dest chip rail. No
// peer workspace pill rail.
// Phone OS dark is not the product theme. One house SoT.
// Theme is the avatar drill. No header sun/moon.
// Ask AI is header + Home module only (#465).
// Craft: one floating pill, 56 tall, the house surface fill, NO
// hairline, the restrained --elevation-float (the product's only
// shadow). No frost. No satellite FAB. No second float.
// H register (Adam 2026-10-05) supersedes the screening chrome's ink mark:
// in every dock (Home · Aggregation · Social · Education · Staff)
// the current dest is the FILLED glyph painted accent — the phone form
// of the desktop side menu's current row (blue and filled). The filled
// shape carries the state without colour (WCAG 1.4.1). No dot, no
// chip. Idle glyphs are Regular on the quiet ink. Each target fills
// the 56 pill row. Messages carries an 8 accent unread dot with a 2px
// ring in the dock's surface at the glyph's top-right. Glyph boxes
// ride TWO independent size SoT tokens: the dock glyph (24,
// HOUSE_PHONE_CHROME_ICON_CLASS) and the header glyph (20,
// HOUSE_HEADER_ROUND_GLYPH_CLASS) — never aliases. The Ask 24Frame AI
// sparkle is accent (HOUSE_ASK_AI_MARK_INK_CLASS, Adam 2026-10-04,
// "Blue, as in the mockup").
// House tokens only. Hide on scroll-down / show on scroll-up via
// social-tab-bar-scroll. Content pad stays when the bar hides.
// Not a Meta skin. Not Mercury lavender.

import { BookOpen, FilmStrip, House, Newspaper, Users, type IconWeight } from "@phosphor-icons/react";

import {
  isClientNavActive,
  isHouseAiNavItem,
  isPhosphorNavItem,
  isSocialCreateDest,
  isSocialTabActive,
  mobileNavDestinations,
  type NavItem,
  type PhosphorNavItem,
} from "@/lib/nav";
import { NEWS_HREF, NEWS_PAGE } from "@/lib/news";
import {
  OVERVIEW_HREF,
  OVERVIEW_PAGE,
  overviewLeadSelected,
  type OverviewLeadPillId,
} from "@/lib/overview";
import { type PhosphorIcon } from "@/lib/phosphor-icon";
import {
  WORKSPACE_AGGREGATION_LABEL,
  WORKSPACE_SOCIAL_LABEL,
} from "@/lib/product";
import {
  WORKSPACE_EDUCATION_HREF,
  WORKSPACE_EDUCATION_LABEL,
  WORKSPACE_STAFF_LABEL,
} from "@/lib/workspace-menu";
import {
  HOUSE_PHONE_DOCK_CHROME_PB_CLASS,
  HOUSE_PHONE_DOCK_CLEARANCE,
} from "@/lib/house-phone-dock";
import { HOUSE_SHELL_QUIET_INK_CLASS } from "@/lib/house-shell";
import {
  HOUSE_PHONE_NAV_PRESS_GROUP_CLASS,
  HOUSE_PHONE_NAV_THUMB_MOTION_CLASS,
} from "@/lib/house-phone-nav-motion";
import { workspaceHome, type WorkspaceMode } from "@/lib/workspace";

export { HOUSE_PHONE_DOCK_CLEARANCE };

export type HousePhoneWorkspaceId = Exclude<OverviewLeadPillId, "co-productions">;

export type HousePhoneWorkspaceTab = {
  id: HousePhoneWorkspaceId;
  label: string;
  href: string;
  icon: PhosphorIcon;
};

export const HOUSE_PHONE_WORKSPACE_TABS = [
  { id: "home" as const, label: OVERVIEW_PAGE.title, href: OVERVIEW_HREF, icon: House },
  {
    id: "aggregation" as const,
    label: WORKSPACE_AGGREGATION_LABEL,
    href: workspaceHome("aggregation"),
    icon: FilmStrip,
  },
  {
    id: "social" as const,
    label: WORKSPACE_SOCIAL_LABEL,
    href: workspaceHome("social"),
    icon: Users,
  },
  {
    id: "education" as const,
    label: WORKSPACE_EDUCATION_LABEL,
    href: WORKSPACE_EDUCATION_HREF,
    icon: BookOpen,
  },
] as const satisfies readonly HousePhoneWorkspaceTab[];

export const HOUSE_PHONE_BOTTOM_NAV = {
  label: "Destinations",
} as const;

export const HOUSE_PHONE_DEST_CHIPS = {
  label: "Destinations",
} as const;

/** Phone-only float. The pill sits 16 off the bottom and 16 from each
 *  side (the board), or on the safe area when that is larger. Content
 *  pad is HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS, whose clearance follows
 *  this float and the 56 pill. */
export const HOUSE_PHONE_BOTTOM_NAV_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex justify-center px-[var(--space-4)] pb-[max(16px,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out md:hidden";

export const HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS = "pointer-events-none translate-y-full";

/** The pill: 56 (h-14), radius full, the dock surface, NO hairline,
 *  the soft float (the only UI shadow). No inner pad: five equal slots. */
export const HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS =
  "flex h-14 w-full max-w-[420px] items-center rounded-full bg-surface shadow-[var(--elevation-float)]";

// The row fills the pill, so every dock target is 56 tall and at least
// 44 wide at 320. It is the dock's SegmentedTrack: the current dest's
// soft pill is its thumb (shell-phone-nav-motion-lock-v1).
export const HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS = "relative flex h-full w-full items-center";

/** The current dest's pill: 64 × 48, the muted surface, centred in the
 *  dest's slot, sliding to the tapped dest and settling. The thumb spans
 *  the slot; the pill is its ::after, so it keeps 64 on a two-dest dock. */
export const HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS = `pointer-events-none absolute inset-y-1 after:absolute after:inset-y-0 after:left-1/2 after:w-16 after:-translate-x-1/2 after:rounded-full after:bg-surface-muted after:content-[''] ${HOUSE_PHONE_NAV_THUMB_MOTION_CLASS}`;

// Five equal slots, as on the board (each link flex:1, no pad). The
// Create slot is the fan's anchor (SOCIAL_CREATE_FAN_ANCHOR_CLASS),
// which carries no pad either: a pad on the links alone floors their
// flex base at the pad and leaves Create's slot narrower.
export const HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS =
  `relative flex h-full min-w-0 flex-1 items-center justify-center ${HOUSE_PHONE_NAV_PRESS_GROUP_CLASS}`;

/** Current dest: the filled glyph in accent, on the sliding pill
 *  (HOUSE_PHONE_BOTTOM_NAV_THUMB_CLASS). No dot. */
export const HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS = "text-accent";

/** Phone dock glyph — 24px box.
 *  Own literal, not an alias of the header glyph class. */
export const HOUSE_PHONE_CHROME_ICON_CLASS = "size-6 shrink-0";

/** Header round-button glyph — 20px box, phone and desktop (search,
 *  Ask, bell). Its value is a standalone literal, not an alias of
 *  HOUSE_PHONE_CHROME_ICON_CLASS, so a dock resize cannot leak into the
 *  header. The ink is the button's (ink); the Ask sparkle carries its
 *  own accent. Tap stays 44. */
export const HOUSE_HEADER_ROUND_GLYPH_CLASS = "size-5 shrink-0";

/** Alias kept for the 20 header glyph (search sheet, wave-1 locks). */
export const HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS = HOUSE_HEADER_ROUND_GLYPH_CLASS;

/** One phone chrome stroke register — dock idle + header glyphs. */
export const HOUSE_PHONE_CHROME_ICON_WEIGHT = "regular" satisfies IconWeight;

/** Quiet secondary ink (ink-2).
 *  Amended Adam 2026-10-04 ("Blue, as in the mockup"): the Ask 24Frame AI
 *  sparkle left this ink for accent (HOUSE_ASK_AI_MARK_INK_CLASS). H
 *  register: header glyphs take the round button's ink; this stays for
 *  the legacy search-sheet trigger. */
export const HOUSE_PHONE_CHROME_IDLE_INK_CLASS = "text-ink-2";

/** Idle dock glyph: the board's ink3 (HOUSE_SHELL_QUIET_INK_CLASS). */
export const HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS = HOUSE_SHELL_QUIET_INK_CLASS;

/** Current dest glyph weight: Fill (the board's filled glyph). Idle
 *  stays Regular (HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT). */
export const HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT = "fill" satisfies IconWeight;

/** Messages unread, every dock that shows Messages: an 8 accent dot with
 *  a 2px ring in the dock's surface (12 box) at the glyph's top-right.
 *  The count stays in the accessible name. */
export const HOUSE_PHONE_BOTTOM_NAV_UNREAD_DOT_CLASS =
  "pointer-events-none absolute -right-[3px] -top-0.5 size-3 rounded-full border-2 border-surface bg-accent";

/** The glyph's box, so the dot can sit at its top-right. */
export const HOUSE_PHONE_BOTTOM_NAV_GLYPH_HOST_CLASS = "relative inline-flex";

/** Social Create: the dock's only filled control — a 44 accent circle
 *  inside the pill holding a 22 Bold plus (the board's stroke 2.25),
 *  an action, not a place, so never confused with the current glyph.
 *  Create takes no ON/OFF ink. */
export const HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS =
  "flex size-11 items-center justify-center rounded-full bg-accent text-accent-contrast";

export const HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS = "size-[22px] shrink-0";

export const HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_WEIGHT = "bold" satisfies IconWeight;

/** Create on its own route (/social/create, /social/live): a 2px accent
 *  ring 1px off the circle. Box-shadow only — stays inside the pill. */
export const HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS =
  "ring-2 ring-accent ring-offset-1 ring-offset-surface";

/** Header glyph box — 20px. Own literal, not an alias of the dock
 *  class. The dock stays size-6 on its own declaration. */
export const HOUSE_HEADER_TRAILING_ICON_CLASS = "size-5 shrink-0";

/** Ask 24Frame AI sparkle ink — accent, as in the mockup (Adam
 *  2026-10-04, "Blue, as in the mockup"). Ask only: the bell and search
 *  keep the button's ink. Set on the glyph itself so the button's hover
 *  and pressed fill never repaint it. */
export const HOUSE_ASK_AI_MARK_INK_CLASS = "text-accent";

/** The Ask sparkle on phone and desktop: 20, accent, one mark. */
export const HOUSE_ASK_AI_MARK_CLASS = `${HOUSE_HEADER_ROUND_GLYPH_CLASS} ${HOUSE_ASK_AI_MARK_INK_CLASS}`;

/** Bottom nav rides the 24px SoT (HOUSE_PHONE_CHROME_ICON_CLASS).
 *  Idle Regular; the current dest Fill (HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT).
 *  The dock and header size tokens stay two independent literals. */
export const HOUSE_PHONE_BOTTOM_NAV_ICON_CLASS = HOUSE_PHONE_CHROME_ICON_CLASS;

export const HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT = HOUSE_PHONE_CHROME_ICON_WEIGHT;

/** Clears the float once on main. Do not stack a second phone bottom pad on children.
 *  Pad stays when the bar hides so scroll-hide does not jump the page.
 *  Static literal — same length as Explore caption and rail. */
export const HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS = HOUSE_PHONE_DOCK_CHROME_PB_CLASS;

/** Social phone dests are SOCIAL_NAV — Feed · Explore · Create · Messages · Profile. */
export const SOCIAL_PHONE_DESTS = mobileNavDestinations(false, "social");

/** Home-owned dests. Industry news is a Home child, not a workspace. */
export const HOME_PHONE_DESTS = [
  {
    label: OVERVIEW_PAGE.title,
    href: OVERVIEW_HREF,
    family: "phosphor",
    icon: House,
    exact: true,
  },
  {
    label: NEWS_PAGE.title,
    href: NEWS_HREF,
    family: "phosphor",
    icon: Newspaper,
  },
] as const satisfies readonly PhosphorNavItem[];

export function housePhoneWorkspaceSelected(
  id: HousePhoneWorkspaceId,
  pathname: string,
  workspace: WorkspaceMode,
): boolean {
  return overviewLeadSelected(id, pathname, workspace);
}

export function housePhoneWorkspaceHref(id: HousePhoneWorkspaceId): string {
  const tab = HOUSE_PHONE_WORKSPACE_TABS.find((row) => row.id === id);
  return tab?.href ?? OVERVIEW_HREF;
}

export function housePhonePrefetchDestHrefs(items: readonly NavItem[]): string[] {
  return items.map((item) => item.href);
}

export function housePhoneShowsBottomDests({
  workspace,
  homeOwned = false,
  accountChrome = false,
  coProductions = false,
}: {
  workspace: WorkspaceMode;
  homeOwned?: boolean;
  accountChrome?: boolean;
  coProductions?: boolean;
}): boolean {
  if (accountChrome || coProductions) return false;
  if (homeOwned) return true;
  return (
    workspace === "social" ||
    workspace === "aggregation" ||
    workspace === "education" ||
    workspace === "staff"
  );
}

export function housePhoneDestinations(
  isGcStaff: boolean,
  workspace: WorkspaceMode,
): NavItem[] {
  return mobileNavDestinations(isGcStaff, workspace).filter((item) => !isHouseAiNavItem(item));
}

export function housePhoneDockDestinations({
  isGcStaff,
  workspace,
  homeOwned = false,
}: {
  isGcStaff: boolean;
  workspace: WorkspaceMode;
  homeOwned?: boolean;
}): NavItem[] {
  if (homeOwned) return [...HOME_PHONE_DESTS];
  return housePhoneDestinations(isGcStaff, workspace);
}

export function housePhoneDestGlyph(item: NavItem): PhosphorIcon {
  return isPhosphorNavItem(item) ? item.icon : House;
}

export function housePhoneDestIsCreate(item: NavItem): boolean {
  return isSocialCreateDest(item);
}

export function housePhoneDestActive(
  pathname: string,
  item: NavItem,
  workspace: WorkspaceMode,
): boolean {
  if (workspace === "social") return isSocialTabActive(pathname, item);
  return isClientNavActive(pathname, item);
}

/** The dock thumb's index: the current dest among the dests that can be
 *  current (Create is an action, so it never carries the pill). -1 hides
 *  the pill. */
export function housePhoneDockThumbIndex(
  pathname: string,
  items: readonly NavItem[],
  workspace: WorkspaceMode,
): number {
  return items
    .filter((item) => !housePhoneDestIsCreate(item))
    .findIndex((item) => housePhoneDestActive(pathname, item, workspace));
}

export function housePhoneDestActiveIndex(
  pathname: string,
  items: readonly NavItem[],
  workspace: WorkspaceMode,
): number {
  return items.findIndex((item) => housePhoneDestActive(pathname, item, workspace));
}

export function housePhoneDestChipsLabel(workspace: WorkspaceMode): string {
  if (workspace === "social") return WORKSPACE_SOCIAL_LABEL;
  if (workspace === "education") return WORKSPACE_EDUCATION_LABEL;
  if (workspace === "staff") return WORKSPACE_STAFF_LABEL;
  return WORKSPACE_AGGREGATION_LABEL;
}

export function housePhoneDockLabel({
  workspace,
  homeOwned = false,
}: {
  workspace: WorkspaceMode;
  homeOwned?: boolean;
}): string {
  if (homeOwned) return OVERVIEW_PAGE.title;
  return housePhoneDestChipsLabel(workspace);
}
