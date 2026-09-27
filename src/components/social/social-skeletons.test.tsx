import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL_PROFILE_ACTIONS_CLASS } from "@/lib/social-chrome";
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
    expect(home).toContain("divide-y divide-hairline");
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
    expect(profile).toContain("h-[112px]");
    expect(profile).toContain("md:h-[224px]");
    expect(profile).toContain("bg-accent-wash");
    expect(profile).toContain("data-social-profile-links-skeleton");
    expect(profile.indexOf("data-social-profile-links-skeleton")).toBeGreaterThan(
      profile.indexOf("rounded-full"),
    );
    expect(profile.indexOf("data-social-profile-links-skeleton")).toBeLessThan(
      profile.indexOf(SOCIAL_PROFILE_ACTIONS_CLASS),
    );
    expect(profile).not.toContain("size-6");
    expect(profile).toContain("mt-[var(--space-3)]");
    expect(profile).toContain("lg:max-w-[720px]");
    expect(profile).toContain("lg:max-w-[1052px]");
    expect(profile).not.toContain("lg:max-w-[600px]");
    expect(profile).not.toContain("lg:max-w-[932px]");
    expect(profile).not.toContain("md:max-w-[892px]");
    expect(profile).not.toContain("892");
    expect(profile).toContain("bg-surface-muted");
    expect(profile).toContain("divide-y divide-hairline");
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
