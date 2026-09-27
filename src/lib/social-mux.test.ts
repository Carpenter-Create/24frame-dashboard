import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

import {
  clearSocialMuxPlaybackTokenCache,
  isSocialMux4kSource,
  isSocialMuxId,
  loadSocialMuxPlaybackTokens,
  parseSocialMuxIntent,
  readSocialMuxPlaybackTokenCache,
  SOCIAL_MUX_DEFAULT_RESOLUTION,
  SOCIAL_MUX_IMAGE_HOST,
  SOCIAL_MUX_ORIGINAL_RESOLUTION,
  socialMuxAssetSettings,
  socialMuxCoveringPoster,
  socialMuxPassthroughBoundToUser,
  socialMuxPlaybackRequiresTokens,
  socialMuxPlaybackTokensFromJson,
  socialMuxSignedPlayerReady,
  socialMuxThumbnailUrl,
  SOCIAL_MUX_PLAYBACK_ROUTE,
} from "./social-mux";
import { SOCIAL_MUX_ENV } from "./social-mux-server";

describe("social Mux encode locks", () => {
  it("defaults Video to 1080p basic and Go live to 1080p plus", () => {
    expect(socialMuxAssetSettings({ intent: "video" })).toEqual({
      videoQuality: "basic",
      maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
    });
    expect(socialMuxAssetSettings({ intent: "live", originalQuality: true, width: 3840, height: 2160 })).toEqual({
      videoQuality: "plus",
      maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
    });
    expect(parseSocialMuxIntent("live")).toBe("live");
    expect(parseSocialMuxIntent("video")).toBe("video");
  });

  it("raises 2160p only when the 4K toggle is on and the source is 4K", () => {
    expect(isSocialMux4kSource(3840, 2160)).toBe(true);
    expect(isSocialMux4kSource(1920, 1080)).toBe(false);
    expect(
      socialMuxAssetSettings({
        intent: "video",
        originalQuality: true,
        width: 3840,
        height: 2160,
      }),
    ).toEqual({
      videoQuality: "basic",
      maxResolutionTier: SOCIAL_MUX_ORIGINAL_RESOLUTION,
    });
    expect(
      socialMuxAssetSettings({
        intent: "video",
        originalQuality: true,
        width: 1920,
        height: 1080,
      }),
    ).toEqual({
      videoQuality: "basic",
      maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
    });
    expect(
      socialMuxAssetSettings({
        intent: "video",
        originalQuality: false,
        width: 3840,
        height: 2160,
      }),
    ).toEqual({
      videoQuality: "basic",
      maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
    });
  });

  it("builds a thumbnail URL from a playback id and does not mint a native HLS src", () => {
    expect(isSocialMuxId("uNbxnGLKJ00yfbijDO8COxTOyVKT01xpxW")).toBe(true);
    expect(isSocialMuxId("short")).toBe(false);
    expect(socialMuxThumbnailUrl("abc12345")).toBe(`https://${SOCIAL_MUX_IMAGE_HOST}/abc12345/thumbnail.webp`);
    expect(socialMuxThumbnailUrl("abc12345", "thumb.jwt")).toBe(
      `https://${SOCIAL_MUX_IMAGE_HOST}/abc12345/thumbnail.webp?token=thumb.jwt`,
    );
    const sot = readFileSync("src/lib/social-mux.ts", "utf8");
    expect(sot).not.toContain("socialMuxPlaybackUrl");
    expect(sot).not.toContain(".m3u8");
    expect(sot).not.toContain("stream.mux.com");
  });

  it("keeps token names server-only and out of the client SoT", () => {
    const sot = readFileSync("src/lib/social-mux.ts", "utf8");
    const server = readFileSync("src/lib/social-mux-server.ts", "utf8");
    expect(SOCIAL_MUX_ENV).toEqual([
      "MUX_TOKEN_ID",
      "MUX_TOKEN_SECRET",
      "MUX_SIGNING_KEY",
      "MUX_PRIVATE_KEY",
    ]);
    expect(sot).not.toContain("process.env");
    expect(sot).not.toContain("MUX_TOKEN_SECRET");
    expect(sot).not.toContain("MUX_PRIVATE_KEY");
    expect(sot).not.toContain("NEXT_PUBLIC_MUX");
    expect(server).toContain('import "server-only"');
    expect(server).toContain("MUX_TOKEN_ID");
    expect(server).toContain("MUX_TOKEN_SECRET");
    expect(server).toContain("MUX_SIGNING_KEY");
    expect(server).toContain("MUX_PRIVATE_KEY");
    expect(server).toContain("signPlaybackId");
    expect(server).not.toContain("NEXT_PUBLIC_");
    expect(server).toContain("video_quality");
    expect(server).toContain("max_resolution_tier");
    expect(server).toContain('playback_policies: ["signed"]');
    expect(server).not.toContain('playback_policies: ["public"]');
  });

  it("binds a Mux upload passthrough only when it starts with the session user id and a colon", () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    expect(socialMuxPassthroughBoundToUser(`${userId}:22222222-2222-4222-8222-222222222222`, userId)).toBe(true);
    expect(socialMuxPassthroughBoundToUser(`  ${userId}:object`, userId)).toBe(true);
    expect(socialMuxPassthroughBoundToUser(userId, userId)).toBe(false);
    expect(socialMuxPassthroughBoundToUser(`${userId}9:object`, userId)).toBe(false);
    expect(socialMuxPassthroughBoundToUser(`other:${userId}`, userId)).toBe(false);
    expect(socialMuxPassthroughBoundToUser("22222222-2222-4222-8222-222222222222:object", userId)).toBe(false);
    expect(socialMuxPassthroughBoundToUser("", userId)).toBe(false);
    expect(socialMuxPassthroughBoundToUser(`${userId}:object`, "  ")).toBe(false);
    expect(socialMuxPassthroughBoundToUser(null, userId)).toBe(false);
    expect(socialMuxPassthroughBoundToUser(undefined, userId)).toBe(false);
  });

  it("holds a signed clip empty until the JWT, then covers with that thumb until paint", () => {
    expect(socialMuxCoveringPoster(true, false)).toBe(true);
    expect(socialMuxCoveringPoster(true, true)).toBe(false);
    expect(socialMuxCoveringPoster(false, false)).toBe(false);
    expect(socialMuxCoveringPoster(false, true)).toBe(false);
    expect(socialMuxSignedPlayerReady(false, true)).toBe(false);
    expect(socialMuxSignedPlayerReady(true, false)).toBe(false);
    expect(socialMuxSignedPlayerReady(true, true)).toBe(true);
    const player = readFileSync("src/components/social/social-mux-player.tsx", "utf8");
    const signedFace = player.slice(player.indexOf("{signed ? ("), player.indexOf(") : ("));
    expect(signedFace).toContain("socialMuxCoveringPoster(signed, Boolean(tokens))");
    expect(signedFace).toContain('data-social-mux-poster="pending"');
    expect(signedFace).toContain("absolute inset-0 size-full");
    expect(signedFace).toContain("<MuxPoster");
    expect(signedFace).toContain("painted");
    expect(signedFace).not.toContain("<img");
    expect(signedFace).not.toContain("poster={poster}");
    expect(signedFace).not.toContain("src={poster}");
    const hold = signedFace.slice(
      signedFace.indexOf("socialMuxCoveringPoster"),
      signedFace.indexOf("signedPoster &&"),
    );
    expect(hold).toContain('data-social-mux-poster="pending"');
    expect(hold).not.toContain("socialMuxThumbnailUrl");
    expect(hold).not.toContain("<MuxPlayer");
    expect(hold).not.toContain("<MuxPoster");
    const gated = signedFace.slice(signedFace.indexOf("socialMuxSignedPlayerReady"), signedFace.indexOf("<MuxPoster"));
    expect(gated).toContain("socialMuxSignedPlayerReady(Boolean(tokens), posterReady)");
    expect(gated).toContain("<MuxPlayer");
    expect(gated).toContain("poster={signedPoster}");
    expect(gated).toContain("onLoadedData={paint}");
    const poster = signedFace.slice(signedFace.indexOf("<MuxPoster"));
    expect(poster).toContain("src={signedPoster}");
    expect(poster).toContain("onDecoded={() => setPosterReadyId(playbackId)}");
    expect(player).toContain("tokens ? socialMuxThumbnailUrl(playbackId, tokens.thumbnail) : null");
    expect(player).toContain("cached ?? provided");
    expect(player).toContain("rememberSocialMuxPlaybackTokens");
    expect(player).toContain('import("@mux/mux-player-react")');
    expect(player).toContain("if (!signed || provided || readSocialMuxPlaybackTokenCache(playbackId)) return");
    const posterFn = player.slice(player.indexOf("function MuxPoster"), player.indexOf("function playerStyle"));
    expect(posterFn).toContain("onDecoded?.()");
    const onError = posterFn.slice(posterFn.indexOf("onError"));
    expect(onError).not.toContain("onDecoded");
  });

  it("mints playback tokens only for signed policy", () => {
    const player = readFileSync("src/components/social/social-mux-player.tsx", "utf8");
    const feed = readFileSync("src/components/social/social-feed-video.tsx", "utf8");
    expect(socialMuxPlaybackRequiresTokens("signed")).toBe(true);
    expect(socialMuxPlaybackRequiresTokens("public")).toBe(false);
    expect(socialMuxPlaybackRequiresTokens(undefined)).toBe(false);
    expect(socialMuxPlaybackRequiresTokens(null)).toBe(false);
    expect(player).toContain("socialMuxPlaybackRequiresTokens(playbackPolicy)");
    expect(player).toContain("if (!signed) return");
    expect(feed).toContain("playbackPolicy={item.playbackPolicy}");
  });

  it("accepts a playback token set the player can pass to Mux", () => {
    expect(SOCIAL_MUX_PLAYBACK_ROUTE).toBe("/api/social/mux-playback");
    expect(
      socialMuxPlaybackTokensFromJson({
        playback: "play.jwt",
        thumbnail: "thumb.jwt",
        storyboard: "board.jwt",
      }),
    ).toEqual({
      playback: "play.jwt",
      thumbnail: "thumb.jwt",
      storyboard: "board.jwt",
    });
    expect(socialMuxPlaybackTokensFromJson({ playback: "play.jwt" })).toBeNull();
    expect(socialMuxPlaybackTokensFromJson(null)).toBeNull();
  });

  it("reuses one signed mint for a playback id and ignores an aborted caller", async () => {
    clearSocialMuxPlaybackTokenCache();
    const playbackId = "uNbxnGLKJ00yfbijDO8COxT";
    let fetchCount = 0;
    let release: (response: Response) => void = () => {};
    vi.stubGlobal("fetch", () => {
      fetchCount += 1;
      return new Promise<Response>((resolve) => {
        release = resolve;
      });
    });
    const controller = new AbortController();
    const aborted = loadSocialMuxPlaybackTokens(playbackId, controller.signal);
    const shared = loadSocialMuxPlaybackTokens(playbackId);
    expect(fetchCount).toBe(1);
    controller.abort();
    release(
      new Response(
        JSON.stringify({ playback: "play.jwt", thumbnail: "thumb.jwt", storyboard: "board.jwt" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    await expect(aborted).resolves.toBeNull();
    await expect(shared).resolves.toEqual({
      playback: "play.jwt",
      thumbnail: "thumb.jwt",
      storyboard: "board.jwt",
    });
    expect(readSocialMuxPlaybackTokenCache(playbackId)?.thumbnail).toBe("thumb.jwt");
    await expect(loadSocialMuxPlaybackTokens(playbackId)).resolves.toEqual({
      playback: "play.jwt",
      thumbnail: "thumb.jwt",
      storyboard: "board.jwt",
    });
    expect(fetchCount).toBe(1);
    vi.unstubAllGlobals();
    clearSocialMuxPlaybackTokenCache();
  });
});
