import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PreferencesSettings } from "@/components/settings/preferences-settings";
import { HOUSE_MODULE_CLASS } from "@/lib/house-shell";
import { EMPTY_PROFILE_LOCATION, LOCATION } from "@/lib/location";
import {
  NOTIFICATION_PREF_DEFAULTS,
  NOTIFICATION_PREF_EVENTS,
  NOTIFICATION_PREF_SWITCH_TRACK_CLASS,
  NOTIFICATION_PREF_WRAP_CLASS,
  NOTIFICATION_PREFS,
} from "@/lib/notification-prefs";
import {
  SETTINGS,
  SETTINGS_CONTENT_MEASURE_CLASS,
  SETTINGS_DRILL_COPY_CLASS,
  SETTINGS_DRILL_VALUE_TRAIL_CLASS,
  SETTINGS_GROUP_CLASS,
  SETTINGS_GROUP_LABEL_CLASS,
  SETTINGS_GROUP_LIST_CLASS,
  SETTINGS_GROUP_STACK_CLASS,
} from "@/lib/settings";
import { getOrgContext } from "@/lib/supabase/context";
import SettingsPreferencesPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/app/(app)/settings/preferences/actions", () => ({
  loadOwnNotificationPrefs: vi.fn(async () => NOTIFICATION_PREF_DEFAULTS),
  saveNotificationPref: vi.fn(),
}));
vi.mock("./actions", () => ({
  loadOwnNotificationPrefs: vi.fn(async () => NOTIFICATION_PREF_DEFAULTS),
  saveNotificationPref: vi.fn(),
}));
vi.mock("@/app/(app)/settings/preferences/location/actions", () => ({
  loadProfileLocation: vi.fn(async () => ({ city: "Austin", region: "TX", country: "US" })),
}));

function ctx(isGcStaff: boolean) {
  return {
    user: { id: "u1", email: "ada@example.com", name: "Ada" },
    rows: [],
    orgs: [],
    activeOrg: null,
    activeRole: null,
    canOperate: true,
    isGcStaff,
    unread: Promise.resolve(0),
  };
}

const here = dirname(fileURLToPath(import.meta.url));
const pageSrc = readFileSync(join(here, "page.tsx"), "utf8");
const paneSrc = readFileSync("src/components/settings/preferences-settings.tsx", "utf8");

describe("SettingsPreferencesPage", () => {
  beforeEach(() => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx(false) as never);
  });

  it("shows Location and Theme in one PrefDrillGroup, then the notification matrix", async () => {
    const html = renderToStaticMarkup(await SettingsPreferencesPage());
    expect(html).toContain('data-settings-hub="preferences"');
    expect(html).toMatch(/<h1[^>]*>Preferences<\/h1>/);
    expect(html).not.toMatch(/<h1[^>]*>Settings<\/h1>/);
    expect(html).not.toMatch(/<h2[^>]*>Preferences<\/h2>/);
    expect(html).toContain(SETTINGS.preferences);
    expect(paneSrc).toContain("settingsPaneTitle");
    expect(paneSrc).not.toContain("SETTINGS.title");
    expect(html).toContain('data-settings-pref-index=""');
    expect(html).toContain('data-settings-pref-drill-group=""');
    expect(html).toContain('data-settings-drill-row="theme"');
    expect(html).toContain(`href="${SETTINGS.themeHref}"`);
    expect(html).toContain(">Light<");
    expect(html).not.toContain('data-settings-section="appearance"');
    expect(html).not.toContain('data-settings-appearance=""');
    expect(html).not.toContain("System default");
    expect(html).not.toContain(">Appearance<");
    expect(html).not.toContain("data-settings-speech-learning");
    expect(html).not.toContain("Learn from typed and dictated text");
    expect(html).toContain('data-settings-drill-row="notifications"');
    expect(html).toContain(`href="${SETTINGS.notificationsHref}"`);
    expect(html).toContain('data-settings-drill-row="location"');
    expect(html).toContain(`href="${SETTINGS.locationHref}"`);
    expect(html).toContain(LOCATION.title);
    expect(html).toContain("Austin, TX, US");
    expect(paneSrc).not.toContain("truncate");
    expect(html).toContain("md:hidden");
    expect(html).toContain("hidden md:block");
    expect(html).toContain('data-settings-pref-desktop=""');
    expect(html).toContain('data-settings-pref-column=""');
    expect(html).toContain(SETTINGS_CONTENT_MEASURE_CLASS);
    expect(paneSrc).toContain("SETTINGS_CONTENT_MEASURE_CLASS");
    const columnAt = html.indexOf('data-settings-pref-column=""');
    const drillAt = html.indexOf('data-settings-pref-drill-group=""');
    const wrapAt = html.indexOf('data-settings-notification-wrap=""');
    expect(columnAt).toBeGreaterThan(-1);
    expect(columnAt).toBeLessThan(drillAt);
    expect(drillAt).toBeLessThan(wrapAt);
    expect(html.slice(columnAt, drillAt)).toContain(SETTINGS_CONTENT_MEASURE_CLASS);
    expect(paneSrc).toContain("constrained measure");
    expect(html).not.toContain(SETTINGS.themeHelper);
    expect(html).toContain('data-settings-section="notifications"');
    expect(html).toContain('data-settings-notification-matrix=""');
    expect(html).toContain(NOTIFICATION_PREFS.title);
    expect(html).toContain(NOTIFICATION_PREFS.inApp);
    expect(html).toContain(NOTIFICATION_PREFS.email);
    for (const event of NOTIFICATION_PREF_EVENTS) {
      expect(html).toContain(`data-settings-notification-row="${event}"`);
      expect(html).toContain(NOTIFICATION_PREFS.events[event]);
    }
    expect(html).not.toContain("data-house-empty");
    expect(html).not.toContain("No preferences on this account.");
    expect(html).not.toContain("Manage courses");
    expect(html).not.toContain("data-settings-manage-courses");
    expect(html).not.toContain('href="/education/manage"');
    expect(html).not.toContain('href="/education"');
    expect(html).not.toContain("CreateCourseForm");
    expect(html).toContain(NOTIFICATION_PREFS.groups.aggregation);
    expect(html).toContain(NOTIFICATION_PREFS.groups.social);
    expect(html).toContain(NOTIFICATION_PREFS.groups.education);
    expect(html).toContain(NOTIFICATION_PREFS.groups.account);
    expect(html).toContain(NOTIFICATION_PREFS.groups.reporting);
    expect(html).not.toContain("data-settings-section=\"appearance\"");
    expect(html).toContain(NOTIFICATION_PREF_WRAP_CLASS);
    expect(html).toContain('data-settings-notification-wrap=""');
    expect(html).toContain(SETTINGS_GROUP_STACK_CLASS);
    expect(html).toContain(SETTINGS_GROUP_LABEL_CLASS);
    expect(html).toContain(SETTINGS_GROUP_CLASS);
    expect(html).toContain(SETTINGS_GROUP_LIST_CLASS);
    expect(html).toContain(HOUSE_MODULE_CLASS);
    expect(html.match(/data-settings-group=""/g)?.length).toBe(6);
    const drillGroup = html.slice(
      html.indexOf('data-settings-pref-drill-group=""'),
      html.indexOf('data-menu-host="phone"'),
    );
    expect(drillGroup).toContain(SETTINGS_GROUP_CLASS);
    expect(drillGroup).toContain('data-settings-drill-row="location"');
    expect(drillGroup).toContain('data-settings-drill-row="theme"');
    expect(drillGroup.indexOf('data-settings-drill-row="location"')).toBeLessThan(
      drillGroup.indexOf('data-settings-drill-row="theme"'),
    );
    expect(drillGroup).toContain("min-h-11");
    expect(drillGroup).toContain("t-body-sm");
    expect(drillGroup).toContain("text-ink-3");
    expect(drillGroup).toContain("size-4");
    expect(drillGroup).toContain(SETTINGS_DRILL_VALUE_TRAIL_CLASS);
    expect(drillGroup).toContain("md:flex-nowrap");
    expect(drillGroup).toContain("items-center");
    expect(drillGroup).not.toContain(SETTINGS_DRILL_COPY_CLASS);
    expect(drillGroup).not.toContain("truncate");
    expect(drillGroup).not.toContain('data-settings-drill-row="notifications"');
    const matrix = html.slice(html.indexOf('data-settings-section="notifications"'));
    expect(matrix).not.toContain('data-settings-drill-row="theme"');
    expect(matrix).not.toContain('data-settings-drill-row="location"');
    expect(html.match(/data-settings-notification-section="/g)?.length).toBe(5);
    expect(html.match(/data-settings-notification-channel-head=""/g)?.length).toBe(5);
    expect(html).toContain("divide-y divide-hairline");
    expect(html).not.toContain("py-[var(--space-8)]");
    expect(html).toContain(NOTIFICATION_PREF_SWITCH_TRACK_CLASS);
    expect(html).toContain("h-5 w-9");
    expect(html).not.toContain("h-6 w-10");
    expect(html).toContain(
      `<h2 class="${SETTINGS_GROUP_LABEL_CLASS} px-[var(--space-4)]">${NOTIFICATION_PREFS.groups.aggregation}</h2>`,
    );
    expect(html).toContain(
      `<h2 class="${SETTINGS_GROUP_LABEL_CLASS} px-[var(--space-4)]">${NOTIFICATION_PREFS.groups.reporting}</h2>`,
    );
    expect(html).toContain(`data-settings-notification-section="aggregation"`);
    expect(html).toContain(`data-settings-notification-section="reporting"`);
    expect(html).toContain(`data-settings-notification-switch="title_returned:in_app"`);
    expect(html).toContain(`data-settings-notification-switch="title_returned:email"`);
    expect(html).not.toContain("CreateCourseForm");
    expect(pageSrc).not.toContain("education-forms");
    expect(paneSrc).not.toContain("SETTINGS.manageCourses");
    expect(paneSrc).not.toContain("data-settings-manage-courses");
    expect(paneSrc).not.toContain("manageCoursesHref");
    expect(paneSrc).not.toContain("settingsManageCoursesVisible");
    expect(paneSrc).not.toContain("AppearancePreferences");
    expect(paneSrc).not.toContain("AppearanceThemeRow");
    expect(paneSrc).toContain("PrefDrillGroup");
    expect(paneSrc).not.toContain("AppearanceThemePicker");
    expect(paneSrc).not.toContain("SpeechLearningPreference");
    expect(paneSrc).toContain("NotificationPreferences");
    expect(paneSrc).toContain("SettingsDrillRow");
  });

  it("shows the empty location placeholder when no place is saved", () => {
    const html = renderToStaticMarkup(
      createElement(PreferencesSettings, {
        prefs: NOTIFICATION_PREF_DEFAULTS,
        location: EMPTY_PROFILE_LOCATION,
      }),
    );
    expect(html).toContain('data-settings-drill-row="location"');
    expect(html).toContain(LOCATION.empty);
    expect(html).not.toContain("Austin, TX, US");
  });

  it("never shows Manage courses on Preferences, including staff", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx(true) as never);
    const html = renderToStaticMarkup(await SettingsPreferencesPage());
    expect(html).not.toContain("Manage courses");
    expect(html).not.toContain("data-settings-manage-courses");
    expect(html).not.toContain('href="/education/manage"');
    expect(html).not.toContain('href="/education"');
    expect(html).not.toContain("/gc/education");
    expect(html).toContain('data-settings-notification-matrix=""');
    expect(html).not.toContain("data-house-empty");
  });

  it("sends an unauthenticated visitor to login", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(SettingsPreferencesPage()).rejects.toThrow("REDIRECT:/login");
  });
});
