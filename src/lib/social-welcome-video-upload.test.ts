import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/social/actions", () => ({
  presignSocialMediaUpload: vi.fn(),
  createSocialMuxUpload: vi.fn(),
  finalizeSocialMuxUpload: vi.fn(async () => ({
    item: {
      kind: "video",
      key: "posts/u1/clip.webm",
      contentType: "video/webm",
      provider: "mux",
      playbackId: "playWEL000001",
      uploadId: "uploadWEL0001",
      assetId: "assetWEL00001",
    },
  })),
  reportSocialMediaUploadFailure: vi.fn(async () => undefined),
}));

import { createSocialMuxUpload, presignSocialMediaUpload } from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import { uploadSocialMuxVideoFile, type SocialUploadXhr } from "@/lib/social-media-upload";

function fakeXhr(status: number, sent: { url?: string; type?: string }) {
  const xhr: SocialUploadXhr = {
    status,
    open: (_method, url) => {
      sent.url = url;
    },
    setRequestHeader: (name, value) => {
      if (name === "Content-Type") sent.type = value;
    },
    send: () => {
      xhr.upload.onprogress?.({ loaded: 50, total: 100, lengthComputable: true });
      xhr.onload?.();
    },
    abort: () => undefined,
    upload: { onprogress: null },
    onload: null,
    onerror: null,
    onabort: null,
  };
  return xhr;
}

// Welcome video, camera and file pick, is uploadSocialMuxVideoFile on the
// posts lane. There is no second welcome upload helper, and that function
// does not presign to S3.
describe("uploadSocialMuxVideoFile welcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSocialMuxUpload).mockResolvedValue({
      url: "https://storage.example/mux-upload",
      key: "posts/u1/clip.webm",
      uploadId: "uploadWEL0001",
      kind: "video",
      contentType: "video/webm",
    });
  });

  it("puts a welcome clip on Mux with progress, and never presigns S3", async () => {
    const sent: { url?: string; type?: string } = {};
    const percents: Array<number | null> = [];
    const file = new File([new Uint8Array(100)], "clip.webm", { type: "video/webm" });
    const result = await uploadSocialMuxVideoFile(file, {
      lane: "posts",
      onProgress: (progress) => percents.push(progress.percent),
      createXhr: () => fakeXhr(200, sent),
      durationSeconds: 12,
    });
    expect(result).toEqual({
      item: {
        kind: "video",
        key: "posts/u1/clip.webm",
        contentType: "video/webm",
        provider: "mux",
        playbackId: "playWEL000001",
        uploadId: "uploadWEL0001",
        assetId: "assetWEL00001",
      },
    });
    const body = vi.mocked(createSocialMuxUpload).mock.calls[0]?.[0] as FormData;
    expect(body.get("lane")).toBe("posts");
    expect(body.get("content_type")).toBe("video/webm");
    expect(sent).toEqual({ url: "https://storage.example/mux-upload", type: "video/webm" });
    expect(percents).toEqual([50]);
    expect(presignSocialMediaUpload).not.toHaveBeenCalled();
  });

  it("refuses a clip past eight minutes and a failed upload before any S3 presign", async () => {
    const long = new File([new Uint8Array(10)], "clip.webm", { type: "video/webm" });
    expect(await uploadSocialMuxVideoFile(long, { lane: "posts", durationSeconds: 481 })).toEqual({
      error: SOCIAL.music.tooLong,
    });
    expect(presignSocialMediaUpload).not.toHaveBeenCalled();
    expect(createSocialMuxUpload).not.toHaveBeenCalled();

    const file = new File([new Uint8Array(10)], "clip.webm", { type: "video/webm" });
    expect(
      await uploadSocialMuxVideoFile(file, {
        lane: "posts",
        createXhr: () => fakeXhr(403, {}),
        durationSeconds: 8,
      }),
    ).toEqual({ error: SOCIAL.home.uploadFailed });
    expect(presignSocialMediaUpload).not.toHaveBeenCalled();
  });

  it("has one Mux welcome upload, and no welcome path can presign to S3", () => {
    const upload = readFileSync("src/lib/social-media-upload.ts", "utf8");
    const mux = upload.slice(upload.indexOf("export async function uploadSocialMuxVideoFile"));
    expect(upload).not.toContain("uploadSocialWelcomeVideoFile");
    expect(mux.startsWith("export async function uploadSocialMuxVideoFile")).toBe(true);
    expect(mux).not.toContain("presignSocialMediaUpload");
    expect(mux).toContain('const lane = options.lane ?? "posts"');

    const callers = [
      "src/components/social/social-go-live.tsx",
      "src/components/social/social-profile-edit.tsx",
      "src/lib/social-go-live-welcome.ts",
    ];
    for (const path of callers) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toContain("uploadSocialWelcomeVideoFile");
      expect(src, path).not.toContain("presignSocialMediaUpload");
    }
    const camera = readFileSync("src/components/social/social-go-live.tsx", "utf8");
    const save = camera.slice(camera.indexOf("async function saveWelcomeClip()"), camera.indexOf("const mirrored ="));
    expect(save).toContain("upload: uploadSocialMuxVideoFile,");
    const edit = readFileSync("src/components/social/social-profile-edit.tsx", "utf8");
    const pick = edit.slice(edit.indexOf("async function onWelcomePick"), edit.indexOf("function onWelcomeRemove"));
    expect(pick).toContain('uploadSocialMuxVideoFile(file, { lane: "posts" })');
    expect(pick).not.toContain("presignSocialMediaUpload");
  });
});
