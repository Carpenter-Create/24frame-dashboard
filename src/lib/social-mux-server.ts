import "server-only";

import Mux from "@mux/mux-node";

import {
  isSocialMuxId,
  SOCIAL_MUX_THUMBNAIL_TIME,
  socialMuxAssetSettings,
  socialMuxPassthroughBoundToUser,
  SocialMuxUploadNotBoundError,
  type SocialMuxAssetSettings,
  type SocialMuxIntent,
  type SocialMuxPlaybackTokens,
} from "@/lib/social-mux";

export const SOCIAL_MUX_ENV = [
  "MUX_TOKEN_ID",
  "MUX_TOKEN_SECRET",
  "MUX_SIGNING_KEY",
  "MUX_PRIVATE_KEY",
] as const;

// Official Mux JWT helper (`mux.jwt.signPlaybackId`). Key id is MUX_SIGNING_KEY.
// Base64 PEM is MUX_PRIVATE_KEY. Do not mint with the API token secret.

// Server-only Mux Video client for Social. Token secret never leaves this
// module. Do not import from client components, Edge Social reads, or
// Education / title MediaConvert paths.

const MUX_API = "https://api.mux.com";
const FINALIZE_DELAYS_MS = [250, 500, 750, 1000, 1500, 2000, 2000, 2000] as const;
const SOCIAL_MUX_PLAYBACK_TOKEN_EXPIRATION = "12h";

export type SocialMuxDirectUpload = {
  uploadId: string;
  url: string;
};

export type SocialMuxReadyAsset = {
  uploadId: string;
  assetId: string;
  playbackId: string;
};

type MuxUploadData = {
  id?: string;
  url?: string;
  status?: string;
  asset_id?: string | null;
  new_asset_settings?: {
    passthrough?: string | null;
  } | null;
};

export type MuxAssetData = {
  id?: string;
  status?: string;
  duration?: number;
  passthrough?: string | null;
  playback_ids?: Array<{ id?: string; policy?: string }>;
};

function requireMuxEnv(name: (typeof SOCIAL_MUX_ENV)[number]): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

function muxAuthHeader(): string {
  const token = `${requireMuxEnv("MUX_TOKEN_ID")}:${requireMuxEnv("MUX_TOKEN_SECRET")}`;
  return `Basic ${Buffer.from(token).toString("base64")}`;
}

/** A Mux response that was not OK. `status` is the HTTP status. */
export class SocialMuxRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SocialMuxRequestError";
  }
}

/**
 * A Mux answer that will not change on retry: a 4xx other than auth (401,
 * 403), timeout (408), and rate limit (429). Network errors, 5xx, and those
 * are worth retrying.
 */
export function isSocialMuxPermanentError(error: unknown): boolean {
  return (
    error instanceof SocialMuxRequestError &&
    error.status >= 400 &&
    error.status < 500 &&
    ![401, 403, 408, 429].includes(error.status)
  );
}

async function muxRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${MUX_API}${path}`, {
    ...init,
    headers: {
      Authorization: muxAuthHeader(),
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as { data?: T; error?: { messages?: string[] } } | null;
  if (!response.ok || !json?.data) {
    throw new SocialMuxRequestError(
      json?.error?.messages?.[0] ?? `Mux request failed (${response.status})`,
      response.status,
    );
  }
  return json.data;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function muxCorsOrigin(): string {
  return "*";
}

export async function createSocialMuxDirectUpload(input: {
  settings: SocialMuxAssetSettings;
  passthrough?: string;
}): Promise<SocialMuxDirectUpload> {
  const data = await muxRequest<MuxUploadData>("/video/v1/uploads", {
    method: "POST",
    body: JSON.stringify({
      cors_origin: muxCorsOrigin(),
      new_asset_settings: {
        playback_policies: ["signed"],
        video_quality: input.settings.videoQuality,
        max_resolution_tier: input.settings.maxResolutionTier,
        ...(input.passthrough ? { passthrough: input.passthrough } : {}),
      },
    }),
  });
  if (!data.id || !data.url || !isSocialMuxId(data.id)) {
    throw new Error("Mux upload was not created");
  }
  return { uploadId: data.id, url: data.url };
}

export async function retrieveSocialMuxUpload(uploadId: string): Promise<MuxUploadData> {
  if (!isSocialMuxId(uploadId)) throw new Error("Mux upload id is invalid");
  return muxRequest<MuxUploadData>(`/video/v1/uploads/${uploadId}`);
}

export async function retrieveSocialMuxAsset(
  assetId: string,
  init?: Pick<RequestInit, "signal">,
): Promise<MuxAssetData> {
  if (!isSocialMuxId(assetId)) throw new Error("Mux asset id is invalid");
  return muxRequest<MuxAssetData>(`/video/v1/assets/${assetId}`, init);
}

export async function mintSocialMuxPlaybackTokens(
  playbackId: string,
): Promise<SocialMuxPlaybackTokens> {
  if (!isSocialMuxId(playbackId)) throw new Error("Mux playback id is invalid");
  const mux = new Mux({
    jwtSigningKey: requireMuxEnv("MUX_SIGNING_KEY"),
    jwtPrivateKey: requireMuxEnv("MUX_PRIVATE_KEY"),
  });
  const signed = await mux.jwt.signPlaybackId(playbackId, {
    expiration: SOCIAL_MUX_PLAYBACK_TOKEN_EXPIRATION,
    // Thumbnail claim only. A time claim on video or storyboard would
    // change playback, not the poster. URL time stays off the signed request.
    type: ["video", ["thumbnail", { time: SOCIAL_MUX_THUMBNAIL_TIME }], "storyboard"],
  });
  const playback = signed["playback-token"];
  const thumbnail = signed["thumbnail-token"];
  const storyboard = signed["storyboard-token"];
  if (!playback || !thumbnail || !storyboard) {
    throw new Error("Mux playback token was not minted");
  }
  return { playback, thumbnail, storyboard };
}

// Topic tagging (lib/social-topic-media). Server reads only: short-lived
// tokens, never handed to a browser. Each call gives up after
// SOCIAL_MUX_TOPIC_TIMEOUT_MS. A permanent miss (isSocialMuxPermanentError)
// reads as null; anything else throws, so the post is retried.
const SOCIAL_MUX_SERVER_READ_EXPIRATION = "10m";
const MUX_IMAGE = "https://image.mux.com";
export const SOCIAL_MUX_TOPIC_TIMEOUT_MS = 15_000;

function socialMuxSigner(): Mux {
  return new Mux({
    jwtSigningKey: requireMuxEnv("MUX_SIGNING_KEY"),
    jwtPrivateKey: requireMuxEnv("MUX_PRIVATE_KEY"),
  });
}

async function socialMuxServerRead(url: string, what: string): Promise<Response | null> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOCIAL_MUX_TOPIC_TIMEOUT_MS),
  });
  if (response.ok) return response;
  const error = new SocialMuxRequestError(`Mux ${what} request failed (${response.status})`, response.status);
  if (isSocialMuxPermanentError(error)) return null;
  throw error;
}

/** One JPEG still at `time` seconds, `width` px wide, or null. */
export async function fetchSocialMuxFrame(
  playbackId: string,
  frame: { time: number; width: number },
): Promise<Uint8Array | null> {
  if (!isSocialMuxId(playbackId)) return null;
  // Signed thumbnails carry time and width in the token; the URL takes no
  // other query parameters.
  const token = await socialMuxSigner().jwt.signPlaybackId(playbackId, {
    type: "thumbnail",
    expiration: SOCIAL_MUX_SERVER_READ_EXPIRATION,
    params: { time: String(frame.time), width: String(frame.width) },
  });
  const response = await socialMuxServerRead(
    `${MUX_IMAGE}/${playbackId}/thumbnail.jpg?token=${encodeURIComponent(token)}`,
    "image",
  );
  if (!response) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  return bytes.byteLength > 0 ? bytes : null;
}

export function signedPlaybackIdFromAsset(asset: MuxAssetData): string | null {
  const match = asset.playback_ids?.find(
    (item) => item.policy === "signed" && item.id && isSocialMuxId(item.id),
  );
  return match?.id ?? null;
}

function muxUploadPassthrough(upload: MuxUploadData): string | null {
  const value = upload.new_asset_settings?.passthrough;
  return typeof value === "string" ? value : null;
}

export async function finalizeSocialMuxDirectUpload(
  uploadId: string,
  callerUserId: string,
): Promise<SocialMuxReadyAsset> {
  if (!callerUserId.trim()) throw new SocialMuxUploadNotBoundError();

  let assetId = "";
  for (const delay of FINALIZE_DELAYS_MS) {
    const upload = await retrieveSocialMuxUpload(uploadId);
    if (!socialMuxPassthroughBoundToUser(muxUploadPassthrough(upload), callerUserId)) {
      throw new SocialMuxUploadNotBoundError();
    }
    if (upload.status === "errored" || upload.status === "cancelled" || upload.status === "timed_out") {
      throw new Error("Mux upload failed");
    }
    if (upload.asset_id && isSocialMuxId(upload.asset_id)) {
      assetId = upload.asset_id;
      break;
    }
    await wait(delay);
  }
  if (!assetId) throw new Error("Mux asset is still preparing");

  let playbackId: string | null = null;
  for (const delay of FINALIZE_DELAYS_MS) {
    const asset = await retrieveSocialMuxAsset(assetId);
    playbackId = signedPlaybackIdFromAsset(asset);
    if (playbackId) {
      return { uploadId, assetId, playbackId };
    }
    await wait(delay);
  }
  throw new Error("Mux playback id is still preparing");
}

export function socialMuxSettingsFromUploadInput(input: {
  intent?: string | null;
}): { intent: SocialMuxIntent; settings: SocialMuxAssetSettings } {
  const intent = input.intent === "live" ? "live" : "video";
  return {
    intent,
    settings: socialMuxAssetSettings({ intent }),
  };
}
