import { describe, expect, it } from "vitest";

import {
  muxAudioRenditionRequestSettled,
  muxAudioRenditionState,
  readBoundedBody,
  SOCIAL_MUSIC_AUDIO_MAX_BYTES,
} from "@/lib/social-music-audio";

describe("muxAudioRenditionState", () => {
  it("waits while the asset or the audio file is still preparing", () => {
    expect(muxAudioRenditionState({ status: "preparing" })).toBe("asset_preparing");
    expect(muxAudioRenditionState({ status: null })).toBe("asset_preparing");
    expect(
      muxAudioRenditionState({
        status: "ready",
        static_renditions: { files: [{ resolution: "audio-only", status: "preparing" }] },
      }),
    ).toBe("rendition_preparing");
    expect(
      muxAudioRenditionState({
        status: "ready",
        static_renditions: [{ name: "audio.m4a" }],
      }),
    ).toBe("rendition_preparing");
  });

  it("is ready only when an audio file status is ready", () => {
    expect(
      muxAudioRenditionState({
        status: "ready",
        static_renditions: { files: [{ ext: "m4a", status: "ready" }] },
      }),
    ).toBe("ready");
    expect(
      muxAudioRenditionState({
        status: "ready",
        static_renditions: [{ resolution: "audio-only", status: "ready" }],
      }),
    ).toBe("ready");
  });

  it("reports a missing rendition, an errored asset, and an errored rendition", () => {
    expect(muxAudioRenditionState({ status: "ready", static_renditions: { files: [] } })).toBe("rendition_missing");
    expect(muxAudioRenditionState({ status: "errored" })).toBe("asset_errored");
    expect(
      muxAudioRenditionState({
        status: "ready",
        static_renditions: { files: [{ resolution: "audio-only", status: "errored" }] },
      }),
    ).toBe("rendition_errored");
    expect(
      muxAudioRenditionState({
        status: "ready",
        static_renditions: { files: [{ resolution: "audio-only", status: "skipped" }] },
      }),
    ).toBe("rendition_errored");
    expect(
      muxAudioRenditionState({
        status: "ready",
        tracks: [{ type: "video" }],
        static_renditions: { files: [{ resolution: "audio-only", status: "skipped" }] },
      }),
    ).toBe("no_audio");
    expect(
      muxAudioRenditionState({
        status: "ready",
        tracks: [{ type: "video" }, { type: "audio" }],
        static_renditions: { files: [{ resolution: "audio-only", status: "skipped" }] },
      }),
    ).toBe("rendition_errored");
  });

  it("treats an existing or in-progress rendition request as settled", () => {
    expect(muxAudioRenditionRequestSettled(Object.assign(new Error("Static rendition already exists"), { status: 400 }))).toBe(true);
    expect(muxAudioRenditionRequestSettled(new Error("Rendition is in progress"))).toBe(true);
    expect(muxAudioRenditionRequestSettled(Object.assign(new Error("conflict"), { status: 409 }))).toBe(true);
    expect(muxAudioRenditionRequestSettled(Object.assign(new Error("Mux request failed (503)"), { status: 503 }))).toBe(false);
  });
});

describe("readBoundedBody", () => {
  it("caps a stream at the audio byte limit", async () => {
    const chunks = [new Uint8Array(8), new Uint8Array(8)];
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        const next = chunks.shift();
        if (!next) controller.close();
        else controller.enqueue(next);
      },
    });
    const bytes = await readBoundedBody(new Response(body), 10);
    expect(bytes.byteLength).toBe(10);
    expect(SOCIAL_MUSIC_AUDIO_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it("rejects an empty or failed response", async () => {
    await expect(readBoundedBody(new Response(null, { status: 404 }), 10)).rejects.toThrow(/404/);
    await expect(readBoundedBody(new Response(new Uint8Array()), 10)).rejects.toThrow(/no bytes/);
  });
});
