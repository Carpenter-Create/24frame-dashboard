import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { SocialMediaItem } from "@/lib/social-media";
import {
  SOCIAL_MUX_TOPIC_TRACK_NAME,
  SocialMuxRequestError,
  type MuxAssetData,
  type SocialMuxTrack,
} from "@/lib/social-mux-server";
import { SOCIAL_TOPIC_MAX_IMAGES } from "@/lib/social-topic-tagging";

import {
  gatherSocialTopicMedia,
  SOCIAL_TOPIC_MEDIA_WAIT_MS,
  socialTopicJpeg,
  type SocialTopicMediaDeps,
} from "./social-topic-media";

const NOW = new Date("2026-10-03T12:00:00.000Z");
// One millisecond short of the wait, and exactly at it.
const YOUNG = new Date(NOW.getTime() - SOCIAL_TOPIC_MEDIA_WAIT_MS + 1).toISOString();
const WAITED_OUT = new Date(NOW.getTime() - SOCIAL_TOPIC_MEDIA_WAIT_MS).toISOString();

const AUTHOR = "11111111-1111-4111-8111-111111111111";
const PLAYBACK_ID = "playbackId0001";
const ASSET_ID = "assetId00000001";
const VIDEO_TRACK: SocialMuxTrack = { id: "videoTrack01", type: "video", status: "ready" };
const AUDIO_TRACK: SocialMuxTrack = { id: "audioTrack01", type: "audio", status: "ready", primary: true };
const TRANSCRIPT = "We lit the whole scene with one practical lamp.";
const NOTHING = { status: "ready", images: [], transcript: null, cleanup: [] };
const OUR_TRACK = { assetId: ASSET_ID, trackId: "textTrack001" };

function generatedText(status: string, name = SOCIAL_MUX_TOPIC_TRACK_NAME): SocialMuxTrack {
  return { id: "textTrack001", type: "text", text_source: "generated_vod", status, name };
}

function readyAsset(overrides: Partial<MuxAssetData> = {}): MuxAssetData {
  return {
    id: ASSET_ID,
    status: "ready",
    duration: 20,
    passthrough: `${AUTHOR}:22222222-2222-4222-8222-222222222222`,
    playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
    tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("ready")],
    ...overrides,
  };
}

function muxError(status: number) {
  return new SocialMuxRequestError(`Mux request failed (${status})`, status);
}

function imageItem(n: number): SocialMediaItem {
  return { kind: "image", key: `posts/author/${n}.png`, contentType: "image/png" };
}

function videoItem(): SocialMediaItem {
  return {
    kind: "video",
    key: "posts/author/clip.mp4",
    contentType: "video/mp4",
    provider: "mux",
    playbackId: PLAYBACK_ID,
    assetId: ASSET_ID,
  };
}

function frameBytes(time: number): Uint8Array {
  return new TextEncoder().encode(`frame@${time}`);
}

function fakeDeps() {
  return {
    readImage: vi.fn<SocialTopicMediaDeps["readImage"]>(async () => null),
    retrieveAsset: vi.fn<SocialTopicMediaDeps["retrieveAsset"]>(async () => readyAsset()),
    requestSubtitles: vi.fn<SocialTopicMediaDeps["requestSubtitles"]>(async () => {}),
    fetchTranscript: vi.fn<SocialTopicMediaDeps["fetchTranscript"]>(async () => TRANSCRIPT),
    fetchFrame: vi.fn<SocialTopicMediaDeps["fetchFrame"]>(async (_playbackId, { time }) => frameBytes(time)),
    deleteTrack: vi.fn<SocialTopicMediaDeps["deleteTrack"]>(async () => {}),
  };
}

function gather(
  items: SocialMediaItem[],
  deps: SocialTopicMediaDeps,
  { createdAt = YOUNG, requestSubtitles = true }: { createdAt?: string; requestSubtitles?: boolean } = {},
) {
  return gatherSocialTopicMedia({ items, authorId: AUTHOR, createdAt, now: NOW, requestSubtitles }, deps);
}

function frameTimes(deps: ReturnType<typeof fakeDeps>): number[] {
  return deps.fetchFrame.mock.calls.map(([, frame]) => frame.time);
}

function videoFrame(time: number) {
  return {
    label: `Video frame at ${time}s`,
    mediaType: "image/jpeg",
    data: Buffer.from(frameBytes(time)).toString("base64"),
  };
}

async function solidPng(width: number, height: number): Promise<Uint8Array> {
  return sharp({ create: { width, height, channels: 3, background: { r: 30, g: 90, b: 160 } } })
    .png()
    .toBuffer();
}

async function decode(base64: string) {
  const { format, width, height } = await sharp(Buffer.from(base64, "base64")).metadata();
  return { format, width, height };
}

describe("socialTopicJpeg", () => {
  it("shrinks a large image to a 1024px long edge JPEG", async () => {
    const wide = await socialTopicJpeg(await solidPng(2000, 1000));
    expect(await decode(wide!)).toEqual({ format: "jpeg", width: 1024, height: 512 });

    const tall = await socialTopicJpeg(await solidPng(500, 2000));
    expect(await decode(tall!)).toEqual({ format: "jpeg", width: 256, height: 1024 });
  });

  it("never enlarges a small image", async () => {
    const small = await socialTopicJpeg(await solidPng(300, 200));
    expect(await decode(small!)).toEqual({ format: "jpeg", width: 300, height: 200 });
  });

  it("takes the first frame of an animated GIF", async () => {
    // Two 64x32 frames: red, then blue.
    const pixels = Buffer.alloc(64 * 64 * 3);
    for (let i = 0; i < 64 * 64; i += 1) {
      pixels.set(i < 64 * 32 ? [255, 0, 0] : [0, 0, 255], i * 3);
    }
    const gif = await sharp(pixels, { raw: { width: 64, height: 64, channels: 3, pageHeight: 32 } })
      .gif()
      .toBuffer();
    expect((await sharp(gif).metadata()).pages).toBe(2);

    const out = await socialTopicJpeg(gif);
    expect(await decode(out!)).toEqual({ format: "jpeg", width: 64, height: 32 });
    const [red, , blue] = (await sharp(Buffer.from(out!, "base64")).stats()).channels;
    expect(red!.mean).toBeGreaterThan(200);
    expect(blue!.mean).toBeLessThan(50);
  });

  it("turns a photo upright from its EXIF orientation", async () => {
    const sideways = await sharp({ create: { width: 200, height: 100, channels: 3, background: "#808080" } })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const out = await socialTopicJpeg(sideways);
    expect(await decode(out!)).toEqual({ format: "jpeg", width: 100, height: 200 });
  });

  it("returns null for bytes that are not an image", async () => {
    expect(await socialTopicJpeg(new TextEncoder().encode("not an image"))).toBeNull();
    expect(await socialTopicJpeg(new Uint8Array())).toBeNull();
  });
});

describe("gatherSocialTopicMedia: images", () => {
  it("reads images as numbered JPEGs and skips ones it cannot read", async () => {
    const deps = fakeDeps();
    const png = await solidPng(40, 20);
    deps.readImage.mockImplementation(async (key) => {
      if (key.endsWith("/2.png")) return null;
      if (key.endsWith("/3.png")) return { bytes: new TextEncoder().encode("garbage"), contentType: "image/png" };
      return { bytes: png, contentType: "image/png" };
    });

    const media = await gather([1, 2, 3, 4].map(imageItem), deps);

    expect(media).toEqual({
      status: "ready",
      images: [
        { label: "Image 1", mediaType: "image/jpeg", data: expect.any(String) },
        { label: "Image 2", mediaType: "image/jpeg", data: expect.any(String) },
      ],
      transcript: null,
      cleanup: [],
    });
    if (media.status !== "ready") throw new Error("expected ready");
    for (const image of media.images) {
      expect(await decode(image.data)).toEqual({ format: "jpeg", width: 40, height: 20 });
    }
    expect(deps.retrieveAsset).not.toHaveBeenCalled();
  });

  it(`stops at ${SOCIAL_TOPIC_MAX_IMAGES} images without reading the rest`, async () => {
    const deps = fakeDeps();
    const png = await solidPng(40, 20);
    deps.readImage.mockResolvedValue({ bytes: png, contentType: "image/png" });

    const media = await gather([1, 2, 3, 4, 5, 6].map(imageItem), deps);

    if (media.status !== "ready") throw new Error("expected ready");
    expect(media.images.map((image) => image.label)).toEqual(["Image 1", "Image 2", "Image 3", "Image 4"]);
    expect(deps.readImage.mock.calls.map(([key]) => key)).toEqual(
      [1, 2, 3, 4].map((n) => `posts/author/${n}.png`),
    );
  });

  it("fills the remaining slots with video frames and keeps the transcript", async () => {
    const deps = fakeDeps();
    deps.readImage.mockResolvedValue({ bytes: await solidPng(40, 20), contentType: "image/png" });

    const media = await gather([imageItem(1), imageItem(2), videoItem()], deps);

    if (media.status !== "ready") throw new Error("expected ready");
    expect(media.images.map((image) => image.label)).toEqual([
      "Image 1",
      "Image 2",
      "Video frame at 3s",
      "Video frame at 10s",
    ]);
    expect(media.transcript).toBe(TRANSCRIPT);
  });

  it("waits for a preparing video even when the post has images", async () => {
    const deps = fakeDeps();
    deps.readImage.mockResolvedValue({ bytes: await solidPng(40, 20), contentType: "image/png" });
    deps.retrieveAsset.mockResolvedValue(readyAsset({ status: "preparing" }));

    expect(await gather([imageItem(1), videoItem()], deps)).toEqual({ status: "wait" });
  });
});

describe("gatherSocialTopicMedia: Mux video", () => {
  it("reads three frames and the generated transcript of a ready video", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ duration: 21.7 }));

    const media = await gather([videoItem()], deps);

    expect(media).toEqual({
      status: "ready",
      images: [videoFrame(3), videoFrame(10), videoFrame(18)],
      transcript: TRANSCRIPT,
      cleanup: [OUR_TRACK],
    });
    expect(deps.retrieveAsset).toHaveBeenCalledWith(ASSET_ID);
    expect(deps.fetchTranscript).toHaveBeenCalledWith(PLAYBACK_ID, "textTrack001");
    expect(deps.fetchFrame.mock.calls).toEqual([
      [PLAYBACK_ID, { time: 3, width: 768 }],
      [PLAYBACK_ID, { time: 10, width: 768 }],
      [PLAYBACK_ID, { time: 18, width: 768 }],
    ]);
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
  });

  it.each([
    { duration: 2, times: [0, 1] },
    { duration: 1, times: [0] },
    { duration: 0, times: [0] },
    { duration: undefined, times: [0] },
  ])("asks for frames at $times for a duration of $duration", async ({ duration, times }) => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ duration }));

    const media = await gather([videoItem()], deps);

    expect(frameTimes(deps)).toEqual(times);
    expect(media).toMatchObject({ status: "ready", images: times.map(videoFrame) });
  });

  it("skips a frame or transcript Mux says is gone, still deleting the track", async () => {
    const deps = fakeDeps();
    deps.fetchFrame.mockImplementation(async (_playbackId, { time }) => (time === 10 ? null : frameBytes(time)));
    deps.fetchTranscript.mockResolvedValue(null);

    expect(await gather([videoItem()], deps)).toEqual({
      status: "ready",
      images: [videoFrame(3), videoFrame(17)],
      transcript: null,
      cleanup: [OUR_TRACK],
    });
  });

  it("throws on a frame or transcript read error, so the post is retried", async () => {
    const deps = fakeDeps();
    deps.fetchFrame.mockRejectedValueOnce(new Error("Mux image request failed (503)"));
    await expect(gather([videoItem()], deps)).rejects.toThrow("Mux image request failed (503)");

    deps.fetchTranscript.mockRejectedValueOnce(new Error("Mux transcript request failed (502)"));
    await expect(gather([videoItem()], deps, { createdAt: WAITED_OUT })).rejects.toThrow(
      "Mux transcript request failed (502)",
    );
  });

  it("waits for a preparing asset while the post is young", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ status: "preparing" }));

    expect(await gather([videoItem()], deps)).toEqual({ status: "wait" });
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it("stops waiting for a preparing asset once the wait runs out", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ status: "preparing" }));

    expect(await gather([videoItem()], deps, { createdAt: WAITED_OUT })).toEqual(NOTHING);
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it("classifies without an errored asset at once", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ status: "errored" }));

    expect(await gather([videoItem()], deps)).toEqual(NOTHING);
    expect(deps.fetchFrame).not.toHaveBeenCalled();
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
  });

  it("rethrows a failed asset lookup at any age, and drops a deleted asset", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockRejectedValue(muxError(503));
    await expect(gather([videoItem()], deps)).rejects.toThrow("Mux request failed (503)");
    await expect(gather([videoItem()], deps, { createdAt: WAITED_OUT })).rejects.toThrow("Mux request failed (503)");

    for (const status of [401, 403, 429]) {
      deps.retrieveAsset.mockRejectedValueOnce(muxError(status));
      await expect(gather([videoItem()], deps, { createdAt: WAITED_OUT })).rejects.toThrow(`(${status})`);
    }
    deps.retrieveAsset.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(gather([videoItem()], deps, { createdAt: WAITED_OUT })).rejects.toThrow("fetch failed");

    deps.retrieveAsset.mockRejectedValueOnce(muxError(404));
    expect(await gather([videoItem()], deps)).toEqual(NOTHING);
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it.each([
    { name: "another user's upload", asset: { passthrough: "33333333-3333-4333-8333-333333333333:object" } },
    { name: "an upload with no owner", asset: { passthrough: null } },
    { name: "an asset this playback id does not play", asset: { playback_ids: [{ id: "otherPlayback1", policy: "signed" }] } },
    { name: "an asset with no playback ids", asset: { playback_ids: undefined } },
  ])("reads nothing from $name and never asks Mux to transcribe it", async ({ asset }) => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ ...asset, tracks: [VIDEO_TRACK, AUDIO_TRACK] }));

    expect(await gather([videoItem()], deps)).toEqual(NOTHING);
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(deps.fetchFrame).not.toHaveBeenCalled();
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
  });

  it("makes no Mux calls for a video without an asset id", async () => {
    const deps = fakeDeps();
    const noAsset: SocialMediaItem = {
      kind: "video",
      key: "posts/author/clip.mp4",
      contentType: "video/mp4",
      provider: "mux",
      playbackId: PLAYBACK_ID,
    };

    expect(await gather([noAsset], deps)).toEqual(NOTHING);
    expect(deps.retrieveAsset).not.toHaveBeenCalled();
    expect(deps.fetchFrame).not.toHaveBeenCalled();
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
  });
});

describe("gatherSocialTopicMedia: transcripts", () => {
  const noText = readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK] });
  const framesOnly = { status: "ready", images: [3, 10, 17].map(videoFrame), transcript: null, cleanup: [] };

  it("requests a transcript once from the primary audio track, then waits", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(
      readyAsset({
        tracks: [VIDEO_TRACK, { id: "audioTrack02", type: "audio", status: "ready" }, AUDIO_TRACK],
      }),
    );

    expect(await gather([videoItem()], deps)).toEqual({ status: "wait" });
    expect(deps.requestSubtitles).toHaveBeenCalledTimes(1);
    expect(deps.requestSubtitles).toHaveBeenCalledWith(ASSET_ID, "audioTrack01");
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it("falls back to the first ready audio track when the primary one is not ready", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(
      readyAsset({
        tracks: [
          { id: "audioTrack01", type: "audio", status: "preparing", primary: true },
          { id: "audioTrack02", type: "audio", status: "ready" },
        ],
      }),
    );

    expect(await gather([videoItem()], deps)).toEqual({ status: "wait" });
    expect(deps.requestSubtitles).toHaveBeenCalledWith(ASSET_ID, "audioTrack02");
  });

  it("treats a deleted generated track as no transcript and requests a new one", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(
      readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("deleted")] }),
    );

    expect(await gather([videoItem()], deps)).toEqual({ status: "wait" });
    expect(deps.requestSubtitles).toHaveBeenCalledWith(ASSET_ID, "audioTrack01");
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
  });

  it("never starts a transcription when requestSubtitles is false", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(noText);

    const media = await gather([videoItem()], deps, { requestSubtitles: false });

    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(media).toEqual(framesOnly);
  });

  // A post first seen late (the switch-on backlog, an outage) still gets
  // its transcript; the 7-day selection window bounds the wait.
  it("requests a transcription for an older post too", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(noText);

    expect(await gather([videoItem()], deps, { createdAt: WAITED_OUT })).toEqual({ status: "wait" });
    expect(deps.requestSubtitles).toHaveBeenCalledWith(ASSET_ID, "audioTrack01");
  });

  it("classifies from frames when Mux refuses the transcription request", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(noText);
    deps.requestSubtitles.mockRejectedValue(muxError(400));

    const media = await gather([videoItem()], deps);

    expect(deps.requestSubtitles).toHaveBeenCalledTimes(1);
    // The asset is read again before falling back, to find a queued track.
    expect(deps.retrieveAsset).toHaveBeenCalledTimes(2);
    expect(media).toEqual(framesOnly);
  });

  it("waits for a track Mux already queued when it refuses the request", async () => {
    const deps = fakeDeps();
    // Another run's request: the track appears after this run's first read.
    deps.retrieveAsset
      .mockResolvedValueOnce(noText)
      .mockResolvedValueOnce(readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("preparing")] }));
    deps.requestSubtitles.mockRejectedValue(muxError(400));

    expect(await gather([videoItem()], deps)).toEqual({ status: "wait" });
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it("classifies from frames when the asset is gone on the second read, and retries other errors", async () => {
    const deps = fakeDeps();
    deps.requestSubtitles.mockRejectedValue(muxError(400));

    deps.retrieveAsset.mockResolvedValueOnce(noText).mockRejectedValueOnce(muxError(404));
    expect(await gather([videoItem()], deps)).toEqual(framesOnly);

    deps.retrieveAsset.mockResolvedValueOnce(noText).mockRejectedValueOnce(muxError(503));
    await expect(gather([videoItem()], deps)).rejects.toThrow("(503)");
  });

  it("throws when the transcription request fails for a reason worth retrying", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(noText);
    deps.requestSubtitles.mockRejectedValueOnce(muxError(503));
    await expect(gather([videoItem()], deps)).rejects.toThrow("(503)");
    deps.requestSubtitles.mockRejectedValueOnce(new Error("The operation was aborted due to timeout"));
    await expect(gather([videoItem()], deps)).rejects.toThrow("timeout");
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it("deletes only the tagger's own track, ready or errored", async () => {
    const deps = fakeDeps();

    deps.retrieveAsset.mockResolvedValue(readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("errored")] }));
    expect(await gather([videoItem()], deps)).toEqual({ ...framesOnly, cleanup: [OUR_TRACK] });
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(deps.fetchTranscript).not.toHaveBeenCalled();

    // Captions someone else added stay; their text is still read.
    deps.retrieveAsset.mockResolvedValue(
      readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("ready", "English (generated)")] }),
    );
    expect(await gather([videoItem()], deps)).toMatchObject({ transcript: TRANSCRIPT, cleanup: [] });
    deps.retrieveAsset.mockResolvedValue(
      readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK, { ...generatedText("ready"), name: undefined }] }),
    );
    expect(await gather([videoItem()], deps)).toMatchObject({ transcript: TRANSCRIPT, cleanup: [] });
    expect(deps.deleteTrack).not.toHaveBeenCalled();
  });

  it("classifies from frames when the video has no ready audio track", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ tracks: [VIDEO_TRACK] }));

    const media = await gather([videoItem()], deps);

    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(media).toEqual(framesOnly);
  });

  it("waits for a preparing transcript at any age, unless it may not request one", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(
      readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("preparing")] }),
    );

    expect(await gather([videoItem()], deps)).toEqual({ status: "wait" });
    expect(await gather([videoItem()], deps, { createdAt: WAITED_OUT })).toEqual({ status: "wait" });
    expect(deps.fetchFrame).not.toHaveBeenCalled();

    // The eval script reads the video as it is now.
    const media = await gather([videoItem()], deps, { requestSubtitles: false });
    expect(media).toEqual(framesOnly);
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
  });
});

describe("gatherSocialTopicMedia: posts with more than one video", () => {
  const ASSET_B = "assetId00000002";
  const PLAYBACK_B = "playbackId0002";

  function secondVideo(): SocialMediaItem {
    return { ...videoItem(), key: "posts/author/clip-b.mp4", playbackId: PLAYBACK_B, assetId: ASSET_B };
  }

  function assets(a: Partial<MuxAssetData>, b: Partial<MuxAssetData>) {
    return async (assetId: string) =>
      assetId === ASSET_ID
        ? readyAsset(a)
        : readyAsset({ id: ASSET_B, playback_ids: [{ id: PLAYBACK_B, policy: "signed" }], ...b });
  }

  it("waits for every video before reading or requesting any transcript", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(assets({}, { status: "preparing" }));

    expect(await gather([videoItem(), secondVideo()], deps)).toEqual({ status: "wait" });
    expect(deps.fetchTranscript).not.toHaveBeenCalled();
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it("transcribes only the first video, and deletes its track", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(assets({}, { tracks: [VIDEO_TRACK, AUDIO_TRACK] }));

    const media = await gather([videoItem(), secondVideo()], deps);

    expect(deps.requestSubtitles).not.toHaveBeenCalled();
    expect(deps.fetchTranscript.mock.calls).toEqual([[PLAYBACK_ID, "textTrack001"]]);
    expect(media).toMatchObject({ status: "ready", transcript: TRANSCRIPT, cleanup: [OUR_TRACK] });
  });

  it("requests one transcript, for the first video, when none has one", async () => {
    const deps = fakeDeps();
    const noText = { tracks: [VIDEO_TRACK, AUDIO_TRACK] };
    deps.retrieveAsset.mockImplementation(assets(noText, noText));

    expect(await gather([videoItem(), secondVideo()], deps)).toEqual({ status: "wait" });
    expect(deps.requestSubtitles.mock.calls).toEqual([[ASSET_ID, "audioTrack01"]]);
  });

  it("takes the transcript from the first video that has audio", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(assets({ tracks: [VIDEO_TRACK] }, { tracks: [VIDEO_TRACK, AUDIO_TRACK] }));

    expect(await gather([videoItem(), secondVideo()], deps)).toEqual({ status: "wait" });
    expect(deps.requestSubtitles.mock.calls).toEqual([[ASSET_B, "audioTrack01"]]);
  });

  it("waits for a tagger track still being made on any video when told to wait", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(
      assets({}, { tracks: [VIDEO_TRACK, AUDIO_TRACK, { ...generatedText("preparing"), id: "textTrack002" }] }),
    );
    const call = (waitForPreparing: boolean) =>
      gatherSocialTopicMedia(
        {
          items: [videoItem(), secondVideo()],
          authorId: AUTHOR,
          createdAt: YOUNG,
          now: NOW,
          requestSubtitles: false,
          waitForPreparing,
          signal: undefined,
        },
        deps,
      );

    expect(await call(true)).toEqual({ status: "wait" });
    expect(await call(false)).toMatchObject({ status: "ready", transcript: TRANSCRIPT, cleanup: [OUR_TRACK] });
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
  });

  it("lists every tagger track for deletion, and never one still preparing", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(
      assets({}, { tracks: [VIDEO_TRACK, AUDIO_TRACK, { ...generatedText("errored"), id: "textTrack002" }] }),
    );
    expect(await gather([videoItem(), secondVideo()], deps)).toMatchObject({
      cleanup: [OUR_TRACK, { assetId: ASSET_B, trackId: "textTrack002" }],
    });

    deps.retrieveAsset.mockImplementation(
      assets(
        { tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("ready", "English (generated)")] },
        { tracks: [VIDEO_TRACK, AUDIO_TRACK, { ...generatedText("preparing"), id: "textTrack002" }] },
      ),
    );
    // The tagger's own track on the second video is still being made: wait,
    // never stamp past it. Read as it is now (the eval), nothing is deleted.
    expect(await gather([videoItem(), secondVideo()], deps)).toEqual({ status: "wait" });
    expect(await gather([videoItem(), secondVideo()], deps, { requestSubtitles: false })).toMatchObject({
      transcript: TRANSCRIPT,
      cleanup: [],
    });
  });

  it("stops before its next Mux or S3 call once the run gives up on the post", async () => {
    const deps = fakeDeps();
    const stop = new AbortController();
    deps.readImage.mockImplementation(async () => {
      stop.abort(new Error("post timed out after 90000 ms"));
      return null;
    });

    await expect(
      gatherSocialTopicMedia(
        {
          items: [imageItem(1), imageItem(2), videoItem()],
          authorId: AUTHOR,
          createdAt: YOUNG,
          now: NOW,
          requestSubtitles: true,
          signal: stop.signal,
        },
        deps,
      ),
    ).rejects.toThrow("post timed out");
    expect(deps.readImage).toHaveBeenCalledTimes(1);
    expect(deps.fetchFrame).not.toHaveBeenCalled();

    // Mid-frames too: the frame after the abort is never fetched.
    const frames = fakeDeps();
    const late = new AbortController();
    frames.fetchFrame.mockImplementation(async (_playbackId, { time }) => {
      late.abort(new Error("post timed out after 90000 ms"));
      return frameBytes(time);
    });
    await expect(
      gatherSocialTopicMedia(
        { items: [videoItem()], authorId: AUTHOR, createdAt: YOUNG, now: NOW, requestSubtitles: true, signal: late.signal },
        frames,
      ),
    ).rejects.toThrow("post timed out");
    expect(frames.fetchFrame).toHaveBeenCalledTimes(1);
  });

  it("asks for no transcript once the run has given up on the post", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ tracks: [VIDEO_TRACK, AUDIO_TRACK] }));
    const stop = new AbortController();
    stop.abort(new Error("post timed out after 90000 ms"));

    await expect(
      gatherSocialTopicMedia(
        { items: [videoItem()], authorId: AUTHOR, createdAt: YOUNG, now: NOW, requestSubtitles: true, signal: stop.signal },
        deps,
      ),
    ).rejects.toThrow("post timed out");
    expect(deps.requestSubtitles).not.toHaveBeenCalled();
  });
});

describe("topic media fixes", () => {
  it("throws on an image read error instead of reading it as no image", async () => {
    const deps = fakeDeps();
    deps.readImage.mockRejectedValue(new Error("Access Denied"));
    await expect(gather([imageItem(1)], deps)).rejects.toThrow("Access Denied");
  });

  it("turns transparent pixels white, not black", async () => {
    const png = await sharp({
      create: { width: 40, height: 40, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
    })
      .png()
      .toBuffer();
    const data = await socialTopicJpeg(png);
    const stats = await sharp(Buffer.from(data!, "base64")).stats();
    expect(stats.channels.slice(0, 3).map((channel) => Math.round(channel.mean))).toEqual([255, 255, 255]);
  });

  it("numbers uploaded images on their own, after video frames", async () => {
    const deps = fakeDeps();
    const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#123456" } })
      .png()
      .toBuffer();
    deps.readImage.mockResolvedValue({ bytes: new Uint8Array(png), contentType: "image/png" });

    const media = await gather([videoItem(), imageItem(1)], deps);
    if (media.status !== "ready") throw new Error("expected ready media");
    expect(media.images.map((image) => image.label)).toEqual([
      "Video frame at 3s",
      "Video frame at 10s",
      "Video frame at 17s",
      "Image 1",
    ]);
  });
});
