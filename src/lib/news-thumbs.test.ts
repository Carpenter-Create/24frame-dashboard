import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import {
  isMirroredNewsThumbUrl,
  isNewsThumbMirrorConfigured,
  mirrorNewsImageUrl,
  NEWS_THUMBS_PREFIX,
  newsThumbObjectKey,
  previewNewsThumbPublicUrl,
} from "./news-thumbs";

const CANON = "https://variety.com/2026/film/news/harbor";
const REMOTE = "https://variety.com/thumbs/harbor.jpg";
const CF = "https://delivery.globalcontent.co";
const MIRROR_ENV = {
  S3_BUCKET: "gc-content-assets-prod",
  AWS_REGION: "us-east-1",
  CLOUDFRONT_DOMAIN: CF,
};

function jpegResponse(): Response {
  return new Response(new Uint8Array(64).fill(1), {
    status: 200,
    headers: { "content-type": "image/jpeg" },
  });
}

describe("news thumb key + public URL", () => {
  it("stays under news-thumbs/ and builds the title CloudFront URL", () => {
    const key = newsThumbObjectKey("variety", CANON, "jpg");
    expect(key.startsWith(NEWS_THUMBS_PREFIX)).toBe(true);
    expect(key).toMatch(/^news-thumbs\/variety\/[0-9a-f]{32}\.jpg$/);
    expect(key).not.toContain("orgs/");
    expect(previewNewsThumbPublicUrl("variety", CANON, REMOTE, MIRROR_ENV)).toBe(
      `${CF}/${key}`,
    );
    expect(isMirroredNewsThumbUrl(`${CF}/${key}`, MIRROR_ENV)).toBe(true);
    expect(isMirroredNewsThumbUrl(REMOTE, MIRROR_ENV)).toBe(false);
    expect(isNewsThumbMirrorConfigured({})).toBe(false);
    expect(isNewsThumbMirrorConfigured(MIRROR_ENV)).toBe(true);
  });
});

describe("mirrorNewsImageUrl", () => {
  it("writes the CloudFront URL on a successful PutObject", async () => {
    const putObject = vi.fn(async () => undefined);
    const result = await mirrorNewsImageUrl({
      source: "variety",
      canonicalUrl: CANON,
      remoteUrl: REMOTE,
      fetchImpl: async () => jpegResponse(),
      putObject,
      env: MIRROR_ENV,
    });
    const key = newsThumbObjectKey("variety", CANON, "jpg");
    expect(putObject).toHaveBeenCalledTimes(1);
    expect(putObject).toHaveBeenCalledWith(key, expect.any(Uint8Array), "image/jpeg");
    expect(result.mirrored).toBe(true);
    expect(result.url).toBe(`${CF}/${key}`);
  });

  it("keeps the remote URL when PutObject fails", async () => {
    const result = await mirrorNewsImageUrl({
      source: "variety",
      canonicalUrl: CANON,
      remoteUrl: REMOTE,
      fetchImpl: async () => jpegResponse(),
      putObject: async () => {
        throw new Error("AccessDenied");
      },
      env: MIRROR_ENV,
    });
    expect(result.mirrored).toBe(false);
    expect(result.url).toBe(REMOTE);
    expect(result.error).toBe("AccessDenied");
  });
});

describe("news-thumbs house SoT", () => {
  it("reuses title S3_BUCKET + putObjectBytes and never invents NEWS_S3_*", () => {
    const src = readFileSync(new URL("./news-thumbs.ts", import.meta.url), "utf8");
    const s3Src = readFileSync(new URL("./s3.ts", import.meta.url), "utf8");
    const putSrc = readFileSync(new URL("./s3-put.ts", import.meta.url), "utf8");
    expect(src).toContain('from "@/lib/s3-put"');
    expect(src).toContain("putObjectBytes");
    expect(src).toContain("S3_BUCKET");
    expect(src).toContain("CLOUDFRONT_DOMAIN");
    expect(src).toContain(NEWS_THUMBS_PREFIX);
    expect(src).not.toMatch(/process\.env\.NEWS_S3_/);
    expect(src).not.toContain("EDUCATION_AWS_");
    expect(src).not.toContain("MEDIA_AWS_");
    expect(s3Src).toContain("export { putObjectBytes }");
    expect(putSrc).toContain("PutObjectCommand");
    expect(putSrc).toContain("S3_BUCKET");
    expect(putSrc).toContain("followRegionRedirects: true");
  });
});
