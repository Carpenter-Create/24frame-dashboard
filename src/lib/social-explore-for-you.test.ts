import { describe, expect, it } from "vitest";

import { socialMediaProxies } from "@/lib/social-edge";
import { SOCIAL_ROUTES } from "@/lib/social";

import {
  exploreForYouFilterLabel,
  exploreForYouHref,
  exploreForYouMuxVideo,
  exploreForYouStreamMode,
  exploreForYouVideoItems,
  exploreHashtagToken,
  parseExploreForYouSearch,
} from "./social-explore-for-you";

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const STILL = "22222222-2222-4222-8222-222222222222";
const CLIP = "33333333-3333-4333-8333-333333333333";
const CLIP_B = "44444444-4444-4444-8444-444444444444";

describe("Explore For You video stream", () => {
  it("keeps the first Mux video and drops photos and native mp4", () => {
    const photo = socialMediaProxies(
      [
        {
          kind: "image",
          key: `posts/${AUTHOR}/${STILL}.jpg`,
          contentType: "image/jpeg",
        },
      ],
      AUTHOR,
    );
    expect(exploreForYouMuxVideo(photo)).toBeNull();

    const native = socialMediaProxies(
      [
        {
          kind: "video",
          key: `posts/${AUTHOR}/${CLIP}.mp4`,
          contentType: "video/mp4",
        },
      ],
      AUTHOR,
    );
    expect(exploreForYouMuxVideo(native)).toBeNull();

    const mixed = socialMediaProxies(
      [
        {
          kind: "image",
          key: `posts/${AUTHOR}/${STILL}.jpg`,
          contentType: "image/jpeg",
        },
        {
          kind: "video",
          key: `posts/${AUTHOR}/${CLIP}.mp4`,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "public",
        },
        {
          kind: "video",
          key: `posts/${AUTHOR}/${CLIP_B}.mp4`,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "SecondMuxPlaybackId1",
          playbackPolicy: "signed",
        },
      ],
      AUTHOR,
    );
    expect(exploreForYouMuxVideo(mixed)?.playbackId).toBe("uNbxnGLKJ00yfbijDO8COxT");
    expect(exploreForYouMuxVideo(mixed)?.kind).toBe("video");

    const items = exploreForYouVideoItems({
      hits: [
        { id: "photo", authorId: AUTHOR, body: "still", likeCount: 0, commentCount: 0 },
        { id: "clip", authorId: AUTHOR, body: "moving", likeCount: 2, commentCount: 1 },
      ],
      mediaByPost: new Map([
        ["photo", photo],
        ["clip", mixed],
      ]),
      authors: new Map([[AUTHOR, { handle: "ada", display_name: "Ada Lovelace" }]]),
      liked: new Set(["clip"]),
      canLike: true,
    });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      postId: "clip",
      playbackId: "uNbxnGLKJ00yfbijDO8COxT",
      body: "moving",
      authorHandle: "ada",
      liked: true,
      canLike: true,
    });
    expect(items[0]?.authorPhotoUrl).toContain(AUTHOR);
  });

  it("routes discovery into the same host and clears back to For You", () => {
    expect(parseExploreForYouSearch({ discover: "1", q: " night " })).toMatchObject({
      q: "night",
      discover: true,
      tag: "",
      person: "",
    });
    expect(exploreForYouStreamMode(parseExploreForYouSearch({ discover: "1", q: "night" }))).toBe(
      "discover",
    );
    expect(exploreForYouStreamMode(parseExploreForYouSearch({ discover: "1" }))).toBe("for-you");
    expect(exploreForYouHref({ q: "night" })).not.toContain("discover");
    expect(exploreForYouStreamMode(parseExploreForYouSearch({ q: "night" }))).toBe("keyword");
    expect(exploreForYouStreamMode(parseExploreForYouSearch({ tag: "#night" }))).toBe("hashtag");
    expect(exploreForYouStreamMode(parseExploreForYouSearch({ person: "ada" }))).toBe("person");
    expect(exploreHashtagToken(" #night owl ")).toBe("#nightowl".slice(1));
    expect(exploreForYouHref()).toBe(SOCIAL_ROUTES.explore);
    expect(exploreForYouHref({ q: "night" })).toBe("/social/explore?q=night");
    expect(exploreForYouHref({ tag: "night" })).toBe("/social/explore?tag=night");
    expect(exploreForYouHref({ person: "ada" })).toBe("/social/explore?person=ada");
    expect(
      exploreForYouFilterLabel({
        mode: "hashtag",
        q: "",
        tag: "night",
        personHandle: "",
        personName: null,
      }),
    ).toBe("#night");
    expect(
      exploreForYouFilterLabel({
        mode: "for-you",
        q: "",
        tag: "",
        personHandle: "",
        personName: null,
      }),
    ).toBeNull();
  });
});
