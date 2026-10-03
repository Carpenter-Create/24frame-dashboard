import "server-only";

import sharp from "sharp";

import { isSocialMuxMediaItem, type SocialMediaItem } from "@/lib/social-media";
import {
  fetchSocialMuxFrame,
  fetchSocialMuxTranscript,
  requestSocialMuxGeneratedSubtitles,
  retrieveSocialMuxAsset,
  type MuxAssetData,
  type SocialMuxTrack,
} from "@/lib/social-mux-server";
import { readSocialMediaObject } from "@/lib/s3-social-media";
import { SOCIAL_TOPIC_MAX_IMAGES, type SocialTopicImage } from "@/lib/social-topic-tagging";

// What the topic tagger can see of a post's media. Images come from the
// Social media bucket; a Mux video gives three frames and, once Mux has
// transcribed it, its transcript (founder-approved). Transcription is
// requested here, the first time the tagger meets a ready video, so only
// videos the tagger reads are transcribed.
//
// "wait" means try again on a later run: the video, or its transcript, is
// still preparing. After SOCIAL_TOPIC_MEDIA_WAIT_MS the tagger stops waiting
// and classifies with what it has.

export const SOCIAL_TOPIC_MEDIA_WAIT_MS = 60 * 60 * 1000;
export const SOCIAL_TOPIC_IMAGE_MAX_EDGE = 1024;
export const SOCIAL_TOPIC_FRAME_WIDTH = 768;
export const SOCIAL_TOPIC_FRAME_POINTS = [0.15, 0.5, 0.85] as const;

export type SocialTopicMedia =
  | { status: "wait" }
  | { status: "ready"; images: SocialTopicImage[]; transcript: string | null };

export type SocialTopicMediaDeps = {
  readImage: typeof readSocialMediaObject;
  retrieveAsset: typeof retrieveSocialMuxAsset;
  requestSubtitles: typeof requestSocialMuxGeneratedSubtitles;
  fetchTranscript: typeof fetchSocialMuxTranscript;
  fetchFrame: typeof fetchSocialMuxFrame;
};

const LIVE_DEPS: SocialTopicMediaDeps = {
  readImage: readSocialMediaObject,
  retrieveAsset: retrieveSocialMuxAsset,
  requestSubtitles: requestSocialMuxGeneratedSubtitles,
  fetchTranscript: fetchSocialMuxTranscript,
  fetchFrame: fetchSocialMuxFrame,
};

/** Downscale to SOCIAL_TOPIC_IMAGE_MAX_EDGE and re-encode as JPEG (first frame of a GIF). */
export async function socialTopicJpeg(bytes: Uint8Array): Promise<string | null> {
  try {
    const out = await sharp(bytes, { animated: false })
      .rotate()
      .resize({
        width: SOCIAL_TOPIC_IMAGE_MAX_EDGE,
        height: SOCIAL_TOPIC_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();
    return out.toString("base64");
  } catch {
    return null;
  }
}

function generatedTextTrack(asset: MuxAssetData): SocialMuxTrack | null {
  return (
    asset.tracks?.find(
      (track) => track.type === "text" && track.text_source === "generated_vod" && track.status !== "deleted",
    ) ?? null
  );
}

function primaryAudioTrack(asset: MuxAssetData): SocialMuxTrack | null {
  const audio = asset.tracks?.filter((track) => track.type === "audio" && track.status === "ready") ?? [];
  return audio.find((track) => track.primary) ?? audio[0] ?? null;
}

type VideoSignals = { status: "wait" } | { status: "ready"; frames: SocialTopicImage[]; transcript: string | null };

async function muxVideoSignals(
  item: SocialMediaItem & { playbackId: string },
  waitedOut: boolean,
  options: { requestSubtitles: boolean },
  deps: SocialTopicMediaDeps,
): Promise<VideoSignals> {
  if (!item.assetId) return { status: "ready", frames: [], transcript: null };
  let asset: MuxAssetData;
  try {
    asset = await deps.retrieveAsset(item.assetId);
  } catch (error) {
    // Transient until the wait runs out; then classify without the video.
    if (waitedOut) return { status: "ready", frames: [], transcript: null };
    throw error;
  }
  if (asset.status === "errored") return { status: "ready", frames: [], transcript: null };
  if (asset.status !== "ready") {
    return waitedOut ? { status: "ready", frames: [], transcript: null } : { status: "wait" };
  }

  let transcript: string | null = null;
  const text = generatedTextTrack(asset);
  if (text?.status === "ready" && text.id) {
    transcript = await deps.fetchTranscript(item.playbackId, text.id).catch(() => null);
  } else if (!waitedOut && text?.status === "preparing") {
    return { status: "wait" };
  } else if (!waitedOut && !text && options.requestSubtitles) {
    const audio = primaryAudioTrack(asset);
    if (audio?.id) {
      // A failed request (no speech, already queued) falls back to frames.
      const requested = await deps.requestSubtitles(item.assetId, audio.id).then(
        () => true,
        () => false,
      );
      if (requested) return { status: "wait" };
    }
  }

  const duration = asset.duration && asset.duration > 0 ? asset.duration : 0;
  const times = duration > 0 ? SOCIAL_TOPIC_FRAME_POINTS.map((point) => Math.floor(point * duration)) : [0];
  const frames: SocialTopicImage[] = [];
  for (const time of [...new Set(times)]) {
    const bytes = await deps
      .fetchFrame(item.playbackId, { time, width: SOCIAL_TOPIC_FRAME_WIDTH })
      .catch(() => null);
    if (bytes) {
      frames.push({
        label: `Video frame at ${time}s`,
        mediaType: "image/jpeg",
        data: Buffer.from(bytes).toString("base64"),
      });
    }
  }
  return { status: "ready", frames, transcript };
}

/**
 * Media signals for one post. `createdAt` decides whether the tagger still
 * waits for a preparing video or transcript. The eval script passes
 * requestSubtitles: false so it never starts a transcription.
 */
export async function gatherSocialTopicMedia(
  items: readonly SocialMediaItem[],
  createdAt: string,
  now: Date,
  options: { requestSubtitles: boolean } = { requestSubtitles: true },
  deps: SocialTopicMediaDeps = LIVE_DEPS,
): Promise<SocialTopicMedia> {
  const waitedOut = now.getTime() - Date.parse(createdAt) >= SOCIAL_TOPIC_MEDIA_WAIT_MS;
  const images: SocialTopicImage[] = [];
  let transcript: string | null = null;

  for (const item of items) {
    if (images.length >= SOCIAL_TOPIC_MAX_IMAGES) break;
    if (item.kind === "image") {
      const object = await deps.readImage(item.key);
      const data = object ? await socialTopicJpeg(object.bytes) : null;
      if (data) images.push({ label: `Image ${images.length + 1}`, mediaType: "image/jpeg", data });
      continue;
    }
    if (isSocialMuxMediaItem(item)) {
      const video = await muxVideoSignals(item, waitedOut, options, deps);
      if (video.status === "wait") return { status: "wait" };
      images.push(...video.frames);
      transcript ??= video.transcript;
    }
  }

  return { status: "ready", images: images.slice(0, SOCIAL_TOPIC_MAX_IMAGES), transcript };
}
