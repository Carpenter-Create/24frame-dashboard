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

export type SocialMuxTrack = {
  id?: string;
  type?: string;
  status?: string;
  text_source?: string;
  primary?: boolean;
};

export type MuxAssetData = {
  id?: string;
  status?: string;
  duration?: number;
  playback_ids?: Array<{ id?: string; policy?: string }>;
  tracks?: SocialMuxTrack[];
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
    throw new Error(json?.error?.messages?.[0] ?? `Mux request failed (${response.status})`);
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

export async function retrieveSocialMuxAsset(assetId: string): Promise<MuxAssetData> {
  if (!isSocialMuxId(assetId)) throw new Error("Mux asset id is invalid");
  return muxRequest<MuxAssetData>(`/video/v1/assets/${assetId}`);
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
// tokens, never handed to a browser.
const SOCIAL_MUX_SERVER_READ_EXPIRATION = "10m";
const MUX_STREAM = "https://stream.mux.com";
const MUX_IMAGE = "https://image.mux.com";

/** Ask Mux to transcribe an asset's audio track. Language is detected. */
export async function requestSocialMuxGeneratedSubtitles(
  assetId: string,
  audioTrackId: string,
): Promise<void> {
  if (!isSocialMuxId(assetId) || !isSocialMuxId(audioTrackId)) {
    throw new Error("Mux track id is invalid");
  }
  await muxRequest<unknown>(
    `/video/v1/assets/${assetId}/tracks/${audioTrackId}/generate-subtitles`,
    {
      method: "POST",
      body: JSON.stringify({
        generated_subtitles: [{ language_code: "auto", name: "Generated" }],
      }),
    },
  );
}

function socialMuxSigner(): Mux {
  return new Mux({
    jwtSigningKey: requireMuxEnv("MUX_SIGNING_KEY"),
    jwtPrivateKey: requireMuxEnv("MUX_PRIVATE_KEY"),
  });
}

/** Plain-text transcript of a ready generated text track, or null. */
export async function fetchSocialMuxTranscript(
  playbackId: string,
  trackId: string,
): Promise<string | null> {
  if (!isSocialMuxId(playbackId) || !isSocialMuxId(trackId)) return null;
  const token = await socialMuxSigner().jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: SOCIAL_MUX_SERVER_READ_EXPIRATION,
  });
  const response = await fetch(
    `${MUX_STREAM}/${playbackId}/text/${trackId}.txt?token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  const text = (await response.text()).trim();
  return text || null;
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
  const response = await fetch(
    `${MUX_IMAGE}/${playbackId}/thumbnail.jpg?token=${encodeURIComponent(token)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
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
