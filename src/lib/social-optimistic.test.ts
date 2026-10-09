import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import { SOCIAL } from "@/lib/social";
import {
  applyOptimisticLike,
  applyOptimisticSocialPost,
  beginSocialLikeEpoch,
  beginSocialPostPublish,
  beginSocialPostPublishBusy,
  endSocialPostPublishBusy,
  persistSocialFollowLatest,
  persistSocialLikeLatest,
  rememberSocialFollowBaseline,
  rememberSocialLikeBaseline,
  socialPostPublishBusy,
  clearOptimisticLike,
  failOptimisticSocialPost,
  mergeSocialLike,
  mergeSocialOptimisticPosts,
  nextSocialLikeState,
  persistSocialLike,
  persistSocialComment,
  persistSocialCommentDelete,
  persistSocialMutation,
  persistSocialPost,
  readOptimisticLike,
  readOptimisticSocialPosts,
  resetSocialOptimisticForTests,
  runSocialOptimisticMutation,
  SOCIAL_OPTIMISTIC_LOCK,
  beginSocialFollowEpoch,
  socialFollowEpochIsCurrent,
  socialFollowPersistKey,
  socialLikeEpochIsCurrent,
  socialOptimisticNotice,
  socialOptimisticPersistNotice,
  socialOptimisticPostCard,
  socialOptimisticPostMatches,
  socialOptimisticPostsFor,
  persistSocialPostCaption,
  persistSocialPostDelete,
  saveSocialPostCaption,
} from "@/lib/social-optimistic";
import {
  readSocialPostCaption,
  readSocialPostCaptionSaving,
  resetSocialPostOwnForTests,
  socialPostLiveBody,
} from "@/lib/social-post-own";

describe("Social optimistic mutation SoT", () => {
  afterEach(() => {
    resetSocialOptimisticForTests();
    vi.unstubAllGlobals();
  });

  it("flips like count immediately and never goes below zero", () => {
    expect(nextSocialLikeState({ liked: false, likeCount: 3 })).toEqual({ liked: true, likeCount: 4 });
    expect(nextSocialLikeState({ liked: true, likeCount: 1 })).toEqual({ liked: false, likeCount: 0 });
    expect(nextSocialLikeState({ liked: true, likeCount: 0 })).toEqual({ liked: false, likeCount: 0 });
    applyOptimisticLike("p1", { liked: true, likeCount: 4 });
    expect(mergeSocialLike("p1", { liked: false, likeCount: 3 })).toEqual({ liked: true, likeCount: 4 });
    expect(readOptimisticLike("missing")).toBeNull();
    clearOptimisticLike("p1");
    expect(mergeSocialLike("p1", { liked: false, likeCount: 3 })).toEqual({ liked: false, likeCount: 3 });
  });

  it("applies first, persists second, and rolls back a failed persist", async () => {
    const calls: string[] = [];
    runSocialOptimisticMutation({
      apply: () => {
        calls.push("apply");
        return "token";
      },
      persist: async () => {
        calls.push("persist");
        return { error: ACCOUNT_PROFILE.saveFailed };
      },
      rollback: (token) => {
        calls.push(`rollback:${token}`);
      },
      onError: (error) => {
        calls.push(`error:${error}`);
      },
    });
    expect(calls[0]).toBe("apply");
    await vi.waitFor(() => {
      expect(calls).toEqual([
        "apply",
        "persist",
        `rollback:token`,
        `error:${ACCOUNT_PROFILE.saveFailed}`,
      ]);
    });

    const ok: string[] = [];
    runSocialOptimisticMutation({
      apply: () => {
        ok.push("apply");
        return 1;
      },
      persist: async () => {
        ok.push("persist");
        return {};
      },
      rollback: () => {
        ok.push("rollback");
      },
      onSuccess: () => {
        ok.push("success");
      },
    });
    await vi.waitFor(() => {
      expect(ok).toEqual(["apply", "persist", "success"]);
    });
  });

  it("ignores a stale like rollback after a newer tap", async () => {
    const first = beginSocialLikeEpoch("p1");
    const second = beginSocialLikeEpoch("p1");
    expect(socialLikeEpochIsCurrent("p1", first)).toBe(false);
    expect(socialLikeEpochIsCurrent("p1", second)).toBe(true);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const liked = { liked: true, likeCount: 1 };
    const unliked = { liked: false, likeCount: 0 };
    rememberSocialLikeBaseline("p1", liked);
    expect(await persistSocialLikeLatest("p1", first, unliked)).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await persistSocialLikeLatest("p1", second, liked)).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
    const unlikeEpoch = beginSocialLikeEpoch("p1");
    expect(await persistSocialLikeLatest("p1", unlikeEpoch, unliked)).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0] as unknown as [string, { body: FormData }];
    expect(request[1].body.get("liked")).toBe("1");
    expect(beginSocialPostPublishBusy()).toBe(true);
    expect(socialPostPublishBusy()).toBe(true);
    expect(beginSocialPostPublishBusy()).toBe(false);
    endSocialPostPublishBusy();
    expect(socialPostPublishBusy()).toBe(false);
  });

  it("ignores a stale follow persist after a newer tap", async () => {
    const key = socialFollowPersistKey("u1", "u2");
    const first = beginSocialFollowEpoch(key);
    const second = beginSocialFollowEpoch(key);
    expect(socialFollowEpochIsCurrent(key, first)).toBe(false);
    expect(socialFollowEpochIsCurrent(key, second)).toBe(true);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    rememberSocialFollowBaseline(key, false);
    expect(
      await persistSocialFollowLatest(key, first, true, { followeeId: "u2", handle: "ada" }),
    ).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      await persistSocialFollowLatest(key, second, true, { followeeId: "u2", handle: "ada" }),
    ).toEqual({});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const request = fetchMock.mock.calls[0] as unknown as [string, { body: FormData }];
    expect(request[1].body.get("following")).toBe("0");
    expect(request[1].body.get("followee_id")).toBe("u2");
  });

  it("starts a publish hop without waiting on the server and rejects an empty post", () => {
    expect(beginSocialPostPublish({ body: "   ", mediaItems: [], authorName: "Ada" })).toEqual({
      ok: false,
      error: SOCIAL.home.emptyPost,
    });
    expect(
      beginSocialPostPublish({
        body: "",
        mediaItems: [{ kind: "image", key: "posts/u1/a.jpg", contentType: "image/jpeg" }],
        authorName: "Ada",
      }).ok,
    ).toBe(true);
    const started = beginSocialPostPublish({
      body: "hello",
      mediaItems: [{ kind: "image", key: "posts/u1/a.jpg", contentType: "image/jpeg" }],
      mediaPreview: [{ kind: "image", url: "blob:photo" }],
      authorName: "Ada Lovelace",
      authorHandle: "ada",
    });
    expect(started.ok).toBe(true);
    if (!started.ok) return;
    expect(started.form.get("body")).toBe("hello");
    expect(started.form.get("media")).toContain("posts/u1/a.jpg");
    const muxed = beginSocialPostPublish({
      body: "",
      mediaItems: [
        {
          kind: "video",
          key: "posts/u1/a.mp4",
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          uploadId: "zd01Pe2bNpYhxbrwYABgFE",
          assetId: "SqQnqz6s5MBuXGvJaUWdXu",
        },
      ],
      mediaPreview: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT" }],
      authorName: "Ada Lovelace",
    });
    expect(muxed.ok).toBe(true);
    if (muxed.ok) {
      expect(muxed.form.get("media")).toContain("uNbxnGLKJ00yfbijDO8COxT");
      expect(muxed.form.get("media")).toContain('"provider":"mux"');
      expect(muxed.post.media).toEqual([{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT" }]);
      expect(muxed.form.get("media")).not.toContain("playbackPolicy");
    }
    const signed = beginSocialPostPublish({
      body: "",
      mediaItems: [
        {
          kind: "video",
          key: "posts/u1/a.mp4",
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          uploadId: "zd01Pe2bNpYhxbrwYABgFE",
          assetId: "SqQnqz6s5MBuXGvJaUWdXu",
          playbackPolicy: "signed",
        },
      ],
      mediaPreview: [{ kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT", playbackPolicy: "signed" }],
      authorName: "Ada Lovelace",
    });
    expect(signed.ok).toBe(true);
    if (signed.ok) {
      expect(signed.form.get("media")).toContain('"playbackPolicy":"signed"');
      expect(signed.post.media).toEqual([
        { kind: "video", url: "", playbackId: "uNbxnGLKJ00yfbijDO8COxT", playbackPolicy: "signed" },
      ]);
    }
    const portrait = beginSocialPostPublish({
      body: "vertical",
      mediaItems: [
        {
          kind: "video",
          key: "posts/u1/a.mp4",
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "signed",
          width: 1080,
          height: 1920,
        },
      ],
      mediaPreview: [
        {
          kind: "video",
          url: "blob:clip",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "signed",
          width: 1080,
          height: 1920,
        },
      ],
      authorName: "Ada Lovelace",
    });
    expect(portrait.ok).toBe(true);
    if (portrait.ok) {
      expect(portrait.form.get("media")).toContain('"width":1080');
      expect(portrait.form.get("media")).toContain('"height":1920');
      expect(portrait.form.get("media")).toContain('"playbackId":"uNbxnGLKJ00yfbijDO8COxT"');
      expect(portrait.post.media).toEqual([
        {
          kind: "video",
          url: "blob:clip",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "signed",
          width: 1080,
          height: 1920,
        },
      ]);
    }
    expect(started.post.body).toBe("hello");
    expect(started.post.authorHandle).toBe("ada");
    expect(started.post.media).toEqual([{ kind: "image", url: "blob:photo" }]);
    applyOptimisticSocialPost(started.post);
    const merged = mergeSocialOptimisticPosts(
      [{ id: "old", body: "earlier", authorHandle: "ada" }],
      readOptimisticSocialPosts(),
    );
    expect(merged[0]?.id).toBe(started.post.id);
    expect(socialOptimisticPostCard(started.post).canLike).toBe(false);
    expect(
      socialOptimisticPostMatches({ body: "hello", authorHandle: "ada" }, started.post),
    ).toBe(true);
    expect(
      socialOptimisticPostMatches({ body: "hello", authorHandle: "ada" }, { ...started.post, authorHandle: null }),
    ).toBe(true);
    expect(socialOptimisticPostsFor(null, readOptimisticSocialPosts(), "Acting")).toEqual([]);
    failOptimisticSocialPost(started.post.id, ACCOUNT_PROFILE.saveFailed);
    expect(socialOptimisticNotice(readOptimisticSocialPosts())).toBe(ACCOUNT_PROFILE.saveFailed);
    expect(
      mergeSocialOptimisticPosts([{ id: "old", body: "earlier", authorHandle: "ada" }], readOptimisticSocialPosts()),
    ).toHaveLength(1);
    expect(socialOptimisticNotice(readOptimisticSocialPosts())).toBe(ACCOUNT_PROFILE.saveFailed);
  });

  // Offline posting showed the browser's raw "Failed to fetch"; it shows
  // the house line now (social-comments-window-lock-v1).
  it("maps a dropped comment request to the house line, never the browser's own text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const form = new FormData();
    form.set("post_id", "p1");
    form.set("body", "hi");
    await expect(persistSocialComment(form)).resolves.toEqual({ error: SOCIAL.post.commentFailed });
    const remove = new FormData();
    remove.set("comment_id", "c1");
    await expect(persistSocialCommentDelete(remove)).resolves.toEqual({ error: SOCIAL.post.commentDeleteFailed });
  });

  it("persists like and post over fetch so the tree does not refresh", async () => {
    expect(SOCIAL_OPTIMISTIC_LOCK.likeHref).toBe("/api/social/like");
    expect(SOCIAL_OPTIMISTIC_LOCK.postHref).toBe("/api/social/post");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const like = new FormData();
    like.set("post_id", "p1");
    expect(await persistSocialLike(like)).toEqual({});
    expect(fetchMock).toHaveBeenCalledWith("/api/social/like", {
      method: "POST",
      body: like,
      cache: "no-store",
    });
    const post = new FormData();
    post.set("body", "hello");
    expect(await persistSocialPost(post)).toEqual({});
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: SOCIAL.home.emptyPost }), { status: 400 }),
    );
    expect(await persistSocialMutation("/api/social/post", post)).toEqual({
      error: SOCIAL.home.emptyPost,
    });
    expect(socialOptimisticPersistNotice(new Error("boom"))).toBe("boom");
    expect(socialOptimisticPersistNotice(null)).toBe(ACCOUNT_PROFILE.saveFailed);
  });

  it("keeps one helper for like + composer and leaves follow toast + chip drafts alone", () => {
    const forms = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
    const engagement = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const likeChunk = engagement.slice(engagement.indexOf("export function SocialLikeButton"));
    const createChunk = forms.slice(
      forms.indexOf("export function SocialCreateCompose"),
      forms.length,
    );
    const followChunk = engagement.slice(
      engagement.indexOf("export function SocialFollowButton"),
      engagement.indexOf("export function SocialLikeButton"),
    );
    const goLive = readFileSync("src/components/social/social-go-live.tsx", "utf8");
    const edit = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
    const roles = readFileSync("src/components/social/social-profile-roles.tsx", "utf8");
    const topics = readFileSync("src/components/social/social-profile-topics.tsx", "utf8");
    const sot = readFileSync("src/lib/social-optimistic.ts", "utf8");
    const profileEdit = readFileSync("src/lib/social-profile-edit.ts", "utf8");

    expect(sot).toContain("export function runSocialOptimisticMutation");
    expect(sot).toContain("export async function persistSocialMutation");
    expect(profileEdit).toContain("persistSocialMutation(");
    expect(forms).toContain("function publishOptimisticPost");
    expect(forms).toContain("runSocialOptimisticMutation");
    expect(forms).toContain("persistSocialPost");
    expect(likeChunk).toContain("runSocialOptimisticMutation");
    expect(likeChunk).toContain("persistSocialLikeLatest");
    expect(likeChunk).toContain("rememberSocialLikeBaseline");
    expect(sot).toContain("from.liked === desired.liked");
    expect(likeChunk).not.toContain("await toggleSocialLike");
    expect(forms).toContain("onRestore");
    expect(likeChunk).not.toContain("router.refresh()");
    expect(createChunk).toContain("publishOptimisticPost");
    expect(createChunk).toContain("router.push(SOCIAL_ROUTES.home)");
    expect(createChunk).not.toContain("await createSocialPost");
    expect(goLive).toContain("runSocialOptimisticMutation");
    expect(goLive).toContain("persistSocialPost");
    expect(goLive).toContain("router.push(SOCIAL_ROUTES.home)");
    const goLivePublish = goLive.slice(goLive.indexOf("async function postClip"));
    expect(goLivePublish.indexOf("router.push(SOCIAL_ROUTES.home)")).toBeLessThan(
      goLivePublish.indexOf("persistSocialPost"),
    );
    expect(goLive).not.toContain("await createSocialPost");
    expect(goLive).toContain("clipUrlRef.current = null");
    const feed = readFileSync("src/components/social/social-optimistic-feed.tsx", "utf8");
    expect(feed).toContain("data-social-optimistic-error");
    expect(feed).toContain("SOCIAL_FEED_GUTTER_CLASS");
    expect(feed).not.toContain("className=\"flex flex-col gap-2\"");
    expect(feed.indexOf("notice")).toBeLessThan(feed.indexOf("if (merged.length === 0)"));
    expect(followChunk).toContain("persistSocialFollowLatest");
    expect(followChunk).toContain("beginSocialFollowEpoch");
    expect(followChunk).toContain("runSocialOptimisticMutation");
    expect(followChunk).not.toContain("toggleSocialFollow");
    expect(followChunk).toContain("followedConfirmCopy");
    expect(followChunk).not.toContain("router.refresh()");
    expect(roles).toContain("onChange(");
    expect(topics).toContain("onChange(");
    expect(roles).not.toContain("persistSocial");
    expect(topics).not.toContain("persistSocial");
    expect(edit).toContain("checkSocialProfileEditSave");
    expect(edit).toContain("persistSocialProfileEdit");
  });
});

// Edit caption saves in the background (docs/design-locks/social-post-caption-window-lock-v1.md):
// the like/follow "Latest" pattern per post, and a dropped connection never
// throws or shows the browser's own line.
describe("Edit caption: persist and the Latest save runner", () => {
  beforeEach(() => {
    resetSocialOptimisticForTests();
    resetSocialPostOwnForTests();
  });
  afterEach(() => {
    resetSocialOptimisticForTests();
    resetSocialPostOwnForTests();
    vi.unstubAllGlobals();
  });

  function answer(error?: string): Response {
    return new Response(JSON.stringify(error ? { error } : {}), { status: error ? 400 : 200 });
  }

  /** fetch that waits for the test to answer each call, in order. */
  function heldFetch() {
    const answers: Array<(res: Response) => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => answers.push(resolve)));
    vi.stubGlobal("fetch", fetchMock);
    return { fetchMock, answers };
  }

  function bodyOf(fetchMock: ReturnType<typeof vi.fn>, call: number): FormData {
    return (fetchMock.mock.calls[call] as unknown as [string, { body: FormData }])[1].body;
  }

  it("maps a dropped connection to the action's own line, never a throw or 'Failed to fetch'", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const form = new FormData();
    form.set("post_id", "p1");
    await expect(persistSocialPostCaption(form)).resolves.toEqual({ error: SOCIAL.post.editFailed });
    await expect(persistSocialPostDelete(form)).resolves.toEqual({ error: SOCIAL.post.deleteFailed });
  });

  it("shows the new words before any await, sends post_id, body and group_slug, and settles", async () => {
    const fetchMock = vi.fn(async () => answer());
    vi.stubGlobal("fetch", fetchMock);
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    const settled = saveSocialPostCaption({ postId: "p1", body: "revised", groupSlug: "film-club", onSaved, onFailed });
    expect(readSocialPostCaption("p1")).toBe("revised");
    expect(socialPostLiveBody("p1", "hello")).toBe("revised");
    expect(readSocialPostCaptionSaving("p1")).toBe(true);
    await settled;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [href, init] = fetchMock.mock.calls[0] as unknown as [string, { method: string; body: FormData }];
    expect(href).toBe(SOCIAL_OPTIMISTIC_LOCK.postOwnHref);
    expect(init.method).toBe("PATCH");
    expect(init.body.get("post_id")).toBe("p1");
    expect(init.body.get("body")).toBe("revised");
    expect(init.body.get("group_slug")).toBe("film-club");
    expect(readSocialPostCaption("p1")).toBe("revised");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
    expect(readSocialPostCaptionSaving("p1")).toBe(false);
  });

  it("a refused save brings the server caption back and reports the server's line", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => answer(SOCIAL.post.notAuthor)));
    const onFailed = vi.fn();
    await saveSocialPostCaption({ postId: "p1", body: "revised", groupSlug: null, onFailed });
    expect(readSocialPostCaption("p1")).toBeUndefined();
    expect(socialPostLiveBody("p1", "hello")).toBe("hello");
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(SOCIAL.post.notAuthor);
    expect(readSocialPostCaptionSaving("p1")).toBe(false);
  });

  it("sends one post's saves one after another; A fails, B saves: B shows and nothing reopens", async () => {
    const { fetchMock, answers } = heldFetch();
    const onFailed = vi.fn();
    const a = saveSocialPostCaption({ postId: "p1", body: "A", groupSlug: null, onFailed });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const b = saveSocialPostCaption({ postId: "p1", body: "B", groupSlug: null, onFailed });
    expect(readSocialPostCaption("p1")).toBe("B");
    await Promise.resolve();
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    answers[0]!(answer(SOCIAL.post.editFailed));
    await a;
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(bodyOf(fetchMock, 1).get("body")).toBe("B");
    answers[1]!(answer());
    await b;
    expect(readSocialPostCaption("p1")).toBe("B");
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("both fail: the server caption shows and only the latest edit reports", async () => {
    const { fetchMock, answers } = heldFetch();
    const onFailed = vi.fn();
    const a = saveSocialPostCaption({ postId: "p1", body: "A", groupSlug: null, onFailed });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const b = saveSocialPostCaption({ postId: "p1", body: "B", groupSlug: null, onFailed });
    answers[0]!(answer(SOCIAL.post.editFailed));
    await a;
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    answers[1]!(answer(SOCIAL.post.notAuthor));
    await b;
    expect(readSocialPostCaption("p1")).toBeUndefined();
    expect(socialPostLiveBody("p1", "hello")).toBe("hello");
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(SOCIAL.post.notAuthor);
  });

  it("A saves, B fails: the caption the server holds (A) comes back", async () => {
    const { fetchMock, answers } = heldFetch();
    const onFailed = vi.fn();
    const a = saveSocialPostCaption({ postId: "p1", body: "A", groupSlug: null, onFailed });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const b = saveSocialPostCaption({ postId: "p1", body: "B", groupSlug: null, onFailed });
    answers[0]!(answer());
    await a;
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    answers[1]!(answer(SOCIAL.post.editFailed));
    await b;
    expect(readSocialPostCaption("p1")).toBe("A");
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed).toHaveBeenCalledWith(SOCIAL.post.editFailed);
    expect(readSocialPostCaptionSaving("p1")).toBe(false);
  });
});
