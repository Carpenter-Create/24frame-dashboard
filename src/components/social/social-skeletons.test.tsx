import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_PROFILE_LINKS_CLASS,
  SOCIAL_PROFILE_STAGE_CLASS,
  SOCIAL_PROFILE_STAT_LABEL_CLASS,
  SOCIAL_PROFILE_STAT_VALUE_CLASS,
  SOCIAL_PROFILE_STATS_CLASS,
  SOCIAL_PROFILE_STATS_GRID_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_ASIDE_COURSE_CLASS,
  SOCIAL_FEED_ASIDE_HEADING_CLASS,
  SOCIAL_FEED_ASIDE_ROW_CLASS,
  SOCIAL_FEED_ASIDE_SECTION_CLASS,
  SOCIAL_FEED_CENTER_CLASS,
  SOCIAL_FEED_LAYOUT_CLASS,
  SOCIAL_FEED_WALL_CLASS,
  SOCIAL_FOR_YOU_RAIL_CLASS,
  SOCIAL_HOME_STORIES_CARD_CLASS,
  SOCIAL_HOME_STORIES_RAIL_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
} from "@/lib/social-chrome";
import { COURSE_FEATURE_CARD_CLASS } from "@/lib/courses";
import { HOUSE_PILL_SLIDER_TRACK_CLASS } from "@/lib/house-shell";
import {
  SocialCreateSkeleton,
  SocialDmsSkeleton,
  SocialExploreSkeleton,
  SocialFollowsSkeleton,
  SocialHomeSkeleton,
  SocialProfileSkeleton,
  SocialStoriesSkeleton,
  SocialStoryViewerSkeleton,
} from "./social-skeletons";

const LOADING = [
  "src/app/(app)/social/loading.tsx",
  "src/app/(app)/social/create/loading.tsx",
  "src/app/(app)/social/profile/loading.tsx",
  "src/app/(app)/social/stories/loading.tsx",
  "src/app/(app)/social/stories/[id]/loading.tsx",
  "src/app/(app)/social/explore/loading.tsx",
  "src/app/(app)/social/dms/loading.tsx",
  "src/app/(app)/social/profile/edit/loading.tsx",
  "src/app/(app)/social/profile/edit/bio/loading.tsx",
  "src/app/(app)/social/u/[handle]/follows/loading.tsx",
] as const;

describe("Social loading skeletons", () => {
  it("ships Social-local loading.tsx and never paints DashboardSkeleton", () => {
    for (const path of LOADING) {
      expect(existsSync(path)).toBe(true);
      const src = readFileSync(path, "utf8");
      expect(src).not.toContain("DashboardSkeleton");
      expect(src).not.toContain("page-skeletons");
      expect(src).toContain("social-skeletons");
    }
    expect(existsSync("src/app/(app)/loading.tsx")).toBe(false);
    expect(readFileSync("src/app/(app)/aggregation/dashboard/loading.tsx", "utf8")).toContain(
      "DashboardSkeleton",
    );
  });

  it("mirrors Social chrome footprints without invented copy", () => {
    const home = renderToStaticMarkup(<SocialHomeSkeleton />);
    const profile = renderToStaticMarkup(<SocialProfileSkeleton />);
    const create = renderToStaticMarkup(<SocialCreateSkeleton />);
    const stories = renderToStaticMarkup(<SocialStoriesSkeleton />);
    const viewer = renderToStaticMarkup(<SocialStoryViewerSkeleton />);
    const explore = renderToStaticMarkup(<SocialExploreSkeleton />);
    const dms = renderToStaticMarkup(<SocialDmsSkeleton />);
    const follows = renderToStaticMarkup(<SocialFollowsSkeleton />);

    expect(home).toContain("data-social-home-skeleton");
    // Founder 2026-10-08 ("only the slider"; replaces H's slider-led
    // stack): the skeleton follows the live stack — story cards → composer
    // → topic chips → wall — on the same row classes, so nothing moves when
    // the center mounts. No slider placeholder.
    expect(home).toContain('data-social-home-stack="lock_stories_composer_topics_wall"');
    expect(home).not.toContain("data-social-home-lanes-skeleton");
    const order = [
      "data-social-stories-skeleton",
      "data-social-home-composer-skeleton",
      "data-social-home-topics-skeleton",
      "data-social-feed-skeleton",
    ];
    for (let i = 1; i < order.length; i += 1) {
      expect(home.indexOf(order[i - 1]!)).toBeGreaterThan(-1);
      expect(home.indexOf(order[i - 1]!)).toBeLessThan(home.indexOf(order[i]!));
    }
    expect(home).toContain(`class="${SOCIAL_FEED_LAYOUT_CLASS}"`);
    expect(home).toContain(`class="${SOCIAL_FEED_CENTER_CLASS}"`);
    expect(home).not.toContain(`${HOUSE_PILL_SLIDER_TRACK_CLASS} h-11 w-[221px]`);
    expect(home).toContain(`class="${SOCIAL_HOME_TOPIC_ROW_CLASS}"`);
    expect(home).toContain(`class="${SOCIAL_COMPOSER_CLASS}"`);
    expect(home).toContain(SOCIAL_COMPOSER_FIELD_CLASS);
    expect(home.split(SOCIAL_COMPOSER_AFFORDANCE_CLASS).length - 1).toBe(2);
    expect(home).toContain(`class="${SOCIAL_FEED_WALL_CLASS}"`);
    // Cards (founder 2026-10-06): the stories skeleton is the live stories
    // card wrapping the live rail, so the card is in place before the rail.
    expect(home).toContain(
      `data-social-stories-skeleton="" class="${SOCIAL_HOME_STORIES_CARD_CLASS}"><div class="${SOCIAL_HOME_STORIES_RAIL_CLASS}"`,
    );
    expect(home).toContain(`class="${SOCIAL_HOME_TOPIC_TRACK_CLASS}"`);
    // Five story cards at the live card box (no 70 items, no name line).
    expect(home.split(SOCIAL_HOME_STORY_CARD_CLASS).length - 1).toBe(5);
    expect(home).not.toContain("w-[70px]");
    expect(home).not.toContain("h-[100px] w-14");
    expect(home).not.toContain("data-social-home-topics-composer-divider");
    expect(home).not.toContain("divide-y divide-hairline");
    expect(home).not.toContain("h-[240px]");
    const topicsSkeleton = home.slice(
      home.indexOf("data-social-home-topics-skeleton"),
      home.indexOf("data-social-feed-skeleton"),
    );
    expect(topicsSkeleton.split(`class="${SOCIAL_HOME_TOPIC_CLASS}"`).length - 1).toBe(8);
    expect(topicsSkeleton.split(`class="${SOCIAL_HOME_TOPIC_CHIP_CLASS}"`).length - 1).toBe(8);
    expect(topicsSkeleton).not.toContain("flex-wrap");
    expect(home).toContain("data-social-stories-skeleton");
    // The Feed rail skeleton is the same 296 column: the heading row, the
    // course card box, the section and two 56 rows; no hairline.
    expect(home).toContain('data-social-for-you-skeleton="" data-social-for-you-layout="aside"');
    expect(home).toContain(`class="${SOCIAL_FEED_ASIDE_CLASS}"`);
    expect(home).toContain(`class="${SOCIAL_FEED_ASIDE_HEADING_CLASS}"`);
    expect(home).toContain(`class="${SOCIAL_FEED_ASIDE_COURSE_CLASS}"`);
    expect(home).toContain(`class="${COURSE_FEATURE_CARD_CLASS}"`);
    expect(home).toContain(`class="${SOCIAL_FEED_ASIDE_SECTION_CLASS}"`);
    expect(home.split(`class="${SOCIAL_FEED_ASIDE_ROW_CLASS}"`).length - 1).toBe(2);
    // No hairline rule between the course and the people (G drew one).
    expect(home).not.toContain("h-px shrink-0 bg-hairline");
    expect(home).not.toContain(SOCIAL_FOR_YOU_RAIL_CLASS);
    expect(home).not.toContain("data-social-recent-chats-skeleton");
    expect(profile).toContain("data-social-profile-skeleton");
    // Stage lock: the same stage and hero classes as the real face, so the
    // hero box is identical when it mounts (band fill, no wash).
    expect(profile).toContain(`class="${SOCIAL_PROFILE_STAGE_CLASS}"`);
    expect(profile).toContain(`data-social-profile-hero-skeleton="" class="${SOCIAL_PROFILE_HERO_CLASS}"`);
    expect(profile).toContain(`class="${SOCIAL_PROFILE_HEAD_CLASS}"`);
    expect(profile).toContain(`class="${SOCIAL_PROFILE_FACE_CLASS}"`);
    expect(profile).not.toContain("aspect-[4/1]");
    expect(profile).not.toContain("bg-accent-wash");
    expect(profile).not.toContain("h-[112px]");
    expect(profile).toContain("size-16");
    expect(profile).toContain("@min-[40rem]/hero:size-20");
    expect(profile).toContain("border-[3px] border-band-ink");
    expect(profile).toContain("bg-band-ink/15");
    // Order follows the real face: actions, stats, roles, then the quiet links.
    expect(profile.indexOf("data-social-profile-actions-skeleton")).toBeLessThan(profile.indexOf(SOCIAL_PROFILE_STATS_CLASS));
    expect(profile.indexOf(SOCIAL_PROFILE_STATS_CLASS)).toBeLessThan(profile.indexOf("data-social-profile-roles-skeleton"));
    expect(profile.indexOf("data-social-profile-roles-skeleton")).toBeLessThan(profile.indexOf("data-social-profile-links-skeleton"));
    // Stats cells carry the real value and label lines, so the phone strip
    // keeps the real cell height (it was 40 vs 73), and the bars take the
    // surface on phone so they show on the surface-muted strip.
    const statCells = profile.split("data-social-profile-stat-skeleton").slice(1);
    expect(statCells).toHaveLength(3);
    for (const cell of statCells) {
      const valueAt = cell.indexOf(`class="${SOCIAL_PROFILE_STAT_VALUE_CLASS}"`);
      const labelAt = cell.indexOf(`class="${SOCIAL_PROFILE_STAT_LABEL_CLASS}"`);
      expect(valueAt).toBeGreaterThan(-1);
      expect(labelAt).toBeGreaterThan(valueAt);
      expect(cell.match(/max-md:bg-surface"/g)?.length).toBe(2);
    }
    expect(SOCIAL_PROFILE_STATS_GRID_CLASS).toContain("bg-surface-muted");
    // The real links row pulls 6 so a glyph in a clear hit box lines up with
    // the text; the skeleton paints whole boxes, so it starts on the column
    // edge (it sat 6 outside it: x 350 vs 356 at 1440, 10 vs 16 at 390).
    expect(SOCIAL_PROFILE_LINKS_CLASS).toContain("-ml-1.5");
    const linksOpen = profile.slice(
      profile.lastIndexOf("<div", profile.indexOf("data-social-profile-links-skeleton")),
      profile.indexOf(">", profile.indexOf("data-social-profile-links-skeleton")),
    );
    expect(linksOpen).toContain("ml-0");
    expect(linksOpen).not.toContain("-ml-1.5");
    expect(linksOpen).toContain("flex-wrap");
    expect(profile).toContain(SOCIAL_PROFILE_ACTIONS_CLASS);
    expect(profile).toContain("h-11 w-32 rounded-full");
    expect(profile).not.toContain("size-6");
    expect(profile).toContain("lg:max-w-[720px]");
    expect(profile).toContain("lg:max-w-[1052px]");
    expect(profile).not.toContain("lg:max-w-[600px]");
    expect(profile).not.toContain("lg:max-w-[932px]");
    expect(profile).not.toContain("md:max-w-[892px]");
    expect(profile).not.toContain("892");
    expect(profile).toContain("bg-surface-muted");
    expect(profile).not.toContain("divide-y divide-hairline");
    expect(profile).not.toContain("py-[var(--space-2)]");
    expect(profile).not.toContain("bg-surface-muted py-");
    expect(profile).not.toContain("aspect-square");
    expect(profile).not.toContain("data-social-profile-grid");
    expect(profile).toContain("data-social-for-you-skeleton");
    expect(create).toContain("data-social-create-skeleton");
    expect(stories).toContain("data-social-stories-index-skeleton");
    expect(viewer).toContain("data-social-story-viewer-skeleton");
    expect(viewer).not.toContain("animate-pulse");
    expect(viewer).not.toContain("bg-surface-muted");
    expect(explore).toContain("data-social-explore-skeleton");
    expect(explore).toContain("data-social-explore-for-you-skeleton");
    expect(explore).toContain("bg-[#0A0A0B]");
    expect(explore).not.toContain("data-social-explore-results-skeleton");
    expect(explore).not.toContain("data-social-for-you-skeleton");
    expect(explore).not.toContain("lg:max-w-[720px]");
    expect(explore).not.toContain("lg:max-w-[1052px]");
    expect(explore).not.toContain("lg:max-w-[600px]");
    expect(explore).not.toContain("892");
    expect(dms).toContain("data-social-dms-skeleton");
    expect(dms).toContain("data-social-dms-inbox-skeleton");
    expect(dms).toContain("h-[var(--header-search-height)] w-full rounded-full");
    expect(dms).not.toContain("border-b border-hairline");
    expect(dms).toContain("data-social-for-you-skeleton");
    expect(dms).toContain("lg:max-w-[720px]");
    expect(dms).toContain("lg:max-w-[1052px]");
    expect(dms).not.toContain("lg:max-w-[600px]");
    expect(dms).not.toContain("892");
    expect(follows).toContain("data-social-follows-skeleton");

    for (const html of [home, profile, create, stories, viewer, explore, dms, follows]) {
      expect(html).not.toContain("Education");
      expect(html).not.toContain("Riley");
      expect(html).not.toContain("Dashboard");
      expect(html).not.toContain("Following");
      expect(html).not.toContain("For you");
    }
  });
});
