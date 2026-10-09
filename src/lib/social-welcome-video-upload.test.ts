import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/social/actions", () => ({
  presignSocialMediaUpload: vi.fn(),
  createSocialMuxUpload: vi.fn(),
  finalizeSocialMuxUpload: vi.fn(),
  reportSocialMediaUploadFailure: vi.fn(),
}));

import { createSocialMuxUpload, presignSocialMediaUpload } from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import { uploadSocialWelcomeVideoFile, type SocialUploadXhr } from "@/lib/social-media-upload";

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

// docs/design-locks/social-profile-edit-window-lock-v1.md §Welcome video:
// the camera's clip becomes the profile's welcome video on the S3 posts lane.
describe("uploadSocialWelcomeVideoFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("puts the clip on the S3 posts lane with progress, never Mux", async () => {
    vi.mocked(presignSocialMediaUpload).mockResolvedValue({
      url: "https://s3.example/put",
      key: "uploads/u1/posts/clip.webm",
      kind: "video",
      contentType: "video/webm",
    } as never);
    const sent: { url?: string; type?: string } = {};
    const percents: Array<number | null> = [];
    const file = new File([new Uint8Array(100)], "clip.webm", { type: "video/webm" });
    const result = await uploadSocialWelcomeVideoFile(file, {
      onProgress: (progress) => percents.push(progress.percent),
      createXhr: () => fakeXhr(200, sent),
    });
    expect(result).toEqual({
      item: { kind: "video", key: "uploads/u1/posts/clip.webm", contentType: "video/webm" },
    });
    const body = vi.mocked(presignSocialMediaUpload).mock.calls[0]?.[0] as FormData;
    expect(body.get("lane")).toBe("posts");
    expect(body.get("content_type")).toBe("video/webm");
    expect(sent).toEqual({ url: "https://s3.example/put", type: "video/webm" });
    expect(percents).toEqual([50]);
    expect(createSocialMuxUpload).not.toHaveBeenCalled();
  });

  it("refuses a still and reports a failed PUT", async () => {
    const still = new File([new Uint8Array(4)], "still.png", { type: "image/png" });
    expect(await uploadSocialWelcomeVideoFile(still)).toEqual({ error: SOCIAL.stories.mediaType });
    expect(presignSocialMediaUpload).not.toHaveBeenCalled();

    vi.mocked(presignSocialMediaUpload).mockResolvedValue({
      url: "https://s3.example/put",
      key: "uploads/u1/posts/clip.webm",
      kind: "video",
      contentType: "video/webm",
    } as never);
    const file = new File([new Uint8Array(10)], "clip.webm", { type: "video/webm" });
    expect(await uploadSocialWelcomeVideoFile(file, { createXhr: () => fakeXhr(403, {}) })).toEqual({
      error: SOCIAL.home.uploadFailed,
    });
  });
});
