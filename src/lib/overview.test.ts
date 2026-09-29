import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ASSISTANT_NAME } from "@/lib/product";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import { availableWorkspaceOptions } from "@/lib/workspace-menu";
import { CO_PRODUCTIONS_HREF, CO_PRODUCTIONS_LABEL } from "./co-productions";
import { NEWS_HREF, NEWS_PAGE } from "./news";
import {
  OVERVIEW_AI_NEXT_CAP,
  OVERVIEW_EDUCATION_CAP,
  OVERVIEW_HREF,
  OVERVIEW_MODULE_ORDER,
  OVERVIEW_HOME_COLUMN_GUTTER,
  OVERVIEW_HOME_LAYOUT_CLASS,
  OVERVIEW_MODULE_NEST_CLASS,
  OVERVIEW_NEWS_CAP,
  OVERVIEW_NEWS_RAIL_WIDTH,
  OVERVIEW_PAGE,
  OVERVIEW_PHONE_MODULE_ORDER,
  OVERVIEW_RAIL_OFF_WIDTH,
  OVERVIEW_SOCIAL_DM_CAP,
  isHomeLandPath,
  overviewHref,
  isHomeOwnedPath,
  isNewsHistoryPath,
  isOverviewPath,
  overviewAiNextMoves,
  overviewModuleHeaderAction,
  overviewEducationCourses,
  overviewHidesRail,
  overviewLeadActiveIndex,
  overviewLeadPills,
  overviewLeadSelected,
  overviewLeadShouldNavigate,
  overviewSocialChats,
  overviewSocialUnreadTotal,
  overviewTriggerLabel,
  overviewWeekPulse,
  overviewInWeek,
  overviewWeekSince,
} from "./overview";

describe("Home lead pills", () => {
  it("inserts Home leftmost and Co-Productions last without inventing a fourth workspace product", () => {
    const pills = overviewLeadPills();
    expect(pills.map((pill) => pill.id)).toEqual([
      "home",
      "aggregation",
      "social",
      "education",
      "co-productions",
    ]);
    expect(pills[0]).toEqual({
      id: "home",
      label: OVERVIEW_PAGE.title,
      href: OVERVIEW_HREF,
    });
    expect(pills[pills.length - 1]).toEqual({
      id: "co-productions",
      label: CO_PRODUCTIONS_LABEL,
      href: CO_PRODUCTIONS_HREF,
    });
    expect(availableWorkspaceOptions().map((option) => option.mode)).toEqual([
      "aggregation",
      "social",
      "education",
    ]);
    expect(
      overviewLeadPills(availableWorkspaceOptions({ isGcStaff: true })).map((pill) => pill.id),
    ).toEqual(["home", "aggregation", "social", "education", "staff", "co-productions"]);
    expect(OVERVIEW_HREF).toBe("/home");
    expect(OVERVIEW_PAGE.title).toBe("Home");
    expect(OVERVIEW_HREF).not.toBe(SOCIAL_ROUTES.home);
    expect(OVERVIEW_PAGE.title).not.toBe(SOCIAL.workspace);
    expect(OVERVIEW_PAGE.aiNext).toBe(ASSISTANT_NAME);
    expect(OVERVIEW_PAGE.aiNext).not.toBe("Globee");
  });

  it("selects Home on /home and leaves workspace pills idle there", () => {
    expect(isOverviewPath("/home")).toBe(true);
    expect(isOverviewPath("/home/x")).toBe(true);
    expect(isOverviewPath("/overview")).toBe(false);
    expect(isOverviewPath("/social")).toBe(false);
    expect(isOverviewPath("/news")).toBe(false);
    expect(isOverviewPath(NEWS_HREF)).toBe(true);
    expect(isHomeLandPath("/home")).toBe(true);
    expect(isHomeLandPath("/overview")).toBe(false);
    expect(isHomeLandPath(NEWS_HREF)).toBe(false);
    expect(overviewLeadSelected("home", "/home", "aggregation")).toBe(true);
    expect(overviewLeadSelected("home", "/overview", "aggregation")).toBe(false);
    expect(overviewLeadSelected("aggregation", "/home", "aggregation")).toBe(false);
    expect(overviewLeadSelected("co-productions", "/home", "aggregation")).toBe(false);
    expect(overviewLeadSelected("aggregation", "/aggregation/dashboard", "aggregation")).toBe(true);
    expect(overviewLeadSelected("social", "/social", "social")).toBe(true);
    expect(overviewTriggerLabel("/home", "Social")).toBe("Home");
    expect(overviewTriggerLabel("/social", "Social")).toBe("Social");
    expect(overviewLeadShouldNavigate("/home", "aggregation", { id: "aggregation" })).toBe(true);
    expect(overviewLeadShouldNavigate("/home", "aggregation", { id: "home" })).toBe(false);
    expect(
      overviewLeadShouldNavigate("/aggregation/dashboard", "aggregation", { id: "aggregation" }),
    ).toBe(false);
  });

  it("leaves every unify-lead pill idle on Get Help — cookie workspace is not selected", () => {
    const pills = overviewLeadPills();
    for (const path of ["/help", "/help/center", "/help/support", "/help/feedback"] as const) {
      for (const workspace of ["aggregation", "social", "education"] as const) {
        expect(overviewLeadSelected("home", path, workspace)).toBe(false);
        expect(overviewLeadSelected("aggregation", path, workspace)).toBe(false);
        expect(overviewLeadSelected("social", path, workspace)).toBe(false);
        expect(overviewLeadSelected("education", path, workspace)).toBe(false);
        expect(overviewLeadSelected("co-productions", path, workspace)).toBe(false);
        expect(overviewLeadActiveIndex(path, workspace, pills)).toBe(-1);
      }
      expect(overviewLeadShouldNavigate(path, "education", { id: "education" })).toBe(true);
      expect(overviewLeadShouldNavigate(path, "social", { id: "home" })).toBe(true);
    }
  });

  it("leaves every unify-lead pill idle on Activity — cookie workspace is not selected", () => {
    const pills = overviewLeadPills();
    for (const workspace of ["aggregation", "social", "education"] as const) {
      expect(overviewLeadSelected("home", "/activity", workspace)).toBe(false);
      expect(overviewLeadSelected("aggregation", "/activity", workspace)).toBe(false);
      expect(overviewLeadSelected("social", "/activity", workspace)).toBe(false);
      expect(overviewLeadSelected("education", "/activity", workspace)).toBe(false);
      expect(overviewLeadSelected("co-productions", "/activity", workspace)).toBe(false);
      expect(overviewLeadActiveIndex("/activity", workspace, pills)).toBe(-1);
    }
    expect(overviewLeadShouldNavigate("/activity", "aggregation", { id: "aggregation" })).toBe(true);
    expect(overviewLeadShouldNavigate("/activity", "social", { id: "home" })).toBe(true);
  });

  it("leaves every unify-lead pill idle on Settings — cookie workspace is not selected", () => {
    const paths = [
      "/settings",
      "/settings/profile",
      "/settings/organization",
      "/settings/preferences",
    ] as const;
    const pills = overviewLeadPills();
    for (const path of paths) {
      expect(overviewLeadSelected("home", path, "aggregation")).toBe(false);
      expect(overviewLeadSelected("aggregation", path, "aggregation")).toBe(false);
      expect(overviewLeadSelected("social", path, "social")).toBe(false);
      expect(overviewLeadSelected("education", path, "education")).toBe(false);
      expect(overviewLeadSelected("co-productions", path, "aggregation")).toBe(false);
      expect(overviewLeadShouldNavigate(path, "aggregation", { id: "aggregation" })).toBe(true);
      expect(overviewLeadShouldNavigate(path, "social", { id: "home" })).toBe(true);
      expect(overviewLeadShouldNavigate(path, "aggregation", { id: "co-productions" })).toBe(true);
      expect(overviewLeadActiveIndex(path, "aggregation", pills)).toBe(-1);
      expect(overviewLeadActiveIndex(path, "social", pills)).toBe(-1);
      expect(overviewLeadActiveIndex(path, "education", pills)).toBe(-1);
    }
    expect(overviewLeadActiveIndex("/home", "aggregation", pills)).toBe(0);
    expect(overviewLeadActiveIndex("/aggregation/dashboard", "aggregation", pills)).toBe(1);
    expect(overviewLeadActiveIndex(CO_PRODUCTIONS_HREF, "aggregation", pills)).toBe(4);
    const switcher = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
    expect(switcher).toContain("overviewLeadSelected");
    expect(switcher).toContain("workspaceWaffleTiles");
    expect(switcher).toContain("overviewLeadActiveIndex");
    expect(switcher).toContain("SegmentedTrack");
    expect(switcher).toContain("persistKey={SEGMENTED_TRACK_PERSIST.workspace}");
    expect(switcher).not.toContain("activeIndex >= 0 ? activeIndex : 0");
    expect(switcher).not.toContain("routeIndex >= 0 ? routeIndex : 0");
  });

  it("keeps /home/news on Home chrome — Home pill still navigates to /home", () => {
    expect(NEWS_HREF).toBe("/home/news");
    expect(isNewsHistoryPath(NEWS_HREF)).toBe(true);
    expect(isNewsHistoryPath(`${NEWS_HREF}/x`)).toBe(true);
    expect(isNewsHistoryPath("/news")).toBe(false);
    expect(isNewsHistoryPath("/home")).toBe(false);
    expect(isHomeOwnedPath(NEWS_HREF)).toBe(true);
    expect(isHomeOwnedPath("/home")).toBe(true);
    expect(isHomeOwnedPath("/aggregation/dashboard")).toBe(false);
    expect(isHomeOwnedPath("/social")).toBe(false);
    expect(overviewLeadSelected("home", NEWS_HREF, "aggregation")).toBe(true);
    expect(overviewLeadSelected("home", NEWS_HREF, "social")).toBe(true);
    expect(overviewLeadSelected("aggregation", NEWS_HREF, "aggregation")).toBe(false);
    expect(overviewLeadSelected("social", NEWS_HREF, "social")).toBe(false);
    expect(overviewLeadSelected("education", NEWS_HREF, "education")).toBe(false);
    expect(overviewLeadSelected("co-productions", NEWS_HREF, "aggregation")).toBe(false);
    expect(overviewTriggerLabel(NEWS_HREF, "Aggregation")).toBe("Home");
    expect(overviewLeadShouldNavigate(NEWS_HREF, "aggregation", { id: "home" })).toBe(true);
    expect(overviewLeadShouldNavigate("/home", "aggregation", { id: "home" })).toBe(false);
    expect(overviewLeadShouldNavigate(NEWS_HREF, "aggregation", { id: "aggregation" })).toBe(true);
    expect(overviewLeadPills().map((pill) => pill.id)).not.toContain("news");
    expect(overviewLeadPills()[0]?.href).toBe(OVERVIEW_HREF);
    expect(overviewLeadPills().some((pill) => pill.href === NEWS_HREF)).toBe(false);
    const switcher = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
    const lanes = readFileSync("src/lib/workspace-switcher.ts", "utf8");
    expect(switcher).toContain("router.push(dest)");
    expect(switcher).toContain("workspacePillClickDest");
    expect(lanes).toContain("overviewLeadShouldNavigate");
  });

  it("hides dest rails on Home and keeps them on workspace routes", () => {
    expect(overviewHidesRail("/home")).toBe(true);
    expect(overviewHidesRail("/home/x")).toBe(true);
    expect(overviewHidesRail("/overview")).toBe(false);
    expect(overviewHidesRail(NEWS_HREF)).toBe(true);
    expect(overviewHidesRail("/news")).toBe(false);
    expect(overviewHidesRail("/aggregation/dashboard")).toBe(false);
    expect(overviewHidesRail("/social")).toBe(false);
    expect(overviewHidesRail("/education")).toBe(false);
    expect(overviewHidesRail("/aggregation/titles")).toBe(false);
    expect(overviewHidesRail("/settings")).toBe(false);
    expect(overviewHidesRail("/help")).toBe(false);
    expect(overviewHidesRail("/help/center")).toBe(false);
    expect(overviewHidesRail("/activity")).toBe(false);
    expect(OVERVIEW_RAIL_OFF_WIDTH).toBe("0px");
  });

  it("selects only Co-Productions on /co-productions and hides the dest rail", () => {
    expect(overviewLeadSelected("co-productions", CO_PRODUCTIONS_HREF, "aggregation")).toBe(true);
    expect(overviewLeadSelected("co-productions", `${CO_PRODUCTIONS_HREF}/x`, "social")).toBe(true);
    expect(overviewLeadSelected("home", CO_PRODUCTIONS_HREF, "aggregation")).toBe(false);
    expect(overviewLeadSelected("aggregation", CO_PRODUCTIONS_HREF, "aggregation")).toBe(false);
    expect(overviewLeadSelected("social", CO_PRODUCTIONS_HREF, "social")).toBe(false);
    expect(overviewLeadSelected("education", CO_PRODUCTIONS_HREF, "education")).toBe(false);
    expect(overviewLeadSelected("co-productions", "/home", "aggregation")).toBe(false);
    expect(overviewLeadSelected("co-productions", "/education", "education")).toBe(false);
    expect(overviewTriggerLabel(CO_PRODUCTIONS_HREF, "Aggregation")).toBe(CO_PRODUCTIONS_LABEL);
    expect(overviewLeadShouldNavigate(CO_PRODUCTIONS_HREF, "aggregation", { id: "co-productions" })).toBe(
      false,
    );
    expect(overviewLeadShouldNavigate("/home", "aggregation", { id: "co-productions" })).toBe(true);
    expect(overviewLeadShouldNavigate(CO_PRODUCTIONS_HREF, "aggregation", { id: "home" })).toBe(true);
    expect(overviewHidesRail(CO_PRODUCTIONS_HREF)).toBe(true);
    expect(overviewHidesRail(`${CO_PRODUCTIONS_HREF}/x`)).toBe(true);
    expect(overviewLeadActiveIndex(CO_PRODUCTIONS_HREF, "aggregation")).toBe(4);
    expect(overviewLeadActiveIndex(CO_PRODUCTIONS_HREF, "education")).toBe(4);
  });
});

describe("Home module caps", () => {
  it("locks Revenue first, then Social · Education · Needs you", () => {
    expect(OVERVIEW_MODULE_ORDER).toEqual([
      "revenue",
      "social",
      "education",
      "needs-you",
      "ai-next",
    ]);
    expect(OVERVIEW_PHONE_MODULE_ORDER).toEqual([
      "revenue",
      "social",
      "education",
      "needs-you",
      "ai-next",
      "news",
    ]);
    expect(OVERVIEW_PAGE.news).toBe("Industry news");
    expect(OVERVIEW_PAGE.news).toBe(NEWS_PAGE.title);
    expect(OVERVIEW_PAGE.newsHref).toBe(NEWS_HREF);
    expect(OVERVIEW_PAGE.newsViewAll).toBe("View all");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).toContain("'revenue'_'social'_'education'_'needs'_'ai'_'news'");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).not.toContain("aggregation");
    expect(OVERVIEW_PAGE).not.toHaveProperty("topPerforming");
    expect(overviewHref()).toBe(OVERVIEW_HREF);
    expect(overviewHref({ period: "all" })).toBe(OVERVIEW_HREF);
    expect(overviewHref({ period: "ytd" })).toBe(`${OVERVIEW_HREF}?period=ytd`);
    expect(OVERVIEW_NEWS_RAIL_WIDTH).toBe("22rem");
    expect(OVERVIEW_HOME_COLUMN_GUTTER).toBe("var(--chrome-gutter)");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).toContain("gap-x-[var(--chrome-gutter)]");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).toContain("gap-y-[var(--space-6)]");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).not.toMatch(/(?:^| )gap-\[var\(--space-6\)\]/);
    expect(OVERVIEW_HOME_LAYOUT_CLASS).not.toContain("md:grid-cols");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).not.toContain("auto-cols");
    expect(OVERVIEW_HOME_LAYOUT_CLASS).toContain("grid-cols-1");
    expect(OVERVIEW_PAGE.thisWeek).toBe("This week");
    expect(OVERVIEW_PAGE.aiNext).toBe("24Frame AI");
    expect(OVERVIEW_PAGE.aiAsk).toBe("Ask 24Frame AI");
    expect(OVERVIEW_PAGE.aiNextHref).toBe("?ai=1");
    expect(OVERVIEW_PAGE.aiNextHref).not.toContain("/messages");
    expect(readFileSync("src/lib/overview.ts", "utf8")).toContain(
      "quiet overlay opener",
    );
  });

  it("caps Social DMs at 5, Education covers at 3, and 24Frame AI next-moves at 3", () => {
    expect(OVERVIEW_SOCIAL_DM_CAP).toBe(5);
    expect(OVERVIEW_EDUCATION_CAP).toBe(3);
    expect(OVERVIEW_AI_NEXT_CAP).toBe(3);
    expect(OVERVIEW_NEWS_CAP).toBe(15);
    expect(overviewSocialChats([0, 1, 2, 3, 4, 5, 6])).toEqual([0, 1, 2, 3, 4]);
    expect(overviewEducationCourses(["a", "b", "c", "d", "e", "f"])).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(
      overviewAiNextMoves(
        [1, 2, 3, 4, 5].map((n) => ({
          id: String(n),
          title: `Title ${n}`,
          reason: null,
          status: "draft",
        })),
      ).map((row) => row.id),
    ).toEqual(["1", "2", "3"]);
    expect(overviewSocialUnreadTotal([{ unread_count: 2 }, { unread_count: 3 }])).toBe(5);
  });

  it("reuses What-changed nouns for the week pulse and does not invent course percent", () => {
    const now = Date.parse("2026-09-18T12:00:00.000Z");
    const since = overviewWeekSince(now);
    expect(overviewInWeek("2026-09-15T12:00:00.000Z", since)).toBe(true);
    expect(overviewInWeek("2026-09-01T12:00:00.000Z", since)).toBe(false);
    expect(
      overviewWeekPulse({ titlesAdded: 1, deliveriesUpdated: 2, findingsOpened: 0 }).map(
        (row) => row.label,
      ),
    ).toEqual(["1 title added", "2 deliveries updated"]);
    expect(OVERVIEW_PAGE.educationEmpty).toBeTruthy();
    expect(JSON.stringify(OVERVIEW_PAGE)).not.toMatch(/lesson_progress/);
    expect(OVERVIEW_MODULE_NEST_CLASS).toBe(
      "gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)]",
    );
    expect(readFileSync("src/lib/overview.ts", "utf8")).not.toContain(
      "OVERVIEW_EDUCATION_LABEL_CLASS",
    );
    expect(readFileSync("src/components/overview/overview-module.tsx", "utf8")).toContain(
      "DASHBOARD_SECTION_TITLE_CLASS",
    );
    expect(readFileSync("src/components/overview/overview-module.tsx", "utf8")).not.toContain(
      "titleClass",
    );
    expect(readFileSync("src/components/overview/overview-home.tsx", "utf8")).not.toContain(
      "titleClass",
    );
  });
});

describe("overviewModuleHeaderAction", () => {
  it("returns null only when the module has no href — arrow needs a destination", () => {
    expect(overviewModuleHeaderAction("24Frame AI", undefined)).toBeNull();
    expect(overviewModuleHeaderAction("24Frame AI", undefined, "Ask 24Frame AI")).toBeNull();
    expect(overviewModuleHeaderAction("Anything", "")).toBeNull();
  });

  it("labels the trailing arrow with the module title when no cta is provided", () => {
    expect(overviewModuleHeaderAction("Social", "/social/dms")).toEqual({
      href: "/social/dms",
      label: "Social",
    });
    expect(overviewModuleHeaderAction("Education", "/education")).toEqual({
      href: "/education",
      label: "Education",
    });
    expect(overviewModuleHeaderAction("Needs you", "/aggregation/attention")).toEqual({
      href: "/aggregation/attention",
      label: "Needs you",
    });
    expect(overviewModuleHeaderAction(" Social ", "/social/dms", "social")).toEqual({
      href: "/social/dms",
      label: "social",
    });
  });

  it("prefers a distinct destination cta for the aria-label", () => {
    expect(
      overviewModuleHeaderAction("24Frame AI", "?ai=1", "Ask 24Frame AI"),
    ).toEqual({ href: "?ai=1", label: "Ask 24Frame AI" });
    expect(
      overviewModuleHeaderAction("Revenue", "/reports", "Aggregation"),
    ).toEqual({ href: "/reports", label: "Aggregation" });
    expect(overviewModuleHeaderAction(NEWS_PAGE.title, NEWS_HREF, "View all")).toEqual({
      href: NEWS_HREF,
      label: "View all",
    });
  });
});
