import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

import { SOCIAL } from "@/lib/social";
import { SocialPostCard } from "./social-ui";

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
  it("shows Edit and Delete on the author row for the owner only", () => {
    const owned = card(true);
    const other = card(false);
    expect(owned).toContain('data-social-post-owner=""');
    expect(owned).toContain(SOCIAL.post.overflow);
    expect(owned.indexOf("data-social-post-owner")).toBeLessThan(owned.indexOf("data-social-post-actions"));
    const actions = owned.slice(owned.indexOf("data-social-post-actions"));
    expect(actions).not.toContain("data-social-post-owner");
    expect(actions).toContain("gap-2");
    expect(actions).not.toContain("gap-3.5");
    expect(actions).not.toContain("gap-4");
    expect(other).not.toContain("data-social-post-owner");
    const src = readFileSync("src/components/social/social-post-owner.tsx", "utf8");
    expect(src).toContain("ThreadPopoverContent");
    expect(src).toContain("THREAD_POPOVER_ICON_CLASS");
    expect(src).toContain("SOCIAL.post.edit");
    expect(src).toContain("SOCIAL.post.delete");
    expect(src).not.toContain("data-social-post-actions");
    const cardSrc = readFileSync("src/components/social/social-ui.tsx", "utf8");
    const postCard = cardSrc.slice(cardSrc.indexOf("export function SocialPostCard"));
    expect(postCard.indexOf("SocialPostOwnerMenu")).toBeLessThan(postCard.indexOf("data-social-post-actions"));
    expect(postCard).toContain("SOCIAL_POST_ACTIONS_CLASS");
    expect(postCard).toContain("SOCIAL_POST_ACTIONS_OPTICAL_CLASS");
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
