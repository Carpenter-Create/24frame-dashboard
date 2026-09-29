import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_HEADER_TRAILING_DESKTOP_CLASS,
  HOUSE_HEADER_TRAILING_ICON_CLASS,
  HOUSE_PHONE_CHROME_ICON_CLASS,
} from "@/lib/house-phone-shell";
import { HOUSE_HEADER_TRAILING_HIT_CLASS } from "@/lib/house-lead-chrome";
import {
  SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS,
  SOCIAL_FEED_META_ROW_GAP_CLASS,
  SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS,
  SOCIAL_FEED_PLAY_DISC_CLASS,
  SOCIAL_FEED_ROW_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_MOBILE_BLEED_PAD_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_ACTIONS_OPTICAL_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_STORIES_FEED_RULE_CLASS,
} from "@/lib/social-chrome";
import { socialLikeCountCopy } from "@/lib/social";

const tokens = readFileSync("src/app/tokens.css", "utf8");
const bell = readFileSync("src/components/activity/activity-bell.tsx", "utf8");
const waffle = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
const stories = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
const lock = readFileSync("docs/design-locks/social-home-craft-wave-1-lock-v1.md", "utf8");

describe("Social Home craft Wave 1", () => {
  it("deletes post-to-post hairlines and keeps the Stories seam", () => {
    expect(lock).toContain("social-home-stories-feed-hairline-lock-v1.md");
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("hairline");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("#ECEDF0");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("border");
    expect(SOCIAL_STORIES_FEED_RULE_CLASS).toBe(
      "max-md:border-b max-md:border-solid max-md:border-hairline",
    );
    const homeStories = stories.slice(
      stories.indexOf("function HomeTallStoriesRail"),
      stories.indexOf("export function SocialStoriesRail"),
    );
    expect(homeStories).toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
  });

  it("locks media-to-actions ~10, meta rows 4–6, and ~24 before the next author", () => {
    expect(SOCIAL_FEED_MEDIA_ACTIONS_GAP_CLASS).toBe("mt-[10px]");
    expect(SOCIAL_FEED_META_ROW_GAP_CLASS).toContain("gap-[6px]");
    expect(SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS).toBe("pb-[var(--space-6)]");
    expect(SOCIAL_FEED_ROW_CLASS).toContain(SOCIAL_FEED_NEXT_AUTHOR_AIR_CLASS);
    expect(SOCIAL_FEED_ROW_CLASS).toContain("pb-[var(--space-6)]");
    // Column flex on this row drops the padding on Mobile Safari.
    // Block keeps the 24. shrink-0 stops the gutter from compressing it.
    expect(SOCIAL_FEED_ROW_CLASS).toMatch(/(?:^|\s)block(?:\s|$)/);
    expect(SOCIAL_FEED_ROW_CLASS).toContain("shrink-0");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("flex-col");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("flex ");
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide-y");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide-hairline");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("gap-");
    expect(SOCIAL_FEED_AUTHOR_FOLLOW_GAP_CLASS).toBe("mt-[var(--space-2)]");
    expect(SOCIAL_POST_MEDIA_CLASS).toContain("mt-[var(--space-2)]");
    // Horizontal bleed only. A block-end negative margin cancels the air.
    expect(SOCIAL_POST_MEDIA_CLASS).toContain("-mx-[var(--chrome-gutter)]");
    expect(SOCIAL_POST_MEDIA_CLASS).not.toMatch(/-m[ybt]\b|-mb-|margin-bottom/);
    expect(SOCIAL_POST_ACTIONS_OPTICAL_CLASS).toBe("-ml-[var(--space-2)]");
    expect(SOCIAL_POST_ACTIONS_OPTICAL_CLASS).not.toContain("-mb");
    const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    expect(postCard).toContain("className={SOCIAL_FEED_ROW_CLASS}");
    expect(postCard).toContain('className="block min-w-0 shrink-0"');
    const article = postCard.slice(postCard.indexOf("<article"), postCard.indexOf("</article>"));
    // Shell is the gutter flex item. The 24 lives on the inner row.
    expect(article.indexOf('className="block min-w-0 shrink-0"')).toBeGreaterThan(-1);
    expect(article.indexOf('className="block min-w-0 shrink-0"')).toBeLessThan(
      article.indexOf("className={SOCIAL_FEED_ROW_CLASS}"),
    );
    expect(article).not.toMatch(/<article[^>]*SOCIAL_FEED_ROW_CLASS/);
    expect(postCard).not.toMatch(/-mb-| -my-/);
    const feed = readFileSync("src/components/social/social-optimistic-feed.tsx", "utf8");
    expect(feed).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(feed).not.toContain("divide-y");
    const history = readFileSync("src/components/social/social-activity-history.tsx", "utf8");
    expect(history).toContain("SOCIAL_FEED_GUTTER_CLASS");
    const skeletons = readFileSync("src/components/social/social-skeletons.tsx", "utf8");
    expect(skeletons).toContain("SOCIAL_FEED_ROW_CLASS");
    expect(skeletons).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(skeletons.match(/className="block min-w-0 shrink-0"/g)?.length).toBe(2);
    const homeSkel = skeletons.slice(
      skeletons.indexOf("data-social-feed-skeleton"),
      skeletons.indexOf("function SocialStoriesRailSkeleton"),
    );
    expect(homeSkel.indexOf('className="block min-w-0 shrink-0"')).toBeLessThan(
      homeSkel.indexOf("className={SOCIAL_FEED_ROW_CLASS}"),
    );
    const profileSkel = skeletons.slice(
      skeletons.indexOf("function SocialProfileCenterSkeleton"),
      skeletons.indexOf("export function SocialProfileSkeleton"),
    );
    expect(profileSkel.indexOf('className="block min-w-0 shrink-0"')).toBeLessThan(
      profileSkel.indexOf("className={SOCIAL_FEED_ROW_CLASS}"),
    );
  });

  it("uses one 16 content inset and aligns the action glyph to that edge", () => {
    expect(tokens).toMatch(/--chrome-gutter:\s*16px;/);
    expect(SOCIAL_MOBILE_BLEED_PAD_CLASS).toBe("max-md:px-[var(--chrome-gutter)]");
    expect(SOCIAL_FEED_ROW_CLASS).toContain(SOCIAL_MOBILE_BLEED_PAD_CLASS);
    expect(SOCIAL_FEED_ROW_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("px-[var(--space-4)]");
    expect(SOCIAL_POST_MEDIA_CLASS).toContain("px-0");
    expect(SOCIAL_POST_MEDIA_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_POST_ACTIONS_CLASS).toBe("flex flex-row items-center gap-2");
    expect(SOCIAL_POST_ACTIONS_OPTICAL_CLASS).toBe("-ml-[var(--space-2)]");
    expect(SOCIAL_POST_ACTION_HIT_CLASS).toContain("size-10");
  });

  it("hides a zero like count and uses the singular", () => {
    expect(socialLikeCountCopy(0)).toBeNull();
    expect(socialLikeCountCopy(-1)).toBeNull();
    expect(socialLikeCountCopy(1)).toBe("1 like");
    expect(socialLikeCountCopy(1)).not.toBe("1 likes");
    expect(socialLikeCountCopy(3)).toBe("3 likes");
  });

  it("locks header trailing glyphs at 24, the avatar at 28, and the tap at 44", () => {
    expect(HOUSE_HEADER_TRAILING_ICON_CLASS).toBe("size-6 shrink-0");
    expect(HOUSE_HEADER_TRAILING_DESKTOP_CLASS).toBe("size-6 shrink-0 hidden md:block");
    expect(HOUSE_PHONE_CHROME_ICON_CLASS).toBe("size-6 shrink-0");
    expect(tokens).toMatch(/--header-avatar-size:\s*28px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-avatar-size:\s*28px;/);
    expect(tokens).toMatch(/--header-control-size:\s*44px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-control-size:\s*44px;/);
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("min-h-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("min-w-[var(--header-control-size)]");
    const bellWeight = bell.slice(bell.indexOf("<Bell"), bell.indexOf("/>", bell.indexOf("<Bell")));
    expect(bellWeight).toContain("HOUSE_PHONE_CHROME_ICON_WEIGHT");
    expect(bellWeight).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(waffle).toContain("weight={HOUSE_PHONE_CHROME_ICON_WEIGHT}");
    expect(waffle).toContain("weight={PHOSPHOR_CHROME_IDLE_WEIGHT}");
    expect(SOCIAL_FEED_PLAY_DISC_CLASS).toBe("social-feed-play-disc");
  });
});
