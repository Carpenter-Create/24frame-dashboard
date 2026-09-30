import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { SocialPostCardModel } from "@/lib/social-author-post-card";
import {
  SOCIAL_POST_OPEN_FRAME_MEDIA_CLASS,
  SOCIAL_POST_OPEN_FRAME_TEXT_CLASS,
  SOCIAL_POST_OPEN_HOST_MEDIA_CLASS,
  SOCIAL_POST_OPEN_HOST_TEXT_CLASS,
  SOCIAL_POST_OPEN_RAIL_MEDIA_CLASS,
} from "@/lib/social-chrome";
import { SOCIAL } from "@/lib/social";

import { SocialPostOpen } from "./social-post-open";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: () => undefined, push: () => undefined, prefetch: () => undefined }),
}));

vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));

const post: SocialPostCardModel = {
  id: "p1",
  body: "hello from the post",
  likeCount: 4,
  commentCount: 2,
  liked: false,
  createdAt: "2026-09-25T12:00:00.000Z",
  authorId: "u1",
  authorHandle: "ada",
  authorName: "Ada Lovelace",
  authorPhotoUrl: null,
  groupSlug: null,
  groupName: null,
  canLike: true,
  media: [],
};

describe("SocialPostOpen", () => {
  it("centers a text post on the desktop scrim and stacks the thread", () => {
    const html = renderToStaticMarkup(<SocialPostOpen post={post} dismiss="back" />);
    expect(html).toContain('data-social-post-open-kind="text"');
    expect(html).toContain('data-social-post-open-return="back"');
    expect(html).toContain(SOCIAL_POST_OPEN_HOST_TEXT_CLASS);
    expect(html).toContain(SOCIAL_POST_OPEN_FRAME_TEXT_CLASS);
    expect(html).toContain("data-social-post-open-scrim");
    expect(html).toContain("data-social-post-open-close");
    expect(html).toContain("data-social-comment-panel");
    expect(html).toContain("data-social-comment-composer");
    expect(html).toContain("data-social-like");
    expect(html).toContain("data-social-post-share");
    expect(html).toContain("hello from the post");
    expect(html).toContain("Ada Lovelace");
    expect(html).not.toContain("data-social-post-open-stage");
    expect(html).not.toContain("truncate");
  });

  it("splits desktop media with the picture contained beside the thread", () => {
    const html = renderToStaticMarkup(
      <SocialPostOpen
        dismiss="home"
        post={{
          ...post,
          media: [{ kind: "image", url: "https://cf.example/signed-image" }],
        }}
      />,
    );
    expect(html).toContain('data-social-post-open-kind="media"');
    expect(html).toContain(SOCIAL_POST_OPEN_HOST_MEDIA_CLASS);
    expect(html).toContain(SOCIAL_POST_OPEN_FRAME_MEDIA_CLASS);
    expect(html).toContain(SOCIAL_POST_OPEN_RAIL_MEDIA_CLASS);
    expect(html).toContain("data-social-post-open-stage");
    expect(html).toContain("object-contain");
    expect(html).toContain("https://cf.example/signed-image");
    expect(html.indexOf("data-social-post-open-stage")).toBeLessThan(
      html.indexOf("data-social-post-open-rail"),
    );
    const media = readFileSync("src/components/social/social-post-open-media.tsx", "utf8");
    expect(media).toContain('fit="contain"');
    expect(media).toContain('frame="pane"');
    expect(SOCIAL.post.commentsTitle).toBe("Comments");
  });
});
