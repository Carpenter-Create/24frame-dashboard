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
import { SOCIAL } from "@/lib/social";
import { socialMuxThumbnailUrl } from "@/lib/social-mux";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

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

import { SocialExploreExit } from "./social-explore-exit";
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
    const likeButton = src.slice(src.indexOf("<SocialLikeButton"), src.indexOf("<SocialCommentTrigger"));
    expect(likeButton).toContain('tone="stage"');
    expect(html).toContain("data-social-explore-stream");
    expect(html).toContain(SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS);
    expect(SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS).toContain("snap-y");
    expect(SOCIAL_EXPLORE_FOR_YOU_SCROLL_CLASS).toContain("snap-mandatory");
    expect(html).toContain("snap-start");
    expect(html).toContain("object-cover");
    expect(html).toContain("md:object-contain");
    expect(html).toContain("bg-[#0A0A0B]");
    expect(html).toContain('data-mux-autoplay="yes"');
    expect(html).toContain('data-mux-muted="yes"');
    const playerSrc = src.slice(src.indexOf("<SocialMuxPlayer"), src.indexOf("ExploreForYouClosedFace"));
    expect(playerSrc).toContain("muted={muted}");
    expect(playerSrc).not.toContain("muted={false}");
    expect(src).not.toContain("muted={false}");
    expect(src).not.toContain("audioTracks");
    expect(src).toContain("data-social-explore-mute");
    expect(src).toContain("speaker-slash");
    expect(src).toContain("speaker-high");
    expect(src).toContain("SOCIAL.explore.unmute");
    expect(src).toContain("SOCIAL.explore.mute");
    expect(src).not.toContain("SOCIAL.stories.unmute");
    expect(src).not.toContain("SOCIAL.stories.mute");
    expect(src).toContain("onForcedMute");
    expect(src).toContain("setMuted(true)");
    expect(src).toContain("preferUnmuted");
    expect(src).toContain("setMuted(!preferUnmuted)");
    expect(src).toContain("setPreferUnmuted(!nextMuted)");
    expect(src).not.toContain("Each active item starts muted");
    const forcedAt = src.indexOf("onForcedMute={() =>");
    const forcedMute = src.slice(forcedAt, src.indexOf("}", forcedAt) + 1);
    expect(forcedMute).toBe("onForcedMute={() => setMuted(true)}");
    expect(forcedMute).not.toContain("preferUnmuted");
    expect(src).toContain("stories-viewer-mute-control-lock-v1.md");
    const media = src.slice(src.indexOf("data-social-explore-media"), src.indexOf("data-social-explore-caption"));
    expect(media).toContain("onToggle");
    expect(media).not.toContain("setMuted");
    expect(html).toContain("data-social-explore-media");
    const mute = html.slice(html.indexOf("data-social-explore-mute"), html.indexOf("data-social-like"));
    expect(html.indexOf("data-social-explore-mute")).toBeGreaterThanOrEqual(0);
    expect(html.indexOf("data-social-explore-mute")).toBeLessThan(html.indexOf("data-social-like"));
    expect(mute).toContain('aria-label="Unmute"');
    expect(mute).toContain('aria-pressed="true"');
    expect(mute).toContain("size-10");
    expect(mute).toContain('data-social-icon="speaker-slash"');
    expect(mute).toContain('width="20"');
    expect(mute).toContain('height="20"');
    expect(mute).not.toContain("data-social-like");
    expect(SOCIAL.explore.unmute).toBe("Unmute");
    expect(SOCIAL.explore.mute).toBe("Mute");
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
    expect(html).toContain("md:object-contain");
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
    const warmAt = src.indexOf("for (const item of [items[active], items[active + 1]]");
    const slidesAt = src.indexOf("items.map");
    expect(warmAt).toBeGreaterThan(-1);
    expect(warmAt).toBeLessThan(slidesAt);
    const warm = src.slice(warmAt, slidesAt);
    expect(warm).toContain("items[active]");
    expect(warm).toContain("items[active + 1]");
    expect(warm).toContain("socialMuxPlaybackRequiresTokens");
    expect(warm).toContain("item.playbackTokens");
    expect(warm).toContain("rememberSocialMuxPlaybackTokens");
    expect(warm.indexOf("rememberSocialMuxPlaybackTokens")).toBeLessThan(warm.indexOf("loadSocialMuxPlaybackTokens"));
    expect(warm).toContain("controller.abort()");
    expect(warm).not.toContain(".map(");
  });

  it("paints a server-minted JWT poster on the first signed item without a client mint", () => {
    const signed = {
      ...item,
      playbackPolicy: "signed" as const,
      playbackTokens: { playback: "play.jwt", thumbnail: "thumb.jwt", storyboard: "board.jwt" },
    };
    const html = renderToStaticMarkup(
      createElement(SocialExploreForYouStream, { items: [signed], emptyLabel: null }),
    );
    const src = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");
    const thumb = socialMuxThumbnailUrl(signed.playbackId, "thumb.jwt");
    expect(html).toContain("<img");
    expect(html).toContain(thumb);
    expect(html).not.toContain('data-social-mux-poster="pending"');
    expect(html).not.toContain("data-mux-player-stub");
    expect(html).not.toContain(`src="https://image.mux.com/${signed.playbackId}/thumbnail.webp"`);
    expect(src).toContain("initialTokens={item.playbackTokens}");
    expect(src).not.toContain("SOCIAL_MUX_PLAYBACK_ROUTE");
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
    const comment = readFileSync("src/components/social/social-comment-trigger.tsx", "utf8");
    const share = readFileSync("src/components/social/social-post-share-button.tsx", "utf8");
    expect(explore).not.toContain("useRouter");
    expect(explore).not.toContain("router.push");
    expect(comment).toContain("onClose={() => setOpen(false)}");
    expect(share).toContain("onClose={() => setOpen(false)}");
    expect(comment).not.toContain("router.push");
    expect(share).not.toContain("router.push");
  });

  it("contains a desktop portrait video and renders Exit as a control", () => {
    const html = renderToStaticMarkup(
      createElement(SocialExploreForYouStream, { items: [item], emptyLabel: null }),
    );
    const src = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");
    const css = readFileSync("src/app/globals.css", "utf8");
    const exitSrc = readFileSync("src/components/social/social-explore-exit.tsx", "utf8");
    const lock = readFileSync("docs/design-locks/social-explore-for-you-immersive-lock-v2.md", "utf8");
    const playerAt = html.indexOf("data-social-explore-player");
    const muxAt = html.indexOf("data-social-mux-player");
    expect(playerAt).toBeGreaterThan(-1);
    expect(muxAt).toBeGreaterThan(playerAt);
    expect(html).toContain("social-explore-player");
    expect(html).toContain("md:object-contain");
    expect(html).toContain("object-cover");
    expect(src).toContain('fit="cover"');
    expect(src).not.toContain('fit="contain"');
    const exploreCss = css.slice(css.indexOf(".social-explore-player {"));
    const phonePlayer = exploreCss.slice(0, exploreCss.indexOf(".social-explore-stage-media {"));
    expect(phonePlayer).toContain("inset: 0");
    expect(phonePlayer).not.toContain("9 / 16");
    const phoneMedia = exploreCss.slice(
      exploreCss.indexOf(".social-explore-stage-media {"),
      exploreCss.indexOf("@media (min-width: 768px)"),
    );
    expect(phoneMedia).toContain("--media-object-fit: cover");
    expect(phoneMedia).not.toMatch(/object-fit:\s*contain/);
    const desktop = exploreCss.slice(exploreCss.indexOf("@media (min-width: 768px)"));
    const playerRule = desktop.slice(
      desktop.indexOf(".social-explore-player {"),
      desktop.indexOf(".social-explore-slide"),
    );
    expect(playerRule).toContain("left: 50%");
    expect(playerRule).toContain("top: 50%");
    expect(playerRule).toContain("100cqh * 9 / 16");
    expect(playerRule).toContain("100cqw * 16 / 9");
    expect(playerRule).not.toContain("cover");
    expect(desktop).toContain("--media-object-fit: contain");
    expect(desktop).toContain("object-fit: contain !important");

    const exitHtml = renderToStaticMarkup(createElement(SocialExploreExit));
    const exitOpen = exitHtml.indexOf("data-social-explore-exit");
    const exitTag = exitHtml.slice(exitHtml.lastIndexOf("<", exitOpen), exitHtml.indexOf(">", exitOpen) + 1);
    expect(exitTag.startsWith("<a ")).toBe(true);
    expect(exitTag).toContain('href="/social"');
    expect(exitTag).toContain("rounded-full");
    expect(exitTag).toContain("bg-ink");
    expect(exitTag).toContain("min-h-[var(--header-control-size)]");
    expect(exitTag).toContain("md:inline-flex");
    expect(exitTag).toContain("hidden");
    expect(exitHtml).toContain(">Exit<");
    expect(exitHtml).toContain('data-social-icon="x"');
    expect(exitTag).not.toContain("t-body text-ink md:inline-flex");
    expect(exitSrc).toContain("exploreExitUsesPriorRoute");
    expect(exitSrc).toContain("SOCIAL_ROUTES.home");
    expect(lock).toContain("## A2) Desktop player");
    expect(lock).toContain("object-fit: cover");
    expect(lock).toContain("Phone rows in §A stay");
  });
});
