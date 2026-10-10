import { describe, expect, it } from "vitest";

import { SOCIAL } from "@/lib/social";
import { readSocialPostCaptionInput, readSocialPostOwnTarget } from "@/lib/social-post-own-input";

// The own-post request is checked before anything else on the server
// (docs/design-locks/social-post-caption-window-lock-v1.md §6).

const POST_ID = "33333333-3333-4333-8333-333333333333";

function form(fields: Record<string, string>): FormData {
  const out = new FormData();
  for (const [key, value] of Object.entries(fields)) out.set(key, value);
  return out;
}

describe("own-post request parser", () => {
  it("takes a uuid post id, the raw body and a valid group slug", () => {
    expect(readSocialPostCaptionInput(form({ post_id: ` ${POST_ID} `, body: "  revised  ", group_slug: "film-club" }))).toEqual({
      postId: POST_ID,
      rawBody: "  revised  ",
      groupSlug: "film-club",
    });
    expect(readSocialPostOwnTarget(form({ post_id: POST_ID, group_slug: "Film-Club" }))).toEqual({
      postId: POST_ID,
      groupSlug: "film-club",
    });
  });

  it("refuses a malformed or missing post id as a post that is not visible", () => {
    for (const bad of ["p1", "", "../posts", `${POST_ID}x`]) {
      expect(readSocialPostCaptionInput(form({ post_id: bad, body: "revised" }))).toEqual({ error: SOCIAL.post.missing });
      expect(readSocialPostOwnTarget(form({ post_id: bad }))).toEqual({ error: SOCIAL.post.missing });
    }
    expect(readSocialPostCaptionInput(form({ body: "revised" }))).toEqual({ error: SOCIAL.post.missing });
    expect(readSocialPostOwnTarget(new FormData())).toEqual({ error: SOCIAL.post.missing });
  });

  it("reads a missing body as empty (FormData gives null), never as an error", () => {
    expect(readSocialPostCaptionInput(form({ post_id: POST_ID }))).toEqual({
      postId: POST_ID,
      rawBody: "",
      groupSlug: null,
    });
  });

  it("drops a missing or invalid group slug (no group page to revalidate), never refusing", () => {
    expect(readSocialPostCaptionInput(form({ post_id: POST_ID, body: "x" }))).toMatchObject({ groupSlug: null });
    expect(readSocialPostCaptionInput(form({ post_id: POST_ID, body: "x", group_slug: "Bad Slug!" }))).toMatchObject({
      groupSlug: null,
    });
    expect(
      readSocialPostCaptionInput(form({ post_id: POST_ID, body: "x", group_slug: "../../admin?x=1" })),
    ).toMatchObject({ groupSlug: null });
    expect(readSocialPostOwnTarget(form({ post_id: POST_ID, group_slug: "Bad Slug!" }))).toEqual({
      postId: POST_ID,
      groupSlug: null,
    });
  });

  it("refuses a raw body over 4,000 characters as too long; a bad id is reported first", () => {
    expect(readSocialPostCaptionInput(form({ post_id: POST_ID, body: "x".repeat(4000) }))).toMatchObject({
      postId: POST_ID,
    });
    expect(readSocialPostCaptionInput(form({ post_id: POST_ID, body: "x".repeat(4001) }))).toEqual({
      error: SOCIAL.post.editTooLong,
    });
    expect(readSocialPostCaptionInput(form({ post_id: "p1", body: "x".repeat(4001) }))).toEqual({
      error: SOCIAL.post.missing,
    });
  });
});
