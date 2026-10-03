import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { presignSocialMediaPut } from "@/lib/s3-social-media";

const KEY =
  "posts/upload/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.jpg";

// Real signer. The other s3-social-media tests mock getSignedUrl, which hides
// the empty-body CRC32 the default client appends to a browser PUT.
describe("social media browser PUT presign", () => {
  beforeEach(() => {
    process.env.MEDIA_AWS_ACCESS_KEY_ID = "media-access-key";
    process.env.MEDIA_AWS_SECRET_ACCESS_KEY = "media-secret-key";
    process.env.MEDIA_AWS_REGION = "us-west-2";
    process.env.S3_MEDIA_SOURCE_BUCKET = "test-media-source-bucket";
    process.env.S3_BUCKET = "test-bucket";
    process.env.S3_AVATARS_BUCKET = "test-avatars-bucket";
  });

  afterEach(() => {
    delete process.env.MEDIA_AWS_ACCESS_KEY_ID;
    delete process.env.MEDIA_AWS_SECRET_ACCESS_KEY;
    delete process.env.MEDIA_AWS_REGION;
  });

  it("does not bind the empty sign-time CRC32 that S3 rejects on the JPEG", async () => {
    const url = await presignSocialMediaPut(KEY, "image/jpeg", 1200);
    const params = new URL(url).searchParams;
    expect(params.get("X-Amz-SignedHeaders")?.split(";").sort()).toEqual(["content-length", "host"]);
    expect(params.get("x-amz-checksum-crc32")).toBeNull();
    expect(params.get("x-amz-sdk-checksum-algorithm")).toBeNull();
    expect(url.toLowerCase()).not.toContain("x-amz-checksum-");
  });
});
