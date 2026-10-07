import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { SOCIAL_IN_CARD_FILL_CLASS, SOCIAL_POST_ROUND_IN_GROUP_CLASS } from "@/lib/social-chrome";
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
