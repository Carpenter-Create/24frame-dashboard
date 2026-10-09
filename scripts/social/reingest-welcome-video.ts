/**
 * Re-ingest Social S3 video (posts, stories, welcome) onto Mux.
 * Dry-run is the default. Pass --execute to create assets and bindings.
 * Do not run this against production from CI. Adam runs it after the SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/reingest-welcome-video.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/reingest-welcome-video.ts --execute
 *
 * Welcome progress is select-then-insert. The partial unique index does not
 * match ON CONFLICT (profile_id, playback_id). Every Supabase error is thrown.
 */
import { createSocialMuxAssetFromUrl, deleteSocialMuxAsset, recordSocialMuxBinding, retrieveSocialMuxAsset, signedPlaybackIdFromAsset } from "@/lib/social-mux-server";
import { socialVideoKeyDigest } from "@/lib/social-music-scan";
import {
  reingestSocialS3Videos,
  SOCIAL_REINGEST_RETRY_ERRORS,
  SOCIAL_REINGEST_TERMINAL_ERRORS,
  socialReingestKeyForDigest,
  socialReingestMediaWithMux,
  type SocialReingestCandidate,
  type SocialReingestSurface,
} from "@/lib/social-welcome-reingest";
import { headSocialMediaObject, presignSocialMediaGet } from "@/lib/s3-social-media";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSocialMuxId } from "@/lib/social-mux";

const execute = process.argv.includes("--execute");

function muxId(value: string | null | undefined): string | null {
  return value && isSocialMuxId(value) ? value : null;
}

function assertOk(error: { message: string } | null, label: string): void {
  if (error) throw new Error(`${label}: ${error.message}`);
}

function welcomeDigest(profileId: string): string {
  return profileId.replace(/-/g, "").slice(0, 32);
}

async function loadCandidates(): Promise<SocialReingestCandidate[]> {
  const admin = createAdminClient();
  const { data: scans, error } = await admin
    .from("social_music_scans")
    .select("surface, post_id, story_id, profile_id, author_id, asset_id, playback_id, upload_id, last_error")
    .in("last_error", [...SOCIAL_REINGEST_RETRY_ERRORS])
    .eq("status", "pending");
  assertOk(error, "s3 scan read");
  const rows: SocialReingestCandidate[] = [];
  for (const scan of scans ?? []) {
    const surface = scan.surface;
    if (surface !== "post" && surface !== "story") continue;
    const parentId = surface === "post" ? scan.post_id : scan.story_id;
    if (!parentId) continue;
    const parent =
      surface === "story"
        ? await admin.from("stories").select("media, expires_at").eq("id", parentId).maybeSingle()
        : await admin.from("posts").select("media").eq("id", parentId).maybeSingle();
    assertOk(parent.error, "parent read");
    const media = Array.isArray(parent.data?.media) ? parent.data.media : [];
    const digest = scan.asset_id || scan.playback_id;
    const key = typeof digest === "string" ? socialReingestKeyForDigest(media, digest) : null;
    if (!key) continue;
    const expiresAt = parent.data && "expires_at" in parent.data ? parent.data.expires_at : null;
    const expired = surface === "story" && typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now();
    rows.push({
      surface,
      parentId,
      authorId: scan.author_id,
      key,
      expired,
      assetId: muxId(scan.upload_id),
      playbackId: null,
    });
  }
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, welcome_video_key, welcome_mux_asset_id, welcome_mux_playback_id")
    .not("welcome_video_key", "is", null);
  assertOk(profileError, "welcome profile read");
  for (const profile of profiles ?? []) {
    if (!profile.welcome_video_key) continue;
    const progress = await admin
      .from("social_music_scans")
      .select("upload_id")
      .eq("profile_id", profile.id)
      .eq("last_error", "welcome_reingest_preparing")
      .not("upload_id", "is", null)
      .limit(1)
      .maybeSingle();
    assertOk(progress.error, "welcome progress read");
    rows.push({
      surface: "welcome",
      parentId: profile.id,
      authorId: profile.id,
      key: profile.welcome_video_key,
      expired: false,
      assetId: muxId(profile.welcome_mux_asset_id) ?? muxId(progress.data?.upload_id),
      playbackId: profile.welcome_mux_playback_id,
    });
  }
  return rows;
}

async function retirePlaceholder(
  admin: ReturnType<typeof createAdminClient>,
  surface: SocialReingestSurface,
  parentId: string,
): Promise<void> {
  const column = surface === "post" ? "post_id" : surface === "story" ? "story_id" : "profile_id";
  const { error } = await admin
    .from("social_music_scans")
    .update({ next_attempt_at: null, last_error: "superseded" })
    .eq(column, parentId)
    .in("last_error", ["s3_video_needs_mux", "welcome_reingest_preparing", "reingest_failed"]);
  assertOk(error, "retire s3 scan");
}

async function main(): Promise<void> {
  const admin = createAdminClient();
  const candidates = await loadCandidates();
  const report = await reingestSocialS3Videos({
    execute,
    candidates,
    deps: {
      head: async (key) => {
        const head = await headSocialMediaObject(key);
        return Boolean(head && head.bytes > 0);
      },
      presign: (key) => presignSocialMediaGet(key),
      createAsset: (url) => createSocialMuxAssetFromUrl(url),
      loadAsset: async (assetId) => {
        const asset = await retrieveSocialMuxAsset(assetId);
        return {
          playbackId: signedPlaybackIdFromAsset(asset),
          duration: typeof asset.duration === "number" ? asset.duration : null,
          status: asset.status ?? "",
        };
      },
      deleteAsset: (assetId) => deleteSocialMuxAsset(assetId),
      bind: (input) => recordSocialMuxBinding(input),
      saveInProgress: async (candidate, assetId) => {
        if (candidate.surface === "welcome") {
          const digest = welcomeDigest(candidate.parentId);
          const existing = await admin
            .from("social_music_scans")
            .select("id")
            .eq("profile_id", candidate.parentId)
            .eq("playback_id", digest)
            .maybeSingle();
          assertOk(existing.error, "welcome progress read");
          if (existing.data) {
            const updated = await admin
              .from("social_music_scans")
              .update({ upload_id: assetId, last_error: "welcome_reingest_preparing" })
              .eq("id", existing.data.id);
            assertOk(updated.error, "welcome progress update");
            return;
          }
          const inserted = await admin.from("social_music_scans").insert({
            surface: "welcome",
            profile_id: candidate.parentId,
            author_id: candidate.authorId,
            asset_id: digest,
            playback_id: digest,
            upload_id: assetId,
            status: "pending",
            next_attempt_at: null,
            last_error: "welcome_reingest_preparing",
          });
          assertOk(inserted.error, "welcome progress insert");
          return;
        }
        const column = candidate.surface === "post" ? "post_id" : "story_id";
        const digest = socialVideoKeyDigest(candidate.key);
        const updated = await admin
          .from("social_music_scans")
          .update({ upload_id: assetId })
          .eq(column, candidate.parentId)
          .in("last_error", [...SOCIAL_REINGEST_RETRY_ERRORS])
          .eq("playback_id", digest)
          .eq("asset_id", digest);
        assertOk(updated.error, "s3 progress update");
      },
      saveParent: async (parent, settled) => {
        if (parent.surface === "welcome") {
          const ids = settled[0];
          if (!ids) return;
          const updated = await admin
            .from("profiles")
            .update({
              welcome_mux_asset_id: ids.assetId,
              welcome_mux_playback_id: ids.playbackId,
              welcome_mux_upload_id: ids.uploadId,
              welcome_video_key: null,
            })
            .eq("id", parent.parentId);
          assertOk(updated.error, "welcome parent update");
          return;
        }
        const table = parent.surface === "post" ? "posts" : "stories";
        const loaded = await admin.from(table).select("media").eq("id", parent.parentId).maybeSingle();
        assertOk(loaded.error, "parent media read");
        const media = Array.isArray(loaded.data?.media) ? loaded.data.media : [];
        const next = socialReingestMediaWithMux(media, settled);
        const updated = await admin.from(table).update({ media: JSON.parse(JSON.stringify(next)) }).eq("id", parent.parentId);
        assertOk(updated.error, "parent media update");
      },
      retirePlaceholder: (candidate) => retirePlaceholder(admin, candidate.surface, candidate.parentId),
      markUnfinished: async (candidate, reason) => {
        if (candidate.surface === "welcome") {
          const digest = welcomeDigest(candidate.parentId);
          const existing = await admin
            .from("social_music_scans")
            .select("id")
            .eq("profile_id", candidate.parentId)
            .eq("playback_id", digest)
            .maybeSingle();
          assertOk(existing.error, "welcome unfinished read");
          if (existing.data) {
            const updated = await admin
              .from("social_music_scans")
              .update({ next_attempt_at: null, last_error: reason })
              .eq("id", existing.data.id);
            assertOk(updated.error, "welcome unfinished update");
            return;
          }
          const inserted = await admin.from("social_music_scans").insert({
            surface: "welcome",
            profile_id: candidate.parentId,
            author_id: candidate.authorId,
            asset_id: digest,
            playback_id: digest,
            status: "pending",
            next_attempt_at: null,
            last_error: reason,
          });
          assertOk(inserted.error, "welcome unfinished insert");
          return;
        }
        const column = candidate.surface === "post" ? "post_id" : "story_id";
        const updated = await admin
          .from("social_music_scans")
          .update({ next_attempt_at: null, last_error: reason })
          .eq(column, candidate.parentId)
          .in("last_error", [...SOCIAL_REINGEST_RETRY_ERRORS]);
        assertOk(updated.error, "s3 unfinished update");
      },
      alreadyUnfinished: async (candidate) => {
        const column = candidate.surface === "welcome" ? "profile_id" : candidate.surface === "post" ? "post_id" : "story_id";
        const { data, error } = await admin
          .from("social_music_scans")
          .select("id")
          .eq(column, candidate.parentId)
          .is("next_attempt_at", null)
          .in("last_error", [...SOCIAL_REINGEST_TERMINAL_ERRORS])
          .limit(1);
        assertOk(error, "unfinished read");
        return Boolean(data && data.length > 0);
      },
    },
  });
  console.log(JSON.stringify({ msg: "social s3 reingest", ...report }));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "reingest failed");
  process.exitCode = 1;
});
