// Mobile menu family tree v1 — Adam lock 2026-09-22.
// Phone renders family A / B / C / D only. Desktop stays MenuSurface,
// dropdown, or rail (G6). A call site that paints both viewports must
// use MenuDualHost or menuHostClass. Do not invent a third hybrid sheet.
//
// G1. Mobile menus map to A / B / C / D only (or Park).
// G2. Settings hub stays B — quiet row + chevron, never inset cards.
// G3. Account sheet stays A — inset groups + AppSheet chrome.
// G4. Choice pickers stay C (HousePageSelect) — not AccountSheet clones.
// G5. Destination sheet stays D on AppSheet chrome. Hamburger is not
//     mounted; do not fork a second sheet skin to bring it back.
// G6. Desktop SoT stays separate from A–D.

import { HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS } from "@/lib/house-lead-chrome";

export const MENU_FAMILY_LOCK = "mobile-menu-family-tree-v1" as const;

export const MENU_FAMILY_LOCK_DATE = "2026-09-22" as const;

/** Page/section branch. Real box. Phone hidden from md up. */
export const MENU_HOST_PHONE_CLASS = "md:hidden";

/** Page/section branch. Real box. Desktop only. */
export const MENU_HOST_DESKTOP_CLASS = "hidden md:block";

/** Panel inside a host that stays mounted on both viewports (HousePageSelect). */
export const MENU_HOST_DESKTOP_PANEL_CLASS = "max-md:hidden";

/**
 * Header cluster slot. `contents` keeps the avatar a flex sibling of
 * Ask · bell. Same string as the house trailing phone slot — one gate.
 */
export const MENU_HOST_PHONE_SLOT_CLASS = HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS;

/** Desktop header slot. No extra box at md+; hidden on the phone. */
export const MENU_HOST_DESKTOP_SLOT_CLASS = "hidden md:contents";

export type MenuHostShape = "branch" | "slot" | "panel";

export type MenuViewport = "phone" | "desktop";

export type MenuFamilyId = "A" | "B" | "C" | "D";

export function menuHostClass(
  viewport: MenuViewport,
  shape: MenuHostShape = "branch",
): string {
  if (viewport === "phone") {
    return shape === "slot" ? MENU_HOST_PHONE_SLOT_CLASS : MENU_HOST_PHONE_CLASS;
  }
  if (shape === "panel") return MENU_HOST_DESKTOP_PANEL_CLASS;
  if (shape === "slot") return MENU_HOST_DESKTOP_SLOT_CLASS;
  return MENU_HOST_DESKTOP_CLASS;
}

export const MENU_FAMILIES = {
  A: {
    id: "A",
    job: "app-action-sheet",
    primitive: "AppSheet+SheetGroup",
    hosts: ["PhoneAccountMenu", "AccountSheet"],
  },
  B: {
    id: "B",
    job: "settings-push-list",
    primitive: "SettingsHubList+SettingsDrillRow",
    hosts: ["SettingsHubList"],
  },
  C: {
    id: "C",
    job: "choice-sheet",
    primitive: "HousePageSelect",
    hosts: ["HousePageSelect"],
  },
  D: {
    id: "D",
    job: "destination-sheet",
    primitive: "MobileNav+AppSheet",
    mounted: false,
    hosts: [] as const,
  },
} as const;

export const MENU_DESKTOP_SOT = ["MenuSurface", "dropdown", "rail"] as const;

/** Markers that mean a phone family primitive is in the file. */
export const MENU_PHONE_PRIMITIVES = [
  "<AccountSheet",
  "<SheetGroup",
  "<SettingsHubList",
  "<PhoneAccountMenu",
  "<MobileAccountMenu",
  "data-house-page-select-sheet",
] as const;

/** Markers that mean a desktop menu primitive is in the file. */
export const MENU_DESKTOP_PRIMITIVES = [
  "<AccountMenuDropdown",
  "<DesktopAccountMenu",
  "<MenuSurface",
  "<SettingsRail",
  "<ThreadPopoverContent",
  "HOUSE_PAGE_SELECT_PANEL_CLASS",
] as const;

const MENU_GATE_MARKERS = ["menuHostClass(", "<MenuDualHost"] as const;

export function menuSourceMixesHosts(source: string): boolean {
  const phone = MENU_PHONE_PRIMITIVES.some((marker) => source.includes(marker));
  const desktop = MENU_DESKTOP_PRIMITIVES.some((marker) => source.includes(marker));
  return phone && desktop;
}

export function menuSourceHasGate(source: string): boolean {
  return MENU_GATE_MARKERS.some((marker) => source.includes(marker));
}

/** Null when the file is single-viewport or routes both hosts through the gate. */
export function menuHostGateViolation(source: string): string | null {
  if (!menuSourceMixesHosts(source)) return null;
  if (menuSourceHasGate(source)) return null;
  return "phone and desktop menu primitives share a file without MenuDualHost or menuHostClass";
}

/**
 * Bare truncate / ellipsis paints on the phone. `md:truncate` is desktop-only
 * and stays legal. House gospel 2026-09-19.
 */
export function menuLabelTruncatesOnPhone(className: string): boolean {
  return className.split(/\s+/).some((token) => {
    if (!token) return false;
    if (!/truncate|text-ellipsis|ellipsis/.test(token)) return false;
    if (/^(sm|md|lg|xl|2xl):/.test(token)) return false;
    return true;
  });
}

export type MenuGatedSurface = {
  id: string;
  phone: MenuFamilyId | null;
  desktop: (typeof MENU_DESKTOP_SOT)[number] | "form" | null;
  file: string;
  require: readonly string[];
  forbid: readonly string[];
};

export const MENU_GATED_SURFACES: readonly MenuGatedSurface[] = [
  {
    id: "user-menu",
    phone: "A",
    desktop: "dropdown",
    file: "src/components/chrome/user-menu.tsx",
    require: ["<MenuDualHost", "PhoneAccountMenu", "DesktopAccountMenu", 'shape="slot"'],
    forbid: ["<SheetGroup", "<SettingsHubList", "HousePageSelect", "<MenuSurface"],
  },
  {
    id: "account-sheet",
    phone: "A",
    desktop: "dropdown",
    file: "src/components/chrome/account-sheet.tsx",
    require: [
      "menuHostClass(",
      "MobileAccountMenu",
      "DesktopAccountMenu",
      "<AccountSheet",
      "<AccountMenuDropdown",
      "<SheetGroup",
    ],
    forbid: ["SettingsDrillRow", "SettingsHubList", "HousePageSelect", "SETTINGS_DRILL_ROW"],
  },
  {
    id: "settings-hub",
    phone: "B",
    desktop: "rail",
    file: "src/app/(app)/settings/page.tsx",
    require: ["<MenuDualHost", "<SettingsHubList", "<ProfileSettings"],
    forbid: ["<SheetGroup", "<MenuSurface", "HousePageSelect"],
  },
  {
    id: "settings-hub-list",
    phone: "B",
    desktop: null,
    file: "src/components/chrome/settings-hub-list.tsx",
    require: ["menuHostClass(", "SettingsDrillRow", 'data-menu-family="B"'],
    forbid: ["<SheetGroup", "SHEET_GROUP_INSET", "<MenuSurface", "SETTINGS_GROUP_CLASS", "truncate"],
  },
  {
    id: "settings-rail",
    phone: null,
    desktop: "rail",
    file: "src/components/chrome/settings-rail.tsx",
    require: ["data-settings-rail-nav", 'data-menu-family="desktop"'],
    forbid: ["<SheetGroup", "AppSheet", "md:hidden", "HousePageSelect", "<MenuSurface"],
  },
  {
    id: "settings-profile-index",
    phone: "B",
    desktop: "form",
    file: "src/components/settings/profile-settings.tsx",
    require: ["menuHostClass(", "SettingsDrillRow"],
    forbid: ["<SheetGroup", "SHEET_GROUP_INSET", "<MenuSurface"],
  },
  {
    id: "settings-preferences-index",
    phone: "B",
    desktop: "form",
    file: "src/components/settings/preferences-settings.tsx",
    require: ["menuHostClass(", "SettingsDrillRow"],
    forbid: ["<SheetGroup", "SHEET_GROUP_INSET", "<MenuSurface"],
  },
  {
    id: "house-page-select",
    phone: "C",
    desktop: "dropdown",
    file: "src/components/chrome/house-page-select.tsx",
    require: [
      "menuHostClass(",
      "data-house-page-select-sheet",
      "HOUSE_PAGE_SELECT_PANEL_CLASS",
      'data-menu-family="C"',
    ],
    forbid: ["<AccountSheet", "<SheetGroup", "<SettingsHubList", "<MenuSurface"],
  },
];

export type MenuParkedSurface = {
  id: string;
  file: string;
  plan: string;
};

/** Miss-list. Stay parked — do not invent a fifth family to absorb these. */
export const MENU_PARKED_SURFACES: readonly MenuParkedSurface[] = [
  {
    id: "workspace-switcher",
    file: "src/components/chrome/workspace-switcher.tsx",
    plan: "Confirm on Mac. Absorb into C (pick workspace) or A (action groups). No fifth family.",
  },
  {
    id: "activity-bell",
    file: "src/components/activity/activity-bell.tsx",
    plan: "Not a menu family until the phone sheet is assigned. Keep the current bell IA.",
  },
  {
    id: "thread-overflow",
    file: "src/components/chrome/messages-app-header.tsx",
    plan: "Desktop MenuSurface today. Phone path TBD — likely A if sheeted.",
  },
  {
    id: "titles-overflow",
    file: "src/app/(app)/aggregation/titles/[id]/title-lifecycle-controls.tsx",
    plan: "Desktop MenuSurface today. Absorb into A when the phone sheet exists.",
  },
  {
    id: "house-form-select",
    file: "src/components/ui/select.tsx",
    plan: "Dialog field, not family C page chrome. Closed state stays the house input box.",
  },
  {
    id: "social-odd-menus",
    // The desktop Create chooser is gone (Create opens the composer); the
    // phone dock's fan is the Create chooser left.
    file: "src/components/social/social-create-fan.tsx",
    plan: "Park until found. Same rule when classified: A action, B settings nav, C single choice, D destinations.",
  },
];

export function menuSurfaceViolations(
  surface: MenuGatedSurface,
  source: string,
): string[] {
  const violations: string[] = [];
  for (const needle of surface.require) {
    if (!source.includes(needle)) violations.push(`missing ${needle}`);
  }
  for (const needle of surface.forbid) {
    if (source.includes(needle)) violations.push(`mixes grammar via ${needle}`);
  }
  if (surface.phone && surface.desktop) {
    const gate = menuHostGateViolation(source);
    if (gate) violations.push(gate);
  }
  return violations;
}

export function menuFamilyIds(): readonly MenuFamilyId[] {
  return ["A", "B", "C", "D"];
}
