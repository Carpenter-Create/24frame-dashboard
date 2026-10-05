import { isCoProductionsPath } from "@/lib/co-productions";
import { HOUSE_THEME_TOGGLE_CLASS } from "@/lib/house-lead-chrome";
import {
  APP_SHEET_HOST_CLASS,
  APP_SHEET_SURFACE_CLASS,
  TEXT_ACTION_CLASS,
} from "@/lib/house-sheet";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { NOTIFICATION_EMAIL, type NotificationKind } from "@/lib/notifications";
import {
  NOTIFICATION_PREFS,
  notificationPrefFamilyForKind,
  type NotificationPrefFamilyId,
} from "@/lib/notification-prefs";
import { PRODUCT_NAME } from "@/lib/product";
import { REPORTS_USER_PANEL_CLASS } from "@/lib/reports-craft";
import {
  SETTINGS,
  SETTINGS_EDIT_HELPER_CLASS,
  SETTINGS_PANE_CLASS,
  SETTINGS_PANE_TITLE_CLASS,
  SETTINGS_SECTION_CLASS,
} from "@/lib/settings";
import { socialRelativeTime } from "@/lib/social";
import { HOME_ROOT, isHomePath, type WorkspaceMode } from "@/lib/workspace";

// Notifications is the live uncleared-alert feed. One feed.
// Default: uncleared only, newest first. X clears a row. Cleared
// items leave this feed. No Open / Done / Cleared control. Category
// chips are the only filter (prefs families). Not Messages. Not Ask
// 24Frame AI. Not /attention catalog findings. Copy lives here,
// not JSX. User-facing chrome is Notifications — never Activity.
// Route stays /activity (one door).
//
// Adam lock 2026-09-19: chrome-level /activity. Account alerts
// span Aggregation · Reporting · Social · Education · Account.
// Not an Aggregation destination. Bell is the door.
// Adam lock 2026-09-20: match Get Help account chrome exactly —
// header + content column only. No left side menu. No Aggregation
// rail, no Settings-style account rail, no twin rail. Settings-
// measure canvas and page-lead SoT stay. Do not import
// SettingsPageLead or put this in Settings hub chrome.
// Hub Back consumes SettingsHubBackLink — history when the
// referrer is in-app; Home /home only as cold-open fallback.
// Never hard-link Aggregation.
// Adam lock 2026-09-20 (supersedes bell → full page): header bell
// opens a peek of the last five open rows. View all opens this page
// with the current workspace family already selected (`?family=` —
// same SoT as the chips). Home and Co-Productions have no matching
// chip and fall back to All. View all is the house text-action
// (Sporty Blue), not muted ink.

export const ACTIVITY_HREF = "/activity";
export const ACTIVITY_PREFS_HREF = SETTINGS.notificationsHref;
export const ACTIVITY_BELL_OPEN_CAP = 5;

export const ACTIVITY_FAMILY_ALL = "all" as const;

export const ACTIVITY_FAMILIES = [
  ACTIVITY_FAMILY_ALL,
  ...(Object.keys(NOTIFICATION_PREFS.groups) as NotificationPrefFamilyId[]),
] as const;

export type ActivityFamily = (typeof ACTIVITY_FAMILIES)[number];

export const ACTIVITY_PAGE = {
  title: "Notifications",
  subtitle: `Account alerts from ${PRODUCT_NAME}.`,
  back: "Back",
  homeHref: HOME_ROOT,
  all: "All",
  prefs: "Notification preferences",
  dismiss: "Mark done",
  empty: "You're all caught up.",
  emptyHint: "New alerts will show here.",
  viewAll: "View all",
  truncated: `Showing the first ${UNPAGINATED_MAX} alerts. More exist — this list is not complete.`,
  bellLabel: "Notifications",
  // Accessible name while anything is unread (the board's
  // "Notifications, new"); the dot is the visible cue.
  bellLabelNew: "Notifications, new",
  bellEmpty: "You're all caught up.",
  close: "Close notifications",
  navAria: "Notifications",
} as const;

export const ACTIVITY_PAGE_CLASS = SETTINGS_PANE_CLASS;
export const ACTIVITY_SECTION_CLASS = SETTINGS_SECTION_CLASS;
export const ACTIVITY_TITLE_CLASS = SETTINGS_PANE_TITLE_CLASS;
export const ACTIVITY_HELPER_CLASS = SETTINGS_EDIT_HELPER_CLASS;
// Phone stacks gear under the lead. Desktop keeps the prefs hit
// trailing. Never truncate the title to hug the icon.
export const ACTIVITY_LEAD_ROW_CLASS =
  "flex flex-col gap-[var(--space-4)] md:flex-row md:items-start md:justify-between";

// Family chips share house segmented SoT. Phone may scroll the row
// so labels stay whole. Never ellipsis.
export const ACTIVITY_FAMILY_SCROLL_CLASS = "no-scrollbar overflow-x-auto";

// The round grey 44 (HOUSE_THEME_TOGGLE_CLASS, H register):
// a flex sibling of Ask and the avatar. Hover and open step the fill to
// the hairline grey. Sporty Blue stays off the trigger itself — accent
// is the unread dot (ACTIVITY_BELL_UNREAD_DOT_CLASS) and the open-row
// dot.
export const ACTIVITY_BELL_TRIGGER_CLASS = `${HOUSE_THEME_TOGGLE_CLASS} relative`;
export const ACTIVITY_BELL_TRIGGER_OPEN_CLASS = "bg-hairline";
// Unread: a 10 accent dot with a 2px page-colour ring (14 box), 6 in
// from the 44 circle's top-right (the board). Never a count, never red.
export const ACTIVITY_BELL_UNREAD_DOT_CLASS =
  "pointer-events-none absolute right-1.5 top-1.5 size-3.5 rounded-full border-2 border-bg bg-accent";

export function activityBellLabel(unread: number): string {
  return unread > 0 ? ACTIVITY_PAGE.bellLabelNew : ACTIVITY_PAGE.bellLabel;
}
export const ACTIVITY_BELL_OPEN_DOT_CLASS = "size-2 shrink-0 rounded-full bg-accent";
// Desktop peek reuses the house panel already used by Reports scope.
// Phone peek is the house app-sheet — same host + surface as the
// avatar account sheet. Adam 2026-09-20: rise from the bottom,
// full-width. Do not fork a third panel. md:hidden keeps desktop
// on the anchored popover.
export const ACTIVITY_BELL_POPOVER_CLASS = REPORTS_USER_PANEL_CLASS;
export const ACTIVITY_BELL_SHEET_HOST_CLASS = APP_SHEET_HOST_CLASS;
export const ACTIVITY_BELL_SHEET_SURFACE_CLASS = APP_SHEET_SURFACE_CLASS;
export const ACTIVITY_BELL_VIEW_ALL_CLASS =
  `block border-t border-hairline px-[var(--space-4)] py-[var(--space-3)] ${TEXT_ACTION_CLASS}`;
export const ACTIVITY_BELL_LIST_CLASS =
  "flex max-h-80 flex-col gap-2 overflow-y-auto px-[var(--space-3)] py-[var(--space-3)]";

// House nouns — Titles FilmSlate, Deliveries PaperPlaneTilt.
export const ACTIVITY_KIND_ICON = {
  title_rejected: "film-slate",
  delivery_update: "paper-plane-tilt",
  new_follower: "user",
} as const satisfies Record<NotificationKind, "film-slate" | "paper-plane-tilt" | "user">;

export type ActivityItem = {
  id: string;
  title: string;
  body: string;
  kind: NotificationKind;
  created_at: string;
  unread: boolean;
  source_refs?: { title_id?: string; handle?: string } | null;
};

export function isActivityOpen(item: Pick<ActivityItem, "unread">): boolean {
  return item.unread;
}

export function isActivityPath(pathname: string): boolean {
  return pathname === ACTIVITY_HREF || pathname.startsWith(`${ACTIVITY_HREF}/`);
}

export function activityHeaderBack(pathname: string | null | undefined): {
  href: string;
  label: string;
} {
  if (!pathname || pathname === ACTIVITY_HREF) {
    return { href: ACTIVITY_PAGE.homeHref, label: ACTIVITY_PAGE.back };
  }
  return { href: ACTIVITY_HREF, label: ACTIVITY_PAGE.title };
}

export function parseActivityFamily(raw: string | string[] | undefined): ActivityFamily {
  const value = typeof raw === "string" ? raw : undefined;
  if (value && value !== ACTIVITY_FAMILY_ALL && value in NOTIFICATION_PREFS.groups) {
    return value as ActivityFamily;
  }
  return ACTIVITY_FAMILY_ALL;
}

// Peek View all and the full-page chips share `?family=`. Workspace
// lands that match a chip (Aggregation · Social · Education) select
// it. Home, Co-Productions, Account chrome, and unknown names → All.
export function activityFamilyForWorkspace(
  workspace: WorkspaceMode | string | undefined,
  pathname?: string | null,
): ActivityFamily {
  if (pathname && (isHomePath(pathname) || isCoProductionsPath(pathname))) {
    return ACTIVITY_FAMILY_ALL;
  }
  return parseActivityFamily(workspace);
}

export function activityFamilyForKind(kind: NotificationKind): NotificationPrefFamilyId {
  return notificationPrefFamilyForKind(kind);
}

export function activityFamilyLabel(family: ActivityFamily): string {
  if (family === ACTIVITY_FAMILY_ALL) return ACTIVITY_PAGE.all;
  return NOTIFICATION_PREFS.groups[family];
}

export function activityHref(input: { family?: ActivityFamily } = {}): string {
  const params = new URLSearchParams();
  if (input.family && input.family !== ACTIVITY_FAMILY_ALL) {
    params.set("family", input.family);
  }
  const query = params.toString();
  return query ? `${ACTIVITY_HREF}?${query}` : ACTIVITY_HREF;
}

export function filterActivityItems<T extends Pick<ActivityItem, "unread" | "kind">>(
  items: readonly T[],
  family: ActivityFamily = ACTIVITY_FAMILY_ALL,
): T[] {
  return items.filter((item) => {
    if (!isActivityOpen(item)) return false;
    if (family !== ACTIVITY_FAMILY_ALL && activityFamilyForKind(item.kind) !== family) {
      return false;
    }
    return true;
  });
}

export function activityBellItems<T extends Pick<ActivityItem, "unread">>(
  items: readonly T[],
  cap = ACTIVITY_BELL_OPEN_CAP,
): T[] {
  return items.filter(isActivityOpen).slice(0, cap);
}

export function activityKindIcon(
  kind: NotificationKind,
): "film-slate" | "paper-plane-tilt" | "user" {
  return ACTIVITY_KIND_ICON[kind];
}

export function activityItemHref(item: Pick<ActivityItem, "kind" | "source_refs">): string {
  return NOTIFICATION_EMAIL[item.kind].path({
    titleId: item.source_refs?.title_id,
    handle: item.source_refs?.handle,
  });
}

export function activityRelativeTime(iso: string, now = Date.now()): string {
  return socialRelativeTime(iso, now);
}

export function activityEmptyCopy(): string {
  return ACTIVITY_PAGE.empty;
}
