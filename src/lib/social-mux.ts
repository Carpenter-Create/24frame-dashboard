// Social Mux encode + playback SoT. Client-safe — no token secret.
// Stories, posts, and everywhere Social video play here.
// Education and title film stay off this module.
// Playback is Auto (adaptive). Do not add a quality Settings maze.

export const SOCIAL_MUX_PROVIDER = "mux" as const;
export const SOCIAL_MUX_DEFAULT_RESOLUTION = "1080p" as const;
/** Cover-lift cap. Not chosen from client-reported pixels. */
export const SOCIAL_MUX_ORIGINAL_RESOLUTION = "2160p" as const;
export const SOCIAL_MUX_IMAGE_HOST = "image.mux.com";
/** First frame. Mux's default thumbnail, with no time, is a mid-clip still. */
export const SOCIAL_MUX_THUMBNAIL_TIME = "0";

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

/**
 * Whether a still may sit over the player after it has mounted.
 * Autoplay and chromeless faces (Stories, Explore) keep the still until
 * the first frame. A paused feed player must not: iOS Safari does not
 * emit `loadeddata` for `preload="metadata"` until play, so a cover that
 * waits on that event stays a static photo with no play chrome.
 */
export function socialMuxStillCoversChrome(input: {
  autoPlay: boolean;
  chromeless: boolean;
  firstFrame: boolean;
}): boolean {
  if (input.firstFrame) return false;
  if (!input.autoPlay && !input.chromeless) return false;
  return true;
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

/** Keep a server-minted token set for this browser session. Does not fetch. */
export function rememberSocialMuxPlaybackTokens(
  playbackId: string,
  tokens: SocialMuxPlaybackTokens,
): void {
  if (!socialMuxPlaybackTokensFromJson(tokens)) return;
  playbackTokenCache.set(playbackId, tokens);
  warmSocialMuxThumbnail(playbackId, tokens.thumbnail);
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

export function parseSocialMuxIntent(raw: string | null | undefined): SocialMuxIntent {
  return raw === "live" ? "live" : "video";
}

/**
 * Video posts and go-live both stay at 1080p until a server probe or
 * Mux-reported input proves a taller source. Client width and height are
 * not that measurement. The cover-lift cap is 2160p. Playback stays Mux-only.
 * docs/design-locks/social-create-video-quality-default-lock-v1.md
 * docs/design-locks/social-video-upload-cover-lift-lock-v1.md
 * docs/design-locks/social-video-mux-only-lock-v1.md
 */
export function socialMuxAssetSettings(input: {
  intent?: SocialMuxIntent | null;
}): SocialMuxAssetSettings {
  if (input.intent === "live") {
    return {
      videoQuality: "plus",
      maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
    };
  }
  return {
    videoQuality: "basic",
    maxResolutionTier: SOCIAL_MUX_DEFAULT_RESOLUTION,
  };
}

export function socialMuxThumbnailUrl(playbackId: string, token?: string): string {
  const url = `https://${SOCIAL_MUX_IMAGE_HOST}/${playbackId}/thumbnail.webp`;
  // Public: time is the query. Signed: time is the thumbnail JWT claim, and
  // the URL stays `?token=` only. Mux rejects `?time=0&token=` as a bad
  // signed URL (the extra query alters the signed request).
  // Adam: first visual = first frame.
  // docs/design-locks/social-explore-for-you-immersive-lock-v2.md
  if (!token) return `${url}?time=${SOCIAL_MUX_THUMBNAIL_TIME}`;
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
