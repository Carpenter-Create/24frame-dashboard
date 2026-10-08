import { SOCIAL_VIDEO_MAX_BYTES, type SocialVideoContentType } from "@/lib/social-media";
import { formatStoryRecorderClock } from "@/lib/social-story-recorder";

// In-app camera record, then a normal Social video post. Hard ~10 min
// cap. No livestream backend.

export const SOCIAL_GO_LIVE_MAX_MS = 10 * 60 * 1000;
export const SOCIAL_GO_LIVE_VIDEO_BITS_PER_SECOND = 2_500_000;

export function goLiveRemainingMs(
  elapsedMs: number,
  capMs: number = SOCIAL_GO_LIVE_MAX_MS,
): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return capMs;
  return Math.max(0, capMs - elapsedMs);
}

export function goLiveReachedCap(
  elapsedMs: number,
  capMs: number = SOCIAL_GO_LIVE_MAX_MS,
): boolean {
  return goLiveRemainingMs(elapsedMs, capMs) === 0 && elapsedMs >= capMs;
}

export function formatGoLiveClock(ms: number): string {
  return formatStoryRecorderClock(ms);
}

export function goLiveRecorderOptions(rawMime: string): {
  mimeType: string;
  videoBitsPerSecond: number;
} {
  return {
    mimeType: rawMime,
    videoBitsPerSecond: SOCIAL_GO_LIVE_VIDEO_BITS_PER_SECOND,
  };
}

export function goLiveFileName(contentType: SocialVideoContentType): string {
  if (contentType === "video/mp4") return "live.mp4";
  if (contentType === "video/quicktime") return "live.mov";
  return "live.webm";
}

export function goLiveFitsByteCap(
  byteLength: number,
  cap: number = SOCIAL_VIDEO_MAX_BYTES,
): boolean {
  return Number.isFinite(byteLength) && byteLength > 0 && byteLength <= cap;
}

// Desktop frame (docs/design-locks/social-go-live-camera-chrome-lock-v1.md
// §Desktop frame, Adam 2026-10-08): "full" is the camera's own frame, as the
// device opens it (what you see is what records); "reel" is a 9:16 cut of
// it, recorded as 9:16. Phone is always the camera's own (portrait) frame.
export type GoLiveFrame = "full" | "reel";

export const SOCIAL_GO_LIVE_FRAMES = ["full", "reel"] as const satisfies readonly GoLiveFrame[];

export const SOCIAL_GO_LIVE_DEFAULT_FRAME: GoLiveFrame = "full";

export const SOCIAL_GO_LIVE_REEL_ASPECT = 9 / 16;

const even = (n: number) => Math.max(2, Math.floor(n / 2) * 2);

/** The reel's center cut of a camera frame (source pixels, even sizes, no
 *  upscale): a landscape webcam keeps its height and loses its sides. */
export function goLiveReelCrop(
  width: number,
  height: number,
): { sx: number; sy: number; sw: number; sh: number } | null {
  if (!(width > 0 && height > 0)) return null;
  if (width / height > SOCIAL_GO_LIVE_REEL_ASPECT) {
    const sw = even(height * SOCIAL_GO_LIVE_REEL_ASPECT);
    const sh = even(height);
    return { sx: Math.floor((width - sw) / 2), sy: Math.floor((height - sh) / 2), sw, sh };
  }
  const sw = even(width);
  const sh = even(width / SOCIAL_GO_LIVE_REEL_ASPECT);
  return { sx: Math.floor((width - sw) / 2), sy: Math.floor((height - sh) / 2), sw, sh };
}
