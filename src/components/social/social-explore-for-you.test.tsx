import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS,
  SOCIAL_POST_ACTION_GLYPH,
  SOCIAL_POST_ACTION_HIT_CLASS,
  SOCIAL_POST_ACTION_LIKED_CLASS,
} from "@/lib/social-chrome";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub(props: { playbackId?: string; autoPlay?: boolean; muted?: boolean }) {
      return createElement("div", {
        "data-mux-player-stub": props.playbackId ?? "",
        "data-mux-autoplay": props.autoPlay ? "yes" : "no",
        "data-mux-muted": props.muted ? "yes" : "no",
      });
    },
}));

import { SocialExploreForYouStream } from "./social-explore-for-you";

const item: SocialExploreForYouItem = {
  postId: "v1",
  playbackId: "uNbxnGLKJ00yfbijDO8COxT",
  playbackPolicy: "public",
  body: "Night clip\nsecond line",
  authorId: "11111111-1111-4111-8111-111111111111",
  authorHandle: "ada",
  authorName: "Ada Lovelace",
  authorPhotoUrl: "/api/social/avatar/11111111-1111-4111-8111-111111111111",
  likeCount: 2,
  commentCount: 1,
  liked: true,
  canLike: true,
};

describe("SocialExploreForYouStream", () => {
  it("snaps one cover video per viewport and keeps actions on the trailing rail", () => {
    const html = renderToStaticMarkup(
      createElement(SocialExploreForYouStream, { items: [item], emptyLabel: null }),
    );
    const src = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");
    expect(html).toContain("data-social-explore-stream");
    expect(html).toContain(SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS);
    expect(SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS).toContain("snap-y");
    expect(SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS).toContain("snap-mandatory");
    expect(html).toContain("snap-start");
    expect(html).toContain("object-cover");
    expect(html).toContain("bg-[#0A0A0B]");
    expect(html).toContain('data-mux-autoplay="yes"');
    expect(html).toContain('data-mux-muted="yes"');
    expect(src).toContain("muted");
    expect(src).not.toContain("muted={false}");
    expect(html).toContain("data-social-explore-media");
    expect(html).toContain('href="/social/u/ada"');
    expect(html).toContain("Night clip");
    expect(html).toContain("whitespace-pre-wrap");
    expect(html).toContain(SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS);
    expect(SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS).toContain("rgb(0_0_0/0.4)");
    expect(SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS).toContain("120px");
    expect(html).toContain(SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS);
    expect(SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS).toContain("flex-col");
    expect(SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS).toContain("gap-[var(--space-2)]");
    expect(SOCIAL_POST_ACTION_HIT_CLASS).toContain("inline-flex");
    expect(SOCIAL_POST_ACTION_HIT_CLASS).toContain("size-10");
    expect(html).toContain("inline-flex size-10");
    expect(html).toContain('width="24"');
    expect(SOCIAL_POST_ACTION_GLYPH).toBe(24);
    expect(html).toContain("data-social-like");
    expect(html).toContain(SOCIAL_POST_ACTION_LIKED_CLASS);
    expect(SOCIAL_POST_ACTION_LIKED_CLASS).toBe("text-[#1769FF]");
    const like = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const alignLock = readFileSync("docs/design-locks/social-home-post-actions-align-lock-v1.md", "utf8");
    expect(like).toContain("SOCIAL_POST_ACTION_LIKED_CLASS");
    expect(alignLock).toContain("#1769FF");
    expect(src).not.toContain("text-accent");
    expect(src).not.toContain("#70b5f9");
    expect(html).toContain("data-social-comment-open");
    expect(html).toContain("data-social-post-share");
    expect(html.indexOf("data-social-like")).toBeLessThan(html.indexOf("data-social-comment-open"));
    expect(html.indexOf("data-social-comment-open")).toBeLessThan(html.indexOf("data-social-post-share"));
    expect(html).not.toContain("/social/p/");
    expect(html).not.toContain("line-clamp");
    expect(html).not.toContain("object-contain");
    expect(src).toContain("SocialMuxPlayer");
    expect(src).toContain("SocialPostShareButton");
    expect(src).toContain("SocialCommentTrigger");
    expect(src).toContain('fit="cover"');
    expect(src).not.toContain("socialPostHref");
  });

  it("mounts the Mux player on the active slide only", () => {
    const next = {
      ...item,
      postId: "v2",
      playbackId: "SecondMuxPlaybackId1",
      playbackPolicy: "signed" as const,
      body: "Next clip",
      liked: false,
    };
    const html = renderToStaticMarkup(
      createElement(SocialExploreForYouStream, { items: [item, next], emptyLabel: null }),
    );
    const src = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");
    expect(html).toContain('data-mux-player-stub="uNbxnGLKJ00yfbijDO8COxT"');
    expect(html).not.toContain('data-mux-player-stub="SecondMuxPlaybackId1"');
    expect(html).toContain("data-social-explore-closed");
    expect(html).not.toContain("image.mux.com/SecondMuxPlaybackId1");
    expect(src).not.toContain("SOCIAL_MUX_PLAYBACK_ROUTE");
    expect(src).toContain("active ?");
    expect(src).toContain("ExploreForYouClosedFace");
  });

  it("keeps comment and share dismiss on the same For You item", () => {
    const next = {
      ...item,
      postId: "v2",
      playbackId: "SecondMuxPlaybackId1",
      body: "Next clip",
      liked: false,
    };
    const html = renderToStaticMarkup(
      createElement(SocialExploreForYouStream, { items: [item, next], emptyLabel: null }),
    );
    const first = html.slice(
      html.indexOf('data-social-explore-item="v1"'),
      html.indexOf('data-social-explore-item="v2"'),
    );
    const second = html.slice(html.indexOf('data-social-explore-item="v2"'));
    expect(first).toContain('data-explore-index="0"');
    expect(first).toContain("data-social-explore-active");
    expect(first).toContain('data-social-explore-active-index="0"');
    expect(second).toContain('data-explore-index="1"');
    expect(second).not.toContain("data-social-explore-active");
    expect(html).not.toContain("data-social-comment-thread");
    expect(html).not.toContain("data-social-post-share-sheet");
    expect(html).not.toContain("/social/p/");
    const explore = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");
    const comment = readFileSync("src/components/social/social-comment-thread.tsx", "utf8");
    const share = readFileSync("src/components/social/social-post-share-sheet.tsx", "utf8");
    expect(explore).not.toContain("useRouter");
    expect(explore).not.toContain("router.push");
    expect(comment).toContain("onClose={() => setOpen(false)}");
    expect(share).toContain("onClose={() => setOpen(false)}");
    expect(comment).not.toContain("router.push");
    expect(share).not.toContain("router.push");
  });
});
