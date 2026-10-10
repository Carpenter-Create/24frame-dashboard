import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { SOCIAL } from "@/lib/social";
import { SOCIAL_POST_ACTIONS_CLASS, SOCIAL_POST_MORE_CLASS } from "@/lib/social-chrome";
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
  // Cards (founder 2026-10-06; replaces H · Posts' "⋯ ends the credit
  // row"): the header is on top, so the owner's quiet ⋯ ends the header
  // row (after the name and meta), outside the Like · Comment · Share
  // group, never a fourth round.
  // docs/design-locks/social-feed-cards-lock-v1.md
  it("shows Edit and Delete behind the quiet ⋯ at the header's end, for the owner only", () => {
    const owned = card(true);
    const other = card(false);
    expect(owned).toContain('data-social-post-owner=""');
    expect(owned).toContain(SOCIAL.post.overflow);
    const head = owned.indexOf("data-social-post-head");
    const credit = owned.indexOf("data-social-post-credit");
    const owner = owned.indexOf("data-social-post-owner");
    const words = owned.indexOf("data-social-post-caption");
    const actionsAt = owned.indexOf("data-social-post-actions");
    expect(head).toBeGreaterThan(-1);
    expect(words).toBeGreaterThan(-1);
    // Header → credit → ⋯, then the words, then the actions (the media,
    // a dynamic import, sits between them in the source below).
    expect(head).toBeLessThan(credit);
    expect(credit).toBeLessThan(owner);
    expect(owner).toBeLessThan(words);
    expect(words).toBeLessThan(actionsAt);
    const actions = owned.slice(actionsAt);
    expect(actions).toContain("data-social-post-share");
    expect(actions).not.toContain("data-social-post-owner");
    expect(actions).toContain(`class="${SOCIAL_POST_ACTIONS_CLASS}"`);
    expect(SOCIAL_POST_ACTIONS_CLASS).toMatch(/(?:^|\s)gap-2(?:\s|$)/);
    expect(SOCIAL_POST_ACTIONS_CLASS).not.toContain("gap-3.5");
    expect(SOCIAL_POST_ACTIONS_CLASS).not.toContain("gap-4");
    // Quiet: a clear 44 hit (desktop 40), glyph ink-2, no fill at rest
    // (the exact string is owned by the cards lock test).
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
    expect(postCard.indexOf("<SocialPostOwnerMenu")).toBeLessThan(postCard.indexOf("<SocialPostMedia"));
    expect(postCard.indexOf("<SocialPostMedia")).toBeLessThan(postCard.indexOf("data-social-post-actions"));
    expect(postCard).toContain("className={SOCIAL_POST_ACTIONS_CLASS}");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_OPTICAL_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_ACTIONS_ROW_CLASS");
    expect(postCard).not.toContain("SOCIAL_POST_MORE_SLOT_CLASS");
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
    // Edit caption is the house window now (no Save / Cancel footer):
    // social-post-caption-window-lock-v1, amending social-confirm-copy-lock-v1.
    expect(Object.keys(SOCIAL.post)).not.toContain("editSave");
    expect(Object.keys(SOCIAL.post)).not.toContain("editCancel");

    const src = readFileSync("src/components/social/social-post-owner.tsx", "utf8");
    const remove = src.slice(src.indexOf('mode === "delete"'));
    expect(remove).toContain("<Dialog");
    expect(remove).toContain("SOCIAL.post.deleteKeep");
    expect(remove).toContain("SOCIAL.post.deleteTitle");
    expect(remove).toContain("SOCIAL.post.deleteBody");
    expect(remove).toContain("SOCIAL.post.deleteConfirm");
  });

  // docs/design-locks/social-post-caption-window-lock-v1.md
  it("asks the one caption host for the window; Delete keeps its confirm", () => {
    const src = readFileSync("src/components/social/social-post-owner.tsx", "utf8");
    expect(src).not.toContain("Textarea");
    expect(src).not.toContain('mode === "edit"');
    expect(src).toContain('useState<"delete" | null>(null)');
    expect(src).toContain("useSocialPostCaptionWindow()");
    expect(src).toContain("caption.open({");
    // No host, no Edit: never a dead control.
    expect(src).toContain("{caption ? (");
    // Edit opening the window keeps Radix from pulling focus back to the ⋯.
    expect(src).toContain("onCloseAutoFocus");
    expect(src).toContain("caption?.warm()");
    // The only page refresh left is Delete's.
    const remove = src.slice(src.indexOf("async function removePost()"), src.indexOf("  return (\n    <>"));
    expect(src.match(/router\.refresh\(\)/g)?.length).toBe(1);
    expect(remove).toContain("router.refresh()");
    // The card's words read the overlay through the one hook.
    expect(src).toContain("useSocialPostLiveBody(postId, serverBody)");
  });
});
