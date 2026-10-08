/**
 * Re-ingest Social S3 video (posts, stories, welcome) onto Mux.
 * Dry-run is the default. Pass --execute to create assets and bindings.
 * Do not run this against production from CI. Adam runs it after the SQL is applied.
 *
 *   pnpm exec tsx --conditions=react-server scripts/social/reingest-welcome-video.ts
 *   pnpm exec tsx --conditions=react-server scripts/social/reingest-welcome-video.ts --execute
 */
import { createSocialMuxAssetFromUrl, deleteSocialMuxAsset, recordSocialMuxBinding, retrieveSocialMuxAsset, signedPlaybackIdFromAsset } from "@/lib/social-mux-server";
import { reingestSocialS3Videos, type SocialReingestCandidate } from "@/lib/social-welcome-reingest";
import { headSocialMediaObject, presignSocialMediaGet } from "@/lib/s3-social-media";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSocialMuxId } from "@/lib/social-mux";

const execute = process.argv.includes("--execute");

function muxId(value: string | null): string | null {
  return value && isSocialMuxId(value) ? value : null;
}

async function loadCandidates(): Promise<SocialReingestCandidate[]> {
  const admin = createAdminClient();
  const { data: scans, error } = await admin
    .from("social_music_scans")
    .select("surface, post_id, story_id, profile_id, author_id, asset_id, playback_id, upload_id, last_error")
    .eq("last_error", "s3_video_needs_mux")
    .eq("status", "pending");
  if (error) throw new Error(error.message);
  const rows: SocialReingestCandidate[] = [];
  for (const scan of scans ?? []) {
    const surface = scan.surface;
    if (surface !== "post" && surface !== "story") continue;
    const parentId = surface === "post" ? scan.post_id : scan.story_id;
    if (!parentId) continue;
    const table = surface === "post" ? "posts" : "stories";
    const { data: parent } =
      surface === "story"
        ? await admin.from("stories").select("media, expires_at").eq("id", parentId).maybeSingle()
        : await admin.from("posts").select("media").eq("id", parentId).maybeSingle();
    const media = Array.isArray(parent?.media) ? parent.media : [];
    const item = media.find((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const row = entry as { kind?: string; key?: string; provider?: string };
      return row.kind === "video" && row.provider !== "mux" && typeof row.key === "string";
    }) as { key?: string } | undefined;
    if (!item?.key) continue;
    const expiresAt = parent && "expires_at" in parent ? parent.expires_at : null;
    const expired = surface === "story" && typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now();
    rows.push({
      surface,
      parentId,
      authorId: scan.author_id,
      key: item.key,
      expired,
      assetId: muxId(scan.upload_id),
      playbackId: null,
    });
  }
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, welcome_video_key, welcome_mux_asset_id, welcome_mux_playback_id")
    .not("welcome_video_key", "is", null);
  if (profileError) throw new Error(profileError.message);
  for (const profile of profiles ?? []) {
    if (!profile.welcome_video_key) continue;
    rows.push({
      surface: "welcome",
      parentId: profile.id,
      authorId: profile.id,
      key: profile.welcome_video_key,
      expired: false,
      assetId: muxId(profile.welcome_mux_asset_id),
      playbackId: profile.welcome_mux_playback_id,
    });
  }
  return rows;
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
          const digest = candidate.parentId.replace(/-/g, "").slice(0, 32);
          await admin.from("social_music_scans").upsert(
            {
              surface: "welcome",
              profile_id: candidate.parentId,
              author_id: candidate.authorId,
              asset_id: digest,
              playback_id: digest,
              upload_id: assetId,
              status: "pending",
              next_attempt_at: null,
              last_error: "welcome_reingest_preparing",
            },
            { onConflict: "profile_id,playback_id", ignoreDuplicates: false },
          );
          return;
        }
        const column = candidate.surface === "post" ? "post_id" : "story_id";
        await admin
          .from("social_music_scans")
          .update({ upload_id: assetId })
          .eq(column, candidate.parentId)
          .eq("last_error", "s3_video_needs_mux");
      },
      saveParent: async (candidate, ids) => {
        if (candidate.surface === "welcome") {
          await admin
            .from("profiles")
            .update({
              welcome_mux_asset_id: ids.assetId,
              welcome_mux_playback_id: ids.playbackId,
              welcome_mux_upload_id: ids.uploadId,
              welcome_video_key: null,
            })
            .eq("id", candidate.parentId);
          return;
        }
        const table = candidate.surface === "post" ? "posts" : "stories";
        const { data } = await admin.from(table).select("media").eq("id", candidate.parentId).maybeSingle();
        const media = Array.isArray(data?.media) ? data.media : [];
        const next = media.map((entry) => {
          if (!entry || typeof entry !== "object") return entry;
          const row = entry as { key?: string; kind?: string };
          if (row.kind !== "video" || row.key !== candidate.key) return entry;
          return {
            ...row,
            provider: "mux",
            assetId: ids.assetId,
            playbackId: ids.playbackId,
            uploadId: ids.uploadId,
          };
        });
        await admin.from(table).update({ media: next }).eq("id", candidate.parentId);
      },
      markUnfinished: async (candidate, error) => {
        if (candidate.surface === "welcome") {
          const digest = candidate.parentId.replace(/-/g, "").slice(0, 32);
          await admin.from("social_music_scans").insert({
            surface: "welcome",
            profile_id: candidate.parentId,
            author_id: candidate.authorId,
            asset_id: digest,
            playback_id: digest,
            status: "pending",
            next_attempt_at: null,
            last_error: error,
          });
          return;
        }
        const column = candidate.surface === "post" ? "post_id" : "story_id";
        await admin
          .from("social_music_scans")
          .update({ next_attempt_at: null, last_error: error })
          .eq(column, candidate.parentId)
          .eq("last_error", "s3_video_needs_mux");
      },
      alreadyUnfinished: async (candidate) => {
        const column = candidate.surface === "welcome" ? "profile_id" : candidate.surface === "post" ? "post_id" : "story_id";
        const { data } = await admin
          .from("social_music_scans")
          .select("id")
          .eq(column, candidate.parentId)
          .is("next_attempt_at", null)
          .in("last_error", ["s3_source_missing", "welcome_too_long", "welcome_source_missing"])
          .limit(1);
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
