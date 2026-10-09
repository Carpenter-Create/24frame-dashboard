// One SoT for Social optimistic mutations.
// Apply local UI first, persist over fetch (not a server action),
// roll back + surface the error on failure. Surfaces must not fork
// apply/await/refresh loops or a second persist helper.

import { ACCOUNT_PROFILE } from "@/lib/account-profile";
import { socialMediaFrameFields } from "@/lib/social-media";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import {
  runOptimisticMutation,
  type OptimisticRun,
} from "@/lib/optimistic-mutation";
import { SOCIAL_CATEGORY_ALL } from "@/lib/social-categories";
import { normalizePostBody, SOCIAL } from "@/lib/social";
import {
  beginSocialPostCaptionSaving,
  endSocialPostCaptionSaving,
  readSocialPostCaption,
  rememberSocialPostCaption,
  restoreSocialPostCaption,
} from "@/lib/social-post-own";

export const SOCIAL_OPTIMISTIC_LOCK = {
  likeHref: "/api/social/like",
  postHref: "/api/social/post",
  commentHref: "/api/social/comment",
  postOwnHref: "/api/social/post-own",
  followHref: "/api/social/follow",
} as const;

export type SocialOptimisticLike = {
  liked: boolean;
  likeCount: number;
};

export type SocialOptimisticPostMedia = {
  kind: "image" | "video";
  url: string;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  width?: number;
  height?: number;
};

export type SocialOptimisticPost = {
  id: string;
  body: string | null;
  createdAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
  groupName: string | null;
  category?: string | null;
  media: readonly SocialOptimisticPostMedia[];
  error?: string;
};

export type SocialOptimisticRun<T> = OptimisticRun<T>;

export type SocialPostPublishDraft = {
  body: string;
  mediaItems: readonly {
    kind: string;
    key: string;
    contentType: string;
    provider?: string;
    playbackId?: string;
    uploadId?: string;
    assetId?: string;
    playbackPolicy?: SocialMuxPlaybackPolicy;
    width?: number;
    height?: number;
  }[];
  mediaPreview?: readonly SocialOptimisticPostMedia[];
  authorId?: string;
  authorHandle?: string | null;
  authorName: string;
  authorPhotoUrl?: string | null;
  groupId?: string;
  groupSlug?: string | null;
  groupName?: string | null;
  category?: string;
};

export type SocialPostPublishStart =
  | { ok: true; form: FormData; post: SocialOptimisticPost }
  | { ok: false; error: string };

const likes = new Map<string, SocialOptimisticLike>();
const likeEpoch = new Map<string, number>();
const likeListeners = new Set<() => void>();
const commentCounts = new Map<string, number>();
const commentCountListeners = new Set<() => void>();

let posts: SocialOptimisticPost[] = [];
const postListeners = new Set<() => void>();
const likePersistTail = new Map<string, Promise<unknown>>();
const likePersisted = new Map<string, SocialOptimisticLike>();
let postPublishBusy = false;

function emitLikes() {
  for (const listener of likeListeners) listener();
}

function emitPosts() {
  for (const listener of postListeners) listener();
}

function emitCommentCounts() {
  for (const listener of commentCountListeners) listener();
}

export function nextSocialLikeState(current: SocialOptimisticLike): SocialOptimisticLike {
  const liked = !current.liked;
  return { liked, likeCount: Math.max(0, current.likeCount + (liked ? 1 : -1)) };
}

export function socialOptimisticPersistNotice(
  cause: unknown,
  fallback = ACCOUNT_PROFILE.saveFailed,
): string {
  if (typeof cause === "string" && cause.trim()) return cause;
  if (cause instanceof Error && cause.message.trim()) return cause.message;
  return fallback;
}

export async function persistSocialMutation(
  href: string,
  body: FormData,
  fallback = ACCOUNT_PROFILE.saveFailed,
): Promise<{ error?: string }> {
  const res = await fetch(href, {
    method: "POST",
    body,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  const error = typeof json?.error === "string" ? json.error.trim() : "";
  if (!res.ok || error) return { error: error || fallback };
  return {};
}

export function persistSocialLike(form: FormData): Promise<{ error?: string }> {
  return persistSocialMutation(SOCIAL_OPTIMISTIC_LOCK.likeHref, form);
}

export function rememberSocialLikeBaseline(postId: string, baseline: SocialOptimisticLike): void {
  if (!likePersisted.has(postId)) likePersisted.set(postId, { ...baseline });
}

export function persistSocialLikeLatest(
  postId: string,
  epoch: number,
  desired: SocialOptimisticLike,
  extras: { groupSlug?: string } = {},
): Promise<{ error?: string }> {
  const prev = likePersistTail.get(postId) ?? Promise.resolve();
  const next = prev.then(async () => {
    if (!socialLikeEpochIsCurrent(postId, epoch)) return {};
    const from = likePersisted.get(postId);
    if (!from || from.liked === desired.liked) return {};
    const form = new FormData();
    form.set("post_id", postId);
    form.set("liked", from.liked ? "1" : "0");
    if (extras.groupSlug) form.set("group_slug", extras.groupSlug);
    const result = await persistSocialLike(form);
    if (!result.error) likePersisted.set(postId, { ...desired });
    return result;
  });
  likePersistTail.set(postId, next.catch(() => undefined));
  return next;
}

export function persistSocialPost(form: FormData): Promise<{ error?: string }> {
  return persistSocialMutation(SOCIAL_OPTIMISTIC_LOCK.postHref, form);
}

export function persistSocialFollow(form: FormData): Promise<{ error?: string }> {
  return persistSocialMutation(SOCIAL_OPTIMISTIC_LOCK.followHref, form);
}

const followEpoch = new Map<string, number>();
const followPersistTail = new Map<string, Promise<unknown>>();
const followPersisted = new Map<string, boolean>();

export function socialFollowPersistKey(viewerId: string, targetId: string): string {
  return `${viewerId}:${targetId}`;
}

export function rememberSocialFollowBaseline(key: string, following: boolean): void {
  if (!followPersisted.has(key)) followPersisted.set(key, following);
}

export function beginSocialFollowEpoch(key: string): number {
  const next = (followEpoch.get(key) ?? 0) + 1;
  followEpoch.set(key, next);
  return next;
}

export function socialFollowEpochIsCurrent(key: string, epoch: number): boolean {
  return followEpoch.get(key) === epoch;
}

export function persistSocialFollowLatest(
  key: string,
  epoch: number,
  desired: boolean,
  extras: { followeeId: string; handle: string },
): Promise<{ error?: string }> {
  const prev = followPersistTail.get(key) ?? Promise.resolve();
  const next = prev.then(async () => {
    if (!socialFollowEpochIsCurrent(key, epoch)) return {};
    const from = followPersisted.get(key);
    if (from === desired) return {};
    const form = new FormData();
    form.set("followee_id", extras.followeeId);
    form.set("handle", extras.handle);
    form.set("following", from ? "1" : "0");
    const result = await persistSocialFollow(form);
    if (!result.error) followPersisted.set(key, desired);
    return result;
  });
  followPersistTail.set(key, next.catch(() => undefined));
  return next;
}

export async function persistSocialComment(
  form: FormData,
): Promise<{ error?: string; id?: string; created_at?: string }> {
  const res = await fetch(SOCIAL_OPTIMISTIC_LOCK.commentHref, {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    error?: string;
    id?: string;
    created_at?: string;
  } | null;
  const error = typeof json?.error === "string" ? json.error.trim() : "";
  if (!res.ok || error) return { error: error || SOCIAL.post.commentFailed };
  return {
    id: typeof json?.id === "string" ? json.id : undefined,
    created_at: typeof json?.created_at === "string" ? json.created_at : undefined,
  };
}

export function persistSocialPostCaption(form: FormData): Promise<{ error?: string }> {
  return persistSocialOwn(SOCIAL_OPTIMISTIC_LOCK.postOwnHref, "PATCH", form, SOCIAL.post.editFailed);
}

export function persistSocialPostDelete(form: FormData): Promise<{ error?: string }> {
  return persistSocialOwn(SOCIAL_OPTIMISTIC_LOCK.postOwnHref, "DELETE", form, SOCIAL.post.deleteFailed);
}

async function persistSocialOwn(
  href: string,
  method: "PATCH" | "DELETE",
  body: FormData,
  fallback: string,
): Promise<{ error?: string }> {
  let res: Response;
  try {
    res = await fetch(href, { method, body, cache: "no-store" });
  } catch {
    // A dropped connection reads as the action's own line, never the
    // browser's ("Failed to fetch"), and never leaves a caller waiting.
    return { error: fallback };
  }
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  const error = typeof json?.error === "string" ? json.error.trim() : "";
  if (!res.ok || error) return { error: error || fallback };
  return {};
}

// Caption "Latest" (as like and follow): a per-post epoch, saves sent one
// after another, and the caption this device knows the server holds.
// docs/design-locks/social-post-caption-window-lock-v1.md
const captionEpoch = new Map<string, number>();
const captionPersistTail = new Map<string, Promise<unknown>>();
// undefined: the server's own caption (no saved override yet).
const captionPersisted = new Map<string, string | null | undefined>();

export function beginSocialPostCaptionEpoch(postId: string): number {
  const next = (captionEpoch.get(postId) ?? 0) + 1;
  captionEpoch.set(postId, next);
  return next;
}

export function socialPostCaptionEpochIsCurrent(postId: string, epoch: number): boolean {
  return captionEpoch.get(postId) === epoch;
}

/** Taken once per post, before its first edit paints. */
export function rememberSocialPostCaptionBaseline(postId: string): void {
  if (!captionPersisted.has(postId)) captionPersisted.set(postId, readSocialPostCaption(postId));
}

export function persistSocialPostCaptionLatest(
  postId: string,
  epoch: number,
  body: string | null,
  groupSlug: string | null,
): Promise<{ error?: string }> {
  const prev = captionPersistTail.get(postId) ?? Promise.resolve();
  const next = prev.then(async () => {
    if (!socialPostCaptionEpochIsCurrent(postId, epoch)) return {};
    const from = captionPersisted.get(postId);
    if (from !== undefined && from === body) return {};
    const form = new FormData();
    form.set("post_id", postId);
    form.set("body", body ?? "");
    if (groupSlug) form.set("group_slug", groupSlug);
    const result = await persistSocialPostCaption(form);
    if (!result.error) captionPersisted.set(postId, body);
    return result;
  });
  captionPersistTail.set(postId, next.catch(() => undefined));
  return next;
}

/** Done on a changed caption: the words show at once on this device, the
 *  save runs in the background, and a failure brings back the last caption
 *  the server holds. Only the latest edit of a post reports a failure.
 *  Resolves once onSaved or onFailed has run. */
export function saveSocialPostCaption(input: {
  postId: string;
  body: string | null;
  groupSlug: string | null;
  onSaved?: () => void;
  onFailed?: (error: string) => void;
}): Promise<void> {
  const { postId, body, groupSlug } = input;
  rememberSocialPostCaptionBaseline(postId);
  const epoch = beginSocialPostCaptionEpoch(postId);
  beginSocialPostCaptionSaving(postId);
  return new Promise<void>((resolve) => {
    // Once: a callback that throws never reports a second time.
    let settled = false;
    const settle = (report: () => void) => {
      if (settled) return;
      settled = true;
      try {
        report();
      } finally {
        endSocialPostCaptionSaving(postId);
        resolve();
      }
    };
    runSocialOptimisticMutation({
      apply: () => rememberSocialPostCaption(postId, body),
      persist: () => persistSocialPostCaptionLatest(postId, epoch, body, groupSlug),
      rollback: () => {
        if (!socialPostCaptionEpochIsCurrent(postId, epoch)) return;
        restoreSocialPostCaption(postId, captionPersisted.get(postId));
      },
      onError: (error) => {
        settle(() => {
          if (socialPostCaptionEpochIsCurrent(postId, epoch)) input.onFailed?.(error);
        });
      },
      onSuccess: () => {
        settle(() => input.onSaved?.());
      },
    });
  });
}

export async function persistSocialCommentDelete(form: FormData): Promise<{ error?: string }> {
  const res = await fetch(SOCIAL_OPTIMISTIC_LOCK.commentHref, {
    method: "DELETE",
    body: form,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  const error = typeof json?.error === "string" ? json.error.trim() : "";
  if (!res.ok || error) return { error: error || SOCIAL.post.commentDeleteFailed };
  return {};
}

export function applyOptimisticCommentCount(postId: string, commentCount: number): void {
  commentCounts.set(postId, Math.max(0, commentCount));
  emitCommentCounts();
}

export function readOptimisticCommentCount(postId: string): number | null {
  return commentCounts.has(postId) ? (commentCounts.get(postId) ?? 0) : null;
}

export function subscribeOptimisticCommentCounts(listener: () => void): () => void {
  commentCountListeners.add(listener);
  return () => {
    commentCountListeners.delete(listener);
  };
}

export function socialPostPublishBusy(): boolean {
  return postPublishBusy;
}

export function beginSocialPostPublishBusy(): boolean {
  if (postPublishBusy) return false;
  postPublishBusy = true;
  return true;
}

export function endSocialPostPublishBusy(): void {
  postPublishBusy = false;
}

export function runSocialOptimisticMutation<T>(input: SocialOptimisticRun<T>): void {
  runOptimisticMutation({ ...input, fallback: ACCOUNT_PROFILE.saveFailed });
}

export function applyOptimisticLike(postId: string, next: SocialOptimisticLike): void {
  likes.set(postId, next);
  emitLikes();
}

export function readOptimisticLike(postId: string): SocialOptimisticLike | null {
  return likes.get(postId) ?? null;
}

export function mergeSocialLike(postId: string, server: SocialOptimisticLike): SocialOptimisticLike {
  return likes.get(postId) ?? server;
}

export function subscribeOptimisticLikes(listener: () => void): () => void {
  likeListeners.add(listener);
  return () => {
    likeListeners.delete(listener);
  };
}

export function beginSocialLikeEpoch(postId: string): number {
  const next = (likeEpoch.get(postId) ?? 0) + 1;
  likeEpoch.set(postId, next);
  return next;
}

export function socialLikeEpochIsCurrent(postId: string, epoch: number): boolean {
  return likeEpoch.get(postId) === epoch;
}

export function clearOptimisticLike(postId: string): void {
  likeEpoch.delete(postId);
  likePersisted.delete(postId);
  if (!likes.delete(postId)) return;
  emitLikes();
}

export function applyOptimisticSocialPost(post: SocialOptimisticPost): void {
  posts = [post, ...posts.filter((row) => row.id !== post.id && !row.error)];
  emitPosts();
}

export function failOptimisticSocialPost(id: string, error: string): void {
  let changed = false;
  posts = posts.map((row) => {
    if (row.id !== id) return row;
    changed = true;
    return { ...row, error };
  });
  if (changed) emitPosts();
}

export function clearOptimisticSocialPost(id: string): void {
  const next = posts.filter((row) => row.id !== id);
  if (next.length === posts.length) return;
  posts = next;
  emitPosts();
}

export function readOptimisticSocialPosts(): readonly SocialOptimisticPost[] {
  return posts;
}

export function subscribeOptimisticSocialPosts(listener: () => void): () => void {
  postListeners.add(listener);
  return () => {
    postListeners.delete(listener);
  };
}

export function socialOptimisticPostsFor(
  groupSlug: string | null | undefined,
  pending: readonly SocialOptimisticPost[] = posts,
  topic?: string | null,
): SocialOptimisticPost[] {
  const slug = groupSlug ?? null;
  return pending.filter((row) => {
    if ((row.groupSlug ?? null) !== slug) return false;
    if (topic && topic !== SOCIAL_CATEGORY_ALL && (row.category ?? "") !== topic) return false;
    return true;
  });
}

export function socialOptimisticPostMatches(
  server: { body: string | null; authorHandle?: string | null },
  pending: SocialOptimisticPost,
): boolean {
  if ((server.body ?? "") !== (pending.body ?? "")) return false;
  if (pending.authorHandle && server.authorHandle && pending.authorHandle !== server.authorHandle) {
    return false;
  }
  return true;
}

export function socialOptimisticPostCard(post: SocialOptimisticPost): {
  id: string;
  body: string | null;
  likeCount: number;
  commentCount?: number;
  liked: boolean;
  createdAt: string;
  authorId: string;
  authorHandle: string | null;
  authorName: string;
  authorPhotoUrl: string | null;
  groupSlug: string | null;
  groupName: string | null;
  canLike: boolean;
  owned?: boolean;
  media: SocialOptimisticPostMedia[];
} {
  return {
    id: post.id,
    body: post.body,
    likeCount: 0,
    liked: false,
    createdAt: post.createdAt,
    authorId: post.authorId,
    authorHandle: post.authorHandle,
    authorName: post.authorName,
    authorPhotoUrl: post.authorPhotoUrl,
    groupSlug: post.groupSlug,
    groupName: post.groupName,
    canLike: false,
    owned: true,
    media: [...post.media],
  };
}

export function mergeSocialOptimisticPosts<
  T extends { id: string; body: string | null; authorHandle?: string | null },
>(server: readonly T[], pending: readonly SocialOptimisticPost[]): Array<T | ReturnType<typeof socialOptimisticPostCard>> {
  const live = pending.filter((row) => !row.error);
  const extras = live.filter((row) => !server.some((item) => socialOptimisticPostMatches(item, row)));
  return [...extras.map(socialOptimisticPostCard), ...server];
}

export function socialOptimisticNotice(pending: readonly SocialOptimisticPost[]): string {
  return pending.find((row) => row.error)?.error ?? "";
}

export function beginSocialPostPublish(draft: SocialPostPublishDraft): SocialPostPublishStart {
  const body = normalizePostBody(draft.body);
  if (!body && draft.mediaItems.length === 0) {
    return { ok: false, error: SOCIAL.home.emptyPost };
  }

  const form = new FormData();
  form.set("body", draft.body);
  form.set(
    "media",
    JSON.stringify(draft.mediaItems.map((item) => ({
      kind: item.kind,
      key: item.key,
      contentType: item.contentType,
      ...(item.provider === "mux" && item.playbackId
        ? {
            provider: "mux",
            playbackId: item.playbackId,
            ...(item.uploadId ? { uploadId: item.uploadId } : {}),
            ...(item.assetId ? { assetId: item.assetId } : {}),
            ...(item.playbackPolicy ? { playbackPolicy: item.playbackPolicy } : {}),
          }
        : {}),
      ...(socialMediaFrameFields(item) ?? {}),
    }))),
  );
  if (draft.groupId) form.set("group_id", draft.groupId);
  if (draft.groupSlug) form.set("group_slug", draft.groupSlug);
  if (draft.category) form.set("category", draft.category);

  const post: SocialOptimisticPost = {
    id: crypto.randomUUID(),
    body,
    createdAt: new Date().toISOString(),
    authorId: draft.authorId ?? "me",
    authorHandle: draft.authorHandle ?? null,
    authorName: draft.authorName,
    authorPhotoUrl: draft.authorPhotoUrl ?? null,
    groupSlug: draft.groupSlug ?? null,
    groupName: draft.groupName ?? null,
    category: draft.category || null,
    media: (draft.mediaPreview ?? [])
      .filter((item) => item.url || item.playbackId)
      .map((item) => ({
        kind: item.kind,
        url: item.url,
        ...(item.playbackId ? { playbackId: item.playbackId } : {}),
        ...(item.playbackPolicy ? { playbackPolicy: item.playbackPolicy } : {}),
        ...(socialMediaFrameFields(item) ?? {}),
      })),
  };
  return { ok: true, form, post };
}

export function getSocialOptimisticServerSnapshot(): null {
  return null;
}

export function resetSocialOptimisticForTests(): void {
  likes.clear();
  likeEpoch.clear();
  likePersistTail.clear();
  likePersisted.clear();
  followEpoch.clear();
  followPersistTail.clear();
  followPersisted.clear();
  captionEpoch.clear();
  captionPersistTail.clear();
  captionPersisted.clear();
  commentCounts.clear();
  posts = [];
  postPublishBusy = false;
  emitLikes();
  emitPosts();
  emitCommentCounts();
}
