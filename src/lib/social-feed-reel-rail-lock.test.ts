import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  SOCIAL_FEED_REEL_CAPTION_MAX,
  SOCIAL_FEED_REEL_EVERY,
  SOCIAL_FEED_REEL_MIN,
  SOCIAL_FEED_REEL_NEAR_ROOT_MARGIN,
  SOCIAL_FEED_REEL_RAIL_SIZE,
  SOCIAL_FEED_REEL_STEP_PX,
  SOCIAL_FEED_REEL_TILE,
} from "./social-feed-reels";
import {
  SOCIAL_FEED_REEL_CAPTION_CLASS,
  SOCIAL_FEED_REEL_NAME_CLASS,
  SOCIAL_FEED_REEL_SCRIM_CLASS,
  SOCIAL_FEED_REEL_TILE_CLASS,
  SOCIAL_FEED_REELS_ARROW_OFF_CLASS,
  SOCIAL_FEED_REELS_CLASS,
  SOCIAL_FEED_REELS_HEAD_CLASS,
  SOCIAL_FEED_REELS_TRACK_CLASS,
} from "./social-chrome";
import { SOCIAL } from "./social";
import { SOCIAL_FOLLOWING_WALL_CURSOR_PARAM } from "./social-home-bounds";

const lock = readFileSync("docs/design-locks/social-feed-reel-rail-lock-v1.md", "utf8");
const register = readFileSync("docs/design-locks/social-feed-register-lock-v1.md", "utf8");
const readme = readFileSync("docs/design-locks/README.md", "utf8");
const current = readFileSync("docs/status/CURRENT.md", "utf8");
const rail = readFileSync("src/components/social/social-feed-reel-rail.tsx", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

// How far the house keyboard focus ring reaches past an element's box:
// outline width + outline offset, read from the global rule.
function focusRingReach(): number {
  const rule = globals.match(/:focus-visible:not\(input\):not\(textarea\):not\(select\)\s*\{([^}]*)\}/)?.[1] ?? "";
  const width = Number(rule.match(/outline:\s*(\d+)px/)?.[1]);
  const offset = Number(rule.match(/outline-offset:\s*(\d+)px/)?.[1]);
  return width + offset;
}

function hasClass(classes: string, cls: string): boolean {
  return classes.split(/\s+/).includes(cls);
}

// Founder words, the question and the cadence answer (Adam, 2026-10-04):
// a short verbatim anchor each (the first clause), under the verbatim
// heading. The cadence itself is pinned in code below.
const QUOTES = [
  "I also like the idea of the main feed",
  'Question asked: "after every 3 posts',
  "**\"As drawn (Recommended)\"**",
  "option text: \"Every 3 posts, both tabs, labelled 'Reels'",
] as const;

// Previous is off at the start, Next is off at the end (aria-disabled, no-op).
const ARROW_GUARDS = [
  'aria-disabled={atStart ? "true" : undefined}',
  'aria-disabled={atEnd ? "true" : undefined}',
  "if (!atStart) page(-1);",
  "if (!atEnd) page(1);",
] as const;

// docs/design-locks/social-feed-reel-rail-lock-v1.md
describe("Feed Reels rail lock v1 (Adam 2026-10-04)", () => {
  it("records the founder words and the cadence answer verbatim", () => {
    expect(lock).toContain("## Founder words (verbatim, Adam, 2026-10-04)");
    for (const quote of QUOTES) {
      expect(lock).toContain(quote);
    }
    expect(readme).toContain("social-feed-reel-rail-lock-v1.md");
    expect(current).toContain("social-feed-reel-rail-lock-v1.md");
  });

  it("matches the lock's cadence, size, skip, and tile numbers in code", () => {
    expect(lock).toContain("One rail after every **3** posts");
    expect(SOCIAL_FEED_REEL_EVERY).toBe(3);
    expect(lock).toContain("6 tiles");
    expect(SOCIAL_FEED_REEL_RAIL_SIZE).toBe(6);
    expect(lock).toContain("Fewer than **2** reels left");
    expect(SOCIAL_FEED_REEL_MIN).toBe(2);
    expect(lock).toContain("Tiles **180×320** (9:16), gap 12");
    expect(lock).toContain("Tiles **160×284**");
    // Face amended 2026-10-05 (H · Feed, the Feed register lock): the
    // desktop gap is 8 (was 12) and the tiles take radius 16 (was 10), so
    // two tiles page 376 (was 384). Sizes stay.
    expect(lock).toContain("**Amended in part (founder 2026-10-05, H · Feed):**");
    expect(register).toContain("the radius-10 tiles, the desktop gap 12 and the 384 page");
    expect(SOCIAL_FEED_REEL_TILE.desktop).toEqual({ width: 180, height: 320, gap: 8 });
    expect(SOCIAL_FEED_REEL_TILE.phone).toEqual({ width: 160, height: 284, gap: 8 });
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("md:w-[180px]");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("md:h-80");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("w-40");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("h-[284px]");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).toContain("rounded-[var(--radius-lg)]");
    expect(SOCIAL_FEED_REEL_TILE_CLASS).not.toContain("rounded-[var(--radius)]");
    expect(lock).toContain("**two tiles (384px)**");
    expect(register).toContain("**376** (2 × (180 + 8))");
    expect(SOCIAL_FEED_REEL_STEP_PX).toBe(376);
    expect(lock).toContain("within 600px of the viewport");
    expect(SOCIAL_FEED_REEL_NEAR_ROOT_MARGIN).toBe("600px 0px 600px 0px");
    expect(lock).toContain("over 100 characters");
    expect(SOCIAL_FEED_REEL_CAPTION_MAX).toBe(100);
  });

  it("keeps phone full-bleed snap and desktop arrows as locked", () => {
    expect(SOCIAL_FEED_REELS_CLASS).toContain("max-md:-mx-[var(--chrome-gutter)]");
    // Label row: was phone 16 (the eyebrow line) and desktop 30 (arrows);
    // H · Feed: one 44 head row for the 20 / 480 heading and the 44 arrows.
    expect(lock).toContain("on a 16 label row");
    expect(SOCIAL_FEED_REELS_HEAD_CLASS).toMatch(/(^| )h-11( |$)/);
    expect(SOCIAL_FEED_REELS_HEAD_CLASS).not.toContain("md:h-[30px]");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toContain("max-md:snap-x");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toContain("max-md:snap-mandatory");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toContain("max-md:scroll-pl-4");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toContain("[touch-action:pan-x_pan-y]");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toContain("overscroll-x-contain");
    // Gap 8 on both (H · Feed; was md:gap-3).
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).toContain("gap-2");
    expect(SOCIAL_FEED_REELS_TRACK_CLASS).not.toContain("md:gap-3");
    expect(SOCIAL_FEED_REELS_ARROW_OFF_CLASS).toContain("opacity-40");
    for (const guard of ARROW_GUARDS) {
      expect(rail).toContain(guard);
    }
    expect(rail).toContain('behavior: "smooth"');
    expect(rail).toContain("SOCIAL_FEED_REEL_STEP_PX");
    expect(SOCIAL.reels).toEqual({
      title: "Reels",
      previous: "Previous reels",
      next: "Next reels",
      opensInExplore: "Opens in Explore",
    });
  });

  it("draws a focused tile's ring whole inside the track and keeps the rail's height", () => {
    // overflow-x:auto clips overflow-y too, and the track was exactly as
    // tall as a tile: the ring showed only its side bars.
    expect(lock).toContain("a tile's keyboard focus ring (2px, 3 offset) draws whole");
    const reach = focusRingReach();
    expect(reach).toBe(5);
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, `py-[${reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, `-mb-[${reach}px]`)).toBe(true);
    // Tiles start 12 under the head on phone and 16 on desktop (H · Feed;
    // was 12 on both): top margin + top pad.
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, `mt-[${12 - reach}px]`)).toBe(true);
    expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, `md:mt-[${16 - reach}px]`)).toBe(true);
    for (const cls of ["p-0", "mt-3", "py-0"]) {
      expect(hasClass(SOCIAL_FEED_REELS_TRACK_CLASS, cls)).toBe(false);
    }
    // The only breakpoint spacing is that desktop top margin.
    expect(
      SOCIAL_FEED_REELS_TRACK_CLASS.split(/\s+/).filter((cls) => /^(?:md|max-md):-?(?:p|py|pt|pb|my|mt|mb)-/.test(cls)),
    ).toEqual([`md:mt-[${16 - reach}px]`]);
  });

  // The brief never decided what an older wall page does with reels. The
  // lock must not record the shipped behaviour as a founder approval.
  it("keeps older wall pages an open founder question, not an approved row", () => {
    const openAt = lock.indexOf("## Open for the founder");
    expect(openAt).toBeGreaterThan(0);
    const placement = lock.slice(lock.indexOf("## Placement and source"), openAt);
    expect(placement).not.toMatch(/starts the reel list again/);
    expect(placement).toContain("Older wall pages: **open** (below)");
    const open = lock.slice(openAt, lock.indexOf("## Desktop", openAt));
    expect(open).toContain("Not decided by the brief, so not locked here.");
    expect(open).toContain(`/social?${SOCIAL_FOLLOWING_WALL_CURSOR_PARAM}=<cursor>`);
    // The wall's cursor is `after`; there is no `cursor` query.
    expect(lock).not.toContain("?cursor=");
  });

  it("never cuts a tile caption or name and carries no accent", () => {
    for (const cls of [SOCIAL_FEED_REEL_CAPTION_CLASS, SOCIAL_FEED_REEL_NAME_CLASS]) {
      expect(cls).toContain("break-words");
      expect(cls).not.toMatch(/truncate|line-clamp|text-ellipsis/);
    }
    for (const cls of [SOCIAL_FEED_REEL_TILE_CLASS, SOCIAL_FEED_REEL_SCRIM_CLASS, SOCIAL_FEED_REELS_TRACK_CLASS]) {
      expect(cls).not.toContain("accent");
    }
    expect(SOCIAL_FEED_REEL_SCRIM_CLASS).toContain("from-band/94");
    expect(SOCIAL_FEED_REEL_SCRIM_CLASS).toContain("via-band/78");
    expect(rail).not.toMatch(/truncate|line-clamp/);
    // Duration is not stored for Social posts: the lock keeps it out rather than inventing one.
    expect(lock).toContain("**Out for now.**");
    expect(rail).not.toMatch(/duration/i);
  });
});
