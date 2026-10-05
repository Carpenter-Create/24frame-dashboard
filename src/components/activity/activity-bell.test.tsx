import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const nav = vi.hoisted(() => ({ pathname: "/aggregation/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), push: vi.fn() }),
}));

import { ActivityBell } from "./activity-bell";
import {
  ACTIVITY_BELL_POPOVER_CLASS,
  ACTIVITY_BELL_SHEET_HOST_CLASS,
  ACTIVITY_BELL_SHEET_SURFACE_CLASS,
  ACTIVITY_BELL_TRIGGER_CLASS,
  ACTIVITY_BELL_VIEW_ALL_CLASS,
  ACTIVITY_BELL_UNREAD_DOT_CLASS,
  ACTIVITY_HREF,
  ACTIVITY_PAGE,
  activityHref,
} from "@/lib/activity";
import { ACCOUNT_SHEET_HOST_CLASS } from "@/lib/account-sheet";
import { APP_SHEET_HOST_CLASS, APP_SHEET_SCRIM_CLASS, TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import {
  HOUSE_HEADER_TRAILING_HIT_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_HEADER_ROUND_GLYPH_CLASS,
  HOUSE_PHONE_CHROME_IDLE_INK_CLASS,
} from "@/lib/house-phone-shell";

const bellSrc = readFileSync("src/components/activity/activity-bell.tsx", "utf8");
const askHeaderSrc = readFileSync("src/components/chrome/ask-assistant-header.tsx", "utf8");
const houseAiMarkSrc = readFileSync("src/components/chrome/house-ai-mark.tsx", "utf8");

const OPEN = {
  id: "1",
  title: "North Wind was returned",
  body: "Chain of title is missing.",
  kind: "title_rejected" as const,
  created_at: "2026-09-12T12:00:00.000Z",
  unread: true,
};

describe("ActivityBell", () => {
  // H register (Adam 2026-10-05): unread is an accent dot with a page
  // ring — never a count badge, never red; "new" lives in the name.
  it("keeps a closed trigger with the unread dot and the Notifications label", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 3,
        items: [OPEN],
      }),
    );
    expect(html).toContain("data-activity-bell");
    expect(html).toContain(`aria-label="${ACTIVITY_PAGE.bellLabelNew}"`);
    expect(ACTIVITY_PAGE.bellLabel).toBe("Notifications");
    expect(ACTIVITY_PAGE.bellLabelNew).toBe("Notifications, new");
    expect(html).not.toContain(`aria-label="Activity"`);
    expect(html).not.toContain("data-activity-bell-badge");
    expect(html.match(/data-activity-bell-dot=""/g)?.length).toBe(2);
    expect(html).toContain(`class="${ACTIVITY_BELL_UNREAD_DOT_CLASS}"`);
    expect(html).not.toMatch(/>3</);
    expect(html).not.toContain("9+");
    const quiet = renderToStaticMarkup(createElement(ActivityBell, { unread: 0, items: [] }));
    expect(quiet).not.toContain("data-activity-bell-dot");
    expect(quiet).toContain(`aria-label="${ACTIVITY_PAGE.bellLabel}"`);
    expect(html).toContain(ACTIVITY_BELL_TRIGGER_CLASS);
    expect(html).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    expect(html).toContain("data-activity-bell-phone");
    expect(html).toContain("data-activity-bell-desktop");
    expect(html).toContain(HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS);
    expect(html).toContain("md:hidden");
    expect(html).toContain("hidden md:block");
    expect(html).not.toContain("data-activity-bell-open");
    expect(html).not.toContain("data-activity-bell-sheet");
    expect(html).not.toContain("data-activity-bell-popover");
    expect(html).not.toContain("data-activity-bell-view-all");
    expect(html).not.toContain("data-activity-status-chip");
    expect(html).not.toContain("Unread");
    expect(html).not.toContain("Resolved");
  });

  it("opens a peek popover and phone sheet with the last rows and View all", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 1,
        items: [OPEN],
        defaultOpen: true,
      }),
    );
    expect(html).toContain("data-activity-bell-open");
    expect(html).toContain("data-activity-bell-popover");
    expect(html).toContain("data-activity-bell-sheet");
    expect(html).toContain("data-activity-bell-view-all");
    expect(html).toContain(
      `data-activity-bell-view-all="" class="${ACTIVITY_BELL_VIEW_ALL_CLASS}" data-house-link="" href="${ACTIVITY_HREF}"`,
    );
    expect(html).toContain(ACTIVITY_PAGE.viewAll);
    expect(html).toContain(ACTIVITY_BELL_VIEW_ALL_CLASS);
    expect(ACTIVITY_BELL_VIEW_ALL_CLASS).toContain(TEXT_ACTION_CLASS);
    expect(html).toContain(ACTIVITY_PAGE.title);
    expect(html).toContain("North Wind was returned");
    expect(html).toContain("data-activity-done");
    expect(html).toContain(ACTIVITY_BELL_POPOVER_CLASS);
    expect(html).toContain(ACTIVITY_BELL_SHEET_HOST_CLASS);
    expect(html).toContain(ACTIVITY_BELL_SHEET_SURFACE_CLASS);
    expect(html).toContain(APP_SHEET_SCRIM_CLASS);
    expect(html).not.toContain(">Activity<");
    expect(html).not.toContain('aria-label="Activity"');
    expect(bellSrc).toContain("createPortal");
    expect(bellSrc).toContain("ActivityBellSheet");
    expect(bellSrc).toContain("data-activity-bell-popover");
    expect(bellSrc).toContain("data-activity-bell-sheet");
    expect(bellSrc).toContain("ActivityFeedRow");
    expect(bellSrc).toContain("closePeekOnRowNavigate");
    expect(bellSrc).toContain('target.closest("[data-activity-done]")');
    expect(bellSrc).toContain("onClick={(event) => closePeekOnRowNavigate(event, onClose)}");
    expect(bellSrc).toContain("const [open, setOpen] = useState(defaultOpen)");
    expect(bellSrc.match(/useState\(defaultOpen\)/g)).toHaveLength(1);
    expect(bellSrc).toContain("open={open}");
    expect(bellSrc).toContain("onOpenChange={setOpen}");
    expect(bellSrc).toContain("fallbackItems");
    expect(bellSrc).toContain("cache.items");
    expect(bellSrc).not.toContain("items={[]}");
    expect(bellSrc).not.toContain("ACCOUNT_SHEET_HOST_CLASS");
    expect(bellSrc).toContain("hidden md:block");
    expect(bellSrc).toContain("activityHref");
    expect(bellSrc).toContain("activityFamilyForWorkspace");
    expect(bellSrc).not.toContain("ACTIVITY_HREF");
    expect(bellSrc).toContain("useOwnNotificationsRealtime");
    expect(bellSrc.match(/useOwnNotificationsRealtime\(/g)).toHaveLength(1);
    expect(bellSrc).toContain("mergeLiveActivityItems");
    expect(bellSrc).toContain("activityBellItems");
    expect(bellSrc).not.toContain("postgres_changes");
    expect(bellSrc).not.toContain(".channel(");
  });

  it("deep-links View all to the matching Notifications family for the current workspace", () => {
    nav.pathname = "/social";
    const social = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 1,
        items: [OPEN],
        defaultOpen: true,
        workspace: "social",
      }),
    );
    expect(social).toContain(
      `data-activity-bell-view-all="" class="${ACTIVITY_BELL_VIEW_ALL_CLASS}" data-house-link="" href="${activityHref({ family: "social" })}"`,
    );
    expect(social).not.toContain(
      `data-activity-bell-view-all="" class="${ACTIVITY_BELL_VIEW_ALL_CLASS}" data-house-link="" href="${ACTIVITY_HREF}"`,
    );

    nav.pathname = "/aggregation/dashboard";
    const aggregation = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 1,
        items: [OPEN],
        defaultOpen: true,
        workspace: "aggregation",
      }),
    );
    expect(aggregation).toContain(
      `data-activity-bell-view-all="" class="${ACTIVITY_BELL_VIEW_ALL_CLASS}" data-house-link="" href="${activityHref({ family: "aggregation" })}"`,
    );

    nav.pathname = "/education";
    const education = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 1,
        items: [OPEN],
        defaultOpen: true,
        workspace: "education",
      }),
    );
    expect(education).toContain(
      `data-activity-bell-view-all="" class="${ACTIVITY_BELL_VIEW_ALL_CLASS}" data-house-link="" href="${activityHref({ family: "education" })}"`,
    );

    nav.pathname = "/home";
    const home = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 1,
        items: [OPEN],
        defaultOpen: true,
        workspace: "aggregation",
      }),
    );
    expect(home).toContain(
      `data-activity-bell-view-all="" class="${ACTIVITY_BELL_VIEW_ALL_CLASS}" data-house-link="" href="${ACTIVITY_HREF}"`,
    );
    expect(home).not.toContain("family=aggregation");
    nav.pathname = "/aggregation/dashboard";
  });

  it("opens the phone sheet on the house app-sheet host — not a content-hug card", () => {
    const html = renderToStaticMarkup(
      createElement(ActivityBell, {
        unread: 0,
        items: [],
        defaultOpen: true,
      }),
    );
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toBe(APP_SHEET_HOST_CLASS);
    expect(ACTIVITY_BELL_SHEET_HOST_CLASS).toContain(ACCOUNT_SHEET_HOST_CLASS);
    expect(html).toContain(`data-activity-bell-sheet="" class="${ACTIVITY_BELL_SHEET_HOST_CLASS}"`);
    expect(html).toContain(ACTIVITY_BELL_SHEET_SURFACE_CLASS);
    expect(html).toContain(ACTIVITY_BELL_POPOVER_CLASS);
    expect(html).toContain(`data-activity-bell-popover="" class="${ACTIVITY_BELL_POPOVER_CLASS}"`);
    expect(html).toContain(ACTIVITY_PAGE.title);
    expect(html).toContain(ACTIVITY_PAGE.close);
    expect(html).toContain("data-activity-bell-empty");
    expect(html).toContain(ACTIVITY_PAGE.viewAll);
    expect(html).toContain("hidden md:block");
    expect(html).toContain("md:hidden");
  });

  it("matches #391 chrome idle weight on the desktop bell", () => {
    // H register: one 20 Regular bell on phone and desktop, in the round
    // grey 44 (ink on muted). Dock stays its own 24px literal. Phosphor
    // rail stays 16px.
    expect(HOUSE_HEADER_ROUND_GLYPH_CLASS).not.toContain(HOUSE_PHONE_CHROME_IDLE_INK_CLASS);
    expect(bellSrc).toContain("<Bell className={HOUSE_HEADER_ROUND_GLYPH_CLASS} weight={HOUSE_PHONE_CHROME_ICON_WEIGHT} />");
    expect(bellSrc).not.toContain("HOUSE_HEADER_TRAILING_PHONE_CLASS");
    expect(bellSrc).not.toContain("HOUSE_HEADER_TRAILING_DESKTOP_CLASS");
    expect(bellSrc).not.toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(bellSrc).toContain('register="phone"');
    expect(bellSrc).toContain('register="desktop"');
    expect(bellSrc).not.toContain('weight="fill"');
    expect(bellSrc).not.toContain('weight="duotone"');
    expect(bellSrc).not.toContain("strokeWidth");
    expect(bellSrc).not.toContain('"size-6');
    expect(bellSrc).not.toContain('"size-4');
  });

  it("uses the house AI mark on the 24Frame AI header slot — not Phosphor Sparkle", () => {
    expect(askHeaderSrc).toContain("<HouseAiMark");
    // H register: one stroke sparkle on phone and desktop.
    expect(askHeaderSrc).toContain('register="stroke"');
    expect(askHeaderSrc).not.toContain('register="fill"');
    expect(askHeaderSrc).not.toContain("Sparkle");
    expect(askHeaderSrc).not.toContain("Sparkles");
    expect(askHeaderSrc).not.toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(askHeaderSrc).not.toContain("@phosphor-icons/react");
    expect(houseAiMarkSrc).toContain("PHOSPHOR_CHROME_ICON_CLASS");
    expect(houseAiMarkSrc).toContain("data-house-ai-mark");
    expect(houseAiMarkSrc).toContain('fill={stroke ? "none" : "currentColor"}');
    expect(houseAiMarkSrc).toContain("HOUSE_AI_MARK_REGULAR_STROKE_WIDTH");
    expect(houseAiMarkSrc).not.toContain("Sparkle");
    expect(houseAiMarkSrc).not.toContain("size-5");
    expect(houseAiMarkSrc).not.toContain("size-6");
  });
});
