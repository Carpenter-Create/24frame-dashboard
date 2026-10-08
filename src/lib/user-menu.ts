// Account-menu copy and lock. Lives in lib/, not JSX.
// Apple door — phone sheet and desktop 264 share one stack:
// identity → Settings → Theme → Get Help → Log out. GC staff get
// Staff first, above Settings (Adam 2026-10-08,
// docs/design-locks/staff-account-menu-lock-v1.md): Staff left the
// workspace switcher for this menu. Members never see the row. Chrome may
// differ (full-bleed sheet vs dropdown). Labels may not fork.
// Adam lock 2026-09-22, path amended 2026-09-23: Theme is its own
// avatar-menu row. It drills to /settings/preferences/theme. The
// Preferences Theme row uses that same picker. One gc-theme SoT —
// not a second store. No header sun/moon. Auto changes only in the picker.
// 24Frame AI is the header sparkle only — not a menu row.
// Workspace lives on the header switcher. One Settings hub. No
// forked Settings.
// Profile is a Settings hub pane (/settings/profile), not a
// second avatar-menu door. Settings land href is
// settingsLandHref() — always /settings. Do not invent /account/*.
// Agreements / Refer stay /settings doors, not menu rows. Get Help
// is the avatar-menu footer door — /help. Give feedback lives on
// /help/feedback, not Settings. Company stays off this menu. Do
// not invent /account/workspace, /settings/workspace,
// /account/appearance, /settings/appearance, or /account/feedback.
// Theme is /settings/preferences/theme — not a flat /settings/theme twin.
// Legal is parked. Do not invent Phone, Job, Notifications,
// Privacy, or a name derived from the email local-part.
// Desktop identity link (Coinbase lock): Manage account → Profile.
// That link is not a body row. The phone sheet does not show it.

import { version as APP_VERSION } from "../../package.json";
import { ASK_ASSISTANT, ASSISTANT_NAME, WORKSPACE_STAFF_LABEL } from "@/lib/product";
import { workspaceHome } from "@/lib/workspace";

export const USER_MENU = {
  workspace: "Workspace",
  staff: WORKSPACE_STAFF_LABEL,
  staffHref: workspaceHome("staff"),
  profile: "Profile",
  profileHref: "/settings/profile",
  manageAccount: "Manage account",
  settings: "Settings",
  settingsHref: "/settings",
  theme: "Theme",
  themeHref: "/settings/preferences/theme",
  agreements: "Agreements",
  agreementsHref: "/settings/agreements",
  appearance: "Appearance",
  help: "Get Help",
  helpHref: "/help",
  refer: "Refer a friend",
  referHref: "/settings/refer",
  logOut: "Log out",
  versionPrefix: "v",
} as const;

export const USER_MENU_ABSENT = [
  "Workspace",
  "Workspaces",
  "Manage account",
  "Notifications",
  "Privacy",
  "Sign out",
  "User Profile",
  "Company Profile",
  "Phone",
  "Job",
  "Legal",
  ASSISTANT_NAME,
  ASK_ASSISTANT,
] as const;

export type UserMenuStaffAction = {
  kind: "staff";
  label: typeof USER_MENU.staff;
  href: typeof USER_MENU.staffHref;
};

export type UserMenuSettingsAction = {
  kind: "settings";
  label: typeof USER_MENU.settings;
  href: typeof USER_MENU.settingsHref;
};

export type UserMenuThemeAction = {
  kind: "theme";
  label: typeof USER_MENU.theme;
  href: typeof USER_MENU.themeHref;
};

export type UserMenuHelpAction = {
  kind: "help";
  label: typeof USER_MENU.help;
  href: typeof USER_MENU.helpHref;
};

export type UserMenuLinkAction =
  | UserMenuStaffAction
  | UserMenuSettingsAction
  | UserMenuThemeAction
  | UserMenuHelpAction;

export type UserMenuAction = UserMenuLinkAction;

/** GC staff only — never in USER_MENU_ACTIONS (accountSheetRows adds it). */
export const USER_MENU_STAFF_ACTIONS: readonly UserMenuStaffAction[] = [
  { kind: "staff", label: USER_MENU.staff, href: USER_MENU.staffHref },
];

export const USER_MENU_PRIMARY_ACTIONS: readonly UserMenuSettingsAction[] = [
  { kind: "settings", label: USER_MENU.settings, href: USER_MENU.settingsHref },
];

export const USER_MENU_THEME_ACTIONS: readonly UserMenuThemeAction[] = [
  { kind: "theme", label: USER_MENU.theme, href: USER_MENU.themeHref },
];

export const USER_MENU_HELP_ACTIONS: readonly UserMenuHelpAction[] = [
  { kind: "help", label: USER_MENU.help, href: USER_MENU.helpHref },
];

export const USER_MENU_ACTIONS: readonly UserMenuLinkAction[] = [
  ...USER_MENU_PRIMARY_ACTIONS,
  ...USER_MENU_THEME_ACTIONS,
  ...USER_MENU_HELP_ACTIONS,
];

// Same IA on phone and desktop. Theme is this row — not Preferences.
export const USER_MENU_PHONE_ACTIONS: readonly UserMenuAction[] = USER_MENU_ACTIONS;

export function userMenuVersion(): string {
  return `${USER_MENU.versionPrefix}${APP_VERSION}`;
}

/** Avatar letter from the email. Not a name. */
export function userMenuAvatarInitial(email: string): string {
  return (email.trim().charAt(0) || "?").toUpperCase();
}

/**
 * A real display name only. Empty or whitespace is absent.
 * Never derive a name from an email — callers must pass a name that
 * already exists, or omit it.
 */
export function userMenuName(name: string | null | undefined): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export type UserMenuPanelModel = {
  avatarInitial: string;
  name: string | null;
  email: string;
  actions: readonly UserMenuAction[];
};

export function userMenuPanel(email: string, name?: string | null): UserMenuPanelModel {
  return {
    avatarInitial: userMenuAvatarInitial(email),
    name: userMenuName(name),
    email,
    actions: USER_MENU_ACTIONS,
  };
}
