import {
  combineMusicWindowResults,
  decideMusicScan,
  MUSIC_SCAN_MAX_ATTEMPTS,
  MUSIC_SCAN_PREP_DELAY_MS,
  musicScanBackoff,
  musicScanLatencyLine,
  musicScanWindows,
  musicStaffPriority,
  type MusicIdentifyResult,
  type MusicMatchFields,
  type MusicScanWindow,
  type MusicStaffPriority,
} from "@/lib/social-music-scan";
import {
  muxAudioRenditionRequestSettled,
  muxAudioRenditionState,
  type MuxAudioAsset,
} from "@/lib/social-music-audio";

export type PendingMusicScan = {
  id: string;
  surface: "post" | "story";
  assetId: string;
  playbackId: string;
  attemptCount: number;
  muxReadyAt: string | null;
  scanStartedAt: string | null;
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
  downloadAudio: (playbackId: string, window: MusicScanWindow) => Promise<Uint8Array>;
  identify: (audio: Uint8Array) => Promise<MusicIdentifyResult>;
  save: (id: string, patch: MusicScanPatch) => Promise<void>;
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

export async function processMusicScan(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
): Promise<"allowed" | "blocked" | "waiting" | "retried" | "held"> {
  const log = deps.log ?? (() => undefined);
  const nowIso = deps.now.toISOString();
  let muxReadyAt = scan.muxReadyAt;

  let asset: MuxAudioAsset;
  try {
    asset = await deps.loadAsset(scan.assetId);
  } catch {
    return fail(scan, deps, "mux_asset_read", muxReadyAt);
  }
  const state = muxAudioRenditionState(asset);
  if (asset.status === "ready" && !muxReadyAt) muxReadyAt = nowIso;

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
    await deps.save(scan.id, {
      status: "pending",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
      lastError: "mux_asset_errored",
      muxReadyAt,
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

  if (state === "rendition_missing") {
    try {
      await deps.requestAudioRendition(scan.assetId);
    } catch (error) {
      // Already exists or in progress: poll. Transient errors retry.
      if (!muxAudioRenditionRequestSettled(error)) {
        return fail(scan, deps, "mux_rendition_request", muxReadyAt);
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
    return fail(scan, deps, "mux_audio_errored", muxReadyAt);
  }

  const scanStartedAt = scan.scanStartedAt ?? nowIso;
  const windows = musicScanWindows(asset.duration);
  const windowResults: MusicIdentifyResult[] = [];
  for (const window of windows) {
    let audio: Uint8Array;
    try {
      audio = await deps.downloadAudio(scan.playbackId, window);
    } catch {
      return fail(scan, deps, "mux_audio_read", muxReadyAt, scanStartedAt);
    }
    // Empty audio stays pending. A later window must not allow the clip.
    if (audio.byteLength === 0) {
      return fail(scan, deps, "empty_audio", muxReadyAt, scanStartedAt);
    }
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
    return fail(scan, deps, code.slice(0, 80), muxReadyAt, scanStartedAt);
  }

  const decidedAt = deps.now.toISOString();
  const match = result.kind === "match" ? result : null;
  const blocked = decision === "block" && match !== null;
  const staffPriority: MusicStaffPriority | null = blocked && match ? musicStaffPriority(match.score) : null;
  await deps.save(scan.id, {
    status: blocked ? "blocked" : "allowed",
    nextAttemptAt: null,
    lastError: null,
    muxReadyAt,
    scanStartedAt,
    decidedAt,
    vendor: "acrcloud",
    vendorStatusCode: result.kind === "error" ? null : result.code,
    ...(blocked && match ? vendorPatch(match, match.code) : clearVendor()),
  });
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

async function fail(
  scan: PendingMusicScan,
  deps: SocialMusicRunDeps,
  error: string,
  muxReadyAt: string | null,
  scanStartedAt: string | null = scan.scanStartedAt,
): Promise<"retried" | "held"> {
  const log = deps.log ?? (() => undefined);
  const attemptCount = scan.attemptCount + 1;
  const next = musicScanBackoff(attemptCount, deps.now);
  await deps.save(scan.id, {
    status: "pending",
    attemptCount,
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
        const outcome = await fail(scan, deps, "scan_threw", scan.muxReadyAt);
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
