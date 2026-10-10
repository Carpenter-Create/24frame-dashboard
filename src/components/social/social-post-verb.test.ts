import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// One verb for taking a post down: Remove (docs/design-locks/social-post-owner-menu-lock-v1.md
// Copy; social-confirm-copy-lock-v1, amended). The ⋯ lives only in
// SocialPostCard, and no post surface's source names Delete, as a string
// or through the retired key. The strings themselves are pinned in
// social-post-owner.test.tsx (no SOCIAL.post value reads "Delete").

const POST_SURFACES = [
  "src/components/social/social-post-card.tsx",
  "src/components/social/social-post-owner.tsx",
  "src/components/social/social-post-owner-sheet.tsx",
  "src/components/social/use-social-post-owner.ts",
  "src/components/social/social-feed-immersive.tsx",
  "src/components/social/social-explore-for-you.tsx",
  "src/components/social/social-feed-reel-rail.tsx",
  "src/app/(app)/social/p/[postId]/page.tsx",
  "src/app/(app)/social/profile/page.tsx",
  "src/app/(app)/social/u/[handle]/page.tsx",
  "src/app/(app)/social/groups/[slug]/page.tsx",
] as const;

describe("a post is removed, never deleted, in what the owner reads", () => {
  for (const file of POST_SURFACES) {
    it(`${file} never says Delete`, () => {
      const src = readFileSync(file, "utf8");
      expect(src).not.toContain("SOCIAL.post.delete}");
      expect(src).not.toContain('"Delete"');
      expect(src).not.toContain(">Delete<");
    });
  }
});
