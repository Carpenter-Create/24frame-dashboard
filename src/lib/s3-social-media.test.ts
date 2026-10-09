import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSend, mockGetSignedUrl } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockGetSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(function S3ClientMock() {
      return { send: mockSend };
    }),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@/lib/social-media-cloudfront", () => ({
  isMediaCloudfrontConfigured: vi.fn(() => false),
  signSocialMediaCloudfrontUrl: vi.fn(),
}));

import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { SOCIAL_IMAGE_MAX_BYTES } from "@/lib/social-media";
import { SOCIAL_IMAGE_PREVIOUS_KEY_METADATA, SOCIAL_IMAGE_REENCODED_METADATA } from "@/lib/social-image-reencode";
import { isMediaCloudfrontConfigured, signSocialMediaCloudfrontUrl } from "@/lib/social-media-cloudfront";
import {
  MEDIA_AWS_ENV,
  copySocialMediaObject,
  putPublishedSocialImage,
  putRecheckedSocialImage,
  mediaOutputBucket,
  mediaSourceBucket,
  headSocialMediaObject,
  presignSocialMediaGet,
  presignSocialMediaPut,
  signedSocialMediaItems,
  signedSocialMediaUrl,
  readSocialMediaObject,
  readSocialMediaObjectFrom,
  readSocialMediaObjectOrThrow,
  readSocialMediaPrefix,
} from "./s3-social-media";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const KEY = `posts/${USER}/${OBJECT}.jpg`;
const STAGING_KEY = `posts/upload/${USER}/${OBJECT}.jpg`;
const PUBLISHED_OBJECT = "9bb6c728-a553-8449-930c-4fe23bba049d";
const PUBLISHED_KEY = `posts/${USER}/${PUBLISHED_OBJECT}.jpg`;

const MEDIA_AWS = {
  MEDIA_AWS_ACCESS_KEY_ID: "media-access-key",
  MEDIA_AWS_SECRET_ACCESS_KEY: "media-secret-key",
  MEDIA_AWS_REGION: "us-west-2",
} as const;

const TITLE_AWS = {
  AWS_ACCESS_KEY_ID: "title-access-key",
  AWS_SECRET_ACCESS_KEY: "title-secret-key",
  AWS_REGION: "us-east-1",
} as const;

function setMediaAwsEnv() {
  process.env.MEDIA_AWS_ACCESS_KEY_ID = MEDIA_AWS.MEDIA_AWS_ACCESS_KEY_ID;
  process.env.MEDIA_AWS_SECRET_ACCESS_KEY = MEDIA_AWS.MEDIA_AWS_SECRET_ACCESS_KEY;
  process.env.MEDIA_AWS_REGION = MEDIA_AWS.MEDIA_AWS_REGION;
}

function unsetMediaAwsEnv() {
  delete process.env.MEDIA_AWS_ACCESS_KEY_ID;
  delete process.env.MEDIA_AWS_SECRET_ACCESS_KEY;
  delete process.env.MEDIA_AWS_REGION;
}

function expectedMediaClientConfig() {
  return {
    region: MEDIA_AWS.MEDIA_AWS_REGION,
    credentials: {
      accessKeyId: MEDIA_AWS.MEDIA_AWS_ACCESS_KEY_ID,
      secretAccessKey: MEDIA_AWS.MEDIA_AWS_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: "WHEN_REQUIRED" as const,
  };
}

describe("s3-social-media isolated lane", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    vi.mocked(S3Client).mockClear();
    vi.mocked(isMediaCloudfrontConfigured).mockReturnValue(false);
    vi.mocked(signSocialMediaCloudfrontUrl).mockReset();
    process.env.S3_MEDIA_SOURCE_BUCKET = "test-media-source-bucket";
    process.env.S3_MEDIA_OUTPUT_BUCKET = "test-media-output-bucket";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_AVATARS_BUCKET = "test-avatars-bucket";
    process.env.AWS_ACCESS_KEY_ID = TITLE_AWS.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = TITLE_AWS.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_REGION = TITLE_AWS.AWS_REGION;
    setMediaAwsEnv();
  });

  it("presigns PUT/GET on the media source bucket, never S3_BUCKET", async () => {
    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/put");
    await expect(presignSocialMediaPut(STAGING_KEY, "image/jpeg", 1200)).resolves.toBe("https://s3.example/put");
    const putCmd = mockGetSignedUrl.mock.calls[0]?.[1] as PutObjectCommand;
    expect(putCmd).toBeInstanceOf(PutObjectCommand);
    expect(putCmd.input.Bucket).toBe("test-media-source-bucket");
    expect(putCmd.input.Bucket).not.toBe(process.env.S3_BUCKET);
    expect(putCmd.input.Key).toBe(STAGING_KEY);
    expect(putCmd.input.ContentType).toBe("image/jpeg");
    expect(putCmd.input.ContentLength).toBe(1200);
    expect(putCmd.input.CacheControl).toBeUndefined();

    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/get");
    await expect(presignSocialMediaGet(KEY)).resolves.toBe("https://s3.example/get");
    const getCmd = mockGetSignedUrl.mock.calls[1]?.[1] as GetObjectCommand;
    const getOpts = mockGetSignedUrl.mock.calls[1]?.[2] as { expiresIn: number; signingDate: Date };
    expect(getCmd).toBeInstanceOf(GetObjectCommand);
    expect(getCmd.input.Bucket).toBe("test-media-source-bucket");
    expect(getCmd.input.ResponseCacheControl).toBe("private, max-age=300");
    expect(getCmd.input.ResponseContentType).toBe("image/jpeg");
    expect(getOpts.expiresIn).toBe(600);
    expect(getOpts.signingDate).toBeInstanceOf(Date);
  });

  it("refuses when the media source bucket is the title bucket", () => {
    process.env.S3_MEDIA_SOURCE_BUCKET = process.env.S3_BUCKET;
    expect(() => mediaSourceBucket()).toThrow(/24frame-media bucket, not S3_BUCKET/);
  });

  it("refuses gc-content-assets as the media source bucket", () => {
    process.env.S3_MEDIA_SOURCE_BUCKET = "gc-content-assets";
    expect(() => mediaSourceBucket()).toThrow(/not S3_BUCKET/);
  });

  it("refuses when the unused output bucket is the title bucket", () => {
    process.env.S3_MEDIA_OUTPUT_BUCKET = process.env.S3_BUCKET;
    expect(() => mediaOutputBucket()).toThrow(/24frame-media bucket, not S3_BUCKET/);
  });

  it("does not sign a PUT whose length is outside the house cap", async () => {
    const videoKey = `stories/upload/${USER}/${OBJECT}.mp4`;
    await expect(presignSocialMediaPut(STAGING_KEY, "image/jpeg", 11 * 1024 * 1024)).rejects.toThrow(
      /content length/,
    );
    await expect(presignSocialMediaPut(STAGING_KEY, "image/jpeg", 0)).rejects.toThrow(/content length/);
    await expect(presignSocialMediaPut(STAGING_KEY, "image/jpeg", 1.5)).rejects.toThrow(/content length/);
    await expect(presignSocialMediaPut(videoKey, "video/mp4", 1200)).rejects.toThrow(/content type/);
    await expect(presignSocialMediaPut(videoKey, "video/mp4", 250 * 1024 * 1024 + 1)).rejects.toThrow(
      /content type/,
    );
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("refuses a published-shape key: browsers write upload keys only", async () => {
    await expect(presignSocialMediaPut(KEY, "image/jpeg", 1200)).rejects.toThrow(/not allowed/);
    await expect(presignSocialMediaPut(`stories/${USER}/${OBJECT}.mp4`, "video/mp4", 1200)).rejects.toThrow(
      /not allowed/,
    );
    await expect(presignSocialMediaPut(`posts/UPLOAD/${USER}/${OBJECT}.jpg`, "image/jpeg", 1200)).rejects.toThrow(
      /not allowed/,
    );
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("refuses an upload key whose extension mismatches the type", async () => {
    await expect(presignSocialMediaPut(`posts/upload/${USER}/${OBJECT}.png`, "image/jpeg", 1200)).rejects.toThrow(
      /not allowed/,
    );
    await expect(presignSocialMediaPut(STAGING_KEY, "video/mp4", 1200)).rejects.toThrow(/not allowed/);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("heads a stored object on the media source bucket", async () => {
    mockSend.mockResolvedValueOnce({
      ContentLength: 4096,
      ContentType: "image/jpeg; charset=binary",
      ETag: '"abc"',
    });
    await expect(headSocialMediaObject(KEY)).resolves.toEqual({
      bytes: 4096,
      contentType: "image/jpeg",
      etag: '"abc"',
    });
    const cmd = mockSend.mock.calls[0]?.[0] as HeadObjectCommand;
    expect(cmd).toBeInstanceOf(HeadObjectCommand);
    expect(cmd.input.Bucket).toBe("test-media-source-bucket");
    expect(cmd.input.Key).toBe(KEY);
    mockSend.mockResolvedValueOnce({ ContentLength: 4096, ContentType: "image/jpeg" });
    await expect(headSocialMediaObject(KEY)).resolves.toEqual({ bytes: 4096, contentType: "image/jpeg", etag: null });
    mockSend.mockRejectedValueOnce(new Error("NoSuchKey"));
    await expect(headSocialMediaObject(KEY)).resolves.toBeNull();
    await expect(headSocialMediaObject(`orgs/${USER}/titles/${OBJECT}/master/a.mov`)).resolves.toBeNull();
  });

  it("hands a failed HEAD to the caller's onError and still returns null", async () => {
    const onError = vi.fn();
    const failure = Object.assign(new Error("Forbidden"), { name: "Forbidden", $metadata: { httpStatusCode: 403 } });
    mockSend.mockRejectedValueOnce(failure);
    await expect(headSocialMediaObject(STAGING_KEY, onError)).resolves.toBeNull();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure);

    mockSend.mockResolvedValueOnce({ ContentLength: 4096, ContentType: "image/jpeg", ETag: '"abc"' });
    await expect(headSocialMediaObject(STAGING_KEY, onError)).resolves.toEqual({
      bytes: 4096,
      contentType: "image/jpeg",
      etag: '"abc"',
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it("reads a short prefix and signs image GETs with an image content type", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    mockSend.mockResolvedValueOnce({ Body: { transformToByteArray: async () => jpeg } });
    await expect(readSocialMediaPrefix(STAGING_KEY)).resolves.toEqual(jpeg);
    const cmd = mockSend.mock.calls.at(-1)?.[0] as GetObjectCommand;
    expect(cmd).toBeInstanceOf(GetObjectCommand);
    expect(cmd.input.Range).toBe("bytes=0-4095");
    expect(cmd.input.Key).toBe(STAGING_KEY);

    mockSend.mockResolvedValueOnce({ Body: { transformToByteArray: async () => new Uint8Array() } });
    await expect(readSocialMediaPrefix(STAGING_KEY)).resolves.toBeNull();
    mockSend.mockRejectedValueOnce(new Error("NoSuchKey"));
    await expect(readSocialMediaPrefix(STAGING_KEY)).resolves.toBeNull();
    await expect(readSocialMediaPrefix(`orgs/${USER}/titles/${OBJECT}/master/a.mov`)).resolves.toBeNull();

    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/mp4");
    await presignSocialMediaGet(`posts/${USER}/${OBJECT}.mp4`);
    const videoCmd = mockGetSignedUrl.mock.calls.at(-1)?.[1] as GetObjectCommand;
    expect(videoCmd.input.ResponseContentType).toBeUndefined();
  });

  it("copies an upload to its published key pinned to the checked ETag, and nothing else", async () => {
    mockSend.mockResolvedValueOnce({});
    await copySocialMediaObject({
      sourceKey: STAGING_KEY,
      etag: '"abc"',
      destinationKey: PUBLISHED_KEY,
      contentType: "image/jpeg",
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0]?.[0] as CopyObjectCommand;
    expect(cmd).toBeInstanceOf(CopyObjectCommand);
    expect(Object.keys(cmd.input).sort()).toEqual([
      "AnnotationDirective",
      "Bucket",
      "ContentType",
      "CopySource",
      "CopySourceIfMatch",
      "IfNoneMatch",
      "Key",
      "MetadataDirective",
    ]);
    expect(cmd.input).toEqual({
      Bucket: "test-media-source-bucket",
      Key: PUBLISHED_KEY,
      CopySource: `test-media-source-bucket/${STAGING_KEY}`,
      CopySourceIfMatch: '"abc"',
      IfNoneMatch: "*",
      MetadataDirective: "REPLACE",
      ContentType: "image/jpeg",
      AnnotationDirective: "EXCLUDE",
    });
    // The pin is the caller's ETag, passed through unchanged, never a constant.
    mockSend.mockResolvedValueOnce({});
    await copySocialMediaObject({
      sourceKey: `stories/upload/${USER}/${OBJECT}.png`,
      etag: '"second-upload-2"',
      destinationKey: `stories/${USER}/${PUBLISHED_OBJECT}.png`,
      contentType: "image/png",
    });
    const second = mockSend.mock.calls[1]?.[0] as CopyObjectCommand;
    expect(second.input).toMatchObject({
      Key: `stories/${USER}/${PUBLISHED_OBJECT}.png`,
      CopySource: `test-media-source-bucket/stories/upload/${USER}/${OBJECT}.png`,
      CopySourceIfMatch: '"second-upload-2"',
      ContentType: "image/png",
    });
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("refuses a copy that is not this author's upload to this author's key on the same lane", async () => {
    const copy = (input: Partial<Parameters<typeof copySocialMediaObject>[0]>) =>
      copySocialMediaObject({
        sourceKey: STAGING_KEY,
        etag: '"abc"',
        destinationKey: PUBLISHED_KEY,
        contentType: "image/jpeg",
        ...input,
      });
    // Source must be an upload key; a stored key or a title key is not.
    await expect(copy({ sourceKey: KEY })).rejects.toThrow(/not allowed/);
    await expect(copy({ sourceKey: `orgs/${USER}/titles/${OBJECT}/master/a.mov` })).rejects.toThrow(/not allowed/);
    // Destination must be a stored key; an upload key is not.
    await expect(copy({ destinationKey: `posts/upload/${USER}/${PUBLISHED_OBJECT}.jpg` })).rejects.toThrow(
      /not allowed/,
    );
    await expect(copy({ destinationKey: STAGING_KEY })).rejects.toThrow(/not allowed/);
    // Same author and lane on both sides.
    await expect(copy({ destinationKey: `posts/${OTHER}/${PUBLISHED_OBJECT}.jpg` })).rejects.toThrow(/not allowed/);
    await expect(copy({ sourceKey: `posts/upload/${OTHER}/${OBJECT}.jpg` })).rejects.toThrow(/not allowed/);
    await expect(copy({ destinationKey: `stories/${USER}/${PUBLISHED_OBJECT}.jpg` })).rejects.toThrow(
      /not allowed/,
    );
    await expect(copy({ sourceKey: `stories/upload/${USER}/${OBJECT}.jpg` })).rejects.toThrow(/not allowed/);
    await expect(copy({ etag: "" })).rejects.toThrow(/not allowed/);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("propagates a copy failure", async () => {
    mockSend.mockRejectedValueOnce(
      Object.assign(new Error("At least one of the pre-conditions you specified did not hold"), {
        name: "PreconditionFailed",
        $metadata: { httpStatusCode: 412 },
      }),
    );
    await expect(
      copySocialMediaObject({
        sourceKey: STAGING_KEY,
        etag: '"abc"',
        destinationKey: PUBLISHED_KEY,
        contentType: "image/jpeg",
      }),
    ).rejects.toThrow(/pre-conditions/);
  });

  it("does not sign title-prefix keys", async () => {
    await expect(presignSocialMediaPut(`orgs/${USER}/titles/${OBJECT}/master/a.mov`, "video/mp4", 1200)).rejects.toThrow(
      /not allowed/,
    );
    await expect(signedSocialMediaUrl(`orgs/${USER}/titles/${OBJECT}/master/a.mov`)).resolves.toBeNull();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("reads an image object from the media source bucket without signing a URL", async () => {
    mockSend.mockResolvedValue({
      ContentType: "image/jpeg",
      Body: { transformToByteArray: async () => new Uint8Array([9, 8, 7]) },
    });
    await expect(readSocialMediaObject(KEY)).resolves.toEqual({
      bytes: new Uint8Array([9, 8, 7]),
      contentType: "image/jpeg",
    });
    const cmd = mockSend.mock.calls[0]?.[0] as GetObjectCommand;
    expect(cmd).toBeInstanceOf(GetObjectCommand);
    expect(cmd.input.Bucket).toBe("test-media-source-bucket");
    expect(cmd.input.Key).toBe(KEY);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("does not read a forbidden media key", async () => {
    await expect(readSocialMediaObject("avatars/secret")).resolves.toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("throws every read error for topic tagging to retry, a missing object included", async () => {
    const missing = Object.assign(new Error("The specified key does not exist."), {
      name: "NoSuchKey",
      $metadata: { httpStatusCode: 404 },
    });
    const denied = Object.assign(new Error("Access Denied"), {
      name: "AccessDenied",
      $metadata: { httpStatusCode: 403 },
    });
    const throttled = Object.assign(new Error("Slow Down"), { name: "SlowDown", $metadata: { httpStatusCode: 503 } });
    const media = { bucket: "role-bucket", s3: new S3Client({}) };

    // Nothing deletes a Social image and Save heads it: a missing object is
    // the wrong bucket, not a deleted image.
    mockSend.mockRejectedValueOnce(missing);
    await expect(readSocialMediaObjectFrom(media, KEY)).rejects.toThrow("key does not exist");
    mockSend.mockRejectedValueOnce(missing);
    await expect(readSocialMediaObjectOrThrow(KEY)).rejects.toThrow("key does not exist");
    const noBucket = Object.assign(new Error("The specified bucket does not exist"), {
      name: "NoSuchBucket",
      $metadata: { httpStatusCode: 404 },
    });
    mockSend.mockRejectedValueOnce(noBucket);
    await expect(readSocialMediaObjectFrom(media, KEY)).rejects.toThrow("bucket does not exist");
    mockSend.mockRejectedValueOnce(denied);
    await expect(readSocialMediaObjectFrom(media, KEY)).rejects.toThrow("Access Denied");
    mockSend.mockRejectedValueOnce(throttled);
    await expect(readSocialMediaObjectOrThrow(KEY)).rejects.toThrow("Slow Down");
    mockSend.mockRejectedValueOnce(new Error("socket hang up"));
    await expect(readSocialMediaObjectOrThrow(KEY)).rejects.toThrow("socket hang up");
    expect((mockSend.mock.calls[0]?.[0] as GetObjectCommand).input.Bucket).toBe("role-bucket");

    // The page read still treats every error as no image.
    mockSend.mockRejectedValueOnce(missing);
    await expect(readSocialMediaObject(KEY)).resolves.toBeNull();
    mockSend.mockRejectedValueOnce(throttled);
    await expect(readSocialMediaObject(KEY)).resolves.toBeNull();
  });

  it("throws for topic tagging on an empty, oversized, or non-image object; the page read gets null", async () => {
    const body = (bytes: Uint8Array) => ({ transformToByteArray: async () => bytes });
    const cases = [
      { key: KEY, object: { ContentType: "image/jpeg", Body: body(new Uint8Array()) }, message: "empty" },
      { key: KEY, object: { ContentType: "image/jpeg" }, message: "empty" },
      {
        key: KEY,
        object: { ContentType: "image/jpeg", Body: body(new Uint8Array(SOCIAL_IMAGE_MAX_BYTES + 1)) },
        message: "too large",
      },
      {
        key: `posts/${USER}/${OBJECT}`,
        object: { ContentType: "application/octet-stream", Body: body(new Uint8Array([1])) },
        message: "not an image",
      },
    ];
    for (const { key, object, message } of cases) {
      mockSend.mockResolvedValueOnce(object);
      await expect(readSocialMediaObjectOrThrow(key)).rejects.toThrow(message);
      mockSend.mockResolvedValueOnce(object);
      await expect(readSocialMediaObject(key)).resolves.toBeNull();
    }
  });

  it("throws for topic tagging when the media keys are missing, and skips forbidden keys", async () => {
    delete process.env.MEDIA_AWS_ACCESS_KEY_ID;
    await expect(readSocialMediaObjectOrThrow(KEY)).rejects.toThrow("MEDIA_AWS_ACCESS_KEY_ID");
    await expect(readSocialMediaObjectOrThrow("avatars/secret")).resolves.toBeNull();
    await expect(readSocialMediaObjectFrom({ bucket: "b", s3: new S3Client({}) }, "avatars/secret")).resolves.toBeNull();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("uses CloudFront signed URLs when FrameMediaDelivery env is present", async () => {
    vi.mocked(isMediaCloudfrontConfigured).mockReturnValue(true);
    vi.mocked(signSocialMediaCloudfrontUrl).mockReturnValue("https://d364lvgeu9rmwn.cloudfront.net/signed");
    await expect(signedSocialMediaUrl(KEY)).resolves.toBe("https://d364lvgeu9rmwn.cloudfront.net/signed");
    expect(signSocialMediaCloudfrontUrl).toHaveBeenCalledWith(KEY);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("returns Mux playback ids without signing an S3 object", async () => {
    const items = await signedSocialMediaItems(
      [
        {
          kind: "video",
          key: `posts/${USER}/${OBJECT}.mp4`,
          contentType: "video/mp4",
          provider: "mux",
          playbackId: "uNbxnGLKJ00yfbijDO8COxT",
        },
      ],
      USER,
    );
    expect(items).toEqual([
      {
        kind: "video",
        url: "https://image.mux.com/uNbxnGLKJ00yfbijDO8COxT/thumbnail.webp?time=0",
        contentType: "video/mp4",
        playbackId: "uNbxnGLKJ00yfbijDO8COxT",
      },
    ]);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("maps stored posts.media keys to the edge proxy for display", async () => {
    const items = await signedSocialMediaItems(
      [
        { kind: "image", key: KEY, contentType: "image/jpeg" },
        { kind: "video", key: `orgs/${USER}/titles/x`, contentType: "video/mp4" },
      ],
      USER,
    );
    expect(items).toEqual([
      {
        kind: "image",
        url: `/api/social/media?key=${encodeURIComponent(KEY)}`,
        contentType: "image/jpeg",
      },
    ]);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("does not sign another author's stored media key", async () => {
    const items = await signedSocialMediaItems(
      [
        { kind: "image", key: `posts/${OTHER}/${OBJECT}.jpg`, contentType: "image/jpeg" },
        { kind: "image", key: `stories/${USER}/${OBJECT}.jpg`, contentType: "image/jpeg" },
      ],
      USER,
    );
    expect(items).toEqual([]);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("never imports title s3, cloudfront, or mediaconvert", () => {
    const src = readFileSync("src/lib/s3-social-media.ts", "utf8");
    expect(src).toContain("S3_MEDIA_SOURCE_BUCKET");
    expect(src).toContain("24frame-media");
    expect(src).toContain("MEDIA_AWS_ACCESS_KEY_ID");
    expect(src).toContain("MEDIA_AWS_SECRET_ACCESS_KEY");
    expect(src).toContain("MEDIA_AWS_REGION");
    expect(src).not.toContain("from \"@/lib/s3\"");
    expect(src).not.toContain("from \"@/lib/cloudfront\"");
    expect(src).not.toContain("from \"@/lib/mediaconvert\"");
    expect(src).not.toContain("process.env.S3_BUCKET)");
    expect(src).not.toContain("process.env.AWS_REGION");
    expect(src).not.toContain("process.env.AWS_ACCESS_KEY_ID");
    expect(src).not.toContain("process.env.AWS_SECRET_ACCESS_KEY");
  });
});

describe("s3-social-media MEDIA_AWS env selection", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockGetSignedUrl.mockReset();
    vi.mocked(S3Client).mockClear();
    process.env.S3_MEDIA_SOURCE_BUCKET = "test-media-source-bucket";
    process.env.S3_MEDIA_OUTPUT_BUCKET = "test-media-output-bucket";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_AVATARS_BUCKET = "test-avatars-bucket";
    process.env.AWS_ACCESS_KEY_ID = TITLE_AWS.AWS_ACCESS_KEY_ID;
    process.env.AWS_SECRET_ACCESS_KEY = TITLE_AWS.AWS_SECRET_ACCESS_KEY;
    process.env.AWS_REGION = TITLE_AWS.AWS_REGION;
    setMediaAwsEnv();
  });

  it("constructs S3Client from MEDIA_AWS_* even when title AWS_* is present", async () => {
    mockGetSignedUrl.mockResolvedValueOnce("https://s3.example/put");
    await presignSocialMediaPut(STAGING_KEY, "image/jpeg", 1200);
    expect(S3Client).toHaveBeenCalledTimes(1);
    expect(S3Client).toHaveBeenCalledWith(expectedMediaClientConfig());
    const config = vi.mocked(S3Client).mock.calls[0]?.[0] as {
      region?: string;
      credentials?: { accessKeyId?: string; secretAccessKey?: string };
    };
    expect(config.region).not.toBe(TITLE_AWS.AWS_REGION);
    expect(config.credentials?.accessKeyId).not.toBe(TITLE_AWS.AWS_ACCESS_KEY_ID);
    expect(config.credentials?.secretAccessKey).not.toBe(TITLE_AWS.AWS_SECRET_ACCESS_KEY);
  });

  it.each([...MEDIA_AWS_ENV])("refuses when %s is missing and does not use title AWS_*", async (name) => {
    delete process.env[name];
    await expect(presignSocialMediaPut(STAGING_KEY, "image/jpeg", 1200)).rejects.toThrow(
      new RegExp(`${name} environment variable is not set`),
    );
    expect(S3Client).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("does not fall back to AWS_* when every MEDIA_AWS_* var is missing", async () => {
    unsetMediaAwsEnv();
    await expect(presignSocialMediaGet(KEY)).rejects.toThrow(/MEDIA_AWS_/);
    expect(S3Client).not.toHaveBeenCalled();
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("marks a published image as re-encoded", async () => {
    mockSend.mockResolvedValueOnce({});
    await putPublishedSocialImage({ key: PUBLISHED_KEY, body: new Uint8Array([1, 2, 3]), contentType: "image/jpeg" });
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_REENCODED_METADATA]).toBe("1");
    expect(cmd.input.IfNoneMatch).toBe("*");
  });

  it("refuses IfNoneMatch overwrite on a rechecked image and records the previous key", async () => {
    mockSend.mockResolvedValueOnce({});
    const next = `posts/${USER}/33333333-3333-4333-8333-333333333333.jpg`;
    await putRecheckedSocialImage({
      key: next,
      previousKey: PUBLISHED_KEY,
      body: new Uint8Array([1, 2, 3]),
      contentType: "image/jpeg",
    });
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd.input.IfNoneMatch).toBe("*");
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_REENCODED_METADATA]).toBe("1");
    expect(cmd.input.Metadata?.[SOCIAL_IMAGE_PREVIOUS_KEY_METADATA]).toBe(PUBLISHED_KEY);
  });
});
