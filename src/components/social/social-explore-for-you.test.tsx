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
} from "@/lib/social-chrome";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub(props: { playbackId?: string; autoPlay?: boolean }) {
      return createElement("div", {
        "data-mux-player-stub": props.playbackId ?? "",
        "data-mux-autoplay": props.autoPlay ? "yes" : "no",
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
});
