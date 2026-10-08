import { Suspense } from "react";

import { InlineNotice } from "@/components/ui/inline-notice";
import { SocialEmpty } from "@/components/social/social-empty";
import { SocialHomeActivityEmpty } from "@/components/social/social-home-activity-empty";
import { SocialForYouRail } from "@/components/social/social-for-you";
import { SocialDesktopForYouSlot } from "@/components/social/social-for-you-slot";
import { SocialHomeComposer } from "@/components/social/social-home-composer";
import { SocialHomeColdSlot, SocialHomeFollowingRail } from "@/components/social/social-home-cold-slot";
import { SocialHomeTopics } from "@/components/social/social-home-topics";
import {
  SocialForYouSkeleton,
  SocialHomeCenterSkeleton,
} from "@/components/social/social-skeletons";
import { SocialStoriesRail } from "@/components/social/social-stories-rail";
import { warmStoryRailPlaybackTokens } from "@/lib/social-story-rail-mux-warm";
import {
  SOCIAL_FEED_CENTER_CLASS,
  SOCIAL_FEED_LAYOUT_CLASS,
  SOCIAL_FEED_WALL_CLASS,
} from "@/lib/social-chrome";
import { signedAvatarUrls, signedSocialMediaByPostId, socialMediaProxiesByPostId } from "@/lib/social-edge";
import { socialFeedReelTiles } from "@/lib/social-feed-reels";
import { socialFollowingWallView } from "@/lib/social-following-wall";
import { SocialFollowingWallBound } from "@/components/social/social-following-wall-bound";
import {
  parseSocialCategoryParam,
  SOCIAL_CATEGORY_ALL,
  SOCIAL_CATEGORY_PARAM,
  type SocialCategoryLabel,
  type SocialCategoryTopic,
} from "@/lib/social-categories";
import { signedEducationCoverUrls } from "@/lib/s3-education";
import { followingAuthorIds, SOCIAL_HOME_STACK_LOCK } from "@/lib/social-home";
import {
  SOCIAL_FOLLOWING_WALL_CURSOR_PARAM,
  encodeFollowingWallCursor,
  parseFollowingWallCursorParam,
  type FollowingWallCursor,
} from "@/lib/social-home-bounds";
import {
  groupStoryRail,
  loadGroupsByIds,
  loadExploreMedia,
  loadLikedPostIds,
  loadLiveStories,
  loadProfilesByIds,
  loadSuggestedPeople,
  loadViewedStoryIds,
  type SocialSuggestedPerson,
} from "@/lib/social-feed";
import { parseSocialHomeLane, SOCIAL, SOCIAL_HOME_LANE_PARAM, socialSearchHref, type SocialHomeLane } from "@/lib/social";
import { ensureOwnSocialProfile } from "@/lib/social-profile";
import { loadCachedFolloweeIds, loadCachedFollowingPosts } from "@/lib/social-hot-reads";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export default async function SocialHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [session, sp] = await Promise.all([requireSocialSession(), searchParams]);
  const topic = parseSocialCategoryParam(sp[SOCIAL_CATEGORY_PARAM]);
  const category = topic === SOCIAL_CATEGORY_ALL ? null : topic;
  const cursor = parseFollowingWallCursorParam(sp[SOCIAL_FOLLOWING_WALL_CURSOR_PARAM]);
  const lane = parseSocialHomeLane(sp[SOCIAL_HOME_LANE_PARAM]);

  return (
    <div data-social-home="" className={SOCIAL_FEED_LAYOUT_CLASS}>
      <Suspense fallback={<SocialHomeCenterSkeleton />}>
        <SocialHomeCenter session={session} category={category} cursor={cursor} lane={lane} topic={topic} />
      </Suspense>
      <SocialHomeFollowingRail seedLane={lane} seedTopic={topic}>
        {lane === "following" ? (
          <Suspense fallback={<SocialForYouSkeleton layout="aside" />}>
            <SocialDesktopForYouSlot
              session={session}
              signCourseCovers={signedEducationCoverUrls}
              layout="aside"
            />
          </Suspense>
        ) : null}
      </SocialHomeFollowingRail>
    </div>
  );
}

async function loadHomeProfile(session: SocialSession) {
  const [profile, followees] = await Promise.all([
    ensureOwnSocialProfile(session.supabase, session.ctx.user),
    loadCachedFolloweeIds(session.supabase, session.ctx.user.id),
  ]);
  return { profile, followees };
}

async function SocialHomeCenter({
  session,
  category,
  cursor,
  lane,
  topic,
}: {
  session: SocialSession;
  category: SocialCategoryTopic | null;
  cursor: FollowingWallCursor | null;
  lane: SocialHomeLane;
  topic: SocialCategoryLabel;
}) {
  const { ctx, supabase } = session;
  const { profile, followees } = await loadHomeProfile(session);
  const authorIds = followingAuthorIds(ctx.user.id, followees.ids);
  const interest = { topics: profile?.topics ?? [], crafts: profile?.crafts ?? [] };
  // The Reels rail reads the For you Explore list (same RLS-bound loader
  // and ranking as Explore). Only the post wall shows rails.
  const wallLane = lane === "following" && !!profile;
  const [wall, storiesPage, suggested, reelPage] = await Promise.all([
    profile
      ? loadCachedFollowingPosts(supabase, ctx.user.id, authorIds, { category, cursor })
      : Promise.resolve({ posts: [], truncated: false, nextCursor: null }),
    loadLiveStories(supabase, authorIds),
    lane === "for-you"
      ? loadSuggestedPeople(supabase, [ctx.user.id, ...followees.ids], interest)
      : Promise.resolve([]),
    wallLane ? loadExploreMedia(supabase, interest) : Promise.resolve({ hits: [], truncated: false }),
  ]);
  const posts = wall.posts;
  const stories = storiesPage.stories;
  const storyIds = stories.map((story) => story.id);
  const reelHits = reelPage.hits;
  const peopleIds = [
    ...new Set([
      ctx.user.id,
      ...posts.map((post) => post.author_id),
      ...stories.map((story) => story.author_id),
      ...suggested.map((person) => person.id),
      ...reelHits.map((hit) => hit.authorId),
    ]),
  ];
  const [viewed, authors, faces, media, groups, liked] = await Promise.all([
    profile ? loadViewedStoryIds(supabase, ctx.user.id, storyIds) : Promise.resolve(new Set<string>()),
    loadProfilesByIds(supabase, peopleIds),
    signedAvatarUrls(peopleIds),
    signedSocialMediaByPostId(posts),
    loadGroupsByIds(
      supabase,
      [...new Set(posts.map((post) => post.group_id).filter((id): id is string => !!id))],
    ),
    profile
      ? loadLikedPostIds(supabase, ctx.user.id, posts.map((post) => post.id))
      : Promise.resolve(new Set<string>()),
  ]);
  const rail = groupStoryRail(stories, viewed);
  const warmedThumbs = await warmStoryRailPlaybackTokens(ctx.user.id, rail);
  const photoUrl = faces.get(ctx.user.id) ?? null;
  const reels = socialFeedReelTiles({
    hits: reelHits,
    mediaByPost: socialMediaProxiesByPostId(
      reelHits.map((hit) => ({ id: hit.id, author_id: hit.authorId, media: hit.media })),
    ),
    authors,
  });

  return (
    <div data-social-home-stack={SOCIAL_HOME_STACK_LOCK} className={SOCIAL_FEED_CENTER_CLASS}>
      <div className="sr-only">
        <h1>{SOCIAL.home.title}</h1>
        <p>{SOCIAL.home.subtitle}</p>
      </div>
      {/* No Following / For you slider over the Feed (founder 2026-10-08,
          "only the slider"): the stories card leads the Feed. The For you
          rail on the right stays as it is.
          docs/design-locks/social-home-lane-tabs-lock-v1.md (retired) */}
      <SocialHomeColdSlot seedLane={lane} seedTopic={topic}>
        {/* Stories stay at the top of the Feed (founder 2026-10-06), in
            their own card, in both lanes, also when the one tile is the
            member's own Create story. Cards lock:
            docs/design-locks/social-feed-cards-lock-v1.md */}
        <SocialStoriesRail
          cards={rail}
          authors={authors}
          faces={faces}
          canCreate={!!profile}
          createName={profile?.display_name}
          createPhotoUrl={photoUrl}
          warmedThumbs={warmedThumbs}
        />
        {profile ? (
          <SocialHomeComposer authorName={profile.display_name} authorPhotoUrl={photoUrl} />
        ) : null}
        {/* Topics sit over the wall they filter (stories → composer →
            topics → wall). */}
        <SocialHomeTopics active={topic} lane={lane} />
        <div data-social-home-wall="" className={SOCIAL_FEED_WALL_CLASS}>
          {storiesPage.truncated ? (
            <InlineNotice tone="info" data-social-stories-truncated="">
              {SOCIAL.home.truncatedStories}
            </InlineNotice>
          ) : null}
          {followees.truncated ? (
            <InlineNotice tone="info" data-social-followees-truncated="">
              {SOCIAL.home.truncatedFollowees}
            </InlineNotice>
          ) : null}
          {lane === "for-you" ? (
            <SocialHomeForYouLane suggested={suggested} faces={faces} />
          ) : (
            <SocialFollowingWallBound
              viewerId={ctx.user.id}
              topic={topic}
              cursor={
                cursor
                  ? encodeFollowingWallCursor({ created_at: cursor.createdAt, id: cursor.id })
                  : null
              }
              wall={socialFollowingWallView({
                wall,
                authors,
                faces,
                groups,
                liked,
                media,
                canLike: !!profile,
                viewerId: ctx.user.id,
              })}
              reels={reels}
              empty={
                // The topic row above already marks the current topic: no
                // second filled "All" pill over the empty wall.
                <div data-social-following-empty="" className="flex flex-col gap-3">
                  <SocialHomeActivityEmpty findPeople={followees.ids.length === 0} />
                </div>
              }
            />
          )}
        </div>
      </SocialHomeColdSlot>
    </div>
  );
}

function SocialHomeForYouLane({
  suggested,
  faces,
}: {
  suggested: SocialSuggestedPerson[];
  faces: ReadonlyMap<string, string | null>;
}) {
  return (
    <div data-social-for-you-lane="" className="flex flex-col gap-3">
      {suggested.length === 0 ? (
        <SocialEmpty
          icon="users"
          title={SOCIAL.forYou.people}
          hint={SOCIAL.home.findPeopleHint}
          action={{ href: socialSearchHref({ intent: "people" }), label: SOCIAL.home.findPeople }}
        />
      ) : null}
      <SocialForYouRail people={suggested} faces={faces} layout="lane" />
    </div>
  );
}

