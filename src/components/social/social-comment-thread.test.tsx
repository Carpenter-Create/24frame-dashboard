import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { SOCIAL_IN_CARD_FILL_CLASS, SOCIAL_POST_ROUND_IN_GROUP_CLASS } from "@/lib/social-chrome";
import { SocialCommentThread } from "./social-comment-thread";
import { SocialCommentTrigger } from "./social-comment-trigger";

const triggerSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "social-comment-trigger.tsx"), "utf8");
const threadSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "social-comment-thread.tsx"), "utf8");
const hookSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "use-social-comment-thread.ts"), "utf8");

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

  // H · Posts (founder 2026-10-05): the count sits beside the round
  // Comment ("Comment, 3 comments"), not as a muted trail under the caption.
  // Cards (founder 2026-10-06): every post is the grey card, so the round
  // has one face, the in-card fill (the H page / card fork is gone).
  // docs/design-locks/social-feed-cards-lock-v1.md
  it("puts the count beside the round in-card Comment and names it", () => {
    const html = renderToStaticMarkup(
      <SocialCommentTrigger
        post={{ id: "p1", commentCount: 3, groupSlug: null, canComment: true }}
        round
      />,
    );
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).toContain('aria-label="Comment, 3 comments"');
    expect(html).toMatch(/data-social-comment-count=""[^>]*>3<\/span>/);
    expect(html).toContain(`<span class="${SOCIAL_POST_ROUND_IN_GROUP_CLASS}">`);
    expect(SOCIAL_POST_ROUND_IN_GROUP_CLASS).toContain(SOCIAL_IN_CARD_FILL_CLASS);
    expect(SOCIAL_POST_ROUND_IN_GROUP_CLASS).toContain("rounded-full");
    expect(html.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(html).not.toContain("View comments");
    expect(html).not.toContain("text-center");
    const zero = renderToStaticMarkup(
      <SocialCommentTrigger post={{ id: "p1", commentCount: 0, canComment: true }} round />,
    );
    expect(zero).toContain('aria-label="Comment"');
    expect(zero).not.toContain("data-social-comment-count");
    expect(zero).toContain(`<span class="${SOCIAL_POST_ROUND_IN_GROUP_CLASS}">`);
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
  });

  it("does not keep a View comments trail or a muted N comments trail in source", () => {
    expect(triggerSrc).not.toContain("viewComments");
    expect(triggerSrc).not.toContain("View comments");
    expect(triggerSrc).not.toContain('"data-social-comment-trail"');
    expect(triggerSrc).not.toContain("self-start text-left");
    expect(triggerSrc).toContain("socialCommentActionLabel(count)");
    // The feed card's Comment wraps the in-card round and its count (cards lock).
    expect(triggerSrc).toContain("<span className={SOCIAL_POST_ROUND_IN_GROUP_CLASS}>");
  });
});

// docs/design-locks/social-comments-window-lock-v1.md
describe("comment thread hosts (the window, the sheet, the page)", () => {
  it("opens the thread with its post, in the layer that owns it, and returns focus to Comment", () => {
    expect(triggerSrc).toContain("onClose={() => setOpen(false)}");
    expect(triggerSrc).toContain("post={post.preview}");
    expect(triggerSrc).toContain("layer={host}");
    expect(triggerSrc).toContain('aria-haspopup="dialog"');
    expect(triggerSrc.split("ref={buttonRef}").length - 1).toBe(2);
    expect(triggerSrc).toContain("socialCommentReturnFocus(buttonRef.current)");
    // The layer is read in the click, never in render, and never by a DOM walk.
    expect(triggerSrc).toContain("setHost(layer?.current ?? null);");
    expect(triggerSrc).not.toContain(".closest(");
    const html = renderToStaticMarkup(
      <SocialCommentTrigger post={{ id: "p1", commentCount: 2, canComment: true }} icon />,
    );
    expect(html).toContain('aria-haspopup="dialog"');
  });

  it("keeps Esc and the scroll lock on the phone sheet only, marked handled, and draws no 480 dialog", () => {
    const sheet = threadSrc.slice(threadSrc.indexOf("function SocialCommentSheet("), threadSrc.indexOf("function SocialCommentList("));
    expect(threadSrc.split('addEventListener("keydown"').length - 1).toBe(1);
    expect(sheet).toContain('addEventListener("keydown"');
    const escape = sheet.slice(sheet.indexOf('if (event.key === "Escape")'));
    expect(escape.indexOf("event.preventDefault();")).toBeGreaterThan(-1);
    expect(escape.indexOf("event.preventDefault();")).toBeLessThan(escape.indexOf("onClose();"));
    expect(threadSrc).toContain("createPortal(sheet, layer)");
    expect(threadSrc).toContain("<SocialCommentsWindow");
    expect(threadSrc).not.toContain("HouseOverlayHead");
    expect(threadSrc).not.toContain("HouseDialogFrame");
    expect(threadSrc).not.toContain('"social-comment-body"');
    // The hook runs once for every host.
    expect(threadSrc.split("useSocialCommentThread(").length - 1).toBe(1);
  });

  it("loads without an unhandled rejection and never lowers the count from a cut page", () => {
    const load = hookSrc.slice(hookSrc.indexOf("async function load()"), hookSrc.indexOf("void load();"));
    const caught = load.slice(load.indexOf("} catch {"), load.indexOf("const json"));
    expect(caught).toContain("setError(SOCIAL.post.commentFailed);");
    expect(caught).toContain("setLoading(false);");
    expect(load).toContain("if (!json?.truncated) applyOptimisticCommentCount(postId, rows.length);");
    // submit says whether a comment went out (the window scrolls to it).
    expect(hookSrc).toContain("submit: () => boolean;");
  });

  it("draws the page thread as before, with a field id of its own and a name", () => {
    const html = renderToStaticMarkup(
      <SocialCommentThread postId="p1" canComment commentCount={0} variant="page" />,
    );
    expect(html).toContain('data-social-comment-page=""');
    expect(html).toMatch(/<h2[^>]*>Comments<\/h2>/);
    expect(html).toContain("data-social-comment-composer");
    expect(html).not.toContain('id="social-comment-body"');
    expect(html).toMatch(/<textarea[^>]*id="_R_[^"]+"/);
    expect(html).toContain(`aria-label="${SOCIAL.post.commentPlaceholder}"`);
    expect(html).toContain(`placeholder="${SOCIAL.post.commentPlaceholder}"`);
    expect(html).not.toContain('data-house-overlay-host="house-dialog"');
  });
});
