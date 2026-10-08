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

vi.mock("./social-post-owner", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./social-post-owner")>();
  return {
    ...actual,
    SocialPostOwnerMenu: ({ hasMedia }: { hasMedia: boolean }) =>
      createElement("i", { "data-test-owner-has-media": String(hasMedia) }),
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
