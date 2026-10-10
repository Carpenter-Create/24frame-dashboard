import { describe, expect, it, vi, beforeEach } from "vitest";

const { mockSend } = vi.hoisted(() => ({ mockSend: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(function S3ClientMock() {
      return { send: mockSend };
    }),
  };
});

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { putObjectBytes } from "./s3-put";

describe("putObjectBytes", () => {
  beforeEach(() => {
    mockSend.mockReset();
    mockSend.mockResolvedValue({});
  });

  it("PutObject to S3_BUCKET with the given key and type", async () => {
    await putObjectBytes("news-thumbs/variety/abc.jpg", new Uint8Array([1, 2, 3]), "image/jpeg");
    expect(mockSend).toHaveBeenCalledTimes(1);
    const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input.Bucket).toBe("test-bucket");
    expect(cmd.input.Key).toBe("news-thumbs/variety/abc.jpg");
    expect(cmd.input.ContentType).toBe("image/jpeg");
    expect(cmd.input.CacheControl).toBe("public, max-age=86400");
    expect(S3Client).toHaveBeenCalledWith({
      region: "us-east-1",
      followRegionRedirects: true,
    });
  });

  it("follows region redirects when AWS_REGION is the Lambda region us-west-2", async () => {
    vi.resetModules();
    const priorRegion = process.env.AWS_REGION;
    const priorBucket = process.env.S3_BUCKET;
    process.env.AWS_REGION = "us-west-2";
    process.env.S3_BUCKET = "gc-content-assets-prod";
    try {
      const { S3Client: FreshS3Client } = await import("@aws-sdk/client-s3");
      vi.mocked(FreshS3Client).mockClear();
      const { putObjectBytes: putFresh } = await import("./s3-put");
      await putFresh("news-thumbs/variety/abc.jpg", new Uint8Array([1, 2, 3]), "image/jpeg");
      expect(FreshS3Client).toHaveBeenCalledWith({
        region: "us-west-2",
        followRegionRedirects: true,
      });
      const cmd = mockSend.mock.calls[0]?.[0] as PutObjectCommand;
      expect(cmd.input.Bucket).toBe("gc-content-assets-prod");
    } finally {
      process.env.AWS_REGION = priorRegion;
      process.env.S3_BUCKET = priorBucket;
    }
  });
});
