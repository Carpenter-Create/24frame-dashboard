import { isSocialMuxId } from "@/lib/social-mux";

// Home Following Mux active gate.
// docs/design-locks/social-home-following-mux-active-gate-lock-v1.md
//
// The first Following page can hold SOCIAL_FOLLOWING_WALL_LIMIT posts.
// The video that is at least SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO on screen
// mounts Mux. The next video warms one signed JWT. Every other video stays
// closed: no Mux JS, no metadata preload, and no signed token mint.

/** Explore uses the same ratio for the slide that is on screen. */
export const SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO = 0.6;

export const SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS = [
  0,
  SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO,
  0.75,
  1,
] as const;

export type SocialFollowingMuxRole = "mount" | "warm" | "closed";

export type SocialFollowingMuxSlideRole = SocialFollowingMuxRole | "unbanded";

/**
 * Highest ratio at or above the active line. An equal ratio keeps the
 * earlier post. Below the line is not active.
 */
export function socialFollowingMuxActiveIndex(ratios: readonly number[]): number {
  let best = -1;
  let bestRatio = -1;
  for (let index = 0; index < ratios.length; index += 1) {
    const ratio = ratios[index] ?? 0;
    if (ratio < SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO) continue;
    if (ratio > bestRatio) {
      best = index;
      bestRatio = ratio;
    }
  }
  return best;
}

export function socialFollowingMuxActiveId(
  order: readonly string[],
  ratios: ReadonlyMap<string, number>,
): string | null {
  const index = socialFollowingMuxActiveIndex(order.map((id) => ratios.get(id) ?? 0));
  if (index < 0) return null;
  return order[index] ?? null;
}

/**
 * Video posts only, in feed order. Text and stills are not a Mux slot.
 * The warm target is the next id in this list.
 */
export function socialFollowingMuxVideoOrder(
  posts: readonly {
    id: string;
    media: readonly { kind: string; playbackId?: string }[];
  }[],
): string[] {
  const order: string[] = [];
  for (const post of posts) {
    const playable = post.media.some(
      (item) =>
        item.kind === "video" && typeof item.playbackId === "string" && isSocialMuxId(item.playbackId),
    );
    if (playable) order.push(post.id);
  }
  return order;
}

/**
 * No active id means every post stays closed. A cold wall must not mount.
 * Mount is the active video. Warm is the next video. The rest stay closed.
 */
export function socialFollowingMuxRoleForPost(input: {
  postId: string;
  activeId: string | null;
  order: readonly string[];
}): SocialFollowingMuxRole {
  if (!input.activeId) return "closed";
  const activeIndex = input.order.indexOf(input.activeId);
  const index = input.order.indexOf(input.postId);
  if (activeIndex < 0 || index < 0) return "closed";
  if (index === activeIndex) return "mount";
  if (index === activeIndex + 1) return "warm";
  return "closed";
}

/**
 * Banded carousel: the visible Mux slide mounts and the next Mux slide warms.
 * A warm post warms one Mux slide and mounts none. A closed post does neither.
 * Unbanded hosts (profile, immersive, DM) mount every Mux slide.
 */
export function socialFollowingMuxCarouselSlideRole(input: {
  postRole: SocialFollowingMuxSlideRole;
  index: number;
  visibleIndex: number;
  muxIndexes: readonly number[];
}): SocialFollowingMuxSlideRole {
  if (input.postRole === "unbanded") return "unbanded";
  if (!input.muxIndexes.includes(input.index)) return "closed";
  if (input.postRole === "closed") return "closed";
  const upcoming = input.muxIndexes.filter((index) => index >= input.visibleIndex);
  const first = upcoming[0] ?? input.muxIndexes[0];
  if (input.postRole === "warm") {
    return input.index === first ? "warm" : "closed";
  }
  const visibleIsMux = input.muxIndexes.includes(input.visibleIndex);
  if (!visibleIsMux) {
    const next = input.muxIndexes.find((index) => index > input.visibleIndex);
    return next != null && input.index === next ? "warm" : "closed";
  }
  if (input.index === input.visibleIndex) return "mount";
  const next = input.muxIndexes.find((index) => index > input.visibleIndex);
  if (next != null && input.index === next) return "warm";
  return "closed";
}
