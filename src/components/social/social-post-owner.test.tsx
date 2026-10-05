import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { SOCIAL } from "@/lib/social";
import { SOCIAL_POST_MORE_CLASS, SOCIAL_POST_MORE_SLOT_CLASS } from "@/lib/social-chrome";
import { SocialPostCard } from "./social-post-card";

const createdAt = "2020-01-01T00:00:00.000Z";

function card(owned: boolean) {
  return renderToStaticMarkup(
    <SocialPostCard
      post={{
        id: "p1",
        body: "hello",
        likeCount: 1,
        commentCount: 0,
        liked: false,
        createdAt,
        authorId: "u1",
        authorHandle: "ada",
        authorName: "Ada Lovelace",
        authorPhotoUrl: null,
        groupSlug: null,
        groupName: null,
        canLike: true,
        media: [{ kind: "image", url: "/api/social/media?key=a" }],
        owned,
      }}
    />,
  );
}

describe("owner post overflow", () => {
  // H · Posts (founder 2026-10-05): the owner's quiet ⋯ ends the credit
  // row — after the round actions on desktop, at the row's end on phone —
  // outside the Like · Comment · Share group, never a fourth round.
  // docs/design-locks/social-feed-register-lock-v1.md §7
  it("shows Edit and Delete behind the quiet ⋯ at the credit row's end, for the owner only", () => {
    const owned = card(true);
    const other = card(false);
    expect(owned).toContain('data-social-post-owner=""');
    expect(owned).toContain(SOCIAL.post.overflow);
    const actions = owned.slice(
      owned.indexOf("data-social-post-actions"),
      owned.indexOf("data-social-post-owner"),
    );
    expect(owned.indexOf("data-social-post-actions")).toBeLessThan(owned.indexOf("data-social-post-owner"));
    expect(actions).toContain("data-social-post-share");
    expect(actions).toMatch(/\bgap-2\b/);
    expect(actions).not.toContain("gap-3.5");
    expect(actions).not.toContain("gap-4");
    // The ⋯ slot: phone order 2 (the credit row's end), desktop order 3.
    const slot = owned.slice(owned.lastIndexOf("<span", owned.indexOf("data-social-post-owner")));
    expect(slot).toContain(SOCIAL_POST_MORE_SLOT_CLASS);
    expect(SOCIAL_POST_MORE_SLOT_CLASS).toContain("order-2");
    expect(SOCIAL_POST_MORE_SLOT_CLASS).toContain("md:order-3");
    // Quiet: a clear 44 hit (desktop 40), glyph ink-2, no fill at rest.
    expect(owned).toContain(SOCIAL_POST_MORE_CLASS);
    expect(SOCIAL_POST_MORE_CLASS).toContain("size-11");
    expect(SOCIAL_POST_MORE_CLASS).toContain("md:size-10");
    expect(SOCIAL_POST_MORE_CLASS).toContain("text-ink-2");
    expect(SOCIAL_POST_MORE_CLASS).not.toMatch(/(?:^|\s)bg-/);
    expect(other).not.toContain("data-social-post-owner");
    const src = readFileSync("src/components/social/social-post-owner.tsx", "utf8");
    expect(src).toContain("ThreadPopoverContent");
    expect(src).toContain("THREAD_POPOVER_ICON_CLASS");
    expect(src).toContain("SOCIAL.post.edit");
    expect(src).toContain("SOCIAL.post.delete");
    expect(src).not.toContain("data-social-post-actions");
    const cardSrc = readFileSync("src/components/social/social-post-card.tsx", "utf8");
    const postCard = cardSrc.slice(cardSrc.indexOf("export function SocialPostCard"));
    expect(postCard.indexOf("data-social-post-actions")).toBeLessThan(postCard.indexOf("<SocialPostOwnerMenu"));
    expect(postCard).toContain("socialPostActionsClass(kind)");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_OPTICAL_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_ROW_CLASS");
    expect(postCard).not.toContain("gap-3.5");
    expect(postCard).not.toContain("gap-4");
  });

  it("locks delete confirm copy to Remove and Keep", () => {
    expect(SOCIAL.post.delete).toBe("Delete");
    expect(SOCIAL.post.deleteTitle).toBe("Remove this post?");
    expect(SOCIAL.post.deleteBody).toBe(
      "It'll come off your profile and the feed. Comments and likes go with it.",
    );
    expect(SOCIAL.post.deleteConfirm).toBe("Remove");
    expect(SOCIAL.post.deleteKeep).toBe("Keep");
    expect(SOCIAL.post.deleteFailed).toBe("Could not remove that post.");
    expect(SOCIAL.post.editCancel).toBe("Cancel");

    const src = readFileSync("src/components/social/social-post-owner.tsx", "utf8");
    const edit = src.slice(src.indexOf('mode === "edit"'), src.indexOf('mode === "delete"'));
    const remove = src.slice(src.indexOf('mode === "delete"'));
    expect(edit).toContain("SOCIAL.post.editCancel");
    expect(edit).not.toContain("SOCIAL.post.deleteKeep");
    expect(remove).toContain("SOCIAL.post.deleteKeep");
    expect(remove).toContain("SOCIAL.post.deleteTitle");
    expect(remove).toContain("SOCIAL.post.deleteBody");
    expect(remove).toContain("SOCIAL.post.deleteConfirm");
    expect(remove).not.toContain("SOCIAL.post.editCancel");
  });
});
