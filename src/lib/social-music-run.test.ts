import { describe, expect, it, vi } from "vitest";

import type { MusicIdentifyResult } from "@/lib/social-music-scan";
import { MUSIC_SCAN_MAX_ATTEMPTS, socialVideoVisibleToOthers } from "@/lib/social-music-scan";
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
    muxReadyAt: null,
    scanStartedAt: null,
    ...overrides,
  };
}

const READY: MuxAudioAsset = {
  status: "ready",
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
    budgetMs: 60_000,
    listPending: async () => [],
    loadAsset: async () => READY,
    requestAudioRendition: async (assetId) => {
      renditionRequests.push(assetId);
    },
    downloadAudio: async () => new Uint8Array([1, 2, 3]),
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
    expect(run.saves[0]).toMatchObject({ status: "pending", muxReadyAt: null });
    expect(run.saves[0]?.attemptCount).toBeUndefined();
    expect(run.renditionRequests).toEqual([]);
  });

  it("stamps mux ready and requests a missing audio rendition", async () => {
    const run = deps({ loadAsset: async () => ({ status: "ready", static_renditions: { files: [] } }) });
    await expect(processMusicScan(scan(), run)).resolves.toBe("waiting");
    expect(run.renditionRequests).toEqual(["asset12345678"]);
    expect(run.saves[0]?.muxReadyAt).toBe(NOW.toISOString());
    expect(run.saves[0]?.attemptCount).toBeUndefined();
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
    expect(run.saves[0]?.muxReadyAt).toBe("2026-10-08T17:59:00.000Z");
  });

  it("allows a no-match and does not store a title", async () => {
    const run = deps();
    await expect(processMusicScan(scan(), run)).resolves.toBe("allowed");
    expect(run.saves[0]).toMatchObject({
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
    expect(run.saves[0]?.status).toBe("blocked");
    const [row] = musicReviewDirectoryRows([
      {
        id: "scan-1",
        surface: "post",
        authorName: "Elena Ruiz",
        status: "blocked",
        vendorTitle: run.saves[0]?.vendorTitle ?? null,
        vendorArtist: run.saves[0]?.vendorArtist ?? null,
        vendorScore: run.saves[0]?.vendorScore ?? null,
        assetId: "asset12345678",
      },
    ]);
    expect(row?.trailing).toBe(SOCIAL_MUSIC_REVIEW.blocked);
    expect(run.saves[0]?.status).toBe("blocked");
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
    expect(run.saves[0]).toMatchObject({ status: "blocked", vendorScore: 100, vendorTitle: "Fixture Track" });
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
    expect(run.saves[0]).toMatchObject({ status: "allowed", vendorTitle: null, vendorScore: null });
    expect(run.logs[0]).toMatchObject({ decision: "allow", staff_priority: null });
  });

  it("retries a vendor error and holds after the attempt cap", async () => {
    const error: MusicIdentifyResult = { kind: "error", code: "timeout", retryable: true };
    const first = deps({ identify: async () => error });
    await expect(processMusicScan(scan(), first)).resolves.toBe("retried");
    expect(first.saves[0]).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastError: "timeout",
    });
    expect(first.saves[0]?.nextAttemptAt).toBe("2026-10-08T18:00:30.000Z");

    const last = deps({ identify: async () => error });
    await expect(processMusicScan(scan({ attemptCount: MUSIC_SCAN_MAX_ATTEMPTS - 1 }), last)).resolves.toBe("held");
    expect(last.saves[0]).toMatchObject({
      status: "pending",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
    });
  });

  it("holds a Mux asset error immediately", async () => {
    const run = deps({ loadAsset: async () => ({ status: "errored" }) });
    await expect(processMusicScan(scan(), run)).resolves.toBe("held");
    expect(run.saves[0]).toMatchObject({
      status: "pending",
      attemptCount: MUSIC_SCAN_MAX_ATTEMPTS,
      nextAttemptAt: null,
      lastError: "mux_asset_errored",
    });
  });

  it("retries a rendition request failure and does not count a request that already exists", async () => {
    const failed = deps({
      loadAsset: async () => ({ status: "ready", static_renditions: { files: [] } }),
      requestAudioRendition: async () => {
        throw Object.assign(new Error("unavailable"), { status: 500 });
      },
    });
    await expect(processMusicScan(scan(), failed)).resolves.toBe("retried");
    expect(failed.saves[0]).toMatchObject({
      status: "pending",
      attemptCount: 1,
      lastError: "mux_rendition_request",
    });

    const already = deps({
      loadAsset: async () => ({ status: "ready", static_renditions: { files: [] } }),
      requestAudioRendition: async () => undefined,
    });
    await expect(processMusicScan(scan({ attemptCount: MUSIC_SCAN_MAX_ATTEMPTS - 1 }), already)).resolves.toBe(
      "waiting",
    );
    expect(already.saves[0]?.attemptCount).toBeUndefined();
    expect(already.saves[0]?.nextAttemptAt).toBe("2026-10-08T18:00:20.000Z");
  });

  it("retries a download failure and an identify throw", async () => {
    const download = deps({
      downloadAudio: async () => {
        throw new Error("network");
      },
    });
    await expect(processMusicScan(scan(), download)).resolves.toBe("retried");
    expect(download.saves[0]?.lastError).toBe("mux_audio_read");

    const thrown = deps({
      identify: async () => {
        throw new Error("boom");
      },
    });
    await expect(processMusicScan(scan(), thrown)).resolves.toBe("retried");
    expect(thrown.saves[0]?.lastError).toBe("identify_threw");
  });
});

describe("runSocialMusicBatch", () => {
  it("continues after a thrown save", async () => {
    const pending = [scan({ id: "a" }), scan({ id: "b" })];
    let calls = 0;
    const run = deps({
      now: new Date(),
      listPending: async () => pending,
      save: async () => {
        calls += 1;
        if (calls === 1) throw new Error("write failed");
      },
    });
    const summary = await runSocialMusicBatch(run);
    expect(summary).toMatchObject({ checked: 2, failed: 1, allowed: 1 });
  });
});
