"use client";

import { useHouseClient } from "@/components/chrome/house-client-shell";
import { SocialActivityHistory, type SocialActivityCommentCardModel } from "@/components/social/social-activity-history";
import { SocialEmpty } from "@/components/social/social-empty";
import { SocialHighlights } from "@/components/social/social-highlights";
import { SocialProfileInterests } from "@/components/social/social-profile-interests";
import { SocialProfileTabs } from "@/components/social/social-profile-tabs";
import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { houseExactHref } from "@/lib/house-client-shell";
import {
  resolveSocialProfileLocation,
  type SocialActivityPill,
} from "@/lib/social-activity";
import {
  SOCIAL,
  SOCIAL_PROFILE_TABS,
  type SocialProfileTab,
} from "@/lib/social";

export type SocialProfileTabActivity = {
  posts: readonly SocialPostCardModel[];
  imageIds: readonly string[];
  videoIds: readonly string[];
  postsTruncated: boolean;
  comments: readonly SocialActivityCommentCardModel[];
  commentsTruncated: boolean;
};

function postsForPill(
  activity: SocialProfileTabActivity,
  pill: SocialActivityPill,
): readonly SocialPostCardModel[] {
  if (pill === "images") {
    const ids = new Set(activity.imageIds);
    return activity.posts.filter((post) => ids.has(post.id));
  }
  if (pill === "videos") {
    const ids = new Set(activity.videoIds);
    return activity.posts.filter((post) => ids.has(post.id));
  }
  return activity.posts;
}

// Tab strip + the active panel. Face, stats, Edit profile, Share, and
// For You stay outside this island so a ?tab= hop does not remount them.
export function SocialProfileTabPanels({
  baseHref,
  seedTab,
  seedActivity,
  tabs = SOCIAL_PROFILE_TABS,
  creditsHint,
  highlights,
  topics,
  interestsOwner = false,
  activity,
}: {
  baseHref: string;
  seedTab: SocialProfileTab;
  seedActivity: SocialActivityPill;
  tabs?: readonly SocialProfileTab[];
  creditsHint: string;
  highlights: readonly { id: string; href: string; label: string; photoUrl?: string | null }[];
  topics?: readonly string[] | null;
  interestsOwner?: boolean;
  activity: SocialProfileTabActivity;
}) {
  const house = useHouseClient();
  const owned = house
    ? houseExactHref(house.href) !== houseExactHref(`${house.nextPathname}${house.nextSearch}`)
    : false;
  const live = resolveSocialProfileLocation({
    owned,
    search: house?.search ?? "",
    nextSearch: house?.nextSearch ?? "",
    seedTab,
    seedActivity,
    tabs,
  });

  return (
    <>
      <SocialProfileTabs baseHref={baseHref} active={live.tab} tabs={tabs} />
      {live.tab === "credits" ? (
        <SocialEmpty icon="film-slate" title={SOCIAL.profile.creditsEmpty} hint={creditsHint} />
      ) : live.tab === "highlights" ? (
        highlights.length > 0 ? (
          <SocialHighlights cards={highlights} />
        ) : (
          <SocialEmpty icon="image" title={SOCIAL.profile.highlightsEmpty} hint={SOCIAL.profile.highlightsEmptyHint} />
        )
      ) : live.tab === "interests" ? (
        <SocialProfileInterests topics={topics} owner={interestsOwner} />
      ) : (
        <SocialActivityHistory
          baseHref={baseHref}
          pill={live.activity}
          truncated={live.activity === "comments" ? activity.commentsTruncated : activity.postsTruncated}
          posts={postsForPill(activity, live.activity)}
          comments={activity.comments}
        />
      )}
    </>
  );
}
