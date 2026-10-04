// Shared phone app-shell — IA A (Adam lock: dests in the dock).
// One primitive for Home · Aggregation · Social · Education · Staff.
// Desktop header + desktop workspace lanes stay on HouseLeadChrome.
// Phone header (screening chrome, Adam 2026-10-04): emblem, then the
// grid button naming the current workspace, then trailing utilities
// (search · Ask · bell · account). No workspace item in the dock.
// Avatar stays Settings / account — not a second workspace door.
// Destinations live in the Mercury floating dock (in-workspace
// only). Social dest order is Feed · Explore · Create ·
// Messages · Profile (Adam lock 2026-09-20; Feed label Adam
// 2026-10-04) — same SOCIAL_NAV SoT as the desktop Social rail.
// Create sits center as an accent circle inside the pill and opens
// the fan. Feed is /social; the Home workspace keeps "Home".
// Create is Social-only. Aggregation · Education · Home each
// keep their own dests. Dock hops use the
// house pending / prefetch SoT — prefetchHrefList on mount,
// optimistic dest light on tap. No under-top dest chip rail. No
// peer workspace pill rail.
// Phone OS dark is not the product theme. One house SoT.
// Phone/tablet: emblem · grid button (with the workspace name), then
// search (when needed) · 24Frame AI · bell · account.
// Desktop hides the grid button; the workspace lanes sit after the brand mark.
// Theme is the avatar drill. No header sun/moon.
// Ask AI is header + Home module only (#465).
// Craft is Elevated Mercury (reference, not a pixel clone, not
// Nextdoor frost): one floating pill, house surface fill, hairline,
// restrained --elevation-float. No frost. No satellite FAB. No
// second float. Social Create is an accent circle INSIDE the pill —
// same row, not raised, the dock's only accent. Screening chrome
// (Adam 2026-10-04, docs/design-locks/shell-screening-chrome-lock-v1.md)
// supersedes "Match everywhere"'s accent active state (2026-10-04): in
// every dock (Home · Aggregation · Social · Education · Staff) the
// current dest is an ink glyph (Bold, the board's stroke 2) with a
// 4px ink dot under it — the dot is the non-colour cue (WCAG 1.4.1),
// no chip. Idle glyphs are Regular on the quiet ink. Each target fills
// the 46 pill row, so every tap clears 44. Glyph boxes ride TWO
// independent size SoT tokens: the dock glyph (24,
// HOUSE_PHONE_CHROME_ICON_CLASS) and the phone header trailing glyph
// (20, HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS) — never aliases.
// Desktop header glyphs are 18 in the 34 boxes. Header must NOT
// re-export the bottom-chrome class. The phone header trailing (bell +
// phone search) stays ink-2 via HOUSE_PHONE_CHROME_IDLE_INK_CLASS. The
// Ask 24Frame AI sparkle is accent (HOUSE_ASK_AI_MARK_INK_CLASS, Adam
// 2026-10-04, "Blue, as in the mockup").
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

/** Phone-only float. The pill sits 16 off the bottom (the board's
 *  bottom:16, screening chrome; was 12), or on the safe area when that
 *  is larger. Content pad is HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS, whose
 *  clearance follows this float. */
export const HOUSE_PHONE_BOTTOM_NAV_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex justify-center px-[var(--space-4)] pb-[max(16px,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out md:hidden";

export const HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS = "pointer-events-none translate-y-full";

export const HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS =
  "flex h-12 w-full max-w-[420px] items-center rounded-full border border-hairline bg-surface px-2 shadow-[var(--elevation-float)]";

// The row fills the pill's 46 inner height, so every dock target is
// 46 tall and at least 44 wide at 320 (screening chrome).
export const HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS = "flex h-full w-full items-center";

// Five equal slots, as on the board (each link flex:1, no pad). The
// Create slot is the fan's anchor (SOCIAL_CREATE_FAN_ANCHOR_CLASS),
// which carries no pad either: a pad on the links alone floors their
// flex base at the pad and leaves Create's slot narrower.
export const HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS =
  "relative flex h-full min-w-0 flex-1 items-center justify-center";

export const HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS = "text-ink";

/** Phone dock glyph — 24px box.
 *  Matches the phone header trailing optical size. Own literal, not
 *  an alias of HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS. */
export const HOUSE_PHONE_CHROME_ICON_CLASS = "size-6 shrink-0";

/** Phone header trailing glyph — 20px box (screening chrome).
 *  AI mark + bell + phone search read off this token. Its value is a
 *  standalone literal, not an alias of HOUSE_PHONE_CHROME_ICON_CLASS,
 *  so a dock resize cannot leak into the header. Tap stays 44. */
export const HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS = "size-5 shrink-0";

/** One phone chrome stroke register — bottom bar + top trailing. Not Bold/Fill. */
export const HOUSE_PHONE_CHROME_ICON_WEIGHT = "regular" satisfies IconWeight;

/** Idle ink of the phone header trailing cluster (bell + phone search).
 *  Amended Adam 2026-10-04 ("Blue, as in the mockup"): the Ask 24Frame AI
 *  sparkle leaves this ink for accent (HOUSE_ASK_AI_MARK_INK_CLASS).
 *  Screening chrome (Adam 2026-10-04): the dock's idle glyphs move to the
 *  quiet ink (HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS), so this ink is
 *  header-only now. */
export const HOUSE_PHONE_CHROME_IDLE_INK_CLASS = "text-ink-2";

/** Idle dock glyph: the board's ink3 (HOUSE_SHELL_QUIET_INK_CLASS). */
export const HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS = HOUSE_SHELL_QUIET_INK_CLASS;

/** Current dest glyph weight: Bold (the board's stroke 2). Idle stays
 *  Regular (HOUSE_PHONE_BOTTOM_NAV_ICON_WEIGHT). */
export const HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT = "bold" satisfies IconWeight;

/** Current mark, every dock: a 4px ink dot 3px above the bottom of the
 *  46 target, centred under the glyph (the glyph stays centred). Shape,
 *  not colour, says "you are here". No chip, no accent (screening
 *  chrome supersedes the accent mark of "Match everywhere"). */
export const HOUSE_PHONE_BOTTOM_NAV_MARK_CLASS =
  "pointer-events-none absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-ink";

/** Social Create: the dock's only filled control and only accent — a
 *  40 accent circle inside the pill holding a 20 Bold plus (the board's
 *  stroke 2.2). The h-12 pill and the 3rem dock clearance stay. Create
 *  takes no ON/OFF ink and never shows the dot. */
export const HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS =
  "flex size-10 items-center justify-center rounded-full bg-accent text-accent-contrast";

export const HOUSE_PHONE_BOTTOM_NAV_CREATE_ICON_CLASS = "size-5 shrink-0";

/** Create on its own route (/social/create, /social/live): a 2px accent
 *  ring 1px off the circle. Box-shadow only — stays inside the pill. */
export const HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS =
  "ring-2 ring-accent ring-offset-1 ring-offset-surface";

/** Phone header trailing glyph box — 20px (screening chrome; supersedes
 *  wave 1's 24). Own literal, not an alias of the dock class. The dock
 *  stays size-6 on its own declaration. */
export const HOUSE_HEADER_TRAILING_ICON_CLASS = "size-5 shrink-0";

/** Phone header trailing instance — Regular 20 on the header idle ink.
 *  Hidden from md+, so the ink override does not touch desktop.
 *  Bell, phone search. Ask uses HOUSE_ASK_AI_MARK_PHONE_CLASS. */
export const HOUSE_HEADER_TRAILING_PHONE_CLASS = `${HOUSE_HEADER_TRAILING_ICON_CLASS} md:hidden ${HOUSE_PHONE_CHROME_IDLE_INK_CLASS}`;

/** Desktop header trailing instance — 18px in the 34 box (screening
 *  chrome; supersedes wave 1's 24 desktop box). Phone dock stays on
 *  HOUSE_PHONE_CHROME_ICON_CLASS. */
export const HOUSE_HEADER_TRAILING_DESKTOP_CLASS = "size-4.5 shrink-0 hidden md:block";

/** Ask 24Frame AI sparkle ink — accent, as in the mockup (Adam
 *  2026-10-04, "Blue, as in the mockup"). Ask only: the bell and search
 *  keep their idle ink. Set on the glyph itself so the button's hover
 *  and pressed ink never repaint it. */
export const HOUSE_ASK_AI_MARK_INK_CLASS = "text-accent";

/** Phone Ask sparkle — the phone trailing 24px box on accent, not the
 *  phone idle ink. */
export const HOUSE_ASK_AI_MARK_PHONE_CLASS = `${HOUSE_HEADER_TRAILING_ICON_CLASS} md:hidden ${HOUSE_ASK_AI_MARK_INK_CLASS}`;

/** Desktop Ask sparkle, on accent: 18 in the 34 icon box below xl,
 *  16 in the labeled pill from xl (the board's pill). */
export const HOUSE_ASK_AI_MARK_DESKTOP_CLASS = `${HOUSE_HEADER_TRAILING_DESKTOP_CLASS} xl:size-4 ${HOUSE_ASK_AI_MARK_INK_CLASS}`;

/** Bottom nav rides the 24px SoT (HOUSE_PHONE_CHROME_ICON_CLASS).
 *  Idle Regular; the current dest Bold (HOUSE_PHONE_BOTTOM_NAV_ICON_ACTIVE_WEIGHT).
 *  The dock and header size tokens stay two independent literals. Never Fill. */
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
