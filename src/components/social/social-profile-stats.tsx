"use client";

import { useQuery } from "@tanstack/react-query";

import { readSocialCounts } from "@/app/(app)/social/query-actions";
import { HouseLink } from "@/components/chrome/house-link";
import { useAppQueryClient } from "@/components/query-provider";
import { SOCIAL_QUERY_STALE_MS, socialCountsQueryKey } from "@/lib/social-cache-keys";
import {
  SOCIAL_PROFILE_STAT_CLASS,
  SOCIAL_PROFILE_STAT_LABEL_CLASS,
  SOCIAL_PROFILE_STAT_VALUE_CLASS,
  SOCIAL_PROFILE_STATS_CLASS,
  SOCIAL_PROFILE_STATS_GRID_CLASS,
} from "@/lib/social-chrome";
import { formatSocialCount, socialProfileFollowsHref, socialProfileStatLabel } from "@/lib/social";
import type { SocialProfileCounts } from "@/lib/social-feed";

export function SocialProfileStats({
  profileId,
  handle,
  stats,
}: {
  profileId?: string;
  handle: string;
  stats: SocialProfileCounts;
}) {
  const client = useAppQueryClient();
  if (!profileId || !client) {
    return <SocialProfileStatsView handle={handle} stats={stats} />;
  }
  return <SocialProfileStatsQuery profileId={profileId} handle={handle} initial={stats} />;
}

function SocialProfileStatsQuery({
  profileId,
  handle,
  initial,
}: {
  profileId: string;
  handle: string;
  initial: SocialProfileCounts;
}) {
  const query = useQuery({
    queryKey: socialCountsQueryKey(profileId),
    queryFn: () => readSocialCounts(profileId),
    initialData: initial,
    staleTime: SOCIAL_QUERY_STALE_MS,
  });
  return <SocialProfileStatsView handle={handle} stats={query.data ?? initial} />;
}

function SocialProfileStatsView({
  handle,
  stats,
}: {
  handle: string;
  stats: SocialProfileCounts;
}) {
  return (
    <div data-social-profile-stats="" className={SOCIAL_PROFILE_STATS_CLASS}>
      <div className={SOCIAL_PROFILE_STATS_GRID_CLASS}>
        <p data-social-profile-stat="posts" className={SOCIAL_PROFILE_STAT_CLASS}>
          <span className={SOCIAL_PROFILE_STAT_VALUE_CLASS}>{formatSocialCount(stats.posts)}</span>
          <span className={SOCIAL_PROFILE_STAT_LABEL_CLASS}>{socialProfileStatLabel("posts", stats.posts)}</span>
        </p>
        <HouseLink
          href={socialProfileFollowsHref(handle, "followers")}
          data-social-profile-stat="followers"
          className={SOCIAL_PROFILE_STAT_CLASS}
        >
          <span className={SOCIAL_PROFILE_STAT_VALUE_CLASS}>{formatSocialCount(stats.followers)}</span>
          <span className={SOCIAL_PROFILE_STAT_LABEL_CLASS}>{socialProfileStatLabel("followers", stats.followers)}</span>
        </HouseLink>
        <HouseLink
          href={socialProfileFollowsHref(handle, "following")}
          data-social-profile-stat="following"
          className={SOCIAL_PROFILE_STAT_CLASS}
        >
          <span className={SOCIAL_PROFILE_STAT_VALUE_CLASS}>{formatSocialCount(stats.following)}</span>
          <span className={SOCIAL_PROFILE_STAT_LABEL_CLASS}>{socialProfileStatLabel("following", stats.following)}</span>
        </HouseLink>
      </div>
    </div>
  );
}
