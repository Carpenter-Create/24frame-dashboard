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
} from "@/lib/social-chrome";
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
    expect(home).toContain('data-social-home-stack="lock_topics_composer_stories_wall"');
    expect(home).toContain("data-social-home-composer-skeleton");
    expect(home).toContain("data-social-home-topics-skeleton");
    expect(home).not.toContain("data-social-home-topics-composer-divider");
    expect(home.indexOf("data-social-home-topics-skeleton")).toBeLessThan(
      home.indexOf("data-social-home-composer-skeleton"),
    );
    expect(home.indexOf("data-social-home-composer-skeleton")).toBeLessThan(
      home.indexOf("data-social-stories-skeleton"),
    );
    expect(home.indexOf("data-social-stories-skeleton")).toBeLessThan(
      home.indexOf("data-social-feed-skeleton"),
    );
    expect(home).not.toContain("divide-y divide-hairline");
    expect(home).not.toContain("bg-surface-muted py-");
    const topicsSkeleton = home.slice(
      home.indexOf("data-social-home-topics-skeleton"),
      home.indexOf("data-social-home-composer-skeleton"),
    );
    expect(topicsSkeleton).toContain("overflow-x-auto");
    expect(topicsSkeleton).not.toContain("h-4 w-16");
    expect(topicsSkeleton).not.toContain("gap-2");
    expect(topicsSkeleton.match(/h-8 w-24 shrink-0 rounded-full/g)?.length).toBe(8);
    expect(topicsSkeleton).not.toContain("flex-wrap");
    expect(home).toContain("data-social-stories-skeleton");
    expect(home).toContain("data-social-for-you-skeleton");
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
