import { SOCIAL_DESKTOP_MEASURE } from "@/lib/social-chrome";
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

export function socialAvatarImageSizes(size: "sm" | "md" | "lg" | "profile"): string {
  if (size === "sm") return "36px";
  if (size === "lg") return "96px";
  if (size === "profile") return "80px";
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
  return path === SOCIAL_MEDIA_ROUTE || path.startsWith(`${SOCIAL_AVATAR_ROUTE}/`);
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
 * Still buckets only. Portrait → 4:5. Landscape → 16:9.
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
 * Still frame SoT. Mux video does not use this class.
 * Height is min(70vh, 560px, aspect height). Width stays the container.
 * Portrait stills crop inside the cap. Landscape stills follow aspect until the cap.
 * docs/design-locks/social-feed-photo-scale-immersive-lock-v1.md
 * Complete class strings — Tailwind does not see interpolations.
 */
export function socialMediaFrameClass(
  orientation: SocialMediaOrientation | SocialMediaFrameInput,
): string {
  return socialMediaOrientation(orientation) === "portrait"
    ? "aspect-[4/5] h-[min(70vh,560px,calc(100cqw*5/4))] w-full max-h-[min(70vh,560px)] object-cover object-center"
    : "aspect-video h-[min(70vh,560px,calc(100cqw*9/16))] w-full max-h-[min(70vh,560px)] object-cover object-center";
}

/** Same cap as the still face. The video box narrows instead of cropping. */
export const SOCIAL_FEED_VIDEO_MAX_H = "min(70vh, 560px)";

/** No ratio yet. Not a 16:9 slot. */
export const SOCIAL_FEED_VIDEO_PENDING_CLASS =
  "relative w-full shrink-0 overflow-hidden bg-surface-muted";

export type SocialFeedVideoOrientation = "portrait" | "landscape" | "square";

export type SocialFeedVideoFrame = {
  orientation: SocialFeedVideoOrientation;
  className: string;
  style: {
    aspectRatio: string;
    width: string;
    maxHeight: string;
  };
};

function positivePixel(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/**
 * In-feed video box. Phone and non-Home desktop share it.
 * The ratio is width / height. Kind, a filename, and a bare orientation
 * label are not inputs. Missing edges return null — not a 16:9 guess.
 * The cap narrows the width so a portrait video stays portrait.
 * Desktop Home fills the column in globals.css. This function does not.
 * docs/design-locks/social-home-post-separation-lock-v1.md
 */
export function socialFeedVideoFrame(input: {
  width?: number | null;
  height?: number | null;
}): SocialFeedVideoFrame | null {
  const { width, height } = input;
  if (!positivePixel(width) || !positivePixel(height)) return null;
  const orientation: SocialFeedVideoOrientation =
    height > width ? "portrait" : width > height ? "landscape" : "square";
  return {
    orientation,
    // shrink-0: the frame is a column-flex item. Absolute media has no
    // min-content size, and a column flex item will otherwise collapse
    // the main size to 0 even when aspect-ratio is set.
    className: "relative mx-auto block max-w-full shrink-0 self-center overflow-hidden bg-surface-muted",
    style: {
      aspectRatio: `${width} / ${height}`,
      width: `min(100%, calc(${SOCIAL_FEED_VIDEO_MAX_H} * ${width} / ${height}))`,
      maxHeight: SOCIAL_FEED_VIDEO_MAX_H,
    },
  };
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

