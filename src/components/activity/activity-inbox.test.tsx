import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    push: vi.fn(),
  }),
}));

import { ActivityInbox } from "./activity-inbox";
import { PAGE_LEAD_STACK_CLASS } from "@/components/ui/page-header";
import {
  ACTIVITY_FAMILIES,
  ACTIVITY_HREF,
  ACTIVITY_LEAD_ROW_CLASS,
  ACTIVITY_PAGE,
  ACTIVITY_PAGE_CLASS,
  ACTIVITY_PREFS_HREF,
  ACTIVITY_SECTION_CLASS,
} from "@/lib/activity";
import { HOUSE_THEME_TOGGLE_CLASS } from "@/lib/house-lead-chrome";
import { NOTIFICATION_PREFS } from "@/lib/notification-prefs";

const OPEN = {
  id: "1",
  title: "North Wind was returned",
  body: "Chain of title is missing.",
  kind: "title_rejected" as const,
  created_at: "2026-09-12T12:00:00.000Z",
  unread: true,
};

const inboxSrc = readFileSync("src/components/activity/activity-inbox.tsx", "utf8");
const listSrc = readFileSync("src/components/activity/activity-inbox-list.tsx", "utf8");
const chipsSrc = readFileSync("src/components/activity/activity-family-chips.tsx", "utf8");
const markSrc = readFileSync("src/components/activity/mark-done.tsx", "utf8");
const linkSrc = readFileSync("src/app/(app)/aggregation/messages/message-link.tsx", "utf8");

describe("ActivityInbox", () => {
  it("renders prefs family chips only — no Open / Done or period chrome", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityInbox, {
        items: [OPEN],
        family: "all",
      }),
    );
    expect(html).toContain("data-activity-inbox");
    expect(html).toContain(ACTIVITY_PAGE_CLASS);
    expect(html).toContain(ACTIVITY_SECTION_CLASS);
    expect(html).toContain('data-activity-page-lead=""');
    expect(html).toContain(PAGE_LEAD_STACK_CLASS);
    expect(html).toContain(ACTIVITY_LEAD_ROW_CLASS);
    expect(html).toContain(ACTIVITY_PAGE.back);
    expect(html).toContain(`href="${ACTIVITY_PAGE.homeHref}"`);
    expect(html).not.toContain('href="/aggregation');
    expect(html).not.toContain(">Home<");
    expect(html).not.toContain("t-title");
    expect(inboxSrc).not.toContain("PageHeader");
    expect(inboxSrc).toContain("ActivityPageLead");
    expect(html).toContain('data-activity-family-chip="all"');
    expect(html).toContain('data-activity-family-chip="aggregation"');
    expect(html).toContain('data-activity-family-chip="reporting"');
    expect(html).toContain('data-activity-family-chip="social"');
    expect(html).toContain('data-activity-family-chip="education"');
    expect(html).toContain('data-activity-family-chip="account"');
    expect(html).toContain(ACTIVITY_PAGE.all);
    expect(html).toContain(NOTIFICATION_PREFS.groups.aggregation);
    expect(html).toContain(NOTIFICATION_PREFS.groups.reporting);
    expect(html).toContain(NOTIFICATION_PREFS.groups.social);
    expect(html).toContain(NOTIFICATION_PREFS.groups.education);
    expect(html).toContain(NOTIFICATION_PREFS.groups.account);
    expect(ACTIVITY_FAMILIES).toEqual([
      "all",
      "aggregation",
      "reporting",
      "social",
      "education",
      "account",
    ]);
    expect(html).toContain("North Wind was returned");
    expect(html).toContain("data-activity-done");
    expect(html).toContain(`aria-label="${ACTIVITY_PAGE.dismiss}"`);
    expect(html).not.toContain("data-activity-status");
    expect(html).not.toContain("data-activity-status-chip");
    expect(html).not.toContain("data-activity-period-chip");
    expect(html).not.toContain(">Open<");
    expect(html).not.toContain(">Done<");
    expect(html).not.toContain("Cleared");
    expect(html).not.toContain("Nothing open.");
    expect(html).not.toContain("Messages");
    expect(html).not.toContain("Ask 24Frame AI");
    expect(html).not.toContain(">View<");
    expect(html).not.toContain("Mark all done");
    expect(inboxSrc).not.toContain("activityStatus");
    expect(inboxSrc).not.toContain("activityPeriod");
    expect(inboxSrc).not.toContain("data-activity-status");
    expect(inboxSrc).toContain("ActivityInboxList");
    expect(inboxSrc).toContain("ActivityFamilyChips");
    expect(inboxSrc).not.toContain("useOwnNotificationsRealtime");
    expect(inboxSrc).not.toContain("postgres_changes");
    expect(chipsSrc).toContain("SEGMENTED_TRACK_PERSIST.activityFamily");
    expect(chipsSrc).toContain("({ selectedIndex })");
    expect(chipsSrc).toContain("segmentedItemOn");
    expect(chipsSrc).not.toContain("pendingFamily");
    expect(chipsSrc).not.toContain("activityStatus");
    expect(chipsSrc).not.toContain(">Open<");
    expect(chipsSrc).not.toContain(">Done<");
    expect(markSrc).toContain("<X");
    expect(markSrc).not.toContain("ACTIVITY_PAGE.done");
    expect(markSrc).toContain("retireLiveNotification");
    expect(linkSrc).toContain("retireLiveNotification");
    expect(linkSrc).toContain("markNotificationsRead");
    expect(listSrc).toContain("useOwnNotificationsRealtime");
    expect(listSrc).toContain("mergeLiveActivityItems");
    expect(listSrc).toContain("ActivityFeedRow");
    expect(listSrc.match(/useOwnNotificationsRealtime\(/g)).toHaveLength(1);
    expect(listSrc).not.toContain("postgres_changes");
    expect(listSrc).not.toContain(".channel(");
  });

  it("puts a house gear on the header that opens Preferences Notifications", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityInbox, {
        items: [OPEN],
        family: "social",
      }),
    );
    expect(html).toContain("data-activity-prefs");
    expect(html).toContain(`href="${ACTIVITY_PREFS_HREF}"`);
    expect(html).toContain(`aria-label="${ACTIVITY_PAGE.prefs}"`);
    expect(html).toContain(HOUSE_THEME_TOGGLE_CLASS);
    expect(html).toContain(`href="${ACTIVITY_HREF}?family=social"`);
    expect(html).not.toContain("status=done");
    expect(ACTIVITY_PREFS_HREF).toBe("/settings/preferences/notifications");
  });

  it("uses the crafted caught-up empty, not a skinny open card", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityInbox, {
        items: [],
        family: "all",
      }),
    );
    expect(html).toContain("data-activity-empty");
    expect(html).toContain("You&#x27;re all caught up.");
    expect(html).toContain(ACTIVITY_PAGE.emptyHint);
    expect(html).not.toContain("Nothing open.");
    expect(html).not.toContain("Nothing done yet.");
    expect(html).not.toContain("data-activity-status-chip");
    const empty = html.slice(html.indexOf("data-activity-empty"));
    expect(empty).not.toContain("card-surface");
  });
});
