import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SocialComposeUploadProgress, SocialComposeVideoPreview } from "@/components/social/social-create-compose";

import { SOCIAL } from "@/lib/social";
import { SOCIAL_IMAGE_MAX_BYTES, SOCIAL_VIDEO_MAX_BYTES } from "@/lib/social-media";
import {
  commitSocialComposeMediaItem,
  composeSlotMayUpload,
  composeVideoUploadPixels,
  planSocialComposeAttach,
  stampSocialComposeSourcePixels,
} from "@/lib/social-compose-video";
import {
  isSocialUploadAbort,
  putSocialMediaWithProgress,
  socialUploadPercent,
  type SocialUploadXhr,
} from "@/lib/social-media-upload";

describe("write compose video attach", () => {
  it("maps a typeless camera-roll clip onto video and leaves a typed still alone", () => {
    const clip = planSocialComposeAttach(new File([new Uint8Array([1, 2, 3])], "IMG_2048.MOV", { type: "" }));
    expect(clip.ok).toBe(true);
    if (!clip.ok) return;
    expect(clip.kind).toBe("video");
    expect(clip.file.type).toBe("video/quicktime");

    const still = planSocialComposeAttach(new File([new Uint8Array([1])], "still.jpg", { type: "image/jpeg" }));
    expect(still.ok).toBe(true);
    if (!still.ok) return;
    expect(still.kind).toBe("image");
    expect(still.file.type).toBe("image/jpeg");

    const jpg = planSocialComposeAttach(new File([new Uint8Array([1])], "still.jpg", { type: "image/jpg" }));
    expect(jpg.ok).toBe(true);
    if (!jpg.ok) return;
    expect(jpg.kind).toBe("image");
    expect(jpg.file.type).toBe("image/jpeg");
  });

  it("refuses an empty clip, a foreign type, and a file over the lane cap", () => {
    expect(planSocialComposeAttach(new File([], "empty.mp4", { type: "video/mp4" }))).toEqual({
      ok: false,
      error: SOCIAL.home.mediaMissing,
    });
    expect(planSocialComposeAttach(new File([new Uint8Array([1])], "notes.pdf", { type: "application/pdf" }))).toEqual({
      ok: false,
      error: SOCIAL.home.mediaType,
    });
    expect(
      planSocialComposeAttach(
        new File([new Uint8Array([1])], "huge.mp4", { type: "video/mp4" }),
      ).ok,
    ).toBe(true);
    const huge = new File([new Uint8Array(1)], "huge.mp4", { type: "video/mp4" });
    Object.defineProperty(huge, "size", { value: SOCIAL_VIDEO_MAX_BYTES + 1 });
    expect(planSocialComposeAttach(huge)).toEqual({ ok: false, error: SOCIAL.home.mediaTooLarge });
    const bigStill = new File([new Uint8Array(1)], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(bigStill, "size", { value: SOCIAL_IMAGE_MAX_BYTES + 1 });
    expect(planSocialComposeAttach(bigStill)).toEqual({ ok: false, error: SOCIAL.home.mediaTooLarge });
  });

  it("reports byte percent and resolves only a successful progress PUT", async () => {
    expect(socialUploadPercent(0, 0)).toBeNull();
    expect(socialUploadPercent(1, 0)).toBeNull();
    expect(socialUploadPercent(Number.NaN, 10)).toBeNull();
    expect(socialUploadPercent(1, 4)).toBe(25);
    expect(socialUploadPercent(4, 4)).toBe(100);
    expect(socialUploadPercent(8, 4)).toBe(100);

    const progress: Array<number | null> = [];
    let sent: Blob | null = null;
    const xhr: SocialUploadXhr = {
      status: 200,
      open: () => undefined,
      setRequestHeader: () => undefined,
      send: (body) => {
        sent = body;
        xhr.upload.onprogress?.({ loaded: 50, total: 100, lengthComputable: true });
        xhr.upload.onprogress?.({ loaded: 100, total: 0, lengthComputable: false });
        xhr.onload?.();
      },
      abort: () => xhr.onabort?.(),
      upload: { onprogress: null },
      onload: null,
      onerror: null,
      onabort: null,
    };
    const file = new Blob([new Uint8Array(100)]);
    await putSocialMediaWithProgress("https://mux.example/upload", file, "video/mp4", {
      createXhr: () => xhr,
      onProgress: (next) => progress.push(next.percent),
    });
    expect(sent).toBe(file);
    expect(progress).toEqual([50, 100]);

    const failed: SocialUploadXhr = {
      ...xhr,
      status: 500,
      send: () => failed.onload?.(),
      upload: { onprogress: null },
    };
    await expect(
      putSocialMediaWithProgress("https://mux.example/upload", file, "video/mp4", {
        createXhr: () => failed,
      }),
    ).rejects.toMatchObject({ name: "SocialUploadPutError", status: 500, message: "upload failed (500)" });

    const aborted = new DOMException("The operation was aborted.", "AbortError");
    expect(isSocialUploadAbort(aborted)).toBe(true);
  });

  it("renders a progress bar and a muted compose video before playback is ready", () => {
    const progress = renderToStaticMarkup(createElement(SocialComposeUploadProgress, { percent: 40 }));
    expect(progress).toContain('data-social-create-upload-progress=""');
    expect(progress).toContain('role="progressbar"');
    expect(progress).toContain('aria-valuenow="40"');
    expect(progress).toContain('aria-label="Adding"');
    expect(progress).toContain("width:40%");

    const video = renderToStaticMarkup(
      createElement(SocialComposeVideoPreview, { src: "blob:https://24frame.local/clip" }),
    );
    expect(video).toContain('data-social-create-video=""');
    expect(video).toContain('src="blob:https://24frame.local/clip"');
    expect(video).toContain('preload="auto"');
    expect(video).toContain("muted");
    expect(video).toContain("playsInline");
    expect(video).toContain("loop");
    expect(video).not.toContain('preload="metadata"');
    expect(video).not.toContain("data-social-create-video-poster");
    // Reads as video: a corner badge with a screen-reader name.
    expect(video).toContain('data-social-create-video-badge=""');
    expect(video).toContain('data-social-icon="video-camera"');
    expect(video).toContain(`<span class="sr-only">${SOCIAL.home.videoKind}</span>`);
  });

  it("uploads a queued clip only while its controller is live, and keeps real preview dims", () => {
    const live = new AbortController();
    expect(composeSlotMayUpload(live.signal)).toBe(true);
    live.abort();
    expect(composeSlotMayUpload(live.signal)).toBe(false);
    expect(composeSlotMayUpload(undefined)).toBe(false);
    expect(composeSlotMayUpload(null)).toBe(false);
    expect(composeVideoUploadPixels({ width: 3840, height: 2160 })).toEqual({
      width: 3840,
      height: 2160,
    });
    expect(composeVideoUploadPixels({ width: 0, height: 2160 })).toBeNull();
    expect(composeVideoUploadPixels({ width: Number.NaN, height: 10 })).toBeNull();
    expect(composeVideoUploadPixels(null)).toBeNull();
    expect(stampSocialComposeSourcePixels({ kind: "video" }, { width: 1080.2, height: 1920.8 })).toEqual({
      kind: "video",
      width: 1080,
      height: 1921,
    });
    expect(stampSocialComposeSourcePixels({ kind: "video" }, null)).toEqual({ kind: "video" });
    expect(commitSocialComposeMediaItem({ kind: "video", key: "clip" }, null)).toBeNull();
    expect(commitSocialComposeMediaItem({ kind: "video", key: "clip" }, { width: 0, height: 1920 })).toBeNull();
    expect(commitSocialComposeMediaItem({ kind: "video", key: "clip" }, { width: 1080, height: 1920 })).toEqual({
      kind: "video",
      key: "clip",
      width: 1080,
      height: 1920,
    });
    expect(
      commitSocialComposeMediaItem(
        {
          kind: "video",
          key: "posts/org/clip.mp4",
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
          playbackPolicy: "signed",
        },
        { width: 1080, height: 1920 },
      ),
    ).toEqual({
      kind: "video",
      key: "posts/org/clip.mp4",
      contentType: "video/mp4",
      provider: "mux",
      playbackId: "uNbxnGLKJ00yfbijDO8COxT",
      playbackPolicy: "signed",
      width: 1080,
      height: 1920,
    });
    expect(commitSocialComposeMediaItem({ kind: "image", key: "still" }, null)).toEqual({
      kind: "image",
      key: "still",
    });
  });

  it("shows compose progress and the story frame path, and skips the detached probe", () => {
    const forms = readFileSync("src/components/social/social-create-compose.tsx", "utf8");
    const upload = readFileSync("src/lib/social-media-upload.ts", "utf8");
    const chrome = readFileSync("src/lib/social-chrome.ts", "utf8");
    const textStart = forms.indexOf("export function SocialCreateCompose");
    const textEnd = forms.length;
    const text = forms.slice(forms.indexOf("function SocialComposeUploadProgress"), textEnd);
    const compose = forms.slice(textStart, textEnd);
    const loopAt = compose.indexOf("for (let index = 0; index < prepared.length");
    const loop = compose.slice(loopAt, compose.indexOf("} finally", loopAt));
    expect(text).toContain("data-social-create-upload-progress");
    expect(text).toContain("data-social-create-video");
    expect(text).not.toContain("data-social-create-video-poster");
    expect(text).toContain("bindStoryReviewVideo");
    expect(text).toContain("storyReviewMediaSrc");
    expect(text).toContain("storyReviewFrameSeconds");
    expect(text).toContain('preload="auto"');
    expect(text).toContain("muted");
    expect(text).toContain("playsInline");
    expect(text).toContain("autoPlay");
    expect(text).toContain("node.play()");
    // A muted loop; Reduce Motion holds one frame instead.
    expect(text).toContain('matchMedia?.("(prefers-reduced-motion: reduce)")');
    expect(text).toContain("node.loop = !still;");
    const hold = text.slice(text.indexOf("const hold = "), text.indexOf("const present"));
    expect(hold).toContain("if (!still ||");
    expect(hold).toContain("node.pause()");
    // Pixels still arrive when WebKit only sizes the clip once playback runs.
    expect(hold).toContain("if (!reported) reportPixels();");
    expect(hold.indexOf("reportPixels()")).toBeLessThan(hold.indexOf("if (!still ||"));
    const report = text.slice(text.indexOf("const reportPixels"), text.indexOf("const hold = "));
    expect(report).toContain("if (!pixels) return;");
    expect(report).toContain("reported = true;");
    const present = text.slice(text.indexOf("const present"), text.indexOf('addEventListener("loadedmetadata"'));
    expect(present).toContain("reportPixels()");
    // The seek paints a frame even when autoplay is refused.
    expect(present.indexOf("node.currentTime = frame")).toBeGreaterThan(-1);
    expect(present.indexOf("node.currentTime = frame")).toBeLessThan(present.indexOf("node.play()"));
    const previewFn = text.slice(
      text.indexOf("export function SocialComposeVideoPreview"),
      text.indexOf("function persistKeys"),
    );
    const previewJsx = previewFn.slice(previewFn.lastIndexOf("return ("));
    expect(previewJsx).toContain("loop");
    expect(previewJsx.indexOf("<video")).toBeLessThan(previewJsx.indexOf("data-social-create-video-badge"));
    expect(compose.indexOf("new AbortController()")).toBeGreaterThan(-1);
    expect(compose.indexOf("new AbortController()")).toBeLessThan(loopAt);
    expect(loop).not.toContain("new AbortController");
    expect(loop.indexOf("dismissedRef.current.has")).toBeLessThan(loop.indexOf("uploadSocialPostMedia"));
    expect(loop.indexOf("composeSlotMayUpload")).toBeLessThan(loop.indexOf("uploadSocialPostMedia"));
    expect(loop).toContain('slot.kind === "video" ? { intent: "video" as const } : {}');
    expect(loop).not.toContain('intent: "video",');
    expect(loop).not.toContain("composeVideoUploadPixels(measured)");
    expect(loop.indexOf("waitForComposePixels")).toBeGreaterThan(loop.indexOf("uploadSocialPostMedia"));
    expect(loop.indexOf("commitSocialComposeMediaItem")).toBeGreaterThan(loop.indexOf("waitForComposePixels"));
    const pixelWait = loop.slice(loop.indexOf("const measuredNow"), loop.indexOf("waitForComposePixels"));
    expect(pixelWait).toContain("!result.error");
    const mediaCommit = loop.lastIndexOf("setMedia");
    const dismissBeforeCommit = loop.lastIndexOf("dismissedRef.current.has", mediaCommit);
    expect(dismissBeforeCommit).toBeGreaterThan(loop.indexOf("uploadSocialPostMedia"));
    expect(dismissBeforeCommit).toBeLessThan(mediaCommit);
    expect(loop.slice(dismissBeforeCommit, mediaCommit)).not.toContain("await ");
    expect(text).toContain("socialMediaFrameFields");
    expect(loop).not.toContain('pixels: slot.kind === "video" ? null');
    expect(compose).not.toContain("probeSocialVideoPixels");
    expect(compose).toContain("SocialComposeVideoPreview");
    expect(compose).toContain("if (uploading) return;");
    expect(compose).toContain("disabled={uploading}");
    expect(compose).not.toContain("disabled={uploading ||");
    expect(text).not.toContain('preload="metadata"');
    expect(chrome).toContain("§5 same-slot overlay");
    expect(chrome).toContain('SOCIAL_WRITE_COMPOSE_PROGRESS_FILL_CLASS = "h-full rounded-full bg-accent"');
    expect(chrome).toContain("rounded-full bg-surface");
    expect(upload).not.toContain("options.pixels");
    expect(upload).not.toContain("probeSocialVideoPixels");
    expect(upload).not.toContain("source_width");
    expect(upload).toContain("putSocialMediaWithProgress");
    expect(upload).toContain('headers: { "Content-Type": signed.contentType }');
    expect(upload).not.toContain("Cache-Control");
    const stillPut = upload.slice(
      upload.indexOf("async function uploadSocialS3Media"),
      upload.indexOf("export async function uploadSocialMuxVideoFile"),
    );
    expect(stillPut).toContain("fetch(signed.url");
    expect(stillPut).not.toContain("putSocialMediaWithProgress");
  });
});
