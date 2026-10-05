import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
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
  // docs/design-locks/social-feed-register-lock-v1.md §7
  it("puts the count beside the round grey Comment and names it", () => {
    const html = renderToStaticMarkup(
      <SocialCommentTrigger
        post={{ id: "p1", commentCount: 3, groupSlug: null, canComment: true }}
        round="page"
      />,
    );
    expect(html).not.toContain("data-social-comment-trail");
    expect(html).toContain('aria-label="Comment, 3 comments"');
    expect(html).toMatch(/data-social-comment-count=""[^>]*>3<\/span>/);
    expect(html).toMatch(/class="[^"]*\brounded-full\b[^"]*\bbg-surface-muted\b[^"]*"/);
    expect(html.match(/data-social-comment-open/g)?.length).toBe(1);
    expect(html).not.toContain("View comments");
    expect(html).not.toContain("text-center");
    const zero = renderToStaticMarkup(
      <SocialCommentTrigger post={{ id: "p1", commentCount: 0, canComment: true }} round="card" />,
    );
    expect(zero).toContain('aria-label="Comment"');
    expect(zero).not.toContain("data-social-comment-count");
    // On the grey text card the round is the page white (dark:
    // --surface-muted, lighter than the dark --surface card).
    expect(zero).toMatch(/(?:^|\s)bg-surface(?:\s|")/);
    expect(zero).toMatch(/(?:^|\s)dark:bg-surface-muted(?:\s|")/);
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
    expect(triggerSrc).toContain("socialPostRoundClass(round, true)");
  });
});
