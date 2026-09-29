import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { socialAuthorPostCard } from "@/lib/social-author-post-card";

const helperSrc = readFileSync("src/lib/social-author-post-card.ts", "utf8");
const profileSrc = readFileSync("src/app/(app)/social/profile/page.tsx", "utf8");
const publicProfileSrc = readFileSync("src/app/(app)/social/u/[handle]/page.tsx", "utf8");

const SERVER_PROFILE_PAGES = [profileSrc, publicProfileSrc];
const LIB_SPEC = "@/lib/social-author-post-card";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

function hasUseClientDirective(src: string): boolean {
  const stripped = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return /^\s*["']use client["']/.test(stripped);
}

describe("socialAuthorPostCard server boundary", () => {
  it("builds the card model from a module with no client directive", () => {
    expect(hasUseClientDirective(helperSrc)).toBe(false);
    expect(helperSrc).not.toContain("social-ui");
    expect(existsSync("src/components/social/social-ui.tsx")).toBe(false);
    expect(helperSrc).toContain("export function socialAuthorPostCard");

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

  it("keeps socialAuthorPostCard on the lib module", () => {
    const spec =
      /(?:import|export)\s+(?:type\s+)?\{[^}]*\bsocialAuthorPostCard\b[^}]*\}\s*from\s*["']([^"']+)["']/g;
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      if (file.endsWith("social-author-post-card.ts") || file.endsWith("social-author-post-card.test.ts")) {
        continue;
      }
      const src = readFileSync(file, "utf8");
      if (/export\s+function\s+socialAuthorPostCard\b/.test(src)) offenders.push(file);
      for (const match of src.matchAll(spec)) {
        if (match[1] !== LIB_SPEC) offenders.push(`${file} -> ${match[1]}`);
      }
    }
    expect(offenders).toEqual([]);
    for (const src of SERVER_PROFILE_PAGES) {
      expect(src).toContain(`from "${LIB_SPEC}"`);
      expect(src).toContain("socialAuthorPostCard(");
      expect(src).not.toContain("@/components/social/social-ui");
    }
  });
});
