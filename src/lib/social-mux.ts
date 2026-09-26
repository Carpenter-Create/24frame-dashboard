// Social Mux encode + playback SoT. Client-safe — no token secret.
// Stories, posts, and everywhere Social video play here.
// Education and title film stay off this module.
// Playback is Auto (adaptive). Do not add a quality Settings maze.

export const SOCIAL_MUX_PROVIDER = "mux" as const;
export const SOCIAL_MUX_DEFAULT_RESOLUTION = "1080p" as const;
export const SOCIAL_MUX_ORIGINAL_RESOLUTION = "2160p" as const;
export const SOCIAL_MUX_4K_MIN_EDGE = 2160;
export const SOCIAL_MUX_IMAGE_HOST = "image.mux.com";

export const SOCIAL_MUX_ID_RE = /^[A-Za-z0-9_-]{8,120}$/;

export type SocialMuxIntent = "video" | "live";
export type SocialMuxVideoQuality = "basic" | "plus";
export type SocialMuxResolutionTier = "1080p" | "2160p";

export type SocialMuxAssetSettings = {
  videoQuality: SocialMuxVideoQuality;
  maxResolutionTier: SocialMuxResolutionTier;
};

export const SOCIAL_MUX_PLAYBACK_POLICIES = ["public", "signed"] as const;
export type SocialMuxPlaybackPolicy = (typeof SOCIAL_MUX_PLAYBACK_POLICIES)[number];

export type SocialMuxMediaFields = {
  provider: typeof SOCIAL_MUX_PROVIDER;
  playbackId: string;
  uploadId?: string;
  assetId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
};

/** Signed assets need a playback JWT. Public assets, and legacy rows with no policy, do not. */
export function socialMuxPlaybackRequiresTokens(
  playbackPolicy: SocialMuxPlaybackPolicy | null | undefined,
): boolean {
  return playbackPolicy === "signed";
}

/**
 * Empty hold before a signed thumbnail JWT exists. An unsigned
 * image.mux.com request 403s and paints the Safari broken-image glyph.
 * Once the JWT exists, paint that thumb and wait until it decodes before
 * mounting the player. The thumb stays until loadeddata, same as public.
 */
export function socialMuxCoveringPoster(signed: boolean, hasTokens: boolean): boolean {
  return signed && !hasTokens;
}

/**
 * Signed playback mounts under a decoded JWT thumb. Mounting the player
 * in the same commit as the poster is the blank-then-pop start jump.
 */
export function socialMuxSignedPlayerReady(hasTokens: boolean, posterDecoded: boolean): boolean {
  return hasTokens && posterDecoded;
}

export function isSocialMuxId(value: string): boolean {
  return SOCIAL_MUX_ID_RE.test(value);
}

// Create stores `${user.id}:${objectId}` on the Mux upload. Finalize accepts
// the upload only when that passthrough starts with `${userId}:`.
export function socialMuxPassthroughBoundToUser(
  passthrough: string | null | undefined,
  userId: string,
): boolean {
  if (typeof passthrough !== "string" || typeof userId !== "string") return false;
  const caller = userId.trim();
  const token = passthrough.trim();
  if (!caller || !token) return false;
  return token.startsWith(`${caller}:`);
}

export const SOCIAL_MUX_PLAYBACK_ROUTE = "/api/social/mux-playback";

export type SocialMuxPlaybackTokens = {
  playback: string;
  thumbnail: string;
  storyboard: string;
};

const playbackTokenCache = new Map<string, SocialMuxPlaybackTokens>();
const playbackTokenInflight = new Map<string, Promise<SocialMuxPlaybackTokens | null>>();
let playbackTokenGeneration = 0;

export function readSocialMuxPlaybackTokenCache(playbackId: string): SocialMuxPlaybackTokens | null {
  return playbackTokenCache.get(playbackId) ?? null;
}

/** Test isolation. A cleared generation ignores a mint that resolves later. */
export function clearSocialMuxPlaybackTokenCache(): void {
  playbackTokenGeneration += 1;
  playbackTokenCache.clear();
  playbackTokenInflight.clear();
}

function warmSocialMuxThumbnail(playbackId: string, token: string): void {
  const ImageCtor = (globalThis as { Image?: new () => { src: string; decoding?: string } }).Image;
  if (!ImageCtor) return;
  const img = new ImageCtor();
  img.decoding = "async";
  img.src = socialMuxThumbnailUrl(playbackId, token);
}

/**
 * Session mint for one playback id. Callers share one request. An aborted
 * caller receives null and does not write state; the request still fills
 * the cache when it succeeds, so a warm for the next clip survives.
 */
export function loadSocialMuxPlaybackTokens(
  playbackId: string,
  signal?: AbortSignal,
): Promise<SocialMuxPlaybackTokens | null> {
  if (signal?.aborted) return Promise.resolve(null);
  const cached = playbackTokenCache.get(playbackId);
  if (cached) return Promise.resolve(cached);

  let flight = playbackTokenInflight.get(playbackId);
  if (!flight) {
    const generation = playbackTokenGeneration;
    flight = fetch(`${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(playbackId)}`, {
      credentials: "same-origin",
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (generation !== playbackTokenGeneration) return null;
        const tokens = socialMuxPlaybackTokensFromJson(body);
        if (!tokens) return null;
        playbackTokenCache.set(playbackId, tokens);
        warmSocialMuxThumbnail(playbackId, tokens.thumbnail);
        return tokens;
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return null;
        return null;
      })
      .finally(() => {
        if (generation === playbackTokenGeneration && playbackTokenInflight.get(playbackId) === flight) {
          playbackTokenInflight.delete(playbackId);
        }
      });
    playbackTokenInflight.set(playbackId, flight);
  }

  return flight.then((tokens) => (signal?.aborted ? null : tokens));
}

export function socialMuxPlaybackTokensFromJson(value: unknown): SocialMuxPlaybackTokens | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const playback = row.playback;
  const thumbnail = row.thumbnail;
  const storyboard = row.storyboard;
  if (typeof playback !== "string" || !playback) return null;
  if (typeof thumbnail !== "string" || !thumbnail) return null;
  if (typeof storyboard !== "string" || !storyboard) return null;
  return { playback, thumbnail, storyboard };
}

export class SocialMuxUploadNotBoundError extends Error {
  constructor() {
    super("Mux upload is not bound to the caller");
    this.name = "SocialMuxUploadNotBoundError";
  }
}

export function isSocialMux4kSource(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  return Math.max(width, height) >= SOCIAL_MUX_4K_MIN_EDGE;
}

export function parseSocialMuxIntent(raw: string | null | undefined): SocialMuxIntent {
  return raw === "live" ? "live" : "video";
}

export function socialMuxAssetSettings(input: {
  intent?: SocialMuxIntent | null;
  originalQuality?: boolean;
  width?: number;
  height?: number;
}): SocialMuxAssetSettings {
  if (input.intent === "live") {
    return {
      videoQuality: "plus",
      maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
    };
  }
  const fourK =
    Boolean(input.originalQuality) &&
    isSocialMux4kSource(input.width ?? 0, input.height ?? 0);
  return {
    videoQuality: "basic",
    maxResolutionTier: fourK ? SOCIAL_MUX_ORIGINAL_RESOLUTION : SOCIAL_MUX_DEFAULT_RESOLUTION,
  };
}

export function socialMuxThumbnailUrl(playbackId: string, token?: string): string {
  const url = `https://${SOCIAL_MUX_IMAGE_HOST}/${playbackId}/thumbnail.webp`;
  if (!token) return url;
  return `${url}?token=${encodeURIComponent(token)}`;
}

export function probeSocialVideoPixels(
  file: File,
): Promise<{ width: number; height: number } | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (dims: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      done(Number.isFinite(width) && Number.isFinite(height) ? { width, height } : null);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}
