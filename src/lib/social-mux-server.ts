import "server-only";

import Mux from "@mux/mux-node";

import { muxAudioRenditionRequestSettled } from "@/lib/social-music-audio";
import { createAdminClient } from "@/lib/supabase/admin";

import {
  isSocialMuxId,
  SOCIAL_MUX_PROVIDER,
  SOCIAL_MUX_THUMBNAIL_TIME,
  socialMuxAssetSettings,
  socialMuxPassthroughBoundToUser,
  socialVideoDurationExceedsCap,
  SocialMuxUploadNotBoundError,
  SocialMuxVideoTooLongError,
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
  static_renditions?:
    | {
        status?: string;
        files?: Array<{ name?: string; ext?: string; status?: string; resolution?: string }>;
      }
    | Array<{ name?: string; ext?: string; status?: string; resolution?: string }>;
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
    // The status rides along for the upload failure log.
    throw Object.assign(new Error(json?.error?.messages?.[0] ?? `Mux request failed (${response.status})`), {
      status: response.status,
    });
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
// SOCIAL_MUX_TOPIC_TIMEOUT_MS. Any failed read throws, a 4xx included, so
// the post is retried: nothing deletes a Social asset, so a miss is
// configuration (keys from another Mux environment), not a gone video.
const SOCIAL_MUX_SERVER_READ_EXPIRATION = "10m";
const MUX_IMAGE = "https://image.mux.com";
export const SOCIAL_MUX_TOPIC_TIMEOUT_MS = 15_000;

function socialMuxSigner(): Mux {
  return new Mux({
    jwtSigningKey: requireMuxEnv("MUX_SIGNING_KEY"),
    jwtPrivateKey: requireMuxEnv("MUX_PRIVATE_KEY"),
  });
}

/** One JPEG still at `time` seconds, `width` px wide. Null only for an id that is not a Mux id. */
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
  const response = await fetch(`${MUX_IMAGE}/${playbackId}/thumbnail.jpg?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(SOCIAL_MUX_TOPIC_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Mux image request failed (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength === 0) throw new Error("Mux image request returned no bytes");
  return bytes;
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
    if (playbackId && socialVideoDurationExceedsCap(asset.duration)) {
      try {
        await deleteSocialMuxAsset(assetId);
      } catch {
        // The asset is still too long. Do not bind it or return ids.
      }
      throw new SocialMuxVideoTooLongError();
    }
    if (playbackId && typeof asset.duration === "number" && Number.isFinite(asset.duration) && asset.duration > 0) {
      await recordSocialMuxBinding({
        authorId: callerUserId,
        uploadId,
        assetId,
        playbackId,
      });
      return { uploadId, assetId, playbackId };
    }
    await wait(delay);
  }
  throw new Error("Mux playback id is still preparing");
}

/** Delete a Mux asset that must not be published. 404 is already gone. */
export async function deleteSocialMuxAsset(assetId: string): Promise<void> {
  if (!isSocialMuxId(assetId)) throw new Error("Mux asset id is invalid");
  const response = await fetch(`${MUX_API}/video/v1/assets/${assetId}`, {
    method: "DELETE",
    headers: { Authorization: muxAuthHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 200 || response.status === 204 || response.status === 404) return;
  throw new Error(`Mux asset delete failed (${response.status})`);
}

/** Create a Mux asset from a short-lived URL. Used by the re-ingest script. */
export async function createSocialMuxAssetFromUrl(url: string): Promise<{ assetId: string }> {
  const settings = socialMuxAssetSettings({ intent: "video" });
  const data = await muxRequest<MuxAssetData>("/video/v1/assets", {
    method: "POST",
    body: JSON.stringify({
      input: [{ url }],
      playback_policies: ["signed"],
      video_quality: settings.videoQuality,
      max_resolution_tier: settings.maxResolutionTier,
    }),
  });
  if (!data.id || !isSocialMuxId(data.id)) throw new Error("Mux asset was not created");
  return { assetId: data.id };
}

/**
 * Audio-only static rendition. A second POST that reports the rendition
 * already exists or is in progress returns without throwing, so the worker
 * polls. Any other Mux error throws and the worker retries that attempt.
 */
export async function createSocialMuxAudioRendition(assetId: string): Promise<void> {
  if (!isSocialMuxId(assetId)) throw new Error("Mux asset id is invalid");
  try {
    await muxRequest(`/video/v1/assets/${assetId}/static-renditions`, {
      method: "POST",
      body: JSON.stringify({ resolution: "audio-only" }),
    });
  } catch (error) {
    if (muxAudioRenditionRequestSettled(error)) return;
    throw error;
  }
}

/**
 * Signed audio.m4a for the music worker. The whole rendition, not a Mux
 * time slice. The token never goes to a browser. Windows are cut after
 * the download.
 */
export async function signSocialMuxStaticAudioUrl(playbackId: string): Promise<string> {
  if (!isSocialMuxId(playbackId)) throw new Error("Mux playback id is invalid");
  const token = await socialMuxSigner().jwt.signPlaybackId(playbackId, {
    type: "video",
    expiration: SOCIAL_MUX_SERVER_READ_EXPIRATION,
  });
  return `https://stream.mux.com/${playbackId}/audio.m4a?token=${encodeURIComponent(token)}`;
}

/** Service-role only. The scan trigger requires this exact triple. */
export async function recordSocialMuxBinding(input: {
  authorId: string;
  uploadId: string;
  assetId: string;
  playbackId: string;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("social_mux_bindings").upsert(
    {
      author_id: input.authorId,
      upload_id: input.uploadId,
      asset_id: input.assetId,
      playback_id: input.playbackId,
    },
    { onConflict: "author_id,asset_id,playback_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("Mux binding was not recorded");
}

/** Upload, asset, and signed playback id all belong to this member. */
export function socialMuxPublishedVideoBound(input: {
  userId: string;
  uploadId: string;
  assetId: string;
  playbackId: string;
  upload: MuxUploadData;
  asset: MuxAssetData;
}): boolean {
  if (!input.userId.trim()) return false;
  if (!isSocialMuxId(input.uploadId) || !isSocialMuxId(input.assetId) || !isSocialMuxId(input.playbackId)) {
    return false;
  }
  if (!socialMuxPassthroughBoundToUser(muxUploadPassthrough(input.upload), input.userId)) return false;
  if (input.upload.asset_id !== input.assetId) return false;
  if (socialVideoDurationExceedsCap(input.asset.duration)) return false;
  return signedPlaybackIdFromAsset(input.asset) === input.playbackId;
}

/**
 * Publish accepts a Mux video only after Mux confirms the upload, asset,
 * and playback id, and the upload passthrough names this member.
 */
export async function verifySocialMuxPublishedItems(
  items: readonly { kind?: string; provider?: string; uploadId?: string; assetId?: string; playbackId?: string }[],
  userId: string,
): Promise<boolean> {
  for (const item of items) {
    if (item.kind !== "video" || item.provider !== SOCIAL_MUX_PROVIDER) continue;
    const uploadId = item.uploadId ?? "";
    const assetId = item.assetId ?? "";
    const playbackId = item.playbackId ?? "";
    if (!isSocialMuxId(uploadId) || !isSocialMuxId(assetId) || !isSocialMuxId(playbackId)) return false;
    const upload = await retrieveSocialMuxUpload(uploadId);
    const asset = await retrieveSocialMuxAsset(assetId);
    if (!socialMuxPublishedVideoBound({ userId, uploadId, assetId, playbackId, upload, asset })) return false;
    await recordSocialMuxBinding({ authorId: userId, uploadId, assetId, playbackId });
  }
  return true;
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
