"use client";

import type { ReactNode } from "react";

import { SocialFollowingMuxBand } from "@/components/social/social-following-mux-band";
import { SocialPostCard } from "@/components/social/social-post-card";
import { useSocialOptimisticPosts } from "@/components/social/use-social-optimistic";
import { InlineNotice } from "@/components/ui/inline-notice";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { SOCIAL_FEED_GUTTER_CLASS } from "@/lib/social-chrome";
import { socialFollowingMuxVideoOrder } from "@/lib/social-following-mux-active";
import {
  mergeSocialOptimisticPosts,
  socialOptimisticNotice,
} from "@/lib/social-optimistic";

export function SocialOptimisticFeed({
  posts,
  groupSlug = null,
  topic = null,
  empty = null,
}: {
  posts: SocialPostCardModel[];
  groupSlug?: string | null;
  topic?: string | null;
  empty?: ReactNode;
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
  return (
    <SocialFollowingMuxBand order={muxOrder}>
      <div data-social-feed="" className={SOCIAL_FEED_GUTTER_CLASS}>
        {notice}
        {merged.map((post) => (
          <SocialPostCard key={post.id} post={post} muxBandId={post.id} />
        ))}
      </div>
    </SocialFollowingMuxBand>
  );
}
