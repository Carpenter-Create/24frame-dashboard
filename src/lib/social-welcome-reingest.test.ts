import { describe, expect, it } from "vitest";

import { reingestSocialS3Videos, type SocialReingestCandidate, type SocialReingestDeps } from "@/lib/social-welcome-reingest";

function candidate(overrides: Partial<SocialReingestCandidate> = {}): SocialReingestCandidate {
  return {
    surface: "post",
    parentId: "post-1",
    authorId: "author-1",
    key: "posts/author-1/clip.mp4",
    expired: false,
    assetId: null,
    playbackId: null,
    ...overrides,
  };
}

function deps(overrides: Partial<SocialReingestDeps> = {}): SocialReingestDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    head: async () => true,
    presign: async () => "https://example.test/clip",
    createAsset: async () => {
      calls.push("create");
      return { assetId: "assetREINGEST1" };
    },
    loadAsset: async () => ({ playbackId: "playREINGEST01", duration: 12, status: "ready" }),
    deleteAsset: async () => {
      calls.push("delete");
    },
    bind: async () => {
      calls.push("bind");
    },
    saveParent: async () => {
      calls.push("save");
    },
    saveInProgress: async () => {
      calls.push("progress");
    },
    markUnfinished: async () => {
      calls.push("unfinished");
    },
    alreadyUnfinished: async () => false,
    ...overrides,
  };
}

describe("reingestSocialS3Videos", () => {
  it("counts candidates and does not write on a dry run", async () => {
    const harness = deps();
    const report = await reingestSocialS3Videos({
      execute: false,
      candidates: [candidate(), candidate({ surface: "story", parentId: "story-1", expired: true })],
      deps: harness,
    });
    expect(report).toMatchObject({ dryRun: true, candidates: 1, skippedExpired: 1, bound: 0 });
    expect(harness.calls).toEqual([]);
  });

  it("skips an expired story on the execute path and binds a ready asset", async () => {
    const harness = deps();
    const report = await reingestSocialS3Videos({
      execute: true,
      candidates: [
        candidate({ surface: "welcome", parentId: "profile-1", key: "posts/author-1/welcome.mp4" }),
        candidate({ surface: "story", parentId: "story-old", expired: true }),
      ],
      deps: harness,
    });
    expect(report.skippedExpired).toBe(1);
    expect(report.bound).toBe(1);
    expect(harness.calls).toEqual(["create", "progress", "bind", "save"]);
  });

  it("marks a missing source unfinished and does not create a second preparing asset", async () => {
    const missing = deps({ head: async () => false });
    const missed = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate()],
      deps: missing,
    });
    expect(missed.unfinished).toBe(1);
    expect(missing.calls).toEqual(["unfinished"]);

    const preparing = deps({
      loadAsset: async () => ({ playbackId: null, duration: null, status: "preparing" }),
    });
    const again = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate({ assetId: "assetREINGEST1" })],
      deps: preparing,
    });
    expect(again.preparing).toBe(1);
    expect(preparing.calls).toEqual([]);
  });

  it("deletes an asset past the cap and does not publish it", async () => {
    const harness = deps({
      loadAsset: async () => ({ playbackId: "playREINGEST01", duration: 481, status: "ready" }),
    });
    const report = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate({ assetId: "assetREINGEST1" })],
      deps: harness,
    });
    expect(report.unfinished).toBe(1);
    expect(report.bound).toBe(0);
    expect(harness.calls).toEqual(["delete", "unfinished"]);
  });
});
