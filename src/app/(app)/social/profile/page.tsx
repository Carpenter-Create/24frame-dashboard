import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { HouseLink } from "@/components/chrome/house-link";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SocialProfileCreateForm } from "@/components/social/social-profile-create-form";
import { SocialProfileTabPanels } from "@/components/social/social-profile-tab-panels";
import { SocialQueryBound } from "@/components/social/social-query-bound";
import { SocialShareButton } from "@/components/social/social-share-button";
import { signSocialForYouCourseCovers } from "@/components/social/social-for-you-covers";
import { SocialDesktopForYouSlot } from "@/components/social/social-for-you-slot";
import { SocialForYouSkeleton, SocialProfileCenterSkeleton } from "@/components/social/social-skeletons";
import { SocialOwnProfileFace } from "@/components/social/social-own-profile";
import { socialAuthorPostCard } from "@/lib/social-author-post-card";
import { loadOwnMusicNotices, mediaWithoutHeldPlayback } from "@/lib/social-music-scan";
import {
  SOCIAL_HOME_LAYOUT_CLASS,
  SOCIAL_PAGE_CLASS,
  SOCIAL_PROFILE_ACTION_PILL_CLASS,
  SOCIAL_PROFILE_CENTER_CLASS,
} from "@/lib/social-chrome";
import {
  signedAvatarUrls,
  signedSocialMediaByPostId,
  socialAvatarHref,
  socialMediaHref,
} from "@/lib/social-edge";
import { SOCIAL_WELCOME_VIDEO_PRESENT } from "@/lib/social-query";
import {
  isLegacySocialProfilePostsTab,
  parseSocialProfileTab,
  SOCIAL,
  SOCIAL_PROFILE_TAB_PARAM,
  SOCIAL_ROUTES,
  socialPersonLabel,
  socialProfileLegacyPostsTabHref,
  socialRelativeTime,
  socialStoryHref,
  type SocialProfileTab,
} from "@/lib/social";
import {
  parseSocialActivityPill,
  SOCIAL_ACTIVITY_PILL_PARAM,
  socialActivityMediaPostIds,
  type SocialActivityPill,
} from "@/lib/social-activity";
import {
  loadAuthorActivityComments,
  loadAuthorActivityPosts,
  loadLikedPostIds,
  loadLiveStories,
  loadProfilesByIds,
} from "@/lib/social-feed";
import { loadCachedProfileSocialCounts } from "@/lib/social-hot-reads";
import { ensureOwnSocialProfileResult } from "@/lib/social-profile";
import { loadOwnSocialProfileCoverFraming } from "@/lib/social-profile-cover-source";
import {
  mergeSocialProfileIdentity,
  readSocialProfileOptimisticCookie,
} from "@/lib/social-profile-edit";
import { requireSocialSession, type SocialSession } from "@/lib/social-session";

export const runtime = "nodejs";

export default async function SocialProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
} = {}) {
  const [session, sp] = await Promise.all([
    requireSocialSession(),
    searchParams ? searchParams : Promise.resolve({} as Record<string, string | string[] | undefined>),
  ]);
  const rawTab = sp[SOCIAL_PROFILE_TAB_PARAM];
  if (isLegacySocialProfilePostsTab(rawTab)) {
    redirect(socialProfileLegacyPostsTabHref(SOCIAL_ROUTES.profile));
  }
  const tab = parseSocialProfileTab(rawTab);
  const activity = parseSocialActivityPill(sp[SOCIAL_ACTIVITY_PILL_PARAM]);
  const { profile, error: ensureError } = await ensureOwnSocialProfileResult(session.supabase, session.ctx.user);

  if (!profile) {
    return (
      <div data-social-profile="" className={SOCIAL_PAGE_CLASS}>
        <h1 className="sr-only">{SOCIAL.profile.title}</h1>
        <div className="flex flex-col gap-[var(--space-4)]">
          {ensureError ? <InlineNotice tone="error">{ensureError}</InlineNotice> : null}
          <SocialProfileCreateForm />
        </div>
      </div>
    );
  }

  return (
    <div data-social-profile="" className={SOCIAL_HOME_LAYOUT_CLASS}>
      <Suspense fallback={<SocialProfileCenterSkeleton />}>
        <SocialProfileMain session={session} tab={tab} activity={activity} />
      </Suspense>
      <Suspense fallback={<SocialForYouSkeleton />}>
        <SocialDesktopForYouSlot session={session} signCourseCovers={signSocialForYouCourseCovers} />
      </Suspense>
    </div>
  );
}

async function SocialProfileMain({
  session,
  tab,
  activity,
}: {
  session: SocialSession;
  tab: SocialProfileTab;
  activity: SocialActivityPill;
}) {
  const { ctx, supabase } = session;
  const { profile } = await ensureOwnSocialProfileResult(supabase, ctx.user);
  if (!profile) return null;

  const [photoUrl, coverUrl, coverFraming, liveStoriesPage, counts, jar, commentsPage, postsPage] =
    await Promise.all([
      Promise.resolve(socialAvatarHref(profile.id)),
      Promise.resolve(profile.cover_key ? socialMediaHref(profile.cover_key) : null),
      profile.cover_key ? loadOwnSocialProfileCoverFraming(supabase, ctx.user.id) : Promise.resolve(null),
      loadLiveStories(supabase, [profile.id]),
      loadCachedProfileSocialCounts(supabase, profile.id),
      cookies(),
      loadAuthorActivityComments(supabase, profile.id),
      loadAuthorActivityPosts(supabase, profile.id, "posts"),
    ]);
  const identity = mergeSocialProfileIdentity(
    {
      handle: profile.handle,
      displayName: profile.display_name,
      photoUrl,
      coverUrl,
      bio: profile.bio ?? "",
      crafts: profile.crafts ?? [],
      topics: profile.topics ?? [],
      websiteUrl: profile.website_url ?? null,
      imdbUrl: profile.imdb_url ?? null,
      welcomeVideoUrl:
        profile.welcome_video_key || profile.welcome_mux_playback_id ? SOCIAL_WELCOME_VIDEO_PRESENT : null,
    },
    readSocialProfileOptimisticCookie((name) => jar.get(name)?.value),
  );
  const liveStories = liveStoriesPage.stories;
  const commentParentPosts = commentsPage.items.map((item) => item.post);
  const activityFeedPosts = postsPage.posts;
  const cardPosts = [...activityFeedPosts, ...commentParentPosts];
  const parentAuthorIds = [...new Set(commentParentPosts.map((post) => post.author_id))];
  const parentAuthors =
    parentAuthorIds.length > 0 ? await loadProfilesByIds(supabase, parentAuthorIds) : new Map();
  const [media, liked, parentFaces] = await Promise.all([
    signedSocialMediaByPostId(cardPosts),
    loadLikedPostIds(
      supabase,
      ctx.user.id,
      cardPosts.map((post) => post.id),
    ),
    parentAuthorIds.length > 0
      ? signedAvatarUrls(parentAuthorIds)
      : Promise.resolve(new Map<string, string | null>()),
  ]);
  const mediaIds = socialActivityMediaPostIds(activityFeedPosts);
  const music = await loadOwnMusicNotices(supabase, ctx.user.id, {
    postIds: cardPosts.map((post) => post.id),
  });

  const highlightCards = liveStories.map((story) => ({
    id: story.id,
    href: socialStoryHref(story.id),
    label: socialRelativeTime(story.created_at),
    photoUrl,
  }));

  return (
    <div className={SOCIAL_PROFILE_CENTER_CLASS}>
      <h1 className="sr-only">{SOCIAL.profile.title}</h1>
      <SocialQueryBound profile={profile} counts={counts} />
      <SocialOwnProfileFace
        handle={identity.handle}
        displayName={identity.displayName}
        photoUrl={identity.photoUrl}
        coverUrl={identity.coverUrl}
        coverFraming={coverFraming}
        bio={identity.bio}
        fallbackBio={SOCIAL.profile.ownFace}
        crafts={identity.crafts}
        topics={identity.topics}
        websiteUrl={identity.websiteUrl}
        imdbUrl={identity.imdbUrl}
        welcomeVideoUrl={identity.welcomeVideoUrl}
        welcomeNotice={music.welcome}
        ring={liveStories.length > 0 ? "live" : null}
        profileId={profile.id}
        stats={counts ?? undefined}
        actions={
          <>
            <HouseLink href={SOCIAL_ROUTES.profileEdit} className={SOCIAL_PROFILE_ACTION_PILL_CLASS}>
              {SOCIAL.profile.edit}
            </HouseLink>
            <SocialShareButton handle={identity.handle} />
          </>
        }
      />
      <SocialProfileTabPanels
        baseHref={SOCIAL_ROUTES.profile}
        seedTab={tab}
        seedActivity={activity}
        creditsHint={SOCIAL.profile.creditsEmptyOwnHint}
        highlights={highlightCards}
        topics={identity.topics}
        interestsOwner
        activity={{
          posts: activityFeedPosts.map((post) =>
            socialAuthorPostCard({
              post,
              authorHandle: profile.handle,
              authorName: socialPersonLabel({
                handle: profile.handle,
                displayName: profile.display_name,
              }),
              authorPhotoUrl: photoUrl,
              liked: liked.has(post.id),
              canLike: true,
              media: mediaWithoutHeldPlayback(media.get(post.id) ?? [], music.withheldPostIds.has(post.id)),
              owned: true,
              musicNotice: music.posts.get(post.id) ?? null,
            }),
          ),
          imageIds: mediaIds.imageIds,
          videoIds: mediaIds.videoIds,
          postsTruncated: postsPage.truncated,
          commentsTruncated: commentsPage.truncated,
          comments: commentsPage.items.map((item) => {
            const author = parentAuthors.get(item.post.author_id);
            return {
              commentId: item.comment.id,
              body: item.comment.body,
              commentedAt: item.comment.created_at,
              post: socialAuthorPostCard({
                post: item.post,
                authorHandle: author?.handle ?? profile.handle,
                authorName: socialPersonLabel({
                  handle: author?.handle ?? profile.handle,
                  displayName: author?.display_name ?? profile.display_name,
                }),
                authorPhotoUrl: parentFaces.get(item.post.author_id) ?? photoUrl,
                liked: liked.has(item.post.id),
                canLike: true,
                media: mediaWithoutHeldPlayback(
                  media.get(item.post.id) ?? [],
                  music.withheldPostIds.has(item.post.id),
                ),
                owned: item.post.author_id === profile.id,
                musicNotice:
                  item.post.author_id === profile.id ? (music.posts.get(item.post.id) ?? null) : null,
              }),
            };
          }),
        }}
      />
    </div>
  );
}
