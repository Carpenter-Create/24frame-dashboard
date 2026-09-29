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

type MuxAssetData = {
  id?: string;
  status?: string;
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
