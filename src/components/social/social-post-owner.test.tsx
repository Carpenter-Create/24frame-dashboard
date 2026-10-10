import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/social",
}));

import { menuHostClass } from "@/lib/menu-host";
import { SOCIAL } from "@/lib/social";
import { SOCIAL_POST_ACTIONS_CLASS, SOCIAL_POST_MORE_CLASS } from "@/lib/social-chrome";
import { SocialPostCard } from "./social-post-card";

const ownerSrc = readFileSync("src/components/social/social-post-owner.tsx", "utf8");
const hookSrc = readFileSync("src/components/social/use-social-post-owner.ts", "utf8");
const sheetSrc = readFileSync("src/components/social/social-post-owner-sheet.tsx", "utf8");

/** The opening tag that carries `needle`, from `from` on. */
function tagOf(html: string, needle: string, from = 0): string {
  const at = html.indexOf(needle, from);
  expect(at, needle).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

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
  it("shows Edit caption and Remove behind the quiet ⋯ at the header's end, for the owner only", () => {
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
    expect(src).toContain("SOCIAL.post.editTitle}");
    expect(src).toContain("SOCIAL.post.deleteConfirm}");
    expect(src).not.toContain("SOCIAL.post.edit}");
    expect(src).not.toContain("SOCIAL.post.delete}");
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

  // docs/design-locks/social-post-owner-menu-lock-v1.md (Copy) and
  // social-confirm-copy-lock-v1 (amended): one verb, Remove; the new line.
  it("locks the Remove copy: one verb, the approved line, Delete and Edit retired", () => {
    expect(SOCIAL.post.deleteTitle).toBe("Remove this post?");
    expect(SOCIAL.post.deleteBody).toBe("It comes off 24Frame, with its comments and likes. You can't undo this.");
    expect(SOCIAL.post.deleteConfirm).toBe("Remove");
    expect(SOCIAL.post.deleteKeep).toBe("Keep");
    expect(SOCIAL.post.deleteFailed).toBe("Could not remove that post.");
    expect(SOCIAL.post.editTitle).toBe("Edit caption");
    // Edit caption is the house window (no Save / Cancel footer):
    // social-post-caption-window-lock-v1, amending social-confirm-copy-lock-v1.
    for (const retired of ["edit", "delete", "editSave", "editCancel"]) {
      expect(Object.keys(SOCIAL.post), retired).not.toContain(retired);
    }
    // No post string says Delete or Edit again, under any key.
    expect(Object.values(SOCIAL.post)).not.toContain("Delete");
    expect(Object.values(SOCIAL.post)).not.toContain("Edit");
  });

  it("draws the ⋯ once for each width through the menu-family gate", () => {
    // Desktop: the thread ··· popover, its trigger inside the desktop slot.
    const desktop = ownerSrc.slice(ownerSrc.indexOf('<span data-menu-host="desktop"'), ownerSrc.indexOf("</span>"));
    expect(desktop).toContain('data-menu-family="desktop"');
    expect(desktop).toContain('className={menuHostClass("desktop", "slot")}');
    expect(desktop).toContain("<DropdownMenuTrigger asChild>");
    expect(desktop).toContain('<ThreadPopoverContent align="end" data-menu-family="desktop"');
    expect(desktop).toContain("{SOCIAL.post.editTitle}");
    expect(desktop).toContain("{SOCIAL.post.deleteConfirm}");
    expect(desktop).toContain("onCloseAutoFocus={onDesktopCloseAutoFocus}");
    // Phone: a plain button that opens the sheet on click, never Radix's
    // finger-down trigger.
    const phone = ownerSrc.slice(ownerSrc.indexOf('data-menu-host="phone"'), ownerSrc.indexOf('<span data-menu-host="desktop"'));
    expect(phone).toContain('data-menu-family="A"');
    expect(phone).toContain('aria-haspopup="dialog"');
    expect(phone).toContain('menuHostClass("phone")');
    expect(phone).toContain("onClick={openSheet}");
    expect(ownerSrc.indexOf("<DropdownMenuTrigger")).toBeGreaterThan(ownerSrc.indexOf('<span data-menu-host="desktop"'));
    expect(ownerSrc.match(/<DropdownMenuTrigger/g)).toHaveLength(1);
    expect(ownerSrc).toContain("<SocialPostOwnerSheet");
    expect(ownerSrc).toContain("<SocialPostRemoveDialog");
    // The old confirm and its words are gone.
    expect(ownerSrc).not.toContain("@/components/ui/dialog");
    expect(ownerSrc).not.toContain("SOCIAL.post.edit}");
    expect(ownerSrc).not.toContain("SOCIAL.post.delete}");
    // One page refresh in the flow, the removal's, in the hook.
    expect(ownerSrc).not.toContain("router.refresh()");
    expect(sheetSrc).not.toContain("router.refresh()");
    expect(hookSrc.match(/router\.refresh\(\)/g)).toHaveLength(1);
  });

  it("server-draws the phone ⋯ then the desktop ⋯, after the credit and before the words", () => {
    const owned = card(true);
    const credit = owned.indexOf("data-social-post-credit");
    const words = owned.indexOf("data-social-post-caption");
    const phoneAt = owned.indexOf('data-menu-host="phone"');
    const desktopAt = owned.indexOf('data-menu-host="desktop"');
    expect(credit).toBeLessThan(phoneAt);
    expect(phoneAt).toBeLessThan(desktopAt);
    expect(desktopAt).toBeLessThan(words);
    const phone = tagOf(owned, 'data-menu-host="phone"');
    expect(phone).toContain('data-social-post-owner=""');
    expect(phone).toContain(`class="${SOCIAL_POST_MORE_CLASS} ${menuHostClass("phone")}"`);
    expect(menuHostClass("phone")).toBe("md:hidden");
    expect(phone).toContain(`aria-label="${SOCIAL.post.overflow}"`);
    expect(phone).toContain('aria-haspopup="dialog"');
    expect(phone).toContain('aria-expanded="false"');
    const slot = tagOf(owned, 'data-menu-host="desktop"');
    expect(slot).toContain('class="hidden md:contents"');
    const desktop = tagOf(owned, 'data-social-post-owner=""', desktopAt);
    expect(desktop).toContain(`class="${SOCIAL_POST_MORE_CLASS}"`);
    expect(desktop).toContain('aria-haspopup="menu"');
    expect(owned.match(/data-social-post-owner=""/g)).toHaveLength(2);
    expect(card(false)).not.toContain("data-menu-host");
  });

  // docs/design-locks/social-post-caption-window-lock-v1.md
  it("asks the one caption host for the window; Remove asks first", () => {
    for (const src of [ownerSrc, hookSrc, sheetSrc]) {
      expect(src).not.toContain("Textarea");
      expect(src).not.toContain('mode === "edit"');
    }
    expect(hookSrc).toContain("useSocialPostCaptionWindow()");
    expect(hookSrc).toContain("caption.open({");
    expect(hookSrc).toContain("caption?.warm()");
    // No host, no Edit caption: never a dead control.
    expect(hookSrc).toContain("canEdit: caption !== null");
    expect(ownerSrc).toContain("{canEdit ? (");
    expect(sheetSrc).toContain("{canEdit ? (");
    // The card's words read the overlay through the one hook.
    expect(ownerSrc).toContain("useSocialPostLiveBody(postId, serverBody)");
  });
});
