import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { SocialCommentThread } from "./social-comment-thread";
import { SocialCommentTrigger } from "./social-comment-trigger";

const triggerSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "social-comment-trigger.tsx"), "utf8");

describe("SocialCommentTrigger", () => {
  it("renders no trail text when the count is zero", () => {
    const html = renderToStaticMarkup(
      <SocialCommentTrigger
        post={{ id: "p1", commentCount: 0, groupSlug: null, canComment: true }}
      />,
    );
    expect(html).toBe("");
    expect(html).not.toContain("data-social-comment-open");
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).not.toContain("View comments");
    expect(html).not.toContain(`0 ${SOCIAL.post.comments}`);
    expect(html).not.toContain("data-social-comment-thread");
    expect(html).not.toContain("data-social-comment-composer");
  });

  it("names a left muted count when comments already exist", () => {
    const html = renderToStaticMarkup(
      <SocialCommentTrigger
        post={{ id: "p1", commentCount: 3, groupSlug: null, canComment: true }}
      />,
    );
    expect(html).toContain("data-social-comment-trail");
    expect(html).toContain("self-start text-left t-body-sm text-ink-2");
    expect(html).toContain(`3 ${SOCIAL.post.comments}`);
    expect(html).not.toContain("View comments");
    expect(html).not.toContain("text-center");
  });

  it("renders the icon face for the action row", () => {
    const html = renderToStaticMarkup(
      <SocialCommentTrigger
        post={{ id: "p1", commentCount: 2, canComment: true }}
        icon
      />,
    );
    expect(html).toContain("data-social-icon");
    expect(html).toContain('aria-label="Comments"');
    expect(html).toContain("data-social-comment-open");
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).toContain('href="/social/p/p1"');
    expect(html).toContain("data-social-comment-href");
    expect(html).not.toContain("data-social-comment-thread");
  });

  it("keeps Explore on the in-place sheet", () => {
    const html = renderToStaticMarkup(
      <SocialCommentTrigger
        post={{ id: "p1", commentCount: 2, canComment: true }}
        icon
        presentation="sheet"
      />,
    );
    expect(html).toContain("<button");
    expect(html).not.toContain('href="/social/p/p1"');
    expect(html).not.toContain("data-social-comment-thread");
  });

  it("paints the in-place sheet with the Share drawer", () => {
    const thread = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "social-comment-thread.tsx"), "utf8");
    const share = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "social-post-share-sheet.tsx"), "utf8");
    const html = renderToStaticMarkup(
      <SocialCommentThread postId="p1" canComment commentCount={0} onClose={() => undefined} />,
    );
    expect(thread).toContain("SOCIAL_POST_DRAWER_SURFACE_CLASS");
    expect(share).toContain("SOCIAL_POST_DRAWER_SURFACE_CLASS");
    expect(thread).toContain("SOCIAL_POST_DRAWER_GRAB_CLASS");
    expect(share).toContain("SOCIAL_POST_DRAWER_GRAB_CLASS");
    expect(thread).toContain("SOCIAL_POST_DRAWER_SUBMIT_CLASS");
    expect(share).toContain("SOCIAL_POST_DRAWER_SUBMIT_CLASS");
    expect(html).toContain('data-social-comment-host="ig-drawer"');
    expect(html).toContain("data-social-comment-grab");
    expect(html).toContain("bg-surface");
    expect(html).toContain("rounded-t-[16px]");
    expect(html).toContain("md:rounded-[16px]");
    expect(html).toContain("border-hairline");
    expect(html).toContain("bg-ink/40");
    expect(html).toContain("rounded-[20px]");
    expect(html).toContain("rounded-[24px]");
    expect(html).toContain("bg-accent");
    expect(html).toContain(SOCIAL.post.commentsTitle);
    expect(html).not.toContain("HouseDialog");
    expect(html).not.toContain("data-house-overlay-host");
    expect(html).not.toContain("bg-[#181818]");
    expect(html).not.toContain("bg-white");
    expect(thread).not.toContain("HouseDialogFrame");
    expect(thread).not.toContain("document.body.style.overflow");
    expect(thread).toContain("fieldRef.current.focus({ preventScroll: true })");
    expect(thread).toContain("socialImmersiveTabWrapIndex");
    expect(thread).toContain("previouslyFocused.focus({ preventScroll: true })");
  });

  it("does not keep a View comments trail in source", () => {
    expect(triggerSrc).not.toContain("viewComments");
    expect(triggerSrc).not.toContain("View comments");
    expect(triggerSrc).toContain("data-social-comment-trail");
    expect(triggerSrc).toContain("self-start text-left");
  });
});
