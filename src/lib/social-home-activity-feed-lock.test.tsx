import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SocialHomeActivityEmpty } from "@/components/social/social-home-activity-empty";
import { housePhoneForbidsTruncate } from "@/lib/house-phone-stack";
import { SOCIAL_NAV, isSocialTabActive } from "@/lib/nav";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import { SOCIAL_HOME_STACK_ORDER } from "@/lib/social-home";

const home = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const storiesIndex = readFileSync("src/app/(app)/social/stories/page.tsx", "utf8");
const storiesNew = readFileSync("src/app/(app)/social/stories/new/page.tsx", "utf8");
const storyViewer = readFileSync("src/app/(app)/social/stories/[id]/page.tsx", "utf8");
const nav = readFileSync("src/lib/nav.ts", "utf8");

describe("Social Home activity feed lock v1", () => {
  it("keeps Home a live activity feed at /social and never invents /social/home", () => {
    // Adam 2026-10-04: Social's own Home is Feed (shell-unified-chrome-lock-v1).
    expect(SOCIAL.home.title).toBe("Feed");
    expect(SOCIAL.member.goHome).toBe("Go to Feed");
    expect(SOCIAL.home.subtitle).toBe("Activity from people you follow.");
    expect(SOCIAL_ROUTES.home).toBe("/social");
    expect(Object.values(SOCIAL_ROUTES)).not.toContain("/social/home");
    expect(SOCIAL_NAV[0]?.href).toBe("/social");
    expect(home).toContain("data-social-home-stack={SOCIAL_HOME_STACK_LOCK}");
    // G · Feed (Adam 2026-10-04): tabs → topics → stories → composer → wall.
    expect(SOCIAL_HOME_STACK_ORDER).toEqual(["tabs", "topics", "stories", "composer", "wall"]);
    expect(home.indexOf("<SocialHomeLaneTabs")).toBeGreaterThan(-1);
    expect(home.indexOf("<SocialHomeLaneTabs")).toBeLessThan(home.indexOf("<SocialHomeTopics"));
    expect(home.indexOf("<SocialHomeTopics")).toBeLessThan(home.indexOf("<SocialStoriesRail"));
    expect(home.indexOf("<SocialStoriesRail")).toBeLessThan(home.indexOf("<SocialHomeComposer"));
    expect(home.indexOf("<SocialHomeComposer")).toBeLessThan(home.indexOf("<SocialFollowingWallBound"));
    expect(home).not.toContain("SocialHomeTabs");
    expect(home).not.toContain("SocialStoriesEmpty");
  });

  it("does not mark Home active on /social/stories paths", () => {
    const homeItem = SOCIAL_NAV[0]!;
    expect(isSocialTabActive("/social", homeItem)).toBe(true);
    expect(isSocialTabActive("/social/stories", homeItem)).toBe(false);
    expect(isSocialTabActive("/social/stories/new", homeItem)).toBe(false);
    expect(isSocialTabActive("/social/stories/story-1", homeItem)).toBe(false);
    expect(nav).not.toContain("pathname.startsWith(SOCIAL_ROUTES.stories)");
  });

  it("permanently redirects the bare stories index and leaves create and viewer in place", () => {
    expect(storiesIndex).toContain("permanentRedirect(SOCIAL_ROUTES.home)");
    expect(storiesIndex).not.toContain("SocialStoriesEmpty");
    expect(storiesNew).toContain("SocialStoryCompose");
    expect(storiesNew).toContain("SOCIAL.stories.title");
    expect(storyViewer).toContain("SocialStoryViewer");
    expect(storyViewer).toContain("SOCIAL_ROUTES.home");
    expect(storyViewer).not.toContain("SOCIAL_ROUTES.stories,");
  });

  it("uses the activity page empty and keeps the stories rail empty off the page", () => {
    const html = renderToStaticMarkup(<SocialHomeActivityEmpty findPeople />);
    expect(html).toContain("No activity yet");
    expect(html).toContain("Posts, stories, and updates from people you follow show up here.");
    expect(html).toContain("Share something");
    expect(html).not.toContain("Write something");
    expect(html).toContain("Create a story");
    expect(html).toContain('href="/social/stories/new"');
    expect(html).toContain("Find people");
    expect(html).toContain("t-heading");
    expect(html).toContain("t-body-sm");
    expect(html).toContain("text-ink-3");
    expect(html).toContain("gap-[var(--space-4)]");
    expect(html).not.toContain("No stories yet");
    expect(html).not.toContain("truncate");
    expect(housePhoneForbidsTruncate(html)).toBe(true);
    expect(home).toContain("SocialHomeActivityEmpty");
    expect(home).toContain("<SocialStoriesRail");
  });
});
