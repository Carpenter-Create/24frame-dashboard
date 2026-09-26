import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { socialMediaFrameClass } from "@/lib/social-media-display";
import {
  SOCIAL_AVATAR_ROUTE,
  SOCIAL_EDGE_RUNTIME,
  SOCIAL_MEDIA_ROUTE,
  SOCIAL_NODE_RUNTIME,
  socialAvatarFaces,
  socialAvatarHref,
  socialMediaHref,
  socialMediaProxies,
  socialMediaProxiesByPostId,
  socialStoryRailCover,
} from "@/lib/social-edge";

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const OBJECT = "22222222-2222-4222-8222-222222222222";

describe("Social Edge media proxies", () => {
  it("builds same-origin avatar and media hrefs without signing", () => {
    expect(socialAvatarHref(AUTHOR)).toBe(`${SOCIAL_AVATAR_ROUTE}/${AUTHOR}`);
    expect(socialMediaHref(`posts/${AUTHOR}/${OBJECT}.jpg`)).toBe(
      `${SOCIAL_MEDIA_ROUTE}?key=${encodeURIComponent(`posts/${AUTHOR}/${OBJECT}.jpg`)}`,
    );
    expect(socialAvatarFaces([AUTHOR, AUTHOR]).get(AUTHOR)).toBe(`${SOCIAL_AVATAR_ROUTE}/${AUTHOR}`);
  });

  it("proxies owned post media and drops forbidden keys", () => {
    const key = `posts/${AUTHOR}/${OBJECT}.jpg`;
    const items = socialMediaProxies(
      [{ kind: "image", key, contentType: "image/jpeg" }, { kind: "image", key: "avatars/x", contentType: "image/jpeg" }],
      AUTHOR,
    );
    expect(items).toEqual([
      {
        kind: "image",
        url: socialMediaHref(key),
        contentType: "image/jpeg",
      },
    ]);
    const byPost = socialMediaProxiesByPostId([
      { id: "p1", author_id: AUTHOR, media: [{ kind: "image", key, contentType: "image/jpeg" }] },
    ]);
    expect(byPost.get("p1")).toEqual(items);
  });

  it("uses the story media proxy as the rail cover", () => {
    const imageKey = `stories/${AUTHOR}/${OBJECT}.jpg`;
    const videoKey = `stories/${AUTHOR}/${OBJECT}.mp4`;
    expect(
      socialStoryRailCover([{ kind: "image", key: imageKey, contentType: "image/jpeg" }], AUTHOR),
    ).toEqual({ kind: "image", url: socialMediaHref(imageKey) });
    expect(
      socialStoryRailCover([{ kind: "video", key: videoKey, contentType: "video/mp4" }], AUTHOR),
    ).toEqual({ kind: "video", url: "" });
    expect(socialStoryRailCover([], AUTHOR)).toBeNull();
    expect(
      socialStoryRailCover([{ kind: "image", key: "avatars/x", contentType: "image/jpeg" }], AUTHOR),
    ).toBeNull();
    const playbackId = "uNbxnGLKJ00yfbijDO8COxT";
    expect(
      socialStoryRailCover(
        [{ kind: "video", key: videoKey, contentType: "video/mp4", provider: "mux", playbackId, playbackPolicy: "signed" }],
        AUTHOR,
      ),
    ).toEqual({ kind: "image", url: "", playbackId, playbackPolicy: "signed" });
    expect(
      socialStoryRailCover(
        [{ kind: "video", key: videoKey, contentType: "video/mp4", provider: "mux", playbackId, playbackPolicy: "public" }],
        AUTHOR,
      ),
    ).toEqual({
      kind: "image",
      url: `https://image.mux.com/${playbackId}/thumbnail.webp`,
      playbackId,
      playbackPolicy: "public",
    });
  });

  it("blanks a video url when there is no playback id and keeps stills on the image proxy", () => {
    const imageKey = `stories/${AUTHOR}/${OBJECT}.jpg`;
    const videoKey = `stories/${AUTHOR}/${OBJECT}.mp4`;
    const items = socialMediaProxies(
      [
        { kind: "image", key: imageKey, contentType: "image/jpeg" },
        { kind: "video", key: videoKey, contentType: "video/mp4" },
      ],
      AUTHOR,
      "stories",
    );
    expect(items[0]).toMatchObject({
      kind: "image",
      url: `${SOCIAL_MEDIA_ROUTE}?key=${encodeURIComponent(imageKey)}`,
    });
    expect(items[1]?.kind).toBe("video");
    expect(items[1]?.url).toBe("");
    expect(items[1]?.url).not.toContain(SOCIAL_MEDIA_ROUTE);
    expect(items[1]).not.toHaveProperty("playbackId");
  });

  it("exposes Mux playback ids on Edge profile without the S3 proxy", () => {
    const key = `posts/${AUTHOR}/${OBJECT}.mp4`;
    const items = socialMediaProxies(
      [
        {
          kind: "video",
          key,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        },
      ],
      AUTHOR,
    );
    expect(items).toEqual([
      {
        kind: "video",
        url: "https://image.mux.com/uNbxnGLKJ00yfbijDO8COxT/thumbnail.webp",
        contentType: "video/mp4",
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
      },
    ]);
    expect(items[0]?.url).not.toContain(SOCIAL_MEDIA_ROUTE);
  });

  it("forwards public and signed playback policy onto the feed item", () => {
    const key = `posts/${AUTHOR}/${OBJECT}.mp4`;
    const signed = socialMediaProxies(
      [
        {
          kind: "video",
          key,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "signed",
        },
      ],
      AUTHOR,
    );
    expect(signed[0]?.playbackPolicy).toBe("signed");
    expect(signed[0]?.url).toBe("");
    const legacy = socialMediaProxies(
      [
        {
          kind: "video",
          key,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "public",
        },
      ],
      AUTHOR,
    );
    expect(legacy[0]?.playbackPolicy).toBe("public");
  });

  it("keeps vertical source pixels so the feed frame is portrait", () => {
    const key = `posts/${AUTHOR}/${OBJECT}.mp4`;
    const items = socialMediaProxies(
      [
        {
          kind: "video",
          key,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "signed",
          width: 1080,
          height: 1920,
        },
      ],
      AUTHOR,
    );
    expect(items[0]).toMatchObject({ kind: "video", playbackId: "uNbxnGLKJ00yfbijDO8COxT", width: 1080, height: 1920 });
    expect(socialMediaFrameClass(items[0] ?? {})).toContain("aspect-[4/5]");
    expect(socialMediaFrameClass(items[0] ?? {})).not.toContain("aspect-video");
  });
});

describe("Social Edge vs Node runtime lock", () => {
  it("edges public profile, follows, search, and the handle redirect", () => {
    const publicProfile = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");
    const explore = readFileSync("src/app/(app)/social/explore/page.tsx", "utf8");
    const search = readFileSync("src/app/(app)/social/search/page.tsx", "utf8");
    const follows = readFileSync("src/app/(app)/social/u/[handle]/follows/page.tsx", "utf8");
    const members = readFileSync("src/app/(app)/social/members/[handle]/page.tsx", "utf8");
    for (const src of [publicProfile, search, follows, members]) {
      expect(src).toContain('export const runtime = "edge"');
      expect(src).not.toContain("@/lib/s3-avatars");
      expect(src).not.toContain("@/lib/s3-social-media");
      expect(src).not.toContain("@/lib/social-mux-server");
      expect(src).not.toContain("signedAvatarUrl");
      expect(src).not.toContain("signedSocialMedia");
      expect(src).not.toContain("@aws-sdk");
      expect(src).not.toContain("MUX_TOKEN_SECRET");
    }
    // Explore For You stays off AWS signing. Avatars use the edge proxy href.
    expect(explore).toContain('export const runtime = "nodejs"');
    expect(explore).not.toContain("signSocialForYouCourseCovers");
    expect(explore).not.toContain('export const runtime = "edge"');
    expect(explore).not.toContain("@/lib/s3-avatars");
    expect(explore).not.toContain("@/lib/s3-social-media");
    expect(explore).not.toContain("@/lib/s3-education");
    expect(explore).not.toContain("@/lib/social-mux-server");
    expect(explore).not.toContain("signedAvatarUrl");
    expect(explore).not.toContain("signedSocialMedia");
    expect(explore).not.toContain("signedEducationCoverUrls");
    expect(explore).not.toContain("@aws-sdk");
    expect(explore).not.toContain("MUX_TOKEN_SECRET");
    expect(publicProfile).toContain("socialAvatarHref");
    expect(publicProfile).toContain("socialMediaProxiesByPostId");
    expect(publicProfile).toContain("loadCachedSocialProfileByHandle");
    expect(search).toContain("socialAvatarFaces");
    expect(explore).toContain("socialMediaProxiesByPostId");
    expect(explore).toContain("socialAvatarHref");
    expect(explore).not.toContain("socialAvatarFaces");
    expect(follows).toContain("socialAvatarFaces");
    expect(SOCIAL_EDGE_RUNTIME).toBe("edge");
  });

  it("keeps writes, signing, and MediaRecorder on Node", () => {
    const own = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
    const edit = readFileSync("src/app/(app)/social/profile/edit/page.tsx", "utf8");
    const create = readFileSync("src/app/(app)/social/create/page.tsx", "utf8");
    const live = readFileSync("src/app/(app)/social/create/live/page.tsx", "utf8");
    const storyNew = readFileSync("src/app/(app)/social/stories/new/page.tsx", "utf8");
    const profileApi = readFileSync("src/app/api/social/profile/route.ts", "utf8");
    const avatarApi = readFileSync("src/app/api/social/avatar/[userId]/route.ts", "utf8");
    const mediaApi = readFileSync("src/app/api/social/media/route.ts", "utf8");
    const muxPlaybackApi = readFileSync("src/app/api/social/mux-playback/route.ts", "utf8");
    const photoApi = readFileSync("src/app/api/account/photo/route.ts", "utf8");
    const actions = readFileSync("src/app/(app)/social/actions.ts", "utf8");
    const light = readFileSync("src/app/(app)/social/light-actions.ts", "utf8");
    for (const src of [own, edit, create, live, storyNew, profileApi, avatarApi, mediaApi, muxPlaybackApi, photoApi]) {
      expect(src).toContain('export const runtime = "nodejs"');
    }
    expect(muxPlaybackApi).toContain("mintSocialMuxPlaybackTokens");
    expect(muxPlaybackApi).not.toContain("NEXT_PUBLIC_");
    expect(actions).toContain("presignSocialMediaPut");
    expect(actions).toContain("@/lib/s3-social-media");
    expect(light).not.toContain("@/lib/s3-");
    expect(light).not.toContain("@aws-sdk");
    expect(light).toContain("toggleSocialFollow");
    expect(light).toContain("toggleSocialLike");
    expect(light).toContain("createSocialComment");
    expect(avatarApi).toContain("signedAvatarUrl");
    expect(mediaApi).toContain("signedSocialMediaUrl");
    expect(avatarApi).toContain("privateMaxAgeCacheControl");
    expect(mediaApi).toContain("privateMaxAgeCacheControl");
    expect(photoApi).toContain("private, no-store");
    expect(photoApi).not.toContain("privateMaxAgeCacheControl");
    expect(SOCIAL_NODE_RUNTIME).toBe("nodejs");
  });
});
