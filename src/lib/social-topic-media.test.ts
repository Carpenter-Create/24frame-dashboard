import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { SocialMediaItem } from "@/lib/social-media";
import type { MuxAssetData, SocialMuxTrack } from "@/lib/social-mux-server";
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

const PLAYBACK_ID = "playbackId0001";
const ASSET_ID = "assetId00000001";
const VIDEO_TRACK: SocialMuxTrack = { id: "videoTrack01", type: "video", status: "ready" };
const AUDIO_TRACK: SocialMuxTrack = { id: "audioTrack01", type: "audio", status: "ready", primary: true };
const TRANSCRIPT = "We lit the whole scene with one practical lamp.";
const NOTHING = { status: "ready", images: [], transcript: null };

function generatedText(status: string): SocialMuxTrack {
  return { id: "textTrack001", type: "text", text_source: "generated_vod", status };
}

function readyAsset(overrides: Partial<MuxAssetData> = {}): MuxAssetData {
  return {
    id: ASSET_ID,
    status: "ready",
    duration: 20,
    tracks: [VIDEO_TRACK, AUDIO_TRACK, generatedText("ready")],
    ...overrides,
  };
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
  };
}

function gather(
  items: SocialMediaItem[],
  deps: SocialTopicMediaDeps,
  { createdAt = YOUNG, requestSubtitles = true }: { createdAt?: string; requestSubtitles?: boolean } = {},
) {
  return gatherSocialTopicMedia(items, createdAt, NOW, { requestSubtitles }, deps);
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

  it("keeps the frames it could fetch and drops a transcript it could not", async () => {
    const deps = fakeDeps();
    deps.fetchFrame.mockImplementation(async (_playbackId, { time }) => {
      if (time === 10) return null;
      if (time === 17) throw new Error("Mux image request failed");
      return frameBytes(time);
    });
    deps.fetchTranscript.mockRejectedValue(new Error("Mux stream request failed"));

    expect(await gather([videoItem()], deps)).toEqual({
      status: "ready",
      images: [videoFrame(3)],
      transcript: null,
    });
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

  it("rethrows a failed asset lookup while young, and drops the video once waited out", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockRejectedValue(new Error("Mux request failed (503)"));

    await expect(gather([videoItem()], deps)).rejects.toThrow("Mux request failed (503)");
    expect(await gather([videoItem()], deps, { createdAt: WAITED_OUT })).toEqual(NOTHING);
    expect(deps.fetchFrame).not.toHaveBeenCalled();
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
  const framesOnly = { status: "ready", images: [3, 10, 17].map(videoFrame), transcript: null };

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
    deps.requestSubtitles.mockRejectedValue(new Error("Mux request failed (400)"));

    const media = await gather([videoItem()], deps);

    expect(deps.requestSubtitles).toHaveBeenCalledTimes(1);
    expect(media).toEqual(framesOnly);
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

describe("topic media fixes", () => {
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
