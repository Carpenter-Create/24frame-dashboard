// Mobile 544:561 / 537:557 Family A sheet, and the desktop account
// MenuSurface (docs/design-locks/desktop-avatar-menu-coinbase-lock-v1.md).
// Copy lives here, not in JSX.
// Identity is avatar + name + email from the same values /settings/profile
// would show. Photo is the signed avatars/{user-id}/avatar face, or the
// email initial when empty. Always render both fields. No dashes, no invented
// local-part name. Phone and desktop share the job list
// USER_MENU_ACTIONS (Settings — Theme — Get Help). Grammar does not.
// Phone: ACCOUNT_SHEET_GROUPS. Settings + Theme share an inset card
// (hairline between those rows). Get Help is its own inset card.
// Phone Log out sits in the same inset card, Sporty blue, outside the nav cards.
// Desktop: Coinbase flat rows on MenuSurface. No SheetGroup. Log out is
// danger red. Identity is a horizontal row. Sporty Blue bar stays, full width.
// Profile is a Settings pane, not a
// menu row. Give feedback lives on /help/feedback, not this
// menu and not Settings. 24Frame AI is the header
// sparkle only — not a menu row. Workspace is
// the header control, not this menu. Theme is the avatar-menu
// drill at /settings/preferences/theme (Adam lock 2026-09-22,
// path amended 2026-09-23). The face is the
// stored preference. No header sun/moon. Destinations
// use existing routes only — not
// /account/workspace, /account/appearance, or /account/feedback.
// Company stays off this menu. Log out +
// version are the footer group — not a
// packed list row. Hairline only under Log out. No hairline above
// Log out. #209 #210 #211 hug / hairline-sandwich stay void on
// mobile. Both instances hug the stack. 384 is void. 618:785 overlay
// is void.
// Mobile hugs content (h-auto) — leftover above Log out is 24
// house row air (--space-6), shrink-0. Not flex-1 leftover
// grow (open white). Not a forced 90% floor. Log out, hairline,
// footer stay at the bottom. Item-list overflow lives on the
// scroll pane — same containment as house nav destinations — so
// Refer cannot paint over the pin. Surface clips. Do not put
// overflow-y-auto on the surface. Log out → hairline 16. Hairline
// → footer 16. Footer → bottom 32 (sheet pad B). Not 48/48/48.
// No hairline above Log out. 571:911 stays off. Closed sheet is
// 544:561 / 537:557.
// Desktop MenuSurface hugs the stack. 280 wide. Align-end.
// No leftover spacer. No inset pad on the surface — rows are
// full-bleed. No 522 / 570 / 672 floor. Labels stay one source.

import { accountPhotoSrc } from "@/lib/account-avatar";
import { APP_SHEET_CHROME_CLASS, APP_SHEET_HOST_CLASS } from "@/lib/house-sheet";
import { ASK_ASSISTANT, ASSISTANT_NAME } from "@/lib/product";
import {
  USER_MENU_ACTIONS,
  USER_MENU_PHONE_ACTIONS,
  userMenuAvatarInitial,
  userMenuName,
  type UserMenuAction,
} from "@/lib/user-menu";

export const ACCOUNT_SHEET = {
  close: "Close account",
  sheet: "Account",
} as const;

export const ACCOUNT_SHEET_ABSENT = [
  "Dashboard",
  "Titles",
  "Deliveries",
  "Recent activity",
  "Activity",
  "Finance",
  ASK_ASSISTANT,
  ASSISTANT_NAME,
  "Queue",
  "Avails",
  "Manage account",
  "ACCOUNT",
  "credits",
  "Buy",
  "User Profile",
  "Company Profile",
  "Phone",
  "Job",
  "Legal",
] as const;

// Desktop panel. Phone sheet uses the same IA.
export const ACCOUNT_SHEET_ITEMS = USER_MENU_ACTIONS;

export const ACCOUNT_SHEET_PHONE_ITEMS = USER_MENU_PHONE_ACTIONS;

// Phone inset grouping SoT. Desktop does not render these cards.
// Settings + Theme share a card. Get Help is its own card.
// Phone Log out uses the same inset card in the pin. It is not a nav group.
export const ACCOUNT_SHEET_GROUPS = [
  { id: "preferences", kinds: ["settings", "theme"] },
  { id: "help", kinds: ["help"] },
] as const;

export function accountSheetGroupedRows(items: readonly UserMenuAction[]) {
  return ACCOUNT_SHEET_GROUPS.map((group) => ({
    id: group.id,
    items: group.kinds.flatMap((kind) => {
      const item = items.find((row) => row.kind === kind);
      return item ? [item] : [];
    }),
  }));
}

// Phone account sheet uses AppSheet chrome (pad 16, radius 16, 90vh,
// no shadow). Hug stays h-auto. The stage/pin stack is the menu body.
// Desktop 629:795 hug does not use this surface.
export const ACCOUNT_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;

export const ACCOUNT_SHEET_SURFACE_CLASS =
  `${APP_SHEET_CHROME_CLASS} account-sheet-surface relative z-10 h-auto overflow-hidden`;

export const ACCOUNT_SHEET_HEAD_CLASS =
  "flex min-h-12 w-full shrink-0 items-center justify-between";

// Stage owns the 24 between Identity / hairline / items. Surface
// has no gap — leftover 24 sits between stage and pin, same as
// desktop. min-h-0 so the item list can shrink when the hug hits
// the viewport ceiling.
export const ACCOUNT_SHEET_STAGE_CLASS =
  "flex min-h-0 w-full flex-col gap-[var(--space-6)]";

// Item list. Overflow only when the hug stack hits the viewport
// ceiling — house nav destinations pane — so the item list cannot
// paint over the pinned Log out footer. Surface clips. Do not
// overflow-y-auto the surface. Not flex-1 leftover grow.
export const ACCOUNT_SHEET_SCROLL_CLASS =
  "flex min-h-0 w-full flex-col overflow-y-auto overscroll-contain";

// 16 between phone inset cards.
// Not the old 12 flat-row gap. Not 24 section air.
// Rows inside a card use the house inset group (no gap; hairline only).
export const ACCOUNT_SHEET_GROUPS_CLASS =
  "flex w-full flex-col gap-[var(--space-4)]";

export const ACCOUNT_SHEET_GROUP_CLASS = ACCOUNT_SHEET_GROUPS_CLASS;

// House row air — --space-6 is 24. Adds to the hug stack.
// Not h-[24px]. Not leftover grow. Same air as desktop leftover.
export const ACCOUNT_SHEET_LEFTOVER = 24;

export const ACCOUNT_SHEET_LEFTOVER_CLASS =
  "h-[var(--space-6)] w-full shrink-0";

// Row inside the shared inset card. Accent label and sign-out icon stay.
// The card shell is SheetGroup inset — not a second chrome on this button.
// Not a chevron destination. Not inside the nav cards.
export const ACCOUNT_SHEET_LOGOUT_CLASS =
  "flex w-full items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-base)] font-normal leading-6 text-accent";

// Mobile pin — Log out, hairline, footer are siblings. Log out →
// hairline 16. Hairline → footer 16. Footer → bottom 32 (sheet
// pad B). Not 48/48/48. Leftover above Log out is 24 house air,
// shrink-0 — not leftover grow. Do not put Log out in the item
// group. Pin gap is not (Log out+rule) → footer. Hairline only
// under Log out. Item overflow stays on the scroll pane so Refer
// cannot stack on this pin. 571:911 stays off.
export const ACCOUNT_SHEET_PIN_CLASS =
  "flex w-full shrink-0 flex-col gap-[var(--space-4)]";

// Log out only. Hairline is the next pin sibling — do not hug the rule.
export const ACCOUNT_SHEET_LOGOUT_STACK_CLASS = "flex w-full shrink-0 flex-col";

// Footer on both menus — 13 Regular / 16. Version tertiary. Legal is parked.
export const ACCOUNT_SHEET_FOOTER_CLASS =
  "flex h-4 w-full shrink-0 items-center justify-between";

export const ACCOUNT_SHEET_VERSION_CLASS = "t-body-sm leading-4 text-ink-3";

// Desktop account MenuSurface — Coinbase grammar
// (docs/design-locks/desktop-avatar-menu-coinbase-lock-v1.md).
// 280 wide. Radius 12. White surface. Hairline edge. No shadow.
// Sporty Blue bar is 4px and the full panel width, in flow, so the
// radius clip on the surface cuts it flush. Not the shared half-bar.
// Head pad 16 under that bar. Rows are full-bleed (no surface inset).
// Align-end to the avatar. 8px under the trigger. Content hug.
// The surface is portaled to body, so top/right are measured from the
// trigger — not --header-height / --content-inset.
export const ACCOUNT_MENU_DROPDOWN_WIDTH = 280;

export const ACCOUNT_MENU_DROPDOWN_HOST_CLASS = "fixed inset-0 z-50";

export const ACCOUNT_MENU_DROPDOWN_DISMISS_CLASS = "absolute inset-0";

export const ACCOUNT_MENU_DROPDOWN_ALIGN = "end" as const;

export const ACCOUNT_MENU_DROPDOWN_GAP = "var(--space-2)" as const;

export const ACCOUNT_MENU_DROPDOWN_SURFACE_CLASS =
  "absolute z-10 flex h-auto w-[280px] flex-col overflow-hidden rounded-[12px] border border-hairline bg-surface shadow-none";

// In-flow 4px Sporty Blue. Full width. Parent overflow + radius clips it.
export const ACCOUNT_MENU_DROPDOWN_ACCENT_CLASS = "h-[4px] w-full shrink-0 bg-accent";

// Horizontal identity. Avatar 40. Gap 12. Pad 16 under the bar.
export const ACCOUNT_MENU_DROPDOWN_HEAD_CLASS =
  "flex w-full items-center gap-[var(--space-3)] p-[var(--space-4)]";

export const ACCOUNT_MENU_DROPDOWN_AVATAR_CLASS = "size-10 text-[length:var(--text-sm)]";

export const ACCOUNT_MENU_DROPDOWN_WHO_CLASS = "flex min-w-0 flex-1 flex-col items-start";

// 17 / medium / ink. One line; ellipsis only when the 280 overflows.
export const ACCOUNT_MENU_DROPDOWN_NAME_CLASS =
  "w-full truncate text-[length:var(--text-base)] font-medium leading-6 text-ink";

// 13 secondary. One line.
export const ACCOUNT_MENU_DROPDOWN_EMAIL_CLASS =
  "w-full truncate text-[length:var(--text-xs)] leading-4 text-ink-2";

export const ACCOUNT_MENU_DROPDOWN_MANAGE_CLASS =
  "text-[length:var(--text-xs)] leading-4 text-accent";

// Flat list. No card gap. No inset radius.
export const ACCOUNT_MENU_DROPDOWN_ROWS_CLASS = "flex w-full shrink-0 flex-col";

export const ACCOUNT_MENU_DROPDOWN_ROW_CLASS =
  "flex min-h-11 w-full items-center gap-[var(--space-3)] px-[var(--space-4)] text-left t-body-sm text-ink hover:bg-surface-muted focus-visible:bg-surface-muted";

// Phosphor outline at 20. Class lives here so the tsx stays off size-5.
export const ACCOUNT_MENU_DROPDOWN_ICON_CLASS = "size-5 shrink-0";

// Theme is the only desktop body row with a chevron. Settings, Get
// Help, and Log out stay flat. Value is the stored preference.
// docs/design-locks/theme-chrome-avatar-only-lock-v1.md
export const ACCOUNT_MENU_THEME_LABEL_CLASS = "min-w-0 flex-1 t-body text-ink";

export const ACCOUNT_MENU_THEME_TRAILING_CLASS =
  "ml-auto flex shrink-0 items-center gap-[var(--space-2)]";

export const ACCOUNT_MENU_THEME_VALUE_CLASS = "t-body-sm text-ink-3";

export const ACCOUNT_MENU_THEME_CHEVRON_CLASS = "size-4 shrink-0 text-ink-3";

// House danger ink — same mark as menu-surface danger. Not Sporty Blue.
export const ACCOUNT_MENU_DROPDOWN_LOGOUT_CLASS =
  "flex min-h-11 w-full items-center gap-[var(--space-3)] px-[var(--space-4)] text-left t-body-sm text-[#c4564a] hover:bg-surface-muted focus-visible:bg-surface-muted";

// Version footer. 13 secondary. 12 pad. Not a card.
export const ACCOUNT_MENU_DROPDOWN_FOOTER_CLASS =
  "px-[var(--space-4)] pb-[var(--space-3)] pt-[var(--space-3)]";

export const ACCOUNT_MENU_DROPDOWN_VERSION_CLASS =
  "text-[length:var(--text-xs)] leading-4 text-ink-2";

export type AccountMenuDropdownAlign = {
  top: string;
  right: string;
};

export function accountMenuDropdownAlignEnd(
  trigger: Pick<DOMRect, "bottom" | "right">,
  viewportWidth: number,
): AccountMenuDropdownAlign {
  return {
    top: `calc(${trigger.bottom}px + ${ACCOUNT_MENU_DROPDOWN_GAP})`,
    right: `${viewportWidth - trigger.right}px`,
  };
}

export type AccountSheetIdentity = {
  avatarInitial: string;
  photoUrl: string | null;
  name: string;
  email: string;
};

function accountSheetEmail(value: string | null | undefined): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function accountSheetIdentity(
  email: string,
  name?: string | null,
  photoUrl?: string | null,
): AccountSheetIdentity {
  return {
    avatarInitial: userMenuAvatarInitial(email),
    photoUrl: accountPhotoSrc(photoUrl),
    name: userMenuName(name) ?? "",
    email: accountSheetEmail(email),
  };
}

export function destinationClickClosesSheet(pathname: string, href: string): boolean {
  return pathname === href;
}

/** Present on the phone sheet and the desktop dropdown host. */
export const ACCOUNT_MENU_ROOT_ATTR = "data-account-menu-root";

type AccountMenuClickNode = {
  parentNode?: AccountMenuClickNode | null;
  tagName?: string;
  getAttribute?: (name: string) => string | null;
};

function clickAttr(node: AccountMenuClickNode, name: string): string | null {
  if (typeof node.getAttribute !== "function") return null;
  return node.getAttribute(name);
}

/**
 * True when the event target is a same-document destination inside the
 * account menu. The house shell's capture click calls stopPropagation
 * once a hop is owned (`stay` on the Theme page, or a painted Theme
 * screen). The row's React onClick never runs, so the full-screen host
 * stays over the Light / Dark / Auto picker. A document capture listener
 * still runs after that stopPropagation and uses this check to close.
 * Hash and empty hrefs are not destinations. Modified clicks are ignored
 * by the listener, not here.
 */
export function accountMenuDestinationClick(target: EventTarget | null): boolean {
  if (target === null || typeof target !== "object") return false;
  let cursor: AccountMenuClickNode | null = target as AccountMenuClickNode;
  let anchor: AccountMenuClickNode | null = null;
  while (cursor) {
    if ((cursor.tagName ?? "").toUpperCase() === "A") {
      const href = clickAttr(cursor, "href");
      if (href && !href.startsWith("#")) anchor = cursor;
      break;
    }
    cursor = cursor.parentNode ?? null;
  }
  if (!anchor) return false;
  let root: AccountMenuClickNode | null = anchor;
  while (root) {
    if (clickAttr(root, ACCOUNT_MENU_ROOT_ATTR) !== null) return true;
    root = root.parentNode ?? null;
  }
  return false;
}
