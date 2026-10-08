import { readdirSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SocialHomeSkeleton } from "@/components/social/social-skeletons";
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
  SOCIAL_DESKTOP_FRAME_PAD_CLASS,
  SOCIAL_DESKTOP_HEADER_INSET_CLASS,
  SOCIAL_EMPTY_ACTION_CLASS,
  SOCIAL_EMPTY_ACTION_SECONDARY_CLASS,
  SOCIAL_EMPTY_PANEL_CLASS,
  SOCIAL_FEED_ASIDE_CLASS,
  SOCIAL_FEED_ASIDE_HEADING_CLASS,
  SOCIAL_FEED_ASIDE_ROWS_CLASS,
  SOCIAL_FEED_ASIDE_SECTION_CLASS,
  SOCIAL_FEED_ASIDE_SUBHEAD_CLASS,
  SOCIAL_FEED_CARD_CLASS,
  SOCIAL_FEED_CARD_SURFACE_CLASS,
  SOCIAL_FEED_CAROUSEL_BLEED_CLASS,
  SOCIAL_FEED_CENTER_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_LAYOUT_CLASS,
  SOCIAL_FEED_LEAD_CLASS,
  SOCIAL_FEED_MEASURE,
  SOCIAL_FEED_PAIR_WIDTH,
  SOCIAL_FEED_REELS_ARROW_CLASS,
  SOCIAL_FEED_REELS_ARROW_OFF_CLASS,
  SOCIAL_FEED_REELS_CLASS,
  SOCIAL_FEED_REELS_HEAD_CLASS,
  SOCIAL_FEED_REELS_TRACK_CLASS,
  SOCIAL_FEED_WALL_CLASS,
  SOCIAL_FOLLOW_QUIET_CLASS,
  SOCIAL_FOR_YOU_LANE_CARD_CLASS,
  SOCIAL_HOME_LAYOUT_CLASS,
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
  SOCIAL_POST_PAGE_LAYOUT_CLASS,
  SOCIAL_POST_PAGE_LEAD_CLASS,
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
const tokens = readFileSync("src/app/tokens.css", "utf8");
const homeLoading = readFileSync("src/app/(app)/social/loading.tsx", "utf8");

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

// Feed placement (Adam, 2026-10-07): the request, verbatim.
const PLACEMENT_QUOTE =
  "Measure and make sure our feed is in the identical placement with the identical width as the Facebook feed.";

// §8 Header height (Adam, 2026-10-07, open choice 5): the decision, then its
// phone extension, verbatim.
const HEADER_QUOTE = "Header height locked: 56 (match Facebook), shell-wide.";
const PHONE_HEADER_QUOTE = "Phone header → 56 same as desktop.";

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

// A token's px value from tokens.css (the :root value, desktop).
function tokenPx(name: string): number {
  const match = tokens.match(new RegExp(`--${name}:\\s*(\\d+)px;`));
  if (!match) throw new Error(`--${name} has no px value in tokens.css`);
  return Number(match[1]);
}

// The lead class's two rules: a left margin under the feed container's
// max-width query and one under its min-width query, each an arbitrary CSS
// length. (Not spelled as class names here: Tailwind scans this file.)
function leadRules(cls: string): Array<{ kind: "min" | "max"; at: number; expr: string }> {
  return cls.split(/\s+/).map((name) => {
    const match = /^md:@(min|max)-\[(\d+)px\]\/feed:ml-\[(.+)\]$/.exec(name);
    if (!match) throw new Error(`not a lead rule: ${name}`);
    return { kind: match[1] as "min" | "max", at: Number(match[2]), expr: match[3]! };
  });
}

// Evaluates a Tailwind arbitrary CSS length (max / min / calc over px, %,
// plain numbers, var(--token), + - * /) as the browser does: % is the
// container's width.
function cssLength(expr: string, pct: number, vars: Record<string, number>): number {
  const src = expr.replace(/_/g, " ");
  let at = 0;
  const skip = () => {
    while (src[at] === " ") at += 1;
  };
  const sees = (token: string) => {
    skip();
    return src.startsWith(token, at);
  };
  const take = (token: string) => {
    if (!sees(token)) throw new Error(`expected ${token} at ${at} in ${src}`);
    at += token.length;
  };
  const value = (): number => {
    skip();
    for (const fn of ["max", "min", "calc"] as const) {
      if (src.startsWith(`${fn}(`, at)) {
        at += fn.length + 1;
        const args = [sum()];
        while (sees(",")) {
          take(",");
          args.push(sum());
        }
        take(")");
        return fn === "max" ? Math.max(...args) : fn === "min" ? Math.min(...args) : args[0]!;
      }
    }
    if (src.startsWith("var(--", at)) {
      const end = src.indexOf(")", at);
      const name = src.slice(at + 6, end);
      if (!(name in vars)) throw new Error(`unknown var --${name}`);
      at = end + 1;
      return vars[name]!;
    }
    if (sees("(")) {
      take("(");
      const inner = sum();
      take(")");
      return inner;
    }
    const match = /^(\d+(?:\.\d+)?)(px|%)?/.exec(src.slice(at));
    if (!match) throw new Error(`no length at ${at} in ${src}`);
    at += match[0].length;
    return match[2] === "%" ? (pct * Number(match[1])) / 100 : Number(match[1]);
  };
  const product = (): number => {
    let left = value();
    while (sees("*") || sees("/")) {
      const op = src[at];
      at += 1;
      const right = value();
      left = op === "*" ? left * right : left / right;
    }
    return left;
  };
  const sum = (): number => {
    let left = product();
    while (sees("+") || sees("-")) {
      const op = src[at];
      at += 1;
      const right = product();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  };
  const result = sum();
  skip();
  if (at !== src.length) throw new Error(`trailing input at ${at} in ${src}`);
  return result;
}

// The desktop Feed row as the browser lays it out: the frame's content box
// (after the side menu and the frame's lead pad, before the shell's trail
// gutter) is the feed container; the column (flex-1, capped) takes the
// lead's margin; the rail (fixed width, ml-auto) sits at the container's
// end when the container query shows it. Every number comes from the
// classes and tokens.css.
function shellVars(sideMenu: number) {
  return {
    "sidebar-width": sideMenu,
    "chrome-gutter": tokenPx("chrome-gutter"),
    "shell-gutter-inline-end": tokenPx("shell-gutter-inline-end"),
  };
}

function feedRow(viewport: number, sideMenu: number) {
  const vars = shellVars(sideMenu);
  const start = sideMenu + vars["chrome-gutter"];
  const container = viewport - start - vars["shell-gutter-inline-end"];
  const railAt = Number(/(?:^|\s)@min-\[(\d+)px\]\/feed:flex(?:\s|$)/.exec(SOCIAL_FEED_ASIDE_CLASS)?.[1]);
  const railWidth = Number(/(?:^|\s)w-\[(\d+)px\]/.exec(SOCIAL_FEED_ASIDE_CLASS)?.[1]);
  const gap = 4 * Number(/(?:^|\s)gap-(\d+)(?:\s|$)/.exec(SOCIAL_FEED_LAYOUT_CLASS)?.[1]);
  const cap = Number(/(?:^|\s)md:max-w-\[(\d+)px\]/.exec(SOCIAL_FEED_CENTER_CLASS)?.[1]);
  const rail = container >= railAt;
  const rule = leadRules(SOCIAL_FEED_LEAD_CLASS).find((r) => (r.kind === "min" ? container >= r.at : container < r.at));
  if (!rule) throw new Error(`no lead rule for a ${container} container`);
  const lead = cssLength(rule.expr, container, vars);
  const width = Math.min(cap, container - lead - (rail ? gap + railWidth : 0));
  const x = start + lead;
  return {
    start,
    x,
    right: x + width,
    width,
    rail: rail ? ([start + container - railWidth, start + container] as const) : null,
  };
}

// The permalink's lead: one desktop left margin, an arbitrary CSS length,
// with no container query (it has no rail).
function postLeadExpr(): string {
  const match = /^md:ml-\[(.+)\]$/.exec(SOCIAL_POST_PAGE_LEAD_CLASS);
  if (!match) throw new Error(`not a lead rule: ${SOCIAL_POST_PAGE_LEAD_CLASS}`);
  return match[1]!;
}

// The permalink column as the browser lays it out: the same frame as the
// Feed's, its row the full frame (the % is the row's width), the column
// capped and led by its own margin.
function postColumn(viewport: number, sideMenu: number) {
  const vars = shellVars(sideMenu);
  const start = sideMenu + vars["chrome-gutter"];
  const frame = viewport - start - vars["shell-gutter-inline-end"];
  const cap = Number(/(?:^|\s)md:max-w-\[(\d+)px\]/.exec(SOCIAL_POST_PAGE_CLASS)?.[1]);
  const lead = cssLength(postLeadExpr(), frame, vars);
  const width = Math.min(cap, frame - lead);
  const x = start + lead;
  return { start, x, right: x + width, width };
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
    expect([...superseded].sort()).toEqual([
      "shell-coinbase-register-lock-v1.md",
      "shell-screening-chrome-lock-v1.md",
      "social-feed-register-lock-v1.md",
    ]);
    // The cards (2026-10-06) reverse the two register locks. §8 Header height
    // (2026-10-07) adds the screening lock's phone bar; its head marker is
    // checked with §8 Header height below.
    for (const file of superseded.filter((name) => name !== "shell-screening-chrome-lock-v1.md")) {
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
    // No top margin: it leads the Feed (no slider, founder 2026-10-08).
    expect(SOCIAL_HOME_STORIES_CARD_CLASS).toBe(`overflow-hidden py-2 ${SOCIAL_FEED_CARD_CLASS}`);
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
    // The permalink's thread goes in the card, the page in the Feed's
    // column (680 at the Feed's placement: §8 pins the column's classes).
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
    // Social's one ink fill was the Feed's Following / For you thumb; the
    // slider is gone (founder 2026-10-08), so no ink thumb is left. The
    // header's thumb and its pending paint stay the wash.
    expect(page).not.toContain("SocialHomeLaneTabs");
    expect(WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS).not.toMatch(/\bbg-ink\b/);
    expect(WORKSPACE_SWITCHER_SEGMENT_CLASS).not.toMatch(/\bbg-ink\b/);
    // The rail's type steps down a weight.
    expect(SOCIAL_FEED_ASIDE_SUBHEAD_CLASS).toBe(
      "m-0 text-[length:var(--text-base)] leading-6 [font-weight:var(--type-title-weight)] text-ink",
    );
    expect(SOCIAL_FEED_ASIDE_ROWS_CLASS).toBe("-mx-3 mt-2 flex flex-col");
    expect(SOCIAL_PERSON_PRIMARY_CLASS).toBe(
      "block min-w-0 max-w-full whitespace-normal break-words t-body-sm font-medium text-ink",
    );
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

  // §8 Feed placement (founder 2026-10-07): the Facebook column.
  it("§8: records the placement request verbatim, the Facebook and the measured numbers", () => {
    expect(lock).toContain("## Founder direction (verbatim, 2026-10-07)");
    expect(lock).toContain(`> ${PLACEMENT_QUOTE}`);
    expect(lock).toContain("## 8) Feed placement");
    // Facebook's column and ours, before and after, at 1440.
    expect(lock).toContain("x **380 to 1060**, width **680**");
    expect(lock).toContain("x 464 to 1064, width 600");
    // The header height was open choice 5; it is decided (the next test).
    expect(lock).toContain("5. **Header height.**");
    // Every rule that named the 600 column names 680 (§8 keeps "before").
    const post = lock.slice(lock.indexOf("## 7) Post page"), lock.indexOf("## 8) Feed placement"));
    expect(post).toContain("Feed's **680** column, centred as the Feed's");
    const line = (start: string) => lock.split("\n").find((row) => row.startsWith(start)) ?? "";
    expect(line("3. **Post page width.**")).toContain("680 column, centred as the Feed's");
    expect(line("- **Cards (C1, C8).**")).toContain("at 1280 / 1440, 680 wide");
    expect(line("- **Post page (C3).**")).toContain("680 wide on desktop, centred as the Feed's column");
    // The permalink has no rail: centred where the Feed shifts for its rail.
    expect(line("| Post page |")).toContain("does not apply");
    expect(lock).toContain("1366, **343 to 1023** (the Feed 310 to 990)");
    for (const start of ["3. **Post page width.**", "- **Cards (C1, C8).**", "- **Post page (C3).**"]) {
      expect(line(start), start).not.toMatch(/\b600\b/);
    }
    expect(post).not.toMatch(/\b600\b/);
    expect(lock).toContain("**C11.** Feed placement (§8)");
  });

  // §8 Header height (founder 2026-10-07): the shell's header is 56 on
  // desktop and phone. The token's value is pinned in src/app/tokens.test.ts;
  // what hangs off it in src/lib/shell-header-height.test.ts.
  it("§8 Header height: records the decision and its phone extension verbatim, closes open choice 5, and marks the shell locks, the index and the status line", () => {
    const direction = lock.slice(lock.indexOf("## Founder direction (verbatim, 2026-10-07)"), lock.indexOf("## 1) Canvas"));
    expect(direction).toContain(`\n> ${HEADER_QUOTE}\n\nThen, on phone:\n\n> ${PHONE_HEADER_QUOTE}\n`);
    const decisions = lock.slice(lock.indexOf("## Founder decisions (2026-10-07)"), lock.indexOf("## Open founder choices"));
    expect(decisions).toContain(`\n> ${HEADER_QUOTE}\n\nThen, on phone:\n\n> ${PHONE_HEADER_QUOTE}\n`);
    expect(decisions).toContain("The header is 56 in every workspace, desktop and phone");
    expect(lock).toContain("## Open founder choices (1–5 decided 2026-10-07)");
    const choice = lock.split("\n").find((row) => row.startsWith("5. **Header height.**")) ?? "";
    expect(choice).toContain("**Decided: 56, shell-wide**");
    expect(choice).toContain(HEADER_QUOTE);
    expect(choice).toContain(`Then the phone bar too: **56, the same as desktop** ("${PHONE_HEADER_QUOTE}"; it was 60)`);
    // §8: the rule on desktop and phone (one value, no phone override), and
    // the Feed then 72 from the top at 1440, where Facebook's first card is.
    const section = lock.slice(lock.indexOf("**Header height** (founder 2026-10-07"), lock.indexOf("## Tokens"));
    expect(section).toContain(HEADER_QUOTE);
    expect(section).toContain(PHONE_HEADER_QUOTE);
    expect(section).toContain("`--header-height` 80 → **56**");
    expect(section).toContain("the phone block no longer overrides it (its 60 is gone)");
    expect(section).toContain("| Phone | **56**, the same as desktop (was **60**");
    expect(section).not.toContain("stays **60**");
    expect(section).toContain("Everything under the bar moves up **4**");
    expect(section).toContain("**72** from the top");
    expect(lock).toContain("**C12.** Header height (§8)");
    expect(lock).toContain("7. §8 Header height at 768, 1024, 1280, 1440 and 1920");
    expect(lock).toContain("phone 390 and 360, every workspace: the bar 56, every target ≥ 44");
    // The shell register lock: a head marker and each row that said 80.
    const register = readFileSync("docs/design-locks/shell-coinbase-register-lock-v1.md", "utf8");
    const head = register.split("\n").slice(0, 8).join("\n");
    expect(head).toContain("**Superseded in part (founder 2026-10-07, cards lock §8 Header height):**");
    expect(head).toContain(HEADER_QUOTE);
    expect(head).toContain(PHONE_HEADER_QUOTE);
    expect(head).toContain("on desktop and phone, not 80 / 60");
    expect(head).not.toContain("The phone bar stays 60");
    const lines = register.split("\n");
    const desktopHeight = lines.find((line) => line.startsWith("| Height | ") && line.includes("the page canvas"));
    expect(desktopHeight).toMatch(/superseded by the cards lock §8: 56/i);
    // The phone bar's row and G5: 56, the same as desktop.
    const phoneHeight = lines.find((line) => line.startsWith("| Height | ") && line.includes("Pads **16** lead / **12** trail"));
    expect(phoneHeight).toMatch(/superseded by the cards lock §8: 56, the same as desktop/i);
    for (const start of ["| Top band | ", "**G1.**", "**G4.**", "**G5.**"]) {
      const row = lines.find((line) => line.startsWith(start)) ?? "";
      expect(row, start).toMatch(/superseded by the cards lock §8: 56/i);
    }
    // The superseded shell locks that still said "the header is 80".
    for (const file of ["shell-screening-chrome-lock-v1.md", "shell-unified-chrome-lock-v1.md"]) {
      const doc = readFileSync(`docs/design-locks/${file}`, "utf8");
      expect(doc, file).toContain("*(56 since 2026-10-07: [`social-feed-cards-lock-v1.md`](social-feed-cards-lock-v1.md) §8)*");
    }
    // The screening lock's phone bar (60, still in force until now): a head marker.
    const screening = readFileSync("docs/design-locks/shell-screening-chrome-lock-v1.md", "utf8");
    const screeningHead = screening.split("\n").find((line) => line.startsWith("**Superseded in part 2026-10-07**")) ?? "";
    expect(screeningHead).toContain(PHONE_HEADER_QUOTE);
    expect(screeningHead).toContain("§3 — the phone bar is **56**, not 60");
    const home = readFileSync("src/lib/HOME-width-lock.md", "utf8");
    expect(home).toContain("the header is 56, not 80");
    expect(home).toContain("on phone 56, not 60");
    // The index: both rows; the status line in the shell section, no date.
    const row = (file: string) => readme.split("\n").find((line) => line.startsWith(`- [\`${file}\`]`)) ?? "";
    expect(row("shell-coinbase-register-lock-v1.md")).toContain("§8: the header 56 on desktop and phone, not 80 / 60");
    expect(row("social-feed-cards-lock-v1.md")).toContain(HEADER_QUOTE);
    expect(row("social-feed-cards-lock-v1.md")).toContain(PHONE_HEADER_QUOTE);
    expect(row("social-feed-cards-lock-v1.md")).not.toContain("Open:");
    expect(row("social-feed-cards-lock-v1.md")).not.toContain("phone 60");
    const shellAt = current.indexOf("## Shared shell chrome");
    const shell = current.slice(shellAt, current.indexOf("---", shellAt));
    const status = shell.split("\n").filter((line) => line.startsWith("Header height"));
    expect(status).toHaveLength(1);
    expect(status[0]).toContain("the header is 56 in every workspace on desktop and phone");
    expect(status[0]).not.toContain("60");
    expect(status[0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("§8: the Feed column is 680 and the rail 296 with a 48 gap; the classes are exact", () => {
    expect(SOCIAL_FEED_MEASURE).toEqual({ center: 680, gutter: 48, right: 296 });
    expect(SOCIAL_FEED_PAIR_WIDTH).toBe(1024);
    expect(SOCIAL_FEED_LAYOUT_CLASS).toBe("@container/feed flex w-full items-start gap-12 md:pt-2");
    expect(SOCIAL_FEED_LEAD_CLASS).toBe(
      "md:@max-[1024px]/feed:ml-[max(0px,calc((100%-680px-var(--sidebar-width)-var(--chrome-gutter)+var(--shell-gutter-inline-end))/2))] md:@min-[1024px]/feed:ml-[max(0px,min(calc((100%-680px-var(--sidebar-width)-var(--chrome-gutter)+var(--shell-gutter-inline-end))/2),calc(100%-1024px)))]",
    );
    expect(SOCIAL_FEED_CENTER_CLASS).toBe(`flex min-w-0 w-full flex-1 flex-col md:max-w-[680px] ${SOCIAL_FEED_LEAD_CLASS}`);
    expect(SOCIAL_FEED_ASIDE_CLASS).toBe("hidden w-[296px] shrink-0 flex-col ml-auto @min-[1024px]/feed:flex");
    expect(SOCIAL_POST_PAGE_LAYOUT_CLASS).toBe("flex w-full items-start");
    expect(SOCIAL_POST_PAGE_LEAD_CLASS).toBe(
      "md:ml-[max(0px,calc((100%-680px-var(--sidebar-width)-var(--chrome-gutter)+var(--shell-gutter-inline-end))/2))]",
    );
    expect(SOCIAL_POST_PAGE_CLASS).toBe(
      `flex w-full min-w-0 flex-col gap-[var(--space-4)] pb-[var(--space-12)] md:max-w-[680px] ${SOCIAL_POST_PAGE_LEAD_CLASS}`,
    );
    // The classes carry the measure: the cap, the rail, the gap, the fit.
    expect(hasClass(SOCIAL_FEED_CENTER_CLASS, `md:max-w-[${SOCIAL_FEED_MEASURE.center}px]`)).toBe(true);
    expect(hasClass(SOCIAL_FEED_ASIDE_CLASS, `w-[${SOCIAL_FEED_MEASURE.right}px]`)).toBe(true);
    expect(hasClass(SOCIAL_FEED_LAYOUT_CLASS, `gap-${SOCIAL_FEED_MEASURE.gutter / 4}`)).toBe(true);
    expect(hasClass(SOCIAL_FEED_ASIDE_CLASS, `@min-[${SOCIAL_FEED_PAIR_WIDTH}px]/feed:flex`)).toBe(true);
    for (const rule of leadRules(SOCIAL_FEED_LEAD_CLASS)) {
      expect(rule.at).toBe(SOCIAL_FEED_PAIR_WIDTH);
      expect(rule.expr).toContain(`100%-${SOCIAL_FEED_MEASURE.center}px`);
    }
    // Phone is unchanged: every placement rule is md and up, the frame stays
    // full width with its 16.
    expect(SOCIAL_FEED_LEAD_CLASS.split(/\s+/).every((cls) => cls.startsWith("md:"))).toBe(true);
    expect(SOCIAL_FEED_LAYOUT_CLASS).not.toMatch(/(?:^|\s)(?:max-md:|p[xlr]?-|m[xlr]?-|max-w-)/);
    // Explore, Profile and Messages keep the 1052 Social row.
    expect(SOCIAL_HOME_LAYOUT_CLASS).not.toContain("@container/feed");
  });

  it("§8: the column is centred on the viewport with the side menu open or collapsed, and the rail fits beside it or hides", () => {
    const open = tokenPx("sidebar-width");
    const collapsed = tokenPx("sidebar-width-collapsed");
    expect([open, collapsed]).toEqual([240, 80]);
    const row = (vw: number, menu: number) => {
      const r = feedRow(vw, menu);
      return [r.x, r.right, r.rail ? [...r.rail] : null];
    };
    // Facebook at 1440: 380 to 1060, centred (720). Ours, side menu open.
    expect(row(1440, open)).toEqual([380, 1060, [1112, 1408]]);
    expect(row(1920, open)).toEqual([620, 1300, [1592, 1888]]);
    expect(row(1680, open)).toEqual([500, 1180, [1352, 1648]]);
    expect(row(1512, open)).toEqual([416, 1096, [1184, 1480]]);
    // The rail fits, the centred column would leave under 48: 680 kept,
    // moved left just enough.
    expect(row(1366, open)).toEqual([310, 990, [1038, 1334]]);
    expect(row(1312, open)).toEqual([256, 936, [984, 1280]]);
    // The rail does not fit: hidden, the column centred.
    expect(row(1280, open)).toEqual([300, 980, null]);
    // Cannot centre without going under the side menu: it starts at the frame.
    expect(row(1024, open)).toEqual([256, 936, null]);
    // A frame narrower than 680: the column fills it.
    expect(row(768, open)).toEqual([256, 736, null]);
    // Side menu collapsed (80).
    expect(row(1440, collapsed)).toEqual([380, 1060, [1112, 1408]]);
    expect(row(1920, collapsed)).toEqual([620, 1300, [1592, 1888]]);
    expect(row(1280, collapsed)).toEqual([224, 904, [952, 1248]]);
    expect(row(1152, collapsed)).toEqual([96, 776, [824, 1120]]);
    // Every width, both menus: never under the side menu; 680 when the
    // frame has room; the rail on the shell gutter with at least 48; centred
    // whenever the side menu and the rail allow it.
    const end = tokenPx("shell-gutter-inline-end");
    for (const menu of [open, collapsed]) {
      for (let vw = 768; vw <= 2560; vw += 1) {
        const r = feedRow(vw, menu);
        const centredX = (vw - SOCIAL_FEED_MEASURE.center) / 2;
        expect(r.x, `${vw}/${menu}`).toBeGreaterThanOrEqual(r.start);
        expect(r.width, `${vw}/${menu}`).toBe(Math.min(SOCIAL_FEED_MEASURE.center, vw - r.start - end));
        if (r.rail) {
          expect(r.rail[1], `${vw}/${menu}`).toBe(vw - end);
          expect(r.rail[0] - r.right, `${vw}/${menu}`).toBeGreaterThanOrEqual(SOCIAL_FEED_MEASURE.gutter);
          // Off centre only to keep the 48: then the gap is exactly 48.
          if (r.x !== centredX) expect(r.rail[0] - r.right, `${vw}/${menu}`).toBe(SOCIAL_FEED_MEASURE.gutter);
        } else if (r.x !== centredX) {
          // Not centred only where centring would go under the side menu.
          expect(r.x, `${vw}/${menu}`).toBe(r.start);
          expect(centredX, `${vw}/${menu}`).toBeLessThan(r.start);
        }
        // From 1432 the rail fits beside the centred column at any menu.
        if (vw >= 1432) expect(r.x, `${vw}/${menu}`).toBe(centredX);
      }
    }
  });

  it("§8: the permalink column is 680, centred as the Feed's, and never shifts for a rail it does not have", () => {
    const open = tokenPx("sidebar-width");
    const collapsed = tokenPx("sidebar-width-collapsed");
    // The Feed's own centring term, clamped at 0: the rule the Feed column
    // follows whenever no rail is drawn beside it.
    const feedCentring = leadRules(SOCIAL_FEED_LEAD_CLASS).find((rule) => rule.kind === "max");
    expect(postLeadExpr()).toBe(feedCentring?.expr);
    expect(SOCIAL_POST_PAGE_LEAD_CLASS).not.toContain("/feed:");
    const col = (vw: number, menu: number) => {
      const c = postColumn(vw, menu);
      return [c.x, c.right];
    };
    // Where the Feed is centred (or held at the frame), the permalink sits
    // on it: Facebook's 380 to 1060 at 1440.
    expect(col(1920, open)).toEqual([620, 1300]);
    expect(col(1440, open)).toEqual([380, 1060]);
    expect(col(1280, open)).toEqual([300, 980]);
    expect(col(1024, open)).toEqual([256, 936]);
    expect(col(768, open)).toEqual([256, 736]);
    expect(col(1440, collapsed)).toEqual([380, 1060]);
    // Where the Feed moves left for its rail, the permalink (no rail) stays
    // centred: the Feed is 310 to 990 at 1366, 256 to 936 at 1312, and
    // 224 to 904 / 96 to 776 collapsed at 1280 / 1152.
    expect(col(1366, open)).toEqual([343, 1023]);
    expect(col(1312, open)).toEqual([316, 996]);
    expect(col(1280, collapsed)).toEqual([300, 980]);
    expect(col(1152, collapsed)).toEqual([236, 916]);
    // Every width, both menus: never under the side menu; 680 when the
    // frame has room; centred unless centring would go under the side menu;
    // on the Feed's column except where the Feed keeps 48 to its rail.
    const end = tokenPx("shell-gutter-inline-end");
    for (const menu of [open, collapsed]) {
      for (let vw = 768; vw <= 2560; vw += 1) {
        const c = postColumn(vw, menu);
        const f = feedRow(vw, menu);
        const centredX = (vw - SOCIAL_FEED_MEASURE.center) / 2;
        expect(c.x, `${vw}/${menu}`).toBeGreaterThanOrEqual(c.start);
        expect(c.width, `${vw}/${menu}`).toBe(Math.min(SOCIAL_FEED_MEASURE.center, vw - c.start - end));
        expect(c.x, `${vw}/${menu}`).toBe(Math.max(c.start, centredX));
        expect(c.width, `${vw}/${menu}`).toBe(f.width);
        if (f.rail && f.x !== centredX) {
          expect(f.rail[0] - f.right, `${vw}/${menu}`).toBe(SOCIAL_FEED_MEASURE.gutter);
          expect(c.x, `${vw}/${menu}`).toBeGreaterThan(f.x);
        } else {
          expect(c.x, `${vw}/${menu}`).toBe(f.x);
        }
      }
    }
  });

  it("§8: the stories card and the rail's heading start 16 under the header", () => {
    // The shared header inset (8) plus the Feed row's own md:pt-2 (8).
    const rem = Number(/--space-2:\s*([\d.]+)rem/.exec(tokens)?.[1]) * 16;
    expect(SOCIAL_DESKTOP_HEADER_INSET_CLASS).toBe("md:pt-[var(--space-2)]");
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).toContain(SOCIAL_DESKTOP_HEADER_INSET_CLASS);
    const rowPad = 4 * Number(/(?:^|\s)md:pt-(\d+)(?:\s|$)/.exec(SOCIAL_FEED_LAYOUT_CLASS)?.[1]);
    expect(rem + rowPad).toBe(16);
    // Nothing above them pushes them down: the stories card leads the
    // column (no slider, founder 2026-10-08) and the heading leads the
    // rail, neither with a top margin.
    const topMargin = /(?:^|\s)-?m[ty]?-(?!0(?:\s|$))/;
    expect(SOCIAL_HOME_STORIES_CARD_CLASS).not.toMatch(topMargin);
    expect(SOCIAL_FEED_ASIDE_HEADING_CLASS).not.toMatch(topMargin);
    expect(SOCIAL_FEED_CENTER_CLASS).not.toMatch(/(?:^|\s)(?:md:)?(?:p[ty]?|m[ty]?)-/);
  });

  it("§8 / C9: the page and the loading skeleton draw the same placement; the permalink its centred column", () => {
    // The live Feed and its skeleton compose the same three classes.
    expect(page).toContain('<div data-social-home="" className={SOCIAL_FEED_LAYOUT_CLASS}>');
    expect(page).toContain("className={SOCIAL_FEED_CENTER_CLASS}");
    expect(homeLoading).toContain("<SocialHomeSkeleton />");
    const skeleton = renderToStaticMarkup(createElement(SocialHomeSkeleton));
    expect(skeleton.startsWith(`<div data-social-home-skeleton="" class="${SOCIAL_FEED_LAYOUT_CLASS}">`)).toBe(true);
    expect(skeleton).toContain(`class="${SOCIAL_FEED_CENTER_CLASS}"`);
    expect(skeleton).toContain(`data-social-for-you-layout="aside" class="${SOCIAL_FEED_ASIDE_CLASS}"`);
    // The permalink (no rail): its column inside its full-width row, at the
    // Feed's 680 with the Feed's centring and not the Feed's rail shift, in
    // both of its states.
    expect(permalink.match(/<div data-social-post-layout="" className=\{SOCIAL_POST_PAGE_LAYOUT_CLASS\}>/g)).toHaveLength(2);
    for (const hook of ["data-social-post-missing", "data-social-post-detail"]) {
      const at = permalink.indexOf(`<div ${hook}="" className={SOCIAL_POST_PAGE_CLASS}>`);
      expect(at, hook).toBeGreaterThan(-1);
      expect(permalink.lastIndexOf("data-social-post-layout", at), hook).toBeGreaterThan(-1);
    }
    expect(SOCIAL_POST_PAGE_CLASS).toContain(SOCIAL_POST_PAGE_LEAD_CLASS);
    expect(SOCIAL_POST_PAGE_CLASS).not.toContain(SOCIAL_FEED_LEAD_CLASS);
    expect(hasClass(SOCIAL_POST_PAGE_CLASS, `md:max-w-[${SOCIAL_FEED_MEASURE.center}px]`)).toBe(true);
  });
});
