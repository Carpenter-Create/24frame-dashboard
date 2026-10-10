"use server";

import {
  loadCachedFolloweeIds,
  loadCachedFollowingPosts,
  loadCachedIsFollowing,
  loadCachedProfileSocialCounts,
  loadCachedSocialProfileById,
} from "@/lib/social-hot-reads";
import {
  parseSocialCategoryParam,
  SOCIAL_CATEGORY_ALL,
} from "@/lib/social-categories";
import { signedAvatarUrls, signedSocialMediaByPostId } from "@/lib/social-edge";
import { loadGroupsByIds, loadLikedPostIds, loadProfilesByIds } from "@/lib/social-feed";
import type { SocialProfileCounts, SocialProfileRow } from "@/lib/social-feed";
import { socialFollowingWallView, type SocialFollowingWallView } from "@/lib/social-following-wall";
import { loadOwnMusicNotices, mediaWithoutHeldPlayback } from "@/lib/social-music-scan";
import { followingAuthorIds } from "@/lib/social-home";
import { parseFollowingWallCursorParam } from "@/lib/social-home-bounds";
import { loadSocialSession } from "@/lib/social-session";

export async function readSocialProfile(profileId: string): Promise<SocialProfileRow | null> {
  const session = await loadSocialSession();
  if (!session || !profileId) return null;
  return loadCachedSocialProfileById(session.supabase, profileId);
}

export async function readSocialCounts(profileId: string): Promise<SocialProfileCounts | null> {
  const session = await loadSocialSession();
  if (!session || !profileId) return null;
  return loadCachedProfileSocialCounts(session.supabase, profileId);
}

export async function readSocialFollowState(targetId: string): Promise<boolean> {
  const session = await loadSocialSession();
  if (!session || !targetId) return false;
  return loadCachedIsFollowing(session.supabase, session.ctx.user.id, targetId);
}

export async function readSocialFollowingWall(input: {
  topic?: string;
  cursor?: string | null;
}): Promise<SocialFollowingWallView | null> {
  const session = await loadSocialSession();
  if (!session) return null;
  const [followees, viewer] = await Promise.all([
    loadCachedFolloweeIds(session.supabase, session.ctx.user.id),
    loadCachedSocialProfileById(session.supabase, session.ctx.user.id),
  ]);
  const topic = parseSocialCategoryParam(input.topic);
  const category = topic === SOCIAL_CATEGORY_ALL ? null : topic;
  const wall = await loadCachedFollowingPosts(
    session.supabase,
    session.ctx.user.id,
    followingAuthorIds(session.ctx.user.id, followees.ids),
    { category, cursor: parseFollowingWallCursorParam(input.cursor ?? undefined) },
  );
  const authorIds = [...new Set(wall.posts.map((post) => post.author_id))];
  const groupIds = [...new Set(wall.posts.map((post) => post.group_id).filter((id): id is string => !!id))];
  const [authors, groups, liked] = await Promise.all([
    loadProfilesByIds(session.supabase, authorIds),
    loadGroupsByIds(session.supabase, groupIds),
    loadLikedPostIds(
      session.supabase,
      session.ctx.user.id,
      wall.posts.map((post) => post.id),
    ),
  ]);
  const music = await loadOwnMusicNotices(session.supabase, session.ctx.user.id, {
    postIds: wall.posts.map((post) => post.id),
  });
  return socialFollowingWallView({
    wall,
    authors,
    faces: signedAvatarUrls(authorIds),
    groups,
    liked,
    media: new Map(
      [...signedSocialMediaByPostId(wall.posts).entries()].map(([id, items]) => [
        id,
        mediaWithoutHeldPlayback(items, music.withheldPostIds.has(id)),
      ]),
    ),
    canLike: !!viewer,
    viewerId: session.ctx.user.id,
    musicNotices: music.posts,
  });
}
