import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { HOUSE_HEADER_TRAILING_HIT_CLASS } from "@/lib/house-lead-chrome";
import {
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_CARD_SURFACE_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_PLAY_DISC_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_MOBILE_BLEED_PAD_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_HEAD_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_WORDS_CLASS,
} from "@/lib/social-chrome";
import { socialLikeCountCopy } from "@/lib/social";

const bell = readFileSync("src/components/activity/activity-bell.tsx", "utf8");
const waffle = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
const stories = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
const lock = readFileSync("docs/design-locks/social-home-craft-wave-1-lock-v1.md", "utf8");

describe("Social Home craft Wave 1", () => {
  // Cards (founder 2026-10-06, Direction B) supersede H · Posts ("the
  // media is the card"): every post is the soft grey card, header on top.
  // The values are owned by src/lib/social-feed-cards-lock.test.ts; this
  // file checks the composition by reference.
  // docs/design-locks/social-feed-cards-lock-v1.md
  it("paints every feed post as the card (header on top); the story cards keep no Stories seam", () => {
    const separation = readFileSync(
      "docs/design-locks/social-home-post-separation-lock-v1.md",
      "utf8",
    );
    expect(lock).toContain("social-home-stories-feed-hairline-lock-v1.md");
    expect(lock).toContain("social-home-post-separation-lock-v1.md");
    // The Option A record stays, marked superseded (H, then the cards lock).
    expect(separation).toContain("Option A");
    expect(separation).toContain("removed");
    expect(separation).toContain("double-stacked");
    const head = separation.split("\n").slice(0, 12).join("\n");
    expect(head).toMatch(/\*\*Superseded[^*]*\(founder 2026-10-05, H · Posts\):\*\*/);
    expect(head).toContain("[`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md)");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("hairline");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("#ECEDF0");
    // Every post, text or media, is the one card: the shared surface,
    // no edge, no shadow, no divider.
    const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    expect(postCard).toContain("className={SOCIAL_FEED_CARD_CLASS}");
    expect(SOCIAL_FEED_CARD_CLASS).toContain(SOCIAL_FEED_CARD_SURFACE_CLASS);
    expect(SOCIAL_FEED_CARD_CLASS).not.toMatch(/border|shadow|divide/);
    // The card is no longer forked by kind (the H text card is gone).
    expect(postCard).not.toContain("socialPostClass(kind)");
    // H · Feed (founder 2026-10-05): the story cards still sit over the
    // composer with no rule; the stories card draws none either.
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

  it("orders the post as the card: header → words → media → actions; the wall is the shared gutter, no divider", () => {
    const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
    const postCard = card.slice(card.indexOf("export function SocialPostCard"));
    const at = (needle: string) => {
      const i = postCard.indexOf(needle);
      expect(i, needle).toBeGreaterThan(-1);
      return i;
    };
    const order = [
      at("className={SOCIAL_POST_HEAD_CLASS}"),
      at("className={SOCIAL_POST_WORDS_CLASS}"),
      at("<SocialPostMedia"),
      at("className={SOCIAL_POST_ACTIONS_CLASS}"),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // No negative vertical pulls between the rows (the #725 collisions stay out).
    for (const cls of [SOCIAL_POST_HEAD_CLASS, SOCIAL_POST_WORDS_CLASS, SOCIAL_POST_MEDIA_CLASS, SOCIAL_POST_ACTIONS_CLASS]) {
      expect(cls).not.toMatch(/(?:^|\s)(?:max-md:|md:)?-m[ytb]-/);
    }
    expect(postCard).not.toMatch(/-mb-| -my-/);
    // The card is the gutter's column item; shrink-0 stops the list compressing it.
    expect(SOCIAL_FEED_CARD_CLASS).toContain("shrink-0");
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
      skeletons.indexOf("// Feed center (H"),
    );
    expect(wall).toContain("className={SOCIAL_FEED_GUTTER_CLASS}");
    expect(wall).toContain("className={SOCIAL_FEED_CARD_CLASS}");
    expect(wall).toContain("className={SOCIAL_POST_HEAD_CLASS}");
    expect(wall).toContain("className={SOCIAL_POST_MEDIA_CLASS}");
    expect(wall).toContain("className={SOCIAL_POST_ACTIONS_CLASS}");
    expect(skeletons).not.toContain("SOCIAL_FEED_ROW_CLASS");
  });

  it("phone: the card meets the viewport; the media fills the card's width; the text rows keep 16", () => {
    expect(SOCIAL_MOBILE_BLEED_PAD_CLASS).toBe("max-md:px-[var(--chrome-gutter)]");
    // The card cancels the frame's 16 on phone, square there.
    expect(SOCIAL_FEED_CARD_SURFACE_CLASS).toContain(SOCIAL_MOBILE_BLEED_CLASS);
    expect(SOCIAL_FEED_CARD_SURFACE_CLASS).toContain("max-md:rounded-none");
    // The media's desktop inset drops on phone, square there too.
    expect(SOCIAL_POST_MEDIA_CLASS).toContain("max-md:mx-0");
    expect(SOCIAL_POST_MEDIA_CLASS).toContain("max-md:rounded-none");
    // The header, the words and the actions keep the card's own 16 on both.
    for (const cls of [SOCIAL_POST_HEAD_CLASS, SOCIAL_POST_WORDS_CLASS, SOCIAL_POST_ACTIONS_CLASS]) {
      expect(cls).toMatch(/(?:^|\s)px-4(?:\s|$)/);
      expect(cls).not.toMatch(/(?:^|\s)(?:max-md:|md:)px-/);
    }
    // No second bleed inside the card.
    expect(SOCIAL_POST_MEDIA_CLASS).not.toContain(SOCIAL_MOBILE_BLEED_CLASS);
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
