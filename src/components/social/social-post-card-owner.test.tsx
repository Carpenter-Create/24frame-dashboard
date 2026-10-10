// Owner caption guard (cards lock, C5): the owner menu's hasMedia counts
// the post's stored media with the server's own postHasMedia, not the
// media left once the card drops what cannot draw. A media-only legacy post can still have its
// caption cleared, and then shows "Media unavailable" again.
// docs/design-locks/social-feed-cards-lock-v1.md
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

const menu = vi.hoisted(() => ({ props: null as Record<string, unknown> | null }));

vi.mock("./social-post-owner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./social-post-owner")>();
  return {
    ...actual,
    SocialPostOwnerMenu: (props: { hasMedia: boolean }) => {
      menu.props = props;
      return createElement("i", { "data-test-owner-has-media": String(props.hasMedia) });
    },
  };
});

import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import { SOCIAL } from "@/lib/social";
import { SocialPostCard } from "./social-post-card";

function post(overrides: Partial<SocialPostCardModel> = {}): SocialPostCardModel {
  return {
    id: "p1",
    body: "",
    likeCount: 0,
    commentCount: 0,
    liked: false,
    createdAt: "2026-09-12T14:00:00.000Z",
    authorId: "u1",
    authorHandle: "elena",
    authorName: "Elena Ruiz",
    authorPhotoUrl: null,
    groupSlug: null,
    groupName: null,
    canLike: true,
    owned: true,
    media: [],
    topic: null,
    ...overrides,
  };
}

/** The props the card handed the menu on its last render. */
function menuProps(): Record<string, unknown> | null {
  return menu.props;
}

function ownerHasMedia(model: SocialPostCardModel): string | null {
  const html = renderToStaticMarkup(<SocialPostCard post={model} comments={null} />);
  return html.match(/data-test-owner-has-media="(true|false)"/)?.[1] ?? null;
}

describe("SocialPostCard owner menu: hasMedia follows the stored media", () => {
  it("counts a legacy video that cannot draw, so its caption can be cleared", () => {
    expect(ownerHasMedia(post({ media: [{ kind: "video", url: "" }] }))).toBe("true");
  });

  it("is false for a text post and true for a photo post", () => {
    expect(ownerHasMedia(post())).toBe("false");
    expect(ownerHasMedia(post({ media: [{ kind: "image", url: "https://cf.example/s.jpg" }] }))).toBe("true");
  });

  // Edit caption (social-post-caption-window-lock-v1): the window shows the
  // media the card draws, read-only, while hasMedia still counts what is stored.
  it("hands the menu the usable media, the author and the server caption", () => {
    const legacy = { kind: "video" as const, url: "" };
    const photo = { kind: "image" as const, url: "https://cf.example/s.jpg" };
    menu.props = null;
    expect(
      ownerHasMedia(
        post({
          body: "hello",
          authorPhotoUrl: "https://cf.example/a.jpg",
          media: [legacy, photo],
        }),
      ),
    ).toBe("true");
    expect(menuProps()).toMatchObject({
      postId: "p1",
      serverBody: "hello",
      hasMedia: true,
      authorName: "Elena Ruiz",
      authorPhotoUrl: "https://cf.example/a.jpg",
      groupSlug: null,
    });
    expect(menuProps()?.media).toEqual([photo]);
    expect(menuProps()).not.toHaveProperty("body");

    menu.props = null;
    expect(ownerHasMedia(post({ media: [legacy] }))).toBe("true");
    expect(menuProps()?.media).toEqual([]);
  });
});

describe("SocialPostCard music notice", () => {
  function html(model: SocialPostCardModel): string {
    return renderToStaticMarkup(<SocialPostCard post={model} comments={null} />).replaceAll("&#x27;", "'");
  }

  it("shows the generic pending or blocked line to the owner", () => {
    const pending = html(post({ musicNotice: "pending" }));
    expect(pending).toContain('data-social-post-music=""');
    expect(pending).toContain(SOCIAL.music.pending);
    expect(pending).toContain("whitespace-normal");
    const blocked = html(post({ musicNotice: "blocked" }));
    expect(blocked).toContain(SOCIAL.music.blocked);
    expect(blocked).not.toContain("Fixture");
  });

  it("stays quiet without a notice and on someone else's card", () => {
    expect(html(post())).not.toContain("data-social-post-music");
    expect(html(post({ owned: false, musicNotice: "blocked" }))).not.toContain(SOCIAL.music.blocked);
  });
});
