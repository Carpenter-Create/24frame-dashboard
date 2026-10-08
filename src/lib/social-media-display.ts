import { SOCIAL_DESKTOP_MEASURE } from "@/lib/social-chrome";
import { ACCOUNT_PHOTO_HREF } from "@/lib/account-avatar";
import { SOCIAL_AVATAR_ROUTE, SOCIAL_MEDIA_ROUTE } from "@/lib/social-edge";
import {
  isSocialMuxId,
  socialMuxPlaybackRequiresTokens,
  socialMuxThumbnailUrl,
  type SocialMuxPlaybackPolicy,
} from "@/lib/social-mux";

// Display-only Social media helpers. Signing stays in s3-avatars /
// s3-social-media. No upload or recorder changes.
// Feed and cover images follow the shared center column. Below lg the
// column is the full canvas, so the optimizer uses 100vw.

export const SOCIAL_POST_IMAGE_SIZES =
  `(max-width: 1023px) 100vw, ${SOCIAL_DESKTOP_MEASURE.center}px`;
export const SOCIAL_PROFILE_COVER_IMAGE_SIZES = SOCIAL_POST_IMAGE_SIZES;
export const SOCIAL_PROFILE_TILE_IMAGE_SIZES = "(max-width: 768px) 33vw, 297px";
export const SOCIAL_STORY_CARD_IMAGE_SIZES = "(max-width: 768px) 108px, 112px";
export const SOCIAL_OVERVIEW_FACE_IMAGE_SIZES = "32px";

export function socialAvatarImageSizes(size: "sm" | "md" | "lg" | "profile" | "post"): string {
  if (size === "post") return "40px";
  if (size === "sm") return "36px";
  if (size === "lg") return "96px";
  // Profile header avatar: clamp caps 112 (phone) and 152 (desktop card).
  if (size === "profile") return "(max-width: 767px) 112px, 152px";
  return "48px";
}

/** Animated GIF must skip the optimiser — AVIF/WebP derivatives drop frames. */
export function isAnimatedRasterSrc(src: string): boolean {
  try {
    return new URL(src, "https://local.invalid").pathname.toLowerCase().endsWith(".gif");
  } catch {
    return /\.gif(?:$|[?#])/i.test(src);
  }
}

/**
 * Edge Social reads pass same-origin signer routes, not S3 URLs.
 * next/image's optimiser fetches without the session cookie, so those
 * srcs stay unoptimised — the browser follows the 302 with cookies.
 */
export function isSessionGatedSocialSrc(src: string): boolean {
  const path = src.split("#")[0]?.split("?")[0] ?? "";
  // The account face (the shell's identity, e.g. the composer window's
  // author) is the same-origin, session-gated route: the browser loads it
  // with the session; the image optimizer would fetch it without one.
  return (
    path === SOCIAL_MEDIA_ROUTE ||
    path.startsWith(`${SOCIAL_AVATAR_ROUTE}/`) ||
    path === ACCOUNT_PHOTO_HREF
  );
}

/** Local capture preview. Not published Social playback. */
export function isLocalMediaPreviewSrc(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("data:");
}

export type SocialMediaOrientation = "portrait" | "landscape";

export type SocialMediaFrameInput = {
  kind?: "image" | "video";
  orientation?: SocialMediaOrientation | null;
  width?: number | null;
  height?: number | null;
  aspect?: number | null;
};

function socialMediaAspectRatio(input: SocialMediaFrameInput): number | null {
  if (input.aspect != null && Number.isFinite(input.aspect) && input.aspect > 0) {
    return input.aspect;
  }
  const width = input.width;
  const height = input.height;
  if (
    width == null ||
    height == null ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }
  return width / height;
}

/**
 * Still buckets only. Portrait → 4:5. Landscape → 16:9. The feed photo
 * frame falls back to these until it knows the still's true shape.
 * In-feed video does not use this. A video frame is socialFeedVideoFrame.
 */
export function socialMediaOrientation(
  input: SocialMediaOrientation | SocialMediaFrameInput = {},
): SocialMediaOrientation {
  if (input === "portrait" || input === "landscape") return input;
  if (input.orientation === "portrait" || input.orientation === "landscape") {
    return input.orientation;
  }
  const ratio = socialMediaAspectRatio(input);
  if (ratio != null) return ratio < 1 ? "portrait" : "landscape";
  return input.kind === "image" ? "portrait" : "landscape";
}

/**
 * Feed photo frame (H register §5.1, Adam 2026-10-05): the photo fills
 * the column at its true shape, held between 1.91:1 (widest) and 4:5
 * (tallest); beyond either limit it crops to the limit (object-cover).
 * No height cap: supersedes the min(70vh, 560px) still cap of
 * docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md.
 * docs/design-locks/social-feed-register-lock-v1.md §7
 */
export const SOCIAL_POST_PHOTO_ASPECT_MIN = 4 / 5;
export const SOCIAL_POST_PHOTO_ASPECT_MAX = 1.91;

/**
 * The photo frame's width / height. Known edges (stored width and height,
 * an aspect, or a probed natural size) give the true shape, clamped to
 * the range. With none, the orientation bucket stands in (portrait 4:5,
 * landscape 16:9; an image with no hint is portrait) until the still
 * loads and its natural size is probed.
 */
export function socialPostPhotoAspect(input: SocialMediaFrameInput): number {
  const ratio = socialMediaAspectRatio(input);
  if (ratio == null) {
    return socialMediaOrientation(input) === "portrait" ? SOCIAL_POST_PHOTO_ASPECT_MIN : 16 / 9;
  }
  return Math.min(SOCIAL_POST_PHOTO_ASPECT_MAX, Math.max(SOCIAL_POST_PHOTO_ASPECT_MIN, ratio));
}

/**
 * Feed video frame (cards lock, founder 2026-10-06): the video sits in
 * the post's media block like a photo, full width, at its true shape held
 * between 4:5 (tallest) and 2.39:1 (widest, scope at its true shape, no
 * letterbox). Taller than 4:5 (a 3:4 or 9:16 phone video) draws 4:5 with
 * the still and the player cover-cropped; the whole frame is one tap away
 * in the theatre. Supersedes the min(70vh, 560px) cap and the screen.
 * docs/design-locks/social-feed-cards-lock-v1.md
 */
export const SOCIAL_FEED_VIDEO_ASPECT_MIN = 4 / 5;
export const SOCIAL_FEED_VIDEO_ASPECT_MAX = 2.39;

/** No ratio yet: soft grey while the still loads, not a black slab. */
export const SOCIAL_FEED_VIDEO_PENDING_CLASS =
  "group/video relative w-full shrink-0 overflow-hidden bg-surface-muted";

export type SocialFeedVideoOrientation = "portrait" | "landscape" | "square";

export type SocialFeedVideoFrame = {
  orientation: SocialFeedVideoOrientation;
  className: string;
  style: {
    aspectRatio: string;
  };
};

function positivePixel(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * In-feed video box. Phone and desktop share it.
 * The ratio is width / height, clamped to 4:5 … 2.39:1. Kind, a filename,
 * and a bare orientation label are not inputs. Missing edges return
 * null — not a 16:9 guess.
 */
export function socialFeedVideoFrame(input: {
  width?: number | null;
  height?: number | null;
}): SocialFeedVideoFrame | null {
  const { width, height } = input;
  if (!positivePixel(width) || !positivePixel(height)) return null;
  const orientation: SocialFeedVideoOrientation =
    height > width ? "portrait" : width > height ? "landscape" : "square";
  const ratio = Math.min(
    SOCIAL_FEED_VIDEO_ASPECT_MAX,
    Math.max(SOCIAL_FEED_VIDEO_ASPECT_MIN, width / height),
  );
  return {
    orientation,
    // shrink-0: absolute media has no min-content size; a column flex
    // item would otherwise collapse to 0 even with aspect-ratio set.
    className: "group/video relative block w-full shrink-0 overflow-hidden bg-surface-muted",
    style: { aspectRatio: String(ratio) },
  };
}

/**
 * A post's media item can draw: a video needs a Mux playback id (a legacy
 * file with none never plays and has no still), an image needs a url.
 * Loaders drop the rest; a post left with none renders as text.
 */
export function socialPostMediaUsable(item: {
  kind: "image" | "video";
  url?: string | null;
  playbackId?: string | null;
}): boolean {
  if (item.kind === "video") return isSocialMuxId(item.playbackId ?? "");
  return typeof item.url === "string" && item.url.trim().length > 0;
}

/** The post's media that can draw (socialPostMediaUsable), in order. */
export function socialPostUsableMedia<T extends { kind: "image" | "video"; url?: string | null; playbackId?: string | null }>(
  media: readonly T[],
): T[] {
  return media.filter(socialPostMediaUsable);
}

/**
 * The post had media and none of it can draw (socialPostUsableMedia left
 * nothing). Its card is a text card; with no words either it would hold
 * only the header and the actions, so the words' place keeps one quiet
 * line (SOCIAL.post.mediaUnavailable). A post that never had media is not
 * this case. docs/design-locks/social-feed-cards-lock-v1.md (C5)
 */
export function socialPostMediaAllDropped(stored: readonly unknown[], usable: readonly unknown[]): boolean {
  return stored.length > 0 && usable.length === 0;
}

/**
 * Still for an in-feed video. Public thumbs paint immediately.
 * Signed thumbs stay empty until a thumbnail JWT exists — an unsigned
 * image.mux.com src is the broken-image glyph.
 * A video-file URL is not a poster.
 */
export function socialFeedVideoPosterSrc(input: {
  playbackId?: string | null;
  playbackPolicy?: SocialMuxPlaybackPolicy | null;
  thumbnailToken?: string | null;
}): string {
  const playbackId = input.playbackId ?? "";
  if (!isSocialMuxId(playbackId)) return "";
  if (socialMuxPlaybackRequiresTokens(input.playbackPolicy)) {
    const token = input.thumbnailToken?.trim() ?? "";
    if (!token) return "";
    return socialMuxThumbnailUrl(playbackId, token);
  }
  return socialMuxThumbnailUrl(playbackId);
}

/** Any overlap with the viewport, including a zero-height frame sitting in it. */
export function socialFeedFrameOnScreen(
  rect: { top: number; bottom: number },
  viewportHeight: number,
): boolean {
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return false;
  if (!Number.isFinite(rect.top) || !Number.isFinite(rect.bottom)) return false;
  return rect.bottom > 0 && rect.top < viewportHeight;
}

/** Story viewer lane only. A portrait story stays tall instead of the feed 16:9 crop. */
export function socialStoryMediaFrameClass(): string {
  return "aspect-[9/16] w-full object-cover";
}

