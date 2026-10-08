import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";

import { handler, missingSocialMusicEnv, SOCIAL_MUSIC_REQUIRED_ENV } from "../../workers/social-music/handler";

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
  });
});
