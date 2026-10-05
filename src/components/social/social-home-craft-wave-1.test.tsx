import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOUSE_MODULE_CLASS, HOUSE_SECTION_AIR_CLASS } from "@/lib/house-shell";
import { HOUSE_HEADER_TRAILING_HIT_CLASS } from "@/lib/house-lead-chrome";
import {
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_PLAY_DISC_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_MOBILE_BLEED_PAD_CLASS,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_CAPTION_CLASS,
  SOCIAL_POST_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_TEXT_CARD_CLASS,
  socialPostActionsClass,
  socialPostFootClass,
} from "@/lib/social-chrome";
import { socialLikeCountCopy } from "@/lib/social";

const bell = readFileSync("src/components/activity/activity-bell.tsx", "utf8");
const waffle = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
const stories = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
const lock = readFileSync("docs/design-locks/social-home-craft-wave-1-lock-v1.md", "utf8");

describe("Social Home craft Wave 1", () => {
  // H · Posts (founder 2026-10-05) supersedes Option A's muted post
  // card (radius 16, author row on top, pb 24 under the time). The media
  // is the card; a text-only post is the soft grey card (radius 24).
  // docs/design-locks/social-feed-register-lock-v1.md §7
  it("paints feed posts in the H register (the media is the card); the story cards keep no Stories seam", () => {
    const separation = readFileSync(
      "docs/design-locks/social-home-post-separation-lock-v1.md",
      "utf8",
    );
    expect(lock).toContain("social-home-stories-feed-hairline-lock-v1.md");
    expect(lock).toContain("social-home-post-separation-lock-v1.md");
    // The Option A record stays, marked superseded by the H lock.
    expect(separation).toContain("Option A");
    expect(separation).toContain("removed");
    expect(separation).toContain("double-stacked");
    const head = separation.split("\n").slice(0, 12).join("\n");
    expect(head).toMatch(/\*\*Superseded[^*]*\(founder 2026-10-05, H · Posts\):\*\*/);
    expect(head).toContain("[`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md)");
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe(`flex flex-col ${HOUSE_SECTION_AIR_CLASS} md:gap-[var(--space-12)]`);
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("hairline");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("#ECEDF0");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("bg-surface-muted");
    // A media post is no card: no fill, no radius, no border on the article.
    expect(SOCIAL_POST_CLASS).toBe("block min-w-0 shrink-0");
    expect(SOCIAL_POST_CLASS).not.toContain(HOUSE_MODULE_CLASS);
    // A text-only post: muted, radius 24, pad 24 (16 phone), no border, no shadow.
    expect(SOCIAL_POST_TEXT_CARD_CLASS).toContain("bg-surface-muted");
    expect(SOCIAL_POST_TEXT_CARD_CLASS).toContain("rounded-[var(--radius-xl)]");
    expect(SOCIAL_POST_TEXT_CARD_CLASS).toContain("p-4 md:p-6");
    expect(SOCIAL_POST_TEXT_CARD_CLASS).not.toMatch(/border|shadow|divide/);
    // H · Feed (founder 2026-10-05): the story cards still sit over the
    // composer with no rule (the H board draws none either).
    const hairline = readFileSync(
      "docs/design-locks/social-home-stories-feed-hairline-lock-v1.md",
      "utf8",
    );
    expect(hairline).toContain("Superseded");
    expect(hairline).toContain("social-home-lane-tabs-lock-v1.md");
    const homeStories = stories.slice(
      stories.indexOf("function HomeStoryCards"),
      stories.indexOf("export function SocialStoriesRail"),
    );
    expect(homeStories.length).toBeGreaterThan(0);
    expect(homeStories).not.toContain("SOCIAL_STORIES_FEED_RULE_CLASS");
    expect(homeStories).not.toContain("border-b");
  });

  it("spaces the post as the board: media → 12 / 16 → credit row, caption 8 under, phone actions 12 under; wall 24 / 48", () => {
    // Under the media: 12 on phone, 16 on desktop; inside the text card, none.
    expect(socialPostFootClass("photo")).toContain("mt-3");
    expect(socialPostFootClass("photo")).toContain("md:mt-4");
    expect(socialPostFootClass("text")).not.toMatch(/(?:^|\s)mt-/);
    // Caption 8 under the credit row; phone actions 12 under the caption.
    expect(SOCIAL_POST_CAPTION_CLASS).toContain("mt-2");
    expect(socialPostActionsClass("photo")).toContain("mt-3");
    expect(socialPostActionsClass("photo")).toContain("md:mt-0");
    // No negative pulls between the rows (the #725 collisions stay out).
    for (const cls of [socialPostFootClass("photo"), SOCIAL_POST_CAPTION_CLASS, socialPostActionsClass("photo")]) {
      expect(cls).not.toMatch(/(?:^|\s)-m[ytb]-/);
    }
    // The wall: 24 on phone, 48 on desktop; no divider.
    expect(SOCIAL_FEED_GUTTER_CLASS).toContain(HOUSE_SECTION_AIR_CLASS);
    expect(SOCIAL_FEED_GUTTER_CLASS).toContain("md:gap-[var(--space-12)]");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("divide-y");
    // The article is the gutter's block flex item (Mobile Safari keeps
    // its height); shrink-0 stops the list compressing it.
    const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    expect(postCard).toContain("className={socialPostClass(kind)}");
    expect(SOCIAL_POST_CLASS).toMatch(/(?:^|\s)block(?:\s|$)/);
    expect(SOCIAL_POST_CLASS).toContain("shrink-0");
    expect(SOCIAL_POST_CLASS).not.toContain("flex-col");
    expect(postCard).not.toMatch(/-mb-| -my-/);
    const feed = readFileSync("src/components/social/social-optimistic-feed.tsx", "utf8");
    expect(feed).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(feed).not.toContain("divide-y");
    const history = readFileSync("src/components/social/social-activity-history.tsx", "utf8");
    expect(history).toContain("SOCIAL_FEED_GUTTER_CLASS");
    // One wall skeleton with the live classes, used by the Feed and Profile.
    const skeletons = readFileSync("src/components/social/social-skeletons.tsx", "utf8");
    expect(skeletons).toContain("export function SocialPostWallSkeleton");
    expect(skeletons.match(/<SocialPostWallSkeleton \/>/g)?.length).toBe(2);
    const wall = skeletons.slice(
      skeletons.indexOf("export function SocialPostWallSkeleton"),
      skeletons.indexOf("// Feed center (H)"),
    );
    expect(wall).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(wall).toContain("className={SOCIAL_POST_CLASS}");
    expect(wall).toContain("className={SOCIAL_POST_MEDIA_CLASS}");
    expect(wall).toContain('socialPostFootClass("photo")');
    expect(wall).toContain('socialPostActionsClass("photo")');
    expect(skeletons).not.toContain("SOCIAL_FEED_ROW_CLASS");
  });

  it("phone: the media meets the viewport; the text rows keep the frame's 16 and the actions align to the name", () => {
    expect(SOCIAL_MOBILE_BLEED_PAD_CLASS).toBe("max-md:px-[var(--chrome-gutter)]");
    // The media block cancels the frame's 16 on phone (radius 0 there).
    expect(SOCIAL_POST_MEDIA_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_POST_MEDIA_CLASS).not.toMatch(/(?:^|\s)rounded-/);
    // The credit, caption and actions add no second inset.
    expect(socialPostFootClass("photo")).not.toMatch(/px-|pl-|pr-/);
    expect(SOCIAL_POST_CLASS).not.toContain(SOCIAL_MOBILE_BLEED_PAD_CLASS);
    // Caption and phone actions align to the name: the 40 avatar + 12.
    expect(SOCIAL_POST_CAPTION_CLASS).toContain("pl-[52px]");
    expect(socialPostActionsClass("photo")).toContain("pl-[52px] ");
    expect(socialPostActionsClass("photo")).toContain("md:pl-0");
    expect(socialPostActionsClass("text")).not.toContain("pl-[52px]");
    // The stage hits (immersive, Explore) keep the bare 40.
    expect(SOCIAL_POST_ACTION_HIT_CLASS).toContain("size-10");
  });

  it("hides a zero like count and uses the singular", () => {
    expect(socialLikeCountCopy(0)).toBeNull();
    expect(socialLikeCountCopy(-1)).toBeNull();
    expect(socialLikeCountCopy(1)).toBe("1 like");
    expect(socialLikeCountCopy(1)).not.toBe("1 likes");
    expect(socialLikeCountCopy(3)).toBe("3 likes");
  });

  // H register (Adam 2026-10-05) supersedes the screening chrome's box
  // sizes: header glyphs 20 on phone and desktop in 44 round controls,
  // the dock 24; the avatar 44 on both; taps 44.
  it("locks header glyphs at 20 in 44 round controls, the avatar at 44, and the tap at 44", () => {
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("min-h-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("min-w-[var(--header-control-size)]");
    const bellWeight = bell.slice(bell.indexOf("<Bell"), bell.indexOf("/>", bell.indexOf("<Bell")));
    // One Regular 20 bell on phone and desktop.
    expect(bellWeight).toContain("HOUSE_PHONE_CHROME_ICON_WEIGHT");
    expect(bellWeight).toContain("HOUSE_HEADER_ROUND_GLYPH_CLASS");
    expect(bellWeight).not.toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    // The workspace pill holds one 18 filled grid beside the workspace name.
    expect(waffle).toContain("weight={WORKSPACE_WAFFLE_TRIGGER_ICON_WEIGHT}");
    expect(waffle).toContain("className={WORKSPACE_WAFFLE_TRIGGER_ICON_CLASS}");
    expect(SOCIAL_FEED_PLAY_DISC_CLASS).toBe("social-feed-play-disc");
  });
});
