import { SOCIAL } from "@/lib/social";
import {
  socialMediaMaxBytes,
  storyPickFile,
  type SocialMediaKind,
} from "@/lib/social-media";

// Write-compose video attach. The compose preview is a muted, playsInline
// loop of the local blob (a held frame under Reduce Motion), seeked to
// `storyReviewFrameSeconds` so iOS Safari paints it. Upload pixels come from
// that element's loadedmetadata and loadeddata events.

export type SocialComposeAttachPlan =
  | { ok: true; file: File; kind: SocialMediaKind }
  | { ok: false; error: string };

/** Library picks often omit `file.type`. Map them onto the house allowlist before upload. */
export function planSocialComposeAttach(file: File): SocialComposeAttachPlan {
  const picked = storyPickFile(file);
  if (!picked) return { ok: false, error: SOCIAL.home.mediaType };
  if (picked.file.size <= 0) return { ok: false, error: SOCIAL.home.mediaMissing };
  if (picked.file.size > socialMediaMaxBytes(picked.kind)) {
    return { ok: false, error: SOCIAL.home.mediaTooLarge };
  }
  return { ok: true, file: picked.file, kind: picked.kind };
}

export type SocialComposeSourcePixels = { width: number; height: number };

/**
 * A queued clip may upload only while its pre-registered controller is live.
 * Dismiss aborts that controller before the loop reaches the slot.
 */
export function composeSlotMayUpload(signal: AbortSignal | null | undefined): boolean {
  return signal != null && !signal.aborted;
}

/**
 * Dims from the visible compose preview. Null skips the detached pixel probe
 * so a second decoder cannot blank iOS Safari.
 */
export function composeVideoUploadPixels(
  measured: SocialComposeSourcePixels | null | undefined,
): SocialComposeSourcePixels | null {
  if (!measured) return null;
  const { width, height } = measured;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width: Math.round(width), height: Math.round(height) };
}

/** Attach measured preview pixels so a vertical clip is not stored as a bare video. */
export function stampSocialComposeSourcePixels<T extends object>(
  item: T,
  measured: SocialComposeSourcePixels | null | undefined,
): T & { width?: number; height?: number } {
  const pixels = composeVideoUploadPixels(measured);
  if (!pixels) return item;
  return { ...item, width: pixels.width, height: pixels.height };
}

/**
 * A video may enter post media only with source pixels.
 * Missing dims are not committed — the feed would otherwise treat them as landscape.
 */
export function commitSocialComposeMediaItem<T extends { kind: string }>(
  item: T,
  measured: SocialComposeSourcePixels | null | undefined,
): T | (T & { width: number; height: number }) | null {
  if (item.kind !== "video") return item;
  const pixels = composeVideoUploadPixels(measured);
  if (!pixels) return null;
  return stampSocialComposeSourcePixels(item, pixels);
}

/** How long compose waits for the visible preview to report pixels before refusing the commit. */
export const SOCIAL_COMPOSE_PIXEL_WAIT_MS = 4000;
