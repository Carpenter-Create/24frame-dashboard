import { readdirSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SocialStoriesRail } from "@/components/social/social-stories-rail";
import {
  COURSE_FEATURE_CARD_CLASS,
  COURSE_FEATURE_TITLE_CLASS,
} from "./courses";
import {
  HOUSE_DEST_RAIL_ROW_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS,
  HOUSE_PILL_SLIDER_THUMB_BASE_CLASS,
  HOUSE_PILL_SLIDER_THUMB_CLASS,
} from "./house-shell";
import { HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS } from "./house-lead-chrome";
import {
  SOCIAL_ACTIVITY_COMMENTED_LABEL_CLASS,
  SOCIAL_CARD_FILL_CLASS,
  SOCIAL_COMMENT_COMPOSER_IN_CARD_CLASS,
  SOCIAL_COMMENT_NEED_PROFILE_CLASS,
  SOCIAL_COMMENT_NEED_PROFILE_IN_CARD_CLASS,
  SOCIAL_COMMENT_ROW_AVATAR_CLASS,
  SOCIAL_COMMENT_ROW_BODY_CLASS,
  SOCIAL_COMMENT_ROW_NAME_CLASS,
  SOCIAL_COMMENT_ROW_TIME_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_EMPTY_ACTION_CLASS,
  SOCIAL_EMPTY_ACTION_SECONDARY_CLASS,
  SOCIAL_EMPTY_PANEL_CLASS,
  SOCIAL_FEED_ASIDE_ROWS_CLASS,
  SOCIAL_FEED_ASIDE_SECTION_CLASS,
  SOCIAL_FEED_ASIDE_SUBHEAD_CLASS,
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_CARD_SURFACE_CLASS,
  SOCIAL_FEED_CAROUSEL_BLEED_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_REELS_ARROW_CLASS,
  SOCIAL_FEED_REELS_ARROW_OFF_CLASS,
  SOCIAL_FEED_REELS_CLASS,
  SOCIAL_FEED_REELS_HEAD_CLASS,
  SOCIAL_FEED_REELS_TRACK_CLASS,
  SOCIAL_FEED_SCOPE_THUMB_CLASS,
  SOCIAL_FEED_WALL_CLASS,
  SOCIAL_FOLLOW_QUIET_CLASS,
  SOCIAL_FOR_YOU_LANE_CARD_CLASS,
  SOCIAL_HOME_STORIES_CARD_CLASS,
  SOCIAL_HOME_STORIES_RAIL_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_HOME_STORY_CREATE_LABEL_CLASS,
  SOCIAL_HOME_STORY_MEDIA_CLASS,
  SOCIAL_HOME_STORY_PLUS_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS,
  SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS,
  SOCIAL_HOME_TOPIC_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_FADE_PX,
  SOCIAL_HOME_TOPIC_ROW_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
  SOCIAL_IN_CARD_EDGE_CLASS,
  SOCIAL_IN_CARD_FILL_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_PERSON_PRIMARY_CLASS,
  SOCIAL_POST_ACTIONS_CLASS,
  SOCIAL_POST_AUTHOR_CLASS,
  SOCIAL_POST_AVATAR_EMPTY_CLASS,
  SOCIAL_POST_BYLINE_CLASS,
  SOCIAL_POST_COMMENTS_CLASS,
  SOCIAL_POST_COUNT_CLASS,
  SOCIAL_POST_GROUP_CLASS,
  SOCIAL_POST_HEAD_CLASS,
  SOCIAL_POST_MEDIA_CLASS,
  SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS,
  SOCIAL_POST_META_CLASS,
  SOCIAL_POST_META_DOT_CLASS,
  SOCIAL_POST_MORE_CLASS,
  SOCIAL_POST_NAME_CLASS,
  SOCIAL_POST_PAGE_CLASS,
  SOCIAL_POST_PLAY_DISC_CLASS,
  SOCIAL_POST_PLAY_DISC_GLYPH,
  SOCIAL_POST_ROUND_CLASS,
  SOCIAL_POST_ROUND_IN_GROUP_CLASS,
  SOCIAL_POST_SCREEN_CLASS,
  SOCIAL_POST_TIME_CLASS,
  SOCIAL_POST_WORDS_CLASS,
} from "./social-chrome";
import {
  WORKSPACE_SWITCHER_SEGMENT_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS,
  WORKSPACE_SWITCHER_SEGMENT_ON_CLASS,
  WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS,
} from "./workspace-switcher";

const lock = readFileSync("docs/design-locks/social-feed-cards-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const page = readFileSync("src/app/(app)/social/page.tsx", "utf8");
const composer = readFileSync("src/components/social/social-home-composer.tsx", "utf8");
const topics = readFileSync("src/components/social/social-home-topics.tsx", "utf8");
const icon = readFileSync("src/components/social/social-icon.tsx", "utf8");
const card = readFileSync("src/components/social/social-post-card.tsx", "utf8");
const permalink = readFileSync("src/app/(app)/social/p/[postId]/page.tsx", "utf8");
const skeletons = readFileSync("src/components/social/social-skeletons.tsx", "utf8");

function hasClass(classes: string, cls: string): boolean {
  return classes.split(/\s+/).includes(cls);
}

// Founder words (Adam, 2026-10-06): a short verbatim anchor per quote (its
// first clause), under the verbatim heading.
const QUOTES = [
  "But social still looks bad",
  "for example(s): 1) feels like thick ink everywhere, 2) text posts are randomly floating",
  "what I mean is....the text only posts in the feed are not in a distinguished section/surface.",
  "notice how every single facebook post type is clearly in its own surface?",
  "Stories have to stay at the top of the feed",
  "Which looks like the highest quality expensive tech owned Social media platform?",
  "A fresh, media-oriented, immersive social media experience for the film community.",
  "we must remain in this register.",
  "I want the Coinbase register",
] as const;

// The locks this one reverses in part, read from its Supersedes section.
function supersededLocks(doc: string): string[] {
  const start = doc.indexOf("**Supersedes (in part):**");
  const section = doc.slice(start, doc.indexOf("\n**Keeps:**", start));
  return [...new Set([...section.matchAll(/\]\(([a-z0-9.-]+-lock-v[0-9.]+\.md)\)/g)].map((m) => m[1]!))];
}

// The Social sources a card fill could be re-typed in (not tests).
function socialSources(): Array<[string, string]> {
  const dirs = ["src/components/social", "src/components/courses"];
  const files = ["src/lib/social-chrome.ts", "src/lib/courses.ts"];
  for (const dir of dirs) {
    for (const name of readdirSync(dir)) {
      if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) files.push(`${dir}/${name}`);
    }
  }
  return files.map((file) => [file, readFileSync(file, "utf8")]);
}

// docs/design-locks/social-feed-cards-lock-v1.md
describe("Feed cards lock v1 (founder 2026-10-06, Direction B)", () => {
  it("records the founder words and the pick verbatim, the gates and the open choices; indexed once", () => {
    expect(lock).toContain("## Founder direction (verbatim, 2026-10-06)");
    for (const quote of QUOTES) {
      expect(lock, quote).toContain(quote);
    }
    expect(lock).toContain("\n> B.\n");
    for (let gate = 1; gate <= 10; gate += 1) {
      expect(lock, `C${gate}`).toContain(`**C${gate}.**`);
    }
    expect(lock).toContain("## Open founder choices");
    for (const choice of ["**Card grey strength.**", "**4:5 crop.**", "**Post page width.**", "**Media unavailable line.**"]) {
      expect(lock).toContain(choice);
    }
    // The skeleton draws the member's state; the no-profile state it cannot
    // match is stated, with why the fallback cannot know it.
    expect(lock).toContain("The Feed skeleton draws **the member's state**");
    expect(lock).toContain("The one state it cannot match is **no profile**");
    expect(readme).toContain("- [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md) — Feed cards");
    const lines = current.split("\n").filter((row) => row.includes("social-feed-cards-lock-v1.md"));
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("marks the register and shell locks it reverses, in their head and their index row", () => {
    const superseded = supersededLocks(lock);
    expect([...superseded].sort()).toEqual(["shell-coinbase-register-lock-v1.md", "social-feed-register-lock-v1.md"]);
    for (const file of superseded) {
      const doc = readFileSync(`docs/design-locks/${file}`, "utf8");
      const head = doc.split("\n").slice(0, 8).join("\n");
      expect(head, file).toContain("**Superseded in part (founder 2026-10-06, cards lock):**");
      expect(head, file).toContain("[`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md)");
      const row = readme.split("\n").find((line) => line.startsWith(`- [\`${file}\`]`)) ?? "";
      expect(row, file).toContain("Superseded in part by the Feed cards lock");
    }
    // The register lock's reversed post face is marked where it is drawn.
    const register = readFileSync("docs/design-locks/social-feed-register-lock-v1.md", "utf8");
    expect(register).toContain("> **Superseded (founder 2026-10-06, cards lock):** \"the media is the card\"");
    for (const gate of ["G9", "G10", "G11", "G13", "G14"]) {
      const line = register.split("\n").find((row) => row.startsWith(`**${gate}.**`)) ?? "";
      expect(line, gate).toContain("Superseded by the cards lock");
    }
  });

  it("C1: one card fill and one in-card fill, each defined once; the card is radius 24 with no edge or shadow", () => {
    expect(SOCIAL_CARD_FILL_CLASS).toBe("bg-surface-muted dark:bg-surface");
    expect(SOCIAL_IN_CARD_FILL_CLASS).toBe("bg-surface dark:bg-surface-muted");
    expect(SOCIAL_IN_CARD_EDGE_CLASS).toBe("border-surface dark:border-surface-muted");
    expect(SOCIAL_FEED_CARD_SURFACE_CLASS).toBe(
      `rounded-[var(--radius-xl)] ${SOCIAL_CARD_FILL_CLASS} ${SOCIAL_MOBILE_BLEED_CLASS} max-md:rounded-none`,
    );
    expect(SOCIAL_FEED_CARD_CLASS).toBe(`flex min-w-0 shrink-0 flex-col ${SOCIAL_FEED_CARD_SURFACE_CLASS}`);
    for (const cls of [SOCIAL_FEED_CARD_SURFACE_CLASS, SOCIAL_FEED_CARD_CLASS]) {
      expect(cls).not.toMatch(/(?:^|\s)(?:border|ring|shadow)(?:-|\s|$)/);
    }
    // One place: no Social source re-types either fill (a later tweak of
    // the card grey is the one constant above).
    for (const [file, src] of socialSources()) {
      const cardFills = src.match(/dark:bg-surface(?![-\w])/g)?.length ?? 0;
      const inCardFills = src.match(/dark:bg-surface-muted/g)?.length ?? 0;
      if (file === "src/lib/social-chrome.ts") {
        expect(cardFills, file).toBe(1);
        expect(inCardFills, file).toBe(1);
      } else {
        expect(cardFills, file).toBe(0);
        expect(inCardFills, file).toBe(0);
      }
    }
    // The modules compose the card (or its face).
    expect(SOCIAL_EMPTY_PANEL_CLASS).toBe(
      `flex flex-col items-center justify-center gap-[var(--space-4)] px-[var(--space-6)] py-[var(--space-12)] text-center ${SOCIAL_FEED_CARD_SURFACE_CLASS}`,
    );
    expect(SOCIAL_FOR_YOU_LANE_CARD_CLASS).toBe(`${SOCIAL_FEED_CARD_CLASS} gap-2 p-4`);
    expect(SOCIAL_FEED_ASIDE_SECTION_CLASS).toBe(
      `mt-4 flex flex-col rounded-[var(--radius-xl)] ${SOCIAL_CARD_FILL_CLASS} p-4 pb-2`,
    );
    expect(COURSE_FEATURE_CARD_CLASS).toBe(
      `flex flex-col gap-4 rounded-[var(--radius-xl)] ${SOCIAL_CARD_FILL_CLASS} p-4`,
    );
    // Phone: 8 of white between cards; desktop 16.
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col gap-2 md:gap-4");
    expect(SOCIAL_FEED_WALL_CLASS).toBe("mt-2 flex min-w-0 flex-col gap-2 md:mt-4 md:gap-4");
  });

  it("C1: every control inside a card takes the in-card fill", () => {
    expect(SOCIAL_COMPOSER_AFFORDANCE_CLASS).toBe(
      `inline-flex size-11 shrink-0 items-center justify-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors hover:bg-hairline`,
    );
    expect(SOCIAL_COMPOSER_FIELD_CLASS).toBe(
      `flex h-11 min-w-0 flex-1 items-center rounded-full border-0 ${SOCIAL_IN_CARD_FILL_CLASS} px-4 text-[length:var(--text-base)] text-ink-2 outline-none transition-colors group-hover:bg-hairline`,
    );
    expect(SOCIAL_FOLLOW_QUIET_CLASS).toBe(
      `inline-flex h-9 shrink-0 items-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} px-4 text-[length:var(--text-sm)] font-medium text-ink transition-colors hover:bg-hairline`,
    );
    expect(SOCIAL_EMPTY_ACTION_CLASS).toBe(
      "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-center text-[length:var(--text-sm)] font-medium leading-5 bg-accent text-accent-contrast",
    );
    expect(SOCIAL_EMPTY_ACTION_SECONDARY_CLASS).toBe(
      `inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-center text-[length:var(--text-sm)] font-medium leading-5 ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors hover:bg-hairline`,
    );
    expect(SOCIAL_FEED_REELS_ARROW_CLASS).toBe(
      `grid size-11 place-items-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors hover:bg-hairline`,
    );
    expect(SOCIAL_FEED_REELS_ARROW_OFF_CLASS).toBe(
      `grid size-11 place-items-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink cursor-default opacity-40`,
    );
    expect(SOCIAL_POST_ROUND_CLASS).toBe(
      `inline-flex size-11 shrink-0 items-center justify-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors md:size-10 hover:bg-hairline active:opacity-70`,
    );
    expect(SOCIAL_POST_ROUND_IN_GROUP_CLASS).toBe(
      `inline-flex size-11 shrink-0 items-center justify-center rounded-full ${SOCIAL_IN_CARD_FILL_CLASS} text-ink transition-colors md:size-10 group-hover:bg-hairline`,
    );
    expect(SOCIAL_POST_AVATAR_EMPTY_CLASS).toBe(SOCIAL_IN_CARD_FILL_CLASS);
    expect(SOCIAL_COMMENT_COMPOSER_IN_CARD_CLASS).toBe(
      `mt-3 flex items-end gap-2 rounded-[var(--radius-lg)] px-3 py-2 ${SOCIAL_IN_CARD_FILL_CLASS}`,
    );
  });

  it("C2: stories stay at the top — the first module, in their own card, in both lanes, also with Create story alone", () => {
    expect(SOCIAL_HOME_STORIES_CARD_CLASS).toBe(`mt-4 overflow-hidden py-2 ${SOCIAL_FEED_CARD_CLASS}`);
    expect(SOCIAL_HOME_STORIES_RAIL_CLASS).toBe(
      "no-scrollbar -my-[5px] flex gap-2 overflow-x-auto overscroll-x-contain px-2 py-[5px] scroll-px-2",
    );
    expect(SOCIAL_HOME_STORY_CARD_CLASS).toBe(
      `relative block h-[192px] w-[108px] shrink-0 overflow-hidden rounded-[var(--radius-lg)] ${SOCIAL_IN_CARD_FILL_CLASS} md:h-[200px] md:w-[112px]`,
    );
    expect(SOCIAL_HOME_STORY_MEDIA_CLASS).toBe(`absolute inset-0 ${SOCIAL_IN_CARD_FILL_CLASS}`);
    expect(SOCIAL_HOME_STORY_PLUS_CLASS).toBe(
      `absolute left-1/2 top-[99px] z-10 grid size-[42px] -translate-x-1/2 place-items-center rounded-full border-[3px] ${SOCIAL_IN_CARD_EDGE_CLASS} bg-accent text-accent-contrast md:top-[97px] md:size-[46px]`,
    );
    expect(SOCIAL_HOME_STORY_CREATE_LABEL_CLASS).toBe(
      "absolute inset-x-0 bottom-3 px-2 text-center text-[length:var(--text-xs)] font-medium leading-[18px] text-ink break-words",
    );
    // The page draws the rail unconditionally, first in the cold slot, in
    // both lanes (the lane only switches the wall below the topics).
    const slot = page.slice(page.indexOf("<SocialHomeColdSlot"), page.indexOf("</SocialHomeColdSlot>"));
    const firstElement = slot.slice(slot.indexOf(">") + 1).replace(/\{\/\*[\s\S]*?\*\/\}/g, "").trimStart();
    expect(firstElement.startsWith("<SocialStoriesRail")).toBe(true);
    expect(slot.indexOf("<SocialStoriesRail")).toBeLessThan(slot.indexOf("lane === \"for-you\""));
    expect(page).not.toMatch(/storyRailShown|socialHomeStoryRailShown|storyCreate/);
    // No story control in the composer.
    expect(composer).not.toMatch(/data-social-story-create|storiesNew|storyCreate/);
    // Rendered: the member's Create story alone still draws the card.
    const alone = renderToStaticMarkup(
      createElement(SocialStoriesRail, { cards: [], authors: new Map(), faces: new Map(), canCreate: true }),
    );
    expect(alone).toContain(`data-social-stories-card="" class="${SOCIAL_HOME_STORIES_CARD_CLASS}"`);
    expect(alone.match(/data-social-story-create/g)).toHaveLength(1);
    // Nothing to draw (no profile, no story): no empty card.
    const none = renderToStaticMarkup(
      createElement(SocialStoriesRail, { cards: [], authors: new Map(), faces: new Map(), canCreate: false }),
    );
    expect(none).toBe("");
  });

  it("C3: the post anatomy — header on top, the words, the media inset 8 at radius 16, the actions at the bottom", () => {
    expect(SOCIAL_POST_HEAD_CLASS).toBe("flex min-w-0 items-center gap-3 px-4 pt-3 md:pt-4");
    expect(SOCIAL_POST_AUTHOR_CLASS).toBe(
      "flex shrink-0 items-center justify-center rounded-full max-md:-m-0.5 max-md:size-11",
    );
    expect(SOCIAL_POST_BYLINE_CLASS).toBe(
      "flex min-w-0 flex-1 flex-wrap items-center gap-x-2 md:flex-col md:items-start md:gap-0",
    );
    expect(SOCIAL_POST_NAME_CLASS).toBe(
      "inline-flex min-h-11 min-w-0 items-center break-words text-[length:var(--text-sm)] font-semibold leading-5 text-ink md:min-h-0",
    );
    expect(SOCIAL_POST_META_CLASS).toBe(
      "flex min-w-0 flex-wrap items-center text-[length:var(--text-xs)] leading-[18px] [font-weight:var(--type-body-weight)] tabular-nums text-ink-2",
    );
    expect(SOCIAL_POST_TIME_CLASS).toBe(
      "inline-flex min-h-11 min-w-11 items-center justify-center md:min-h-0 md:min-w-0 md:justify-start",
    );
    expect(SOCIAL_POST_META_DOT_CLASS).toBe("px-1 max-md:-ml-2.5");
    expect(SOCIAL_POST_GROUP_CLASS).toBe("inline-flex min-h-11 min-w-0 items-center break-words md:min-h-0");
    expect(SOCIAL_POST_WORDS_CLASS).toBe(
      "whitespace-pre-wrap break-words px-4 pt-3 text-[length:var(--text-sm)] leading-[1.45] [font-weight:var(--type-body-weight)] text-body md:text-[length:var(--text-base)] md:leading-normal",
    );
    expect(SOCIAL_POST_MEDIA_CLASS).toBe(
      "relative mx-2 mt-3 block overflow-hidden rounded-[var(--radius-lg)] max-md:mx-0 max-md:rounded-none",
    );
    expect(SOCIAL_FEED_CAROUSEL_BLEED_CLASS).toBe(`${SOCIAL_POST_MEDIA_CLASS} bg-surface-muted`);
    expect(SOCIAL_POST_ACTIONS_CLASS).toBe("flex items-center gap-2 px-4 pt-1 pb-2 md:pt-2 md:pb-3");
    expect(SOCIAL_POST_COMMENTS_CLASS).toBe("border-t border-hairline px-4 pt-3 pb-4");
    expect(SOCIAL_POST_COUNT_CLASS).toBe(
      "inline-flex h-11 min-w-11 items-center justify-center px-1 text-[length:var(--text-sm)] [font-weight:var(--type-body-weight)] tabular-nums text-ink-2 md:h-10 md:min-w-10",
    );
    expect(SOCIAL_POST_MORE_CLASS).toBe(
      "-mr-3 inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-hairline md:-mr-2.5 md:size-10",
    );
    // Concentric: the media's 16 plus its 8 inset is the card's 24.
    const radius = (name: string) => Number(readFileSync("src/app/tokens.css", "utf8").match(new RegExp(`--${name}:\\s*(\\d+)px`))?.[1]);
    expect(hasClass(SOCIAL_POST_MEDIA_CLASS, "mx-2")).toBe(true);
    expect(radius("radius-lg") + 8).toBe(radius("radius-xl"));
    // The comment rows and the post page.
    expect(SOCIAL_COMMENT_ROW_AVATAR_CLASS).toBe("size-8");
    expect(SOCIAL_COMMENT_ROW_NAME_CLASS).toBe(
      "block break-words text-[length:var(--text-xs)] font-semibold leading-[18px] text-ink",
    );
    expect(SOCIAL_COMMENT_ROW_BODY_CLASS).toBe(
      "block whitespace-pre-wrap break-words text-[length:var(--text-sm)] leading-[1.45] [font-weight:var(--type-body-weight)] text-body",
    );
    expect(SOCIAL_COMMENT_ROW_TIME_CLASS).toBe("t-label text-ink-2");
    expect(SOCIAL_COMMENT_NEED_PROFILE_CLASS).toBe("px-4 py-3 t-body-sm text-ink-2");
    expect(SOCIAL_COMMENT_NEED_PROFILE_IN_CARD_CLASS).toBe("pt-3 t-body-sm text-ink-2");
    expect(SOCIAL_ACTIVITY_COMMENTED_LABEL_CLASS).toBe("t-label text-ink-2");
    expect(SOCIAL_POST_PAGE_CLASS).toBe(
      "flex w-full min-w-0 flex-col gap-[var(--space-4)] pb-[var(--space-12)] md:max-w-[600px]",
    );
    // The permalink's thread goes in the card, the page in the 600 column.
    expect(permalink).toContain("className={SOCIAL_POST_PAGE_CLASS}");
    expect(permalink.indexOf("comments={")).toBeGreaterThan(permalink.indexOf("<SocialPostCard"));
    expect(permalink.indexOf("<SocialCommentThread")).toBeLessThan(permalink.lastIndexOf("/>"));
    // The card itself never clips (a like error shows under the heart).
    expect(SOCIAL_FEED_CARD_CLASS).not.toContain("overflow-hidden");
    expect(card).toContain("className={SOCIAL_FEED_CARD_CLASS}");
  });

  it("C4: a video has no screen and no band; the play disc and the player's centre control use tokens", () => {
    expect(SOCIAL_POST_SCREEN_CLASS).toBe("relative bg-surface-muted");
    expect(SOCIAL_POST_PLAY_DISC_CLASS).toBe(
      "pointer-events-none absolute left-1/2 top-1/2 z-[3] grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-band/72 text-band-ink group-has-[mux-player]/video:hidden md:size-14",
    );
    expect(SOCIAL_POST_PLAY_DISC_GLYPH).toBe(24);
    // The mounted player's centre button: the band at 72%, 48 / 56. The
    // old rule read var(--ink), which no token defines.
    const disc = globals.slice(globals.indexOf(".social-feed-play-disc mux-player::part(center play button)"));
    expect(disc).toMatch(/--media-control-background:\s*color-mix\(in srgb, var\(--band\) 72%, transparent\) !important;/);
    expect(disc.slice(0, 600)).toContain("width: 48px !important;");
    expect(disc.slice(0, 900)).toContain("width: 56px !important;");
    expect(globals.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("var(--ink)");
    expect(chrome).not.toContain("SOCIAL_POST_SCREEN_HEAD_CLASS");
  });

  it("C6: a topic chip under the fade hides; the chips on the canvas are ink-2 idle and 500 current", () => {
    expect(SOCIAL_HOME_TOPIC_CLASS).toBe(
      "inline-flex h-11 shrink-0 items-center whitespace-nowrap rounded-full md:h-10 text-ink-2",
    );
    expect(SOCIAL_HOME_TOPIC_CHIP_CURRENT_CLASS).toBe(
      "inline-flex h-9 items-center rounded-full px-3.5 text-[length:var(--text-sm)] leading-none md:h-10 md:px-4 bg-accent-wash font-medium",
    );
    expect(SOCIAL_HOME_TOPIC_ROW_CLASS).toBe(
      "relative mt-4 min-w-0 max-md:-mx-[var(--chrome-gutter)] max-md:w-[calc(100%+2*var(--chrome-gutter))]",
    );
    expect(SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS).toBe("pointer-events-none opacity-0");
    expect(SOCIAL_HOME_TOPIC_FADE_PX).toBe(96);
    // The fade's width and the track's end scroll padding are the same 96.
    expect(hasClass(SOCIAL_HOME_TOPIC_FADE_CLASS, `w-${SOCIAL_HOME_TOPIC_FADE_PX / 4}`)).toBe(true);
    expect(hasClass(SOCIAL_HOME_TOPIC_TRACK_CLASS, `scroll-pe-${SOCIAL_HOME_TOPIC_FADE_PX / 4}`)).toBe(true);
    // The row applies the lib rule with the fade's width and hides (not
    // removes) a cut chip, so Tab still reaches it.
    expect(topics).toContain("socialRowItemUnderFade({");
    expect(topics).toContain("fade: SOCIAL_HOME_TOPIC_FADE_PX");
    expect(topics).toContain("hidden.has(label) && SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS");
    expect(SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS).not.toMatch(/(?:^|\s)(?:hidden|invisible|sr-only)(?:\s|$)/);
  });

  it("C7: lighter ink — the header thumb is the wash, one ink thumb per screen, 15 / 500 labels, Regular glyphs", () => {
    expect(HOUSE_PILL_SLIDER_THUMB_BASE_CLASS).toBe(
      "pointer-events-none absolute inset-y-0 rounded-full transition-[left,width] duration-[220ms] ease-out motion-reduce:transition-none",
    );
    expect(HOUSE_PILL_SLIDER_THUMB_CLASS).toBe(`${HOUSE_PILL_SLIDER_THUMB_BASE_CLASS} bg-ink`);
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).toBe(`${HOUSE_PILL_SLIDER_THUMB_BASE_CLASS} bg-accent-wash`);
    expect(HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS).toBe(
      `relative z-10 inline-flex h-11 shrink-0 cursor-pointer select-none items-center whitespace-nowrap rounded-full text-[length:var(--text-sm)] font-medium ${HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS}`,
    );
    expect(HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS).toBe("text-ink-2");
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).toBe(
      "relative z-10 inline-flex h-[var(--header-control-size)] shrink-0 cursor-pointer select-none items-center whitespace-nowrap rounded-full px-[var(--space-4)] text-[length:var(--text-sm)] font-medium in-data-segmented-pending:data-segmented-selected:bg-accent-wash",
    );
    expect(WORKSPACE_SWITCHER_SEGMENT_ON_CLASS).toBe("text-accent-ink");
    expect(WORKSPACE_SWITCHER_SEGMENT_OFF_CLASS).toBe(HOUSE_PILL_SLIDER_SEGMENT_OFF_CLASS);
    expect(HOUSE_DEST_RAIL_ROW_CLASS).toBe(
      "relative flex min-h-14 w-full items-center gap-[var(--space-4)] rounded-full px-[var(--space-4)] text-left text-[length:var(--text-sm)] font-medium transition-colors",
    );
    expect(HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS).toBe(
      "h-full min-w-0 flex-1 text-[length:var(--text-sm)] text-ink placeholder:text-ink-2",
    );
    // One ink fill on Social: the Feed's Following / For you thumb; the
    // header's thumb and its pending paint are the wash.
    expect(SOCIAL_FEED_SCOPE_THUMB_CLASS).toBe(HOUSE_PILL_SLIDER_THUMB_CLASS);
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).not.toMatch(/\bbg-ink\b/);
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toMatch(/\bbg-ink\b/);
    // The rail's type steps down a weight.
    expect(SOCIAL_FEED_ASIDE_SUBHEAD_CLASS).toBe(
      "m-0 text-[length:var(--text-base)] leading-6 [font-weight:var(--type-title-weight)] text-ink",
    );
    expect(SOCIAL_FEED_ASIDE_ROWS_CLASS).toBe("-mx-3 mt-2 flex flex-col");
    expect(SOCIAL_PERSON_PRIMARY_CLASS).toBe("block break-words t-body-sm font-medium text-ink");
    expect(COURSE_FEATURE_TITLE_CLASS).toBe("text-[length:var(--text-sm)] leading-5 font-semibold text-ink");
    // SocialIcon draws Regular unless a host opts into Bold.
    expect(icon).toContain('weight = "regular"');
    expect(icon).toContain('weight={active ? "fill" : weight}');
  });

  it("C1 / C5: the composer and the Reels row are cards; the card filters media that cannot draw", () => {
    expect(SOCIAL_COMPOSER_CLASS).toBe(
      `mt-2 flex min-w-0 shrink-0 items-center gap-1 px-4 py-3 md:mt-4 md:gap-2 ${SOCIAL_FEED_CARD_SURFACE_CLASS}`,
    );
    expect(SOCIAL_FEED_REELS_CLASS).toBe(`overflow-hidden pt-3 pb-4 ${SOCIAL_FEED_CARD_CLASS}`);
    expect(SOCIAL_FEED_REELS_HEAD_CLASS).toBe("flex h-11 items-center justify-between px-4");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toBe(
      "no-scrollbar m-0 mt-[7px] -mb-[5px] flex list-none gap-2 overflow-x-auto overscroll-x-contain px-4 py-[5px] scroll-pl-4 [touch-action:pan-x_pan-y] max-md:snap-x max-md:snap-mandatory md:mt-[11px]",
    );
    // The usable-media rule runs once, in the card, for every renderer.
    expect(card).toContain("const media = socialPostUsableMedia(post.media);");
    expect(card).toContain("socialPostKind(media)");
    expect(card).toContain("post={{ ...post, media }}");
    // A post whose media all dropped and that has no words keeps one quiet
    // line in the words' place: the words' box at 15 / 420, ink-2.
    expect(SOCIAL_POST_MEDIA_UNAVAILABLE_CLASS).toBe(
      "break-words px-4 pt-3 text-[length:var(--text-sm)] leading-[1.45] [font-weight:var(--type-body-weight)] text-ink-2",
    );
    expect(card).toContain("const mediaDropped = socialPostMediaAllDropped(post.media, media);");
  });

  it("C8 / C9 / C10: phone targets 44, nothing truncated, the skeletons draw the cards, tokens only", () => {
    // Phone hits: every in-card control and link reaches 44.
    for (const [name, cls, hit] of [
      ["round", SOCIAL_POST_ROUND_CLASS, "size-11"],
      ["time", SOCIAL_POST_TIME_CLASS, "min-h-11"],
      ["name", SOCIAL_POST_NAME_CLASS, "min-h-11"],
      ["group", SOCIAL_POST_GROUP_CLASS, "min-h-11"],
      ["owner ⋯", SOCIAL_POST_MORE_CLASS, "size-11"],
      ["face", SOCIAL_POST_AUTHOR_CLASS, "max-md:size-11"],
      ["count", SOCIAL_POST_COUNT_CLASS, "h-11"],
      ["empty action", SOCIAL_EMPTY_ACTION_CLASS, "min-h-11"],
      ["composer round", SOCIAL_COMPOSER_AFFORDANCE_CLASS, "size-11"],
      ["topic", SOCIAL_HOME_TOPIC_CLASS, "h-11"],
    ] as const) {
      expect(hasClass(cls, hit), name).toBe(true);
    }
    // The two cards blocks of social-chrome (the surfaces, the posts): no
    // truncation, no hex, no shadow.
    const block =
      chrome.slice(chrome.indexOf("// Cards (founder 2026-10-06"), chrome.indexOf("export const SOCIAL_FOR_YOU_RAIL_CLASS")) +
      chrome.slice(chrome.indexOf("// Cards · posts (founder 2026-10-06"), chrome.indexOf("export const SOCIAL_FIRST_WIN_CLASS"));
    const classes = [...block.matchAll(/"([^"]*)"|`([^`]*)`/g)].map((m) => m[1] ?? m[2]).join(" ");
    expect(classes.length).toBeGreaterThan(1000);
    expect(classes).not.toMatch(/\btruncate\b|line-clamp|text-ellipsis/);
    expect(classes).not.toMatch(/\bshadow-(?!none)/);
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // The Feed skeleton draws the stories card, the composer card and the wall of cards.
    const center = skeletons.slice(skeletons.indexOf("export function SocialHomeCenterSkeleton"));
    expect(center).toContain("SOCIAL_HOME_STORIES_CARD_CLASS");
    expect(center).toContain('data-social-home-composer-skeleton="" className={SOCIAL_COMPOSER_CLASS}');
    expect(skeletons).toContain('data-social-post-skeleton="" className={SOCIAL_FEED_CARD_CLASS}');
    expect(skeletons).toContain("SOCIAL_IN_CARD_FILL_CLASS");
  });
});
