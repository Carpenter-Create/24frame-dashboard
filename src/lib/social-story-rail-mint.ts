/**
 * Home Stories rail. Active card and the next one are warmed on the
 * server, same window as Explore. Later cards mint when they intersect.
 * The ring cap stays SOCIAL_STORIES_RAIL_LIMIT (80).
 * docs/design-locks/stories-home-rail-mint-on-visible-lock-v1.md
 */
export const SOCIAL_STORY_RAIL_MUX_WARM_AHEAD = 2;

/** One card past the viewport (136px card + 8px gap). Not the ring. */
export const SOCIAL_STORY_RAIL_MINT_ROOT_MARGIN = "0px 160px 0px 160px";

export type SocialStoryRailWarmThumb = {
  authorId: string;
  playbackId: string;
  thumbnail: string;
};
