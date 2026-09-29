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
  });

  it("does not keep a View comments trail in source", () => {
    expect(triggerSrc).not.toContain("viewComments");
    expect(triggerSrc).not.toContain("View comments");
    expect(triggerSrc).toContain("data-social-comment-trail");
    expect(triggerSrc).toContain("self-start text-left");
  });
});
