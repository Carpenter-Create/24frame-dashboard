import type { ReactNode } from "react";

import { Skeleton } from "@/components/layout/skeleton";
import { HOUSE_DRAWER_HOST_CLASS, HOUSE_DRAWER_PANEL_CLASS } from "@/lib/house-overlay";
import { cn } from "@/lib/cn";
import {
  SOCIAL_AVATAR_PROFILE_CLASS,
  SOCIAL_AVATAR_SM_CLASS,
  SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
  SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS,
  SOCIAL_COMPOSER_CLASS,
  SOCIAL_COMPOSER_FIELD_CLASS,
  SOCIAL_COMPOSER_ROW_CLASS,
  SOCIAL_CREATE_CARD_CLASS,
  SOCIAL_CREATE_WELL_CLASS,
  SOCIAL_DM_INBOX_ROW_CLASS,
  SOCIAL_FEED_AUTHOR_EDGE_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_ROW_CLASS,
  SOCIAL_MOBILE_BLEED_CLASS,
  SOCIAL_STORIES_FEED_RULE_CLASS,
  SOCIAL_FOR_YOU_CARD_CLASS,
  SOCIAL_FOR_YOU_RAIL_CLASS,
  SOCIAL_TOPIC_CHIP_ROW_CLASS,
  SOCIAL_TOPIC_RAIL_CLASS,
  SOCIAL_TOPIC_RAIL_ROWS,
  SOCIAL_TOPIC_RAIL_STACK_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS,
  SOCIAL_HOME_CENTER_CLASS,
  SOCIAL_HOME_LAYOUT_CLASS,
  SOCIAL_HOME_SPINE_CLASS,
  SOCIAL_HOME_TOPICS_CLASS,
  SOCIAL_PROFILE_CENTER_CLASS,
  SOCIAL_PROFILE_AVATAR_ROW_CLASS,
  SOCIAL_PROFILE_HEAD_CLASS,
  SOCIAL_PROFILE_HERO_CLASS,
  SOCIAL_HOME_STORY_CARD_CLASS,
  SOCIAL_PROFILE_EDIT_HOST_CLASS,
  SOCIAL_PROFILE_EDIT_SHEET_CLASS,
  SOCIAL_PROFILE_ACTIONS_CLASS,
  SOCIAL_PROFILE_FACE_CLASS,
  SOCIAL_PROFILE_INTRO_CLASS,
  SOCIAL_PROFILE_LINKS_CLASS,
  SOCIAL_PROFILE_IDENTITY_CLASS,
  SOCIAL_PROFILE_NAME_STACK_CLASS,
  SOCIAL_PROFILE_ROLES_CLASS,
  SOCIAL_PROFILE_STAGE_CLASS,
  SOCIAL_PROFILE_STAT_CLASS,
  SOCIAL_PROFILE_STAT_LABEL_CLASS,
  SOCIAL_PROFILE_STAT_VALUE_CLASS,
  SOCIAL_PROFILE_STATS_CLASS,
  SOCIAL_PROFILE_STATS_GRID_CLASS,
  SOCIAL_STORY_CARD_CLASS,
  SOCIAL_STORY_STAGE_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL_HOME_STACK_LOCK } from "@/lib/social-home";

export function SocialForYouSkeleton() {
  return (
    <aside data-social-for-you-skeleton="" className={SOCIAL_FOR_YOU_RAIL_CLASS}>
      <Skeleton className="h-4 w-24" />
      <div className={SOCIAL_FOR_YOU_CARD_CLASS}>
        <Skeleton className="h-14 w-full rounded-[8px]" />
        <Skeleton className="h-14 w-full rounded-[8px]" />
      </div>
    </aside>
  );
}

export function SocialHomeCenterSkeleton({
  topics = true,
  middle = null,
}: {
  topics?: boolean;
  middle?: ReactNode;
} = {}) {
  const topicsSkeleton = topics ? (
    <div data-social-home-topics-skeleton="" className={SOCIAL_HOME_TOPICS_CLASS}>
      <div className={SOCIAL_TOPIC_RAIL_CLASS}>
        <div className={SOCIAL_TOPIC_RAIL_STACK_CLASS}>
          {Array.from({ length: SOCIAL_TOPIC_RAIL_ROWS }).map((_, row) => (
            <div key={row} className={SOCIAL_TOPIC_CHIP_ROW_CLASS}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  ) : null;
  const composerSkeleton = (
    <div data-social-home-composer-skeleton="" className={SOCIAL_COMPOSER_CLASS}>
      <div className={SOCIAL_COMPOSER_ROW_CLASS}>
        <Skeleton className={cn(SOCIAL_AVATAR_SM_CLASS, "size-10")} />
        <Skeleton className={cn(SOCIAL_COMPOSER_FIELD_CLASS, "bg-surface-muted")} />
      </div>
      <div className={SOCIAL_COMPOSER_AFFORDANCE_ROW_CLASS}>
        <Skeleton className="size-8 shrink-0 rounded-full" />
        <Skeleton className="size-8 shrink-0 rounded-full" />
      </div>
    </div>
  );
  const body = (
    <>
      {topicsSkeleton}
      {composerSkeleton}
      <SocialStoriesRailSkeleton tall />
      {middle}
      <div data-social-feed-skeleton="" className={SOCIAL_FEED_GUTTER_CLASS}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="block min-w-0 shrink-0">
            <div className={SOCIAL_FEED_ROW_CLASS}>
            <div className={cn("flex gap-2", SOCIAL_FEED_AUTHOR_EDGE_CLASS)}>
              <Skeleton className={SOCIAL_AVATAR_SM_CLASS} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
            <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
  if (!topics) return body;
  return (
    <div data-social-home-stack={SOCIAL_HOME_STACK_LOCK} className={cn(SOCIAL_HOME_CENTER_CLASS, SOCIAL_HOME_SPINE_CLASS)}>
      {body}
    </div>
  );
}

function SocialStoriesRailSkeleton({
  count = 5,
  tall = false,
}: {
  count?: number;
  tall?: boolean;
}) {
  return (
    <div
      data-social-stories-skeleton=""
      className={cn("flex gap-2 overflow-hidden", SOCIAL_MOBILE_BLEED_CLASS, tall && SOCIAL_STORIES_FEED_RULE_CLASS)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={tall ? SOCIAL_HOME_STORY_CARD_CLASS : SOCIAL_STORY_CARD_CLASS} />
      ))}
    </div>
  );
}

export function SocialHomeSkeleton() {
  return (
    <div data-social-home-skeleton="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <SocialHomeCenterSkeleton />
      <SocialForYouSkeleton />
    </div>
  );
}

// Profile Stage skeleton (docs/design-locks/social-profile-stage-lock-v1.md):
// the same stage, hero and face classes as SocialProfileIdentity, so the
// hero box (aspect, radius, phone inset) is identical when the real face
// mounts. The hero shows its --band fill, the no-cover state.
export function SocialProfileCenterSkeleton() {
  return (
    <div className={SOCIAL_PROFILE_CENTER_CLASS}>
      <div data-social-profile-identity-skeleton="" className={SOCIAL_PROFILE_IDENTITY_CLASS}>
        <div className={SOCIAL_PROFILE_STAGE_CLASS}>
          <div data-social-profile-hero-skeleton="" className={SOCIAL_PROFILE_HERO_CLASS}>
            <div className={SOCIAL_PROFILE_HEAD_CLASS}>
              <div className={SOCIAL_PROFILE_AVATAR_ROW_CLASS}>
                <Skeleton
                  className={cn(
                    SOCIAL_AVATAR_PROFILE_CLASS,
                    SOCIAL_PROFILE_AVATAR_ON_COVER_CLASS,
                    "rounded-full bg-band-ink/15",
                  )}
                />
              </div>
              <div className={SOCIAL_PROFILE_NAME_STACK_CLASS}>
                <Skeleton className="h-7 w-40 bg-band-ink/15 @min-[40rem]/hero:h-14 @min-[40rem]/hero:w-72" />
                <Skeleton className="h-3.5 w-24 bg-band-ink/15 @min-[40rem]/hero:h-4" />
              </div>
            </div>
          </div>
        </div>
        <div className={SOCIAL_PROFILE_FACE_CLASS}>
          <div className={SOCIAL_PROFILE_INTRO_CLASS}>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div data-social-profile-actions-skeleton="" className={SOCIAL_PROFILE_ACTIONS_CLASS}>
            <Skeleton className="h-11 w-32 rounded-full" />
            <Skeleton className="h-11 w-32 rounded-full" />
          </div>
          <div className={SOCIAL_PROFILE_STATS_CLASS}>
            <div className={SOCIAL_PROFILE_STATS_GRID_CLASS}>
              {/* The real cell's value and label lines, so the phone strip
                  keeps its height when the face mounts. On phone the bars
                  take the surface: the strip itself is surface-muted. */}
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} data-social-profile-stat-skeleton="" className={SOCIAL_PROFILE_STAT_CLASS}>
                  <div className={SOCIAL_PROFILE_STAT_VALUE_CLASS}>
                    <Skeleton className="inline-block h-[0.8em] w-10 align-middle max-md:bg-surface" />
                  </div>
                  <div className={SOCIAL_PROFILE_STAT_LABEL_CLASS}>
                    <Skeleton className="inline-block h-[0.8em] w-14 align-middle max-md:bg-surface" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div data-social-profile-roles-skeleton="" className={SOCIAL_PROFILE_ROLES_CLASS}>
            <Skeleton className="h-8 w-24 rounded-full md:h-9" />
            <Skeleton className="h-8 w-28 rounded-full md:h-9" />
          </div>
          {/* The real row pulls 6 so a glyph inside a clear hit box lines up
              with the text above; the skeleton paints the whole box, so it
              starts on the column edge instead. */}
          <div data-social-profile-links-skeleton="" className={cn(SOCIAL_PROFILE_LINKS_CLASS, "ml-0")}>
            <Skeleton className="size-11 rounded-[8px] md:size-8" />
            <Skeleton className="size-11 rounded-[8px] md:size-8" />
          </div>
        </div>
      </div>
      <div className={SOCIAL_FEED_GUTTER_CLASS}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="block min-w-0 shrink-0">
            <div className={SOCIAL_FEED_ROW_CLASS}>
            <div className={cn("flex gap-2", SOCIAL_FEED_AUTHOR_EDGE_CLASS)}>
              <Skeleton className={SOCIAL_AVATAR_SM_CLASS} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
            <Skeleton className="h-40 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SocialProfileSkeleton() {
  return (
    <div data-social-profile-skeleton="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <SocialProfileCenterSkeleton />
      <SocialForYouSkeleton />
    </div>
  );
}

export function SocialFollowsSkeleton() {
  return (
    <div data-social-follows-skeleton="" className="flex min-w-0 flex-1 flex-col">
      <Skeleton className="h-14 w-full" />
      <div className="flex gap-4 px-4 py-3">
        <Skeleton className="h-8 flex-1" />
        <Skeleton className="h-8 flex-1" />
      </div>
      <div className="px-4 py-3">
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5">
          <Skeleton className={SOCIAL_AVATAR_SM_CLASS} />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-7 w-16 rounded-[8px]" />
        </div>
      ))}
    </div>
  );
}

function profileEditSkeletonBody() {
  return (
    <div className={SOCIAL_PROFILE_EDIT_SHEET_CLASS}>
      <Skeleton className="h-14 w-full" />
      <div className="flex flex-col items-center gap-4 px-4 pt-6">
        <Skeleton className="size-[88px] rounded-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-48 w-full rounded-[16px]" />
      </div>
    </div>
  );
}

export function SocialProfileEditSkeleton() {
  return (
    <>
      <div
        data-social-profile-edit-skeleton=""
        data-house-overlay-host="app-sheet"
        className={SOCIAL_PROFILE_EDIT_HOST_CLASS}
      >
        {profileEditSkeletonBody()}
      </div>
      <div data-house-overlay-host="house-drawer" className={HOUSE_DRAWER_HOST_CLASS}>
        <aside className={HOUSE_DRAWER_PANEL_CLASS}>{profileEditSkeletonBody()}</aside>
      </div>
    </>
  );
}

export function SocialCreateSkeleton() {
  return (
    <div data-social-create-skeleton="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <div className={SOCIAL_HOME_CENTER_CLASS}>
        <div className={SOCIAL_CREATE_CARD_CLASS}>
          <Skeleton className="h-8 w-32" />
          <Skeleton className={SOCIAL_CREATE_WELL_CLASS} />
        </div>
      </div>
      <SocialForYouSkeleton />
    </div>
  );
}

export function SocialStoriesCenterSkeleton() {
  return (
    <div className={SOCIAL_HOME_CENTER_CLASS}>
      <SocialStoriesRailSkeleton />
    </div>
  );
}

export function SocialStoriesSkeleton() {
  return (
    <div data-social-stories-index-skeleton="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <SocialStoriesCenterSkeleton />
      <SocialForYouSkeleton />
    </div>
  );
}

export function SocialStoryViewerSkeleton() {
  // docs/design-locks/stories-open-smooth-lock-v1.md
  // The open frame is the dark stage. A surface-muted fill was the grey hitch.
  return (
    <div data-social-story-viewer-skeleton="" className={SOCIAL_STORY_STAGE_CLASS}>
      <div className="h-full w-full" />
    </div>
  );
}

export function SocialExploreResultsSkeleton() {
  return (
    <div data-social-explore-results-skeleton="" className="flex flex-col gap-[var(--space-3)]">
      <Skeleton className="h-16 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-16 w-full rounded-[var(--radius-lg)]" />
      <Skeleton className="h-16 w-full rounded-[var(--radius-lg)]" />
    </div>
  );
}

function SocialDiscoveryColumnSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-6)]">
      <div className="flex flex-col gap-2 pb-6">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-3.5 w-56" />
      </div>
      <Skeleton className="h-10 w-full rounded-[var(--radius)]" />
      <SocialExploreResultsSkeleton />
    </div>
  );
}

export function SocialSearchSkeleton() {
  return (
    <div data-social-search-skeleton="">
      <SocialDiscoveryColumnSkeleton />
    </div>
  );
}

export function SocialExploreForYouSkeleton() {
  return <div data-social-explore-for-you-skeleton="" className="absolute inset-0 bg-[#0A0A0B]" />;
}

export function SocialExploreSkeleton() {
  return (
    <div data-social-explore-skeleton="" className={SOCIAL_EXPLORE_FOR_YOU_HOST_CLASS}>
      <SocialExploreForYouSkeleton />
    </div>
  );
}

export function SocialDmsRowsSkeleton() {
  return (
    <div data-social-dms-rows-skeleton="" className="flex flex-col">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className={cn("flex items-center gap-[var(--space-3)]", SOCIAL_DM_INBOX_ROW_CLASS)}
        >
          <Skeleton className="size-12 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SocialDmsInboxSkeleton() {
  return (
    <div data-social-dms-inbox-skeleton="" className="flex flex-col">
      <div className="flex items-center justify-between py-[var(--space-2)]">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="size-6 rounded-full" />
      </div>
      <Skeleton className="mb-[var(--space-2)] h-[var(--header-search-height)] w-full rounded-full" />
      <SocialDmsRowsSkeleton />
    </div>
  );
}

export function SocialDmsSkeleton() {
  return (
    <div data-social-dms-skeleton="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <div className={SOCIAL_HOME_CENTER_CLASS}>
        <SocialDmsInboxSkeleton />
      </div>
      <SocialForYouSkeleton />
    </div>
  );
}
