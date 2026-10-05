import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  COURSE_FEATURE_CARD_CLASS,
  COURSE_FEATURE_COVER_CLASS,
  COURSE_FEATURE_META_CLASS,
  COURSE_FEATURE_TITLE_CLASS,
} from "./courses";
import {
  HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS,
  HOUSE_PILL_SLIDER_THUMB_CLASS,
  HOUSE_PILL_SLIDER_THUMB_DURATION_MS,
  HOUSE_PILL_SLIDER_TRACK_CLASS,
  HOUSE_SEGMENTED_TRACK_CLASS,
} from "./house-shell";
import { HOUSE_HEADER_ROUND_BUTTON_CLASS } from "./house-lead-chrome";
import { SEGMENTED_TRACK_PERSIST } from "./segmented-track";
import { SOCIAL, SOCIAL_HOME_LANES, socialHomeLaneIndex, socialStoryCardName } from "./social";
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
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_ASIDE_COURSE_CLASS,
  SOCIAL_FEED_ASIDE_HEADING_CLASS,
  SOCIAL_FEED_ASIDE_ROW_CLASS,
  SOCIAL_FEED_ASIDE_ROWS_CLASS,
  SOCIAL_FEED_ASIDE_SECTION_CLASS,
  SOCIAL_FEED_ASIDE_SUBHEAD_CLASS,
  SOCIAL_FEED_CENTER_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_HEADING_CLASS,
  SOCIAL_FEED_LAYOUT_CLASS,
  SOCIAL_FEED_MEASURE,
  SOCIAL_FEED_PAIR_WIDTH,
  SOCIAL_FEED_REEL_TILE_CLASS,
  SOCIAL_FEED_REELS_ARROW_CLASS,
  SOCIAL_FEED_REELS_ARROW_OFF_CLASS,
  SOCIAL_FEED_REELS_ARROWS_CLASS,
  SOCIAL_FEED_REELS_CLASS,
  SOCIAL_FEED_REELS_HEAD_CLASS,
  SOCIAL_FEED_REELS_TRACK_CLASS,
  SOCIAL_FEED_SCOPE_CLASS,
  SOCIAL_FEED_SCOPE_SEGMENT_OFF_CLASS,
  SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS,
  SOCIAL_FEED_SCOPE_THUMB_CLASS,
  SOCIAL_FEED_SCOPE_THUMB_DURATION_MS,
  SOCIAL_FEED_SCOPE_TRACK_CLASS,
  SOCIAL_FEED_WALL_CLASS,
  SOCIAL_FOLLOW_QUIET_CLASS,
  SOCIAL_HOME_STORIES_RAIL_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_HOME_STORY_CREATE_FACE_CLASS,
  SOCIAL_HOME_STORY_CREATE_LABEL_CLASS,
  SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS,
  SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS,
  SOCIAL_HOME_STORY_NAME_CLASS,
  SOCIAL_HOME_STORY_PLUS_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_MORE_CLASS,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
} from "./social-chrome";
import { SOCIAL_FEED_REEL_STEP_PX, SOCIAL_FEED_REEL_TILE } from "./social-feed-reels";
import { SOCIAL_HOME_STACK_LOCK, SOCIAL_HOME_STACK_ORDER } from "./social-home";
import {
  WORKSPACE_SWITCHER_SEGMENT_ON_CLASS,
  WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS,
  WORKSPACE_SWITCHER_SLIDER_THUMB_DURATION_MS,
  WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS,
} from "./workspace-switcher";

const lock = readFileSync("docs/design-locks/social-feed-register-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const shellLock = readFileSync("docs/design-locks/shell-coinbase-register-lock-v1.md", "utf8");
const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const page = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const slider = readFileSync("src/components/social/social-home-lane-tabs.tsx", "utf8");
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
  "src/components/social/social-home-lane-tabs.tsx",
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

// Founder words, verbatim (Adam, 2026-10-05).
const QUOTES = [
  "we must remain in this register.",
  "I want the Coinbase register, but the modernize idea of social media experience through its layout and media-immersive experience.",
  "we're not too far off already, just improve what we have to do what we're trying to do.",
  'I like the designs. Let\'s use them. 1) that\'s fine, but use default text "Search Social" 2) yes 3) ok 4) yes. 5) sure',
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
    for (const quote of QUOTES) {
      expect(lock).toContain(quote);
    }
    expect(lock).toContain('| 5 | "For you" stays both as the slider option and as the right column heading? | **"sure"**');
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

  it("G1: Following / For you is the house pill slider — the workspace slider's track, ink thumb and motion", () => {
    // One component per pattern: SegmentedTrack, with the shared classes.
    expect(slider).toContain("<SegmentedTrack");
    expect(slider).toContain('aria-label={SOCIAL.home.lanesLabel}');
    expect(SOCIAL.home.lanesLabel).toBe("Feed scope");
    expect(slider).toContain("persistKey={SEGMENTED_TRACK_PERSIST.socialFeedScope}");
    expect(SEGMENTED_TRACK_PERSIST.socialFeedScope).toBe("social-feed-scope");
    expect(SOCIAL_FEED_SCOPE_THUMB_CLASS).toBe(HOUSE_PILL_SLIDER_THUMB_CLASS);
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).toBe(HOUSE_PILL_SLIDER_THUMB_CLASS);
    expect(WORKSPACE_SWITCHER_SLIDER_TRACK_CLASS).toBe(HOUSE_PILL_SLIDER_TRACK_CLASS);
    expect(HOUSE_PILL_SLIDER_TRACK_CLASS).toBe(HOUSE_SEGMENTED_TRACK_CLASS);
    expect(SOCIAL_FEED_SCOPE_TRACK_CLASS).toBe(`${HOUSE_PILL_SLIDER_TRACK_CLASS} w-max`);
    // Muted track, no inset; ink thumb sliding 220 ms ease-out.
    expect(HOUSE_PILL_SLIDER_TRACK_CLASS).toContain("rounded-full bg-surface-muted");
    expect(HOUSE_PILL_SLIDER_TRACK_CLASS).not.toMatch(/(?:^|\s)p[xy]?-/);
    expect(HOUSE_PILL_SLIDER_THUMB_CLASS).toContain("inset-y-0");
    expect(HOUSE_PILL_SLIDER_THUMB_CLASS).toContain("bg-ink");
    expect(HOUSE_PILL_SLIDER_THUMB_CLASS).toContain("duration-[220ms] ease-out");
    expect(HOUSE_PILL_SLIDER_THUMB_DURATION_MS).toBe(220);
    expect(SOCIAL_FEED_SCOPE_THUMB_DURATION_MS).toBe(220);
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_DURATION_MS).toBe(220);
    // 44 segments, 17 / 600, pad 20 on a page switch; page colour on the thumb.
    expect(HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS).toContain("h-11");
    expect(HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS).toContain("text-[length:var(--text-base)] font-semibold");
    expect(SOCIAL_FEED_SCOPE_SEGMENT_ON_CLASS).toBe(`${HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS} px-5 text-bg`);
    expect(SOCIAL_FEED_SCOPE_SEGMENT_OFF_CLASS).toBe(`${HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS} px-5 text-ink`);
    expect(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS).toBe("text-bg");
    // Left-aligned, its own row; aria-current on the lit lane; same URLs.
    expect(SOCIAL_FEED_SCOPE_CLASS).toBe("flex shrink-0");
    expect(slider).toContain('aria-current={current ? "page" : undefined}');
    expect(slider).toContain("useSocialHomeLive(lane, topic)");
    expect(slider).toContain("socialHomeAxisHref(item, live.topic)");
    expect(SOCIAL_HOME_LANES.map(socialHomeLaneIndex)).toEqual([0, 1]);
    // "For you" stays the slider option (decision 5).
    expect(SOCIAL.home.forYouTab).toBe("For you");
    expect(lock).toContain('"For you" stays the slider option (founder decision 5)');
  });

  it("G2: topics are secondary chips — the wash with accent-ink when current, plain ink idle, a 96 fade", () => {
    expect(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS).toContain("bg-accent-wash");
    expect(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS).toContain("font-semibold");
    expect(SOCIAL_HOME_TOPIC_CURRENT_CLASS).toContain("text-accent-ink");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("font-medium");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).not.toContain("bg-");
    expect(SOCIAL_HOME_TOPIC_CLASS).toContain("text-ink");
    // 15px; 40 desktop; a 36 pill (pad 14) in a 44 hit on phone; gap 4.
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("text-[length:var(--text-sm)]");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("h-9");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("px-3.5");
    expect(SOCIAL_HOME_TOPIC_CHIP_CLASS).toContain("md:h-10 md:px-4");
    expect(SOCIAL_HOME_TOPIC_CLASS).toContain("h-11");
    expect(SOCIAL_HOME_TOPIC_CLASS).toContain("md:h-10");
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, "gap-1")).toBe(true);
    // Phone meets the viewport and pads 16.
    expect(SOCIAL_HOME_TOPIC_ROW_CLASS).toContain("max-md:-mx-[var(--chrome-gutter)]");
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
    expect(SOCIAL.home.moreTopics).toBe("More topics");
  });

  it("G3: the stack is slider → stories → composer → topics → wall, 24 · 24 · 24 · 16 apart", () => {
    expect(lock).toContain("`lock_slider_stories_composer_topics_wall`");
    expect(SOCIAL_HOME_STACK_LOCK).toBe("lock_slider_stories_composer_topics_wall");
    expect(SOCIAL_HOME_STACK_ORDER).toEqual(["slider", "stories", "composer", "topics", "wall"]);
    const at = (needle: string) => page.indexOf(needle);
    expect(at("<SocialHomeLaneTabs")).toBeGreaterThan(-1);
    expect(at("<SocialHomeLaneTabs")).toBeLessThan(at("<SocialStoriesRail"));
    expect(at("<SocialStoriesRail")).toBeLessThan(at("<SocialHomeComposer"));
    expect(at("<SocialHomeComposer")).toBeLessThan(at("<SocialHomeTopics"));
    expect(at("<SocialHomeTopics")).toBeLessThan(at('data-social-home-wall=""'));
    // Air: the stories track's 19 + its 5 ring pad = 24; 24; 24; 16.
    const reach = focusRingReach();
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, `mt-[${24 - reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, `py-[${reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, `-mb-[${reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_COMPOSER_CLASS, "mt-6")).toBe(true);
    expect(hasClass(SOCIAL_HOME_TOPIC_ROW_CLASS, "mt-6")).toBe(true);
    expect(hasClass(SOCIAL_FEED_WALL_CLASS, "mt-4")).toBe(true);
    // The slider: 16 under the phone bar (the frame's 16, no pull), 24
    // under the desktop header (the 8 inset plus the grid's 16).
    expect(SOCIAL_FEED_SCOPE_CLASS).not.toMatch(/-?mt-/);
    expect(hasClass(SOCIAL_FEED_LAYOUT_CLASS, "md:pt-4")).toBe(true);
  });

  it("G4: story cards at the locked 112×200 / 108×192 with the name on the picture and an accent unseen ring", () => {
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("h-[192px] w-[108px]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("md:h-[200px] md:w-[112px]");
    // 108×192 is 9:16; 112×200 is the card lock's desktop size (about 9:16).
    expect(108 / 192).toBe(9 / 16);
    expect(Math.abs(112 / 200 - 9 / 16)).toBeLessThan(0.005);
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_HOME_STORY_CARD_CLASS).not.toMatch(/border|shadow|ring/);
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, "gap-2")).toBe(true);
    expect(hasClass(SOCIAL_HOME_STORIES_RAIL_CLASS, "max-md:px-4")).toBe(true);
    // Avatar 32 / 36, a 2px ring with a 2px pad: accent unseen, hairline seen.
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("left-2 top-2");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("size-8");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("md:size-9");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("border-2");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("p-[2px]");
    expect(SOCIAL_HOME_STORY_FACE_RING_UNSEEN_CLASS).toContain("border-accent");
    expect(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS).toContain("border-hairline");
    expect(SOCIAL_HOME_STORY_FACE_RING_SEEN_CLASS).not.toContain("accent");
    // The name on the picture: a 48 band scrim, 13 / 500 band-ink, inset 8, wraps.
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("min-h-12");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("from-band/72 to-band/0");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("text-[length:var(--text-xs)] font-medium");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("text-band-ink");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("px-2 pb-2");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).toContain("break-words");
    expect(SOCIAL_HOME_STORY_NAME_CLASS).not.toMatch(/truncate|line-clamp/);
    expect(socialStoryCardName("Elena Ruiz")).toBe("Elena R.");
    expect(socialStoryCardName("Joshua K. Carpenter")).toBe("Joshua K.");
    expect(socialStoryCardName("Priya")).toBe("Priya");
    expect(SOCIAL.stories.cardLabel("Elena Ruiz")).toBe("Elena Ruiz story");
    expect(SOCIAL.stories.yourStoryCreate).toBe("Your story, create a story");
    expect(stories).toContain("aria-label={SOCIAL.stories.cardLabel(name)}");
    // Create story: the photo's upper 120, the plus centred on the seam
    // (top + half its box = 120 on both), ringed 3 in muted; the label
    // 15 / 500 ink, 12 from the bottom.
    expect(SOCIAL_HOME_STORY_CREATE_FACE_CLASS).toContain("h-[120px]");
    expect(99 + 42 / 2).toBe(120);
    expect(97 + 46 / 2).toBe(120);
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("top-[99px]");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("size-[42px]");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("md:top-[97px]");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("md:size-[46px]");
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toContain("border-[3px] border-surface-muted bg-accent text-accent-contrast");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain("bottom-3");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain("text-[length:var(--text-sm)] font-medium");
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toContain("text-ink");
  });

  it("G5: the composer is one 44 row — the 44 avatar, the grey pill, round grey 44 Photo and Camera", () => {
    expect(SOCIAL_COMPOSER_AVATAR_CLASS).toBe("size-11");
    // Below 360 the avatar steps out so "Share something" stays one line
    // in its 44 pill at 320 (both pickers stay); the skeleton matches.
    expect(SOCIAL_COMPOSER_AVATAR_NARROW_CLASS).toBe("max-[359px]:hidden");
    const composer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
    expect(composer).toContain("`${SOCIAL_COMPOSER_AVATAR_CLASS} ${SOCIAL_COMPOSER_AVATAR_NARROW_CLASS}`");
    expect(skeletons).toContain("SOCIAL_COMPOSER_AVATAR_NARROW_CLASS");
    expect(hasClass(SOCIAL_COMPOSER_ROW_CLASS, "gap-3")).toBe(true);
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("h-11");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("rounded-full");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("bg-surface-muted");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("px-4");
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toContain("text-[length:var(--text-base)] text-ink-2");
    expect(SOCIAL.home.composerPrompt).toBe("Share something");
    // Photo and Camera: the header's round grey face (fill, ink, circle).
    for (const cls of ["size-11", "rounded-full", "bg-surface-muted", "text-ink", "hover:bg-hairline"]) {
      expect(hasClass(SOCIAL_COMPOSER_AFFORDANCE_CLASS, cls), cls).toBe(true);
      expect(hasClass(HOUSE_HEADER_ROUND_BUTTON_CLASS, cls), cls).toBe(cls !== "size-11");
    }
    expect(SOCIAL_COMPOSER_AFFORDANCE_GLYPH).toBe(20);
    // 8 apart on desktop, 4 on phone.
    for (const cls of [SOCIAL_COMPOSER_CLASS, SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS]) {
      expect(hasClass(cls, "gap-1")).toBe(true);
      expect(hasClass(cls, "md:gap-2")).toBe(true);
    }
  });

  it("G6: the Reels row has a 20 / 480 heading, round grey 44 arrows, radius 16 tiles 8 apart", () => {
    expect(SOCIAL.reels.title).toBe("Reels");
    expect(SOCIAL_FEED_HEADING_CLASS).toContain("text-[length:var(--text-lg)]");
    expect(SOCIAL_FEED_HEADING_CLASS).toContain("[font-weight:var(--type-title-weight)]");
    expect(SOCIAL_FEED_HEADING_CLASS).toContain("tracking-[-0.02em]");
    expect(SOCIAL_FEED_HEADING_CLASS).not.toMatch(/uppercase/);
    expect(hasClass(SOCIAL_FEED_REELS_HEAD_CLASS, "h-11")).toBe(true);
    expect(SOCIAL_FEED_REELS_ARROWS_CLASS).toBe("hidden gap-2 md:flex");
    for (const cls of [SOCIAL_FEED_REELS_ARROW_CLASS, SOCIAL_FEED_REELS_ARROW_OFF_CLASS]) {
      expect(cls).toContain("size-11");
      expect(cls).toContain("rounded-full bg-surface-muted text-ink");
      expect(cls).not.toMatch(/border/);
    }
    expect(SOCIAL_FEED_REELS_ARROW_OFF_CLASS).toContain("opacity-40");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("md:h-80 md:w-[180px]");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("h-[284px] w-40");
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, "gap-2")).toBe(true);
    expect(SOCIAL_FEED_REEL_TILE.desktop.gap).toBe(8);
    expect(SOCIAL_FEED_REEL_STEP_PX).toBe(2 * (180 + 8));
    // 16 under the head on desktop, 12 on phone (margin + the 5 ring pad).
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, "md:mt-[11px]")).toBe(true);
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, "mt-[7px]")).toBe(true);
    // 48 above and below on desktop: the wall's own 48 gutter (H · Posts);
    // the row adds none there, and 4 on phone (28 with the 24 gutter).
    expect(hasClass(SOCIAL_FEED_REELS_CLASS, "md:my-0")).toBe(true);
    expect(hasClass(SOCIAL_FEED_REELS_CLASS, "my-1")).toBe(true);
    expect(hasClass(SOCIAL_FEED_GUTTER_CLASS, "md:gap-[var(--space-12)]")).toBe(true);
  });

  it("G7: the grid is 600 / 48 / 296 and the For you rail keeps its heading over a soft grey course card", () => {
    expect(SOCIAL_FEED_MEASURE).toEqual({ center: 600, gutter: 48, right: 296 });
    expect(SOCIAL_FEED_PAIR_WIDTH).toBe(944);
    expect(SOCIAL_FEED_LAYOUT_CLASS).toContain("gap-12");
    expect(SOCIAL_FEED_LAYOUT_CLASS).toContain("xl:max-w-[944px]");
    expect(SOCIAL_FEED_CENTER_CLASS).toContain("md:max-w-[600px]");
    expect(SOCIAL_FEED_ASIDE_CLASS).toBe("hidden w-[296px] shrink-0 flex-col xl:flex");
    // Decision 5 ("sure"): "For you" heads the rail, level with the slider.
    expect(SOCIAL.forYou.title).toBe("For you");
    expect(forYou).toContain("{SOCIAL.forYou.title}");
    expect(SOCIAL_FEED_ASIDE_HEADING_CLASS).toBe(`${SOCIAL_FEED_HEADING_CLASS} flex h-11 items-center`);
    // The course card: muted, radius 24, pad 16, no border; cover radius 16.
    expect(forYou).toContain('density="feature"');
    expect(forYou).toContain("metaLabel={SOCIAL.forYou.latestCourseEyebrow}");
    expect(hasClass(SOCIAL_FEED_ASIDE_COURSE_CLASS, "mt-4")).toBe(true);
    expect(COURSE_FEATURE_CARD_CLASS).toBe("flex flex-col gap-4 rounded-[var(--radius-xl)] bg-surface-muted p-4");
    expect(COURSE_FEATURE_COVER_CLASS).toBe("rounded-[var(--radius-lg)] border-0");
    expect(COURSE_FEATURE_META_CLASS).toContain("text-[length:var(--text-xs)]");
    expect(COURSE_FEATURE_META_CLASS).toContain("font-medium text-ink-2");
    expect(COURSE_FEATURE_TITLE_CLASS).toContain("text-[length:var(--text-base)]");
    expect(COURSE_FEATURE_TITLE_CLASS).toContain("font-semibold text-ink");
    expect(SOCIAL.forYou.latestCourseEyebrow).toBe("Latest course · Education");
    // People: 24, a 17 / 600 heading, 12, 56 rows, a 40 avatar, gap 12.
    expect(hasClass(SOCIAL_FEED_ASIDE_SECTION_CLASS, "mt-6")).toBe(true);
    expect(SOCIAL_FEED_ASIDE_SUBHEAD_CLASS).toContain("text-[length:var(--text-base)]");
    expect(SOCIAL_FEED_ASIDE_SUBHEAD_CLASS).toContain("font-semibold");
    expect(hasClass(SOCIAL_FEED_ASIDE_ROWS_CLASS, "mt-3")).toBe(true);
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toContain("min-h-14");
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toContain("gap-3");
    expect(SOCIAL_FEED_ASIDE_ROW_CLASS).toContain("rounded-[var(--radius-xl)] px-3");
    expect(SOCIAL_FEED_ASIDE_AVATAR_CLASS).toBe("size-10");
    // Follow: the small secondary — a grey 36 pill, 15 / 600 ink, pad 16.
    expect(SOCIAL_FOLLOW_QUIET_CLASS).toContain("h-9");
    expect(SOCIAL_FOLLOW_QUIET_CLASS).toContain("rounded-full bg-surface-muted px-4");
    expect(SOCIAL_FOLLOW_QUIET_CLASS).toContain("text-[length:var(--text-sm)] font-semibold text-ink");
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
