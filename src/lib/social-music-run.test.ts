import { describe, expect, it } from "vitest";

import type { MusicIdentifyResult } from "@/lib/social-music-scan";
import { MUSIC_SCAN_MAX_ATTEMPTS, MUSIC_SCAN_PREP_MAX_MS, socialVideoVisibleToOthers } from "@/lib/social-music-scan";
import { musicReviewDirectoryRows, SOCIAL_MUSIC_REVIEW } from "@/lib/social-music-review";
import {
  processMusicScan,
  runSocialMusicBatch,
  type MusicScanPatch,
  type PendingMusicScan,
  type SocialMusicRunDeps,
} from "@/lib/social-music-run";
import type { MuxAudioAsset } from "@/lib/social-music-audio";

const NOW = new Date("2026-10-08T18:00:00.000Z");

function scan(overrides: Partial<PendingMusicScan> = {}): PendingMusicScan {
  return {
    id: "scan-1",
    surface: "post",
    assetId: "asset12345678",
    playbackId: "play12345678",
    attemptCount: 0,
    createdAt: NOW.toISOString(),
    muxReadyAt: null,
    scanStartedAt: null,
    ...overrides,
  };
}

const READY: MuxAudioAsset = {
  status: "ready",
  duration: 8,
  playback_ids: [{ id: "play12345678", policy: "signed" }],
  static_renditions: { files: [{ resolution: "audio-only", status: "ready" }] },
};

function deps(overrides: Partial<SocialMusicRunDeps> = {}): SocialMusicRunDeps & {
  saves: MusicScanPatch[];
  logs: unknown[];
  renditionRequests: string[];
} {
  const saves: MusicScanPatch[] = [];
  const logs: unknown[] = [];
  const renditionRequests: string[] = [];
  return {
    now: NOW,
    clock: () => NOW.getTime(),
    budgetMs: 60_000,
    listPending: async () => [],
    loadAsset: async () => READY,
    requestAudioRendition: async (assetId) => {
      renditionRequests.push(assetId);
    },
    downloadAudio: async () => new Uint8Array([1, 2, 3]),
    measureAudioDuration: () => 8,
    sliceWindow: (_audio, window) => new Uint8Array([window.startSeconds + 1, 2, 3]),
    identify: async () => ({ kind: "no_match", code: 1001 }),
    save: async (_id, patch) => {
      saves.push(patch);
    },
    log: (line) => {
      logs.push(line);
    },
    saves,
    logs,
    renditionRequests,
    ...overrides,
  };
}

describe("processMusicScan", () => {
  it("waits for a preparing asset without counting an attempt or stamping mux ready", async () => {
    const run = deps({ loadAsset: async () => ({ status: "preparing" }) });
    await expect(processMusicScan(scan(), run)).resolves.toBe("waiting");
    expect(run.saves.at(-1)).toMatchObject({ status: "pending", muxReadyAt: null });
    expect(run.saves.at(-1)?.attemptCount).toBeUndefined();
    expect(run.renditionRequests).toEqual([]);
  });

  it("stamps mux ready and requests a missing audio rendition", async () => {
    const run = deps({ loadAsset: async () => ({ status: "ready", static_renditions: { files: [] } }) });
    await expect(processMusicScan(scan(), run)).resolves.toBe("waiting");
    expect(run.renditionRequests).toEqual(["asset12345678"]);
    expect(run.saves.at(-1)?.muxReadyAt).toBe(NOW.toISOString());
    expect(run.saves.at(-1)?.attemptCount).toBeUndefined();
  });

  it("waits while the rendition is preparing", async () => {
    const run = deps({
      loadAsset: async () => ({
        status: "ready",
        static_renditions: { files: [{ resolution: "audio-only", status: "preparing" }] },
      }),
    });
    await expect(processMusicScan(scan({ muxReadyAt: "2026-10-08T17:59:00.000Z" }), run)).resolves.toBe("waiting");
    expect(run.renditionRequests).toEqual([]);
    expect(run.saves.at(-1)?.muxReadyAt).toBe("2026-10-08T17:59:00.000Z");
  });

  it("allows a no-match and does not store a title", async () => {
    const run = deps();
    await expect(processMusicScan(scan(), run)).resolves.toBe("allowed");
    expect(run.saves.at(-1)).toMatchObject({
      status: "allowed",
      vendor: "acrcloud",
      vendorStatusCode: 1001,
      vendorTitle: null,
      vendorArtist: null,
      decidedAt: NOW.toISOString(),
      scanStartedAt: NOW.toISOString(),
      muxReadyAt: NOW.toISOString(),
    });
    expect(JSON.stringify(run.logs[0])).not.toContain("Fixture");
    expect(run.logs[0]).toMatchObject({
      msg: "social music scan",
      decision: "allow",
      mux_ready_at: NOW.toISOString(),
      decided_at: NOW.toISOString(),
    });
  });

  it("blocks at 25, keeps that status, and lists the same row for staff", async () => {
    const run = deps({
      identify: async () => ({
        kind: "match",
        code: 0,
        score: 25,
        title: "Fixture Track",
        artist: "Fixture Artist",
        album: null,
        acrid: "acr-1",
        isrc: null,
        label: null,
      }),
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("blocked");
    expect(run.saves.at(-1)?.status).toBe("blocked");
    const [row] = musicReviewDirectoryRows([
      {
        id: "scan-1",
        surface: "post",
        authorName: "Elena Ruiz",
        status: "blocked",
        vendorTitle: run.saves.at(-1)?.vendorTitle ?? null,
        vendorArtist: run.saves.at(-1)?.vendorArtist ?? null,
        vendorScore: run.saves.at(-1)?.vendorScore ?? null,
        assetId: "asset12345678",
      },
    ]);
    expect(row?.trailing).toBe(SOCIAL_MUSIC_REVIEW.blocked);
    expect(run.saves.at(-1)?.status).toBe("blocked");
    expect(socialVideoVisibleToOthers([{ status: "blocked" }])).toBe(false);
    expect(run.logs[0]).toMatchObject({ decision: "block", staff_priority: "spot_check" });
    expect(JSON.stringify(run.logs[0])).not.toContain("Fixture Track");
  });

  it("blocks a score of 100 and marks it confident for the staff log only", async () => {
    const run = deps({
      identify: async () => ({
        kind: "match",
        code: 0,
        score: 100,
        title: "Fixture Track",
        artist: "Fixture Artist",
        album: null,
        acrid: null,
        isrc: null,
        label: null,
      }),
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("blocked");
    expect(run.saves.at(-1)).toMatchObject({ status: "blocked", vendorScore: 100, vendorTitle: "Fixture Track" });
    expect(run.logs[0]).toMatchObject({ decision: "block", staff_priority: "confident" });
  });

  it("passes a score of 24 and does not store a title", async () => {
    const run = deps({
      identify: async () => ({
        kind: "match",
        code: 0,
        score: 24,
        title: "Fixture Track",
        artist: "Fixture Artist",
        album: null,
        acrid: null,
        isrc: null,
        label: null,
      }),
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("allowed");
    expect(run.saves.at(-1)).toMatchObject({ status: "allowed", vendorTitle: null, vendorScore: null });
    expect(run.logs[0]).toMatchObject({ decision: "allow", staff_priority: null });
  });

  it("retries a vendor error and holds after the attempt cap", async () => {
    const error: MusicIdentifyResult = { kind: "error", code: "timeout", retryable: true };
    const first = deps({ identify: async () => error });
    await expect(processMusicScan(scan(), first)).resolves.toBe("retried");
    expect(first.saves.at(-1)).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastError: "timeout",
    });
    expect(first.saves.at(-1)?.nextAttemptAt).toBe("2026-10-08T18:00:30.000Z");

    const last = deps({ identify: async () => error });
    await expect(processMusicScan(scan({ attemptCount: MUSIC_SCAN_MAX_ATTEMPTS - 1 }), last)).resolves.toBe("held");
    expect(last.saves.at(-1)).toMatchObject({
      status: "pending",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
    });
  });

  it("holds a Mux asset error immediately", async () => {
    const run = deps({ loadAsset: async () => ({ status: "errored" }) });
    await expect(processMusicScan(scan(), run)).resolves.toBe("held");
    expect(run.saves.at(-1)).toMatchObject({
      status: "pending",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
      lastError: "mux_asset_errored",
    });
  });

  it("polls when the rendition request says it already exists", async () => {
    const run = deps({
      loadAsset: async () => ({ status: "ready", static_renditions: { files: [] } }),
      requestAudioRendition: async () => {
        throw Object.assign(new Error("Static rendition already exists"), { status: 400 });
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("waiting");
    expect(run.saves.at(-1)).toMatchObject({ status: "pending" });
    expect(run.saves.at(-1)?.attemptCount).toBeUndefined();
  });

  it("retries a transient rendition request error", async () => {
    const run = deps({
      loadAsset: async () => ({ status: "ready", static_renditions: { files: [] } }),
      requestAudioRendition: async () => {
        throw Object.assign(new Error("Mux request failed (503)"), { status: 503 });
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(run.saves.at(-1)).toMatchObject({ status: "pending", attemptCount: 1, lastError: "mux_rendition_request" });
  });

  it("holds a skipped audio rendition instead of allowing it", async () => {
    const run = deps({
      loadAsset: async () => ({
        status: "ready",
        static_renditions: { files: [{ resolution: "audio-only", status: "skipped" }] },
      }),
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(run.saves.at(-1)).toMatchObject({ status: "pending", lastError: "mux_audio_errored", attemptCount: 1 });
  });

  it("retries a download failure and an identify throw", async () => {
    const download = deps({
      downloadAudio: async () => {
        throw new Error("network");
      },
    });
    await expect(processMusicScan(scan(), download)).resolves.toBe("retried");
    expect(download.saves.at(-1)?.lastError).toBe("mux_audio_read");

    const thrown = deps({
      identify: async () => {
        throw new Error("boom");
      },
    });
    await expect(processMusicScan(scan(), thrown)).resolves.toBe("retried");
    expect(thrown.saves.at(-1)?.lastError).toBe("identify_threw");
  });

  it("keeps empty audio pending", async () => {
    const run = deps({ downloadAudio: async () => new Uint8Array() });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(run.saves.at(-1)).toMatchObject({ status: "pending", lastError: "empty_audio", attemptCount: 1 });
  });

  it("blocks on the highest score across windows", async () => {
    const scores = [10, 40, 24];
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 30 }),
      measureAudioDuration: () => 30,
      identify: async () => {
        const score = scores.shift() ?? 0;
        return {
          kind: "match",
          code: 0,
          score,
          title: "Fixture Track",
          artist: "Fixture Artist",
          album: null,
          acrid: null,
          isrc: null,
          label: null,
        };
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("blocked");
    expect(run.saves.at(-1)).toMatchObject({ status: "blocked", vendorScore: 40 });
  });

  it("leases an attempt before download, and a timeout does not count twice", async () => {
    let sawLease = false;
    const run = deps({
      downloadAudio: async () => {
        sawLease = run.saves.some((patch) => patch.attemptCount === 1 && patch.lastError == null);
        throw new Error("timeout");
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(sawLease).toBe(true);
    expect(run.saves.at(-1)).toMatchObject({ lastError: "mux_audio_read", attemptCount: 1 });
    expect(run.saves.some((patch) => (patch.attemptCount ?? 0) > 1)).toBe(false);
  });

  it("holds a preparing asset after the max age without polling forever", async () => {
    const createdAt = new Date(NOW.getTime() - MUSIC_SCAN_PREP_MAX_MS - 1_000).toISOString();
    const run = deps({ loadAsset: async () => ({ status: "preparing" }) });
    await expect(processMusicScan(scan({ createdAt }), run)).resolves.toBe("held");
    expect(run.saves.at(-1)).toMatchObject({
      lastError: "mux_prep_expired",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
    });
    expect(run.renditionRequests).toEqual([]);
  });

  it("holds when the signed playback id is not the scan playback id", async () => {
    let identified = false;
    const run = deps({
      loadAsset: async () => ({
        ...READY,
        playback_ids: [{ id: "otherplay999", policy: "signed" }],
      }),
      identify: async () => {
        identified = true;
        return { kind: "no_match", code: 1001 };
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("held");
    expect(identified).toBe(false);
    expect(run.saves.at(-1)).toMatchObject({
      lastError: "mux_playback_mismatch",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
    });
  });

  it("retries an unknown duration and never identifies it", async () => {
    let identified = false;
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: null }),
      identify: async () => {
        identified = true;
        return { kind: "no_match", code: 1001 };
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(identified).toBe(false);
    expect(run.saves.at(-1)).toMatchObject({ lastError: "unknown_duration", status: "pending" });
  });

  it("retries a clip longer than the cap without identifying", async () => {
    let identified = false;
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 481 }),
      identify: async () => {
        identified = true;
        return { kind: "no_match", code: 1001 };
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(identified).toBe(false);
    expect(run.saves.at(-1)).toMatchObject({
      lastError: "duration_over_cap",
      status: "pending",
      attemptCount: 1,
    });
    expect(run.saves.at(-1)?.nextAttemptAt).toEqual(expect.any(String));
  });

  it("rejects a window that is implausible or identical to another window", async () => {
    const huge = deps({
      loadAsset: async () => ({ ...READY, duration: 24 }),
      measureAudioDuration: () => 24,
      sliceWindow: () => new Uint8Array(512 * 1024 + 1),
    });
    await expect(processMusicScan(scan(), huge)).resolves.toBe("retried");
    expect(huge.saves.at(-1)?.lastError).toBe("window_implausible");

    const same = deps({
      loadAsset: async () => ({ ...READY, duration: 24 }),
      measureAudioDuration: () => 24,
      sliceWindow: () => new Uint8Array([7, 7, 7]),
    });
    await expect(processMusicScan(scan(), same)).resolves.toBe("retried");
    expect(same.saves.at(-1)?.lastError).toBe("window_not_distinct");
  });

  it("blocks when one window matches even if another window errors", async () => {
    const windows: number[] = [];
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 24 }),
      measureAudioDuration: () => 24,
      identify: async () => {
        windows.push(1);
        if (windows.length === 1) return { kind: "error", code: "timeout", retryable: true };
        return {
          kind: "match",
          code: 0,
          score: 30,
          title: "Fixture Track",
          artist: "Fixture Artist",
          album: null,
          acrid: null,
          isrc: null,
          label: null,
        };
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("blocked");
    expect(run.saves.at(-1)).toMatchObject({ status: "blocked", vendorScore: 30 });
  });

  it("pulls sibling allowed rows back to blocked", async () => {
    const blocked: { assetId: string; playbackId: string; exceptId: string }[] = [];
    const run = deps({
      identify: async () => ({
        kind: "match",
        code: 0,
        score: 80,
        title: "Fixture Track",
        artist: "Fixture Artist",
        album: null,
        acrid: null,
        isrc: null,
        label: null,
      }),
      blockSiblings: async (block) => {
        blocked.push({ assetId: block.assetId, playbackId: block.playbackId, exceptId: block.exceptId });
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("blocked");
    expect(blocked).toEqual([{ assetId: "asset12345678", playbackId: "play12345678", exceptId: "scan-1" }]);
  });

  it("holds when the m4a length and the Mux duration differ by more than one second", async () => {
    let sliced = false;
    const run = deps({
      measureAudioDuration: () => 30,
      sliceWindow: () => {
        sliced = true;
        return new Uint8Array([1]);
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("held");
    expect(sliced).toBe(false);
    expect(run.saves.at(-1)?.lastError).toBe("mux_audio_duration_mismatch");
  });

  it("plans the last window from the m4a when Mux is only slightly longer", async () => {
    const cuts: number[] = [];
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 12.8 }),
      measureAudioDuration: () => 12.3,
      sliceWindow: (_audio, window) => {
        cuts.push(window.endSeconds);
        return new Uint8Array([Math.round(window.startSeconds * 10) + 1, 2, 3]);
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("allowed");
    expect(cuts).toEqual([12, 12.3]);
  });

  it("blocks on the first window at 25 and does not cut the next window", async () => {
    const cuts: number[] = [];
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 24 }),
      measureAudioDuration: () => 24,
      sliceWindow: (_audio, window) => {
        cuts.push(window.startSeconds);
        if (window.startSeconds > 0) throw new Error("m4a_window_empty");
        return new Uint8Array([1, 2, 3]);
      },
      identify: async () => ({
        kind: "match",
        code: 0,
        score: 25,
        title: null,
        artist: null,
        album: null,
        acrid: null,
        isrc: null,
        label: null,
      }),
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("blocked");
    expect(cuts).toEqual([0]);
    expect(run.saves.at(-1)).toMatchObject({ status: "blocked", vendorScore: 25 });
  });

  it("fails closed when a window cut throws or the window is empty", async () => {
    const cut = deps({
      sliceWindow: () => {
        throw new Error("m4a_unreadable");
      },
    });
    await expect(processMusicScan(scan(), cut)).resolves.toBe("retried");
    expect(cut.saves.at(-1)?.lastError).toBe("window_cut");

    const empty = deps({
      sliceWindow: () => new Uint8Array(),
    });
    await expect(processMusicScan(scan(), empty)).resolves.toBe("retried");
    expect(empty.saves.at(-1)?.lastError).toBe("empty_audio");
  });

  it("stops inside the loop when the invocation budget is gone and keeps finished windows", async () => {
    let tick = NOW.getTime();
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 24 }),
      measureAudioDuration: () => 24,
      budgetMs: 1_000,
      clock: () => {
        tick += 400;
        return tick;
      },
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(run.saves.at(-1)?.lastError).toBe("scan_budget");
    const kept = run.saves.find((patch) => patch.windowResults && patch.windowResults.length > 0);
    expect(kept?.windowResults).toHaveLength(1);
  });

  it("does not rescan a window that was already stored", async () => {
    let calls = 0;
    const run = deps({
      loadAsset: async () => ({ ...READY, duration: 24 }),
      measureAudioDuration: () => 24,
      identify: async () => {
        calls += 1;
        return { kind: "no_match", code: 1001 };
      },
    });
    await expect(
      processMusicScan(
        scan({
          windows: [{ startSeconds: 0, endSeconds: 12, result: { kind: "no_match", code: 1001 } }],
        }),
        run,
      ),
    ).resolves.toBe("allowed");
    expect(calls).toBe(1);
  });

  it("backs off a rate limit without burning the leased attempt", async () => {
    const run = deps({
      identify: async () => ({ kind: "error", code: "3003", retryable: true }),
    });
    await expect(processMusicScan(scan(), run)).resolves.toBe("retried");
    expect(run.saves.at(-1)).toMatchObject({ lastError: "acr_rate_limit", attemptCount: 0 });

    const http = deps({
      identify: async () => ({ kind: "error", code: "http_429", retryable: true }),
    });
    await expect(processMusicScan(scan({ id: "scan-2" }), http)).resolves.toBe("retried");
    expect(http.saves.at(-1)?.attemptCount).toBe(0);
  });

  it("treats a silent 2004 window as clean and a tone as an error", async () => {
    const silent = deps({
      identify: async () => ({ kind: "error", code: "2004", retryable: true }),
      windowRms: () => 0,
    });
    await expect(processMusicScan(scan(), silent)).resolves.toBe("allowed");

    const near = deps({
      identify: async () => ({ kind: "error", code: "2004", retryable: true }),
      windowRms: () => 0.05,
    });
    await expect(processMusicScan(scan(), near)).resolves.toBe("retried");
    expect(near.saves.at(-1)?.lastError).toBe("2004");

    const tone = deps({
      identify: async () => ({ kind: "error", code: "2004", retryable: true }),
      windowRms: () => 0.4,
    });
    await expect(processMusicScan(scan(), tone)).resolves.toBe("retried");
  });
});

describe("runSocialMusicBatch", () => {
  it("continues after a thrown save", async () => {
    const pending = [scan({ id: "a" }), scan({ id: "b" })];
    const patches: MusicScanPatch[] = [];
    let calls = 0;
    const run = deps({
      now: new Date(),
      listPending: async () => pending,
      save: async (_id, patch) => {
        calls += 1;
        patches.push(patch);
        if (calls === 1) throw new Error("write failed");
      },
    });
    const summary = await runSocialMusicBatch(run);
    expect(summary).toMatchObject({ checked: 2, failed: 0, retried: 1, allowed: 1 });
    expect(patches.some((patch) => patch.lastError === "scan_threw" && patch.attemptCount === 1)).toBe(true);
  });

  it("advances eight throwing asset reads and still scans a healthy row", async () => {
    const pending = [
      ...Array.from({ length: 8 }, (_, index) => scan({ id: `bad-${index}`, assetId: `poison${index}123456` })),
      scan({ id: "ok", assetId: "asset12345678" }),
    ];
    const run = deps({
      now: new Date(),
      listPending: async () => pending,
      loadAsset: async (assetId) => {
        if (assetId.startsWith("poison")) throw new Error("mux down");
        return READY;
      },
    });
    const summary = await runSocialMusicBatch(run);
    expect(summary).toMatchObject({ checked: 9, retried: 8, allowed: 1, failed: 0 });
    expect(run.saves.filter((patch) => patch.lastError === "mux_asset_read")).toHaveLength(8);
  });

  it("does not scan again or flip a blocked decision on a second pass", async () => {
    const stored = { status: "pending" as "pending" | "allowed" | "blocked" };
    let identifies = 0;
    const identify = async (): Promise<MusicIdentifyResult> => {
      identifies += 1;
      return {
        kind: "match",
        code: 0,
        score: 100,
        title: "Fixture Track",
        artist: "Fixture Artist",
        album: null,
        acrid: null,
        isrc: null,
        label: null,
      };
    };
    const save = async (_id: string, patch: MusicScanPatch) => {
      if (stored.status !== "pending") return;
      if (patch.status) stored.status = patch.status;
    };
    const first = deps({ now: new Date(), listPending: async () => [scan()], identify, save });
    const blocked = await runSocialMusicBatch(first);
    expect(blocked.blocked).toBe(1);
    expect(stored.status).toBe("blocked");
    expect(identifies).toBe(1);

    const second = deps({
      now: new Date(),
      listPending: async () => (stored.status === "pending" ? [scan()] : []),
      identify: async () => {
        identifies += 1;
        return { kind: "no_match", code: 1001 };
      },
      save,
    });
    const again = await runSocialMusicBatch(second);
    expect(again.checked).toBe(0);
    expect(identifies).toBe(1);
    expect(stored.status).toBe("blocked");

    await processMusicScan(scan(), second);
    expect(stored.status).toBe("blocked");
  });
});
