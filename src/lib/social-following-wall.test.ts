import { describe, expect, it } from "vitest";

import { socialFollowingWallView } from "@/lib/social-following-wall";
import type { SocialPostRow } from "@/lib/social-feed";

describe("social following wall view", () => {
  it("maps posts to Query-owned cards with proxy faces and media", () => {
    const posts: SocialPostRow[] = [
      {
        id: "p1",
        body: "Hello",
        author_id: "u2",
        group_id: "g1",
        like_count: 3,
        comment_count: 1,
        created_at: "2026-09-21T12:00:00.000Z",
        media: [],
        category: "Music",
      },
    ];
    const view = socialFollowingWallView({
      wall: { posts, truncated: true, nextCursor: "c1" },
      authors: new Map([["u2", { handle: "ada", display_name: "Ada" }]]),
      faces: new Map([["u2", "/api/social/avatar/u2"]]),
      groups: new Map([["g1", { slug: "writers", name: "Writers" }]]),
      liked: new Set(["p1"]),
      media: new Map([
        [
          "p1",
          [{ kind: "image", url: "/api/social/media?key=posts%2Fu2%2Fa.jpg", contentType: "image/jpeg" }],
        ],
      ]),
      canLike: true,
      viewerId: "u1",
    });
    expect(view.truncated).toBe(true);
    expect(view.nextCursor).toBe("c1");
    expect(view.cards).toEqual([
      {
        id: "p1",
        body: "Hello",
        likeCount: 3,
        commentCount: 1,
        liked: true,
        createdAt: "2026-09-21T12:00:00.000Z",
        authorId: "u2",
        authorHandle: "ada",
        authorName: "Ada",
        authorPhotoUrl: "/api/social/avatar/u2",
        groupSlug: "writers",
        groupName: "Writers",
        canLike: true,
        owned: false,
        // H · Posts: the topic chip on the media reads the post's category.
        topic: "Music",
        media: [{ kind: "image", url: "/api/social/media?key=posts%2Fu2%2Fa.jpg", contentType: "image/jpeg" }],
      },
    ]);
  });
});
