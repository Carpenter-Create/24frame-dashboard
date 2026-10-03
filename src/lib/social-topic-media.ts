import "server-only";

import sharp from "sharp";

import { isSocialMuxMediaItem, type SocialMediaItem } from "@/lib/social-media";
import { socialMuxPassthroughBoundToUser } from "@/lib/social-mux";
import {
  deleteSocialMuxTrack,
  fetchSocialMuxFrame,
  fetchSocialMuxTranscript,
  isSocialMuxPermanentError,
  requestSocialMuxGeneratedSubtitles,
  retrieveSocialMuxAsset,
  SOCIAL_MUX_TOPIC_TIMEOUT_MS,
  SOCIAL_MUX_TOPIC_TRACK_NAME,
  type MuxAssetData,
  type SocialMuxTrack,
} from "@/lib/social-mux-server";
import { readSocialMediaObjectOrThrow } from "@/lib/s3-social-media";
import { SOCIAL_TOPIC_MAX_IMAGES, type SocialTopicImage } from "@/lib/social-topic-tagging";

// What the topic tagger can see of a post's media. Images come from the
// Social media bucket; a Mux video gives three frames and, once Mux has
// transcribed it, its transcript (founder-approved). Transcription is
// requested here, the first time the tagger meets a ready video, so only
// videos the tagger reads are transcribed. Founder decision 2026-10-03
// (tagging only): the tagger's transcript track is listed in `cleanup` and
// deleted before the post is stamped, so viewers do not keep captions.
//
// "wait" means try again on a later run: the video, or its transcript, is
// still preparing. A video still preparing after SOCIAL_TOPIC_MEDIA_WAIT_MS
// is classified from the caption alone.
//
// Read errors throw, so the post is left untouched and retried. Only a
// permanent miss (a missing object, a Mux 4xx such as a deleted asset) reads
// as no media.

export const SOCIAL_TOPIC_MEDIA_WAIT_MS = 60 * 60 * 1000;
export const SOCIAL_TOPIC_IMAGE_MAX_EDGE = 1024;
export const SOCIAL_TOPIC_FRAME_WIDTH = 768;
export const SOCIAL_TOPIC_FRAME_POINTS = [0.15, 0.5, 0.85] as const;

/** A Mux text track the tagger created and must delete. */
export type SocialTopicTrackRef = { assetId: string; trackId: string };

export type SocialTopicMedia =
  | { status: "wait" }
  | {
      status: "ready";
      images: SocialTopicImage[];
      transcript: string | null;
      cleanup: SocialTopicTrackRef[];
    };

export type SocialTopicMediaDeps = {
  readImage: typeof readSocialMediaObjectOrThrow;
  retrieveAsset: (assetId: string) => Promise<MuxAssetData>;
  requestSubtitles: typeof requestSocialMuxGeneratedSubtitles;
  fetchTranscript: typeof fetchSocialMuxTranscript;
  fetchFrame: typeof fetchSocialMuxFrame;
  deleteTrack: typeof deleteSocialMuxTrack;
};

export const SOCIAL_TOPIC_LIVE_MEDIA_DEPS: SocialTopicMediaDeps = {
  readImage: readSocialMediaObjectOrThrow,
  retrieveAsset: (assetId) =>
    retrieveSocialMuxAsset(assetId, { signal: AbortSignal.timeout(SOCIAL_MUX_TOPIC_TIMEOUT_MS) }),
  requestSubtitles: requestSocialMuxGeneratedSubtitles,
  fetchTranscript: fetchSocialMuxTranscript,
  fetchFrame: fetchSocialMuxFrame,
  deleteTrack: deleteSocialMuxTrack,
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
      // JPEG has no alpha: transparent pixels would turn black.
      .flatten({ background: "#ffffff" })
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

type MuxVideo = SocialMediaItem & { playbackId: string; assetId: string };
type ReadyVideo = { item: MuxVideo; asset: MuxAssetData };

/**
 * The author's own ready asset for a video, null when the tagger reads
 * nothing from it, or "wait" while it is still preparing.
 */
/**
 * The author's own Mux asset behind a video item, or null when the tagger
 * reads nothing from it: no asset id, a deleted asset, or an asset that is
 * not the author's upload played by this playback id. Other errors throw.
 */
async function ownedMuxAsset(
  item: SocialMediaItem & { playbackId: string },
  authorId: string,
  deps: SocialTopicMediaDeps,
): Promise<{ item: MuxVideo; asset: MuxAssetData } | null> {
  if (!item.assetId) return null;
  let asset: MuxAssetData;
  try {
    asset = await deps.retrieveAsset(item.assetId);
  } catch (error) {
    // A deleted asset will not come back; anything else is retried.
    if (isSocialMuxPermanentError(error)) return null;
    throw error;
  }
  // Only the author's own upload, played by this playback id. A post that
  // names someone else's asset gets no frames, no transcript, no
  // transcription request, and no track deletes.
  if (
    !socialMuxPassthroughBoundToUser(asset.passthrough, authorId) ||
    !asset.playback_ids?.some((playback) => playback.id === item.playbackId)
  ) {
    return null;
  }
  return { item: { ...item, assetId: item.assetId }, asset };
}

/** The author's own ready asset for a video, null when the tagger reads nothing from it, or "wait". */
async function readyMuxAsset(
  item: SocialMediaItem & { playbackId: string },
  authorId: string,
  waitedOut: boolean,
  deps: SocialTopicMediaDeps,
): Promise<ReadyVideo | null | "wait"> {
  const owned = await ownedMuxAsset(item, authorId, deps);
  if (!owned) return null;
  if (owned.asset.status === "errored") return null;
  if (owned.asset.status !== "ready") return waitedOut ? null : "wait";
  return owned;
}

function isTaggerTrack(track: SocialMuxTrack): track is SocialMuxTrack & { id: string } {
  return !!track?.id && track.type === "text" && track.name === SOCIAL_MUX_TOPIC_TRACK_NAME;
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
 * waits for a preparing video. The eval script passes requestSubtitles:
 * false so it never starts a transcription. `signal` stops a post the run
 * has given up on before its next Mux or S3 call, so abandoned work ends
 * within one call's timeout.
 *
 * Every video must be ready before any transcript is read or requested, and
 * a post gets one transcript, from its first video with audio. So the tagger
 * never holds a ready track while another video keeps the post waiting, and
 * never transcribes a video whose text it would not use.
 */
export async function gatherSocialTopicMedia(
  post: {
    items: readonly SocialMediaItem[];
    authorId: string;
    createdAt: string;
    now: Date;
    requestSubtitles: boolean;
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

  // The transcript wait is not tied to the post's age: a post first seen
  // late (the switch-on backlog, an outage) still gets its transcript. The
  // 7-day selection window bounds it. The eval script never waits.
  let transcript: string | null = null;
  const source = [...videos.values()].find(
    ({ asset }) => generatedTextTrack(asset) || primaryAudioTrack(asset)?.id,
  );
  if (source) {
    const { item, asset } = source;
    const text = generatedTextTrack(asset);
    const audio = primaryAudioTrack(asset);
    if (text?.status === "ready" && text.id) {
      post.signal?.throwIfAborted();
      transcript = await deps.fetchTranscript(item.playbackId, text.id);
    } else if (post.requestSubtitles && text?.status === "preparing") {
      return { status: "wait" };
    } else if (post.requestSubtitles && !text && audio?.id) {
      post.signal?.throwIfAborted();
      try {
        await deps.requestSubtitles(item.assetId, audio.id);
        return { status: "wait" };
      } catch (error) {
        // Mux refused it (no speech, already queued): frames only.
        if (!isSocialMuxPermanentError(error)) throw error;
      }
    }
  }

  // The tagger's own tracks, read or errored, are deleted before the stamp.
  const cleanup: SocialTopicTrackRef[] = [];
  for (const { item, asset } of videos.values()) {
    for (const track of asset.tracks ?? []) {
      if (isTaggerTrack(track) && (track.status === "ready" || track.status === "errored")) {
        cleanup.push({ assetId: item.assetId, trackId: track.id });
      }
    }
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

  return { status: "ready", images: images.slice(0, SOCIAL_TOPIC_MAX_IMAGES), transcript, cleanup };
}

/**
 * The tagger's own caption tracks on a post it will no longer classify (the
 * author removed it, or staff hid it). Ready or errored tracks are listed
 * for deletion; `pending` is true while one is still being made, so a later
 * run deletes it.
 */
export async function socialTopicStrayTracks(
  post: { items: readonly SocialMediaItem[]; authorId: string; signal?: AbortSignal },
  deps: SocialTopicMediaDeps = SOCIAL_TOPIC_LIVE_MEDIA_DEPS,
): Promise<{ cleanup: SocialTopicTrackRef[]; pending: boolean }> {
  const cleanup: SocialTopicTrackRef[] = [];
  let pending = false;
  for (const item of post.items) {
    if (!isSocialMuxMediaItem(item)) continue;
    post.signal?.throwIfAborted();
    const owned = await ownedMuxAsset(item, post.authorId, deps);
    if (!owned) continue;
    for (const track of owned.asset.tracks ?? []) {
      if (!isTaggerTrack(track)) continue;
      if (track.status === "ready" || track.status === "errored") {
        cleanup.push({ assetId: owned.item.assetId, trackId: track.id });
      } else if (track.status === "preparing") {
        pending = true;
      }
    }
  }
  return { cleanup, pending };
}
