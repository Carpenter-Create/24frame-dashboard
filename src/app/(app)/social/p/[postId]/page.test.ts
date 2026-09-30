import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { SOCIAL, SOCIAL_ROUTES, socialPostHref } from "@/lib/social";

describe("social post detail SoT", () => {
  it("owns /social/p/[postId] and a soft-nav intercept on the same URL", () => {
    const page = readFileSync("src/app/(app)/social/p/[postId]/page.tsx", "utf8");
    const intercept = readFileSync("src/app/(app)/social/@modal/(.)p/[postId]/page.tsx", "utf8");
    const layout = readFileSync("src/app/(app)/social/layout.tsx", "utf8");
    const group = readFileSync("src/app/(app)/social/groups/[slug]/posts/[postId]/page.tsx", "utf8");
    const lock = readFileSync("docs/design-locks/social-post-comment-open-lock-v1.md", "utf8");
    expect(existsSync("src/app/(app)/social/@modal/default.tsx")).toBe(true);
    expect(SOCIAL_ROUTES.post).toBe("/social/p");
    expect(socialPostHref("p1")).toBe("/social/p/p1");
    expect(page).toContain("SocialPostOpenPage");
    expect(page).toContain('dismiss="home"');
    expect(intercept).toContain("SocialPostOpenPage");
    expect(intercept).toContain('dismiss="back"');
    expect(layout).toContain("{modal}");
    expect(layout).not.toContain("export default async function SocialLayout");
    expect(group).toContain("redirect(socialPostHref(post.id))");
    expect(group).not.toContain("SocialPostCard");
    expect(group).not.toContain("SocialCommentThread");
    expect(lock).toContain("/social/p/[postId]");
    expect(lock).toContain("@modal/(.)p/[postId]");
    expect(lock).toContain(SOCIAL.post.commentsTitle);
  });
});
