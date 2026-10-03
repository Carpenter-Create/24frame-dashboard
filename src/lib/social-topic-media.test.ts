import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

import type { SocialMediaItem } from "@/lib/social-media";
import { SocialMuxRequestError, type MuxAssetData } from "@/lib/social-mux-server";
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
const NOTHING = { status: "ready", images: [] };

function readyAsset(overrides: Partial<MuxAssetData> = {}): MuxAssetData {
  return {
    id: ASSET_ID,
    status: "ready",
    duration: 20,
    passthrough: `${AUTHOR}:22222222-2222-4222-8222-222222222222`,
    playback_ids: [{ id: PLAYBACK_ID, policy: "signed" }],
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
    fetchFrame: vi.fn<SocialTopicMediaDeps["fetchFrame"]>(async (_playbackId, { time }) => frameBytes(time)),
  };
}

function gather(items: SocialMediaItem[], deps: SocialTopicMediaDeps, { createdAt = YOUNG }: { createdAt?: string } = {}) {
  return gatherSocialTopicMedia({ items, authorId: AUTHOR, createdAt, now: NOW }, deps);
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

  it("fills the remaining slots with video frames", async () => {
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
  });

  it("waits for a preparing video even when the post has images", async () => {
    const deps = fakeDeps();
    deps.readImage.mockResolvedValue({ bytes: await solidPng(40, 20), contentType: "image/png" });
    deps.retrieveAsset.mockResolvedValue(readyAsset({ status: "preparing" }));

    expect(await gather([imageItem(1), videoItem()], deps)).toEqual({ status: "wait" });
    expect(deps.readImage).not.toHaveBeenCalled();
  });
});

describe("gatherSocialTopicMedia: Mux video", () => {
  it("reads three frames of a ready video", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset({ duration: 21.7 }));

    const media = await gather([videoItem()], deps);

    expect(media).toEqual({
      status: "ready",
      images: [videoFrame(3), videoFrame(10), videoFrame(18)],
    });
    expect(deps.retrieveAsset).toHaveBeenCalledWith(ASSET_ID);
    expect(deps.fetchFrame.mock.calls).toEqual([
      [PLAYBACK_ID, { time: 3, width: 768 }],
      [PLAYBACK_ID, { time: 10, width: 768 }],
      [PLAYBACK_ID, { time: 18, width: 768 }],
    ]);
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

  it("skips a frame Mux says is gone", async () => {
    const deps = fakeDeps();
    deps.fetchFrame.mockImplementation(async (_playbackId, { time }) => (time === 10 ? null : frameBytes(time)));

    expect(await gather([videoItem()], deps)).toEqual({
      status: "ready",
      images: [videoFrame(3), videoFrame(17)],
    });
  });

  it("throws on a frame read error at any age, so the post is retried", async () => {
    const deps = fakeDeps();
    deps.fetchFrame.mockRejectedValueOnce(new Error("Mux image request failed (503)"));
    await expect(gather([videoItem()], deps)).rejects.toThrow("Mux image request failed (503)");

    deps.fetchFrame.mockRejectedValueOnce(new Error("Mux image request failed (502)"));
    await expect(gather([videoItem()], deps, { createdAt: WAITED_OUT })).rejects.toThrow(
      "Mux image request failed (502)",
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
  ])("reads nothing from $name", async ({ asset }) => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockResolvedValue(readyAsset(asset));

    expect(await gather([videoItem()], deps)).toEqual(NOTHING);
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

  it("waits for every video before reading any frame", async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(assets({}, { status: "preparing" }));

    expect(await gather([videoItem(), secondVideo()], deps)).toEqual({ status: "wait" });
    expect(deps.retrieveAsset.mock.calls).toEqual([[ASSET_ID], [ASSET_B]]);
    expect(deps.fetchFrame).not.toHaveBeenCalled();
  });

  it(`takes frames from each video in post order, up to ${SOCIAL_TOPIC_MAX_IMAGES} images`, async () => {
    const deps = fakeDeps();
    deps.retrieveAsset.mockImplementation(assets({}, { duration: 40 }));

    const media = await gather([videoItem(), secondVideo()], deps);

    expect(media).toEqual({
      status: "ready",
      images: [videoFrame(3), videoFrame(10), videoFrame(17), videoFrame(6)],
    });
    expect(deps.fetchFrame.mock.calls.slice(0, 4).map(([playbackId, { time }]) => [playbackId, time])).toEqual([
      [PLAYBACK_ID, 3],
      [PLAYBACK_ID, 10],
      [PLAYBACK_ID, 17],
      [PLAYBACK_B, 6],
    ]);
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
        { items: [videoItem()], authorId: AUTHOR, createdAt: YOUNG, now: NOW, signal: late.signal },
        frames,
      ),
    ).rejects.toThrow("post timed out");
    expect(frames.fetchFrame).toHaveBeenCalledTimes(1);
  });

  it("reads no asset once the run has given up on the post", async () => {
    const deps = fakeDeps();
    const stop = new AbortController();
    stop.abort(new Error("post timed out after 90000 ms"));

    await expect(
      gatherSocialTopicMedia(
        { items: [videoItem()], authorId: AUTHOR, createdAt: YOUNG, now: NOW, signal: stop.signal },
        deps,
      ),
    ).rejects.toThrow("post timed out");
    expect(deps.retrieveAsset).not.toHaveBeenCalled();
    expect(deps.fetchFrame).not.toHaveBeenCalled();
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
