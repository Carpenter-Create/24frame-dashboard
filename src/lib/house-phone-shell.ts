// Shared phone app-shell — IA A (Adam lock: dests in the dock).
// One primitive for Home · Aggregation · Social · Education.
// Desktop header + desktop workspace pills stay on HouseLeadChrome.
// Phone header: emblem, then trailing utilities. Workspace switch is
// the waffle (search · Ask · bell · waffle · avatar). No workspace
// name in the header. No workspace item in the dock.
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
// Phone/tablet trailing is search (when needed) · 24Frame AI · bell · waffle · avatar.
// Desktop hides the waffle; the sliding workspace row sits after the brand mark.
// Theme is the avatar drill. No header sun/moon.
// Ask AI is header + Home module only (#465).
// Craft is Elevated Mercury (reference, not a pixel clone, not
// Nextdoor frost): one floating pill, house surface fill, hairline,
// restrained --elevation-float. No frost. No satellite FAB. No
// second float. Social Create is an accent circle INSIDE the pill
// (shell-unified-chrome-lock-v1) — same row, not raised. In every
// dock (Home · Aggregation · Social · Education · Staff) the active
// dest is accent ink on the glyph plus a small accent mark under
// it — the mark is the non-colour cue (WCAG 1.4.1), no chip (Adam
// 2026-10-04, "Match everywhere"). Inactive sit bare. Stroke is Regular for both the
// Mercury bar and the phone-top AI/bell cluster — one weight
// register — but the glyph boxes ride TWO independent size SoT
// tokens. Shell waffle lock: the phone dock glyph matches the phone
// header trailing optical size (size-6 / 24px). The dock literal
// (HOUSE_PHONE_CHROME_ICON_CLASS) stays its own declaration — not an
// alias of HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS. Desktop header
// trailing glyphs share the same 24px box. The hit stays 44.
// Header must NOT re-export the bottom-chrome class. Phosphor rail
// stays size-4. Not Bold/Fill heavy. Active ink is accent in every
// dock; idle is ink-2 on both the bar off state and the top
// trailing (bell + phone search + waffle) via
// HOUSE_PHONE_CHROME_IDLE_INK_CLASS. The Ask 24Frame AI sparkle is
// the one exception: accent (HOUSE_ASK_AI_MARK_INK_CLASS, Adam
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

/** Phone-only float. Safe-area inset. Content pad is HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS. */
export const HOUSE_PHONE_BOTTOM_NAV_CLASS =
  "fixed inset-x-0 bottom-0 z-40 flex justify-center px-[var(--space-4)] pb-[max(12px,env(safe-area-inset-bottom))] transition-transform duration-200 ease-out md:hidden";

export const HOUSE_PHONE_BOTTOM_NAV_HIDDEN_CLASS = "pointer-events-none translate-y-full";

export const HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS =
  "flex h-12 w-full max-w-[420px] items-center rounded-full border border-hairline bg-surface px-2 shadow-[var(--elevation-float)]";

export const HOUSE_PHONE_BOTTOM_NAV_ROW_CLASS = "flex h-10 w-full items-center";

export const HOUSE_PHONE_BOTTOM_NAV_ITEM_CLASS =
  "flex h-full min-w-0 flex-1 items-center justify-center px-1";

export const HOUSE_PHONE_BOTTOM_NAV_ITEM_ON_CLASS = "text-accent";

/** Phone dock glyph — 24px box.
 *  Matches the phone header trailing optical size. Own literal, not
 *  an alias of HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS. */
export const HOUSE_PHONE_CHROME_ICON_CLASS = "size-6 shrink-0";

/** Phone header trailing glyph — 24px box.
 *  AI mark + bell + phone search + waffle read off this token. Its
 *  value is a standalone literal, not an alias of
 *  HOUSE_PHONE_CHROME_ICON_CLASS, so a dock resize cannot leak into
 *  the header. Desktop trailing glyphs use the same 24px box
 *  (HOUSE_HEADER_TRAILING_DESKTOP_CLASS). Tap stays 44. */
export const HOUSE_HEADER_TRAILING_PHONE_ICON_CLASS = "size-6 shrink-0";

/** One phone chrome stroke register — bottom bar + top trailing. Not Bold/Fill. */
export const HOUSE_PHONE_CHROME_ICON_WEIGHT = "regular" satisfies IconWeight;

/** Idle ink shared by the phone top trailing cluster and the phone bottom bar
 *  off state. Perceived stroke weight is not just line thickness — a Regular
 *  glyph on ink-3 reads visibly lighter than the same glyph on ink-2 sitting
 *  in the Mercury bar. One ink SoT is what makes the two Regular clusters
 *  read as one register (#442 shipped weight+stroke, this locks the ink).
 *  Amended Adam 2026-10-04 ("Blue, as in the mockup"): the Ask 24Frame AI
 *  sparkle leaves this ink for accent (HOUSE_ASK_AI_MARK_INK_CLASS). Bell,
 *  phone search, and the waffle stay on it. */
export const HOUSE_PHONE_CHROME_IDLE_INK_CLASS = "text-ink-2";

export const HOUSE_PHONE_BOTTOM_NAV_ITEM_OFF_CLASS = HOUSE_PHONE_CHROME_IDLE_INK_CLASS;

/** Active dest, every dock: the glyph sits in this box so the mark can
 *  hang under it inside the h-10 row. No size change to the row or pill. */
export const HOUSE_PHONE_BOTTOM_NAV_MARK_HOST_CLASS = "relative flex";

/** Active mark, every dock: a 4px accent dot 2px under the 24px glyph,
 *  inside the h-10 row. Shape, not colour, says "you are here" — accent
 *  vs ink-2 alone is ~2:1 light and ~1:1 dark. No chip (Adam
 *  2026-10-04, "Match everywhere"). */
export const HOUSE_PHONE_BOTTOM_NAV_MARK_CLASS =
  "pointer-events-none absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent";

/** Social Create: accent circle inside the pill. Fits the h-10 row, so
 *  the h-12 pill and the 3rem dock clearance stay. The glyph keeps
 *  the 24px dock box. Create takes no ON/OFF ink — accent ink on the
 *  accent fill would erase the glyph on /social/live. */
export const HOUSE_PHONE_BOTTOM_NAV_CREATE_CLASS =
  "flex size-10 items-center justify-center rounded-full bg-accent text-accent-contrast";

/** Create on its own route (/social/create, /social/live): a 2px accent
 *  ring 1px off the circle. Box-shadow only — stays inside the pill. */
export const HOUSE_PHONE_BOTTOM_NAV_CREATE_ON_CLASS =
  "ring-2 ring-accent ring-offset-1 ring-offset-surface";

/** Shared 24px box for header trailing glyphs on phone and desktop.
 *  Own literal, not an alias of the dock class. The dock stays size-6
 *  on its own declaration. Not the 16px Phosphor rail.
 *  docs/design-locks/social-home-craft-wave-1-lock-v1.md */
export const HOUSE_HEADER_TRAILING_ICON_CLASS = "size-6 shrink-0";

/** Phone header trailing instance — Regular size-6 on bottom-bar idle ink.
 *  Hidden from md+, so the ink override does not touch desktop text-ink-3.
 *  Bell, phone search, waffle. Ask uses HOUSE_ASK_AI_MARK_PHONE_CLASS. */
export const HOUSE_HEADER_TRAILING_PHONE_CLASS = `${HOUSE_HEADER_TRAILING_ICON_CLASS} md:hidden ${HOUSE_PHONE_CHROME_IDLE_INK_CLASS}`;

/** Desktop header trailing instance — same 24px box as phone.
 *  Wave 1 rematches density M3 size-5. Cluster gap stays space-4.
 *  Phone dock stays on HOUSE_PHONE_CHROME_ICON_CLASS. Not ~18px.
 *  docs/design-locks/social-home-craft-wave-1-lock-v1.md */
export const HOUSE_HEADER_TRAILING_DESKTOP_CLASS = "size-6 shrink-0 hidden md:block";

/** Ask 24Frame AI sparkle ink — accent, as in the mockup (Adam
 *  2026-10-04, "Blue, as in the mockup"). Ask only: the bell and search
 *  keep their idle ink. Set on the glyph itself so the button's hover
 *  and pressed ink never repaint it. */
export const HOUSE_ASK_AI_MARK_INK_CLASS = "text-accent";

/** Phone Ask sparkle — the phone trailing 24px box on accent, not the
 *  phone idle ink. */
export const HOUSE_ASK_AI_MARK_PHONE_CLASS = `${HOUSE_HEADER_TRAILING_ICON_CLASS} md:hidden ${HOUSE_ASK_AI_MARK_INK_CLASS}`;

/** Desktop Ask sparkle — same box in both forms (icon circle below xl,
 *  labeled pill from xl), on accent. */
export const HOUSE_ASK_AI_MARK_DESKTOP_CLASS = `${HOUSE_HEADER_TRAILING_DESKTOP_CLASS} ${HOUSE_ASK_AI_MARK_INK_CLASS}`;

/** Bottom nav rides the 24px SoT (HOUSE_PHONE_CHROME_ICON_CLASS),
 *  the same optical size as the phone header trailing. The two
 *  clusters share weight (Regular) and idle ink (text-ink-2). The
 *  size tokens stay two independent literals. Never Bold/Fill. */
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
