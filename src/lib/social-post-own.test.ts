import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST_BODY_MAX, SOCIAL } from "@/lib/social";
import {
  SOCIAL_POST_CAPTION_RAW_MAX,
  beginSocialPostCaptionSaving,
  endSocialPostCaptionSaving,
  hideSocialPost,
  parseSocialPostCaptionWindow,
  postAuthorRefusal,
  postCaptionUpdateRow,
  postCaptionWrite,
  postHasMedia,
  postSoftDeleteUpdateRow,
  readSocialPostCaption,
  readSocialPostCaptionSaving,
  readSocialPostHidden,
  readSocialPostOwnVersion,
  rememberSocialPostCaption,
  resetSocialPostOwnForTests,
  restoreSocialPostCaption,
  socialPostCaptionDirty,
  socialPostCaptionDone,
  socialPostCaptionWindowClosedHref,
  socialPostCaptionWindowOpenHref,
  socialPostLiveBody,
  socialPostOwnedBy,
  subscribeSocialPostOwn,
} from "@/lib/social-post-own";

describe("own-post caption and soft-delete", () => {
  it("edits caption text and allows an empty caption only when media remains", () => {
    expect(postCaptionWrite("  hello  ", false)).toEqual({ body: "hello" });
    expect(postCaptionWrite("   ", false)).toEqual({ error: SOCIAL.home.emptyPost });
    expect(postCaptionWrite("   ", true)).toEqual({ body: null });
    expect(postCaptionWrite("x".repeat(2001), true)).toEqual({ error: SOCIAL.post.editTooLong });
    expect(postHasMedia([])).toBe(false);
    expect(postHasMedia([{ kind: "image" }])).toBe(true);
  });

  it("refuses a non-author and does not put media on the write", () => {
    expect(postAuthorRefusal("u1", "u1")).toBeNull();
    expect(postAuthorRefusal("u1", "u2")).toBe(SOCIAL.post.notAuthor);
    expect(socialPostOwnedBy("u1", "u1")).toBe(true);
    expect(socialPostOwnedBy("u1", "u2")).toBe(false);
    expect(socialPostOwnedBy("u1", null)).toBe(false);
    expect(socialPostOwnedBy("u1", undefined)).toBe(false);
    expect(socialPostOwnedBy("u1", "")).toBe(false);
    expect(socialPostOwnedBy("", "")).toBe(false);
    expect(postCaptionUpdateRow("hello")).toEqual({ body: "hello" });
    expect(postCaptionUpdateRow("hello")).not.toHaveProperty("edited_at");
    expect(postSoftDeleteUpdateRow()).toEqual({ status: "removed" });
    expect(postCaptionUpdateRow("hello")).not.toHaveProperty("media");
    expect(postSoftDeleteUpdateRow()).not.toHaveProperty("body");
    expect(postCaptionWrite.length).toBe(2);
  });
});

// docs/design-locks/social-post-caption-window-lock-v1.md
describe("Edit caption window: address, dirty and Done", () => {
  beforeEach(() => {
    resetSocialPostOwnForTests();
  });

  it("reads the bare ?caption beside the page's own params; the post is never in the address", () => {
    expect(parseSocialPostCaptionWindow("?caption")).toBe("caption");
    expect(parseSocialPostCaptionWindow("?lane=for-you&caption")).toBe("caption");
    expect(parseSocialPostCaptionWindow("lane=for-you&caption")).toBe("caption");
    expect(parseSocialPostCaptionWindow("")).toBeNull();
    expect(parseSocialPostCaptionWindow("?lane=for-you")).toBeNull();
  });

  it("adds a bare &caption to the page's address and strips only it on close", () => {
    expect(socialPostCaptionWindowOpenHref("/social", "?lane=for-you&topic=drama")).toBe(
      "/social?lane=for-you&topic=drama&caption",
    );
    expect(socialPostCaptionWindowOpenHref("/social/p/x", "")).toBe("/social/p/x?caption");
    // A leftover caption is replaced, never doubled.
    expect(socialPostCaptionWindowOpenHref("/social", "?caption&tab=posts")).toBe("/social?tab=posts&caption");
    expect(socialPostCaptionWindowClosedHref("/social", "?lane=for-you&topic=drama&caption")).toBe(
      "/social?lane=for-you&topic=drama",
    );
    expect(socialPostCaptionWindowClosedHref("/social/p/x", "?caption")).toBe("/social/p/x");
  });

  it("is dirty only when the words change", () => {
    expect(socialPostCaptionDirty("hello  ", "hello")).toBe(false);
    expect(socialPostCaptionDirty("", null)).toBe(false);
    expect(socialPostCaptionDirty("   ", null)).toBe(false);
    expect(socialPostCaptionDirty("hello there", "hello")).toBe(true);
    expect(socialPostCaptionDirty("", "hello")).toBe(true);
  });

  it("checks Done before anything is sent; the same words close without a write", () => {
    expect(socialPostCaptionDone("   ", "hello", false)).toEqual({ kind: "invalid", error: SOCIAL.home.emptyPost });
    expect(socialPostCaptionDone("   ", "hello", true)).toEqual({ kind: "save", body: null });
    expect(socialPostCaptionDone("x".repeat(2001), "hello", true)).toEqual({
      kind: "invalid",
      error: SOCIAL.post.editTooLong,
    });
    expect(socialPostCaptionDone("  hello ", "hello", false)).toEqual({ kind: "unchanged" });
    expect(socialPostCaptionDone("", null, true)).toEqual({ kind: "unchanged" });
    // A media post stored with an empty or blank caption: Done with no words
    // sends nothing (Bugbot on #804), the same reading as socialPostCaptionDirty.
    expect(socialPostCaptionDone("", "", true)).toEqual({ kind: "unchanged" });
    expect(socialPostCaptionDone("  ", " \n ", true)).toEqual({ kind: "unchanged" });
    expect(socialPostCaptionDirty("", "")).toBe(false);
    // Words around a stored blank still save.
    expect(socialPostCaptionDone("new words", "  ", true)).toEqual({ kind: "save", body: "new words" });
    expect(socialPostCaptionDone("  revised ", "hello", false)).toEqual({ kind: "save", body: "revised" });
    expect(SOCIAL_POST_CAPTION_RAW_MAX).toBe(POST_BODY_MAX * 2);
  });
});

describe("Edit caption overlay: restore, saving, version", () => {
  beforeEach(() => {
    resetSocialPostOwnForTests();
  });

  it("restores the server caption on undefined and sets any other value", () => {
    rememberSocialPostCaption("p1", "revised");
    expect(socialPostLiveBody("p1", "hello")).toBe("revised");
    restoreSocialPostCaption("p1", undefined);
    expect(readSocialPostCaption("p1")).toBeUndefined();
    expect(socialPostLiveBody("p1", "hello")).toBe("hello");
    restoreSocialPostCaption("p1", "saved");
    expect(socialPostLiveBody("p1", "hello")).toBe("saved");
    restoreSocialPostCaption("p1", null);
    expect(readSocialPostCaption("p1")).toBeNull();
    expect(socialPostLiveBody("p1", "hello")).toBeNull();
  });

  it("holds a post's saving flag from begin to end, per post and counted", () => {
    expect(readSocialPostCaptionSaving("p1")).toBe(false);
    beginSocialPostCaptionSaving("p1");
    beginSocialPostCaptionSaving("p1");
    expect(readSocialPostCaptionSaving("p1")).toBe(true);
    expect(readSocialPostCaptionSaving("p2")).toBe(false);
    endSocialPostCaptionSaving("p1");
    expect(readSocialPostCaptionSaving("p1")).toBe(true);
    endSocialPostCaptionSaving("p1");
    expect(readSocialPostCaptionSaving("p1")).toBe(false);
  });

  it("emits and bumps the version on every change; reset clears it all", () => {
    const listener = vi.fn();
    const stop = subscribeSocialPostOwn(listener);
    expect(readSocialPostOwnVersion()).toBe(0);
    rememberSocialPostCaption("p1", "a");
    restoreSocialPostCaption("p1", undefined);
    beginSocialPostCaptionSaving("p1");
    endSocialPostCaptionSaving("p1");
    hideSocialPost("p1");
    expect(listener).toHaveBeenCalledTimes(5);
    expect(readSocialPostOwnVersion()).toBe(5);
    stop();
    rememberSocialPostCaption("p2", "b");
    beginSocialPostCaptionSaving("p2");
    resetSocialPostOwnForTests();
    expect(readSocialPostOwnVersion()).toBe(0);
    expect(readSocialPostHidden("p1")).toBe(false);
    expect(readSocialPostCaption("p2")).toBeUndefined();
    expect(readSocialPostCaptionSaving("p2")).toBe(false);
  });
});
