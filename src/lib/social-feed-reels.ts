import { socialAvatarHref, type SocialEdgeMediaItem } from "@/lib/social-edge";
import {
  exploreForYouHref,
  exploreForYouMuxVideo,
  type ExploreForYouAuthor,
} from "@/lib/social-explore-for-you";
import { socialMediaFrameFields } from "@/lib/social-media";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import { SOCIAL } from "@/lib/social";

// Feed Reels rail. Pure plan + tile model + the in-tab return memory.
// Founder pick 2026-10-04 (Adam): "the main feed showing a few posts (up
// and down page in feed) and then breaking it up with reels that you
// horizontally scroll through". Cadence answer: "As drawn (Recommended)"
// — every 3 posts, both tabs, labelled "Reels", tap opens Explore and Exit
// returns to the same spot.
// docs/design-locks/social-feed-reel-rail-lock-v1.md

/** One rail after every N posts in the post wall. */
export const SOCIAL_FEED_REEL_EVERY = 3;

/** Tiles per rail. Desktop shows 3 and a peek; the arrows page by 2. */
export const SOCIAL_FEED_REEL_RAIL_SIZE = 6;

/** Fewer vertical videos than this left for a rail: the rail is skipped. */
export const SOCIAL_FEED_REEL_MIN = 2;

/** Desktop arrows move the rail by this many tiles (2 × (180 + 8) = 376). */
export const SOCIAL_FEED_REEL_STEP_TILES = 2;

/** 9:16 tiles. Desktop 180×320, phone 160×284; gap 8 on both (H register;
 *  the G rail's desktop gap was 12). */
export const SOCIAL_FEED_REEL_TILE = {
  desktop: { width: 180, height: 320, gap: 8 },
  phone: { width: 160, height: 284, gap: 8 },
} as const;

export const SOCIAL_FEED_REEL_STEP_PX =
  SOCIAL_FEED_REEL_STEP_TILES *
  (SOCIAL_FEED_REEL_TILE.desktop.width + SOCIAL_FEED_REEL_TILE.desktop.gap);

/**
 * Thumbnails stay unrequested until the rail is this close to the
 * viewport (vertical). Stills only: the rail never mounts a player.
 */
export const SOCIAL_FEED_REEL_NEAR_ROOT_MARGIN = "600px 0px 600px 0px";

/**
 * The tile caption is the post's first line, whole. It wraps; it is never
 * cut with an ellipsis or clipped by the tile. A first line longer than
 * this does not fit a 160×284 tile whole (about 5 lines at 13px), so the
 * tile shows the name only and the line stays in the tile's accessible
 * name and in Explore.
 */
export const SOCIAL_FEED_REEL_CAPTION_MAX = 100;

export type SocialFeedReelTile = {
  postId: string;
  href: string;
  playbackId: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  authorId: string;
  authorName: string;
  authorPhotoUrl: string;
  /** Visible caption, or null when the first line cannot fit whole. */
  caption: string | null;
  /** Accessible name: name, first line, "Opens in Explore". */
  label: string;
};

export type SocialFeedReelHit = {
  id: string;
  authorId: string;
  body: string;
};

export type SocialFeedSlot<P, R> =
  | { kind: "post"; post: P }
  | { kind: "reels"; rail: number; tiles: R[] };

/**
 * Vertical = the recorded frame is taller than wide. A video with no
 * recorded frame stays in: Explore's For You is the vertical stream and
 * older posts carry no frame. Landscape and square frames are out.
 */
export function socialFeedReelVertical(video: SocialEdgeMediaItem | null): boolean {
  if (!video) return false;
  const frame = socialMediaFrameFields(video);
  if (!frame) return true;
  return frame.height > frame.width;
}

export function socialFeedReelFirstLine(body: string | null | undefined): string {
  const first = (body ?? "").split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
  return first.replace(/\s+/g, " ").trim();
}

export function socialFeedReelCaption(body: string | null | undefined): string | null {
  const line = socialFeedReelFirstLine(body);
  if (!line) return null;
  return line.length <= SOCIAL_FEED_REEL_CAPTION_MAX ? line : null;
}

export function socialFeedReelLabel(name: string, body: string | null | undefined): string {
  const line = socialFeedReelFirstLine(body);
  const head = line ? `${name}, ${line}` : name;
  return `${head}. ${SOCIAL.reels.opensInExplore}`;
}

/** A tile as this device shows it: an owner's edited caption (the Edit
 *  caption overlay) rebuilds the caption and the accessible name; undefined
 *  keeps the tile as the server built it. */
export function socialFeedReelTileLive<T extends Pick<SocialFeedReelTile, "authorName" | "caption" | "label">>(
  tile: T,
  override: string | null | undefined,
): T {
  if (override === undefined) return tile;
  return {
    ...tile,
    caption: socialFeedReelCaption(override),
    label: socialFeedReelLabel(tile.authorName, override),
  };
}

export function socialFeedReelHref(postId: string): string {
  return exploreForYouHref({ v: postId });
}

/**
 * Explore For You hits (Explore order) → rail tiles. Mux video only,
 * vertical only, one tile per post.
 */
export function socialFeedReelTiles(input: {
  hits: readonly SocialFeedReelHit[];
  mediaByPost: ReadonlyMap<string, readonly SocialEdgeMediaItem[]>;
  authors: ReadonlyMap<string, ExploreForYouAuthor>;
}): SocialFeedReelTile[] {
  const seen = new Set<string>();
  const tiles: SocialFeedReelTile[] = [];
  for (const hit of input.hits) {
    if (seen.has(hit.id)) continue;
    const video = exploreForYouMuxVideo(input.mediaByPost.get(hit.id) ?? []);
    if (!video?.playbackId || !socialFeedReelVertical(video)) continue;
    seen.add(hit.id);
    const author = input.authors.get(hit.authorId);
    const name = author?.display_name?.trim() || author?.handle || "";
    tiles.push({
      postId: hit.id,
      href: socialFeedReelHref(hit.id),
      playbackId: video.playbackId,
      ...(video.playbackPolicy ? { playbackPolicy: video.playbackPolicy } : {}),
      authorId: hit.authorId,
      authorName: name,
      authorPhotoUrl: socialAvatarHref(hit.authorId),
      caption: socialFeedReelCaption(hit.body),
      label: socialFeedReelLabel(name, hit.body),
    });
  }
  return tiles;
}

/**
 * Post wall with a Reels rail after every `every` posts. Rails continue
 * through the reel list without repeats. A reel already in the wall is
 * dropped. A rail with fewer than `min` reels left is skipped, and so is
 * every rail after it.
 */
export function socialFeedReelPlan<P extends { id: string }, R extends { postId: string }>(
  posts: readonly P[],
  reels: readonly R[],
  options: { every?: number; size?: number; min?: number } = {},
): SocialFeedSlot<P, R>[] {
  const every = Math.max(1, Math.floor(options.every ?? SOCIAL_FEED_REEL_EVERY));
  const size = Math.max(1, Math.floor(options.size ?? SOCIAL_FEED_REEL_RAIL_SIZE));
  const min = Math.max(1, Math.floor(options.min ?? SOCIAL_FEED_REEL_MIN));
  const inWall = new Set(posts.map((post) => post.id));
  const seen = new Set<string>();
  const pool: R[] = [];
  for (const reel of reels) {
    if (inWall.has(reel.postId) || seen.has(reel.postId)) continue;
    seen.add(reel.postId);
    pool.push(reel);
  }
  const slots: SocialFeedSlot<P, R>[] = [];
  let next = 0;
  let rail = 0;
  posts.forEach((post, index) => {
    slots.push({ kind: "post", post });
    if ((index + 1) % every !== 0) return;
    const tiles = pool.slice(next, next + size);
    // What is left only shrinks, so a skipped rail skips every later one.
    if (tiles.length < min) return;
    slots.push({ kind: "reels", rail, tiles });
    next += tiles.length;
    rail += 1;
  });
  return slots;
}

/** Scroll edges of a horizontal row. 1px slack for subpixel widths. */
export function socialRowScrollEdges(input: {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
}): { start: boolean; end: boolean } {
  const left = Math.max(0, input.scrollLeft);
  return {
    start: left <= 1,
    end: left + input.clientWidth >= input.scrollWidth - 1,
  };
}

/**
 * Keyboard reveal for a row with a fade over its trailing edge (feed
 * topics). The track's scroll padding equals the fade width, but Chromium
 * scrolls a focused item only when it sits outside the scrollport: a word
 * whole inside the track yet under the fade stays there. This returns the
 * scrollLeft change that brings the item inside the port less its scroll
 * padding, at the nearest edge, or 0 when it already sits clear. An item
 * wider than the clear area keeps its start in view. Under 1px is 0
 * (subpixel rest, no jitter). Viewport x, LTR (the house is LTR).
 */
export function socialRowFocusShift(input: {
  itemStart: number;
  itemEnd: number;
  portStart: number;
  portEnd: number;
  padStart: number;
  padEnd: number;
}): number {
  const clearStart = input.portStart + input.padStart;
  const clearEnd = input.portEnd - input.padEnd;
  let shift = 0;
  if (input.itemEnd > clearEnd) {
    shift = Math.min(input.itemEnd - clearEnd, input.itemStart - clearStart);
  } else if (input.itemStart < clearStart) {
    shift = input.itemStart - clearStart;
  }
  return Math.abs(shift) < 1 ? 0 : shift;
}

/**
 * Feed topics: a chip whose end passes under the row's trailing fade (the
 * fade and More topics, 96 wide) is cut, and hides until the row scrolls
 * it clear; no label is ever drawn cut under the fade (cards lock; the
 * founder's state showed "Cinematog" cut there). A chip that ends within
 * 1px of the clear edge is clear (subpixel rest). Viewport x, LTR. Only
 * the trailing edge: a chip scrolled past the leading edge is plain
 * scroll clipping, with no fade over it.
 * docs/design-locks/social-feed-cards-lock-v1.md
 */
export function socialRowItemUnderFade(input: {
  itemEnd: number;
  portEnd: number;
  fade: number;
}): boolean {
  return input.itemEnd > input.portEnd - Math.max(0, input.fade) + 1;
}

// Tap opens Explore at that reel. Exit returns to the same spot. The feed's
// vertical scroll is the house lead-scroll memory (captured on the tap,
// restored when Back lands on /social). This in-tab note says which Explore
// address the tap opened, so Exit takes Back, and which rail sat where.
type SocialFeedReelReturn = { explore: string; rail: number; left: number };

let reelReturn: SocialFeedReelReturn | null = null;

export function rememberSocialFeedReelReturn(next: SocialFeedReelReturn): void {
  reelReturn = { ...next, left: Math.max(0, next.left) };
}

/** True when this Explore address is the one a feed reel opened. */
export function socialFeedReelOpenedExplore(exploreHref: string): boolean {
  return reelReturn !== null && reelReturn.explore === exploreHref;
}

/** A remounted rail takes its sideways position once. */
export function takeSocialFeedReelScroll(rail: number): number | null {
  if (!reelReturn || reelReturn.rail !== rail) return null;
  const left = reelReturn.left;
  reelReturn = null;
  return left;
}

export function resetSocialFeedReelReturnForTests(): void {
  reelReturn = null;
}
