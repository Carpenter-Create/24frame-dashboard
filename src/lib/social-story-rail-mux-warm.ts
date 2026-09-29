import "server-only";

import { socialStoryRailCover } from "@/lib/social-edge";
import { viewerMayMintSocialMuxPlayback } from "@/lib/social-media-access";
import { socialMuxPlaybackRequiresTokens } from "@/lib/social-mux";
import { mintSocialMuxPlaybackTokens } from "@/lib/social-mux-server";
import type { SocialStoryRailCard } from "@/lib/social-feed";
import {
  SOCIAL_STORY_RAIL_MUX_WARM_AHEAD,
  type SocialStoryRailWarmThumb,
} from "@/lib/social-story-rail-mint";

/**
 * Node mint for the first Home rail paint. Same grant as /api/social/mux-playback.
 * Active card and the next one. Later cards stay on the client mint.
 * A miss leaves that card out so the client path still applies.
 * The page does not import the Mux client; this module does.
 * docs/design-locks/stories-home-rail-mint-on-visible-lock-v1.md
 */
export async function warmStoryRailPlaybackTokens(
  userId: string,
  cards: readonly SocialStoryRailCard[],
): Promise<SocialStoryRailWarmThumb[]> {
  const window = cards.slice(0, SOCIAL_STORY_RAIL_MUX_WARM_AHEAD);
  const warmed = await Promise.all(
    window.map(async (card): Promise<SocialStoryRailWarmThumb | null> => {
      const cover = socialStoryRailCover(card.latest.media, card.authorId);
      if (!cover?.playbackId || !socialMuxPlaybackRequiresTokens(cover.playbackPolicy)) return null;
      if (!(await viewerMayMintSocialMuxPlayback(userId, cover.playbackId))) return null;
      try {
        const tokens = await mintSocialMuxPlaybackTokens(cover.playbackId);
        return { authorId: card.authorId, playbackId: cover.playbackId, thumbnail: tokens.thumbnail };
      } catch {
        // Missing key or Mux reject. The client mint remains.
        return null;
      }
    }),
  );
  return warmed.filter((row): row is SocialStoryRailWarmThumb => row !== null);
}
