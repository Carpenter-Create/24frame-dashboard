import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { viewerMayMintSocialMuxPlayback } from "@/lib/social-media-access";
import { mintSocialMuxPlaybackTokens } from "@/lib/social-mux-server";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";

import { warmExploreForYouPlaybackTokens } from "./social-explore-mux-warm";

vi.mock("@/lib/social-media-access", () => ({
  viewerMayMintSocialMuxPlayback: vi.fn(),
}));

vi.mock("@/lib/social-mux-server", () => ({
  mintSocialMuxPlaybackTokens: vi.fn(),
}));

const TOKENS = { playback: "play.jwt", thumbnail: "thumb.jwt", storyboard: "board.jwt" };

function item(playbackId: string, playbackPolicy: "public" | "signed"): SocialExploreForYouItem {
  return {
    postId: playbackId,
    playbackId,
    playbackPolicy,
    body: "",
    authorId: "11111111-1111-4111-8111-111111111111",
    authorHandle: "ada",
    authorName: "Ada",
    authorPhotoUrl: "/api/social/avatar/11111111-1111-4111-8111-111111111111",
    likeCount: 0,
    commentCount: 0,
    liked: false,
    canLike: true,
  };
}

describe("warmExploreForYouPlaybackTokens", () => {
  beforeEach(() => {
    vi.mocked(viewerMayMintSocialMuxPlayback).mockReset();
    vi.mocked(mintSocialMuxPlaybackTokens).mockReset();
    vi.mocked(viewerMayMintSocialMuxPlayback).mockResolvedValue(true);
    vi.mocked(mintSocialMuxPlaybackTokens).mockResolvedValue(TOKENS);
  });

  it("mints a signed slide only inside the first two and skips a later one", async () => {
    const items = [
      item("FirstSignedPlayback1", "signed"),
      item("PublicPlaybackId0001", "public"),
      item("ThirdSignedPlayback1", "signed"),
    ];
    const warmed = await warmExploreForYouPlaybackTokens("user-1", items);
    expect(vi.mocked(viewerMayMintSocialMuxPlayback).mock.calls).toEqual([
      ["user-1", "FirstSignedPlayback1"],
    ]);
    expect(vi.mocked(mintSocialMuxPlaybackTokens).mock.calls).toEqual([["FirstSignedPlayback1"]]);
    expect(warmed[0]?.playbackTokens).toEqual(TOKENS);
    expect(warmed[1]?.playbackTokens).toBeUndefined();
    expect(warmed[2]?.playbackTokens).toBeUndefined();
    expect(warmed[0]?.postId).toBe("FirstSignedPlayback1");
  });

  it("mints the active signed item and the next signed item", async () => {
    const items = [item("ActiveSignedPlayback", "signed"), item("NextSignedPlayback01", "signed")];
    const warmed = await warmExploreForYouPlaybackTokens("user-1", items);
    expect(warmed.map((row) => row.playbackTokens?.thumbnail)).toEqual(["thumb.jwt", "thumb.jwt"]);
    expect(vi.mocked(mintSocialMuxPlaybackTokens)).toHaveBeenCalledTimes(2);
  });

  it("does not copy warm tokens onto a later slide that reuses the playback id", async () => {
    const shared = item("SharedSignedPlayback1", "signed");
    const later = { ...shared, postId: "later-same-playback" };
    const warmed = await warmExploreForYouPlaybackTokens("user-1", [
      shared,
      item("PublicPlaybackId0001", "public"),
      later,
    ]);
    expect(vi.mocked(mintSocialMuxPlaybackTokens).mock.calls).toEqual([["SharedSignedPlayback1"]]);
    expect(warmed[0]?.playbackTokens).toEqual(TOKENS);
    expect(warmed[1]?.playbackTokens).toBeUndefined();
    expect(warmed[2]?.playbackTokens).toBeUndefined();
    expect(warmed[2]).toBe(later);
  });

  it("leaves the item without tokens when the grant or the mint fails", async () => {
    vi.mocked(viewerMayMintSocialMuxPlayback).mockResolvedValueOnce(false);
    const denied = await warmExploreForYouPlaybackTokens("user-1", [item("DeniedSignedPlayback1", "signed")]);
    expect(denied[0]?.playbackTokens).toBeUndefined();
    expect(mintSocialMuxPlaybackTokens).not.toHaveBeenCalled();

    vi.mocked(viewerMayMintSocialMuxPlayback).mockResolvedValue(true);
    vi.mocked(mintSocialMuxPlaybackTokens).mockRejectedValue(new Error("no key"));
    const failed = await warmExploreForYouPlaybackTokens("user-1", [item("FailedSignedPlayback1", "signed")]);
    expect(failed[0]?.playbackTokens).toBeUndefined();
  });

  it("is what the Explore page calls, without importing the Mux client there", () => {
    const page = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
    expect(page).toContain("warmExploreForYouPlaybackTokens");
    expect(page).not.toContain("@/lib/social-mux-server");
    expect(page).not.toContain("MUX_TOKEN_SECRET");
    expect(page).not.toContain("Reels");
  });
});
