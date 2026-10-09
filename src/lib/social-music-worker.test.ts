import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import {
  handler,
  listPending,
  missingSocialMusicEnv,
  SOCIAL_MUSIC_LAMBDA_TIMEOUT_MS,
  SOCIAL_MUSIC_REQUIRED_ENV,
  SOCIAL_MUSIC_RUN_BUDGET_MS,
  SOCIAL_MUSIC_SIBLING_BLOCK_STATUSES,
} from "../../workers/social-music/handler";

const ENV_SNAPSHOT = { ...process.env };

describe("social music Lambda handler", () => {
  afterEach(() => {
    process.env = { ...ENV_SNAPSHOT };
  });

  it("names every credential the worker needs", () => {
    for (const name of SOCIAL_MUSIC_REQUIRED_ENV) delete process.env[name];
    expect(missingSocialMusicEnv().sort()).toEqual([...SOCIAL_MUSIC_REQUIRED_ENV].sort());
  });

  it("refuses to run when ACRCloud or Mux env is unset", async () => {
    for (const name of SOCIAL_MUSIC_REQUIRED_ENV) process.env[name] = "set";
    delete process.env.ACRCLOUD_ACCESS_SECRET;
    delete process.env.MUX_TOKEN_ID;
    await expect(handler()).rejects.toThrow(/Missing env: .*ACRCLOUD_ACCESS_SECRET/);
    await expect(handler()).rejects.toThrow(/MUX_TOKEN_ID/);
  });

  it("decides through the shared batch, not a second worker", () => {
    const source = readFileSync("workers/social-music/handler.ts", "utf8");
    expect(source).toContain("runSocialMusicBatch");
    expect(source).toContain('.eq("status", "pending")');
    expect(source).toContain("blockSiblings");
    expect(source).toContain("sliceWindow: (audio, window) => sliceSocialMusicAudio(audio, window)");
    expect(source).toContain("SOCIAL_MUSIC_SIBLING_BLOCK_STATUSES");
    expect(source).toContain('.in("status", [...SOCIAL_MUSIC_SIBLING_BLOCK_STATUSES])');
    expect(source).not.toContain('.eq("status", "allowed")');
    expect(source).toContain("created_at");
    expect(source).not.toContain("asset_start_time");
    expect(source).not.toContain("phase0MusicAllowlist");
    expect(source).not.toContain("custom_files");
    expect(source).not.toContain("audd");
    expect(source).toContain("retireSupersededScan");
    expect(source).toContain("retire_superseded_music_scan");
  });

  it("retires a scan whose parent lost the pair, and keeps one whose parent still has it", async () => {
    const row = {
      id: "scan-1",
      surface: "welcome" as const,
      asset_id: "asset12345678",
      playback_id: "play12345678",
      attempt_count: 1,
      created_at: "2026-10-08T18:00:00.000Z",
      mux_ready_at: null,
      scan_started_at: null,
      window_results: [],
      post_id: null,
      story_id: null,
      profile_id: "55555555-5555-4555-8555-000000000099",
      last_error: null,
    };
    const calls: { id: string; retired: boolean }[] = [];
    const admin = {
      from: () => {
        const api = {
          select: () => api,
          eq: () => api,
          not: () => api,
          lte: () => api,
          order: () => api,
          limit: () => Promise.resolve({ data: [row], error: null }),
        };
        return api;
      },
      rpc: async (_name: string, args: { p_id: string }) => {
        const retired = calls.length === 0;
        calls.push({ id: args.p_id, retired });
        return { data: retired, error: null };
      },
    };
    const dropped = await listPending(admin as never, new Date("2026-10-08T18:05:00.000Z"));
    expect(calls).toEqual([{ id: "scan-1", retired: true }]);
    expect(dropped).toEqual([]);
    const kept = await listPending(admin as never, new Date("2026-10-08T18:05:00.000Z"));
    expect(calls[1]).toEqual({ id: "scan-1", retired: false });
    expect(kept.map((scan) => scan.id)).toEqual(["scan-1"]);
  });

  it("blocks pending siblings and stays inside the Lambda timeout", () => {
    expect([...SOCIAL_MUSIC_SIBLING_BLOCK_STATUSES]).toEqual(["allowed", "pending"]);
    expect(SOCIAL_MUSIC_RUN_BUDGET_MS).toBeLessThanOrEqual(SOCIAL_MUSIC_LAMBDA_TIMEOUT_MS);
    expect(SOCIAL_MUSIC_LAMBDA_TIMEOUT_MS).toBe(300_000);
  });
});
