import "server-only";

import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";
import { viewerMayMintSocialMuxPlayback } from "@/lib/social-media-access";
import { socialMuxPlaybackRequiresTokens, type SocialMuxPlaybackTokens } from "@/lib/social-mux";
import { mintSocialMuxPlaybackTokens } from "@/lib/social-mux-server";

/** Active slide and the next one. Later closed slides stay on the client mint. */
export const EXPLORE_FOR_YOU_MUX_WARM_AHEAD = 2;

/**
 * Node mint for the first Explore paint. Same grant as /api/social/mux-playback.
 * A miss leaves the item without tokens so the client path still applies.
 * The page does not import the Mux client; this module does.
 */
export async function warmExploreForYouPlaybackTokens(
  userId: string,
  items: readonly SocialExploreForYouItem[],
): Promise<SocialExploreForYouItem[]> {
  const minted = new Map<string, SocialMuxPlaybackTokens>();
  await Promise.all(
    items.slice(0, EXPLORE_FOR_YOU_MUX_WARM_AHEAD).map(async (item) => {
      if (!socialMuxPlaybackRequiresTokens(item.playbackPolicy)) return;
      if (!(await viewerMayMintSocialMuxPlayback(userId, item.playbackId))) return;
      try {
        minted.set(item.playbackId, await mintSocialMuxPlaybackTokens(item.playbackId));
      } catch {
        // Missing key or Mux reject. The client mint remains.
      }
    }),
  );
  if (minted.size === 0) return [...items];
  return items.map((item) => {
    const playbackTokens = minted.get(item.playbackId);
    return playbackTokens ? { ...item, playbackTokens } : item;
  });
}
