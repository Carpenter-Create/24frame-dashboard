import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { socialVideoKeyDigest } from "@/lib/social-music-scan";
import {
  reingestSocialS3Videos,
  socialReingestKeyForDigest,
  socialReingestMediaWithMux,
  socialReingestVideoKey,
  type SocialReingestCandidate,
  type SocialReingestDeps,
  type SocialReingestSettled,
} from "@/lib/social-welcome-reingest";

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
    retirePlaceholder: async () => {
      calls.push("retire");
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
    expect(harness.calls).toEqual(["create", "progress", "bind", "save", "retire"]);
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

  it("keeps a nominal eight minute asset and does not create a second one", async () => {
    let created = 0;
    let remembered: string | null = null;
    const harness = deps({
      createAsset: async () => {
        created += 1;
        return { assetId: "assetREINGEST1" };
      },
      loadAsset: async () => ({ playbackId: "playREINGEST01", duration: 480.021, status: "ready" }),
      saveInProgress: async (_candidate, assetId) => {
        remembered = assetId;
      },
    });
    const first = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate({ surface: "welcome", parentId: "profile-1" })],
      deps: harness,
    });
    expect(first.bound).toBe(1);
    expect(created).toBe(1);
    const second = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate({ surface: "welcome", parentId: "profile-1", assetId: remembered, playbackId: "playREINGEST01" })],
      deps: harness,
    });
    expect(second.bound).toBe(0);
    expect(created).toBe(1);
    expect(socialReingestVideoKey({ contentType: "video/mp4", key: "posts/a/clip.mp4" })).toBe("posts/a/clip.mp4");
    expect(socialReingestVideoKey({ kind: "image", contentType: "image/jpeg", key: "posts/a/still.jpg" })).toBeNull();
  });

  it("saves every video on one parent together and continues after a parent failure", async () => {
    let n = 0;
    const saved: SocialReingestSettled[][] = [];
    const harness = deps({
      createAsset: async () => {
        n += 1;
        return { assetId: `assetRE000000${n}` };
      },
      loadAsset: async (assetId) => ({ playbackId: `playRE000000${assetId.slice(-1)}`, duration: 8, status: "ready" }),
      saveParent: async (_parent, settled) => {
        saved.push([...settled]);
        if (saved.length === 1) throw new Error("half");
      },
    });
    const report = await reingestSocialS3Videos({
      execute: true,
      candidates: [
        candidate({ key: "posts/author-1/one.mp4" }),
        candidate({ key: "posts/author-1/two.mp4" }),
        candidate({ parentId: "post-2", key: "posts/author-1/three.mp4" }),
      ],
      deps: harness,
    });
    expect(saved[0]).toHaveLength(2);
    expect(saved[0]?.map((row) => row.candidate.key)).toEqual(["posts/author-1/one.mp4", "posts/author-1/two.mp4"]);
    expect(saved[1]).toHaveLength(1);
    expect(report.unfinished).toBe(1);
    expect(report.bound).toBe(1);
    expect(harness.calls).not.toContain("unfinished");
    const media = [
      { kind: "video", key: "posts/author-1/one.mp4" },
      { kind: "video", key: "posts/author-1/two.mp4" },
    ];
    const second = socialVideoKeyDigest("posts/author-1/two.mp4");
    expect(socialReingestKeyForDigest(media, second)).toBe("posts/author-1/two.mp4");
    expect(socialReingestKeyForDigest(media, socialVideoKeyDigest("posts/author-1/one.mp4"))).not.toBe(
      "posts/author-1/two.mp4",
    );
    const both = socialReingestMediaWithMux(media, saved[0] ?? []);
    expect(both.every((entry) => (entry as { provider?: string }).provider === "mux")).toBe(true);
  });

  it("retries a thrown parent and retires a source that is already gone", async () => {
    let save = 0;
    const marked: string[] = [];
    const harness = deps({
      saveParent: async () => {
        save += 1;
        if (save === 1) throw new Error("lock timeout");
      },
      markUnfinished: async (_candidate, reason) => {
        marked.push(reason);
      },
    });
    const first = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate()],
      deps: harness,
    });
    expect(first.bound).toBe(0);
    expect(first.unfinished).toBe(1);
    expect(marked).toEqual([]);
    const second = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate({ assetId: "assetREINGEST1" })],
      deps: harness,
    });
    expect(second.bound).toBe(1);
    expect(marked).toEqual([]);

    const gone = deps();
    const dry = await reingestSocialS3Videos({
      execute: false,
      candidates: [candidate({ sourceGone: true, key: "" })],
      deps: gone,
    });
    expect(dry.bound).toBe(0);
    expect(gone.calls).toEqual([]);
    const retired = await reingestSocialS3Videos({
      execute: true,
      candidates: [candidate({ sourceGone: true, key: "" })],
      deps: gone,
    });
    expect(retired.bound).toBe(0);
    expect(retired.unfinished).toBe(0);
    expect(gone.calls).toEqual(["retire"]);
    const script = readFileSync("scripts/social/reingest-welcome-video.ts", "utf8");
    expect(script).not.toContain("reingest_failed");
    const library = readFileSync("src/lib/social-welcome-reingest.ts", "utf8");
    const caught = library.slice(library.indexOf("} catch (error) {"), library.indexOf("return report;"));
    expect(caught).not.toContain("markUnfinished");
  });
});
