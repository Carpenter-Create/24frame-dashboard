import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { socialAuthorPostCard } from "@/lib/social-author-post-card";

const helperSrc = readFileSync("src/lib/social-author-post-card.ts", "utf8");
const clientSrc = readFileSync("src/components/social/social-ui.tsx", "utf8");
const profileSrc = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
const publicProfileSrc = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");

const SERVER_PROFILE_PAGES = [profileSrc, publicProfileSrc];

function importsClientFunction(src: string): boolean {
  return /import\s*\{[^}]*\bsocialAuthorPostCard\b[^}]*\}\s*from\s*["']@\/components\/social\/social-ui["']/.test(
    src,
  );
}

function hasUseClientDirective(src: string): boolean {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return /^\s*["']use client["']/.test(stripped);
}

describe("socialAuthorPostCard server boundary", () => {
  it("builds the card model from a module with no client directive", () => {
    expect(hasUseClientDirective(helperSrc)).toBe(false);
    expect(helperSrc).not.toContain("social-ui");
    expect(clientSrc).not.toContain("export function socialAuthorPostCard");
    expect(clientSrc).toContain('export { socialAuthorPostCard } from "@/lib/social-author-post-card"');
    expect(clientSrc.startsWith('"use client"')).toBe(true);

    const card = socialAuthorPostCard({
      post: {
        id: "p1",
        body: "hello",
        author_id: "a1",
        like_count: 3,
        comment_count: 1,
        created_at: "2026-09-28T00:00:00.000Z",
      },
      authorHandle: "ada",
      authorName: "Ada",
      authorPhotoUrl: "https://example/a.jpg",
      liked: true,
      canLike: true,
      media: [{ kind: "image", url: "https://example/m.jpg" }],
      owned: true,
    });

    expect(card).toEqual({
      id: "p1",
      body: "hello",
      likeCount: 3,
      commentCount: 1,
      liked: true,
      createdAt: "2026-09-28T00:00:00.000Z",
      authorId: "a1",
      authorHandle: "ada",
      authorName: "Ada",
      authorPhotoUrl: "https://example/a.jpg",
      groupSlug: null,
      groupName: null,
      canLike: true,
      media: [{ kind: "image", url: "https://example/m.jpg" }],
      owned: true,
    });

    const unowned = socialAuthorPostCard({
      post: {
        id: "p2",
        body: null,
        author_id: "a2",
        like_count: 0,
        created_at: "2026-09-28T01:00:00.000Z",
      },
      authorHandle: "grace",
      authorName: "Grace",
      authorPhotoUrl: null,
      liked: false,
      canLike: false,
      media: [],
    });
    expect(unowned.owned).toBe(false);
    expect(unowned.commentCount).toBeUndefined();
    expect(unowned.groupSlug).toBeNull();
    expect(unowned.groupName).toBeNull();
  });

  it("keeps profile server pages from importing the client function", () => {
    for (const src of SERVER_PROFILE_PAGES) {
      expect(src).toContain('from "@/lib/social-author-post-card"');
      expect(importsClientFunction(src)).toBe(false);
      expect(src).toContain("socialAuthorPostCard(");
    }
    expect(profileSrc).not.toContain("@/components/social/social-ui");
  });
});
