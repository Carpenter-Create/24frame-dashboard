import { describe, expect, it } from "vitest";

import {
  SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO,
  SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS,
  socialFollowingMuxActiveId,
  socialFollowingMuxActiveIndex,
  socialFollowingMuxCarouselSlideRole,
  socialFollowingMuxRoleForPost,
  socialFollowingMuxVideoOrder,
} from "./social-following-mux-active";

const ORDER = ["lead", "next", "later", "after", "cold"] as const;

describe("socialFollowingMuxActiveIndex", () => {
  it("stays inactive below 60 percent", () => {
    expect(SOCIAL_FOLLOWING_MUX_ACTIVE_RATIO).toBe(0.6);
    expect(SOCIAL_FOLLOWING_MUX_ACTIVE_THRESHOLDS).toEqual([0, 0.6, 0.75, 1]);
    expect(socialFollowingMuxActiveIndex([0, 0.59, 0.2])).toBe(-1);
  });

  it("picks the highest ratio at or above 60 percent and keeps an earlier tie", () => {
    expect(socialFollowingMuxActiveIndex([0.6, 0.2, 0.9])).toBe(2);
    expect(socialFollowingMuxActiveIndex([0.8, 0.8, 0.1])).toBe(0);
    expect(socialFollowingMuxActiveIndex([0.4, 0.6])).toBe(1);
  });
});

describe("socialFollowingMuxRoleForPost", () => {
  it("stays closed until a video is active", () => {
    expect(
      socialFollowingMuxRoleForPost({
        postId: "lead",
        activeId: null,
        order: ORDER,
      }),
    ).toBe("closed");
    expect(
      socialFollowingMuxRoleForPost({
        postId: "cold",
        activeId: null,
        order: ORDER,
      }),
    ).toBe("closed");
  });

  it("mounts the active video, warms the next, and closes the rest", () => {
    expect(
      socialFollowingMuxRoleForPost({ postId: "later", activeId: "later", order: ORDER }),
    ).toBe("mount");
    expect(
      socialFollowingMuxRoleForPost({ postId: "after", activeId: "later", order: ORDER }),
    ).toBe("warm");
    expect(
      socialFollowingMuxRoleForPost({ postId: "next", activeId: "later", order: ORDER }),
    ).toBe("closed");
    expect(
      socialFollowingMuxRoleForPost({ postId: "cold", activeId: "later", order: ORDER }),
    ).toBe("closed");
    expect(
      socialFollowingMuxRoleForPost({ postId: "missing", activeId: "later", order: ORDER }),
    ).toBe("closed");
  });

  it("orders playable videos and skips stills", () => {
    expect(
      socialFollowingMuxVideoOrder([
        { id: "text", media: [] },
        { id: "a", media: [{ kind: "video", playbackId: "VisibleOnePlayback01" }] },
        { id: "still", media: [{ kind: "image", playbackId: "VisibleOnePlayback01" }] },
        { id: "bad", media: [{ kind: "video", playbackId: "short" }] },
        { id: "b", media: [{ kind: "video" }, { kind: "video", playbackId: "VisibleTwoPlayback02" }] },
      ]),
    ).toEqual(["a", "b"]);
  });

  it("resolves the active id from reported ratios", () => {
    const ratios = new Map<string, number>([
      ["lead", 0.2],
      ["next", 0.61],
      ["later", 0.9],
    ]);
    expect(socialFollowingMuxActiveId(ORDER, ratios)).toBe("later");
    expect(socialFollowingMuxActiveId(ORDER, new Map())).toBeNull();
  });
});

describe("socialFollowingMuxCarouselSlideRole", () => {
  const muxIndexes = [0, 2, 3];

  it("mounts the visible Mux slide and warms the next Mux slide", () => {
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "mount",
        index: 0,
        visibleIndex: 0,
        muxIndexes,
      }),
    ).toBe("mount");
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "mount",
        index: 2,
        visibleIndex: 0,
        muxIndexes,
      }),
    ).toBe("warm");
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "mount",
        index: 3,
        visibleIndex: 0,
        muxIndexes,
      }),
    ).toBe("closed");
  });

  it("warms one Mux slide when the post is next and mounts none", () => {
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "warm",
        index: 2,
        visibleIndex: 1,
        muxIndexes,
      }),
    ).toBe("warm");
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "warm",
        index: 0,
        visibleIndex: 1,
        muxIndexes,
      }),
    ).toBe("closed");
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "closed",
        index: 0,
        visibleIndex: 0,
        muxIndexes,
      }),
    ).toBe("closed");
  });

  it("leaves unbanded carousels on the mount-all path", () => {
    expect(
      socialFollowingMuxCarouselSlideRole({
        postRole: "unbanded",
        index: 3,
        visibleIndex: 0,
        muxIndexes,
      }),
    ).toBe("unbanded");
  });
});
