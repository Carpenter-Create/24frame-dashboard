import { houseWindowClosedHref, houseWindowOpenHref, parseHouseWindowParam } from "@/lib/house-window";
import { POST_BODY_MAX, SOCIAL } from "@/lib/social";

// Own-post caption edit and soft-delete. Stories stay out. Media
// replace stays out — the write row never carries media or a new author.

/** The raw caption the server reads at most (twice the trimmed cap):
 *  bounds the payload; postCaptionWrite still holds the words to POST_BODY_MAX. */
export const SOCIAL_POST_CAPTION_RAW_MAX = POST_BODY_MAX * 2;

export function postHasMedia(media: unknown): boolean {
  return Array.isArray(media) && media.length > 0;
}

export function postCaptionWrite(
  raw: string,
  hasMedia: boolean,
): { body: string | null } | { error: string } {
  const body = raw.trim();
  if (body.length > POST_BODY_MAX) return { error: SOCIAL.post.editTooLong };
  if (body.length === 0) {
    if (!hasMedia) return { error: SOCIAL.home.emptyPost };
    return { body: null };
  }
  return { body };
}

/** Session user must be the author. UI hiding is not the gate. */
export function postAuthorRefusal(actorId: string, authorId: string): string | null {
  if (actorId !== authorId) return SOCIAL.post.notAuthor;
  return null;
}

export function socialPostOwnedBy(authorId: string, viewerId: string | null | undefined): boolean {
  return Boolean(viewerId) && authorId === viewerId;
}

/** Body only. protect_post_author_mutation is the edited_at writer. */
export function postCaptionUpdateRow(body: string | null) {
  return { body };
}

export function postSoftDeleteUpdateRow() {
  return { status: "removed" as const };
}

type PostOwnListener = () => void;

const postOwnListeners = new Set<PostOwnListener>();
const hiddenPostIds = new Set<string>();
const captionOverrides = new Map<string, string | null>();
// Caption saves still with the server, per post (a save in flight holds
// that post's caption window, whichever card opened it).
const captionSaving = new Map<string, number>();
// Bumped on every change, so a list can re-read its rows in one subscription.
let postOwnVersion = 0;

function emitPostOwn() {
  postOwnVersion += 1;
  for (const listener of postOwnListeners) listener();
}

/** Changes once per emit: a list reader's one snapshot. */
export function readSocialPostOwnVersion(): number {
  return postOwnVersion;
}

export function subscribeSocialPostOwn(listener: PostOwnListener): () => void {
  postOwnListeners.add(listener);
  return () => {
    postOwnListeners.delete(listener);
  };
}

export function hideSocialPost(postId: string): void {
  hiddenPostIds.add(postId);
  emitPostOwn();
}

export function readSocialPostHidden(postId: string): boolean {
  return hiddenPostIds.has(postId);
}

export function rememberSocialPostCaption(postId: string, body: string | null): void {
  captionOverrides.set(postId, body);
  emitPostOwn();
}

/** Undefined means the server caption still stands. */
export function readSocialPostCaption(postId: string): string | null | undefined {
  return captionOverrides.has(postId) ? captionOverrides.get(postId) : undefined;
}

export function socialPostLiveBody(postId: string, serverBody: string | null): string | null {
  const overlay = readSocialPostCaption(postId);
  return overlay === undefined ? serverBody : overlay;
}

/** Put a caption back after a failed save: undefined drops the override
 *  (the server caption shows); a string or null is the caption to show. */
export function restoreSocialPostCaption(postId: string, value: string | null | undefined): void {
  if (value === undefined) captionOverrides.delete(postId);
  else captionOverrides.set(postId, value);
  emitPostOwn();
}

export function beginSocialPostCaptionSaving(postId: string): void {
  captionSaving.set(postId, (captionSaving.get(postId) ?? 0) + 1);
  emitPostOwn();
}

export function endSocialPostCaptionSaving(postId: string): void {
  const left = (captionSaving.get(postId) ?? 0) - 1;
  if (left > 0) captionSaving.set(postId, left);
  else captionSaving.delete(postId);
  emitPostOwn();
}

/** A caption save for this post is still with the server. */
export function readSocialPostCaptionSaving(postId: string): boolean {
  return (captionSaving.get(postId) ?? 0) > 0;
}

export function resetSocialPostOwnForTests(): void {
  hiddenPostIds.clear();
  captionOverrides.clear();
  captionSaving.clear();
  postOwnVersion = 0;
}

// ---- Edit caption: the window over the post ---------------------------------
// docs/design-locks/social-post-caption-window-lock-v1.md. The house window
// shell with one face, opened by the one caption host on the Social layout.
// Its history entry is the bare `?caption`: the post is never in the
// address, and an address that arrives with it opens nothing.

export const SOCIAL_POST_CAPTION_WINDOW_PARAM = "caption";

/** The caption window's own history flag (a shell entry is never one). */
export const SOCIAL_POST_CAPTION_ENTRY_FLAG = "socialPostCaptionWindow";

export type SocialPostCaptionFace = "caption";

/** "caption" while the address carries `?caption`, else null. */
export function parseSocialPostCaptionWindow(search: string): SocialPostCaptionFace | null {
  return parseHouseWindowParam(search, SOCIAL_POST_CAPTION_WINDOW_PARAM, () => "caption");
}

/** The address with the caption window open (every other param kept). */
export function socialPostCaptionWindowOpenHref(
  pathname: string,
  search: string,
  face: SocialPostCaptionFace = "caption",
): string {
  return houseWindowOpenHref(pathname, search, SOCIAL_POST_CAPTION_WINDOW_PARAM, face, "caption");
}

/** The address with the caption window's query removed (every other param kept). */
export function socialPostCaptionWindowClosedHref(pathname: string, search: string): string {
  return houseWindowClosedHref(pathname, search, SOCIAL_POST_CAPTION_WINDOW_PARAM);
}

/** Leaving would lose words (trailing space alone is no change). */
export function socialPostCaptionDirty(draft: string, baseline: string | null): boolean {
  return draft.trim() !== (baseline ?? "").trim();
}

export type SocialPostCaptionDone =
  | { kind: "invalid"; error: string }
  | { kind: "unchanged" }
  | { kind: "save"; body: string | null };

/** Done checks first (nothing is sent on a problem); the same words close
 *  without a write, as the server no-ops them. */
export function socialPostCaptionDone(
  draft: string,
  baseline: string | null,
  hasMedia: boolean,
): SocialPostCaptionDone {
  const written = postCaptionWrite(draft, hasMedia);
  if ("error" in written) return { kind: "invalid", error: written.error };
  // The stored words read as the write would store them (an empty or
  // blank caption is none), the same reading as socialPostCaptionDirty.
  const before = (baseline ?? "").trim() || null;
  if (before === written.body) return { kind: "unchanged" };
  return { kind: "save", body: written.body };
}
