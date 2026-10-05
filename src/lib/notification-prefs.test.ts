import { describe, expect, it } from "vitest";

import { existsSync, readFileSync } from "node:fs";

import { HOUSE_CARD_PAD, HOUSE_MODULE_CLASS, HOUSE_SECTION_AIR_CLASS } from "./house-shell";
import { NOTIFICATION_EMAIL } from "./notifications";
import {
  NOTIFICATION_PREF_CHANNELS,
  NOTIFICATION_PREF_CHANNEL_HEAD_CLASS,
  NOTIFICATION_PREF_DEFAULTS,
  NOTIFICATION_PREF_EVENTS,
  NOTIFICATION_PREF_GROUPS,
  NOTIFICATION_PREF_HEAD_CLASS,
  NOTIFICATION_PREF_MATRIX_CLASS,
  NOTIFICATION_PREF_ROW_CLASS,
  NOTIFICATION_PREF_SWITCH_OFF_CLASS,
  NOTIFICATION_PREF_SWITCH_ON_CLASS,
  NOTIFICATION_PREF_SWITCH_THUMB_CLASS,
  NOTIFICATION_PREF_SWITCH_THUMB_OFF_CLASS,
  NOTIFICATION_PREF_SWITCH_THUMB_ON_CLASS,
  NOTIFICATION_PREF_SWITCH_TRACK_CLASS,
  NOTIFICATION_PREF_TITLE_CLASS,
  NOTIFICATION_PREF_TITLE_STATUS_EVENT,
  NOTIFICATION_PREF_WRAP_CLASS,
  NOTIFICATION_PREFS,
  isNotificationChannelOn,
  notificationPrefEventForKind,
  notificationPrefFamilyForEvent,
  notificationPrefFamilyForKind,
  notificationPrefWriteSchema,
  notificationPrefsToRow,
  parseNotificationPrefsRow,
  withNotificationPref,
} from "./notification-prefs";
import {
  SETTINGS_CONTENT_MEASURE_CLASS,
  SETTINGS_GROUP_CLASS,
  SETTINGS_GROUP_LIST_CLASS,
  SETTINGS_PREF_TITLE_CLASS,
} from "./settings";

describe("notification prefs SoT", () => {
  it("locks the 26 founder events in Aggregation / Social / Education / Account", () => {
    expect(NOTIFICATION_PREF_EVENTS).toHaveLength(26);
    expect(NOTIFICATION_PREF_CHANNELS).toEqual(["in_app", "email"]);
    expect(NOTIFICATION_PREF_GROUPS.map((group) => group.id)).toEqual([
      "aggregation",
      "social",
      "education",
      "account",
    ]);
    expect(NOTIFICATION_PREF_GROUPS.flatMap((group) => group.sections.flatMap((section) => [
      ...section.events,
    ]))).toEqual([...NOTIFICATION_PREF_EVENTS]);
    expect(NOTIFICATION_PREFS.events.title_returned).toBe("Title returned for revision");
    expect(NOTIFICATION_PREFS.events.dm_received).toBe("Direct message received");
    expect(NOTIFICATION_PREFS.events.course_available).toBe("New course available");
    expect(NOTIFICATION_PREFS.events.team_invite).toBe("Team invite received");
    expect(NOTIFICATION_PREFS.groups.reporting).toBe("Reporting");
    expect(`${NOTIFICATION_PREFS.title} ${NOTIFICATION_PREFS.helper}`).not.toMatch(
      /seamless|frictionless|elevate|amplify|unleash|supercharge/i,
    );
  });

  it("defaults in-app on; email on for live ops, money, reporting, DMs, and account", () => {
    expect(NOTIFICATION_PREF_DEFAULTS.title_returned).toEqual({ in_app: true, email: true });
    expect(NOTIFICATION_PREF_DEFAULTS.title_status).toEqual({ in_app: true, email: true });
    expect(NOTIFICATION_PREF_DEFAULTS.delivery_status).toEqual({ in_app: true, email: true });
    expect(NOTIFICATION_PREF_DEFAULTS.mention).toEqual({ in_app: true, email: false });
    expect(NOTIFICATION_PREF_DEFAULTS.course_updated).toEqual({ in_app: true, email: false });
    expect(NOTIFICATION_PREF_DEFAULTS.team_invite).toEqual({ in_app: true, email: true });
    expect(NOTIFICATION_PREF_DEFAULTS.security_signin).toEqual({ in_app: true, email: true });
  });

  it("maps live notification kinds onto the matrix rows", () => {
    expect(notificationPrefEventForKind("title_rejected")).toBe("title_returned");
    expect(notificationPrefEventForKind("delivery_update")).toBe("delivery_status");
    expect(notificationPrefEventForKind("new_follower")).toBe("new_follower");
    expect(notificationPrefFamilyForKind("title_rejected")).toBe("aggregation");
    expect(notificationPrefFamilyForKind("delivery_update")).toBe("aggregation");
    expect(notificationPrefFamilyForKind("new_follower")).toBe("social");
    expect(notificationPrefFamilyForEvent("reporting_ready")).toBe("reporting");
    expect(notificationPrefFamilyForEvent("dm_received")).toBe("social");
    expect(notificationPrefFamilyForEvent("course_available")).toBe("education");
    expect(notificationPrefFamilyForEvent("team_invite")).toBe("account");
    expect(NOTIFICATION_PREF_TITLE_STATUS_EVENT).toBe("title_status");
    expect(Object.keys(NOTIFICATION_EMAIL)).toEqual([
      "title_rejected",
      "delivery_update",
      "new_follower",
    ]);
  });

  it("reads a partial jsonb row as defaults plus the written cells", () => {
    const prefs = parseNotificationPrefsRow({
      prefs: {
        title_returned: { email: false },
        leftover: "ignore",
      },
    });
    expect(prefs.title_returned.email).toBe(false);
    expect(prefs.title_returned.in_app).toBe(true);
    expect(prefs.delivery_status.email).toBe(true);
    expect(parseNotificationPrefsRow(null)).toEqual(NOTIFICATION_PREF_DEFAULTS);
    expect(parseNotificationPrefsRow({ prefs: { title_returned: { email: "no" } } })).toEqual(
      NOTIFICATION_PREF_DEFAULTS,
    );
  });

  it("flips one cell and stores the object for upsert", () => {
    const next = withNotificationPref(NOTIFICATION_PREF_DEFAULTS, "mention", "email", true);
    expect(isNotificationChannelOn(next, "mention", "email")).toBe(true);
    expect(isNotificationChannelOn(NOTIFICATION_PREF_DEFAULTS, "mention", "email")).toBe(false);
    const row = notificationPrefsToRow("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", next);
    expect(row.user_id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(row.prefs.mention.email).toBe(true);
    expect(row.prefs.title_returned.email).toBe(true);
  });

  it("uses house inset groups — one SETTINGS_GROUP stack per family, not a wrap sheet", () => {
    expect(NOTIFICATION_PREF_WRAP_CLASS).toContain(SETTINGS_CONTENT_MEASURE_CLASS);
    expect(NOTIFICATION_PREF_WRAP_CLASS).toContain(HOUSE_SECTION_AIR_CLASS);
    expect(NOTIFICATION_PREF_WRAP_CLASS).not.toContain(HOUSE_MODULE_CLASS);
    expect(NOTIFICATION_PREF_WRAP_CLASS).not.toContain(HOUSE_CARD_PAD);
    expect(NOTIFICATION_PREF_WRAP_CLASS).toBe(
      "w-full md:max-w-[48rem] flex flex-col gap-[var(--space-6)]",
    );
    expect(NOTIFICATION_PREF_MATRIX_CLASS).toBe(`flex flex-col ${HOUSE_SECTION_AIR_CLASS}`);
    expect(NOTIFICATION_PREF_MATRIX_CLASS).not.toContain("divide-y");
    expect(NOTIFICATION_PREF_HEAD_CLASS).toContain("grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(NOTIFICATION_PREF_HEAD_CLASS).toContain("items-center");
    expect(NOTIFICATION_PREF_HEAD_CLASS).not.toContain("items-end");
    expect(NOTIFICATION_PREF_ROW_CLASS).toContain("grid-cols-[minmax(0,1fr)_auto_auto]");
    expect(NOTIFICATION_PREF_ROW_CLASS).toContain("leading-5");
    expect(NOTIFICATION_PREF_ROW_CLASS).toContain("py-[var(--space-3)]");
    expect(NOTIFICATION_PREF_TITLE_CLASS).toBe(SETTINGS_PREF_TITLE_CLASS);
    expect(NOTIFICATION_PREF_CHANNEL_HEAD_CLASS).toBe("t-body-sm text-ink-3");
    expect(NOTIFICATION_PREF_CHANNEL_HEAD_CLASS).not.toContain("t-label");
    expect(SETTINGS_GROUP_CLASS).toContain(HOUSE_MODULE_CLASS);
    expect(SETTINGS_GROUP_LIST_CLASS).toContain("divide-y divide-hairline");
    expect(NOTIFICATION_PREF_SWITCH_TRACK_CLASS).toContain("h-5");
    expect(NOTIFICATION_PREF_SWITCH_TRACK_CLASS).toContain("w-9");
    expect(NOTIFICATION_PREF_SWITCH_TRACK_CLASS).not.toContain("h-6");
    expect(NOTIFICATION_PREF_SWITCH_TRACK_CLASS).not.toContain("w-10");
    expect(NOTIFICATION_PREF_SWITCH_THUMB_CLASS).toContain("size-4");
    expect(NOTIFICATION_PREF_SWITCH_THUMB_CLASS).not.toContain("size-5");
    expect(NOTIFICATION_PREF_SWITCH_THUMB_ON_CLASS).toBe("translate-x-[18px]");
    expect(NOTIFICATION_PREF_SWITCH_THUMB_OFF_CLASS).toBe("translate-x-0.5");
    expect(NOTIFICATION_PREF_SWITCH_ON_CLASS).toBe("bg-accent");
    expect(NOTIFICATION_PREF_SWITCH_OFF_CLASS).toBe("bg-ink-3/40");
    const switchSrc = readFileSync("src/components/settings/notification-preferences.tsx", "utf8");
    expect(switchSrc).toContain("function PrefSwitch");
    expect(switchSrc).toContain("function ChannelHead");
    expect(switchSrc).not.toContain("function SectionHead");
    expect(switchSrc).toContain("NOTIFICATION_PREF_WRAP_CLASS");
    expect(switchSrc).toContain("SETTINGS_GROUP_STACK_CLASS");
    expect(switchSrc).toContain("SETTINGS_GROUP_LABEL_CLASS");
    expect(switchSrc).toContain("SETTINGS_GROUP_CLASS");
    expect(switchSrc).toContain("SETTINGS_GROUP_LIST_CLASS");
    expect(switchSrc).not.toContain("NOTIFICATION_PREF_SECTION_CLASS");
    expect(switchSrc).not.toContain("NOTIFICATION_PREF_LIST_CLASS");
    expect(switchSrc).not.toContain("from \"@/components/ui/switch\"");
    expect(existsSync("src/components/ui/switch.tsx")).toBe(false);
    expect(switchSrc).not.toContain("h-6 w-10");
    expect(switchSrc).not.toContain("size-5");
  });

  it("rejects invented events at the write edge", () => {
    expect(
      notificationPrefWriteSchema.safeParse({
        event: "title_returned",
        channel: "in_app",
        enabled: false,
      }).success,
    ).toBe(true);
    expect(
      notificationPrefWriteSchema.safeParse({
        event: "title_queue",
        channel: "email",
        enabled: true,
      }).success,
    ).toBe(false);
  });
});
