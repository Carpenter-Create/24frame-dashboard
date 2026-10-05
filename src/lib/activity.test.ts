import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { DASHBOARD_HREF } from "./dashboard-admin";
import { HOME_ROOT } from "./workspace";
import { HOUSE_HEADER_TRAILING_HIT_CLASS } from "@/lib/house-lead-chrome";
import {
  APP_SHEET_HOST_CLASS,
  APP_SHEET_RISE_CLASS,
  APP_SHEET_SURFACE_CLASS,
  TEXT_ACTION_CLASS,
} from "@/lib/house-sheet";
import { ACCOUNT_SHEET_HOST_CLASS, ACCOUNT_SHEET_SURFACE_CLASS } from "@/lib/account-sheet";
import {
  SETTINGS_EDIT_HELPER_CLASS,
  SETTINGS_PANE_CLASS,
  SETTINGS_PANE_TITLE_CLASS,
  SETTINGS_SECTION_CLASS,
} from "./settings";
import {
  ACTIVITY_BELL_OPEN_CAP,
  ACTIVITY_BELL_OPEN_DOT_CLASS,
  ACTIVITY_BELL_POPOVER_CLASS,
  ACTIVITY_BELL_SHEET_HOST_CLASS,
  ACTIVITY_BELL_SHEET_SURFACE_CLASS,
  ACTIVITY_BELL_TRIGGER_CLASS,
  ACTIVITY_BELL_TRIGGER_OPEN_CLASS,
  ACTIVITY_BELL_VIEW_ALL_CLASS,
  ACTIVITY_FAMILIES,
  ACTIVITY_FAMILY_ALL,
  ACTIVITY_HELPER_CLASS,
  ACTIVITY_HREF,
  ACTIVITY_KIND_ICON,
  ACTIVITY_PAGE,
  ACTIVITY_PAGE_CLASS,
  ACTIVITY_PREFS_HREF,
  ACTIVITY_SECTION_CLASS,
  ACTIVITY_TITLE_CLASS,
  activityFamilyForWorkspace,
  activityHeaderBack,
  isActivityPath,
  activityBellItems,
  activityEmptyCopy,
  activityFamilyForKind,
  activityFamilyLabel,
  activityHref,
  activityItemHref,
  activityKindIcon,
  activityRelativeTime,
  filterActivityItems,
  isActivityOpen,
  parseActivityFamily,
} from "./activity";

const OPEN_NEW = {
  id: "1",
  title: "North Wind was returned",
  body: "Chain of title is missing.",
  kind: "title_rejected" as const,
  created_at: "2026-09-12T12:00:00.000Z",
  unread: true,
};
const OPEN_OLD = {
  id: "2",
  title: "Harbor Cut delivery update",
  body: "Delivered to the channel.",
  kind: "delivery_update" as const,
  created_at: "2026-08-02T12:00:00.000Z",
  unread: true,
};
const OPEN_FOLLOW = {
  id: "5",
  title: "New follower",
  body: "@ada followed you",
  kind: "new_follower" as const,
  created_at: "2026-09-18T11:30:00.000Z",
  unread: true,
  source_refs: { handle: "ada" },
};
const DONE_NEW = {
  id: "3",
  title: "Winter Light was returned",
  body: "Runtime is required.",
  kind: "title_rejected" as const,
  created_at: "2026-09-15T12:00:00.000Z",
  unread: false,
};
const DONE_OLD = {
  id: "4",
  title: "Older done",
  body: "Taken down.",
  kind: "delivery_update" as const,
  created_at: "2025-12-02T12:00:00.000Z",
  unread: false,
};

const FEED = [DONE_NEW, OPEN_NEW, OPEN_OLD, DONE_OLD];
const FEED_WITH_FOLLOW = [...FEED, OPEN_FOLLOW];
const NOW = new Date("2026-09-18T12:00:00.000Z");

describe("Activity live feed — uncleared only", () => {
  it("keeps unread items and drops cleared ones from the default feed", () => {
    expect(isActivityOpen(OPEN_NEW)).toBe(true);
    expect(isActivityOpen(DONE_NEW)).toBe(false);
    expect(filterActivityItems(FEED).map((row) => row.id)).toEqual(["1", "2"]);
    expect(filterActivityItems(FEED).every((row) => row.unread)).toBe(true);
    expect(activityEmptyCopy()).toBe(ACTIVITY_PAGE.empty);
    expect(ACTIVITY_PAGE.empty).toBe("You're all caught up.");
    expect(ACTIVITY_PAGE.emptyHint).toBe("New alerts will show here.");
    expect(ACTIVITY_PAGE).not.toHaveProperty("open");
    expect(ACTIVITY_PAGE).not.toHaveProperty("done");
    expect(ACTIVITY_PAGE).not.toHaveProperty("emptyOpen");
    expect(ACTIVITY_PAGE).not.toHaveProperty("emptyDone");
  });

  it("keeps newest→oldest order from the feed primitive", () => {
    expect(filterActivityItems(FEED).map((row) => row.created_at)).toEqual([
      "2026-09-12T12:00:00.000Z",
      "2026-08-02T12:00:00.000Z",
    ]);
  });
});

describe("Activity chrome href", () => {
  it("keeps one chrome-level SoT and does not nest under Aggregation", () => {
    expect(ACTIVITY_HREF).toBe("/activity");
    expect(ACTIVITY_HREF).not.toContain("/aggregation/");
    expect(isActivityPath("/activity")).toBe(true);
    expect(isActivityPath("/activity/x")).toBe(true);
    expect(isActivityPath("/aggregation/activity")).toBe(false);
    expect(isActivityPath("/settings")).toBe(false);
    expect(isActivityPath("/help")).toBe(false);
  });

  it("reuses Settings / Get Help page-lead tokens and Back routing", () => {
    expect(ACTIVITY_PAGE.back).toBe("Back");
    expect(ACTIVITY_PAGE.homeHref).toBe(HOME_ROOT);
    expect(ACTIVITY_PAGE.homeHref).not.toBe(DASHBOARD_HREF);
    expect(ACTIVITY_PAGE.homeHref).not.toContain("/aggregation");
    expect(ACTIVITY_PAGE_CLASS).toBe(SETTINGS_PANE_CLASS);
    expect(ACTIVITY_SECTION_CLASS).toBe(SETTINGS_SECTION_CLASS);
    expect(ACTIVITY_TITLE_CLASS).toBe(SETTINGS_PANE_TITLE_CLASS);
    expect(ACTIVITY_HELPER_CLASS).toBe(SETTINGS_EDIT_HELPER_CLASS);
    expect(activityHeaderBack("/activity")).toEqual({
      href: HOME_ROOT,
      label: ACTIVITY_PAGE.back,
    });
    expect(activityHeaderBack("/activity").label).not.toBe("Home");
    expect(activityHeaderBack("/activity").label).not.toBe("Aggregation");
    expect(activityHeaderBack("/activity/x")).toEqual({
      href: ACTIVITY_HREF,
      label: ACTIVITY_PAGE.title,
    });
    expect(activityHeaderBack(null)).toEqual({
      href: HOME_ROOT,
      label: ACTIVITY_PAGE.back,
    });
    const lead = readFileSync("src/components/activity/activity-page-lead.tsx", "utf8");
    expect(lead).toContain("PAGE_LEAD_STACK_CLASS");
    expect(lead).toContain("PageHeaderBackLink");
    expect(lead).toContain("<SettingsHubBackLink");
    expect(lead).not.toContain('href="/aggregation"');
    expect(lead).not.toMatch(/from ["']@\/components\/settings\/settings-page-lead["']/);
    expect(lead).not.toMatch(/from ["']@\/components\/help\/help-page-lead["']/);
  });
});

describe("Activity family chips", () => {
  it("reuses prefs families and defaults to All", () => {
    expect(ACTIVITY_FAMILIES).toEqual([
      "all",
      "aggregation",
      "reporting",
      "social",
      "education",
      "account",
    ]);
    expect(parseActivityFamily(undefined)).toBe(ACTIVITY_FAMILY_ALL);
    expect(parseActivityFamily("social")).toBe("social");
    expect(parseActivityFamily(["social"])).toBe("all");
    expect(parseActivityFamily("nope")).toBe("all");
    expect(activityFamilyLabel("all")).toBe(ACTIVITY_PAGE.all);
    expect(activityFamilyLabel("aggregation")).toBe("Aggregation");
    expect(activityFamilyForKind("title_rejected")).toBe("aggregation");
    expect(activityFamilyForKind("delivery_update")).toBe("aggregation");
    expect(activityFamilyForKind("new_follower")).toBe("social");
    expect(ACTIVITY_PREFS_HREF).toBe("/settings/preferences/notifications");
  });

  it("filters the live feed by the selected prefs family", () => {
    expect(filterActivityItems(FEED_WITH_FOLLOW, "aggregation").map((row) => row.id)).toEqual([
      "1",
      "2",
    ]);
    expect(filterActivityItems(FEED_WITH_FOLLOW, "social").map((row) => row.id)).toEqual(["5"]);
    expect(filterActivityItems(FEED_WITH_FOLLOW, "reporting")).toEqual([]);
    expect(filterActivityItems(FEED_WITH_FOLLOW, "all").every((row) => row.unread)).toBe(true);
  });

  it("builds family hrefs without status or period chrome", () => {
    expect(activityHref()).toBe(ACTIVITY_HREF);
    expect(activityHref({})).toBe(ACTIVITY_HREF);
    expect(activityHref({ family: "all" })).toBe(ACTIVITY_HREF);
    expect(activityHref({ family: "social" })).toBe(`${ACTIVITY_HREF}?family=social`);
    expect(activityHref({ family: "reporting" })).toBe(`${ACTIVITY_HREF}?family=reporting`);
  });

  it("maps the current workspace land onto the matching family chip, else All", () => {
    expect(activityFamilyForWorkspace("social")).toBe("social");
    expect(activityFamilyForWorkspace("aggregation")).toBe("aggregation");
    expect(activityFamilyForWorkspace("education")).toBe("education");
    expect(activityFamilyForWorkspace("social", "/social")).toBe("social");
    expect(activityFamilyForWorkspace("aggregation", "/aggregation/dashboard")).toBe(
      "aggregation",
    );
    expect(activityFamilyForWorkspace("education", "/education")).toBe("education");
    expect(activityFamilyForWorkspace("social", "/settings")).toBe("social");
    expect(activityFamilyForWorkspace("education", "/help")).toBe("education");
    expect(activityFamilyForWorkspace("aggregation", "/activity")).toBe("aggregation");
    expect(activityFamilyForWorkspace("aggregation", "/home")).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityFamilyForWorkspace("social", "/home")).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityFamilyForWorkspace("education", "/home/news")).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityFamilyForWorkspace("social", "/co-productions")).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityFamilyForWorkspace("home")).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityFamilyForWorkspace("nope")).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityFamilyForWorkspace(undefined)).toBe(ACTIVITY_FAMILY_ALL);
    expect(activityHref({ family: activityFamilyForWorkspace("social") })).toBe(
      `${ACTIVITY_HREF}?family=social`,
    );
    expect(activityHref({ family: activityFamilyForWorkspace("aggregation", "/home") })).toBe(
      ACTIVITY_HREF,
    );
  });
});

describe("Activity bell cap", () => {
  it("caps the last 5 open items", () => {
    expect(ACTIVITY_BELL_OPEN_CAP).toBe(5);
    const open = Array.from({ length: 8 }, (_, i) => ({
      id: String(i),
      unread: true,
    }));
    expect(activityBellItems(open).map((row) => row.id)).toEqual(["0", "1", "2", "3", "4"]);
    expect(activityBellItems([...open, { id: "done", unread: false }]).map((row) => row.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(activityBellItems([{ id: "done", unread: false }])).toEqual([]);
  });

  it("maps house type icons and reuses Social relative time", () => {
    expect(activityKindIcon("title_rejected")).toBe("film-slate");
    expect(activityKindIcon("delivery_update")).toBe("paper-plane-tilt");
    expect(activityKindIcon("new_follower")).toBe("user");
    expect(ACTIVITY_KIND_ICON.title_rejected).toBe("film-slate");
    expect(activityItemHref(OPEN_NEW)).toBe(ACTIVITY_HREF);
    expect(activityItemHref(OPEN_FOLLOW)).toBe("/social/u/ada");
    expect(activityRelativeTime("2026-09-18T11:00:00.000Z", NOW.getTime())).toBe("1h");
    expect(ACTIVITY_PAGE.title).toBe("Notifications");
    expect(ACTIVITY_PAGE.bellLabel).toBe("Notifications");
    expect(ACTIVITY_PAGE.navAria).toBe("Notifications");
    expect(ACTIVITY_PAGE.viewAll).toBe("View all");
    expect(ACTIVITY_PAGE.dismiss).toBe("Mark done");
    expect(ACTIVITY_PAGE.close).toBe("Close notifications");
    expect(ACTIVITY_PAGE.bellEmpty).toBe(ACTIVITY_PAGE.empty);
    expect(ACTIVITY_PAGE).not.toHaveProperty("view");
    expect(ACTIVITY_PAGE).not.toHaveProperty("markAllDone");
    expect(ACTIVITY_BELL_TRIGGER_CLASS).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    // H register: the round grey 44 (muted fill), one stop darker on
    // hover and while open; unread is an accent dot, never a count.
    expect(ACTIVITY_BELL_TRIGGER_CLASS).toContain("bg-surface-muted");
    expect(ACTIVITY_BELL_TRIGGER_CLASS).toContain("hover:bg-hairline");
    expect(ACTIVITY_BELL_TRIGGER_CLASS).toContain("rounded-full");
    expect(ACTIVITY_BELL_TRIGGER_OPEN_CLASS).toBe("bg-hairline");
    expect(ACTIVITY_BELL_OPEN_DOT_CLASS).toContain("bg-accent");
    expect(ACTIVITY_BELL_POPOVER_CLASS).toContain("border-hairline");
    expect(ACTIVITY_BELL_POPOVER_CLASS).toContain("bg-surface");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toBe(APP_SHEET_HOST_CLASS);
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain("md:hidden");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain(ACCOUNT_SHEET_HOST_CLASS);
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain("flex-col");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain("justify-end");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain("w-full");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain("h-dvh");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS.split(" ")).not.toContain("items-end");
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).not.toMatch(/\bflex items-end\b/);
    expect(ACTIVITY_BELL_SHEET_SURFACE_CLASS).toBe(APP_SHEET_SURFACE_CLASS);
    expect(ACTIVITY_BELL_SHEET_SURFACE_CLASS).toContain("w-full");
    expect(ACTIVITY_BELL_SHEET_SURFACE_CLASS).toContain(APP_SHEET_RISE_CLASS);
    expect(ACCOUNT_SHEET_SURFACE_CLASS).toContain(APP_SHEET_RISE_CLASS);
    expect(ACTIVITY_BELL_VIEW_ALL_CLASS).toBe(
      `block border-t border-hairline px-[var(--space-4)] py-[var(--space-3)] ${TEXT_ACTION_CLASS}`,
    );
    expect(ACTIVITY_BELL_VIEW_ALL_CLASS).toContain(TEXT_ACTION_CLASS);
    expect(ACTIVITY_BELL_VIEW_ALL_CLASS).toContain("text-accent");
    expect(ACTIVITY_BELL_VIEW_ALL_CLASS).not.toMatch(/\btext-ink\b/);
  });
});
