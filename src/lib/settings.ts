// Settings hub. Copy and path contract live here, not in JSX.
//
// Universal Account/Settings hub — not owned by Aggregation / Social /
// Education. Title Settings. One door from every workspace.
// CMS is not inside Settings. Staff Manage courses lives on the
// Education workspace (/education/manage), not Preferences.
// Not a GC Staff admin surface.
//
// Hub sections:
//   Profile · Organization · Preferences · Security
// Same URLs regardless of active workspace. Do not keep You / Social /
// Education / Aggregation as the IA spine.
// Profile is account identity only (name / photo / sign-in email +
// Save). Public / Social profile is Social-owned — edit it from
// Social, not from a Settings door.
// Organization holds the company profile and Team invite (same
// account, existing org_role). House grant/comp is staff-only on
// /gc/clients — never a customer Settings directory.
// Preferences holds Location, Theme, and the notification matrix.
// Location and Theme share one PrefDrillGroup (inset SETTINGS_GROUP).
// The Theme row drills to /settings/preferences/theme — the same picker
// as the avatar Theme door, same gc-theme writes. Notifications stays the
// t-heading matrix. Theme is not nested under Notifications.
// Speech-learning is not a Preferences subsection (Adam 2026-09-22
// follow-up). The gc-speech-learning store stays; do not invent a
// Settings home for it. Location drills to /settings/preferences/location
// and persists profiles.location_city, location_region, and
// location_country. Mobile Preferences drills to Location and Notifications.
// Desktop shows the Location row and the matrix inside one
// SETTINGS_CONTENT_MEASURE_CLASS — a constrained measure, not full-bleed rows
// across the rail-to-edge span. PrefDrillGroup and the Notifications
// card share that measure so their right edges match. Leftover
// workspace prefs may appear as optional subsections only —
// never as a You / Social / Education / Aggregation spine.
//
// Canonical paths. Retired workspace-spine doors stay a hard-cut
// (404, no redirect table). Flat /settings/theme permanently
// redirects to the nested Theme page listed below:
//   /settings → hub (mobile list) / Profile pane (desktop)
//   /settings/profile
//   /settings/profile/name
//   /settings/organization
//   /settings/organization/company
//   /settings/organization/entities/new
//   /settings/organization/entities/[id]
//   /settings/preferences
//   /settings/preferences/location
//   /settings/preferences/notifications
//   /settings/preferences/theme
//   /settings/security
// Retired /settings/you|social|education|aggregation and ?section=
// aliases are gone. Those dead paths 404. Do not add a redirect
// table for them. Flat /settings/theme permanently redirects to
// /settings/preferences/theme (preferences-drill-nested-slugs-lock-v1).
//
// Account menu Settings always opens the hub. settingsLandHref is
// /settings from every workspace — no context land that swaps the
// spine. Section switch is not a workspace switch (no cookie write).
//
// Existing /settings/agreements, /settings/refer stay Profile doors.
// Company persist stays organizations.name.
// Theme SoT is gc-theme via lib/theme.ts. Avatar Theme and the
// Preferences Theme row share /settings/preferences/theme. Auto changes only
// in that picker. Get Help / Give feedback stay on
// /help — never Settings hub chrome.
//
// 600:881 shell — one dest-rail slot occupies the Access slot on every
// /settings path. Pad 16. Active wash follows the hub section.
// Rail keeps house Settings title + Profile · Organization · Preferences · Security.
// Body H1 is the hub section only — never repeat Settings in the pane.
// Selected wash uses house workspace-rail SoT (accent-wash + accent-ink text).
// Desktop: section rail + pane. Mobile: list → push.
// Spacing 8 / 16 / 24 / 48 (Mercury density). Design polish may follow.

import { DASHBOARD_HREF } from "@/lib/dashboard-admin";
import { HOUSE_CARD_PAD, HOUSE_MODULE_CLASS } from "@/lib/house-shell";
import { MOBILE_CHROME_LEAD_PAD_CLASS } from "@/lib/mobile-chrome";
import { ASK_ASSISTANT } from "@/lib/product";
import { USER_MENU } from "@/lib/user-menu";
import {
  parseWorkspaceCookie,
  workspaceCookieValue,
  workspaceHome,
} from "@/lib/workspace";

export const SETTINGS = {
  title: "Settings",
  href: "/settings",
  profile: USER_MENU.profile,
  profileHref: USER_MENU.profileHref,
  organization: "Rights Holder",
  organizationHref: "/settings/organization",
  preferences: "Preferences",
  preferencesHref: "/settings/preferences",
  security: "Security",
  securityHref: "/settings/security",
  theme: USER_MENU.theme,
  themeHref: USER_MENU.themeHref,
  themeHelper: "Choose Light, Dark, or Auto.",
  notificationsHref: "/settings/preferences/notifications",
  locationHref: "/settings/preferences/location",
  profileNameHref: "/settings/profile/name",
  organizationEmpty: "No rights holder on this account.",
  company: "Company",
  team: "Team",
  roles: "Roles",
  rolesHref: "/settings/organization/roles",
  agreements: USER_MENU.agreements,
  agreementsHref: USER_MENU.agreementsHref,
  agreementsEmpty: "No agreements on this account.",
  refer: USER_MENU.refer,
  referHref: USER_MENU.referHref,
  back: "Back",
  dashboard: "Home",
  dashboardHref: DASHBOARD_HREF,
} as const;

export const SETTINGS_ABSENT = [
  "User Profile",
  "Company Profile",
  "Phone",
  "Job",
  "Used to sign in.",
  "Name and email on this account.",
  "Edit public profile",
  "Home",
  "Get Help",
  "Give feedback",
] as const;

export type SettingsHubSection = "profile" | "organization" | "preferences" | "security";

export type SettingsRailKind = SettingsHubSection;

export const SETTINGS_HUB_ORDER = [
  "profile",
  "organization",
  "preferences",
  "security",
] as const satisfies readonly SettingsHubSection[];

export const SETTINGS_HUB_HREFS = {
  profile: SETTINGS.profileHref,
  organization: SETTINGS.organizationHref,
  preferences: SETTINGS.preferencesHref,
  security: SETTINGS.securityHref,
} as const;

export const SETTINGS_HUB_LABELS = {
  profile: SETTINGS.profile,
  organization: SETTINGS.organization,
  preferences: SETTINGS.preferences,
  security: SETTINGS.security,
} as const;

export type SettingsHubNavItem = {
  kind: SettingsHubSection;
  label: (typeof SETTINGS_HUB_LABELS)[SettingsHubSection];
  href: (typeof SETTINGS_HUB_HREFS)[SettingsHubSection];
};

const SETTINGS_HUB_ALL: readonly SettingsHubNavItem[] = SETTINGS_HUB_ORDER.map((kind) => ({
  kind,
  label: SETTINGS_HUB_LABELS[kind],
  href: SETTINGS_HUB_HREFS[kind],
}));

/** Universal hub. Same four sections from every workspace. */
export function settingsHubNav(): readonly SettingsHubNavItem[] {
  return SETTINGS_HUB_ALL;
}

/** Desktop rail + mobile list. Profile · Organization · Preferences · Security. */
export const SETTINGS_HUB_NAV = settingsHubNav();

// Rail chrome — house dest-rail slot, pad 16, 8 between rows. Do not put Titles,
// Appearance, Workspace, Account, Users, API, Team, or Manage courses here.
// Item / active / idle / title tokens come from HOUSE_RAIL_* in house-shell.ts.
// Settings is not a workspace but its rail shares the house rail SoT —
// do not fork accent, pill, or title tokens here.
export const SETTINGS_RAIL_PAD_CLASS = "p-[var(--space-4)]";
export const SETTINGS_RAIL_NAV_CLASS = "flex flex-col gap-[var(--space-2)]";
export const SETTINGS_RAIL_DASHBOARD_CLASS = "gap-[var(--space-2)]";
export const SETTINGS_RAIL_CHEVRON_CLASS = "size-4 shrink-0";
/** Body page title. Hub section only. */
export const SETTINGS_PANE_TITLE_CLASS = "t-section text-ink";

export const SETTINGS_PANE_CLASS = "flex flex-col gap-[var(--space-6)]";
export const SETTINGS_SECTION_CLASS = "flex flex-col gap-[var(--space-6)]";
/** Quiet section label under a page title — not a second h1. */
export const SETTINGS_SECTION_LABEL_CLASS = "t-label text-ink-3";

// Coinbase / Apple Settings grammar — one SoT. Shared SoT for
// Settings index, Profile, Preferences, Rights Holder / Legal Entities,
// Get Help, and Social Edit Profile professions plus Topics / IMDb /
// Links drill rows. Do not fork a
// lookalike row.
// Row: label · muted secondary · chevron. Whole row tappable.
// Read-only rows drop the chevron. Inset group: quiet label above,
// rows on one muted house surface. Add / Invite are trailing rows
// inside the group — never header pills. Light 24Frame register.
export const SETTINGS_DRILL_LIST_CLASS = "flex flex-col";
export const SETTINGS_DRILL_ROW_CLASS =
  "flex min-h-11 w-full items-center justify-between gap-[var(--space-4)] py-[var(--space-3)] text-left t-body leading-5 text-ink";
// Default copy for hub, Help, Profile, and person rows: label over
// value. PrefDrillGroup value drills do not use this — see
// SETTINGS_DRILL_VALUE_TRAIL_* (row-grammar lock v2).
export const SETTINGS_DRILL_COPY_CLASS = "flex min-w-0 flex-col gap-[var(--space-1)]";
// Person rows: avatar stays leading. Identity + trailing stack on
// phone so the row never truncates. Desktop keeps identity · action.
export const SETTINGS_DRILL_LEADING_BODY_CLASS =
  "flex min-w-0 flex-1 flex-col items-start gap-[var(--space-2)] md:flex-row md:items-center md:justify-between md:gap-[var(--space-4)]";
export const SETTINGS_DRILL_VALUE_CLASS = "t-body-sm text-ink-3";
// PrefDrillGroup Coinbase horizontal drill (lock v2). One row:
// label left, value trailing, chevron in the auto column centered
// on the full copy height (items-center — never the label line alone).
// Phone: flex-wrap + shrink-0 moves the value under the label only
// when it cannot share the line; max-w-full wraps the value, no
// ellipsis. Desktop stays one row (md:flex-nowrap). Do not point
// person rows (leading) or hub Family B here.
export const SETTINGS_DRILL_VALUE_TRAIL_CLASS =
  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--space-2)]";
export const SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS =
  "flex min-w-0 flex-wrap items-center justify-between gap-x-[var(--space-4)] gap-y-[var(--space-1)] md:flex-nowrap";
export const SETTINGS_DRILL_VALUE_TRAIL_LABEL_CLASS = "shrink-0 whitespace-nowrap";
export const SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS =
  "t-body-sm max-w-full shrink-0 text-ink-3 [overflow-wrap:anywhere] md:min-w-0 md:shrink md:text-right";
export const SETTINGS_DRILL_VALUE_TRAIL_CHEVRON_CLASS =
  "flex shrink-0 items-center gap-[var(--space-2)]";
export const SETTINGS_DRILL_ACCENT_CLASS = "text-accent";
export const SETTINGS_DRILL_CHEVRON_CLASS = `${SETTINGS_RAIL_CHEVRON_CLASS} text-ink-3`;

// House equivalent of an inset grouped list. Quiet label sits above;
// rows live in one muted rounded surface. Not card-surface, not a
// titled Card with a header pill.
export const SETTINGS_GROUP_STACK_CLASS = "flex flex-col gap-[var(--space-2)]";
/** Same quiet label as SETTINGS_SECTION_LABEL_CLASS — no twin. */
export const SETTINGS_GROUP_LABEL_CLASS = SETTINGS_SECTION_LABEL_CLASS;
export const SETTINGS_GROUP_CLASS =
  `${HOUSE_MODULE_CLASS} overflow-hidden px-[var(--space-4)]`;
// Hairline between rows only. No gap and no extra margin. Row pad is
// SETTINGS_DRILL_ROW_CLASS py (space-3 / 12). This list adds no
// vertical pad of its own.
export const SETTINGS_GROUP_LIST_CLASS =
  "flex list-none flex-col divide-y divide-hairline";

// RH index cards stay on desktop. Phone drops the frame so the
// grouped list is the surface — not a website card stack.
export const SETTINGS_INDEX_CARD_CLASS =
  "max-md:!border-0 max-md:!bg-transparent max-md:!rounded-none";
export const SETTINGS_INDEX_CARD_BODY_CLASS = "max-md:!p-0";

// Compact Dialog form density — labeled fields + DialogFooter.
// Mutate surfaces on Settings use this, not a stacked page form.
// Field labels match Coinbase drill-in / Preferences: small muted
// sentence case. Not t-label ALL-CAPS. Errors are quiet type, not
// a muted dump box. Grouped fields sit on the house muted module.
export const SETTINGS_DIALOG_FORM_CLASS = "flex flex-col gap-[var(--space-3)]";
export const SETTINGS_DIALOG_FIELD_CLASS = "flex flex-col gap-[var(--space-2)]";
export const SETTINGS_DIALOG_LABEL_CLASS = "t-body-sm normal-case tracking-normal text-ink-3";
export const SETTINGS_DIALOG_ERROR_CLASS = "t-body-sm text-ink-2";
export const SETTINGS_DIALOG_GROUP_CLASS =
  `${HOUSE_MODULE_CLASS} ${HOUSE_CARD_PAD} flex flex-col gap-[var(--space-4)]`;
export const SETTINGS_DIALOG_FOOTER_CLASS =
  "max-md:flex-col-reverse max-md:items-stretch";
export const SETTINGS_DIALOG_HELP_CLASS = "t-body-sm text-ink-3";
export const SETTINGS_EDIT_HELPER_CLASS = SETTINGS_DIALOG_HELP_CLASS;

// Preferences Appearance — house muted module + pad 16. Same surface
// as dashboard / directory modules. Not card-surface (Profile /
// Organization form frame). Notification groups are not this card.
// Desktop: readable settings column (~48rem). Phone stays full
// content width — do not constrain the Coinbase drill-in stack.
export const SETTINGS_CONTENT_MEASURE_CLASS = "w-full md:max-w-[48rem]";
export const SETTINGS_PREF_BLOCK_CLASS =
  `${HOUSE_MODULE_CLASS} ${HOUSE_CARD_PAD} ${SETTINGS_CONTENT_MEASURE_CLASS} flex flex-col gap-[var(--space-3)]`;
export const SETTINGS_PREF_TITLE_CLASS = "t-heading text-ink";

// Mobile Settings page-lead back = News PageHeader ArrowLeft SoT.
// settingsHeaderBack() is the pane-parent SoT: hub → Back,
// hub section → Settings, drill-in pane → parent section. The hub
// exit is settingsHubExitHref()
// — the route recorded on entry, else the workspace cookie home.
// document.referrer and history.back() are not that exit. Referrer
// does not move on client hops, and shell pushState copies the flight
// tree, so Back no-ops on the same page or lands on Aggregation.
// The static hub href is only the unknown-workspace fallback
// (Aggregation dashboard). Hidden at md, where the Settings rail stays.
// Do not hard-label the hub "Home" — Settings is account chrome from
// any surface, not a Home-owned workspace. News stays "Home". Do not
// put a caret in HouseLeadChrome. Do not fork a third back glyph.
export const SETTINGS_HEADER_PAD_CLASS = MOBILE_CHROME_LEAD_PAD_CLASS;
export const SETTINGS_PAGE_LEAD_BACK_CLASS = "md:hidden";

export const SETTINGS_RAIL_ABSENT = [
  "Titles",
  "Deliveries",
  "Recent activity",
  "Activity",
  ASK_ASSISTANT,
  "Queue",
  "Avails",
  "Channels",
  "Finance",
  "Clients",
  "Account",
  "Users",
  "API",
  "Appearance",
  "Workspace",
  "You",
  "Social",
  "Education",
  "Aggregation",
  "Company",
  "Team",
  "Manage courses",
  "Home",
] as const;

export function isSettingsPath(pathname: string): boolean {
  return pathname === SETTINGS.href || pathname.startsWith(`${SETTINGS.href}/`);
}

/** Account-menu Settings door. Always the hub — never a workspace land. */
export function settingsLandHref(pathname?: string | null): string {
  void pathname;
  return SETTINGS.href;
}

/** Parent label for a Settings drill-in (`/settings/{section}/{field}`). */
export function settingsDrillParentLabel(parentHref: string): string {
  if (parentHref === SETTINGS.profileHref) return SETTINGS.profile;
  if (parentHref === SETTINGS.organizationHref) return SETTINGS.organization;
  if (parentHref === SETTINGS.preferencesHref) return SETTINGS.preferences;
  if (parentHref === SETTINGS.agreementsHref) return SETTINGS.agreements;
  if (parentHref === SETTINGS.referHref) return SETTINGS.refer;
  return SETTINGS.title;
}

export function settingsHeaderBack(pathname: string | null | undefined): {
  href: string;
  label: string;
} {
  if (!pathname || pathname === SETTINGS.href) {
    return { href: SETTINGS.dashboardHref, label: SETTINGS.back };
  }
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "settings" && parts.length >= 3) {
    const parent = `/${parts[0]}/${parts[1]}`;
    return { href: parent, label: settingsDrillParentLabel(parent) };
  }
  return { href: SETTINGS.href, label: SETTINGS.title };
}

/** Same-origin document.referrer = usable in-app history for Activity / Help Back. */
export function settingsHubHasInAppReferrer(
  referrer: string | null | undefined,
  origin: string,
): boolean {
  if (!referrer || !origin) return false;
  try {
    return new URL(referrer).origin === origin;
  } catch {
    return false;
  }
}

// Entry route for the Settings hub exit. sessionStorage, not
// document.referrer (stale across client hops) and not the shell
// history stack (pushState makes Back a same-page no-op).
export const SETTINGS_RETURN_STORAGE = "frame_settings_return";

const settingsReturnListeners = new Set<() => void>();

export function subscribeSettingsReturn(listener: () => void): () => void {
  settingsReturnListeners.add(listener);
  return () => {
    settingsReturnListeners.delete(listener);
  };
}

/** In-app path worth restoring. Settings drills are not an entry. */
export function settingsReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) return null;
  const noHash = trimmed.split("#")[0] ?? "";
  if (!noHash.startsWith("/")) return null;
  const pathOnly = noHash.split("?")[0] || "/";
  let decoded = pathOnly;
  try {
    decoded = decodeURIComponent(pathOnly);
  } catch {
    return null;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) return null;
  if (decoded.includes("://")) return null;
  if (isSettingsPath(decoded)) return null;
  return noHash;
}

/** Path to store when `toHref` enters Settings from outside it. */
export function settingsReturnToRemember(fromHref: string, toHref: string): string | null {
  if (fromHref === toHref) return null;
  const destPath = toHref.split("#")[0]?.split("?")[0] || "/";
  if (!isSettingsPath(destPath)) return null;
  return settingsReturnPath(fromHref);
}

export function rememberSettingsReturnPath(value: string): void {
  const path = settingsReturnPath(value);
  if (!path || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(SETTINGS_RETURN_STORAGE, path);
  } catch {
    // Private mode. The workspace cookie home remains the exit.
    return;
  }
  for (const listener of settingsReturnListeners) listener();
}

export function readSettingsReturnPath(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return settingsReturnPath(sessionStorage.getItem(SETTINGS_RETURN_STORAGE));
  } catch {
    return null;
  }
}

/**
 * Hub exit. Remembered entry route, else the workspace cookie home.
 * Aggregation dashboard only when that cookie is missing or aggregation.
 */
export function settingsHubExitHref(input: {
  remembered?: string | null;
  workspaceCookie?: string | null;
}): string {
  const remembered = settingsReturnPath(input.remembered);
  if (remembered) return remembered;
  return workspaceHome(parseWorkspaceCookie(input.workspaceCookie));
}

export function readSettingsHubExitHref(): string {
  const workspaceCookie =
    typeof document === "undefined" ? null : workspaceCookieValue(document.cookie);
  return settingsHubExitHref({
    remembered: readSettingsReturnPath(),
    workspaceCookie,
  });
}

function pathSection(pathname: string): SettingsHubSection | null {
  if (
    pathname === SETTINGS.organizationHref
    || pathname.startsWith(`${SETTINGS.organizationHref}/`)
  ) {
    return "organization";
  }
  if (
    pathname === SETTINGS.preferencesHref
    || pathname.startsWith(`${SETTINGS.preferencesHref}/`)
  ) {
    return "preferences";
  }
  if (
    pathname === SETTINGS.securityHref
    || pathname.startsWith(`${SETTINGS.securityHref}/`)
  ) {
    return "security";
  }
  return "profile";
}

/** Hub section from the path. Profile doors (agreements / refer) wash Profile. Theme washes Preferences. */
export function settingsHubSection(pathname: string | null | undefined): SettingsHubSection | null {
  if (!pathname) return "profile";
  return pathSection(pathname);
}

/** Body page title — hub section only. Never SETTINGS.title. */
export function settingsPaneTitle(section: SettingsHubSection): string {
  return SETTINGS_HUB_LABELS[section];
}

/** Active follows the hub section. Theme washes Preferences. */
export function settingsRailActive(
  kind: SettingsRailKind,
  section: SettingsHubSection | null,
): boolean {
  return section !== null && kind === section;
}
