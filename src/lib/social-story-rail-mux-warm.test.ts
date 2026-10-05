import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { viewerMayMintSocialMuxPlayback } from "@/lib/social-media-access";
import { mintSocialMuxPlaybackTokens } from "@/lib/social-mux-server";
import { SOCIAL_STORIES_RAIL_LIMIT } from "@/lib/social-home-bounds";
import type { SocialStoryRailCard } from "@/lib/social-feed";
import { SOCIAL_STORY_RAIL_MUX_WARM_AHEAD } from "@/lib/social-story-rail-mint";

import { warmStoryRailPlaybackTokens } from "./social-story-rail-mux-warm";

vi.mock("@/lib/social-media-access", () => ({
  viewerMayMintSocialMuxPlayback: vi.fn(),
}));

vi.mock("@/lib/social-mux-server", () => ({
  mintSocialMuxPlaybackTokens: vi.fn(),
}));

const TOKENS = { playback: "play.jwt", thumbnail: "thumb.jwt", storyboard: "board.jwt" };
const OBJECT_ID = "22222222-2222-4222-8222-222222222222";

function authorId(index: number): string {
  return `11111111-1111-4111-8111-11111111110${index}`;
}

function card(
  index: number,
  playbackPolicy: "public" | "signed" | "still",
): SocialStoryRailCard {
  const author = authorId(index);
  const signed = playbackPolicy !== "still";
  return {
    authorId: author,
    storyIds: [`s${index}`],
    unseen: true,
    latest: {
      id: `s${index}`,
      author_id: author,
      body: null,
      media: signed
        ? [
            {
              kind: "video",
              key: `stories/${author}/${OBJECT_ID}.mp4`,
              contentType: "video/mp4",
              provider: "mux",
              playbackId: `RailWarm${index}PlaybackA`,
              playbackPolicy,
            },
          ]
        : [
            {
              kind: "image",
              key: `stories/${author}/${OBJECT_ID}.jpg`,
              contentType: "image/jpeg",
            },
          ],
      expires_at: "2099-01-01T00:00:00.000Z",
      created_at: "2026-09-14T12:00:00.000Z",
    },
  };
}

describe("warmStoryRailPlaybackTokens", () => {
  beforeEach(() => {
    vi.mocked(viewerMayMintSocialMuxPlayback).mockReset();
    vi.mocked(mintSocialMuxPlaybackTokens).mockReset();
    vi.mocked(viewerMayMintSocialMuxPlayback).mockResolvedValue(true);
    vi.mocked(mintSocialMuxPlaybackTokens).mockResolvedValue(TOKENS);
  });

  it("keeps the rail cap and warms only the active card and the next", () => {
    expect(SOCIAL_STORY_RAIL_MUX_WARM_AHEAD).toBe(2);
    expect(SOCIAL_STORY_RAIL_MUX_WARM_AHEAD).toBeLessThan(SOCIAL_STORIES_RAIL_LIMIT);
  });

  it("mints signed cards only inside the first two and skips the rest of the ring", async () => {
    const cards = [
      card(0, "signed"),
      card(1, "still"),
      ...Array.from({ length: 6 }, (_, index) => card(index + 2, "signed")),
    ];
    const warmed = await warmStoryRailPlaybackTokens("user-1", cards);
    expect(vi.mocked(mintSocialMuxPlaybackTokens).mock.calls).toEqual([["RailWarm0PlaybackA"]]);
    expect(warmed).toEqual([
      { authorId: authorId(0), playbackId: "RailWarm0PlaybackA", thumbnail: "thumb.jwt" },
    ]);
    expect(mintSocialMuxPlaybackTokens).toHaveBeenCalledTimes(1);
  });

  it("mints the active signed card and the next signed card", async () => {
    const warmed = await warmStoryRailPlaybackTokens("user-1", [card(0, "signed"), card(1, "signed")]);
    expect(warmed.map((row) => row.thumbnail)).toEqual(["thumb.jwt", "thumb.jwt"]);
    expect(vi.mocked(mintSocialMuxPlaybackTokens)).toHaveBeenCalledTimes(2);
  });

  it("does not mint an eight-card ring on Home paint", async () => {
    const cards = Array.from({ length: 8 }, (_, index) => card(index, "signed"));
    await warmStoryRailPlaybackTokens("user-1", cards);
    expect(vi.mocked(mintSocialMuxPlaybackTokens)).toHaveBeenCalledTimes(SOCIAL_STORY_RAIL_MUX_WARM_AHEAD);
    expect(vi.mocked(mintSocialMuxPlaybackTokens).mock.calls).toEqual([
      ["RailWarm0PlaybackA"],
      ["RailWarm1PlaybackA"],
    ]);
  });

  it("leaves the card unwarmed when the grant or the mint fails", async () => {
    vi.mocked(viewerMayMintSocialMuxPlayback).mockResolvedValueOnce(false);
    const denied = await warmStoryRailPlaybackTokens("user-1", [card(0, "signed")]);
    expect(denied).toEqual([]);
    expect(mintSocialMuxPlaybackTokens).not.toHaveBeenCalled();

    vi.mocked(viewerMayMintSocialMuxPlayback).mockResolvedValue(true);
    vi.mocked(mintSocialMuxPlaybackTokens).mockRejectedValue(new Error("no key"));
    const failed = await warmStoryRailPlaybackTokens("user-1", [card(1, "signed")]);
    expect(failed).toEqual([]);
  });

  it("is what Home calls, without importing the Mux client there", () => {
    const page = readFileSync("src/app/(app)/social/page.tsx", "utf8");
    const explore = readFileSync("src/lib/social-explore-mux-warm.ts", "utf8");
    expect(page).toContain("warmStoryRailPlaybackTokens");
    expect(page).toContain("warmedThumbs={warmedThumbs}");
    expect(page).not.toContain("@/lib/social-mux-server");
    expect(page).not.toContain("mintSocialMuxPlaybackTokens");
    expect(explore).toContain("warmExploreForYouPlaybackTokens");
    expect(explore).not.toContain("warmStoryRailPlaybackTokens");
  });
});