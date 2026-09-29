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
import { cn } from "@/lib/cn";
import { SOCIAL_HOME_CENTER_CLASS, SOCIAL_HOME_LAYOUT_CLASS, SOCIAL_HOME_SPINE_CLASS, SOCIAL_PILL_ACTIVE_CLASS, SOCIAL_PILL_CLASS } from "@/lib/social-chrome";
import { signedAvatarUrls, signedSocialMediaByPostId } from "@/lib/social-edge";
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
    <div data-social-home="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <Suspense fallback={<SocialHomeCenterSkeleton />}>
        <SocialHomeCenter session={session} category={category} cursor={cursor} lane={lane} topic={topic} />
      </Suspense>
      <SocialHomeFollowingRail seedLane={lane} seedTopic={topic}>
        {lane === "following" ? (
          <Suspense fallback={<SocialForYouSkeleton />}>
            <SocialDesktopForYouSlot session={session} signCourseCovers={signedEducationCoverUrls} />
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
  const [wall, storiesPage, suggested] = await Promise.all([
    profile
      ? loadCachedFollowingPosts(supabase, ctx.user.id, authorIds, { category, cursor })
      : Promise.resolve({ posts: [], truncated: false, nextCursor: null }),
    loadLiveStories(supabase, authorIds),
    lane === "for-you"
      ? loadSuggestedPeople(supabase, [ctx.user.id, ...followees.ids], {
          topics: profile?.topics ?? [],
          crafts: profile?.crafts ?? [],
        })
      : Promise.resolve([]),
  ]);
  const posts = wall.posts;
  const stories = storiesPage.stories;
  const storyIds = stories.map((story) => story.id);
  const peopleIds = [
    ...new Set([
      ctx.user.id,
      ...posts.map((post) => post.author_id),
      ...stories.map((story) => story.author_id),
      ...suggested.map((person) => person.id),
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
  const photoUrl = faces.get(ctx.user.id) ?? null;

  return (
    <div data-social-home-stack={SOCIAL_HOME_STACK_LOCK} className={cn(SOCIAL_HOME_CENTER_CLASS, SOCIAL_HOME_SPINE_CLASS)}>
      <div className="sr-only">
        <h1>{SOCIAL.home.title}</h1>
        <p>{SOCIAL.home.subtitle}</p>
      </div>
      <SocialHomeTopics active={topic} lane={lane} />
      <SocialHomeColdSlot seedLane={lane} seedTopic={topic}>
        {profile ? (
          <SocialHomeComposer
            authorName={profile.display_name}
            authorHandle={profile.handle}
            authorPhotoUrl={photoUrl}
          />
        ) : null}
        <SocialStoriesRail
          cards={rail}
          authors={authors}
          faces={faces}
          canCreate={!!profile}
          createName={profile?.display_name}
          createPhotoUrl={photoUrl}
        />
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
            empty={
              <div data-social-following-empty="" className="flex flex-col gap-3">
                <div data-social-empty-lenses="" className="hidden md:block">
                  <span className={`${SOCIAL_PILL_CLASS} ${SOCIAL_PILL_ACTIVE_CLASS}`}>{SOCIAL_CATEGORY_ALL}</span>
                </div>
                <SocialHomeActivityEmpty findPeople={followees.ids.length === 0} />
              </div>
            }
          />
        )}
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

