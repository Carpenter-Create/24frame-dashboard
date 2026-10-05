"use client";

import type { ReactNode } from "react";

import { SocialFeedReelRail } from "@/components/social/social-feed-reel-rail";
import { SocialFollowingMuxBand } from "@/components/social/social-following-mux-band";
import { SocialPostCard } from "@/components/social/social-post-card";
import { useSocialOptimisticPosts } from "@/components/social/use-social-optimistic";
import { InlineNotice } from "@/components/ui/inline-notice";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { SOCIAL_FEED_GUTTER_CLASS } from "@/lib/social-chrome";
import { socialFeedReelPlan, type SocialFeedReelTile } from "@/lib/social-feed-reels";
import { socialFollowingMuxVideoOrder } from "@/lib/social-following-mux-active";
import {
  mergeSocialOptimisticPosts,
  socialOptimisticNotice,
} from "@/lib/social-optimistic";

const NO_REELS: readonly SocialFeedReelTile[] = [];

// Post wall. With reels (Feed, both lanes wherever this wall renders) a
// Reels rail follows every 3 posts; the plan is a pure lib helper. Reel
// tiles are stills and never join the Mux band order.
// docs/design-locks/social-feed-reel-rail-lock-v1.md
export function SocialOptimisticFeed({
  posts,
  groupSlug = null,
  topic = null,
  empty = null,
  reels = NO_REELS,
}: {
  posts: SocialPostCardModel[];
  groupSlug?: string | null;
  topic?: string | null;
  empty?: ReactNode;
  reels?: readonly SocialFeedReelTile[];
}) {
  const pending = useSocialOptimisticPosts(groupSlug, topic);
  const merged = mergeSocialOptimisticPosts(posts, pending);
  const error = socialOptimisticNotice(pending);
  const notice = error ? (
    <InlineNotice tone="error" data-social-optimistic-error="">
      {error}
    </InlineNotice>
  ) : null;
  if (merged.length === 0) {
    return (
      <>
        {notice}
        {empty}
      </>
    );
  }
  const muxOrder = socialFollowingMuxVideoOrder(merged);
  const slots = socialFeedReelPlan(merged, reels);
  return (
    <SocialFollowingMuxBand order={muxOrder}>
      <div data-social-feed="" className={SOCIAL_FEED_GUTTER_CLASS}>
        {notice}
        {slots.map((slot) =>
          slot.kind === "post" ? (
            <SocialPostCard key={slot.post.id} post={slot.post} muxBandId={slot.post.id} />
          ) : (
            <SocialFeedReelRail key={`reels-${slot.rail}`} rail={slot.rail} tiles={slot.tiles} />
          ),
        )}
      </div>
    </SocialFollowingMuxBand>
  );
}
