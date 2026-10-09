// 24Frame Social music detect-and-block Lambda. EventBridge rule
// 24frame-social-music-scan, rate(1 minute). Founder-applied. There is no
// Mux webhook in this repo; the worker polls pending scans and reads the
// audio-only static rendition once the asset is ready. See
// docs/infra/social-music-detect.md. Do not create AWS from CI.
//
// {"dryRun": true} checks the database, Mux, and ACRCloud with a generated
// silence WAV. It does not decide a real upload.
//
// A scan that throws is logged and left pending. Vendor errors retry with
// backoff inside the row. The schedule's asynchronous retries stay 0.

import type { SupabaseClient } from "@supabase/supabase-js";

import { classifyAcrProbe, createAcrCloudAdapter, silenceWav } from "../../src/lib/social-music-acrcloud";
import { readBoundedBody, SOCIAL_MUSIC_FULL_AUDIO_MAX_BYTES } from "../../src/lib/social-music-audio";
import { sliceSocialMusicAudio } from "../../src/lib/social-music-m4a";
import { socialMusicParentStillHasScan, type MusicWindowRecord } from "../../src/lib/social-music-scan";
import {
  runSocialMusicBatch,
  type MusicScanPatch,
  type PendingMusicScan,
  type SocialMusicRunSummary,
} from "../../src/lib/social-music-run";
import {
  createSocialMuxAudioRendition,
  retrieveSocialMuxAsset,
  signSocialMuxStaticAudioUrl,
} from "../../src/lib/social-mux-server";
import { createAdminClient } from "../../src/lib/supabase/admin";
import type { Database } from "../../src/lib/supabase/database.types";

const BATCH_LIMIT = 8;
/** Lambda timeout for this function. The run budget stays at or under it. */
export const SOCIAL_MUSIC_LAMBDA_TIMEOUT_MS = 300_000;
/** One invocation, under the Lambda timeout. Not reset per scan. */
export const SOCIAL_MUSIC_RUN_BUDGET_MS = 270_000;
/** A block pulls allowed and still-pending siblings of the same pair. */
export const SOCIAL_MUSIC_SIBLING_BLOCK_STATUSES = ["allowed", "pending"] as const;

export const SOCIAL_MUSIC_REQUIRED_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_SIGNING_KEY",
  "MUX_PRIVATE_KEY",
  "ACRCLOUD_HOST",
  "ACRCLOUD_ACCESS_KEY",
  "ACRCLOUD_ACCESS_SECRET",
] as const;

export type SocialMusicCheck = "ok" | `skipped: ${string}` | `failed: ${string}`;

export type SocialMusicDryRun = {
  msg: "social music dry run";
  database: SocialMusicCheck;
  mux: SocialMusicCheck;
  acr: SocialMusicCheck;
};

type Admin = SupabaseClient<Database>;

export function missingSocialMusicEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  return SOCIAL_MUSIC_REQUIRED_ENV.filter((name) => !env[name]?.trim());
}

function patchToRow(patch: MusicScanPatch): Database["public"]["Tables"]["social_music_scans"]["Update"] {
  const row: Database["public"]["Tables"]["social_music_scans"]["Update"] = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.attemptCount !== undefined) row.attempt_count = patch.attemptCount;
  if (patch.nextAttemptAt !== undefined) row.next_attempt_at = patch.nextAttemptAt;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;
  if (patch.vendor !== undefined) row.vendor = patch.vendor;
  if (patch.vendorStatusCode !== undefined) row.vendor_status_code = patch.vendorStatusCode;
  if (patch.vendorScore !== undefined) row.vendor_score = patch.vendorScore;
  if (patch.vendorTitle !== undefined) row.vendor_title = patch.vendorTitle;
  if (patch.vendorArtist !== undefined) row.vendor_artist = patch.vendorArtist;
  if (patch.vendorAlbum !== undefined) row.vendor_album = patch.vendorAlbum;
  if (patch.vendorAcrid !== undefined) row.vendor_acrid = patch.vendorAcrid;
  if (patch.vendorIsrc !== undefined) row.vendor_isrc = patch.vendorIsrc;
  if (patch.vendorLabel !== undefined) row.vendor_label = patch.vendorLabel;
  if (patch.muxReadyAt !== undefined) row.mux_ready_at = patch.muxReadyAt;
  if (patch.scanStartedAt !== undefined) row.scan_started_at = patch.scanStartedAt;
  if (patch.decidedAt !== undefined) row.decided_at = patch.decidedAt;
  if (patch.durationSeconds !== undefined) row.duration_seconds = patch.durationSeconds;
  if (patch.windowResults !== undefined) row.window_results = patch.windowResults;
  return row;
}

async function listPending(admin: Admin, now: Date): Promise<PendingMusicScan[]> {
  const { data, error } = await admin
    .from("social_music_scans")
    .select(
      "id, surface, asset_id, playback_id, attempt_count, created_at, mux_ready_at, scan_started_at, window_results, post_id, story_id, profile_id, last_error",
    )
    .eq("status", "pending")
    .not("next_attempt_at", "is", null)
    .lte("next_attempt_at", now.toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_LIMIT);
  if (error) throw new Error(`Music scan read failed: ${error.message}`);
  const current: PendingMusicScan[] = [];
  for (const row of data ?? []) {
    const parent = await loadScanParent(admin, row);
    if (
      !socialMusicParentStillHasScan(
        { surface: row.surface, assetId: row.asset_id, playbackId: row.playback_id },
        parent,
      )
    ) {
      await retireSupersededScan(admin, row.id);
      continue;
    }
    current.push({
      id: row.id,
      surface: row.surface,
      assetId: row.asset_id,
      playbackId: row.playback_id,
      attemptCount: row.attempt_count,
      createdAt: row.created_at,
      muxReadyAt: row.mux_ready_at,
      scanStartedAt: row.scan_started_at,
      lastError: row.last_error,
      windows: parseWindowResults(row.window_results),
    });
  }
  return current;
}

async function loadScanParent(
  admin: Admin,
  row: { surface: "post" | "story" | "welcome"; post_id: string | null; story_id: string | null; profile_id: string | null },
): Promise<{ media?: unknown; welcomeAssetId?: string | null; welcomePlaybackId?: string | null } | null> {
  if (row.surface === "welcome") {
    if (!row.profile_id) return null;
    const { data, error } = await admin
      .from("profiles")
      .select("welcome_mux_asset_id, welcome_mux_playback_id")
      .eq("id", row.profile_id)
      .maybeSingle();
    if (error) throw new Error(`Music scan parent read failed: ${error.message}`);
    if (!data) return null;
    return { welcomeAssetId: data.welcome_mux_asset_id, welcomePlaybackId: data.welcome_mux_playback_id };
  }
  if (row.surface === "post") {
    if (!row.post_id) return null;
    const { data, error } = await admin.from("posts").select("media").eq("id", row.post_id).maybeSingle();
    if (error) throw new Error(`Music scan parent read failed: ${error.message}`);
    return data ? { media: data.media } : null;
  }
  if (!row.story_id) return null;
  const { data, error } = await admin.from("stories").select("media").eq("id", row.story_id).maybeSingle();
  if (error) throw new Error(`Music scan parent read failed: ${error.message}`);
  return data ? { media: data.media } : null;
}

async function retireSupersededScan(admin: Admin, id: string): Promise<void> {
  const { error } = await admin
    .from("social_music_scans")
    .update({ next_attempt_at: null, last_error: "superseded" })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new Error(`Music scan retire failed: ${error.message}`);
}

function parseWindowResults(value: unknown): MusicWindowRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as MusicWindowRecord;
    if (typeof record.startSeconds !== "number" || typeof record.endSeconds !== "number") return [];
    if (!record.result || typeof record.result !== "object" || !("kind" in record.result)) return [];
    return [record];
  });
}

async function saveScan(admin: Admin, id: string, patch: MusicScanPatch): Promise<void> {
  const { error } = await admin
    .from("social_music_scans")
    .update(patchToRow(patch))
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw new Error(`Music scan write failed: ${error.message}`);
}

async function downloadMuxAudio(playbackId: string): Promise<Uint8Array> {
  const url = await signSocialMuxStaticAudioUrl(playbackId);
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  return readBoundedBody(response, SOCIAL_MUSIC_FULL_AUDIO_MAX_BYTES);
}

async function blockSiblingScans(
  admin: Admin,
  block: {
    assetId: string;
    playbackId: string;
    exceptId: string;
    patch: MusicScanPatch;
  },
): Promise<void> {
  const row = patchToRow(block.patch);
  const { error } = await admin
    .from("social_music_scans")
    .update({
      status: "blocked",
      next_attempt_at: null,
      decided_at: block.patch.decidedAt ?? null,
      last_error: null,
      vendor: row.vendor ?? null,
      vendor_status_code: row.vendor_status_code ?? null,
      vendor_score: row.vendor_score ?? null,
      vendor_title: row.vendor_title ?? null,
      vendor_artist: row.vendor_artist ?? null,
      vendor_album: row.vendor_album ?? null,
      vendor_acrid: row.vendor_acrid ?? null,
      vendor_isrc: row.vendor_isrc ?? null,
      vendor_label: row.vendor_label ?? null,
    })
    .eq("asset_id", block.assetId)
    .eq("playback_id", block.playbackId)
    .in("status", [...SOCIAL_MUSIC_SIBLING_BLOCK_STATUSES])
    .neq("id", block.exceptId);
  if (error) throw new Error(`Music scan sibling block failed: ${error.message}`);
}

export async function socialMusicDryRun(admin: Admin): Promise<SocialMusicDryRun> {
  const adapter = createAcrCloudAdapter({
    host: process.env.ACRCLOUD_HOST!.trim(),
    accessKey: process.env.ACRCLOUD_ACCESS_KEY!.trim(),
    accessSecret: process.env.ACRCLOUD_ACCESS_SECRET!.trim(),
  });
  const [database, mux, acr] = await Promise.all([
    check(async () => {
      const { error } = await admin.from("social_music_scans").select("id").limit(1);
      if (error) throw new Error(error.message);
      return "ok";
    }),
    check(async () => {
      const { data, error } = await admin
        .from("social_music_scans")
        .select("asset_id")
        .eq("status", "pending")
        .limit(1);
      if (error) throw new Error(error.message);
      const assetId = data?.[0]?.asset_id;
      if (!assetId) return "skipped: no pending scan";
      const asset = await retrieveSocialMuxAsset(assetId);
      return asset.status ? "ok" : "failed: Mux returned no asset status";
    }),
    check(async () => {
      const result = await adapter.identify(silenceWav());
      return classifyAcrProbe(result);
    }),
  ]);
  return { msg: "social music dry run", database, mux, acr };
}

async function check(run: () => Promise<SocialMusicCheck>): Promise<SocialMusicCheck> {
  try {
    return await run();
  } catch (cause) {
    return `failed: ${cause instanceof Error ? cause.message : "unknown"}`;
  }
}

export async function handler(
  event?: Record<string, unknown> | null,
): Promise<SocialMusicRunSummary | SocialMusicDryRun> {
  const missing = missingSocialMusicEnv();
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(", ")}`);
  const admin = createAdminClient();
  if (event?.dryRun) {
    const report = await socialMusicDryRun(admin);
    console.log(JSON.stringify({ ...report, build: process.env.SOCIAL_MUSIC_BUILD ?? "unknown" }));
    return report;
  }
  const now = new Date();
  const summary = await runSocialMusicBatch({
    now,
    budgetMs: SOCIAL_MUSIC_RUN_BUDGET_MS,
    listPending: () => listPending(admin, now),
    loadAsset: (assetId) => retrieveSocialMuxAsset(assetId),
    requestAudioRendition: (assetId) => createSocialMuxAudioRendition(assetId),
    downloadAudio: downloadMuxAudio,
    sliceWindow: (audio, window) => sliceSocialMusicAudio(audio, window),
    blockSiblings: (block) => blockSiblingScans(admin, block),
    identify: (audio) =>
      createAcrCloudAdapter({
        host: process.env.ACRCLOUD_HOST!.trim(),
        accessKey: process.env.ACRCLOUD_ACCESS_KEY!.trim(),
        accessSecret: process.env.ACRCLOUD_ACCESS_SECRET!.trim(),
      }).identify(audio),
    save: (id, patch) => saveScan(admin, id, patch),
    log: (line) => console.log(JSON.stringify(line)),
  });
  console.log(
    JSON.stringify({
      msg: "social music scan done",
      build: process.env.SOCIAL_MUSIC_BUILD ?? "unknown",
      ...summary,
    }),
  );
  return summary;
}
