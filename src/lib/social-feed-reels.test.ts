import { beforeEach, describe, expect, it } from "vitest";

import type { SocialEdgeMediaItem } from "@/lib/social-edge";
import {
  rememberSocialFeedReelReturn,
  resetSocialFeedReelReturnForTests,
  SOCIAL_FEED_REEL_CAPTION_MAX,
  SOCIAL_FEED_REEL_EVERY,
  SOCIAL_FEED_REEL_MIN,
  SOCIAL_FEED_REEL_RAIL_SIZE,
  SOCIAL_FEED_REEL_STEP_PX,
  SOCIAL_FEED_REEL_TILE,
  socialFeedReelCaption,
  socialFeedReelHref,
  socialFeedReelLabel,
  socialFeedReelOpenedExplore,
  socialFeedReelPlan,
  socialFeedReelTiles,
  socialFeedReelVertical,
  socialRowFocusShift,
  socialRowScrollEdges,
  takeSocialFeedReelScroll,
} from "@/lib/social-feed-reels";

const posts = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}` }));
const reels = (n: number, prefix = "r") =>
  Array.from({ length: n }, (_, i) => ({ postId: `${prefix}${i + 1}` }));

function shape(slots: ReturnType<typeof socialFeedReelPlan<{ id: string }, { postId: string }>>) {
  return slots.map((slot) =>
    slot.kind === "post" ? slot.post.id : `[${slot.rail}:${slot.tiles.map((t) => t.postId).join(",")}]`,
  );
}

describe("feed Reels plan (Adam 2026-10-04: every 3 posts, both tabs)", () => {
  it("locks the cadence, rail size, minimum, and the desktop step", () => {
    expect(SOCIAL_FEED_REEL_EVERY).toBe(3);
    expect(SOCIAL_FEED_REEL_RAIL_SIZE).toBe(6);
    expect(SOCIAL_FEED_REEL_MIN).toBe(2);
    expect(SOCIAL_FEED_REEL_TILE.desktop).toEqual({ width: 180, height: 320, gap: 12 });
    expect(SOCIAL_FEED_REEL_TILE.phone).toEqual({ width: 160, height: 284, gap: 8 });
    // Arrows move two tiles: 2 × (180 + 12).
    expect(SOCIAL_FEED_REEL_STEP_PX).toBe(384);
    // 3 tiles + 2 gaps + a gap + a 44 peek = the 620 feed column.
    const { width, gap } = SOCIAL_FEED_REEL_TILE.desktop;
    expect(3 * width + 3 * gap + 44).toBe(620);
  });

  it("puts a rail after every third post and continues without repeats", () => {
    const plan = socialFeedReelPlan(posts(9), reels(14));
    expect(shape(plan)).toEqual([
      "p1",
      "p2",
      "p3",
      "[0:r1,r2,r3,r4,r5,r6]",
      "p4",
      "p5",
      "p6",
      "[1:r7,r8,r9,r10,r11,r12]",
      "p7",
      "p8",
      "p9",
      "[2:r13,r14]",
    ]);
  });

  it("keeps the rail after the third post even when the wall ends there", () => {
    expect(shape(socialFeedReelPlan(posts(3), reels(2)))).toEqual(["p1", "p2", "p3", "[0:r1,r2]"]);
    expect(shape(socialFeedReelPlan(posts(2), reels(6)))).toEqual(["p1", "p2"]);
  });

  it("skips the rail (and every later rail) with fewer than two reels left", () => {
    expect(shape(socialFeedReelPlan(posts(6), reels(1)))).toEqual(["p1", "p2", "p3", "p4", "p5", "p6"]);
    expect(shape(socialFeedReelPlan(posts(9), reels(7)))).toEqual([
      "p1",
      "p2",
      "p3",
      "[0:r1,r2,r3,r4,r5,r6]",
      "p4",
      "p5",
      "p6",
      "p7",
      "p8",
      "p9",
    ]);
    expect(shape(socialFeedReelPlan(posts(4), []))).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("drops a reel that is already a wall post and a repeated reel id", () => {
    const wall = [{ id: "p1" }, { id: "r2" }, { id: "p3" }];
    const plan = socialFeedReelPlan(wall, [
      { postId: "r1" },
      { postId: "r2" },
      { postId: "r1" },
      { postId: "r3" },
    ]);
    expect(shape(plan)).toEqual(["p1", "r2", "p3", "[0:r1,r3]"]);
  });

  it("returns the wall unchanged with no reels (group feeds)", () => {
    expect(socialFeedReelPlan(posts(5), []).every((slot) => slot.kind === "post")).toBe(true);
  });
});

const AUTHOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const video = (frame?: { width: number; height: number }): SocialEdgeMediaItem => ({
  kind: "video",
  url: "",
  contentType: "video/mp4",
  playbackId: "uNbxnGLKJ00yfbijDO8COxT",
  playbackPolicy: "signed",
  ...(frame ?? {}),
});

describe("feed Reels tiles", () => {
  it("keeps vertical frames and frameless videos, drops landscape and square", () => {
    expect(socialFeedReelVertical(video({ width: 1080, height: 1920 }))).toBe(true);
    expect(socialFeedReelVertical(video())).toBe(true);
    expect(socialFeedReelVertical(video({ width: 1920, height: 1080 }))).toBe(false);
    expect(socialFeedReelVertical(video({ width: 1080, height: 1080 }))).toBe(false);
    expect(socialFeedReelVertical(null)).toBe(false);
  });

  it("captions with the whole first line, never a cut one", () => {
    expect(socialFeedReelCaption("Blocking the rooftop\nsecond line")).toBe("Blocking the rooftop");
    expect(socialFeedReelCaption("  \n  Last   light, one take ")).toBe("Last light, one take");
    expect(socialFeedReelCaption("")).toBeNull();
    const fits = "x".repeat(SOCIAL_FEED_REEL_CAPTION_MAX);
    expect(socialFeedReelCaption(fits)).toBe(fits);
    // Too long to sit whole on a 160×284 tile: no caption, never an ellipsis.
    expect(socialFeedReelCaption(`${fits}y`)).toBeNull();
    expect(socialFeedReelCaption(`${fits}y`) ?? "").not.toContain("…");
  });

  it("names each tile for assistive tech and opens Explore at that reel", () => {
    expect(socialFeedReelLabel("Priya Nair", "Blocking the rooftop")).toBe(
      "Priya Nair, Blocking the rooftop. Opens in Explore",
    );
    expect(socialFeedReelLabel("Priya Nair", "")).toBe("Priya Nair. Opens in Explore");
    expect(socialFeedReelHref("11111111-1111-4111-8111-111111111111")).toBe(
      "/social/explore?v=11111111-1111-4111-8111-111111111111",
    );
  });

  it("maps For you hits in Explore order: Mux video only, vertical only, once each", () => {
    const tiles = socialFeedReelTiles({
      hits: [
        { id: "v1", authorId: AUTHOR, body: "Grey sea, long lens" },
        { id: "photo", authorId: AUTHOR, body: "a still" },
        { id: "wide", authorId: AUTHOR, body: "landscape" },
        { id: "v2", authorId: AUTHOR, body: "" },
        { id: "v1", authorId: AUTHOR, body: "again" },
      ],
      mediaByPost: new Map<string, SocialEdgeMediaItem[]>([
        ["v1", [video({ width: 1080, height: 1920 })]],
        ["photo", [{ kind: "image", url: "/x", contentType: "image/jpeg" }]],
        ["wide", [video({ width: 1920, height: 1080 })]],
        ["v2", [video()]],
      ]),
      authors: new Map([[AUTHOR, { handle: "sam", display_name: "Sam Okafor" }]]),
    });
    expect(tiles.map((tile) => tile.postId)).toEqual(["v1", "v2"]);
    expect(tiles[0]).toMatchObject({
      href: "/social/explore?v=v1",
      authorName: "Sam Okafor",
      authorPhotoUrl: `/api/social/avatar/${AUTHOR}`,
      caption: "Grey sea, long lens",
      label: "Sam Okafor, Grey sea, long lens. Opens in Explore",
      playbackPolicy: "signed",
    });
    expect(tiles[1]?.caption).toBeNull();
  });
});

describe("row scroll edges (topics fade, Reels arrows)", () => {
  it("reads start and end with 1px slack", () => {
    expect(socialRowScrollEdges({ scrollLeft: 0, clientWidth: 620, scrollWidth: 1140 })).toEqual({
      start: true,
      end: false,
    });
    expect(socialRowScrollEdges({ scrollLeft: 384, clientWidth: 620, scrollWidth: 1140 })).toEqual({
      start: false,
      end: false,
    });
    expect(socialRowScrollEdges({ scrollLeft: 519.5, clientWidth: 620, scrollWidth: 1140 })).toEqual({
      start: false,
      end: true,
    });
    // A row that fits is at both edges: no fade, both arrows off.
    expect(socialRowScrollEdges({ scrollLeft: 0, clientWidth: 620, scrollWidth: 400 })).toEqual({
      start: true,
      end: true,
    });
  });

  it("pins the start edge's 1px slack (Previous stays off on a sub-pixel rest)", () => {
    const row = { clientWidth: 620, scrollWidth: 1140 };
    // Zoom and smooth scroll can rest a fraction past 0: still the start.
    expect(socialRowScrollEdges({ ...row, scrollLeft: 0.5 }).start).toBe(true);
    expect(socialRowScrollEdges({ ...row, scrollLeft: 1 }).start).toBe(true);
    // Past 1px the row has moved on.
    expect(socialRowScrollEdges({ ...row, scrollLeft: 1.01 }).start).toBe(false);
    expect(socialRowScrollEdges({ ...row, scrollLeft: 2 }).start).toBe(false);
    // Rubber-band overscroll (negative scrollLeft) reads as the start.
    expect(socialRowScrollEdges({ ...row, scrollLeft: -6 }).start).toBe(true);
    // The end slack mirrors it: 1px short of the end is the end.
    expect(socialRowScrollEdges({ ...row, scrollLeft: 519 }).end).toBe(true);
    expect(socialRowScrollEdges({ ...row, scrollLeft: 518.99 }).end).toBe(false);
  });
});

// Chromium scrolls a focused word only when it sits outside the track, so a
// word whole inside the track but under the fade stays there. The row's
// keyboard handler scrolls it clear of the scroll padding (= fade width).
describe("row focus shift (topic word clear of the fade)", () => {
  const phone = { portStart: 0, portEnd: 390, padStart: 0, padEnd: 120 };
  const desk = { portStart: 0, portEnd: 636, padStart: 0, padEnd: 76 };

  it("moves a word under the fade to sit just left of it", () => {
    // Chromium 390: Post-production rests at 238–363, the fade starts at 270.
    expect(socialRowFocusShift({ ...phone, itemStart: 238, itemEnd: 363 })).toBe(93);
    // Partly past the track edge too: the same rule, nearest edge.
    expect(socialRowFocusShift({ ...phone, itemStart: 314, itemEnd: 386 })).toBe(116);
    // Desktop 1280: Content creator at 517–640, the 76 fade starts at 560.
    expect(socialRowFocusShift({ ...desk, itemStart: 517, itemEnd: 640 })).toBe(80);
  });

  it("leaves a word that already sits clear, flush or under 1px", () => {
    expect(socialRowFocusShift({ ...phone, itemStart: 99, itemEnd: 172 })).toBe(0);
    expect(socialRowFocusShift({ ...phone, itemStart: 170, itemEnd: 270 })).toBe(0);
    expect(socialRowFocusShift({ ...phone, itemStart: 170, itemEnd: 270.6 })).toBe(0);
    expect(socialRowFocusShift({ ...phone, itemStart: 170, itemEnd: 271 })).toBe(1);
  });

  it("brings a word cut by the start edge back in (Shift+Tab)", () => {
    expect(socialRowFocusShift({ ...phone, itemStart: -30, itemEnd: 40 })).toBe(-30);
    expect(socialRowFocusShift({ ...phone, padStart: 16, itemStart: 4, itemEnd: 60 })).toBe(-12);
  });

  it("keeps the start of a word wider than the clear area in view", () => {
    // 300 wide, clear area 0–270: start-align, never push its start out.
    expect(socialRowFocusShift({ ...phone, itemStart: 50, itemEnd: 350 })).toBe(50);
    expect(socialRowFocusShift({ ...phone, itemStart: -20, itemEnd: 400 })).toBe(-20);
  });
});

describe("Reels return note (Exit returns to the same spot)", () => {
  beforeEach(() => resetSocialFeedReelReturnForTests());

  it("tells Exit which Explore address a tile opened", () => {
    expect(socialFeedReelOpenedExplore("/social/explore?v=a")).toBe(false);
    rememberSocialFeedReelReturn({ explore: "/social/explore?v=a", rail: 1, left: 384 });
    expect(socialFeedReelOpenedExplore("/social/explore?v=a")).toBe(true);
    expect(socialFeedReelOpenedExplore("/social/explore?v=b")).toBe(false);
    expect(socialFeedReelOpenedExplore("/social/explore")).toBe(false);
  });

  it("gives the sideways spot back to the same rail once", () => {
    rememberSocialFeedReelReturn({ explore: "/social/explore?v=a", rail: 1, left: 384 });
    expect(takeSocialFeedReelScroll(0)).toBeNull();
    expect(takeSocialFeedReelScroll(1)).toBe(384);
    expect(takeSocialFeedReelScroll(1)).toBeNull();
    rememberSocialFeedReelReturn({ explore: "/social/explore?v=a", rail: 0, left: -5 });
    expect(takeSocialFeedReelScroll(0)).toBe(0);
  });
});
