import type { SocialPostCardModel, SocialPostMediaItem } from "@/lib/social-author-post-card";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";
import { socialFeedVideoFrame, type SocialFeedVideoFrame } from "@/lib/social-media-display";

// The comments window (desktop, phase 1): the post it shows, its one still,
// when typed text would be lost, and how a link out leaves.
// docs/design-locks/social-comments-window-lock-v1.md

/** The post at the top of the window: display data the opener already
 *  holds (the card model or the Explore item). Plain data, so a server
 *  loader can build it later; nulls cover what a source does not know. */
export type SocialCommentsPost = {
  id: string;
  authorName: string;
  authorHandle: string | null;
  authorPhotoUrl: string | null;
  body: string | null;
  createdAt: string | null;
  groupSlug: string | null;
  groupName: string | null;
  media: readonly SocialPostMediaItem[];
  /** The item the window shows a still of. */
  mediaIndex: number;
};

/** From a card (its media already the usable media). The feed card opens on
 *  item 1; the viewer opens on its own item. An index out of range is 0. */
export function socialCommentsPostFromCard(
  post: Pick<
    SocialPostCardModel,
    "id" | "authorName" | "authorHandle" | "authorPhotoUrl" | "body" | "createdAt" | "groupSlug" | "groupName" | "media"
  >,
  mediaIndex = 0,
): SocialCommentsPost {
  const inRange = Number.isInteger(mediaIndex) && mediaIndex >= 0 && mediaIndex < post.media.length;
  return {
    id: post.id,
    authorName: post.authorName,
    authorHandle: post.authorHandle,
    authorPhotoUrl: post.authorPhotoUrl,
    body: post.body,
    createdAt: post.createdAt,
    groupSlug: post.groupSlug,
    groupName: post.groupName,
    media: post.media,
    mediaIndex: inRange ? mediaIndex : 0,
  };
}

/** From an Explore item: one video; no time or group (the item has none).
 *  Signed tokens come from the session cache Explore already fills. */
export function socialCommentsPostFromExplore(item: SocialExploreForYouItem): SocialCommentsPost {
  return {
    id: item.postId,
    authorName: item.authorName,
    authorHandle: item.authorHandle,
    authorPhotoUrl: item.authorPhotoUrl || null,
    body: item.body || null,
    createdAt: null,
    groupSlug: null,
    groupName: null,
    media: [{ kind: "video", url: "", playbackId: item.playbackId, playbackPolicy: item.playbackPolicy }],
    mediaIndex: 0,
  };
}

/** Typed text that leaving would lose (whitespace alone is not). */
export function socialCommentDraftDirty(body: string): boolean {
  return body.trim().length > 0;
}

/** A video whose shape is not known yet draws 4:5 (the feed's tallest), so
 *  the still always has a bounded box until it loads. */
export const SOCIAL_COMMENTS_VIDEO_PENDING_FRAME: SocialFeedVideoFrame = socialFeedVideoFrame({ width: 4, height: 5 })!;

/** The video still's box: the stored shape, else the probed still's, else
 *  4:5. Held to 4:5 … 2.39:1 (at most 690 tall at 552 wide). */
export function socialCommentsVideoFrame(
  item: { width?: number | null; height?: number | null },
  probed: SocialFeedVideoFrame | null,
): SocialFeedVideoFrame {
  return socialFeedVideoFrame(item) ?? probed ?? SOCIAL_COMMENTS_VIDEO_PENDING_FRAME;
}

/** The still's width: the 600 window less its 24 pad each side. */
export const SOCIAL_COMMENTS_WINDOW_IMAGE_SIZES = "552px";

/** A link inside the window: a modified click opens a tab and leaves the
 *  window as it is; typed text asks first; otherwise the window closes. */
export function socialCommentsLeaveClick(input: { modified: boolean; dirty: boolean }): "pass" | "ask" | "close" {
  if (input.modified) return "pass";
  if (input.dirty) return "ask";
  return "close";
}

/** Focus back on the control that opened the thread, without scrolling.
 *  A node without focus (a test DOM) is left alone. */
export function socialCommentReturnFocus(el: { focus?: unknown } | null | undefined): void {
  if (typeof el?.focus !== "function") return;
  (el as { focus: (options?: FocusOptions) => void }).focus({ preventScroll: true });
}
