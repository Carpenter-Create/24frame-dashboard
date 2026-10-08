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

/** Each identify call is one 12s window. Eight windows is the Phase 0 cap. */
export const MUSIC_SCAN_WINDOW_SECONDS = 12;
export const MUSIC_SCAN_MAX_WINDOWS = 8;

export type MusicScanWindow = { startSeconds: number; endSeconds: number };

/** Evenly spaced windows across the asset. Unknown duration is the first window only. */
export function musicScanWindows(durationSeconds: number | null | undefined): MusicScanWindow[] {
  const span = MUSIC_SCAN_WINDOW_SECONDS;
  if (durationSeconds == null || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return [{ startSeconds: 0, endSeconds: span }];
  }
  if (durationSeconds <= span) return [{ startSeconds: 0, endSeconds: durationSeconds }];
  const count = Math.min(MUSIC_SCAN_MAX_WINDOWS, Math.ceil(durationSeconds / span));
  const lastStart = durationSeconds - span;
  const windows: MusicScanWindow[] = [];
  for (let index = 0; index < count; index += 1) {
    const start = count === 1 ? 0 : (index * lastStart) / (count - 1);
    const startSeconds = Math.round(start * 1000) / 1000;
    windows.push({
      startSeconds,
      endSeconds: Math.round((startSeconds + span) * 1000) / 1000,
    });
  }
  return windows;
}

/** Block on the highest finite music score. Any window error retries the scan. */
export function combineMusicWindowResults(results: readonly MusicIdentifyResult[]): MusicIdentifyResult {
  if (results.length === 0) return { kind: "error", code: "missing_score", retryable: true };
  const error = results.find((result) => result.kind === "error");
  if (error) return error;
  const matches = results.filter((result) => result.kind === "match");
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
  assetId?: string | null;
  playbackId?: string | null;
};

export type SocialMusicScanRef = {
  assetId: string;
  playbackId: string;
  status: MusicScanVisibility;
};

const SOCIAL_MUSIC_MUX_ID = /^[A-Za-z0-9_-]{8,120}$/;

/**
 * A Mux video is visible to other people only when this parent has an
 * allowed scan for that asset and playback id. No row, a pending row, a
 * blocked row, or an id that cannot be scanned stays hidden. Stills and
 * text do not need a scan. Same rule as private.social_video_released.
 */
export function muxItemReleasedToOthers(
  item: SocialMuxMediaRef,
  scans: readonly SocialMusicScanRef[],
): boolean {
  if (item.kind !== "video" || item.provider !== "mux") return true;
  const assetId = item.assetId?.trim() ?? "";
  const playbackId = item.playbackId?.trim() ?? "";
  if (!SOCIAL_MUSIC_MUX_ID.test(assetId) || !SOCIAL_MUSIC_MUX_ID.test(playbackId)) return false;
  const rows = scans.filter((scan) => scan.assetId === assetId && scan.playbackId === playbackId);
  return rows.length > 0 && rows.every((scan) => scan.status === "allowed");
}

/**
 * Playback mint for someone else's video. Allowed only when every scan for
 * this playback id is allowed. No row is not a release.
 */
export function socialMuxPlaybackMusicReleased(
  playbackId: string,
  scans: readonly { playbackId: string; status: MusicScanVisibility }[],
): boolean {
  const rows = scans.filter((scan) => scan.playbackId === playbackId);
  return rows.length > 0 && rows.every((scan) => scan.status === "allowed");
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

/** Blocked wins over pending when one post has more than one video. */
export function musicNoticeFromScans(
  scans: readonly { status: MusicScanVisibility }[],
): SocialMusicNotice | null {
  if (scans.some((scan) => scan.status === "blocked")) return "blocked";
  if (scans.some((scan) => scan.status === "pending")) return "pending";
  return null;
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
  const grouped = new Map<string, MusicScanVisibility[]>();
  for (const row of rows) {
    const id = idOf(row);
    if (!id) continue;
    if (row.status !== "pending" && row.status !== "blocked" && row.status !== "allowed") continue;
    const list = grouped.get(id) ?? [];
    list.push(row.status);
    grouped.set(id, list);
  }
  const notices = new Map<string, SocialMusicNotice>();
  for (const [id, scans] of grouped) {
    const notice = musicNoticeFromScans(scans.map((status) => ({ status })));
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
      ? table.select("post_id, story_id, status").eq("author_id", viewerId).in("post_id", postIds)
      : Promise.resolve({ data: [] as ScanNoticeRow[], error: null }),
    storyIds.length
      ? table.select("post_id, story_id, status").eq("author_id", viewerId).in("story_id", storyIds)
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
