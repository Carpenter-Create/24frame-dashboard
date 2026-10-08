import {
  combineMusicWindowResults,
  decideMusicScan,
  MUSIC_SCAN_MAX_ATTEMPTS,
  MUSIC_SCAN_PREP_DELAY_MS,
  MUSIC_SCAN_PREP_MAX_MS,
  musicScanBackoff,
  musicScanLatencyLine,
  musicStaffPriority,
  planMusicScanCoverage,
  type MusicIdentifyResult,
  type MusicMatchFields,
  type MusicScanWindow,
  type MusicStaffPriority,
} from "@/lib/social-music-scan";
import {
  MUSIC_SCAN_WINDOW_MAX_BYTES,
  muxAudioRenditionRequestSettled,
  muxAudioRenditionState,
  signedPlaybackIdFromMuxAsset,
  type MuxAudioAsset,
} from "@/lib/social-music-audio";

export type PendingMusicScan = {
  id: string;
  surface: "post" | "story";
  assetId: string;
  playbackId: string;
  attemptCount: number;
  createdAt: string;
  muxReadyAt: string | null;
  scanStartedAt: string | null;
};

export type SiblingMusicBlock = {
  assetId: string;
  playbackId: string;
  exceptId: string;
  patch: MusicScanPatch;
};

export type MusicScanPatch = {
  status?: "pending" | "allowed" | "blocked";
  attemptCount?: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  vendor?: string | null;
  vendorStatusCode?: number | null;
  vendorScore?: number | null;
  vendorTitle?: string | null;
  vendorArtist?: string | null;
  vendorAlbum?: string | null;
  vendorAcrid?: string | null;
  vendorIsrc?: string | null;
  vendorLabel?: string | null;
  muxReadyAt?: string | null;
  scanStartedAt?: string | null;
  decidedAt?: string | null;
};

export type SocialMusicRunSummary = {
  checked: number;
  allowed: number;
  blocked: number;
  waiting: number;
  retried: number;
  held: number;
  failed: number;
};

export type SocialMusicRunDeps = {
  now: Date;
  budgetMs: number;
  listPending: () => Promise<PendingMusicScan[]>;
  loadAsset: (assetId: string) => Promise<MuxAudioAsset>;
  requestAudioRendition: (assetId: string) => Promise<void>;
  /** Full audio.m4a. Windows are cut in-process, not by a Mux time claim. */
  downloadAudio: (playbackId: string) => Promise<Uint8Array>;
  sliceWindow: (audio: Uint8Array, window: MusicScanWindow) => Uint8Array;
  identify: (audio: Uint8Array) => Promise<MusicIdentifyResult>;
  save: (id: string, patch: MusicScanPatch) => Promise<void>;
  /** A block on this asset and playback pulls sibling allowed rows back to blocked. */
  blockSiblings?: (block: SiblingMusicBlock) => Promise<void>;
  log?: (line: ReturnType<typeof musicScanLatencyLine>) => void;
};

const EMPTY_SUMMARY = (): SocialMusicRunSummary => ({
  checked: 0,
  allowed: 0,
  blocked: 0,
  waiting: 0,
  retried: 0,
  held: 0,
  failed: 0,
});

function vendorPatch(match: MusicMatchFields, code: number): Pick<
  MusicScanPatch,
  | "vendor"
  | "vendorStatusCode"
  | "vendorScore"
  | "vendorTitle"
  | "vendorArtist"
  | "vendorAlbum"
  | "vendorAcrid"
  | "vendorIsrc"
  | "vendorLabel"
> {
  return {
    vendor: "acrcloud",
    vendorStatusCode: code,
    vendorScore: match.score,
    vendorTitle: match.title,
    vendorArtist: match.artist,
    vendorAlbum: match.album,
    vendorAcrid: match.acrid,
    vendorIsrc: match.isrc,
    vendorLabel: match.label,
  };
}

function clearVendor(): Pick<
  MusicScanPatch,
  | "vendorTitle"
  | "vendorArtist"
  | "vendorAlbum"
  | "vendorAcrid"
  | "vendorIsrc"
  | "vendorLabel"
  | "vendorScore"
> {
  return {
    vendorTitle: null,
    vendorArtist: null,
    vendorAlbum: null,
    vendorAcrid: null,
    vendorIsrc: null,
    vendorLabel: null,
    vendorScore: null,
  };
}

type AttemptBook = { leased: boolean; attemptCount: number };

export async function processMusicScan(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
): Promise<"allowed" | "blocked" | "waiting" | "retried" | "held"> {
  const book: AttemptBook = { leased: false, attemptCount: scan.attemptCount };
  try {
    return await scanOne(scan, deps, book);
  } catch (error) {
    // A crash after the lease must not burn a second attempt.
    if (!book.leased) throw error;
    return recordFailure(scan, deps, book, "scan_threw", scan.muxReadyAt, scan.scanStartedAt);
  }
}

async function scanOne(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
  book: AttemptBook,
): Promise<"allowed" | "blocked" | "waiting" | "retried" | "held"> {
  const log = deps.log ?? (() => undefined);
  const nowIso = deps.now.toISOString();
  let muxReadyAt = scan.muxReadyAt;

  let asset: MuxAudioAsset;
  try {
    asset = await deps.loadAsset(scan.assetId);
  } catch {
    return recordFailure(scan, deps, book, "mux_asset_read", muxReadyAt, scan.scanStartedAt);
  }
  const state = muxAudioRenditionState(asset);
  if (asset.status === "ready" && !muxReadyAt) muxReadyAt = nowIso;

  if (state === "asset_preparing" || state === "rendition_missing" || state === "rendition_preparing") {
    if (prepExpired(scan, deps.now)) return hold(scan, deps, "mux_prep_expired", muxReadyAt);
  }

  if (state === "asset_preparing") {
    await deps.save(scan.id, {
      status: "pending",
      nextAttemptAt: new Date(deps.now.getTime() + MUSIC_SCAN_PREP_DELAY_MS).toISOString(),
      muxReadyAt,
    });
    log(musicScanLatencyLine({
      scanId: scan.id,
      decision: "wait_asset",
      muxReadyAt,
      scanStartedAt: scan.scanStartedAt,
      decidedAt: null,
    }));
    return "waiting";
  }

  if (state === "asset_errored") {
    return hold(scan, deps, "mux_asset_errored", muxReadyAt);
  }

  if (state === "rendition_missing") {
    try {
      await deps.requestAudioRendition(scan.assetId);
    } catch (error) {
      // Already exists or in progress: poll. Transient errors retry.
      if (!muxAudioRenditionRequestSettled(error)) {
        return recordFailure(scan, deps, book, "mux_rendition_request", muxReadyAt, scan.scanStartedAt);
      }
    }
    await deps.save(scan.id, {
      status: "pending",
      nextAttemptAt: new Date(deps.now.getTime() + MUSIC_SCAN_PREP_DELAY_MS).toISOString(),
      muxReadyAt,
    });
    log(musicScanLatencyLine({
      scanId: scan.id,
      decision: "wait_rendition",
      muxReadyAt,
      scanStartedAt: scan.scanStartedAt,
      decidedAt: null,
    }));
    return "waiting";
  }

  if (state === "rendition_preparing") {
    await deps.save(scan.id, {
      status: "pending",
      nextAttemptAt: new Date(deps.now.getTime() + MUSIC_SCAN_PREP_DELAY_MS).toISOString(),
      muxReadyAt,
    });
    log(musicScanLatencyLine({
      scanId: scan.id,
      decision: "wait_rendition",
      muxReadyAt,
      scanStartedAt: scan.scanStartedAt,
      decidedAt: null,
    }));
    return "waiting";
  }

  // Skipped or missing audio stays pending. Phase 0 does not allow it.
  // After the attempt cap the staff queue shows Unfinished.
  if (state === "rendition_errored") {
    return recordFailure(scan, deps, book, "mux_audio_errored", muxReadyAt, scan.scanStartedAt);
  }

  if (signedPlaybackIdFromMuxAsset(asset) !== scan.playbackId) {
    return hold(scan, deps, "mux_playback_mismatch", muxReadyAt);
  }

  const coverage = planMusicScanCoverage(asset.duration);
  if (coverage.kind === "over_cap") return hold(scan, deps, "duration_over_cap", muxReadyAt);
  if (coverage.kind === "unknown") {
    return recordFailure(scan, deps, book, "unknown_duration", muxReadyAt, scan.scanStartedAt);
  }

  const scanStartedAt = scan.scanStartedAt ?? nowIso;
  const startedMs = Date.now();
  await lease(scan, deps, book, muxReadyAt, scanStartedAt);
  if (Date.now() - startedMs >= deps.budgetMs) {
    return recordFailure(scan, deps, book, "scan_budget", muxReadyAt, scanStartedAt);
  }

  let full: Uint8Array;
  try {
    full = await deps.downloadAudio(scan.playbackId);
  } catch {
    return recordFailure(scan, deps, book, "mux_audio_read", muxReadyAt, scanStartedAt);
  }
  if (full.byteLength === 0) {
    return recordFailure(scan, deps, book, "empty_audio", muxReadyAt, scanStartedAt);
  }

  const windowResults: MusicIdentifyResult[] = [];
  const seen: Uint8Array[] = [];
  for (const window of coverage.windows) {
    if (Date.now() - startedMs >= deps.budgetMs) {
      return recordFailure(scan, deps, book, "scan_budget", muxReadyAt, scanStartedAt);
    }
    let audio: Uint8Array;
    try {
      audio = deps.sliceWindow(full, window);
    } catch (error) {
      // Mux duration can run past the audio, or the remainder can be
      // shorter than a frame. No samples there is the end of the track.
      // Earlier windows already cover the audio that exists.
      const pastAudio =
        windowResults.length > 0 && error instanceof Error && error.message === "m4a_window_empty";
      if (pastAudio) break;
      return recordFailure(scan, deps, book, "window_cut", muxReadyAt, scanStartedAt);
    }
    if (audio.byteLength === 0) {
      return recordFailure(scan, deps, book, "empty_audio", muxReadyAt, scanStartedAt);
    }
    if (audio.byteLength > MUSIC_SCAN_WINDOW_MAX_BYTES) {
      return recordFailure(scan, deps, book, "window_implausible", muxReadyAt, scanStartedAt);
    }
    if (seen.some((prior) => sameBytes(prior, audio))) {
      return recordFailure(scan, deps, book, "window_not_distinct", muxReadyAt, scanStartedAt);
    }
    seen.push(audio);
    try {
      windowResults.push(await deps.identify(audio));
    } catch {
      windowResults.push({ kind: "error", code: "identify_threw", retryable: true });
    }
  }
  const result = combineMusicWindowResults(windowResults);
  const decision = decideMusicScan({ result });
  if (decision === "retry") {
    const code = result.kind === "error" ? result.code : "retry";
    return recordFailure(scan, deps, book, code.slice(0, 80), muxReadyAt, scanStartedAt);
  }

  const decidedAt = deps.now.toISOString();
  const match = result.kind === "match" ? result : null;
  const blocked = decision === "block" && match !== null;
  const staffPriority: MusicStaffPriority | null = blocked && match ? musicStaffPriority(match.score) : null;
  const patch: MusicScanPatch = {
    status: blocked ? "blocked" : "allowed",
    nextAttemptAt: null,
    lastError: null,
    muxReadyAt,
    scanStartedAt,
    decidedAt,
    vendor: "acrcloud",
    vendorStatusCode: result.kind === "error" ? null : result.code,
    ...(blocked && match ? vendorPatch(match, match.code) : clearVendor()),
  };
  if (blocked) {
    await deps.blockSiblings?.({
      assetId: scan.assetId,
      playbackId: scan.playbackId,
      exceptId: scan.id,
      patch,
    });
  }
  await deps.save(scan.id, patch);
  log(musicScanLatencyLine({
    scanId: scan.id,
    decision,
    muxReadyAt,
    scanStartedAt,
    decidedAt,
    staffPriority,
  }));
  return decision === "block" ? "blocked" : "allowed";
}

function prepExpired(scan: PendingMusicScan, now: Date): boolean {
  const created = Date.parse(scan.createdAt);
  if (!Number.isFinite(created)) return true;
  return now.getTime() - created > MUSIC_SCAN_PREP_MAX_MS;
}

async function hold(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
  error: string,
  muxReadyAt: string | null,
): Promise<"held"> {
  const log = deps.log ?? (() => undefined);
  await deps.save(scan.id, {
    status: "pending",
    attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
    nextAttemptAt: null,
    lastError: error.slice(0, 80),
    muxReadyAt,
    scanStartedAt: scan.scanStartedAt,
  });
  log(musicScanLatencyLine({
    scanId: scan.id,
    decision: "held",
    muxReadyAt,
    scanStartedAt: scan.scanStartedAt,
    decidedAt: null,
  }));
  return "held";
}

/** Count this attempt once, before the download and the identify calls. */
async function lease(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
  book: AttemptBook,
  muxReadyAt: string | null,
  scanStartedAt: string | null,
): Promise<void> {
  if (book.leased) return;
  book.leased = true;
  book.attemptCount += 1;
  const next = musicScanBackoff(book.attemptCount, deps.now);
  await deps.save(scan.id, {
    status: "pending",
    attemptCount: book.attemptCount,
    nextAttemptAt: next ? next.toISOString() : null,
    muxReadyAt,
    scanStartedAt,
  });
}

async function recordFailure(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
  book: AttemptBook,
  error: string,
  muxReadyAt: string | null,
  scanStartedAt: string | null,
): Promise<"retried" | "held"> {
  const log = deps.log ?? (() => undefined);
  if (!book.leased) {
    book.leased = true;
    book.attemptCount += 1;
  }
  const next = musicScanBackoff(book.attemptCount, deps.now);
  await deps.save(scan.id, {
    status: "pending",
    attemptCount: book.attemptCount,
    nextAttemptAt: next ? next.toISOString() : null,
    lastError: error.slice(0, 80),
    muxReadyAt,
    scanStartedAt,
  });
  log(musicScanLatencyLine({
    scanId: scan.id,
    decision: next ? "retry" : "held",
    muxReadyAt,
    scanStartedAt,
    decidedAt: null,
  }));
  return next ? "retried" : "held";
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) return false;
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export async function runSocialMusicBatch(deps: SocialMusicRunDeps): Promise<SocialMusicRunSummary> {
  const summary = EMPTY_SUMMARY();
  const started = deps.now.getTime();
  const pending = await deps.listPending();
  for (const scan of pending) {
    if (Date.now() - started > deps.budgetMs) break;
    summary.checked += 1;
    try {
      const outcome = await processMusicScan(scan, deps);
      if (outcome === "allowed") summary.allowed += 1;
      else if (outcome === "blocked") summary.blocked += 1;
      else if (outcome === "waiting") summary.waiting += 1;
      else if (outcome === "retried") summary.retried += 1;
      else summary.held += 1;
    } catch (error) {
      try {
        const outcome = await recordFailure(
          scan,
          deps,
          { leased: false, attemptCount: scan.attemptCount },
          "scan_threw",
          scan.muxReadyAt,
          scan.scanStartedAt,
        );
        if (outcome === "retried") summary.retried += 1;
        else summary.held += 1;
      } catch {
        summary.failed += 1;
      }
      console.error(
        `[social-music] scan ${scan.id} failed: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }
  }
  return summary;
}
