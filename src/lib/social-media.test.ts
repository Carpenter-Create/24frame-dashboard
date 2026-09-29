import { describe, expect, it } from "vitest";

import {
  isForbiddenMediaBucket,
  isForbiddenMediaKey,
  isOwnedSocialMediaKey,
  mediaItemsForInsert,
  ownedMediaItems,
  profileCoverKeyFromMedia,
  readStoryInputPick,
  storyImageAccept,
  storyPickFile,
  welcomeVideoKeyFromMedia,
  parsePostMedia,
  socialMediaObjectKey,
  socialPublishedVideoRejection,
  storedSocialMediaRejection,
  validateMediaUpload,
} from "./social-media";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";

describe("social media keys", () => {
  it("namespaces image and video keys under posts/{user}/{object}", () => {
    expect(socialMediaObjectKey(USER, OBJECT, "image/jpeg")).toBe(
      `posts/${USER}/${OBJECT}.jpg`,
    );
    expect(socialMediaObjectKey(USER, OBJECT, "video/mp4")).toBe(
      `posts/${USER}/${OBJECT}.mp4`,
    );
    expect(isOwnedSocialMediaKey(`posts/${USER}/${OBJECT}.jpg`, USER)).toBe(true);
    expect(socialMediaObjectKey(USER, OBJECT, "image/jpeg", "stories")).toBe(
      `stories/${USER}/${OBJECT}.jpg`,
    );
    expect(isOwnedSocialMediaKey(`stories/${USER}/${OBJECT}.jpg`, USER, "stories")).toBe(true);
    expect(isOwnedSocialMediaKey(`stories/${USER}/${OBJECT}.jpg`, USER)).toBe(false);
  });

  it("rejects title-bucket keys, traversal, and avatar prefixes", () => {
    expect(isForbiddenMediaKey(`orgs/${USER}/titles/${OBJECT}/master/a.mov`)).toBe(true);
    expect(isForbiddenMediaKey("titles/film.mov")).toBe(true);
    expect(isForbiddenMediaKey(`avatars/${USER}/avatar`)).toBe(true);
    expect(isForbiddenMediaKey("gc-content-assets/posts/x.jpg")).toBe(true);
    expect(isForbiddenMediaKey(`posts/${USER}/../${OBJECT}.jpg`)).toBe(true);
    expect(isForbiddenMediaKey("/posts/abs.jpg")).toBe(true);
    expect(isOwnedSocialMediaKey(`orgs/${USER}/titles/${OBJECT}/master/a.mov`, USER)).toBe(false);
    expect(isOwnedSocialMediaKey(`posts/${OBJECT}/${OBJECT}.jpg`, USER)).toBe(false);
  });

  it("refuses S3_BUCKET and gc-content-assets as media buckets", () => {
    expect(isForbiddenMediaBucket("test-bucket")).toBe(true);
    expect(isForbiddenMediaBucket("gc-content-assets")).toBe(true);
    expect(isForbiddenMediaBucket("test-avatars-bucket")).toBe(true);
    expect(isForbiddenMediaBucket("24frame-media-source-prod")).toBe(false);
    expect(isForbiddenMediaBucket("test-media-source-bucket")).toBe(false);
    expect(isForbiddenMediaBucket("24frame-education-source-prod")).toBe(true);
    expect(isForbiddenMediaBucket("24frame-finance-prod")).toBe(true);
  });
});

describe("posts.media persist shape", () => {
  it("keeps owned image and video keys and drops junk", () => {
    const key = `posts/${USER}/${OBJECT}.jpg`;
    const video = `posts/${USER}/${OBJECT}.mp4`;
    expect(
      parsePostMedia([
        { kind: "image", key, contentType: "image/jpeg" },
        { kind: "video", key: video, contentType: "video/mp4" },
        { kind: "image", key: `orgs/${USER}/titles/x`, contentType: "image/jpeg" },
      ]),
    ).toEqual([
      { kind: "image", key, contentType: "image/jpeg" },
      { kind: "video", key: video, contentType: "video/mp4" },
    ]);
  });

  it("rejects another author's key on insert and on read", () => {
    const foreign = {
      kind: "image" as const,
      key: `posts/${OTHER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    const owned = {
      kind: "image" as const,
      key: `posts/${USER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    expect(mediaItemsForInsert([foreign], USER)).toEqual({ ok: false, error: "forbidden" });
    expect(mediaItemsForInsert([foreign], USER, "stories")).toEqual({ ok: false, error: "forbidden" });
    expect(mediaItemsForInsert([{ ...foreign, key: `stories/${OTHER}/${OBJECT}.jpg` }], USER, "stories")).toEqual({
      ok: false,
      error: "forbidden",
    });
    expect(ownedMediaItems([owned, foreign], USER)).toEqual([owned]);
    expect(ownedMediaItems([{ ...foreign, key: `stories/${OTHER}/${OBJECT}.jpg` }], USER, "stories")).toEqual([]);
  });

  it("accepts one owned video as the welcome pointer", () => {
    const video = {
      kind: "video" as const,
      key: `posts/${USER}/${OBJECT}.mp4`,
      contentType: "video/mp4" as const,
    };
    const image = {
      kind: "image" as const,
      key: `posts/${USER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    expect(welcomeVideoKeyFromMedia([video], USER)).toBe(video.key);
    expect(welcomeVideoKeyFromMedia([image], USER)).toBeNull();
    expect(welcomeVideoKeyFromMedia([video, image], USER)).toBeNull();
  });

  it("accepts one owned still as the profile cover pointer", () => {
    const video = {
      kind: "video" as const,
      key: `posts/${USER}/${OBJECT}.mp4`,
      contentType: "video/mp4" as const,
    };
    const image = {
      kind: "image" as const,
      key: `posts/${USER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    expect(profileCoverKeyFromMedia([image], USER)).toBe(image.key);
    expect(profileCoverKeyFromMedia([video], USER)).toBeNull();
    expect(profileCoverKeyFromMedia([image, video], USER)).toBeNull();
  });

  it("rejects title keys on insert even when the rest is valid", () => {
    const owned = {
      kind: "image" as const,
      key: `posts/${USER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    expect(mediaItemsForInsert([owned], USER)).toEqual({ ok: true, items: [owned] });
    expect(
      mediaItemsForInsert(
        [
          owned,
          {
            kind: "video",
            key: `orgs/${USER}/titles/${OBJECT}/master/clip.mp4`,
            contentType: "video/mp4",
          },
        ],
        USER,
      ),
    ).toEqual({ ok: false, error: "forbidden" });
  });

  it("bounds type and size", () => {
    expect(validateMediaUpload({ contentType: "image/jpeg", byteLength: 12 })).toMatchObject({
      ok: true,
      kind: "image",
    });
    expect(validateMediaUpload({ contentType: "video/mp4", byteLength: 12 })).toMatchObject({
      ok: true,
      kind: "video",
    });
    expect(validateMediaUpload({ contentType: "application/pdf", byteLength: 12 })).toEqual({
      ok: false,
      error: "type",
    });
    expect(validateMediaUpload({ contentType: "image/jpeg", byteLength: 11 * 1024 * 1024 })).toEqual({
      ok: false,
      error: "tooLarge",
    });
    expect(validateMediaUpload({ contentType: "image/jpeg", byteLength: 0 })).toEqual({
      ok: false,
      error: "missing",
    });
    expect(validateMediaUpload({ contentType: "image/jpeg", byteLength: 1.5 })).toEqual({
      ok: false,
      error: "missing",
    });
  });

  it("rejects a stored object that is missing, oversized, or a different type", () => {
    const image = { kind: "image" as const, contentType: "image/jpeg" };
    const video = { kind: "video" as const, contentType: "video/mp4" };
    expect(storedSocialMediaRejection(image, null)).toBe("missing");
    expect(storedSocialMediaRejection(image, { bytes: 0, contentType: "image/jpeg" })).toBe("missing");
    expect(storedSocialMediaRejection(image, { bytes: 11 * 1024 * 1024, contentType: "image/jpeg" })).toBe(
      "tooLarge",
    );
    expect(storedSocialMediaRejection(image, { bytes: 1200, contentType: "video/mp4" })).toBe("type");
    expect(storedSocialMediaRejection(image, { bytes: 1200, contentType: "image/jpeg" })).toBeNull();
    expect(storedSocialMediaRejection(image, { bytes: 1200, contentType: null })).toBeNull();
    expect(storedSocialMediaRejection(video, { bytes: 250 * 1024 * 1024, contentType: "video/mp4" })).toBeNull();
    expect(storedSocialMediaRejection(video, { bytes: 250 * 1024 * 1024 + 1, contentType: "video/mp4" })).toBe(
      "tooLarge",
    );
  });

  it("accepts one still or one video on the stories lane and keeps posts open to stills", () => {
    const storyImage = {
      kind: "image" as const,
      key: `stories/${USER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    const storyVideo = {
      kind: "video" as const,
      key: `stories/${USER}/${OBJECT}.mp4`,
      contentType: "video/mp4" as const,
    };
    const postImage = {
      kind: "image" as const,
      key: `posts/${USER}/${OBJECT}.jpg`,
      contentType: "image/jpeg" as const,
    };
    expect(mediaItemsForInsert([storyImage], USER, "stories")).toEqual({ ok: true, items: [storyImage] });
    expect(
      mediaItemsForInsert(
        [{ ...storyImage, key: `stories/${USER}/${OBJECT}.png`, contentType: "image/png" }],
        USER,
        "stories",
      ),
    ).toEqual({
      ok: true,
      items: [{ ...storyImage, key: `stories/${USER}/${OBJECT}.png`, contentType: "image/png" }],
    });
    expect(
      mediaItemsForInsert(
        [{ ...storyImage, key: `stories/${USER}/${OBJECT}.webp`, contentType: "image/webp" }],
        USER,
        "stories",
      ),
    ).toEqual({
      ok: true,
      items: [{ ...storyImage, key: `stories/${USER}/${OBJECT}.webp`, contentType: "image/webp" }],
    });
    expect(
      mediaItemsForInsert(
        [{ ...storyImage, key: `stories/${USER}/${OBJECT}.gif`, contentType: "image/gif" }],
        USER,
        "stories",
      ),
    ).toEqual({
      ok: true,
      items: [{ ...storyImage, key: `stories/${USER}/${OBJECT}.gif`, contentType: "image/gif" }],
    });
    expect(mediaItemsForInsert([storyVideo], USER, "stories")).toEqual({ ok: true, items: [storyVideo] });
    expect(mediaItemsForInsert([postImage], USER)).toEqual({ ok: true, items: [postImage] });
    expect(validateMediaUpload({ contentType: "image/jpeg", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "image",
    });
    expect(validateMediaUpload({ contentType: "image/png", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "image",
    });
    expect(validateMediaUpload({ contentType: "image/webp", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "image",
    });
    expect(validateMediaUpload({ contentType: "image/gif", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "image",
    });
    expect(validateMediaUpload({ contentType: "video/mp4", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "video",
    });
    expect(validateMediaUpload({ contentType: "video/quicktime", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "video",
    });
    expect(validateMediaUpload({ contentType: "video/webm", byteLength: 12, lane: "stories" })).toMatchObject({
      ok: true,
      kind: "video",
    });
  });

  it("keeps Mux playback ids on owned post and story video", () => {
    const video = {
      kind: "video" as const,
      key: `posts/${USER}/${OBJECT}.mp4`,
      contentType: "video/mp4" as const,
      provider: "mux" as const,
      playbackId: "uNbxnGLKJ00yfbijDO8COxT",
      uploadId: "zd01Pe2bNpYhxbrwYABgFE",
      assetId: "SqQnqz6s5MBuXGvJaUWdXu",
    };
    expect(mediaItemsForInsert([video], USER)).toEqual({ ok: true, items: [video] });
    expect(mediaItemsForInsert([{ ...video, width: 1080, height: 1920 }], USER)).toEqual({
      ok: true,
      items: [{ ...video, width: 1080, height: 1920 }],
    });
    expect(mediaItemsForInsert([{ ...video, width: 0, height: 1920 }], USER)).toEqual({
      ok: true,
      items: [video],
    });
    expect(mediaItemsForInsert([{ ...video, playbackPolicy: "signed" }], USER)).toEqual({
      ok: true,
      items: [{ ...video, playbackPolicy: "signed" }],
    });
    expect(mediaItemsForInsert([{ ...video, playbackPolicy: "public" }], USER)).toEqual({
      ok: true,
      items: [{ ...video, playbackPolicy: "public" }],
    });
    expect(parsePostMedia([{ ...video, playbackPolicy: "public" }])).toEqual([
      { ...video, playbackPolicy: "public" },
    ]);
    expect(mediaItemsForInsert([{ ...video, playbackPolicy: "open" }], USER)).toEqual({
      ok: false,
      error: "invalid",
    });
    expect(parsePostMedia([{ ...video, playbackPolicy: "open" }])).toEqual([]);
    expect(parsePostMedia([video, { ...video, playbackId: "short" }])).toEqual([video]);
    expect(
      mediaItemsForInsert(
        [{ ...video, key: `stories/${USER}/${OBJECT}.mp4` }],
        USER,
        "stories",
      ),
    ).toEqual({
      ok: true,
      items: [{ ...video, key: `stories/${USER}/${OBJECT}.mp4` }],
    });
    expect(
      mediaItemsForInsert([{ ...video, provider: "mux", playbackId: undefined }], USER),
    ).toEqual({ ok: false, error: "invalid" });
    expect(socialPublishedVideoRejection([video])).toBeNull();
    expect(
      socialPublishedVideoRejection([
        { kind: "video", key: `stories/${USER}/${OBJECT}.mp4`, contentType: "video/mp4" },
      ]),
    ).toBe("type");
  });
});

describe("story library pick", () => {
  it("keeps the file when clearing the input empties the live list", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "still.jpg", { type: "" });
    const live = {
      files: { length: 1, 0: file } as { length: number; 0?: File },
      value: "",
    };
    Object.defineProperty(live, "value", {
      set(next: string) {
        if (next !== "") return;
        live.files.length = 0;
        delete live.files[0];
      },
    });
    const picked = readStoryInputPick(live);
    expect(picked).toBe(file);
    expect(live.files.length).toBe(0);
    expect(storyPickFile(file)).toMatchObject({ contentType: "image/jpeg", kind: "image" });
    expect(storyPickFile(new File([new Uint8Array([1])], "still.jpg", { type: "image/jpg" }))?.file.type).toBe(
      "image/jpeg",
    );
    expect(storyPickFile(new File([new Uint8Array([1])], "notes.txt", { type: "" }))).toBeNull();
    expect(storyPickFile(new File([new Uint8Array([1])], "IMG_2048.MOV", { type: "" }))).toMatchObject({
      contentType: "video/quicktime",
      kind: "video",
    });
    expect(
      storyPickFile(new File([new Uint8Array([1])], "clip.mp4", { type: "video/mp4;codecs=avc1" })),
    ).toMatchObject({ contentType: "video/mp4", kind: "video" });
    expect(storyImageAccept()).toContain(".jpg");
    expect(storyImageAccept()).not.toContain("capture");
  });
});
