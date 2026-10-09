import { createHash } from "node:crypto";

import { SOCIAL_VIDEO_DURATION_TOLERANCE_SECONDS, SOCIAL_VIDEO_MAX_SECONDS } from "@/lib/social-mux";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { SocialMusicNotice } from "@/lib/social";
import type { Database } from "@/lib/supabase/database.types";

// Phase 0 commercial-music decision. Allow or block only. No mute.
// No music is allowed on 24Frame until Content ID is sorted out.
//
// Phase 0 ships with no allowlist. A future allowlist could slot in
// before this decision. There is no allowlist code here.
//
// Precedence, from the highest metadata.music score only:
//   1. Vendor error or timeout → retry. Stay pending. Never publish.
//   2. No music rows, or the highest score is under blockScore → allow.
//   3. Highest score >= blockScore (default 25) → block immediately.
// metadata.custom_files is ignored by the adapter and cannot allow a clip.
// confidentScore (default 70) is a staff-log priority only. It never
// releases a clip and it never withholds a block.
// The staff queue lists blocked rows for spot-checks and appeals. It
// does not gate whether a clip goes live.

export const musicScanConfig = {
  blockScore: 25,
  confidentScore: 70,
} as const;
export const MUSIC_SCAN_MAX_ATTEMPTS = 8;
export const MUSIC_SCAN_PREP_DELAY_MS = 20_000;
/** A preparing asset or rendition that is still not ready after this is held. */
export const MUSIC_SCAN_PREP_MAX_MS = 6 * 60 * 60 * 1000;
/** First failure waits 30s, then 1m, 2m, 5m, 10m, 30m, 1h. */
export const MUSIC_SCAN_BACKOFF_MS = [
  30_000, 60_000, 120_000, 300_000, 600_000, 1_800_000, 3_600_000,
] as const;

export type MusicScanVisibility = "pending" | "allowed" | "blocked";

export type MusicMatchFields = {
  score: number;
  title: string | null;
  artist: string | null;
  album: string | null;
  acrid: string | null;
  isrc: string | null;
  label: string | null;
};

export type MusicIdentifyResult =
  | { kind: "no_match"; code: number }
  | ({ kind: "match"; code: number } & MusicMatchFields)
  | { kind: "error"; code: string; retryable: boolean };

export type MusicScanDecision = "allow" | "block" | "retry";

/**
 * Each identify call is one contiguous 12s window. Forty windows is eight
 * minutes, the longest clip Phase 0 fingerprints. One ACRCloud identify
 * per window, at most forty per clip. A longer clip is not sampled.
 */
export const MUSIC_SCAN_WINDOW_SECONDS = 12;
export const MUSIC_SCAN_MAX_WINDOWS = 40;
/**
 * Same cap as upload, including the shared tolerance. A longer Social video
 * is not sampled. 480.4s is still a plan. 480.6s is unknown.
 */
export const MUSIC_SCAN_COVERED_SECONDS = SOCIAL_VIDEO_MAX_SECONDS + SOCIAL_VIDEO_DURATION_TOLERANCE_SECONDS;
/**
 * Hold when the downloaded audio.m4a and Mux asset.duration disagree by more
 * than this. Windows are planned from the m4a, not from Mux.
 */
export const MUSIC_SCAN_DURATION_MISMATCH_SECONDS = 1;
/**
 * Linear full-scale RMS. ACRCloud 2004 (no fingerprint) is clean silence only
 * under this line. 0.001 is about -60 dBFS. A -40 dBFS sine (RMS about 0.007)
 * stays an error. Null RMS is not silence.
 */
export const MUSIC_SCAN_SILENCE_RMS = 0.001;

export type MusicScanWindow = { startSeconds: number; endSeconds: number };

export type MusicScanCoverage =
  | { kind: "cover"; windows: MusicScanWindow[] }
  | { kind: "unknown" };

function roundWindowSeconds(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Contiguous 12s windows from the start of the audio. The last window is
 * [end - 12, end], with end taken from the m4a itself. A short tail is not
 * its own window. Unknown, non-finite, non-positive, or past the upload cap
 * is not a window.
 */
export function planMusicScanCoverage(durationSeconds: number | null | undefined): MusicScanCoverage {
  if (
    durationSeconds == null ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > MUSIC_SCAN_COVERED_SECONDS
  ) {
    return { kind: "unknown" };
  }
  const span = MUSIC_SCAN_WINDOW_SECONDS;
  const end = durationSeconds;
  if (end <= span) {
    const endSeconds = roundWindowSeconds(end);
    if (endSeconds <= 0) return { kind: "unknown" };
    return { kind: "cover", windows: [{ startSeconds: 0, endSeconds }] };
  }
  const windows: MusicScanWindow[] = [];
  let cursor = 0;
  while (cursor + span < end - 1e-6 && windows.length < MUSIC_SCAN_MAX_WINDOWS - 1) {
    const startSeconds = roundWindowSeconds(cursor);
    const endSeconds = roundWindowSeconds(cursor + span);
    if (endSeconds > startSeconds) windows.push({ startSeconds, endSeconds });
    cursor += span;
  }
  const lastStart = roundWindowSeconds(Math.max(0, end - span));
  const lastEnd = roundWindowSeconds(end);
  if (lastEnd <= lastStart) return windows.length > 0 ? { kind: "cover", windows } : { kind: "unknown" };
  const previous = windows[windows.length - 1];
  if (!previous || previous.startSeconds !== lastStart || previous.endSeconds !== lastEnd) {
    windows.push({ startSeconds: lastStart, endSeconds: lastEnd });
  }
  if (windows.length === 0 || windows.length > MUSIC_SCAN_MAX_WINDOWS) return { kind: "unknown" };
  return { kind: "cover", windows };
}

/** Windows for a duration this phase can cover. Unknown and over-cap are empty. */
export function musicScanWindows(durationSeconds: number | null | undefined): MusicScanWindow[] {
  const plan = planMusicScanCoverage(durationSeconds);
  return plan.kind === "cover" ? plan.windows : [];
}

/**
 * A music score at or above blockScore blocks even when another window
 * errored. Under the block line, a window error retries the scan.
 */
export function musicIdentifyIsRateLimit(result: MusicIdentifyResult): boolean {
  return result.kind === "error" && (result.code === "3003" || result.code === "http_429");
}

/** ACRCloud 2004: the sample produced no fingerprint. Silence may still be clean. */
export function musicIdentifyIsNoFingerprint(result: MusicIdentifyResult): boolean {
  return result.kind === "error" && result.code === "2004";
}

export type MusicWindowRecord = {
  startSeconds: number;
  endSeconds: number;
  result: MusicIdentifyResult;
};

export function combineMusicWindowResults(results: readonly MusicIdentifyResult[]): MusicIdentifyResult {
  if (results.length === 0) return { kind: "error", code: "missing_score", retryable: true };
  const nonFinite = results.some((result) => result.kind === "match" && !Number.isFinite(result.score));
  const matches = results.filter(
    (result): result is Extract<MusicIdentifyResult, { kind: "match" }> =>
      result.kind === "match" && Number.isFinite(result.score),
  );
  const blocking = matches.filter((row) => row.score >= musicScanConfig.blockScore);
  if (blocking.length > 0) return blocking.reduce((best, row) => (row.score > best.score ? row : best));
  if (nonFinite) return { kind: "error", code: "invalid_score", retryable: true };
  const error = results.find((result) => result.kind === "error");
  if (error) return error;
  if (matches.length === 0) {
    return results.find((result) => result.kind === "no_match") ?? { kind: "no_match", code: 1001 };
  }
  return matches.reduce((best, row) => (row.score > best.score ? row : best));
}

export type MusicStaffPriority = "confident" | "spot_check";

export interface MusicFingerprintAdapter {
  readonly vendor: string;
  identify(audio: Uint8Array): Promise<MusicIdentifyResult>;
}

/** Staff log only. A score at this line is still a block, not a pass. */
export function isConfidentCommercialMatch(
  score: number,
  config: { confidentScore: number } = musicScanConfig,
): boolean {
  return score >= config.confidentScore;
}

export function musicStaffPriority(
  score: number,
  config: { confidentScore: number } = musicScanConfig,
): MusicStaffPriority {
  return isConfidentCommercialMatch(score, config) ? "confident" : "spot_check";
}

/**
 * Block at blockScore. Pass under it, and on no match.
 * Vendor error retries and never allows. custom_files is not an input.
 */
export function decideMusicScan(input: {
  result: MusicIdentifyResult;
  config?: { blockScore: number };
}): MusicScanDecision {
  const blockScore = input.config?.blockScore ?? musicScanConfig.blockScore;
  if (input.result.kind === "error") return "retry";
  if (input.result.kind === "no_match") return "allow";
  if (!Number.isFinite(input.result.score)) return "retry";
  if (input.result.score >= blockScore) return "block";
  return "allow";
}

export type SocialMuxMediaRef = {
  kind?: string;
  provider?: string;
  key?: string | null;
  assetId?: string | null;
  playbackId?: string | null;
};

/** Postgres md5(text) of a stored video key. Release and signing use the same digest. */
export function socialVideoKeyDigest(key: string): string {
  return createHash("md5").update(key).digest("hex");
}

export type SocialMusicScanRef = {
  assetId: string;
  playbackId: string;
  status: MusicScanVisibility;
};

const SOCIAL_MUSIC_MUX_ID = /^[A-Za-z0-9_-]{8,120}$/;

/**
 * A video is visible to other people only when this parent has an allowed
 * scan for it. Mux matches asset id and playback id. Any other video matches
 * the md5 of its storage key. No row, a pending row, a blocked row, or an
 * id that cannot be scanned stays hidden. Stills and text do not need a
 * scan. Same rule as private.social_video_released.
 */
export function muxItemReleasedToOthers(
  item: SocialMuxMediaRef,
  scans: readonly SocialMusicScanRef[],
): boolean {
  if (item.kind !== "video") return true;
  if (item.provider !== "mux") {
    const key = item.key?.trim() ?? "";
    if (!key) return false;
    const digest = socialVideoKeyDigest(key);
    const rows = scans.filter((scan) => scan.assetId === digest && scan.playbackId === digest);
    return rows.length > 0 && rows.every((scan) => scan.status === "allowed");
  }
  const assetId = item.assetId?.trim() ?? "";
  const playbackId = item.playbackId?.trim() ?? "";
  if (!SOCIAL_MUSIC_MUX_ID.test(assetId) || !SOCIAL_MUSIC_MUX_ID.test(playbackId)) return false;
  const rows = scans.filter((scan) => scan.assetId === assetId && scan.playbackId === playbackId);
  return rows.length > 0 && rows.every((scan) => scan.status === "allowed");
}

export type SocialPlaybackParent = { id: string; surface: "post" | "story" };

export type SocialPlaybackScan = {
  playbackId: string;
  status: MusicScanVisibility;
  postId: string | null;
  storyId: string | null;
};

/**
 * Mint for one playback id. Any blocked or pending row for that id denies,
 * including a row on a parent the caller did not list. A visible parent
 * still needs its own allowed scan. No row is not a release.
 */
export function socialMuxPlaybackMusicReleased(
  playbackId: string,
  parents: readonly SocialPlaybackParent[],
  scans: readonly SocialPlaybackScan[],
): boolean {
  const rows = scans.filter((scan) => scan.playbackId === playbackId);
  if (rows.length === 0 || parents.length === 0) return false;
  if (rows.some((scan) => scan.status === "blocked")) return false;
  return parents.some((parent) =>
    rows.some(
      (scan) =>
        scan.status === "allowed" &&
        (parent.surface === "post" ? scan.postId === parent.id : scan.storyId === parent.id),
    ),
  );
}

/** Other viewers see the parent only when every Mux video on it is allowed. */
export function socialParentVisibleToOthers(
  media: readonly SocialMuxMediaRef[],
  scans: readonly SocialMusicScanRef[],
): boolean {
  return media.every((item) => muxItemReleasedToOthers(item, scans));
}

/**
 * True when every scan already loaded for this parent is allowed.
 * An empty list means the caller found no row. Mux release is
 * socialParentVisibleToOthers: a Mux video with no allowed scan stays hidden.
 */
export function socialVideoVisibleToOthers(
  scans: readonly { status: MusicScanVisibility }[],
): boolean {
  return scans.every((scan) => scan.status === "allowed");
}

/** The author always sees their own video. Everyone else uses the release rule. */
export function socialVideoVisibleToViewer(input: {
  viewerId: string;
  authorId: string;
  scans: readonly { status: MusicScanVisibility }[];
}): boolean {
  if (input.viewerId !== "" && input.viewerId === input.authorId) return true;
  return socialVideoVisibleToOthers(input.scans);
}

/** Blocked wins. An exhausted pending row is the malformed line. A retry still in progress stays pending. */
export function musicNoticeFromScans(
  scans: readonly {
    status: MusicScanVisibility;
    attemptCount?: number;
    nextAttemptAt?: string | null;
    lastError?: string | null;
  }[],
): SocialMusicNotice | null {
  const live = scans.filter((scan) => scan.lastError !== "superseded");
  if (live.some((scan) => scan.status === "blocked")) return "blocked";
  const pending = live.filter((scan) => scan.status === "pending");
  if (pending.length === 0) return null;
  const exhausted =
    pending.every((scan) => typeof scan.attemptCount === "number") &&
    pending.every(
      (scan) =>
        (scan.attemptCount ?? 0) >= MUSIC_SCAN_MAX_ATTEMPTS &&
        (scan.nextAttemptAt == null || scan.nextAttemptAt === ""),
    );
  if (exhausted) return "malformed";
  return "pending";
}

/**
 * Next wait after a vendor 429 or ACRCloud 3003. The strike is carried in
 * last_error so a later invocation keeps climbing. The delay caps at the
 * last failure slot. The attempt counter is not a strike.
 */
export function nextMusicRateLimit(lastError: string | null | undefined): { delayMs: number; lastError: string } {
  const match = /^acr_rate_limit:(\d+)$/.exec(lastError ?? "");
  const previous = match ? Number(match[1]) : 0;
  const strike = (Number.isFinite(previous) ? previous : 0) + 1;
  const index = Math.min(Math.max(0, strike - 1), MUSIC_SCAN_BACKOFF_MS.length - 1);
  const delayMs = MUSIC_SCAN_BACKOFF_MS[index] ?? MUSIC_SCAN_BACKOFF_MS[MUSIC_SCAN_BACKOFF_MS.length - 1];
  return { delayMs, lastError: `acr_rate_limit:${strike}` };
}

/** True when the parent still stores this Mux pair. A replaced welcome or media row is not current. */
export function socialMusicParentStillHasScan(
  scan: { surface: "post" | "story" | "welcome"; assetId: string; playbackId: string },
  parent: { media?: unknown; welcomeAssetId?: string | null; welcomePlaybackId?: string | null } | null,
): boolean {
  if (!parent) return false;
  if (scan.surface === "welcome") {
    return parent.welcomeAssetId === scan.assetId && parent.welcomePlaybackId === scan.playbackId;
  }
  if (!Array.isArray(parent.media)) return false;
  return parent.media.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as { provider?: string; assetId?: string; playbackId?: string };
    return row.provider === "mux" && row.assetId === scan.assetId && row.playbackId === scan.playbackId;
  });
}

export function musicScanBackoff(attemptCountAfterFailure: number, now: Date): Date | null {
  if (attemptCountAfterFailure >= MUSIC_SCAN_MAX_ATTEMPTS) return null;
  const index = Math.min(
    Math.max(0, attemptCountAfterFailure - 1),
    MUSIC_SCAN_BACKOFF_MS.length - 1,
  );
  const delay = MUSIC_SCAN_BACKOFF_MS[index] ?? MUSIC_SCAN_BACKOFF_MS[MUSIC_SCAN_BACKOFF_MS.length - 1];
  return new Date(now.getTime() + delay);
}

export function musicScanLatencyLine(input: {
  scanId: string;
  decision: string;
  muxReadyAt: string | null;
  scanStartedAt: string | null;
  decidedAt: string | null;
  staffPriority?: MusicStaffPriority | null;
}): {
  msg: "social music scan";
  scan_id: string;
  decision: string;
  mux_ready_at: string | null;
  scan_started_at: string | null;
  decided_at: string | null;
  mux_ready_to_decision_ms: number | null;
  staff_priority: MusicStaffPriority | null;
} {
  const ready = input.muxReadyAt ? Date.parse(input.muxReadyAt) : Number.NaN;
  const decided = input.decidedAt ? Date.parse(input.decidedAt) : Number.NaN;
  return {
    msg: "social music scan",
    scan_id: input.scanId,
    decision: input.decision,
    mux_ready_at: input.muxReadyAt,
    scan_started_at: input.scanStartedAt,
    decided_at: input.decidedAt,
    mux_ready_to_decision_ms:
      Number.isFinite(ready) && Number.isFinite(decided) ? decided - ready : null,
    staff_priority: input.staffPriority ?? null,
  };
}

/** Drop discovery hits the viewer themselves still has held. Other people never receive those rows. */
export function omitHeldPosts<T extends { id: string }>(
  hits: readonly T[],
  notices: ReadonlyMap<string, SocialMusicNotice>,
): T[] {
  return hits.filter((hit) => !notices.has(hit.id));
}

type ScanNoticeRow = {
  post_id: string | null;
  story_id: string | null;
  status: string;
  attempt_count?: number | null;
  next_attempt_at?: string | null;
  last_error?: string | null;
};

type NoticeQuery = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      in: (column: string, values: readonly string[]) => Promise<{
        data: ScanNoticeRow[] | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export type MusicNoticeMaps = {
  posts: Map<string, SocialMusicNotice>;
  stories: Map<string, SocialMusicNotice>;
};

function groupNotices(
  rows: readonly ScanNoticeRow[],
  idOf: (row: ScanNoticeRow) => string | null,
): Map<string, SocialMusicNotice> {
  const grouped = new Map<string, ScanNoticeRow[]>();
  for (const row of rows) {
    const id = idOf(row);
    if (!id) continue;
    if (row.status !== "pending" && row.status !== "blocked" && row.status !== "allowed") continue;
    const list = grouped.get(id) ?? [];
    list.push(row);
    grouped.set(id, list);
  }
  const notices = new Map<string, SocialMusicNotice>();
  for (const [id, scans] of grouped) {
    const notice = musicNoticeFromScans(
      scans.map((row) => ({
        status: row.status as "pending" | "allowed" | "blocked",
        attemptCount: typeof row.attempt_count === "number" ? row.attempt_count : undefined,
        nextAttemptAt: row.next_attempt_at,
        lastError: row.last_error,
      })),
    );
    if (notice) notices.set(id, notice);
  }
  return notices;
}

/**
 * Status only, for the signed-in author. Vendor columns are not selected.
 * A missing table (migration not applied yet) returns empty maps so the
 * feed does not 500. RLS still hides unreleased videos once the migration
 * is applied.
 */
export async function loadOwnMusicNotices(
  supabase: SupabaseClient<Database>,
  viewerId: string,
  ids: { postIds?: readonly string[]; storyIds?: readonly string[] },
): Promise<MusicNoticeMaps> {
  const postIds = [...new Set((ids.postIds ?? []).filter(Boolean))];
  const storyIds = [...new Set((ids.storyIds ?? []).filter(Boolean))];
  const empty = { posts: new Map<string, SocialMusicNotice>(), stories: new Map<string, SocialMusicNotice>() };
  if (!viewerId || (postIds.length === 0 && storyIds.length === 0)) return empty;

  const table = supabase.from("social_music_scans") as unknown as NoticeQuery;
  const [posts, stories] = await Promise.all([
    postIds.length
      ? table.select("post_id, story_id, status, attempt_count, next_attempt_at, last_error").eq("author_id", viewerId).in("post_id", postIds)
      : Promise.resolve({ data: [] as ScanNoticeRow[], error: null }),
    storyIds.length
      ? table.select("post_id, story_id, status, attempt_count, next_attempt_at, last_error").eq("author_id", viewerId).in("story_id", storyIds)
      : Promise.resolve({ data: [] as ScanNoticeRow[], error: null }),
  ]);
  if (posts.error || stories.error) {
    console.error(
      `[social-music] notice read failed: ${posts.error?.message ?? stories.error?.message ?? "unknown"}`,
    );
    return empty;
  }
  return {
    posts: groupNotices(posts.data ?? [], (row) => row.post_id),
    stories: groupNotices(stories.data ?? [], (row) => row.story_id),
  };
}
