import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL, socialPostHref } from "@/lib/social";

describe("social post detail SoT", () => {
  it("owns /social/p/[postId] and keeps the group path as a redirect", () => {
    const page = readFileSync("src/app/(app)/social/p/[postId]/page.tsx", "utf8");
    const group = readFileSync("src/app/(app)/social/groups/[slug]/posts/[postId]/page.tsx", "utf8");
    expect(socialPostHref("p1")).toBe("/social/p/p1");
    expect(page).toContain("data-social-post-detail");
    expect(page).toContain("SocialPostCard");
    expect(page).toContain("permalink={false}");
    expect(page).toContain("SocialCommentThread");
    expect(page).toContain('variant="page"');
    expect(page).toContain("SocialPostBack");
    expect(page).toContain("loadVisiblePost");
    expect(page).toContain(SOCIAL.post.title);
    expect(group).toContain("redirect(socialPostHref(post.id))");
    expect(group).not.toContain("SocialPostCard");
    expect(group).not.toContain("SocialCommentThread");
  });
});
