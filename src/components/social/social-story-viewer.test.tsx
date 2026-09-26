import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => createElement("img", { src, alt: "" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub() {
      return null;
    },
}));

import {
  SOCIAL_STORY_ACTIVE_CARD_CLASS,
  SOCIAL_STORY_HOLD_SURFACE_CLASS,
  SOCIAL_STORY_REPLY_PILL_CLASS,
  SOCIAL_STORY_STAGE_CLASS,
} from "@/lib/social-chrome";
import { SocialStoryViewer } from "./social-story-viewer";

const viewerProps = {
  storyId: "s1",
  authorId: "u1",
  authorName: "Ada Lovelace",
  authorPhotoUrl: null,
  createdAt: "2026-09-24T00:00:00.000Z",
  body: null,
  prevId: null,
  nextId: null,
  prevAuthor: null,
  nextAuthor: null,
  index: 0,
  total: 1,
  canReply: false,
};

const neighbor = {
  storyId: "s-prev",
  authorName: "Grace Hopper",
  authorPhotoUrl: null,
  createdAt: "2026-09-24T00:00:00.000Z",
  unseen: true,
  coverUrl: "/api/social/media?key=stories%2Fprev.jpg",
  coverKind: "image" as const,
};

describe("SocialStoryViewer", () => {
  it("opens a dark full-viewport 9:16 stage, not the light 420px card", () => {
    const html = renderToStaticMarkup(
      createElement(SocialStoryViewer, {
        ...viewerProps,
        media: [{ kind: "video", url: "/api/social/media?key=stories%2Forg%2Fclip.mp4" }],
        nextAuthor: { ...neighbor, storyId: "s-next", authorName: "Mary Keller" },
        prevAuthor: neighbor,
        canReply: true,
        total: 2,
        index: 0,
      }),
    );
    expect(html).toContain('data-social-story-stage=""');
    expect(html).toContain(SOCIAL_STORY_STAGE_CLASS);
    expect(html).toContain(SOCIAL_STORY_ACTIVE_CARD_CLASS);
    expect(html).toContain("md:h-[min(90vh-16px,840px)]");
    expect(SOCIAL_STORY_ACTIVE_CARD_CLASS).toContain("md:w-[calc(min(90vh-16px,840px)*9/16)]");
    expect(html).not.toContain("max-w-[420px]");
    expect(html).not.toContain("bg-surface p-");
    expect(html).toContain('data-social-story-viewer="s1"');
    expect(html).toContain("data-social-video-closed");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("/api/social/media?key=stories%2Forg%2Fclip.mp4");
    expect(html).toContain('data-social-story-frame=""');
    expect(html).toContain("data-social-story-pause");
    expect(html).toContain("data-social-story-mute");
    expect(html).toContain('data-social-story-neighbor="s-prev"');
    expect(html).toContain('data-social-story-neighbor="s-next"');
    expect(html).toContain("opacity-45");
    expect(html).toContain("border-accent");
    expect(html).toContain('data-social-story-mark=""');
    expect(html).toContain('href="/social"');
    const closeAt = html.indexOf('data-social-story-close=""');
    const close = html.slice(closeAt, html.indexOf("</a>", closeAt));
    expect(closeAt).toBeGreaterThan(html.indexOf('data-social-story-tap="next"'));
    expect(close).toContain('href="/social"');
    expect(close).toContain("size-11");
    expect(close).toContain("z-30");
    expect(close).toContain("touch-manipulation");
    expect(close).toContain('width="22"');
    expect(close).toContain('height="22"');
    expect(html).toContain("Send message");
    expect(html).not.toContain("Reply to Ada Lovelace…");
    expect(html).toContain('data-social-story-heart=""');
    expect(html).toContain('data-social-story-heart-state="none"');
    expect(html).toContain('data-social-story-send=""');
    expect(html).toContain('aria-label="Send story"');
    expect(html).not.toContain("data-social-story-heart-count");
    expect(html).toContain("bg-band-ink");
    expect(html).not.toContain("bg-accent");
    expect(html).toContain("paper-plane-tilt");
    expect(html).not.toContain("Instagram");
    expect(html).not.toContain("aspect-video");
    expect(html).not.toContain("aspect-[4/5]");
    const still = renderToStaticMarkup(
      createElement(SocialStoryViewer, {
        ...viewerProps,
        media: [{ kind: "image", url: "/api/social/media?key=stories%2Forg%2Fstill.jpg" }],
      }),
    );
    expect(still).toContain('data-social-story-frame=""');
    expect(still).not.toContain("data-social-story-pause");
    expect(still).not.toContain("data-social-story-mute");
    expect(still).not.toContain("data-social-story-neighbor");
    expect(still).not.toContain("aspect-video");
    expect(still).not.toContain("aspect-[4/5]");
    expect(still).toContain("social-story-progress");
    expect(still).toContain("animation-duration:5000ms");

    const mux = renderToStaticMarkup(
      createElement(SocialStoryViewer, {
        ...viewerProps,
        media: [
          {
            kind: "video",
            url: "https://image.mux.com/uNbxnGLKJ00yfbijDO8COxT/thumbnail.webp",
            playbackId: "uNbxnGLKJ00yfbijDO8COxT",
            playbackPolicy: "signed",
          },
        ],
      }),
    );
    expect(mux).toContain('data-social-mux-player="uNbxnGLKJ00yfbijDO8COxT"');
    expect(mux).toContain('data-social-mux-playback="pending"');
    expect(mux).toContain('data-social-mux-poster="pending"');
    expect(mux).not.toContain('data-social-mux-poster=""');
    expect(mux).not.toContain("https://image.mux.com/uNbxnGLKJ00yfbijDO8COxT/thumbnail.webp");
    expect(mux).not.toContain("<video");
    expect(mux).toContain("data-social-story-mute");
  });

  it("pauses a hidden story and commits the enter class before paint", () => {
    const src = readFileSync("src/components/social/social-story-viewer.tsx", "utf8");
    expect(src).not.toContain("<video");
    expect(src).not.toContain("socialVideoDisplaySrc");
    expect(src).not.toContain("audioTracks");
    expect(src).toContain("setAudible(true)");
    expect(src).toContain("consumeStoryEnter");
    expect(src).toContain("storyTrayStep");
    expect(src).toContain("w-2/3");
    expect(src).toContain("SOCIAL_STORY_PROGRESS_ROW_CLASS");
    expect(src).not.toContain("requestAnimationFrame(() => setEnter");
    expect(src).not.toContain("SOCIAL_STORY_STAGE_IN_CLASS");
    const hold = readFileSync("src/components/social/social-story-open-hold.tsx", "utf8");
    expect(hold).toContain("flushSync(() => {");
    expect(hold).toContain("setSrc(next)");
    expect(hold).toContain("STORY_OPEN_SETTLE_MS = 220");
    expect(hold).toContain("social-story-open-settle");
    expect(src).toContain('data-social-story-close=""');
    expect(src).toContain("size-11");
    expect(src).toContain("onPointerDown={(event) => event.stopPropagation()}");
    const phoneClose = src.slice(
      src.indexOf('data-social-story-close=""'),
      src.indexOf("</Link>", src.indexOf('data-social-story-close=""')),
    );
    expect(phoneClose).toContain("size-11");
    expect(phoneClose).toContain("size={22}");
    const warm = src.slice(src.lastIndexOf("new MutationObserver"));
    expect(warm).toContain("paintStoryEnter");
    expect(src.indexOf("flushSync(() => apply(null))")).toBeLessThan(
      src.indexOf("flushSync(() => apply(direction))"),
    );
    expect(src).toContain("void stage.offsetWidth");
    const onKey = src.slice(src.indexOf("function onKey"), src.indexOf('addEventListener("keydown"'));
    expect(onKey).toContain("storyPlaybackHeld(screen, false)");
    expect(onKey.indexOf("storyPlaybackHeld(screen, false)")).toBeLessThan(onKey.indexOf('go("prev"'));
    expect(onKey).not.toContain("router.push");
    expect(src).toContain("sendSheetOpen");
    expect(src).toContain(
      "storyAdvanceWhileSending(sendSheetOpen || activityOpen, reason, paused || held)",
    );
    expect(src).toContain(
      "const playbackPaused = paused || held || sendSheetOpen || activityOpen || sayExpanded",
    );
    expect(src).not.toContain("currentTime = 0");
    const page = readFileSync("src/app/(app)/social/stories/[id]/page.tsx", "utf8");
    expect(page).toContain("key={story.id}");
    expect(page).toContain("socialMediaProxies");
    expect(page).not.toContain("signedStoryPlaybackItems");
    expect(page).not.toContain("signedSocialMediaItems");
    expect(page).not.toContain("signedSocialMediaUrl");
    expect(page).toContain("SOCIAL_STORY_STAGE_CLASS");
    expect(page).toContain("SOCIAL.stories.close");
  });

  it("keeps a hold from selecting the viewer or raising the iOS callout", () => {
    expect(SOCIAL_STORY_HOLD_SURFACE_CLASS).toContain("select-none");
    expect(SOCIAL_STORY_HOLD_SURFACE_CLASS).toContain("social-story-no-callout");
    expect(SOCIAL_STORY_REPLY_PILL_CLASS).not.toContain("select-none");
    expect(SOCIAL_STORY_REPLY_PILL_CLASS).not.toContain("social-story-no-callout");
    const html = renderToStaticMarkup(
      createElement(SocialStoryViewer, {
        ...viewerProps,
        media: [{ kind: "video", url: "/api/social/media?key=stories%2Forg%2Fclip.mp4" }],
        canReply: true,
      }),
    );
    expect(html.split("social-story-no-callout").length - 1).toBe(5);
    expect(html).toContain('data-social-story-stage=""');
    expect(html).toContain('data-social-story-frame=""');
    expect(html).toContain('data-social-story-tap="prev"');
    expect(html).toContain('data-social-story-tap="next"');
    expect(html).toContain("w-1/3");
    expect(html).toContain("w-2/3");
    const replyAt = html.indexOf('data-social-story-reply=""');
    const reply = html.slice(replyAt, html.indexOf("</form>", replyAt));
    expect(reply).not.toContain("social-story-no-callout");
    expect(reply).not.toContain("select-none");
    const pauseAt = html.indexOf('data-social-story-pause=""');
    const pause = html.slice(pauseAt, html.indexOf("</button>", pauseAt));
    expect(pause).not.toContain("social-story-no-callout");
    expect(pause).not.toContain("select-none");
    const src = readFileSync("src/components/social/social-story-viewer.tsx", "utf8");
    const touch = src.slice(
      src.lastIndexOf("useEffect", src.indexOf("const blockCallout")),
      src.indexOf("function onZonePointerDown"),
    );
    expect(touch).toContain("const node = mediaRef.current");
    expect(touch).not.toContain("stageRef");
    expect(touch).toContain(
      'addEventListener("touchstart", blockCallout, { passive: false, capture: true })',
    );
    expect(touch).toContain("event.preventDefault()");
    expect(touch).toContain("storyTouchTargetsTextField");
    expect(src).toContain("onContextMenu={onMediaContextMenu}");
    expect(src).toContain("onPointerDown={onZonePointerDown}");
    expect(src).toContain("onPointerUp={onZonePointerUp}");
    expect(src).toContain("onPointerCancel={onZonePointerCancel}");
    expect(src).toContain("SOCIAL_STORY_ACTIVATE_NEXT_CLASS");
    const cancel = src.slice(
      src.indexOf("function onZonePointerCancel"),
      src.indexOf("function onMediaContextMenu"),
    );
    expect(cancel.indexOf("STORY_POINTER_CANCEL_IGNORE_MS")).toBeLessThan(cancel.indexOf("releaseHold"));
    const css = readFileSync("src/app/globals.css", "utf8");
    const callout = css.slice(css.indexOf(".social-story-no-callout"));
    expect(callout).toContain("-webkit-touch-callout: none");
    expect(callout).toContain("-webkit-user-select: none");
    expect(callout).toContain("user-select: text");
    expect(callout).toContain("textarea");
    expect(callout).toContain('[contenteditable="true"]');
  });

  it("replaces the heart stub with a live heart and send, and hides a zero count", () => {
    const src = readFileSync("src/components/social/social-story-viewer.tsx", "utf8");
    const heartTag = src.slice(
      Math.max(0, src.indexOf('data-social-story-heart=""') - 120),
      src.indexOf('data-social-story-heart=""'),
    );
    expect(heartTag).toContain("<button");
    expect(heartTag).not.toContain("<span");
    expect(src).toContain("nextStoryHeart");
    expect(src).toContain("toggleSocialStoryLike");
    expect(src).toContain("storyHeartCountVisible");
    expect(src).not.toMatch(/ThumbsUp|thumbs-up|thumbs-down|data-social-story-thumb/);
    expect(src).not.toContain("data-social-story-comments");
    const idle = renderToStaticMarkup(
      createElement(SocialStoryViewer, {
        ...viewerProps,
        media: [{ kind: "image", url: "/api/social/media?key=stories%2Forg%2Fstill.jpg" }],
        likes: { s1: { liked: false, count: 0 } },
      }),
    );
    const heartAt = idle.indexOf('data-social-story-heart=""');
    const heart = idle.slice(heartAt - 80, idle.indexOf("</button>", heartAt));
    expect(heart.startsWith("button") || heart.includes("<button")).toBe(true);
    expect(idle).toContain('data-social-story-heart-state="none"');
    expect(idle).toContain('aria-pressed="false"');
    expect(idle).not.toContain("data-social-story-heart-count");
    expect(idle).toContain("size-10");
    expect(idle).toContain("gap-2");
    expect(idle).toContain("duration-[120ms]");
    expect(idle).toContain("active:opacity-70");
    expect(idle).not.toContain("animate-bounce");
    expect(idle).not.toContain("scale-");
    expect(idle).toContain("min-w-0 flex-1");
    const liked = renderToStaticMarkup(
      createElement(SocialStoryViewer, {
        ...viewerProps,
        media: [{ kind: "image", url: "/api/social/media?key=stories%2Forg%2Fstill.jpg" }],
        likes: { s1: { liked: true, count: 2 } },
      }),
    );
    expect(liked).toContain('data-social-story-heart-state="liked"');
    expect(liked).toContain('aria-pressed="true"');
    expect(liked).toContain("data-social-story-heart-count");
    expect(liked).toContain(">2<");
    expect(liked).toContain("text-[#1769FF]");
    expect(liked).toContain('data-social-icon-active=""');
    const page = readFileSync("src/app/(app)/social/stories/[id]/page.tsx", "utf8");
    expect(page).toContain("loadStoryLikeCounts");
    expect(page).toContain("loadLikedStoryIds");
    expect(page).toContain("likes={likes}");
  });
});
