import "server-only";

import {
  socialMuxPlaybackMusicReleased,
  type SocialMusicPlaybackScan,
  type SocialMuxReleaseParent,
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
  author_id: string;
  status?: string;
  expires_at: string;
  media: unknown;
};

export type SocialMediaPostGrant = {
  author_id: string;
  status?: string;
  media: unknown;
};

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
          .select("author_id, status, expires_at, media")
          .eq("author_id", parsed.userId)
          .eq("status", "active")
          .gt("expires_at", now.toISOString())
          .contains("media", socialMediaJsonContains(key))
          .limit(8),
      ]);
      if (followError || storyError) return false;
      return socialMediaReadGrant({
        userId,
        key,
        now,
        followeeIds: follow?.followee_id ? [follow.followee_id] : [],
        stories: stories ?? [],
      });
    }
    const { data: posts, error } = await supabase
      .from("posts")
      .select("author_id, status, media")
      .eq("author_id", parsed.userId)
      .eq("status", "active")
      .contains("media", socialMediaJsonContains(key))
      .limit(8);
    if (error) return false;
    if (socialMediaReadGrant({ userId, key, now, posts: posts ?? [] })) return true;
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
    const needle = socialMuxPlaybackJsonContains(playbackId);
    const [{ data: posts, error: postError }, { data: stories, error: storyError }] = await Promise.all([
      supabase
        .from("posts")
        .select("id, author_id, status, media")
        .eq("status", "active")
        .contains("media", needle)
        .limit(8),
      supabase
        .from("stories")
        .select("id, author_id, status, expires_at, media")
        .eq("status", "active")
        .gt("expires_at", now.toISOString())
        .contains("media", needle)
        .limit(8),
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
    const postRows = posts ?? [];
    const granted = socialMuxPlaybackReadGrant({
      userId,
      playbackId,
      now,
      followeeIds,
      stories: storyRows,
      posts: postRows,
    });
    if (!granted) return false;
    const releaseParents = otherAuthorMuxReleaseParents({
      userId,
      playbackId,
      now,
      followeeIds,
      stories: storyRows,
      posts: postRows,
    });
    // The author's own video does not need a scan. Someone else's does,
    // and only that parent's scan counts.
    if (releaseParents.parents.length === 0 && !releaseParents.unresolved) return true;
    const release = await nonAuthorMuxPlaybackRelease(playbackId, releaseParents);
    if (release === "uninstalled") return true;
    return release === "allowed";
  } catch {
    return false;
  }
}

const RELEASE_PARENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ReleaseStoryRow = SocialMediaStoryGrant & { id?: string | null };
type ReleasePostRow = SocialMediaPostGrant & { id?: string | null };

function musicScanTableMissing(error: { code?: string; message?: string }): boolean {
  if (error.code === "42P01" || error.code === "PGRST205") return true;
  const message = error.message ?? "";
  return /social_music_scans/.test(message) && /does not exist|schema cache/i.test(message);
}

/**
 * Parents this viewer can play that belong to someone else. A row that
 * stores the playback id but has no id or asset id is unresolved: fail
 * closed once the scan table exists. The viewer's own rows are omitted.
 */
function otherAuthorMuxReleaseParents(input: {
  userId: string;
  playbackId: string;
  now: Date;
  followeeIds: readonly string[];
  stories: readonly ReleaseStoryRow[];
  posts: readonly ReleasePostRow[];
}): { parents: SocialMuxReleaseParent[]; unresolved: boolean } {
  const followees = new Set(input.followeeIds);
  const parents: SocialMuxReleaseParent[] = [];
  let unresolved = false;
  const consider = (
    row: { id?: string | null; author_id: string; media: unknown },
    surface: "post" | "story",
    lane: "posts" | "stories",
  ) => {
    if (row.author_id === input.userId) return;
    if (!mediaStoresPlaybackId(row.media, input.playbackId, row.author_id, lane)) return;
    const id = row.id ?? "";
    if (!RELEASE_PARENT_ID.test(id)) {
      unresolved = true;
      return;
    }
    let matched = false;
    for (const item of parsePostMedia(row.media)) {
      if (!isSocialMuxMediaItem(item) || item.playbackId !== input.playbackId) continue;
      if (!isOwnedSocialMediaKey(item.key, row.author_id, lane)) continue;
      const assetId = item.assetId?.trim() ?? "";
      if (!isSocialMuxId(assetId)) {
        unresolved = true;
        continue;
      }
      matched = true;
      parents.push({ surface, id, assetId, playbackId: input.playbackId });
    }
    if (!matched) unresolved = true;
  };
  for (const story of input.stories) {
    if (story.status !== "active" || !isStoryLive(story.expires_at, input.now)) continue;
    if (!followees.has(story.author_id)) continue;
    consider(story, "story", "stories");
  }
  for (const post of input.posts) {
    if (post.status !== "active") continue;
    consider(post, "post", "posts");
  }
  return { parents, unresolved };
}

type ScanReleaseRow = {
  post_id: string | null;
  story_id: string | null;
  asset_id: string;
  playback_id: string;
  status: string;
};

function playbackScans(rows: readonly ScanReleaseRow[]): SocialMusicPlaybackScan[] {
  return rows.flatMap((row) =>
    row.status === "pending" || row.status === "allowed" || row.status === "blocked"
      ? [
          {
            postId: row.post_id,
            storyId: row.story_id,
            assetId: row.asset_id,
            playbackId: row.playback_id,
            status: row.status,
          },
        ]
      : [],
  );
}

/**
 * Before the music migration, the scan table is absent and existing Mux
 * playback keeps the selectability grant. After it exists, someone else's
 * playback needs an allowed scan on the parent they can see.
 */
async function nonAuthorMuxPlaybackRelease(
  playbackId: string,
  release: { parents: readonly SocialMuxReleaseParent[]; unresolved: boolean },
): Promise<"allowed" | "held" | "uninstalled"> {
  try {
    const admin = createAdminClient();
    const postIds = [
      ...new Set(release.parents.filter((parent) => parent.surface === "post").map((parent) => parent.id)),
    ];
    const storyIds = [
      ...new Set(release.parents.filter((parent) => parent.surface === "story").map((parent) => parent.id)),
    ];
    if (postIds.length === 0 && storyIds.length === 0) {
      const { error } = await admin.from("social_music_scans").select("id").eq("playback_id", playbackId).limit(1);
      if (error) return musicScanTableMissing(error) ? "uninstalled" : "held";
      return "held";
    }
    const empty = Promise.resolve({ data: [] as ScanReleaseRow[], error: null });
    const [postScans, storyScans] = await Promise.all([
      postIds.length
        ? admin
            .from("social_music_scans")
            .select("post_id, story_id, asset_id, playback_id, status")
            .eq("playback_id", playbackId)
            .in("post_id", postIds)
        : empty,
      storyIds.length
        ? admin
            .from("social_music_scans")
            .select("post_id, story_id, asset_id, playback_id, status")
            .eq("playback_id", playbackId)
            .in("story_id", storyIds)
        : empty,
    ]);
    const error = postScans.error ?? storyScans.error;
    if (error) return musicScanTableMissing(error) ? "uninstalled" : "held";
    if (release.unresolved) return "held";
    const scans = playbackScans([...(postScans.data ?? []), ...(storyScans.data ?? [])]);
    return socialMuxPlaybackMusicReleased(release.parents, scans) ? "allowed" : "held";
  } catch {
    return "held";
  }
}
