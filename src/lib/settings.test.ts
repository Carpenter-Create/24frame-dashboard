import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_CARD_PAD,
  HOUSE_MODULE_CLASS,
  HOUSE_RAIL_TITLE_CLASS,
} from "./house-shell";
import { menuLabelTruncatesOnPhone } from "./menu-host";
import { MOBILE_CHROME_LEAD_PAD_CLASS } from "./mobile-chrome";
import { USER_MENU, USER_MENU_ACTIONS } from "./user-menu";
import {
  SETTINGS,
  SETTINGS_ABSENT,
  SETTINGS_HUB_NAV,
  SETTINGS_HUB_ORDER,
  SETTINGS_HEADER_PAD_CLASS,
  SETTINGS_PAGE_LEAD_BACK_CLASS,
  SETTINGS_DIALOG_ERROR_CLASS,
  SETTINGS_DIALOG_FIELD_CLASS,
  SETTINGS_DIALOG_FOOTER_CLASS,
  SETTINGS_DIALOG_FORM_CLASS,
  SETTINGS_DIALOG_GROUP_CLASS,
  SETTINGS_DIALOG_HELP_CLASS,
  SETTINGS_DIALOG_LABEL_CLASS,
  SETTINGS_DRILL_ACCENT_CLASS,
  SETTINGS_DRILL_CHEVRON_CLASS,
  SETTINGS_DRILL_COPY_CLASS,
  SETTINGS_DRILL_LEADING_BODY_CLASS,
  SETTINGS_DRILL_ROW_CLASS,
  SETTINGS_DRILL_VALUE_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_CHEVRON_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_LABEL_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS,
  SETTINGS_GROUP_CLASS,
  SETTINGS_GROUP_LABEL_CLASS,
  SETTINGS_GROUP_LIST_CLASS,
  SETTINGS_GROUP_STACK_CLASS,
  SETTINGS_EDIT_HELPER_CLASS,
  SETTINGS_INDEX_CARD_BODY_CLASS,
  SETTINGS_INDEX_CARD_CLASS,
  SETTINGS_PANE_CLASS,
  SETTINGS_PANE_TITLE_CLASS,
  SETTINGS_SECTION_LABEL_CLASS,
  SETTINGS_CONTENT_MEASURE_CLASS,
  SETTINGS_PREF_BLOCK_CLASS,
  SETTINGS_PREF_TITLE_CLASS,
  SETTINGS_RAIL_ABSENT,
  SETTINGS_RAIL_CHEVRON_CLASS,
  SETTINGS_RAIL_PAD_CLASS,
  isSettingsPath,
  SETTINGS_RETURN_STORAGE,
  settingsDrillParentLabel,
  settingsHeaderBack,
  settingsHubExitHref,
  settingsHubHasInAppReferrer,
  settingsHubNav,
  settingsHubSection,
  settingsLandHref,
  settingsPaneTitle,
  settingsRailActive,
  settingsReturnPath,
  settingsReturnToRemember,
} from "./settings";

const RETIRED_SETTINGS_PATHS = [
  "/settings/you",
  "/settings/social",
  "/settings/education",
  "/settings/aggregation",
] as const;

const RETIRED_SETTINGS_PAGES = [
  "src/app/(app)/settings/you/page.tsx",
  "src/app/(app)/settings/social/page.tsx",
  "src/app/(app)/settings/education/page.tsx",
  "src/app/(app)/settings/aggregation/page.tsx",
  "src/app/(app)/account/page.tsx",
  "src/app/(app)/account/agreements/page.tsx",
  "src/app/(app)/account/company/page.tsx",
  "src/app/(app)/refer/page.tsx",
] as const;

describe("settings hub lock", () => {
  it("titles the hub Settings and keeps Profile doors", () => {
    expect(SETTINGS.title).toBe("Settings");
    expect(SETTINGS.title).toBe(USER_MENU.settings);
    expect(SETTINGS.href).toBe("/settings");
    expect(SETTINGS.href).toBe(USER_MENU.settingsHref);
    expect(SETTINGS.profile).toBe("Profile");
    expect(SETTINGS.profileHref).toBe("/settings/profile");
    expect(SETTINGS.organization).toBe("Rights Holder");
    expect(SETTINGS.organizationHref).toBe("/settings/organization");
    expect(SETTINGS.preferences).toBe("Preferences");
    expect(SETTINGS.preferencesHref).toBe("/settings/preferences");
    expect(SETTINGS.security).toBe("Security");
    expect(SETTINGS.securityHref).toBe("/settings/security");
    expect(SETTINGS.theme).toBe("Theme");
    expect(SETTINGS.theme).toBe(USER_MENU.theme);
    expect(SETTINGS.themeHref).toBe("/settings/preferences/theme");
    expect(SETTINGS.themeHref).toBe(USER_MENU.themeHref);
    expect(SETTINGS.themeHelper).toBe("Choose Light, Dark, or Auto.");
    expect(SETTINGS.notificationsHref).toBe("/settings/preferences/notifications");
    expect(SETTINGS.locationHref).toBe("/settings/preferences/location");
    expect(SETTINGS.profileNameHref).toBe("/settings/profile/name");
    expect(SETTINGS).not.toHaveProperty("sectionQuery");
    expect(SETTINGS.agreements).toBe("Agreements");
    expect(SETTINGS.agreementsHref).toBe("/settings/agreements");
    expect(SETTINGS.agreementsEmpty).toBe("No agreements on this account.");
    expect(SETTINGS.refer).toBe("Refer a friend");
    expect(SETTINGS.referHref).toBe("/settings/refer");
    expect(SETTINGS.back).toBe("Back");
    expect(SETTINGS.dashboard).toBe("Home");
    expect(SETTINGS.dashboardHref).toBe("/aggregation/dashboard");
    expect(SETTINGS.company).toBe("Company");
    expect(SETTINGS.team).toBe("Team");
    expect(SETTINGS.roles).toBe("Roles");
    expect(SETTINGS.rolesHref).toBe("/settings/organization/roles");
    expect(SETTINGS).not.toHaveProperty("companyHref");
    expect(SETTINGS).not.toHaveProperty("teamHref");
    expect(SETTINGS).not.toHaveProperty("youHref");
    expect(SETTINGS).not.toHaveProperty("socialHref");
    expect(SETTINGS).not.toHaveProperty("educationHref");
    expect(SETTINGS).not.toHaveProperty("aggregationHref");
    expect(SETTINGS.profileHref).toBe(USER_MENU.profileHref);
    expect(SETTINGS.agreementsHref).toBe(USER_MENU.agreementsHref);
    expect(SETTINGS.referHref).toBe(USER_MENU.referHref);
  });

  it("locks section order Profile · Organization · Preferences · Security", () => {
    expect(SETTINGS_HUB_ORDER).toEqual(["profile", "organization", "preferences", "security"]);
    expect(settingsHubNav()).toEqual(SETTINGS_HUB_NAV);
    expect(SETTINGS_HUB_NAV.map((item) => item.kind)).toEqual([
      "profile",
      "organization",
      "preferences",
      "security",
    ]);
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).toEqual([
      "Profile",
      "Rights Holder",
      "Preferences",
      "Security",
    ]);
    expect(SETTINGS_HUB_NAV.map((item) => item.href)).toEqual([
      "/settings/profile",
      "/settings/organization",
      "/settings/preferences",
      "/settings/security",
    ]);
  });

  it("opens a hub section from the path — agreements / refer wash Profile", () => {
    expect(settingsHubSection("/settings/profile")).toBe("profile");
    expect(settingsHubSection("/settings")).toBe("profile");
    expect(settingsHubSection("/settings/agreements")).toBe("profile");
    expect(settingsHubSection("/settings/refer")).toBe("profile");
    expect(settingsHubSection("/settings/organization")).toBe("organization");
    expect(settingsHubSection("/settings/organization/company")).toBe("organization");
    expect(settingsHubSection("/settings/organization/entities/new")).toBe("organization");
    expect(settingsHubSection("/settings/organization/roles")).toBe("organization");
    expect(settingsHubSection("/settings/preferences")).toBe("preferences");
    expect(settingsHubSection("/settings/preferences/theme")).toBe("preferences");
    expect(settingsHubSection("/settings/preferences/notifications")).toBe("preferences");
    expect(settingsHubSection("/settings/preferences/location")).toBe("preferences");
    expect(settingsHubSection("/settings/profile/name")).toBe("profile");
    expect(settingsHubSection("/settings/security")).toBe("security");
    expect(settingsHubSection("")).toBe("profile");
    expect(settingsHubSection(null)).toBe("profile");
  });

  it("hard-cuts retired workspace-spine paths — no redirect table", () => {
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    const nextConfig = readFileSync("next.config.ts", "utf8");
    expect(settingsSrc).not.toContain("SETTINGS_LEGACY");
    expect(settingsSrc).not.toContain("settingsLegacyRedirect");
    expect(settingsSrc).not.toContain("permanentRedirect");
    expect(settingsSrc).not.toContain("sectionQuery");
    expect(settingsSrc).not.toContain("parseSettingsSectionQuery");
    for (const path of RETIRED_SETTINGS_PATHS) {
      expect(settingsSrc).not.toContain(`"${path}"`);
      expect(nextConfig).not.toContain(`source: "${path}"`);
    }
    expect(nextConfig).not.toContain('source: "/settings"');
    for (const page of RETIRED_SETTINGS_PAGES) {
      expect(existsSync(page)).toBe(false);
    }
  });

  it("opens Settings on the universal hub from every workspace", () => {
    expect(settingsLandHref("/education")).toBe("/settings");
    expect(settingsLandHref("/social")).toBe("/settings");
    expect(settingsLandHref("/")).toBe("/settings");
    expect(settingsLandHref("/help")).toBe("/settings");
    expect(settingsLandHref("/settings/preferences")).toBe("/settings");
    expect(settingsLandHref(null)).toBe("/settings");
    expect(settingsLandHref()).toBe(SETTINGS.href);
    expect(settingsLandHref()).toBe(USER_MENU.settingsHref);
  });

  it("does not host Manage courses on Settings Preferences", () => {
    expect(SETTINGS).not.toHaveProperty("manageCourses");
    expect(SETTINGS).not.toHaveProperty("manageCoursesHref");
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).not.toContain("manageCourses");
    expect(settingsSrc).not.toContain("settingsManageCoursesVisible");
    expect(SETTINGS_RAIL_ABSENT).toContain("Manage courses");
  });

  it("does not keep an Edit public profile Settings door", () => {
    expect(SETTINGS).not.toHaveProperty("editPublicProfile");
    expect(SETTINGS).not.toHaveProperty("editPublicProfileHref");
    expect(SETTINGS_ABSENT).toContain("Edit public profile");
    expect(SETTINGS_ABSENT).toContain("Home");
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).not.toContain("editPublicProfile");
    expect(settingsSrc).not.toContain("editPublicProfileHref");
    expect(settingsSrc).not.toContain("SOCIAL_ROUTES");
  });

  it("does not invent Phone, Job, or the old email helper", () => {
    const blob = `${SETTINGS.profile} ${SETTINGS.organization} ${SETTINGS.preferences} ${SETTINGS.agreements} ${SETTINGS.agreementsEmpty} ${SETTINGS.refer}`;
    for (const absent of SETTINGS_ABSENT) {
      expect(blob).not.toContain(absent);
    }
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Company");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Team");
    expect(SETTINGS_HUB_NAV.map((item) => item.kind)).not.toContain("company");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("You");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Social");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Education");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Aggregation");
    expect(SETTINGS.agreementsEmpty).not.toMatch(/accepted yet|download|view agreement/i);
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).toContain("settings");
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).not.toContain("agreements");
    expect(USER_MENU_ACTIONS.map((item) => item.kind)).not.toContain("refer");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Get Help");
    expect(SETTINGS_HUB_NAV.map((item) => item.label)).not.toContain("Give feedback");
    expect(SETTINGS_ABSENT).toContain("Get Help");
    expect(SETTINGS_ABSENT).toContain("Give feedback");
  });

  it("treats every /settings path as the focused shell", () => {
    expect(isSettingsPath("/settings")).toBe(true);
    expect(isSettingsPath("/settings/profile")).toBe(true);
    expect(isSettingsPath("/settings/organization")).toBe(true);
    expect(isSettingsPath("/settings/preferences")).toBe(true);
    expect(isSettingsPath("/settings/security")).toBe(true);
    expect(isSettingsPath("/settings/agreements")).toBe(true);
    expect(isSettingsPath("/settings/team")).toBe(true);
    expect(isSettingsPath("/settings/future-pane")).toBe(true);
    expect(isSettingsPath("/")).toBe(false);
    expect(isSettingsPath("/titles")).toBe(false);
    expect(isSettingsPath("/help")).toBe(false);
    expect(isSettingsPath("/education")).toBe(false);
    expect(isSettingsPath("/social/courses")).toBe(false);
  });

  it("washes the current hub section", () => {
    expect(settingsRailActive("profile", "profile")).toBe(true);
    expect(settingsRailActive("preferences", "preferences")).toBe(true);
    expect(settingsRailActive("security", "security")).toBe(true);
    expect(settingsRailActive("profile", "preferences")).toBe(false);
    expect(settingsRailActive("organization", "profile")).toBe(false);
    expect(settingsRailActive("security", "profile")).toBe(false);
  });

  it("backs the page-lead Back on the hub and Settings on a pushed pane", () => {
    expect(settingsHeaderBack("/settings")).toEqual({
      href: SETTINGS.dashboardHref,
      label: "Back",
    });
    expect(settingsHeaderBack("/settings").label).not.toBe("Home");
    expect(settingsHeaderBack("/settings").label).not.toBe(SETTINGS.dashboard);
    expect(settingsHeaderBack(null)).toEqual({
      href: SETTINGS.dashboardHref,
      label: SETTINGS.back,
    });
    expect(settingsHeaderBack("/settings/preferences")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/profile")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/organization")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/agreements")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/security")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/team")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/future-pane")).toEqual({
      href: "/settings",
      label: "Settings",
    });
    expect(settingsHeaderBack("/settings/preferences/theme")).toEqual({
      href: "/settings/preferences",
      label: "Preferences",
    });
    expect(settingsHeaderBack("/settings/preferences/notifications")).toEqual({
      href: "/settings/preferences",
      label: "Preferences",
    });
    expect(settingsHeaderBack("/settings/preferences/location")).toEqual({
      href: "/settings/preferences",
      label: "Preferences",
    });
    expect(settingsHeaderBack("/settings/profile/name")).toEqual({
      href: "/settings/profile",
      label: "Profile",
    });
    expect(settingsHeaderBack("/settings/organization/entities")).toEqual({
      href: "/settings/organization",
      label: "Rights Holder",
    });
    expect(settingsHeaderBack("/settings/organization/company")).toEqual({
      href: SETTINGS.organizationHref,
      label: SETTINGS.organization,
    });
    expect(settingsHeaderBack("/settings/organization/entities/new")).toEqual({
      href: SETTINGS.organizationHref,
      label: SETTINGS.organization,
    });
    expect(settingsHeaderBack("/settings/organization/entities/ent-1")).toEqual({
      href: SETTINGS.organizationHref,
      label: SETTINGS.organization,
    });
    expect(settingsDrillParentLabel("/settings/preferences")).toBe("Preferences");
    expect(settingsDrillParentLabel("/settings/unknown")).toBe("Settings");
    expect(SETTINGS_PAGE_LEAD_BACK_CLASS).toBe("md:hidden");
    expect(SETTINGS_PAGE_LEAD_BACK_CLASS).not.toContain("absolute");
    expect(SETTINGS_PAGE_LEAD_BACK_CLASS).not.toContain("text-accent");
    expect(SETTINGS_HEADER_PAD_CLASS).toBe(MOBILE_CHROME_LEAD_PAD_CLASS);
    expect(SETTINGS_HEADER_PAD_CLASS).toBe("px-[var(--space-6)]");
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).not.toContain("SETTINGS_HEADER_BACK_CLASS");
    expect(settingsSrc).not.toContain("accent caret");
    expect(settingsSrc).not.toContain("emblem stays");
    expect(settingsSrc).toContain("News PageHeader ArrowLeft");
    expect(settingsSrc).toContain("hub → Back");
    expect(settingsSrc).not.toContain("hub → Home");
  });

  it("exits to the entry route, else the workspace cookie home", () => {
    expect(SETTINGS_RETURN_STORAGE).toBe("frame_settings_return");
    expect(settingsReturnPath("/social")).toBe("/social");
    expect(settingsReturnPath("/social/explore?q=ada")).toBe("/social/explore?q=ada");
    expect(settingsReturnPath("/education/manage")).toBe("/education/manage");
    expect(settingsReturnPath("/staff/queue")).toBe("/staff/queue");
    expect(settingsReturnPath("/home?period=ytd")).toBe("/home?period=ytd");
    expect(settingsReturnPath("/co-productions")).toBe("/co-productions");
    expect(settingsReturnPath("/settings")).toBeNull();
    expect(settingsReturnPath("/settings/profile")).toBeNull();
    expect(settingsReturnPath("/settings/preferences/theme?x=1")).toBeNull();
    expect(settingsReturnPath("//evil.example")).toBeNull();
    expect(settingsReturnPath("/\\evil")).toBeNull();
    expect(settingsReturnPath("https://evil.example/social")).toBeNull();
    expect(settingsReturnPath("/%2F%2Fevil.example")).toBeNull();
    expect(settingsReturnPath("")).toBeNull();
    expect(settingsReturnPath(null)).toBeNull();

    expect(settingsReturnToRemember("/social/explore", "/settings")).toBe("/social/explore");
    expect(settingsReturnToRemember("/education", "/settings/profile")).toBe("/education");
    expect(settingsReturnToRemember("/staff/queue", "/settings/security")).toBe("/staff/queue");
    expect(settingsReturnToRemember("/settings", "/settings/profile")).toBeNull();
    expect(settingsReturnToRemember("/settings/profile", "/settings")).toBeNull();
    expect(settingsReturnToRemember("/social", "/social")).toBeNull();
    expect(settingsReturnToRemember("/social", "/help")).toBeNull();

    expect(settingsHubExitHref({ remembered: "/social/explore", workspaceCookie: "aggregation" })).toBe(
      "/social/explore",
    );
    expect(settingsHubExitHref({ remembered: "/education", workspaceCookie: "aggregation" })).toBe(
      "/education",
    );
    expect(settingsHubExitHref({ remembered: "/staff/avails", workspaceCookie: "social" })).toBe(
      "/staff/avails",
    );
    expect(settingsHubExitHref({ remembered: "/settings/profile", workspaceCookie: "social" })).toBe(
      "/social",
    );
    expect(settingsHubExitHref({ remembered: null, workspaceCookie: "social" })).toBe("/social");
    expect(settingsHubExitHref({ remembered: null, workspaceCookie: "education" })).toBe("/education");
    expect(settingsHubExitHref({ remembered: null, workspaceCookie: "staff" })).toBe("/staff/queue");
    expect(settingsHubExitHref({ remembered: null, workspaceCookie: "aggregation" })).toBe(
      "/aggregation/dashboard",
    );
    expect(settingsHubExitHref({ remembered: null, workspaceCookie: null })).toBe(
      "/aggregation/dashboard",
    );
    expect(settingsHubExitHref({ remembered: "https://evil.example", workspaceCookie: "education" })).toBe(
      "/education",
    );

    const hubBack = readFileSync("src/components/settings/settings-hub-back-link.tsx", "utf8");
    expect(hubBack).toContain("readSettingsHubExitHref()");
    expect(hubBack).toContain("router.push(dest)");
    expect(hubBack).toContain("if (historyBack)");
    const recorder = readFileSync("src/components/settings/settings-return-recorder.tsx", "utf8");
    expect(recorder).toContain("settingsReturnToRemember");
    expect(recorder).toContain("rememberSettingsReturnPath");
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    expect(shell).toContain("SettingsReturnRecorder");
  });

  it("uses in-app referrer for hub Back and falls back off-origin", () => {
    const origin = "https://app.24frame.co";
    expect(settingsHubHasInAppReferrer(`${origin}/social`, origin)).toBe(true);
    expect(settingsHubHasInAppReferrer(`${origin}/home`, origin)).toBe(true);
    expect(settingsHubHasInAppReferrer(`${origin}/settings/profile`, origin)).toBe(true);
    expect(settingsHubHasInAppReferrer("https://example.com/social", origin)).toBe(false);
    expect(settingsHubHasInAppReferrer("", origin)).toBe(false);
    expect(settingsHubHasInAppReferrer(null, origin)).toBe(false);
    expect(settingsHubHasInAppReferrer(undefined, origin)).toBe(false);
    expect(settingsHubHasInAppReferrer(`${origin}/home`, "")).toBe(false);
    expect(settingsHubHasInAppReferrer("not a url", origin)).toBe(false);
  });

  it("titles the body pane with the hub section — never SETTINGS.title", () => {
    expect(settingsPaneTitle("profile")).toBe("Profile");
    expect(settingsPaneTitle("organization")).toBe("Rights Holder");
    expect(settingsPaneTitle("preferences")).toBe("Preferences");
    expect(settingsPaneTitle("security")).toBe("Security");
    expect(settingsPaneTitle("profile")).not.toBe(SETTINGS.title);
    expect(SETTINGS_PANE_TITLE_CLASS).toBe("t-section text-ink");
  });

  it("locks Coinbase mobile Settings drill-row tokens — one house SoT", () => {
    expect(SETTINGS_DRILL_ROW_CLASS).toContain("justify-between");
    expect(SETTINGS_DRILL_ROW_CLASS).toContain("min-h-11");
    expect(SETTINGS_DRILL_ROW_CLASS).toContain("t-body");
    expect(SETTINGS_DRILL_VALUE_CLASS).toBe("t-body-sm text-ink-3");
    expect(SETTINGS_DRILL_ROW_CLASS).not.toContain("truncate");
    expect(SETTINGS_DRILL_VALUE_CLASS).not.toContain("truncate");
    expect(SETTINGS_DRILL_LEADING_BODY_CLASS).not.toContain("truncate");
    expect(SETTINGS_DRILL_LEADING_BODY_CLASS).toContain("flex-col");
    expect(SETTINGS_DRILL_LEADING_BODY_CLASS).toContain("md:flex-row");
    expect(SETTINGS_DRILL_ACCENT_CLASS).toBe("text-accent");
    expect(SETTINGS_DRILL_CHEVRON_CLASS).toContain(SETTINGS_RAIL_CHEVRON_CLASS);
    expect(SETTINGS_GROUP_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(SETTINGS_GROUP_CLASS).not.toContain("card-surface");
    expect(SETTINGS_GROUP_LABEL_CLASS).toBe(SETTINGS_SECTION_LABEL_CLASS);
    expect(SETTINGS_GROUP_LABEL_CLASS).toBe("t-label text-ink-3");
    expect(SETTINGS_GROUP_STACK_CLASS).toContain("gap-[var(--space-2)]");
    expect(SETTINGS_GROUP_STACK_CLASS).toBe("flex flex-col gap-[var(--space-2)]");
    expect(SETTINGS_GROUP_LIST_CLASS).toBe(
      "flex list-none flex-col divide-y divide-hairline",
    );
    expect(SETTINGS_GROUP_LIST_CLASS).not.toContain("gap-");
    expect(SETTINGS_GROUP_LIST_CLASS).not.toContain("space-y");
    expect(SETTINGS_GROUP_CLASS).not.toMatch(/\bpy-/);
    expect(SETTINGS_GROUP_CLASS).not.toContain("gap-");
    expect(SETTINGS_DRILL_VALUE_TRAIL_CLASS).toBe(
      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-[var(--space-2)]",
    );
    expect(SETTINGS_DRILL_VALUE_TRAIL_CLASS).not.toContain("items-start");
    expect(SETTINGS_DRILL_VALUE_TRAIL_CLASS).not.toContain("self-start");
    expect(SETTINGS_DRILL_VALUE_TRAIL_CLASS).not.toContain("flex-col");
    expect(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS).toContain("flex-wrap");
    expect(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS).toContain("items-center");
    expect(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS).toContain("md:flex-nowrap");
    expect(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS).toContain("gap-x-[var(--space-4)]");
    expect(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS).toContain("gap-y-[var(--space-1)]");
    expect(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS).not.toContain("flex-col");
    expect(SETTINGS_DRILL_VALUE_TRAIL_LABEL_CLASS).toContain("whitespace-nowrap");
    expect(SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS).toContain("t-body-sm");
    expect(SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS).toContain("text-ink-3");
    expect(SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS).toContain("max-w-full");
    expect(SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS).not.toContain("truncate");
    expect(menuLabelTruncatesOnPhone(SETTINGS_DRILL_VALUE_TRAIL_TEXT_CLASS)).toBe(false);
    expect(menuLabelTruncatesOnPhone(SETTINGS_DRILL_VALUE_TRAIL_COPY_CLASS)).toBe(false);
    expect(SETTINGS_DRILL_VALUE_TRAIL_CHEVRON_CLASS).toContain("items-center");
    expect(SETTINGS_DRILL_VALUE_TRAIL_CHEVRON_CLASS).not.toContain("self-start");
    expect(SETTINGS_DRILL_VALUE_TRAIL_CHEVRON_CLASS).not.toContain("items-start");
    expect(SETTINGS_DRILL_COPY_CLASS).toContain("flex-col");
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).toContain("Shared SoT for");
    expect(settingsSrc).toContain("Rights Holder / Legal Entities");
    expect(settingsSrc).toContain("Get Help");
    expect(settingsSrc).toContain("Social Edit Profile professions");
    expect(settingsSrc).toContain("one SoT");
    expect(settingsSrc).toContain("never header pills");
    expect(settingsSrc).not.toContain("companyHref");
    expect(SETTINGS_PANE_CLASS).toBe("flex flex-col gap-[var(--space-6)]");
    expect(SETTINGS_PANE_CLASS).not.toContain("space-12");
    expect(SETTINGS_SECTION_LABEL_CLASS).toBe("t-label text-ink-3");
    expect(SETTINGS_INDEX_CARD_CLASS).toContain("max-md:!border-0");
    expect(SETTINGS_INDEX_CARD_BODY_CLASS).toBe("max-md:!p-0");
  });

  it("keeps Settings Dialog forms compact — not a stacked page form", () => {
    expect(SETTINGS_DIALOG_FORM_CLASS).toBe("flex flex-col gap-[var(--space-3)]");
    expect(SETTINGS_DIALOG_FIELD_CLASS).toBe("flex flex-col gap-[var(--space-2)]");
    expect(SETTINGS_DIALOG_HELP_CLASS).toBe("t-body-sm text-ink-3");
    expect(SETTINGS_DIALOG_FORM_CLASS).not.toContain("space-4");
    expect(SETTINGS_DIALOG_FORM_CLASS).not.toContain("space-6");
    expect(SETTINGS_EDIT_HELPER_CLASS).toBe(SETTINGS_DIALOG_HELP_CLASS);
    expect(SETTINGS_DIALOG_LABEL_CLASS).toBe("t-body-sm normal-case tracking-normal text-ink-3");
    expect(SETTINGS_DIALOG_LABEL_CLASS).not.toContain("t-label");
    expect(SETTINGS_DIALOG_LABEL_CLASS).not.toContain("uppercase");
    expect(SETTINGS_DIALOG_ERROR_CLASS).toBe("t-body-sm text-ink-2");
    expect(SETTINGS_DIALOG_ERROR_CLASS).not.toContain("bg-surface-muted");
    expect(SETTINGS_DIALOG_ERROR_CLASS).not.toContain("border");
    expect(SETTINGS_DIALOG_GROUP_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(SETTINGS_DIALOG_GROUP_CLASS).toContain(HOUSE_CARD_PAD);
    expect(SETTINGS_DIALOG_FOOTER_CLASS).toContain("max-md:flex-col-reverse");
    expect(SETTINGS_DRILL_ROW_CLASS).not.toContain("#");
    expect(SETTINGS_DRILL_ROW_CLASS).toBe(
      "flex min-h-11 w-full items-center justify-between gap-[var(--space-4)] py-[var(--space-3)] text-left t-body leading-5 text-ink",
    );
  });

  it("keeps Appearance on the house muted module — not a new surface", () => {
    expect(SETTINGS_PREF_BLOCK_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(SETTINGS_PREF_BLOCK_CLASS).toContain(HOUSE_CARD_PAD);
    expect(SETTINGS_PREF_BLOCK_CLASS).toContain("gap-[var(--space-3)]");
    expect(SETTINGS_PREF_BLOCK_CLASS).not.toContain("card-surface");
    expect(SETTINGS_PREF_TITLE_CLASS).toBe("t-heading text-ink");
    expect(SETTINGS_PREF_TITLE_CLASS).not.toContain("t-section");
  });

  it("locks desktop Preferences to a constrained measure — not rail-to-edge rows", () => {
    expect(SETTINGS_CONTENT_MEASURE_CLASS).toBe("w-full md:max-w-[48rem]");
    expect(SETTINGS_CONTENT_MEASURE_CLASS).toContain("md:max-w-[48rem]");
    expect(SETTINGS_CONTENT_MEASURE_CLASS).not.toContain("40rem");
    expect(SETTINGS_CONTENT_MEASURE_CLASS).not.toContain("mx-auto");
    expect(SETTINGS_PREF_BLOCK_CLASS).toContain(SETTINGS_CONTENT_MEASURE_CLASS);
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).toContain("constrained measure");
    expect(settingsSrc).toContain("not full-bleed rows");
    expect(settingsSrc).toContain("~48rem");
    expect(settingsSrc).not.toContain("~40rem");
    expect(settingsSrc).not.toContain("md:max-w-[40rem]");
  });

  it("locks the settings rail on house pad 16 and workspace-rail SoT", () => {
    expect(SETTINGS_RAIL_PAD_CLASS).toBe("p-[var(--space-4)]");
    expect(SETTINGS_RAIL_CHEVRON_CLASS).toBe("size-4 shrink-0");
    const settingsSrc = readFileSync("src/lib/settings.ts", "utf8");
    expect(settingsSrc).not.toContain("SETTINGS_RAIL_ITEM_CLASS");
    expect(settingsSrc).not.toContain("SETTINGS_RAIL_ACTIVE_CLASS");
    expect(settingsSrc).not.toContain("SETTINGS_RAIL_IDLE_CLASS");
    expect(settingsSrc).not.toContain("SETTINGS_RAIL_TITLE_CLASS");
    expect(settingsSrc).toContain("house-shell.ts");
    expect(HOUSE_RAIL_TITLE_CLASS).toContain("t-label");
    expect(SETTINGS_RAIL_ABSENT).toEqual([
      "Titles",
      "Deliveries",
      "Recent activity",
      "Activity",
      "Ask 24Frame AI",
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
    ]);
  });
});
