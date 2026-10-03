import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/social/actions", () => ({
  createSocialMuxUpload: vi.fn(),
  finalizeSocialMuxUpload: vi.fn(),
  presignSocialMediaUpload: vi.fn(),
  reportSocialMediaUploadFailure: vi.fn(async () => undefined),
}));

import {
  createSocialMuxUpload,
  presignSocialMediaUpload,
  reportSocialMediaUploadFailure,
} from "@/app/(app)/social/actions";
import { SOCIAL } from "@/lib/social";
import { uploadSocialMuxVideoFile, uploadSocialPostMedia } from "@/lib/social-media-upload";

// The browser PUT is the one upload step the server never sees, so a failed
// PUT is reported with its step, lane and status, and nothing else.

const PHOTO_URL = "https://media.example/posts/upload/a/b.jpg?X-Amz-Signature=secret";
const MUX_URL = "https://storage.example/mux-upload?token=secret";

function reports(): Record<string, FormDataEntryValue>[] {
  return vi
    .mocked(reportSocialMediaUploadFailure)
    .mock.calls.map(([form]) => Object.fromEntries((form as FormData).entries()));
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const photo = () => new File([new Uint8Array([1, 2, 3])], "still.jpg", { type: "image/jpeg" });
const clip = () => new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });

beforeEach(() => {
  vi.mocked(presignSocialMediaUpload).mockResolvedValue({
    key: "posts/upload/a/b.jpg",
    url: PHOTO_URL,
    kind: "image",
    contentType: "image/jpeg",
  });
  vi.mocked(createSocialMuxUpload).mockResolvedValue({
    key: "stories/a/b.mp4",
    url: MUX_URL,
    uploadId: "zd01Pe2bNpYhxbrwYABgFE",
    kind: "video",
    contentType: "video/mp4",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("browser upload failure report", () => {
  it("reports a refused photo PUT with its status, never the URL", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 403 })));
    expect(await uploadSocialPostMedia([photo()], [])).toEqual({ error: SOCIAL.home.uploadFailed });
    await settle();
    expect(reports()).toEqual([{ step: "s3-put", lane: "posts", status: "403" }]);
  });

  it("reports a photo PUT that got no response as status 0", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    expect(await uploadSocialPostMedia([photo()], [], 4, "stories")).toEqual({ error: SOCIAL.home.uploadFailed });
    await settle();
    expect(reports()).toEqual([{ step: "s3-put", lane: "stories", status: "0" }]);
  });

  it("reports a refused Mux PUT, and nothing for a cancel or a success", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 400 })));
    expect(await uploadSocialMuxVideoFile(clip(), { lane: "stories" })).toEqual({ error: SOCIAL.home.uploadFailed });
    await settle();
    expect(reports()).toEqual([{ step: "mux-put", lane: "stories", status: "400" }]);

    vi.mocked(reportSocialMediaUploadFailure).mockClear();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new DOMException("The operation was aborted.", "AbortError"))),
    );
    expect(await uploadSocialMuxVideoFile(clip())).toEqual({ aborted: true });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    vi.mocked(presignSocialMediaUpload).mockResolvedValueOnce({
      key: "posts/upload/a/b.jpg",
      url: PHOTO_URL,
      kind: "image",
      contentType: "image/jpeg",
    });
    expect((await uploadSocialPostMedia([photo()], [])).items).toHaveLength(1);
    await settle();
    expect(reportSocialMediaUploadFailure).not.toHaveBeenCalled();
  });

  it("reports the XHR status when the progress PUT fails", async () => {
    class FailingXhr {
      status = 0;
      upload = { onprogress: null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onabort: (() => void) | null = null;
      open() {}
      setRequestHeader() {}
      abort() {}
      send() {
        this.onerror?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", FailingXhr);
    expect(await uploadSocialMuxVideoFile(clip(), { onProgress: () => undefined })).toEqual({
      error: SOCIAL.home.uploadFailed,
    });
    await settle();
    expect(reports()).toEqual([{ step: "mux-put", lane: "posts", status: "0" }]);

    vi.mocked(reportSocialMediaUploadFailure).mockClear();
    class RefusedXhr extends FailingXhr {
      send() {
        this.status = 413;
        this.onload?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", RefusedXhr);
    expect(await uploadSocialMuxVideoFile(clip(), { onProgress: () => undefined })).toEqual({
      error: SOCIAL.home.uploadFailed,
    });
    await settle();
    expect(reports()).toEqual([{ step: "mux-put", lane: "posts", status: "413" }]);
  });

  it("never lets a failed report surface", async () => {
    vi.mocked(reportSocialMediaUploadFailure).mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));
    expect(await uploadSocialPostMedia([photo()], [])).toEqual({ error: SOCIAL.home.uploadFailed });
    await settle();
    expect(reports()).toEqual([{ step: "s3-put", lane: "posts", status: "500" }]);
  });
});
