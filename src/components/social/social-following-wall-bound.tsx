"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { readSocialFollowingWall } from "@/app/(app)/social/query-actions";
import { TextAction } from "@/components/chrome/house";
import { SocialOptimisticFeed } from "@/components/social/social-optimistic-feed";
import { useAppQueryClient } from "@/components/query-provider";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SOCIAL_QUERY_STALE_MS, socialFollowingWallQueryKey } from "@/lib/social-cache-keys";
import type { SocialFollowingWallView } from "@/lib/social-following-wall";
import type { SocialCategoryLabel } from "@/lib/social-categories";
import { socialFollowingWallHref } from "@/lib/social-home-bounds";
import { SOCIAL } from "@/lib/social";

// Query owns the Following wall after boot. RSC seeds initialData.
// Follow invalidation must repaint this tree — do not return stale children.

export function SocialFollowingWallBound({
  viewerId,
  topic,
  cursor,
  wall,
  empty,
}: {
  viewerId: string;
  topic: SocialCategoryLabel;
  cursor: string | null;
  wall: SocialFollowingWallView;
  empty?: ReactNode;
}) {
  const client = useAppQueryClient();
  if (!client) return <SocialFollowingWallPaint topic={topic} wall={wall} empty={empty} />;
  return (
    <SocialFollowingWallBoundLive viewerId={viewerId} topic={topic} cursor={cursor} wall={wall} empty={empty} />
  );
}

function SocialFollowingWallBoundLive({
  viewerId,
  topic,
  cursor,
  wall,
  empty,
}: {
  viewerId: string;
  topic: SocialCategoryLabel;
  cursor: string | null;
  wall: SocialFollowingWallView;
  empty?: ReactNode;
}) {
  const query = useQuery({
    queryKey: socialFollowingWallQueryKey(viewerId, topic, cursor),
    queryFn: () => readSocialFollowingWall({ topic, cursor }),
    initialData: wall,
    staleTime: SOCIAL_QUERY_STALE_MS,
  });
  return <SocialFollowingWallPaint topic={topic} wall={query.data ?? wall} empty={empty} />;
}

function SocialFollowingWallPaint({
  topic,
  wall,
  empty,
}: {
  topic: SocialCategoryLabel;
  wall: SocialFollowingWallView;
  empty?: ReactNode;
}) {
  return (
    <>
      {wall.truncated ? (
        <div data-social-wall-truncated="" className="flex flex-col gap-[var(--space-3)]">
          <InlineNotice tone="info">{SOCIAL.home.truncatedWall}</InlineNotice>
          {wall.nextCursor ? (
            <TextAction href={socialFollowingWallHref({ topic, after: wall.nextCursor })} data-social-wall-older="">
              {SOCIAL.home.olderPosts}
            </TextAction>
          ) : null}
        </div>
      ) : null}
      <SocialOptimisticFeed topic={topic} posts={wall.cards} empty={empty} />
    </>
  );
}
