import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

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
} from "@/lib/social-optimistic";

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
    const forms = readFileSync("src/components/social/social-forms.tsx", "utf8");
    const engagement = readFileSync("src/components/social/social-engagement.tsx", "utf8");
    const likeChunk = engagement.slice(engagement.indexOf("export function SocialLikeButton"));
    const createChunk = forms.slice(
      forms.indexOf("export function SocialCreateCompose"),
      forms.indexOf("export function SocialProfilePhotoForm"),
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
