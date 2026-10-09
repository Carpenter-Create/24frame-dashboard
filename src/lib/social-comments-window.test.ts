import { describe, expect, it, vi } from "vitest";

import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";
import { socialFeedVideoFrame } from "@/lib/social-media-display";

import {
  SOCIAL_COMMENTS_VIDEO_PENDING_FRAME,
  SOCIAL_COMMENTS_WINDOW_IMAGE_SIZES,
  socialCommentDraftDirty,
  socialCommentReturnFocus,
  socialCommentsLeaveClick,
  socialCommentsPostFromCard,
  socialCommentsPostFromExplore,
  socialCommentsVideoFrame,
} from "./social-comments-window";

// docs/design-locks/social-comments-window-lock-v1.md

const card: SocialPostCardModel = {
  id: "p1",
  body: "A caption.",
  likeCount: 2,
  commentCount: 3,
  liked: false,
  createdAt: "2026-10-01T12:00:00.000Z",
  authorId: "u1",
  authorHandle: "ada",
  authorName: "Ada Lovelace",
  authorPhotoUrl: "/api/social/avatar/u1",
  groupSlug: "writers",
  groupName: "Writers",
  canLike: true,
  media: [
    { kind: "image", url: "https://cf.example/a" },
    { kind: "image", url: "https://cf.example/b" },
    { kind: "image", url: "https://cf.example/c" },
  ],
};

const explore: SocialExploreForYouItem = {
  postId: "p2",
  playbackId: "uNbxnGLKJ00yfbijDO8COxT",
  playbackPolicy: "signed",
  body: "Explore words.",
  authorId: "u2",
  authorHandle: "grace",
  authorName: "Grace Hopper",
  authorPhotoUrl: "",
  likeCount: 0,
  commentCount: 1,
  liked: false,
  canLike: true,
};

describe("comments window lib", () => {
  it("is dirty only with typed text, not whitespace", () => {
    expect(socialCommentDraftDirty("")).toBe(false);
    expect(socialCommentDraftDirty("  \n")).toBe(false);
    expect(socialCommentDraftDirty("hi")).toBe(true);
  });

  it("maps a card's post, keeping the item it opened on and turning an index out of range into 0", () => {
    expect(socialCommentsPostFromCard(card, 2)).toEqual({
      id: "p1",
      authorName: "Ada Lovelace",
      authorHandle: "ada",
      authorPhotoUrl: "/api/social/avatar/u1",
      body: "A caption.",
      createdAt: "2026-10-01T12:00:00.000Z",
      groupSlug: "writers",
      groupName: "Writers",
      media: card.media,
      mediaIndex: 2,
    });
    expect(socialCommentsPostFromCard(card).mediaIndex).toBe(0);
    expect(socialCommentsPostFromCard(card, -1).mediaIndex).toBe(0);
    expect(socialCommentsPostFromCard(card, 5).mediaIndex).toBe(0);
    expect(socialCommentsPostFromCard({ ...card, media: [] }, 0).mediaIndex).toBe(0);
  });

  it("maps an Explore item to one video, with no time or group, and no empty photo", () => {
    const post = socialCommentsPostFromExplore(explore);
    expect(post.id).toBe("p2");
    expect(post.media).toEqual([
      { kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT", playbackPolicy: "signed" },
    ]);
    expect(post.mediaIndex).toBe(0);
    expect(post.authorPhotoUrl).toBeNull();
    expect(post.createdAt).toBeNull();
    expect(post.groupSlug).toBeNull();
    expect(post.groupName).toBeNull();
    expect(post.body).toBe("Explore words.");
    expect(post.authorHandle).toBe("grace");
    expect(socialCommentsPostFromExplore({ ...explore, authorPhotoUrl: "/api/social/avatar/u2" }).authorPhotoUrl).toBe(
      "/api/social/avatar/u2",
    );
  });

  it("always gives the video still a bounded box: stored, else probed, else 4:5", () => {
    expect(socialCommentsVideoFrame({ width: 1080, height: 1920 }, null).style.aspectRatio).toBe("0.8");
    expect(socialCommentsVideoFrame({}, null)).toBe(SOCIAL_COMMENTS_VIDEO_PENDING_FRAME);
    expect(SOCIAL_COMMENTS_VIDEO_PENDING_FRAME.style.aspectRatio).toBe("0.8");
    const probed = socialFeedVideoFrame({ width: 1920, height: 800 });
    expect(socialCommentsVideoFrame({}, probed).style.aspectRatio).toBe("2.39");
    // The stored shape wins over a probe.
    expect(socialCommentsVideoFrame({ width: 1920, height: 1080 }, probed).style.aspectRatio).toBe(String(1920 / 1080));
    expect(SOCIAL_COMMENTS_WINDOW_IMAGE_SIZES).toBe("552px");
  });

  it("lets a modified click pass, asks with typed text, else closes", () => {
    expect(socialCommentsLeaveClick({ modified: true, dirty: true })).toBe("pass");
    expect(socialCommentsLeaveClick({ modified: true, dirty: false })).toBe("pass");
    expect(socialCommentsLeaveClick({ modified: false, dirty: true })).toBe("ask");
    expect(socialCommentsLeaveClick({ modified: false, dirty: false })).toBe("close");
  });

  it("returns focus without scrolling, and leaves a node without focus alone", () => {
    const focus = vi.fn();
    socialCommentReturnFocus({ focus });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(() => socialCommentReturnFocus(null)).not.toThrow();
    expect(() => socialCommentReturnFocus(undefined)).not.toThrow();
    expect(() => socialCommentReturnFocus({})).not.toThrow();
  });
});
