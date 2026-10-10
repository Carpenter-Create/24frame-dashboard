import type { createClient } from "@/lib/supabase/server";
import { socialProfileCacheKey, socialProfileHandleCacheKey } from "@/lib/social-cache-keys";
import type { SocialProfileRow } from "@/lib/social-feed";
import { socialHotSet, withSocialHotCache } from "@/lib/social-hot-cache";
import {
  HANDLE_MAX,
  HANDLE_MIN,
  normalizeDisplayName,
  profileInsertRow,
  SOCIAL,
  suggestedHandleCollisionSuffix,
  suggestedHandleSeed,
} from "@/lib/social";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export const SOCIAL_PROFILE_COLUMNS =
  "id, handle, display_name, status, bio, welcome_video_key, welcome_mux_asset_id, welcome_mux_playback_id, welcome_mux_upload_id, cover_key, crafts, topics, imdb_url, website_url";

export type SocialEnsureUser = {
  id: string;
  email: string;
  name?: string | null;
};

export type EnsureOwnSocialProfileResult = {
  profile: SocialProfileRow | null;
  error: string | null;
};

// Mapping C: stories.author_id → profiles.id. A signed-in account may post
// once this row exists. Only the session user is inserted — never an invitee
// or any other auth.users.id. Org invite / membership writes must not call this.

export function nextHandleCandidate(seed: string, userId: string, attempt: number): string {
  const suffix = suggestedHandleCollisionSuffix(userId, attempt);
  const room = HANDLE_MAX - suffix.length;
  const base = seed.slice(0, Math.max(HANDLE_MIN, room));
  return `${base}${suffix}`.slice(0, HANDLE_MAX);
}

export function isProfileUniqueViolation(error: { message: string; code?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || error.message.toLowerCase().includes("duplicate");
}

async function rememberOwnProfile(profile: SocialProfileRow): Promise<SocialProfileRow> {
  await socialHotSet(socialProfileCacheKey(profile.id), profile);
  if (profile.handle) await socialHotSet(socialProfileHandleCacheKey(profile.handle), profile);
  return profile;
}

function rowFromInsert(userId: string, handle: string, displayName: string): SocialProfileRow {
  return {
    id: userId,
    handle,
    display_name: displayName,
    status: "active",
    bio: null,
  };
}

export async function ensureOwnSocialProfile(
  supabase: ServerClient,
  user: SocialEnsureUser,
): Promise<SocialProfileRow | null> {
  const { profile } = await ensureOwnSocialProfileResult(supabase, user);
  return profile;
}

export async function ensureOwnSocialProfileResult(
  supabase: ServerClient,
  user: SocialEnsureUser,
): Promise<EnsureOwnSocialProfileResult> {
  const existing = await withSocialHotCache(socialProfileCacheKey(user.id), async () => {
    const { data } = await supabase
      .from("profiles")
      .select(SOCIAL_PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();
    return data ?? null;
  });
  if (existing) return { profile: existing, error: null };

  // Handle is identity. Do not invent a human name (Member, email local-part).
  const displayName = normalizeDisplayName(user.name ?? "") ?? "";
  const seed = suggestedHandleSeed(user.email, user.id);
  let handle = seed;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inserted = await insertOwnProfile(supabase, user.id, handle, displayName);
    if (inserted.profile) return { profile: await rememberOwnProfile(inserted.profile), error: null };
    if (inserted.raced) return { profile: await rememberOwnProfile(inserted.raced), error: null };
    if (inserted.unique) {
      handle = nextHandleCandidate(seed, user.id, attempt);
      continue;
    }

    const retried = await insertOwnProfile(supabase, user.id, handle, displayName);
    if (retried.profile) return { profile: await rememberOwnProfile(retried.profile), error: null };
    if (retried.raced) return { profile: await rememberOwnProfile(retried.raced), error: null };
    if (retried.unique) {
      handle = nextHandleCandidate(seed, user.id, attempt);
      continue;
    }
    return { profile: null, error: retried.error };
  }

  return { profile: null, error: SOCIAL.profile.handleTaken };
}

async function insertOwnProfile(
  supabase: ServerClient,
  userId: string,
  handle: string,
  displayName: string,
): Promise<{
  profile: SocialProfileRow | null;
  raced: SocialProfileRow | null;
  unique: boolean;
  error: string | null;
}> {
  const { error } = await supabase.from("profiles").insert(
    profileInsertRow({
      userId,
      handle,
      displayName,
    }),
  );
  if (!error) {
    return {
      profile: rowFromInsert(userId, handle, displayName),
      raced: null,
      unique: false,
      error: null,
    };
  }
  if (isProfileUniqueViolation(error)) {
    const { data: raced } = await supabase
      .from("profiles")
      .select(SOCIAL_PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    return { profile: null, raced: raced ?? null, unique: true, error: error.message };
  }
  return { profile: null, raced: null, unique: false, error: error.message };
}
