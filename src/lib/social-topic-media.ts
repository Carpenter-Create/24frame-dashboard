import "server-only";

import sharp from "sharp";

import { isSocialMuxMediaItem, type SocialMediaItem } from "@/lib/social-media";
import { socialMuxPassthroughBoundToUser } from "@/lib/social-mux";
import {
  fetchSocialMuxFrame,
  retrieveSocialMuxAsset,
  SOCIAL_MUX_TOPIC_TIMEOUT_MS,
  type MuxAssetData,
} from "@/lib/social-mux-server";
import { readSocialMediaObjectOrThrow } from "@/lib/s3-social-media";
import { SOCIAL_TOPIC_MAX_IMAGES, type SocialTopicImage } from "@/lib/social-topic-tagging";

// What the topic tagger can see of a post's media: images from the Social
// media bucket, and three frames from each Mux video. No transcript for now
// (founder decision 2026-10-03): nothing is added to the author's video.
//
// "wait" means try again on a later run: a video is still preparing. A
// video still preparing after SOCIAL_TOPIC_MEDIA_WAIT_MS is classified
// without its frames.
//
// Read errors throw, so the post is left untouched and retried. That
// includes a missing Mux asset or frame and a missing S3 image: nothing in
// the app deletes them and saving a post checks both, so a miss is
// configuration (keys from another Mux environment, the wrong bucket). Only
// Mux's own answers read as no media: an errored video, or one that is not
// the author's. An image the decoder cannot read is skipped; a retry would
// read the same bytes.

export const SOCIAL_TOPIC_MEDIA_WAIT_MS = 60 * 60 * 1000;
export const SOCIAL_TOPIC_IMAGE_MAX_EDGE = 1024;
// 50 megapixels covers a 48 MP phone photo; about 200 MB decoded, well
// inside the worker's 1024 MB. Larger images are skipped, not retried.
export const SOCIAL_TOPIC_IMAGE_MAX_INPUT_PIXELS = 50_000_000;
export const SOCIAL_TOPIC_FRAME_WIDTH = 768;
export const SOCIAL_TOPIC_FRAME_POINTS = [0.15, 0.5, 0.85] as const;

export type SocialTopicMedia = { status: "wait" } | { status: "ready"; images: SocialTopicImage[] };

export type SocialTopicMediaDeps = {
  readImage: typeof readSocialMediaObjectOrThrow;
  retrieveAsset: (assetId: string) => Promise<MuxAssetData>;
  fetchFrame: typeof fetchSocialMuxFrame;
};

export const SOCIAL_TOPIC_LIVE_MEDIA_DEPS: SocialTopicMediaDeps = {
  readImage: readSocialMediaObjectOrThrow,
  retrieveAsset: (assetId) =>
    retrieveSocialMuxAsset(assetId, { signal: AbortSignal.timeout(SOCIAL_MUX_TOPIC_TIMEOUT_MS) }),
  fetchFrame: fetchSocialMuxFrame,
};

/** Downscale to SOCIAL_TOPIC_IMAGE_MAX_EDGE and re-encode as JPEG (first frame of a GIF). */
export async function socialTopicJpeg(
  bytes: Uint8Array,
  maxInputPixels: number = SOCIAL_TOPIC_IMAGE_MAX_INPUT_PIXELS,
): Promise<string | null> {
  try {
    // Refuse an image over the pixel limit before decoding it, so one huge
    // image cannot exhaust the worker's memory.
    const out = await sharp(bytes, { animated: false, limitInputPixels: maxInputPixels })
      .rotate()
      .resize({
        width: SOCIAL_TOPIC_IMAGE_MAX_EDGE,
        height: SOCIAL_TOPIC_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      // JPEG has no alpha: transparent pixels would turn black.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80 })
      .toBuffer();
    return out.toString("base64");
  } catch {
    return null;
  }
}

type MuxVideo = SocialMediaItem & { playbackId: string; assetId: string };
type ReadyVideo = { item: MuxVideo; asset: MuxAssetData };

/**
 * The author's own ready asset for a video, null when the tagger reads
 * nothing from it, or "wait" while it is still preparing. Nothing is read
 * from an asset with no asset id, an errored asset, or an asset that is not
 * the author's upload played by this playback id. A failed lookup throws.
 */
async function readyMuxAsset(
  item: SocialMediaItem & { playbackId: string },
  authorId: string,
  waitedOut: boolean,
  deps: SocialTopicMediaDeps,
): Promise<ReadyVideo | null | "wait"> {
  if (!item.assetId) return null;
  const asset = await deps.retrieveAsset(item.assetId);
  // Only the author's own upload, played by this playback id. A post that
  // names someone else's asset gets no frames.
  if (
    !socialMuxPassthroughBoundToUser(asset.passthrough, authorId) ||
    !asset.playback_ids?.some((playback) => playback.id === item.playbackId)
  ) {
    return null;
  }
  if (asset.status === "errored") return null;
  if (asset.status !== "ready") return waitedOut ? null : "wait";
  return { item: { ...item, assetId: item.assetId }, asset };
}

async function videoFrames(item: MuxVideo, asset: MuxAssetData, deps: SocialTopicMediaDeps, signal?: AbortSignal) {
  const duration = asset.duration && asset.duration > 0 ? asset.duration : 0;
  const times = duration > 0 ? SOCIAL_TOPIC_FRAME_POINTS.map((point) => Math.floor(point * duration)) : [0];
  const frames: SocialTopicImage[] = [];
  for (const time of [...new Set(times)]) {
    signal?.throwIfAborted();
    const bytes = await deps.fetchFrame(item.playbackId, { time, width: SOCIAL_TOPIC_FRAME_WIDTH });
    if (bytes) {
      frames.push({
        label: `Video frame at ${time}s`,
        mediaType: "image/jpeg",
        data: Buffer.from(bytes).toString("base64"),
      });
    }
  }
  return frames;
}

/**
 * Media signals for one post. `createdAt` decides whether the tagger still
 * waits for a preparing video. `signal` stops a post the run has given up
 * on before its next Mux or S3 call, so abandoned work ends within one
 * call's timeout.
 *
 * Every video must be ready before anything is read, so a post is
 * classified once, from all of its media.
 */
export async function gatherSocialTopicMedia(
  post: {
    items: readonly SocialMediaItem[];
    authorId: string;
    createdAt: string;
    now: Date;
    signal?: AbortSignal;
  },
  deps: SocialTopicMediaDeps = SOCIAL_TOPIC_LIVE_MEDIA_DEPS,
): Promise<SocialTopicMedia> {
  const waitedOut = post.now.getTime() - Date.parse(post.createdAt) >= SOCIAL_TOPIC_MEDIA_WAIT_MS;

  const videos = new Map<SocialMediaItem, ReadyVideo>();
  for (const item of post.items) {
    if (!isSocialMuxMediaItem(item)) continue;
    post.signal?.throwIfAborted();
    const video = await readyMuxAsset(item, post.authorId, waitedOut, deps);
    if (video === "wait") return { status: "wait" };
    if (video) videos.set(item, video);
  }

  const images: SocialTopicImage[] = [];
  let photos = 0;
  for (const item of post.items) {
    if (images.length >= SOCIAL_TOPIC_MAX_IMAGES) break;
    post.signal?.throwIfAborted();
    if (item.kind === "image") {
      const object = await deps.readImage(item.key);
      const data = object ? await socialTopicJpeg(object.bytes) : null;
      if (data) {
        photos += 1;
        images.push({ label: `Image ${photos}`, mediaType: "image/jpeg", data });
      }
      continue;
    }
    const video = videos.get(item);
    if (video) images.push(...(await videoFrames(video.item, video.asset, deps, post.signal)));
  }

  return { status: "ready", images: images.slice(0, SOCIAL_TOPIC_MAX_IMAGES) };
}
