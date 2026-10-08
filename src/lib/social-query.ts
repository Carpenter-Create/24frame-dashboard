import type { QueryClient } from "@tanstack/react-query";

import {
  socialCountsQueryKey,
  socialFollowQueryKey,
  socialFollowingWallQueryKey,
  socialProfileQueryKey,
} from "@/lib/social-cache-keys";
import { socialAvatarHref, socialMediaHref } from "@/lib/social-edge";

/** Presence only. The band is not a player and not a media URL. */
export const SOCIAL_WELCOME_VIDEO_PRESENT = "present";
import type { SocialProfileCounts } from "@/lib/social-feed";
import type { SocialProfileRow } from "@/lib/social-feed";

export type SocialProfileQueryRow = Pick<
  SocialProfileRow,
  | "id"
  | "handle"
  | "display_name"
  | "status"
  | "bio"
  | "welcome_video_key"
  | "welcome_mux_asset_id"
  | "welcome_mux_playback_id"
  | "welcome_mux_upload_id"
  | "cover_key"
  | "crafts"
  | "topics"
  | "imdb_url"
  | "website_url"
>;

export type SocialProfileFaceView = {
  handle: string;
  displayName: string;
  bio: string;
  photoUrl: string;
  coverUrl: string | null;
  welcomeVideoUrl: string | null;
  crafts: string[];
  topics: string[];
  imdbUrl: string | null;
  websiteUrl: string | null;
};

// Query row is SoT after boot. Cleared keys stay cleared — do not fall
// back to the first RSC face props.
export function socialProfileFaceFromRow(row: SocialProfileQueryRow): SocialProfileFaceView {
  return {
    handle: row.handle,
    displayName: row.display_name,
    bio: row.bio ?? "",
    photoUrl: socialAvatarHref(row.id),
    coverUrl: row.cover_key ? socialMediaHref(row.cover_key) : null,
    welcomeVideoUrl:
      row.welcome_video_key || row.welcome_mux_playback_id ? SOCIAL_WELCOME_VIDEO_PRESENT : null,
    crafts: row.crafts ?? [],
    topics: row.topics ?? [],
    imdbUrl: row.imdb_url ?? null,
    websiteUrl: row.website_url ?? null,
  };
}

// Optimistic Save / Follow: call these against the one App QueryClient.
// Do not fork a second cache. Local button override stays compatible.

export function applyOptimisticSocialProfile(
  queryClient: QueryClient,
  profile: SocialProfileQueryRow,
): void {
  queryClient.setQueryData(socialProfileQueryKey(profile.id), profile);
}

export function applyOptimisticSocialProfilePatch(
  queryClient: QueryClient,
  profileId: string,
  patch: Partial<SocialProfileQueryRow>,
): void {
  queryClient.setQueryData(socialProfileQueryKey(profileId), (old: SocialProfileQueryRow | undefined) =>
    old ? { ...old, ...patch } : old,
  );
}

export function applyOptimisticFollow(
  queryClient: QueryClient,
  input: { viewerId: string; targetId: string; following: boolean },
): void {
  queryClient.setQueryData(socialFollowQueryKey(input.viewerId, input.targetId), input.following);
  queryClient.setQueryData(
    socialCountsQueryKey(input.targetId),
    (old: SocialProfileCounts | undefined) =>
      old
        ? { ...old, followers: Math.max(0, old.followers + (input.following ? 1 : -1)) }
        : old,
  );
  queryClient.setQueryData(
    socialCountsQueryKey(input.viewerId),
    (old: SocialProfileCounts | undefined) =>
      old
        ? { ...old, following: Math.max(0, old.following + (input.following ? 1 : -1)) }
        : old,
  );
  void queryClient.invalidateQueries({ queryKey: ["social", "following-wall", input.viewerId] });
}

export function invalidateSocialQueries(
  queryClient: QueryClient,
  input: { profileId?: string; viewerId?: string; targetId?: string },
): void {
  if (input.profileId) {
    void queryClient.invalidateQueries({ queryKey: socialProfileQueryKey(input.profileId) });
    void queryClient.invalidateQueries({ queryKey: socialCountsQueryKey(input.profileId) });
  }
  if (input.viewerId && input.targetId) {
    void queryClient.invalidateQueries({ queryKey: socialFollowQueryKey(input.viewerId, input.targetId) });
    void queryClient.invalidateQueries({ queryKey: socialCountsQueryKey(input.viewerId) });
    void queryClient.invalidateQueries({ queryKey: socialCountsQueryKey(input.targetId) });
    void queryClient.invalidateQueries({ queryKey: socialFollowingWallQueryKey(input.viewerId) });
  }
}
