import "server-only";

import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";
import { viewerMayMintSocialMuxPlayback } from "@/lib/social-media-access";
import { socialMuxPlaybackRequiresTokens } from "@/lib/social-mux";
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
  const window = items.slice(0, EXPLORE_FOR_YOU_MUX_WARM_AHEAD);
  const warmed = await Promise.all(
    window.map(async (item) => {
      if (!socialMuxPlaybackRequiresTokens(item.playbackPolicy)) return item;
      if (!(await viewerMayMintSocialMuxPlayback(userId, item.playbackId))) return item;
      try {
        const playbackTokens = await mintSocialMuxPlaybackTokens(item.playbackId);
        return { ...item, playbackTokens };
      } catch {
        // Missing key or Mux reject. The client mint remains.
        return item;
      }
    }),
  );
  // Later slides keep their own objects. A repeated playback id does not inherit this window.
  return [...warmed, ...items.slice(EXPLORE_FOR_YOU_MUX_WARM_AHEAD)];
}
