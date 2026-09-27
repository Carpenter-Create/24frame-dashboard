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

import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { isMediaCloudfrontConfigured, signSocialMediaCloudfrontUrl } from "@/lib/social-media-cloudfront";
import {
  MEDIA_AWS_ENV,
  mediaOutputBucket,
  mediaSourceBucket,
  headSocialMediaObject,
  presignSocialMediaGet,
  presignSocialMediaPut,
  signedSocialMediaItems,
  signedSocialMediaUrl,
  readSocialMediaObject,
} from "./s3-social-media";

const USER = "11111111-1111-4111-8111-111111111111";
const OTHER = "33333333-3333-4333-8333-333333333333";
const OBJECT = "22222222-2222-4222-8222-222222222222";
const KEY = `posts/${USER}/${OBJECT}.jpg`;

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
    await expect(presignSocialMediaPut(KEY, "image/jpeg", 1200)).resolves.toBe("https://s3.example/put");
    const putCmd = mockGetSignedUrl.mock.calls[0]?.[1] as PutObjectCommand;
    expect(putCmd).toBeInstanceOf(PutObjectCommand);
    expect(putCmd.input.Bucket).toBe("test-media-source-bucket");
    expect(putCmd.input.Bucket).not.toBe(process.env.S3_BUCKET);
    expect(putCmd.input.Key).toBe(KEY);
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
    const videoKey = `stories/${USER}/${OBJECT}.mp4`;
    await expect(presignSocialMediaPut(KEY, "image/jpeg", 11 * 1024 * 1024)).rejects.toThrow(/content length/);
    await expect(presignSocialMediaPut(KEY, "image/jpeg", 0)).rejects.toThrow(/content length/);
    await expect(presignSocialMediaPut(KEY, "image/jpeg", 1.5)).rejects.toThrow(/content length/);
    await expect(presignSocialMediaPut(videoKey, "video/mp4", 250 * 1024 * 1024 + 1)).rejects.toThrow(
      /content length/,
    );
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("heads a stored object on the media source bucket", async () => {
    mockSend.mockResolvedValueOnce({ ContentLength: 4096, ContentType: "image/jpeg; charset=binary" });
    await expect(headSocialMediaObject(KEY)).resolves.toEqual({ bytes: 4096, contentType: "image/jpeg" });
    const cmd = mockSend.mock.calls[0]?.[0] as HeadObjectCommand;
    expect(cmd).toBeInstanceOf(HeadObjectCommand);
    expect(cmd.input.Bucket).toBe("test-media-source-bucket");
    expect(cmd.input.Key).toBe(KEY);
    mockSend.mockRejectedValueOnce(new Error("NoSuchKey"));
    await expect(headSocialMediaObject(KEY)).resolves.toBeNull();
    await expect(headSocialMediaObject(`orgs/${USER}/titles/${OBJECT}/master/a.mov`)).resolves.toBeNull();
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
    await presignSocialMediaPut(KEY, "image/jpeg", 1200);
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
    await expect(presignSocialMediaPut(KEY, "image/jpeg", 1200)).rejects.toThrow(
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
});
