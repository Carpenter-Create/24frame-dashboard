import "server-only";

import {
  socialMuxPlaybackMusicReleased,
  type SocialPlaybackParent,
  type SocialPlaybackScan,
} from "@/lib/social-music-scan";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  isForbiddenMediaKey,
  isOwnedSocialMediaKey,
  isSocialMuxMediaItem,
  parsePostMedia,
  parseSocialMediaObjectKey,
} from "@/lib/social-media";
import { isSocialMuxId } from "@/lib/social-mux";
import { isStoryLive } from "@/lib/social-stories";

// GC-P1-3. Sign /api/social/media only for a key attached to a row the
// caller can select: post media, a non-expired story visible under
// stories_select (active, expires_at still ahead, author or follow), or the
// current cover of a profile visible under profiles_select (founder
// 2026-10-03: anyone who can see the profile sees its cover).
// isForbiddenMediaKey is a shape check, not a grant. Prefix ownership and
// the welcome video do not sign.
// The read uses the user-scoped client, so posts_select and stories_select
// stay the authorization layer. Story follow and expires_at are checked
// again so a returned row that fails them is still denied. Fail closed.

export type SocialMediaStoryGrant = {
  id?: string;
  author_id: string;
  status?: string;
  expires_at: string;
  media: unknown;
};

export type SocialMediaPostGrant = {
  id?: string;
  author_id: string;
  status?: string;
  media: unknown;
};

const SOCIAL_VIDEO_FILE = /\.(mp4|mov|webm|m4v)$/i;

function mediaStoresKey(media: unknown, key: string): boolean {
  return parsePostMedia(media).some((item) => item.key === key);
}

/**
 * jsonb `@>` value for `.contains`.
 * postgrest-js@2.110.6 serializes arrays as `cs.{join}` and objects as
 * `[object Object]`. A JSON string is sent as `cs.<json>`.
 */
export function socialMediaJsonContains(key: string): string {
  return JSON.stringify([{ key }]);
}

/** jsonb `@>` needle for a Mux playback id stored on post or story media. */
export function socialMuxPlaybackJsonContains(playbackId: string): string {
  return JSON.stringify([{ playbackId }]);
}

/** Mint lookup: a Mux video item, not an image that happens to carry the id. */
export function socialMuxVideoPlaybackJsonContains(playbackId: string): string {
  return JSON.stringify([{ kind: "video", provider: "mux", playbackId }]);
}

function mediaStoresPlaybackId(
  media: unknown,
  playbackId: string,
  authorId: string,
  lane: "stories" | "posts",
): boolean {
  return parsePostMedia(media).some(
    (item) =>
      isSocialMuxMediaItem(item) &&
      item.playbackId === playbackId &&
      isOwnedSocialMediaKey(item.key, authorId, lane),
  );
}

/**
 * Mint /api/social/mux-playback only when a post or story row this session
 * can select stores the playback id. posts_select and stories_select stay
 * the authorization layer. Story follow and expires_at are checked again.
 * A playback id alone is not a grant. Fail closed.
 */
export function socialMuxPlaybackReadGrant(input: {
  userId: string;
  playbackId: string;
  now?: Date;
  followeeIds?: readonly string[];
  stories?: readonly SocialMediaStoryGrant[];
  posts?: readonly SocialMediaPostGrant[];
}): boolean {
  if (!input.userId || !isSocialMuxId(input.playbackId)) return false;
  const now = input.now ?? new Date();
  const followees = new Set(input.followeeIds ?? []);
  const storyVisible = (input.stories ?? []).some((story) => {
    if (story.status !== "active") return false;
    if (!isStoryLive(story.expires_at, now)) return false;
    if (story.author_id !== input.userId && !followees.has(story.author_id)) return false;
    return mediaStoresPlaybackId(story.media, input.playbackId, story.author_id, "stories");
  });
  if (storyVisible) return true;
  return (input.posts ?? []).some((post) => {
    if (post.status !== "active") return false;
    return mediaStoresPlaybackId(post.media, input.playbackId, post.author_id, "posts");
  });
}

export function socialMediaReadGrant(input: {
  userId: string;
  key: string;
  now?: Date;
  followeeIds?: readonly string[];
  stories?: readonly SocialMediaStoryGrant[];
  posts?: readonly SocialMediaPostGrant[];
}): boolean {
  if (!input.userId || isForbiddenMediaKey(input.key)) return false;
  const parsed = parseSocialMediaObjectKey(input.key);
  if (!parsed) return false;
  const now = input.now ?? new Date();
  if (parsed.lane === "stories") {
    const followees = new Set(input.followeeIds ?? []);
    return (input.stories ?? []).some((story) => {
      if (story.status !== "active") return false;
      if (!isStoryLive(story.expires_at, now)) return false;
      if (story.author_id !== input.userId && !followees.has(story.author_id)) return false;
      if (!isOwnedSocialMediaKey(input.key, story.author_id, "stories")) return false;
      return mediaStoresKey(story.media, input.key);
    });
  }
  return (input.posts ?? []).some((post) => {
    if (post.status !== "active") return false;
    if (!isOwnedSocialMediaKey(input.key, post.author_id, "posts")) return false;
    return mediaStoresKey(post.media, input.key);
  });
}

export type SocialProfileCoverGrant = {
  id: string;
  cover_key: string | null;
};

const SOCIAL_COVER_IMAGE_KEY = /\.(jpe?g|png|webp|gif)$/i;

/**
 * A profile's current cover: the key must equal cover_key on a profile row
 * this session can select, sit in that profile's own posts lane, and be an
 * image. A replaced cover stops signing.
 */
export function socialProfileCoverReadGrant(input: {
  userId: string;
  key: string;
  profile: SocialProfileCoverGrant | null | undefined;
}): boolean {
  if (!input.userId || isForbiddenMediaKey(input.key) || !input.profile) return false;
  const { id, cover_key: coverKey } = input.profile;
  return (
    coverKey === input.key &&
    isOwnedSocialMediaKey(input.key, id, "posts") &&
    SOCIAL_COVER_IMAGE_KEY.test(input.key)
  );
}

export async function viewerMaySignSocialMedia(userId: string, key: string, now = new Date()): Promise<boolean> {
  if (!userId || isForbiddenMediaKey(key)) return false;
  const parsed = parseSocialMediaObjectKey(key);
  if (!parsed) return false;
  try {
    const supabase = await createClient();
    if (parsed.lane === "stories") {
      const [{ data: follow, error: followError }, { data: stories, error: storyError }] = await Promise.all([
        supabase
          .from("follows")
          .select("followee_id")
          .eq("follower_id", userId)
          .eq("followee_id", parsed.userId)
          .maybeSingle(),
        supabase
          .from("stories")
          .select("id, author_id, status, expires_at, media")
          .eq("author_id", parsed.userId)
          .eq("status", "active")
          .gt("expires_at", now.toISOString())
          .contains("media", socialMediaJsonContains(key))
          .limit(8),
      ]);
      if (followError || storyError) return false;
      const storyRows = stories ?? [];
      if (
        !socialMediaReadGrant({
          userId,
          key,
          now,
          followeeIds: follow?.followee_id ? [follow.followee_id] : [],
          stories: storyRows,
        })
      ) {
        return false;
      }
      if (SOCIAL_VIDEO_FILE.test(key)) return false;
      return true;
    }
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, author_id, status, media")
      .eq("author_id", parsed.userId)
      .eq("status", "active")
      .contains("media", socialMediaJsonContains(key))
      .limit(8);
    if (error) return false;
    const postRows = posts ?? [];
    if (socialMediaReadGrant({ userId, key, now, posts: postRows })) {
      if (SOCIAL_VIDEO_FILE.test(key)) return false;
      return true;
    }
    // Not post media: maybe the author's current cover, under profiles_select.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, cover_key")
      .eq("id", parsed.userId)
      .eq("cover_key", key)
      .maybeSingle();
    if (profileError) return false;
    return socialProfileCoverReadGrant({ userId, key, profile });
  } catch {
    return false;
  }
}

export async function viewerMayMintSocialMuxPlayback(
  userId: string,
  playbackId: string,
  now = new Date(),
): Promise<boolean> {
  if (!userId || !isSocialMuxId(playbackId)) return false;
  try {
    const supabase = await createClient();
    const needle = socialMuxVideoPlaybackJsonContains(playbackId);
    const [{ data: posts, error: postError }, { data: stories, error: storyError }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, author_id, status, media")
        .eq("status", "active")
        .contains("media", needle)
        .order("id", { ascending: true }),
      supabase
        .from("stories")
        .select("id, author_id, status, expires_at, media")
        .eq("status", "active")
        .gt("expires_at", now.toISOString())
        .contains("media", needle)
        .order("id", { ascending: true }),
    ]);
    if (postError || storyError) return false;
    const storyRows = stories ?? [];
    const otherAuthors = [...new Set(storyRows.map((row) => row.author_id).filter((id) => id && id !== userId))];
    let followeeIds: string[] = [];
    if (otherAuthors.length > 0) {
      const { data: follows, error: followError } = await supabase
        .from("follows")
        .select("followee_id")
        .eq("follower_id", userId)
        .in("followee_id", otherAuthors);
      if (followError) return false;
      followeeIds = (follows ?? []).flatMap((row) => (row.followee_id ? [row.followee_id] : []));
    }
    const granted = socialMuxPlaybackReadGrant({
      userId,
      playbackId,
      now,
      followeeIds,
      stories: storyRows,
      posts: posts ?? [],
    });
    if (!granted) return false;
    const postRows = posts ?? [];
    const sharesWithSomeoneElse =
      storyRows.some(
        (story) =>
          story.author_id !== userId &&
          mediaStoresPlaybackId(story.media, playbackId, story.author_id, "stories"),
      ) ||
      postRows.some(
        (post) =>
          post.author_id !== userId &&
          mediaStoresPlaybackId(post.media, playbackId, post.author_id, "posts"),
      );
    if (!sharesWithSomeoneElse) return true;
    const parents = muxParentsForPlayback(userId, playbackId, followeeIds, postRows, storyRows, now);
    return muxPlaybackReleased(playbackId, parents);
  } catch {
    return false;
  }
}

function muxParentsForPlayback(
  userId: string,
  playbackId: string,
  followeeIds: readonly string[],
  posts: readonly (SocialMediaPostGrant & { id?: string })[],
  stories: readonly (SocialMediaStoryGrant & { id?: string })[],
  now: Date,
): SocialPlaybackParent[] {
  const parents: SocialPlaybackParent[] = [];
  for (const post of posts) {
    if (!post.id || post.status !== "active") continue;
    if (post.author_id === userId) continue;
    if (!mediaStoresPlaybackId(post.media, playbackId, post.author_id, "posts")) continue;
    parents.push({ id: post.id, surface: "post" });
  }
  for (const story of stories) {
    if (!story.id || story.author_id === userId) continue;
    if (story.status !== "active" || !isStoryLive(story.expires_at, now)) continue;
    if (!followeeIds.includes(story.author_id)) continue;
    if (!mediaStoresPlaybackId(story.media, playbackId, story.author_id, "stories")) continue;
    parents.push({ id: story.id, surface: "story" });
  }
  return parents;
}

/**
 * Any blocked row for this playback id denies. A pending row on another
 * parent does not. The visible parent still needs its own allowed scan.
 * A missing table or a read error denies.
 */
async function muxPlaybackReleased(
  playbackId: string,
  parents: readonly SocialPlaybackParent[],
): Promise<boolean> {
  if (parents.length === 0) return false;
  try {
    const admin = createAdminClient();
    const holding = await admin
      .from("social_music_scans")
      .select("id")
      .eq("playback_id", playbackId)
      .eq("status", "blocked")
      .limit(1);
    if (holding.error || (holding.data?.length ?? 0) > 0) return false;
    const scans: SocialPlaybackScan[] = [];
    for (const parent of parents) {
      const column = parent.surface === "post" ? "post_id" : "story_id";
      const allowed = await admin
        .from("social_music_scans")
        .select("id, playback_id, status, post_id, story_id")
        .eq("playback_id", playbackId)
        .eq("status", "allowed")
        .eq(column, parent.id)
        .limit(1);
      if (allowed.error) return false;
      for (const row of allowed.data ?? []) {
        if (row.status !== "allowed") continue;
        scans.push({
          playbackId: row.playback_id,
          status: "allowed",
          postId: row.post_id,
          storyId: row.story_id,
        });
      }
    }
    return socialMuxPlaybackMusicReleased(playbackId, parents, scans);
  } catch {
    return false;
  }
}

/**
 * Other people see a welcome video only after that profile's Mux pair is allowed.
 * The owner still sees their own marker. A legacy S3 key stays hidden from others.
 * A missing scan table or a read error hides it.
 */
export async function welcomeVideoVisible(input: {
  viewerId: string;
  profileId: string;
  welcomeVideoKey: string | null;
  assetId: string | null;
  playbackId: string | null;
}): Promise<boolean> {
  const hasMarker = Boolean(input.welcomeVideoKey || (input.assetId && input.playbackId));
  if (!input.viewerId || !input.profileId || !hasMarker) return false;
  if (input.viewerId === input.profileId) return true;
  if (!input.assetId || !input.playbackId) return false;
  try {
    const admin = createAdminClient();
    const blocked = await admin
      .from("social_music_scans")
      .select("id")
      .eq("asset_id", input.assetId)
      .eq("playback_id", input.playbackId)
      .eq("status", "blocked")
      .limit(1);
    if (blocked.error || (blocked.data?.length ?? 0) > 0) return false;
    const { data, error } = await admin
      .from("social_music_scans")
      .select("id")
      .eq("surface", "welcome")
      .eq("profile_id", input.profileId)
      .eq("asset_id", input.assetId)
      .eq("playback_id", input.playbackId)
      .eq("status", "allowed")
      .limit(1);
    if (error || !data || data.length === 0) return false;
    return true;
  } catch {
    return false;
  }
}
