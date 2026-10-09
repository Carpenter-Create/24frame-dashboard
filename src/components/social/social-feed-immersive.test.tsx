import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import {
  SOCIAL_FEED_IMMERSIVE_CLOSE_CLASS,
  SOCIAL_FEED_IMMERSIVE_DOCK_CLASS,
  SOCIAL_FEED_IMMERSIVE_MEDIA_CLASS,
  SOCIAL_FEED_IMMERSIVE_MUTE_CLASS,
  SOCIAL_FEED_IMMERSIVE_STAGE_CLASS,
  SOCIAL_POST_ACTIONS_ROW_CLASS,
  SOCIAL_STORY_HEART_LIKED_CLASS,
} from "@/lib/social-chrome";

import { SocialFeedImmersive } from "./social-feed-immersive";

const immersiveSrc = readFileSync("src/components/social/social-feed-immersive.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");

const post = {
  id: "p1",
  body: "hello from the dock",
  likeCount: 2,
  commentCount: 1,
  liked: true,
  createdAt: "2026-09-25T12:00:00.000Z",
  authorId: "u1",
  authorHandle: "ada",
  authorName: "Ada Lovelace",
  authorPhotoUrl: null,
  groupSlug: null,
  groupName: null,
  canLike: true,
  media: [{ kind: "image" as const, url: "https://cf.example/signed-image" }],
};

describe("SocialFeedImmersive", () => {
  // Adam 2026-10-08: "on desktop, the icons are covering the player options
  // at the bottom" (when playing a video back). Desktop stacks the media
  // above the dock, so the player bar clears the caption and the actions;
  // the phone keeps the media full-bleed under the dock.
  it("on desktop, stacks the media above the dock so the player bar is never under it", () => {
    const html = renderToStaticMarkup(
      <SocialFeedImmersive post={post} index={0} onClose={() => undefined} />,
    );
    expect(SOCIAL_FEED_IMMERSIVE_STAGE_CLASS).toContain("md:flex md:flex-col");
    expect(SOCIAL_FEED_IMMERSIVE_MEDIA_CLASS).toBe("absolute inset-0 md:relative md:inset-auto md:min-h-0 md:flex-1");
    expect(SOCIAL_FEED_IMMERSIVE_DOCK_CLASS).toContain("absolute inset-x-0 bottom-0");
    expect(SOCIAL_FEED_IMMERSIVE_DOCK_CLASS).toContain("md:relative md:inset-auto md:shrink-0 md:bg-none");
    expect(html).toContain(`data-social-feed-immersive-media="" class="${SOCIAL_FEED_IMMERSIVE_MEDIA_CLASS}"`);
    // Media first, then the dock: the dock follows the media in the column.
    expect(html.indexOf("data-social-feed-immersive-media")).toBeLessThan(html.indexOf("data-social-feed-immersive-dock"));
  });

  it("is one fullscreen stage with contain media and a bottom dock", () => {
    const html = renderToStaticMarkup(
      <SocialFeedImmersive post={post} index={0} onClose={() => undefined} />,
    );
    expect(html).toContain("data-social-feed-immersive");
    expect(html).toContain(SOCIAL_FEED_IMMERSIVE_STAGE_CLASS);
    expect(SOCIAL_FEED_IMMERSIVE_STAGE_CLASS).toContain("bg-[#0A0A0B]");
    expect(SOCIAL_FEED_IMMERSIVE_STAGE_CLASS).toContain("fixed inset-0");
    expect(html).toContain("object-contain");
    expect(html).toContain("data-social-feed-immersive-close");
    expect(html).toContain(SOCIAL_FEED_IMMERSIVE_CLOSE_CLASS);
    expect(SOCIAL_FEED_IMMERSIVE_CLOSE_CLASS).toContain("size-[44px]");
    expect(html).toContain('data-social-icon="x"');
    expect(html).not.toContain("data-social-feed-immersive-mute");
    expect(html).toContain("data-social-feed-immersive-caption");
    expect(html).toContain("ada");
    expect(html).toContain("hello from the dock");
    expect(html).toContain("data-social-feed-immersive-dock");
    expect(html).toContain(SOCIAL_POST_ACTIONS_ROW_CLASS);
    expect(html).toContain("data-social-like");
    expect(html).toContain("data-social-comment-open");
    expect(html).toContain("data-social-post-share");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(immersiveSrc).toContain("SocialPostShareButton");
    expect(immersiveSrc).not.toContain("SocialPostShareControl");
    expect(html.indexOf("data-social-feed-immersive-caption")).toBeLessThan(
      html.indexOf("data-social-post-actions"),
    );
    expect(html.indexOf("data-social-comment-open")).toBeLessThan(html.indexOf("data-social-post-share"));
    expect(html).not.toContain("data-social-comment-thread");
    expect(html).toContain(SOCIAL_STORY_HEART_LIKED_CLASS);
    expect(immersiveSrc).not.toContain("md:grid-cols");
    expect(immersiveSrc).not.toContain("data-social-feed-immersive-rail");
    expect(immersiveSrc).not.toContain("navigator.share");
    expect(immersiveSrc).not.toContain("shareSocialPostLink");
    expect(css).toContain("animation: social-feed-immersive-in 180ms ease-out both");
    expect(css).toContain("html:has([data-social-feed-immersive]) [data-house-lead-stack]");
    expect(css).toContain("html:has([data-social-feed-immersive]) [data-house-phone-bottom-nav]");
    expect(css).toContain("--media-object-fit: contain");
    const motion = css.slice(css.indexOf("@keyframes social-feed-immersive-in"));
    expect(motion.slice(0, 400)).not.toContain("transform");
  });

  it("shows more only when the caption exceeds three lines", () => {
    const short = renderToStaticMarkup(
      <SocialFeedImmersive post={post} index={0} onClose={() => undefined} />,
    );
    expect(short).not.toContain("data-social-feed-immersive-more");

    const long = renderToStaticMarkup(
      <SocialFeedImmersive
        post={{ ...post, body: "word ".repeat(40) }}
        index={0}
        onClose={() => undefined}
      />,
    );
    expect(long).toContain("data-social-feed-immersive-more");
    expect(long).toContain(SOCIAL.post.captionMore);
    expect(long).toContain("line-clamp-3");
  });

  it("keeps Escape on the open sheet and traps focus in the dialog", () => {
    const onKey = immersiveSrc.slice(
      immersiveSrc.indexOf("const onKey"),
      immersiveSrc.indexOf('window.addEventListener("keydown", onKey)'),
    );
    expect(onKey).toContain("event.stopPropagation()");
    expect(onKey).toContain("socialImmersiveEscapeDismisses");
    expect(onKey).toContain("socialImmersiveNestedSheetOpen");
    expect(onKey).not.toContain('if (event.key === "Escape") onClose()');
    expect(onKey).toContain('event.key !== "Tab"');
    expect(onKey).toContain("socialImmersiveActiveFocusRoot");
    expect(onKey).toContain("SOCIAL_IMMERSIVE_SHARE_SHEET_SELECTOR");
    expect(onKey).toContain("SOCIAL_IMMERSIVE_COMMENT_SHEET_SELECTOR");
    expect(onKey).toContain("socialImmersiveTabWrapIndex");
    expect(onKey).toContain("event.preventDefault()");
    expect(onKey).not.toContain("socialImmersiveOutsideSheetOpen");
    // A key the comments window or the phone sheet took is marked handled;
    // the stage skips it (React 19 may have committed the close already),
    // and leaves a Tab the window's own trap moved (social-comments-window-lock-v1).
    expect(onKey).toContain(
      "socialImmersiveEscapeDismisses(event.key, socialImmersiveNestedSheetOpen(document), event.defaultPrevented)",
    );
    expect(onKey).toContain('if (event.key !== "Tab" || event.defaultPrevented) return;');
    // Comment mounts at the stage's root, with the viewer's item as its post.
    expect(immersiveSrc).toContain("layer={dialogRef}");
    expect(immersiveSrc).toContain("preview: socialCommentsPostFromCard(post, index)");
    expect(immersiveSrc).toContain("socialImmersiveMarkShellInert");
    expect(immersiveSrc).toContain("socialImmersiveClearShellInert");
    expect(immersiveSrc).toContain('querySelector<HTMLElement>("[data-social-feed-immersive-close]")');
    expect(immersiveSrc).toContain("previouslyFocused.focus({ preventScroll: true })");
    const missingStage = immersiveSrc.slice(immersiveSrc.indexOf("if (!dialog)"));
    expect(missingStage.indexOf('removeEventListener("keydown", onEscape)')).toBeLessThan(
      missingStage.indexOf('scroller.style.overflow = "hidden"'),
    );
    expect(SOCIAL_FEED_IMMERSIVE_STAGE_CLASS).toContain("z-[45]");
  });

  it("plays Mux video with contain and does not use a raw file player when a playback id exists", () => {
    const html = renderToStaticMarkup(
      <SocialFeedImmersive
        post={{
          ...post,
          body: null,
          media: [{ kind: "video", url: "", playbackId: "abc12345xx" }],
        }}
        index={0}
        onClose={() => undefined}
      />,
    );
    expect(html).toContain('data-social-mux-player="abc12345xx"');
    expect(html).toContain("object-contain");
    expect(html).not.toContain("<video");
    expect(html).toContain('aria-label="View video"');
    expect(html).not.toContain("data-social-feed-immersive-caption");
  });

  it("puts phone mute at the top trailing corner, off the social row", () => {
    const html = renderToStaticMarkup(
      <SocialFeedImmersive
        post={{
          ...post,
          media: [{ kind: "video", url: "", playbackId: "abc12345xx" }],
        }}
        index={0}
        onClose={() => undefined}
      />,
    );
    const dock = html.slice(html.indexOf("data-social-feed-immersive-dock"));
    expect(html).toContain("data-social-feed-immersive-mute");
    expect(html).toContain(SOCIAL_FEED_IMMERSIVE_MUTE_CLASS);
    expect(html).toContain(`aria-label="${SOCIAL.post.mute}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('data-social-icon="speaker-high"');
    expect(html).not.toContain('data-social-icon="speaker-slash"');
    expect(SOCIAL_FEED_IMMERSIVE_MUTE_CLASS).toContain("right-0");
    expect(SOCIAL_FEED_IMMERSIVE_MUTE_CLASS).toContain("top-[env(safe-area-inset-top)]");
    expect(SOCIAL_FEED_IMMERSIVE_MUTE_CLASS).toContain("size-[44px]");
    expect(SOCIAL_FEED_IMMERSIVE_MUTE_CLASS).toContain("md:hidden");
    expect(SOCIAL_FEED_IMMERSIVE_MUTE_CLASS).not.toContain("bottom-0");
    expect(html.indexOf("data-social-feed-immersive-mute")).toBeLessThan(
      html.indexOf("data-social-feed-immersive-dock"),
    );
    expect(dock).toContain("data-social-like");
    expect(dock).toContain("data-social-comment-open");
    expect(dock).toContain("data-social-post-share");
    expect(dock).not.toContain("data-social-feed-immersive-mute");
    expect(dock.indexOf("data-social-like")).toBeLessThan(dock.indexOf("data-social-comment-open"));
    expect(dock.indexOf("data-social-comment-open")).toBeLessThan(dock.indexOf("data-social-post-share"));
    expect(immersiveSrc).toContain("muted={muted}");
    expect(immersiveSrc).toContain("SOCIAL.post.mute");
    expect(immersiveSrc).toContain("SOCIAL.post.unmute");

    const ruleAt = css.indexOf("[data-social-feed-immersive] mux-player");
    const rule = css.slice(ruleAt - 40, ruleAt + 420);
    expect(rule).toContain("@media (max-width: 767px)");
    expect(rule).toContain("--mute-button: none");
    expect(rule).toContain("--volume-range: none");
    expect(rule).toContain("::part(bottom mute button)");
    expect(rule).toContain("::part(bottom volume range)");
    expect(rule).not.toContain("pip");
    expect(rule).not.toContain("fullscreen");
    const feedPlayer = css.slice(css.indexOf(".social-mux-player {"), css.indexOf(".social-mux-player {") + 280);
    expect(feedPlayer).not.toContain("--mute-button");
  });
});
