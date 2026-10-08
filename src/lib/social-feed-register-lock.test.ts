import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  COURSE_FEATURE_CARD_CLASS,
  COURSE_FEATURE_COVER_CLASS,
  COURSE_FEATURE_META_CLASS,
} from "./courses";
import {
  HOUSE_PILL_SLIDER_THUMB_CLASS,
  HOUSE_PILL_SLIDER_TRACK_CLASS,
  HOUSE_SEGMENTED_TRACK_CLASS,
} from "./house-shell";
import { HOUSE_HEADER_ROUND_BUTTON_CLASS } from "./house-lead-chrome";
import { SEGMENTED_TRACK_PERSIST } from "./segmented-track";
import { SOCIAL, SOCIAL_HOME_LANES, socialStoryCardName } from "./social";
import {
  SOCIAL_COMPOSER_AFFORDANCE_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_GLYPH,
  SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS,
  SOCIAL_COMPOSER_AVATAR_CLASS,
  SOCIAL_COMPOSER_AVATAR_NARROW_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
  SOCIAL_FEED_ASIDE_AVATAR_CLASS,
  SOCIAL_FEED_ASIDE_COURSE_CLASS,
  SOCIAL_FEED_ASIDE_HEADING_CLASS,
  SOCIAL_FEED_ASIDE_ROW_CLASS,
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_HEADING_CLASS,
  SOCIAL_FEED_REEL_TILE_CLASS,
  SOCIAL_FEED_REELS_ARROW_CLASS,
  SOCIAL_FEED_REELS_ARROW_OFF_CLASS,
  SOCIAL_FEED_REELS_ARROWS_CLASS,
  SOCIAL_FEED_REELS_CLASS,
  SOCIAL_FEED_REELS_HEAD_CLASS,
  SOCIAL_FEED_WALL_CLASS,
  SOCIAL_FOLLOW_QUIET_CLASS,
  SOCIAL_HOME_STORIES_CARD_CLASS,
  SOCIAL_HOME_STORIES_RAIL_CLASS,
  SOCIAL_HOME_STORY_CREATE_FACE_CLASS,
  SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS,
  SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS,
  SOCIAL_HOME_STORY_NAME_CLASS,
  SOCIAL_HOME_STORY_PLUS_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_MORE_CLASS,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
  SOCIAL_IN_CARD_FILL_CLASS,
} from "./social-chrome";
import { SOCIAL_HOME_STACK_LOCK } from "./social-home";
import {
  WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS,
  WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS,
} from "./workspace-switcher";

const lock = readFileSync("docs/design-locks/social-feed-register-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const shellLock = readFileSync("docs/design-locks/shell-coinbase-register-lock-v1.md", "utf8");
const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const page = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const stories = readFileSync("src/components/social/social-stories-rail.tsx", "utf8");
const forYou = readFileSync("src/components/social/social-for-you.tsx", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

/** The Feed's H block in social-chrome (the lock's classes). */
const FEED_BLOCK = chrome.slice(
  chrome.indexOf("// H · Feed (founder 2026-10-05"),
  chrome.indexOf("export const SOCIAL_FIRST_WIN_CLASS"),
);

/** The Feed sources this lock touches. */
const FEED_SOURCES = [
  "src/components/social/social-home-topics.tsx",
  "src/components/social/social-stories-rail.tsx",
  "src/components/social/social-home-composer.tsx",
  "src/components/social/social-feed-reel-rail.tsx",
  "src/components/social/social-for-you.tsx",
  "src/components/courses/course-card.tsx",
  // H · Posts
  "src/components/social/social-post-card.tsx",
  "src/components/social/social-post-media.tsx",
  "src/components/social/social-feed-carousel.tsx",
  "src/components/social/social-comment-trigger.tsx",
  "src/components/social/social-engagement.tsx",
] as const;

/** The Feed's skeletons (the Explore skeleton's stage hex is not this lock's). */
const skeletons = readFileSync("src/components/social/social-skeletons.tsx", "utf8");
const FEED_SKELETONS = skeletons.slice(
  skeletons.indexOf("export function SocialForYouSkeleton"),
  skeletons.indexOf("export function SocialHomeSkeleton"),
);

function hasClass(classes: string, cls: string): boolean {
  return classes.split(/\s+/).includes(cls);
}

function focusRingReach(): number {
  const rule = globals.match(/:focus-visible:not\(input\):not\(textarea\):not\(select\)\s*\{([^}]*)\}/)?.[1] ?? "";
  return Number(rule.match(/outline:\s*(\d+)px/)?.[1]) + Number(rule.match(/outline-offset:\s*(\d+)px/)?.[1]);
}

// Founder words (Adam, 2026-10-05): a short verbatim anchor per quote (its
// first clause), under the verbatim heading.
const QUOTES = [
  "we must remain in this register.",
  "I want the Coinbase register",
  "we're not too far off already",
  "I like the designs. Let's use them.",
] as const;

// The locks this one reverses in part, read from its Supersedes section.
function supersededLocks(doc: string): string[] {
  const start = doc.indexOf("**Supersedes (in part):**");
  const section = doc.slice(start, doc.indexOf("\n**Keeps:**", start));
  return [...new Set([...section.matchAll(/\]\(([a-z0-9.-]+-lock-v[0-9.]+\.md)\)/g)].map((m) => m[1]!))];
}

// docs/design-locks/social-feed-register-lock-v1.md
describe("Feed register lock v1 (H · Feed, founder 2026-10-05)", () => {
  it("records the founder words and decision 5 verbatim, and is indexed once on the status page", () => {
    expect(lock).toContain("## Founder direction (verbatim, 2026-10-05)");
    for (const quote of QUOTES) {
      expect(lock).toContain(quote);
    }
    expect(lock).toContain('**"sure"** | This lock §1 (the slider) and §6');
    // The shell lock routes decision 5 here.
    expect(shellLock).toContain("[`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) |");
    expect(readme).toContain("- [`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md) — H · Feed");
    const lines = current.split("\n").filter((row) => row.includes("social-feed-register-lock-v1.md"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("marks every lock it reverses with a pointer back here, in the head and the index", () => {
    const superseded = supersededLocks(lock);
    expect([...superseded].sort()).toEqual(
      [
        "24frame-visual-register-rich-calm-lock-v1.md",
        "shell-desktop-header-content-inset-lock-v1.md",
        "social-feed-reel-rail-lock-v1.md",
        "social-home-activity-feed-lock-v1.md",
        "social-home-composer-fb-row-sheet-lock-v1.6.md",
        "social-home-lane-tabs-lock-v1.md",
        "social-home-spine-density-lock-v1.1.md",
        "stories-home-rail-card-identity-lock-v1.md",
        "stories-home-rail-fb-card-lock-v1.md",
        // H · Posts (§7): the post-face locks it reverses in part.
        "social-feed-photo-scale-immersive-lock-v1.md",
        "social-feed-text-media-caption-below-lock-v1.md",
        "social-feed-under-post-time-lock-v1.md",
        "social-home-craft-wave-1-lock-v1.md",
        "social-home-post-actions-align-lock-v1.md",
        "social-home-post-separation-lock-v1.md",
      ].sort(),
    );
    for (const file of superseded) {
      const head = readFileSync(`docs/design-locks/${file}`, "utf8").split("\n").slice(0, 12).join("\n");
      expect(head, file).toMatch(/\*\*(Superseded|Amended|Restored)[^*]*\(founder 2026-10-05, H · (Feed|Posts)\):\*\*/);
      expect(head, file).toContain("[`social-feed-register-lock-v1.md`](social-feed-register-lock-v1.md)");
      const row = readme.split("\n").find((line) => line.startsWith(`- [\`${file}\`]`)) ?? "";
      expect(row, file).toMatch(/Feed register lock \(H · (Feed|Posts)/);
    }
  });

  // G1 is out (founder 2026-10-08): the Following / For you slider is gone
  // from the Feed; the lane, the topic chips and the For you rail stay.
  it("G1 (retired): no Following / For you slider over the Feed; the founder words are on record", () => {
    expect(lock).toContain("**Superseded in part (founder 2026-10-08, no Feed slider):**");
    expect(lock).toContain('"on social, remove the "Following" and "For You" above the feed."');
    expect(lock).toContain('"only the slider."');
    expect(lock).toContain('"leave the right side of the page "For You" as is"');
    expect(existsSync("src/components/social/social-home-lane-tabs.tsx")).toBe(false);
    expect(page).not.toContain("SocialHomeLaneTabs");
    expect(chrome).not.toContain("SOCIAL_FEED_SCOPE_");
    expect(Object.keys(SEGMENTED_TRACK_PERSIST)).not.toContain("socialFeedScope");
    expect(SOCIAL.home).not.toHaveProperty("followingTab");
    expect(SOCIAL.home).not.toHaveProperty("forYouTab");
    expect(SOCIAL.home).not.toHaveProperty("lanesLabel");
    // The lane itself stays, reached by address (?lane=for-you).
    expect(SOCIAL_HOME_LANES).toEqual(["following", "for-you"]);
    expect(page).toContain("parseSocialHomeLane(sp[SOCIAL_HOME_LANE_PARAM])");
    // The header's workspace slider is untouched: the shared track, the
    // wash thumb (cards lock).
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).not.toBe(HOUSE_PILL_SLIDER_THUMB_CLASS);
    expect(WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS).toBe(HOUSE_PILL_SLIDER_TRACK_CLASS);
    expect(HOUSE_PILL_SLIDER_TRACK_CLASS).toBe(HOUSE_SEGMENTED_TRACK_CLASS);
    // The rail keeps its "For you" heading (decision 5, "sure").
    expect(lock).toContain("(founder decision 5)");
  });

  it("G2: topics are secondary chips — the wash with accent-ink when current, plain idle, a 96 fade", () => {
    // The current chip's wash and the idle and current weights are pinned
    // in the cards lock test (ink-2 idle, 500 current).
    expect(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS.startsWith(SOCIAL_HOME_TOPIC_CHIP_CLASS.replace(/ font-medium$/, ""))).toBe(true);
    expect(SOCIAL_HOME_TOPIC_CURRENT_CLASS).toContain("text-accent-ink");
    expect(SOCIAL_HOME_TOPIC_CURRENT_CLASS).toBe(
      "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full md:h-10 text-accent-ink",
    );
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("font-medium");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).not.toContain("bg-");
    // 15px; 40 desktop; a 36 pill (pad 14) in a 44 hit on phone; gap 4.
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("text-[length:var(--text-sm)]");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("h-9");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("px-3.5");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("md:h-10 md:px-4");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toBe(
      "inline-flex h-9 items-center rounded-full px-3.5 text-[length:var(--text-sm)] leading-none md:h-10 md:px-4 font-medium",
    );
    // The idle hit (44 / 40, no fill) is pinned in the cards lock test.
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, "gap-1")).toBe(true);
    // Phone meets the viewport and pads 16.
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, "max-md:px-4")).toBe(true);
    // The 96 fade carries the round grey More topics; the scroll padding
    // equals the fade, and the ring pad is taken back in margin.
    expect(hasClass(SOCIAL_HOME_TOPIC_FADE_CLASS, "w-24")).toBe(true);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, "scroll-pe-24")).toBe(true);
    const reach = focusRingReach();
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `py-[${reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `-my-[${reach}px]`)).toBe(true);
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toContain("size-11");
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toContain("md:size-10");
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toContain("rounded-full bg-surface-muted text-ink");
    expect(SOCIAL_HOME_TOPIC_MORE_CLASS).toBe(
      "pointer-events-auto grid size-11 place-items-center rounded-full bg-surface-muted text-ink transition-colors hover:bg-hairline md:size-10",
    );
  });

  it("G3: the stack is stories → composer → topics → wall (no slider since 2026-10-08; the air is the cards lock's)", () => {
    expect(lock).toContain("`lock_stories_composer_topics_wall`");
    expect(SOCIAL_HOME_STACK_LOCK).toBe("lock_stories_composer_topics_wall");
    const at = (needle: string) => page.indexOf(needle);
    expect(at("<SocialStoriesRail")).toBeGreaterThan(-1);
    expect(at("<SocialStoriesRail")).toBeLessThan(at("<SocialHomeComposer"));
    expect(at("<SocialHomeComposer")).toBeLessThan(at("<SocialHomeTopics"));
    expect(at("<SocialHomeTopics")).toBeLessThan(at('data-social-home-wall=""'));
    // Air: superseded by the cards lock (16 · 8 / 16 · 16 · 8 / 16), which
    // pins the stories card, the composer card, the topic row and the wall.
    // The stories track still pads the focus ring's reach and takes it back.
    const reach = focusRingReach();
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, `py-[${reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, `-my-[${reach}px]`)).toBe(true);
    for (const cls of [SOCIAL_COMPOSER_CLASS, SOCIAL_HOME_TOPIC_ROW_CLASS, SOCIAL_FEED_WALL_CLASS]) {
      expect(cls).not.toMatch(/(?:^|\s)mt-6(?:\s|$)/);
    }
    // The stories card leads the column: 16 under the phone bar (the
    // frame's 16, no pull) and 16 under the header (cards lock §8), with no
    // top margin of its own since the slider went (founder 2026-10-08).
    expect(SOCIAL_HOME_STORIES_CARD_CLASS).not.toMatch(/(?:^|\s)-?mt-/);
  });

  it("G4: story cards at the locked 112×200 / 108×192 with the name on the picture and an accent unseen ring", () => {
    // 108×192 is 9:16; 112×200 is the card lock's desktop size (about 9:16).
    expect(108 / 192).toBe(9 / 16);
    expect(Math.abs(112 / 200 - 9 / 16)).toBeLessThan(0.005);
    // The card's size, its in-card fill and the rail's card are pinned in
    // the cards lock test (the rail now sits in its own card).
    // Avatar 32 / 36, a 2px ring with a 2px pad: accent unseen, hairline seen.
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("left-2 top-2");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("size-8");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("md:size-9");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("border-2");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("p-[2px]");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("border-accent");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toBe(
      "absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border-2 p-[2px] md:size-9 border-accent",
    );
    expect(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS).toContain("border-hairline");
    expect(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS).not.toContain("accent");
    expect(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS).toBe(
      "absolute left-2 top-2 z-10 flex size-8 items-center justify-center rounded-full border-2 p-[2px] md:size-9 border-hairline",
    );
    // The name on the picture: a 48 band scrim, 13 / 500 band-ink, inset 8, wraps.
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("min-h-12");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("from-band/72 to-band/0");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("text-[length:var(--text-xs)] font-medium");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("text-band-ink");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("px-2 pb-2");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("break-words");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).not.toMatch(/truncate|line-clamp/);
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toBe(
      "absolute inset-x-0 bottom-0 z-10 flex min-h-12 items-end bg-linear-to-t from-band/72 to-band/0 px-2 pb-2 text-left text-[length:var(--text-xs)] font-medium leading-tight text-band-ink break-words [overflow-wrap:anywhere]",
    );
    expect(socialStoryCardName("Elena Ruiz")).toBe("Elena R.");
    expect(socialStoryCardName("Joshua K. Carpenter")).toBe("Joshua K.");
    expect(socialStoryCardName("Priya")).toBe("Priya");
    expect(SOCIAL.stories.cardLabel("Elena Ruiz")).toBe("Elena Ruiz story");
    expect(SOCIAL.stories.yourStoryCreate).toBe("Your story, create a story");
    expect(stories).toContain("aria-label={SOCIAL.stories.cardLabel(name)}");
    // Create story: the photo's upper 120 (the plus centred on that seam
    // and the 13 / 500 label are pinned in the cards lock test).
    expect(SOCIAL_HOME_STORY_CREATE_FACE_CLASS).toContain("h-[120px]");
    expect(SOCIAL_HOME_STORY_CREATE_FACE_CLASS).toBe(
      "absolute inset-x-0 top-0 h-[120px] overflow-hidden bg-surface-muted",
    );
    const seam = (cls: string, top: RegExp, size: RegExp) =>
      Number(cls.match(top)?.[1]) + Number(cls.match(size)?.[1]) / 2;
    expect(seam(SOCIAL_HOME_STORY_PLUS_CLASS, /(?:^|\s)top-\[(\d+)px\]/, /(?:^|\s)size-\[(\d+)px\]/)).toBe(120);
    expect(seam(SOCIAL_HOME_STORY_PLUS_CLASS, /md:top-\[(\d+)px\]/, /md:size-\[(\d+)px\]/)).toBe(120);
    expect(stories).toContain("SOCIAL_HOME_STORY_CREATE_LABEL_CLASS");
  });

  it("G5: the composer is one 44 row — the 44 avatar, the pill, round 44 Photo and Camera (in its card)", () => {
    expect(SOCIAL_COMPOSER_AVATAR_CLASS).toBe("size-11");
    // Below 360 the avatar steps out so "Share something" stays one line
    // in its 44 pill at 320 (both pickers stay); the skeleton matches.
    expect(SOCIAL_COMPOSER_AVATAR_NARROW_CLASS).toBe("max-[359px]:hidden");
    const composer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
    expect(composer).toContain("`${SOCIAL_COMPOSER_AVATAR_CLASS} ${SOCIAL_COMPOSER_AVATAR_NARROW_CLASS}`");
    expect(skeletons).toContain("SOCIAL_COMPOSER_AVATAR_NARROW_CLASS");
    expect(hasClass(SOCIAL_COMPOSER_ROW_CLASS, "gap-3")).toBe(true);
    // The pill, Photo and Camera take the in-card fill (cards lock, which
    // pins their classes); the header's round grey control keeps the muted fill.
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain(SOCIAL_IN_CARD_FILL_CLASS);
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toContain(SOCIAL_IN_CARD_FILL_CLASS);
    expect(HOUSE_HEADER_ROUND_BUTTON_CLASS).not.toContain(SOCIAL_IN_CARD_FILL_CLASS);
    expect(SOCIAL_COMPOSER_AFFORDANCE_GLYPH).toBe(20);
    // 8 apart on desktop, 4 on phone.
    expect(hasClass(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS, "gap-1")).toBe(true);
    expect(hasClass(SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS, "md:gap-2")).toBe(true);
  });

  it("G6: the Reels row has a 20 / 480 heading, round 44 arrows, radius 16 tiles 8 apart", () => {
    expect(SOCIAL.reels.title).toBe("Reels");
    expect(SOCIAL_FEED_HEADING_CLASS).toContain("text-[length:var(--text-lg)]");
    expect(SOCIAL_FEED_HEADING_CLASS).toContain("[font-weight:var(--type-title-weight)]");
    expect(SOCIAL_FEED_HEADING_CLASS).toContain("tracking-[-0.02em]");
    expect(SOCIAL_FEED_HEADING_CLASS).not.toMatch(/uppercase/);
    expect(SOCIAL_FEED_HEADING_CLASS).toBe(
      "m-0 text-[length:var(--text-lg)] leading-[1.4] [font-weight:var(--type-title-weight)] tracking-[-0.02em] text-ink",
    );
    expect(hasClass(SOCIAL_FEED_REELS_HEAD_CLASS, "h-11")).toBe(true);
    expect(SOCIAL_FEED_REELS_ARROWS_CLASS).toBe("hidden gap-2 md:flex");
    // The arrows sit on the in-card fill and the row is a card (cards lock,
    // which pins the arrows, the track and the row).
    for (const cls of [SOCIAL_FEED_REELS_ARROW_CLASS, SOCIAL_FEED_REELS_ARROW_OFF_CLASS]) {
      expect(cls).toContain(SOCIAL_IN_CARD_FILL_CLASS);
    }
    expect(SOCIAL_FEED_REELS_CLASS).toContain(SOCIAL_FEED_CARD_CLASS);
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("md:h-80 md:w-[180px]");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("h-[284px] w-40");
  });

  it("G7: the For you rail keeps its heading over a soft grey course card (the grid: cards lock §8)", () => {
    // The 600 / 48 / 296 grid from xl is superseded by the Feed placement
    // (founder 2026-10-07): 680 / 48 / 296, centred on the viewport; the
    // cards lock §8 pins the layout, column and rail classes.
    // Decision 5 ("sure"): "For you" heads the rail, level with the slider.
    expect(SOCIAL.forYou.title).toBe("For you");
    expect(forYou).toContain("{SOCIAL.forYou.title}");
    expect(SOCIAL_FEED_ASIDE_HEADING_CLASS).toBe(`${SOCIAL_FEED_HEADING_CLASS} flex h-11 items-center`);
    // The course card: muted, radius 24, pad 16, no border; cover radius 16.
    expect(forYou).toContain('density="feature"');
    expect(forYou).toContain("metaLabel={SOCIAL.forYou.latestCourseEyebrow}");
    expect(hasClass(SOCIAL_FEED_ASIDE_COURSE_CLASS, "mt-4")).toBe(true);
    // The course card's fill and title, the people card, its subhead and
    // rows and the Follow pill are pinned in the cards lock test.
    expect(COURSE_FEATURE_CARD_CLASS).toContain("rounded-[var(--radius-xl)]");
    expect(COURSE_FEATURE_COVER_CLASS).toBe("rounded-[var(--radius-lg)] border-0");
    expect(COURSE_FEATURE_META_CLASS).toContain("text-[length:var(--text-xs)]");
    expect(COURSE_FEATURE_META_CLASS).toContain("font-medium text-ink-2");
    expect(SOCIAL.forYou.latestCourseEyebrow).toBe("Latest course · Education");
    // People: 56 rows, a 40 avatar, gap 12.
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toContain("min-h-14");
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toContain("gap-3");
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toContain("rounded-[var(--radius-xl)] px-3");
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toBe(
      "flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius-xl)] px-3",
    );
    expect(SOCIAL_FEED_ASIDE_AVATAR_CLASS).toBe("size-10");
    // Follow: the small secondary, never an accent fill or a hairline.
    expect(SOCIAL_FOLLOW_QUIET_CLASS).not.toMatch(/border|accent/);
    // No hairline in the rail.
    expect(forYou).not.toContain("SOCIAL_FEED_ASIDE_RULE_CLASS");
    expect(chrome).not.toContain("SOCIAL_FEED_ASIDE_RULE_CLASS");
  });

  it("stays in tokens: no hex, no shadow, no truncation, no reference-brand word in the Feed sources", () => {
    expect(FEED_BLOCK.length).toBeGreaterThan(1000);
    expect(FEED_BLOCK).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The class strings themselves (comments may say "never truncated").
    const classes = [...FEED_BLOCK.matchAll(/"([^"]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2]).join(" ");
    expect(classes.length).toBeGreaterThan(1000);
    expect(classes).not.toMatch(/\bshadow-(?!none)/);
    expect(classes).not.toMatch(/\btruncate\b|line-clamp|text-ellipsis/);
    for (const path of FEED_SOURCES) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(/#[0-9a-fA-F]{6}\b/);
      expect(src, path).not.toMatch(/\bshadow-(?!none)/);
      expect(src, path).not.toMatch(/Coinbase/i);
    }
    expect(chrome).not.toMatch(/Coinbase/i);
    expect(FEED_SKELETONS).toContain("SocialHomeCenterSkeleton");
    expect(FEED_SKELETONS).not.toMatch(/#[0-9a-fA-F]{3,8}\b|\bshadow-(?!none)|Coinbase/i);
  });
});
