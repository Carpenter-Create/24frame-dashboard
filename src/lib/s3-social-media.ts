import "server-only";

import {
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  isForbiddenMediaBucket,
  isForbiddenMediaKey,
  parseSocialMediaObjectKey,
  parseSocialMediaStagingKey,
  SOCIAL_IMAGE_MAX_BYTES,
  SOCIAL_MEDIA_PUT_TTL_SECONDS,
  SOCIAL_MEDIA_SIGNED_URL_TTL_SECONDS,
  socialMediaExtension,
  socialMediaKindFor,
  socialMediaMaxBytes,
  type SocialMediaContentType,
  type SocialMediaKind,
  type SocialMediaLane,
} from "@/lib/social-media";
import { socialMediaProxies, socialMediaProxiesByPostId } from "@/lib/social-edge";
import type { SocialMuxPlaybackPolicy } from "@/lib/social-mux";
import {
  isMediaCloudfrontConfigured,
  signSocialMediaCloudfrontUrl,
} from "@/lib/social-media-cloudfront";
import { privateMaxAgeCacheControl, stablePresignOptions } from "@/lib/signing-window";

// Isolated 24frame-media S3 client. Ideas from donor #9 s3.ts + actions.ts.
// Never import @/lib/s3 / @/lib/cloudfront / @/lib/mediaconvert.
// Source bucket is the only write target in v0 (progressive playback).
// Credentials and region are MEDIA_AWS_* only — title AWS_* is a different
// account (gc-content-assets, us-east-1). No default-chain fallback.

export const MEDIA_S3_ENV = ["S3_MEDIA_SOURCE_BUCKET", "S3_MEDIA_OUTPUT_BUCKET"] as const;
export const MEDIA_AWS_ENV = [
  "MEDIA_AWS_ACCESS_KEY_ID",
  "MEDIA_AWS_SECRET_ACCESS_KEY",
  "MEDIA_AWS_REGION",
] as const;

function requireMediaAwsEnv(name: (typeof MEDIA_AWS_ENV)[number]): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} environment variable is not set`);
  return value;
}

function mediaRegion(): string {
  return requireMediaAwsEnv("MEDIA_AWS_REGION");
}

function mediaAwsCredentials(): { accessKeyId: string; secretAccessKey: string } {
  return {
    accessKeyId: requireMediaAwsEnv("MEDIA_AWS_ACCESS_KEY_ID"),
    secretAccessKey: requireMediaAwsEnv("MEDIA_AWS_SECRET_ACCESS_KEY"),
  };
}

function assertMediaBucket(bucket: string, envName: (typeof MEDIA_S3_ENV)[number]): string {
  if (!bucket) throw new Error(`${envName} environment variable is not set`);
  if (isForbiddenMediaBucket(bucket)) {
    throw new Error(`${envName} must be a 24frame-media bucket, not S3_BUCKET`);
  }
  return bucket;
}

export function mediaSourceBucket(): string {
  return assertMediaBucket(process.env.S3_MEDIA_SOURCE_BUCKET ?? "", "S3_MEDIA_SOURCE_BUCKET");
}

export function mediaOutputBucket(): string {
  return assertMediaBucket(process.env.S3_MEDIA_OUTPUT_BUCKET ?? "", "S3_MEDIA_OUTPUT_BUCKET");
}

function mediaClient(): { bucket: string; s3: S3Client } {
  return {
    bucket: mediaSourceBucket(),
    s3: new S3Client({
      region: mediaRegion(),
      credentials: mediaAwsCredentials(),
      // Default WHEN_SUPPORTED presigns PutObject with x-amz-checksum-crc32
      // of the empty sign-time body (AAAAAA==). The browser then PUTs the
      // real JPEG and S3 returns 400 BadDigest, which cover Save shows as
      // SOCIAL.home.uploadFailed. WHEN_REQUIRED omits that checksum.
      requestChecksumCalculation: "WHEN_REQUIRED",
    }),
  };
}

export async function presignSocialMediaPut(
  key: string,
  contentType: SocialMediaContentType,
  contentLength: number,
): Promise<string> {
  if (isForbiddenMediaKey(key)) {
    throw new Error("Media key is not allowed");
  }
  // Upload keys only, with the extension the signed type maps to. A key a
  // row can hold is written only by copySocialMediaObject.
  const staging = parseSocialMediaStagingKey(key);
  if (!staging || staging.ext !== socialMediaExtension(contentType)) {
    throw new Error("Media key is not allowed");
  }
  const kind = socialMediaKindFor(contentType);
  if (kind === "video") {
    throw new Error("Media content type is not allowed");
  }
  if (!kind || !Number.isInteger(contentLength) || contentLength <= 0 || contentLength > socialMediaMaxBytes(kind)) {
    throw new Error("Media content length is not allowed");
  }
  const { bucket, s3 } = mediaClient();
  // Browser PUT sends Content-Type plus the Content-Length fetch adds for
  // the body. Sign that length so a declared size cannot PUT a larger
  // object. Do not sign Cache-Control — a signed extra header 403s the PUT.
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: contentLength,
    }),
    { expiresIn: SOCIAL_MEDIA_PUT_TTL_SECONDS },
  );
}

/** Null when the object is missing or the HEAD fails; onError sees the failure. */
export async function headSocialMediaObject(
  key: string,
  onError?: (error: unknown) => void,
): Promise<{ bytes: number; contentType: string | null; etag: string | null } | null> {
  if (isForbiddenMediaKey(key)) return null;
  try {
    const { bucket, s3 } = mediaClient();
    const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (out.ContentLength == null || !Number.isFinite(out.ContentLength)) return null;
    const contentType = out.ContentType?.split(";")[0]?.trim().toLowerCase() || null;
    return { bytes: out.ContentLength, contentType, etag: out.ETag ?? null };
  } catch (error) {
    onError?.(error);
    return null;
  }
}

export async function presignSocialMediaGet(key: string): Promise<string> {
  if (isForbiddenMediaKey(key)) {
    throw new Error("Media key is not allowed");
  }
  const { bucket, s3 } = mediaClient();
  // Image keys answer as an image even if the stored metadata was wrong.
  // A video key keeps the object's own type.
  const imageType = imageTypeForStoredObject(key, undefined);
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseCacheControl: privateMaxAgeCacheControl(SOCIAL_MEDIA_SIGNED_URL_TTL_SECONDS),
      ...(imageType ? { ResponseContentType: imageType } : {}),
    }),
    stablePresignOptions(SOCIAL_MEDIA_SIGNED_URL_TTL_SECONDS),
  );
}

/** Whole object, only when the ETag still matches the HEAD. Null on a miss or a changed object. */
export async function readSocialMediaObjectIfMatch(key: string, etag: string): Promise<Uint8Array | null> {
  if (isForbiddenMediaKey(key) || !etag) return null;
  try {
    const { bucket, s3 } = mediaClient();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        IfMatch: etag,
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes || bytes.byteLength === 0) return null;
    return bytes;
  } catch {
    return null;
  }
}

/** Store a re-encoded image at a published posts/ or stories/ key. Does not copy the upload. */
export async function putPublishedSocialImage(input: {
  key: string;
  body: Uint8Array;
  contentType: SocialMediaContentType;
}): Promise<void> {
  const destination = parseSocialMediaObjectKey(input.key);
  if (!destination || socialMediaKindFor(input.contentType) !== "image" || input.body.byteLength === 0) {
    throw new Error("Media copy is not allowed");
  }
  const { bucket, s3 } = mediaClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "private, max-age=300",
      IfNoneMatch: "*",
    }),
  );
}

/** Replace a published image in place. Recheck uses this after a decode. Publish does not. */
export async function overwritePublishedSocialImage(input: {
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<void> {
  const destination = parseSocialMediaObjectKey(input.key);
  if (!destination || socialMediaKindFor(input.contentType) !== "image" || input.body.byteLength === 0) {
    throw new Error("Media copy is not allowed");
  }
  const { bucket, s3 } = mediaClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "private, max-age=300",
    }),
  );
}

/** Leading bytes of one object. Null when the key is closed, empty, or the read fails. */
export async function readSocialMediaPrefix(key: string, length = 4096): Promise<Uint8Array | null> {
  if (isForbiddenMediaKey(key) || !Number.isInteger(length) || length <= 0) return null;
  try {
    const { bucket, s3 } = mediaClient();
    const response = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: `bytes=0-${length - 1}`,
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes || bytes.byteLength === 0) return null;
    return bytes;
  } catch {
    return null;
  }
}

/**
 * Publish copy: an upload key to the same author's posts/ or stories/ key.
 * Pinned to the ETag that HEAD checked, never overwrites, and REPLACE keeps
 * only the checked type, so nothing the uploader sent rides along. EXCLUDE
 * skips annotations, which would need their own permissions.
 */
export async function copySocialMediaObject(input: {
  sourceKey: string;
  etag: string;
  destinationKey: string;
  contentType: SocialMediaContentType;
}): Promise<void> {
  const source = parseSocialMediaStagingKey(input.sourceKey);
  const destination = parseSocialMediaObjectKey(input.destinationKey);
  if (
    !source ||
    !destination ||
    source.lane !== destination.lane ||
    source.userId !== destination.userId ||
    !input.etag
  ) {
    throw new Error("Media copy is not allowed");
  }
  const { bucket, s3 } = mediaClient();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: input.destinationKey,
      CopySource: `${bucket}/${input.sourceKey.split("/").map(encodeURIComponent).join("/")}`,
      CopySourceIfMatch: input.etag,
      IfNoneMatch: "*",
      MetadataDirective: "REPLACE",
      ContentType: input.contentType,
      AnnotationDirective: "EXCLUDE",
    }),
  );
}

function imageTypeForStoredObject(key: string, header: string | undefined): string | null {
  const normalized = header?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (socialMediaKindFor(normalized) === "image") return normalized;
  if (/\.jpe?g$/i.test(key)) return "image/jpeg";
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.webp$/i.test(key)) return "image/webp";
  if (/\.gif$/i.test(key)) return "image/gif";
  return null;
}

/** Server-side read of one media object. Null when the key is closed, empty, or not an image, or on any error. */
export async function readSocialMediaObject(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    return await readSocialMediaObjectOrThrow(key);
  } catch {
    return null;
  }
}

/**
 * readSocialMediaObject, except that only a closed key reads as null.
 * Anything else that is not a readable image throws, so topic tagging
 * retries the post instead of reading it as having no image.
 */
export async function readSocialMediaObjectOrThrow(
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (isForbiddenMediaKey(key)) return null;
  return readSocialMediaObjectFrom(mediaClient(), key);
}

/**
 * The same read through a caller's own client. The topic-tagging Lambda
 * passes an S3Client signed by its execution role, so it carries no
 * MEDIA_AWS_* keys. Null only for a closed key. Saving a post checks the
 * object and nothing deletes it, so a missing, empty, oversized, or
 * non-image object is configuration (the wrong bucket) and throws, like
 * any other error.
 */
export async function readSocialMediaObjectFrom(
  media: { bucket: string; s3: S3Client },
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (isForbiddenMediaKey(key)) return null;
  const { bucket, s3 } = media;
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes || bytes.byteLength === 0) throw new Error("Media object is empty");
  if (bytes.byteLength > SOCIAL_IMAGE_MAX_BYTES) throw new Error("Media object is too large");
  const contentType = imageTypeForStoredObject(key, response.ContentType);
  if (!contentType) throw new Error("Media object is not an image");
  return { bytes, contentType };
}

export async function signedSocialMediaUrl(key: string): Promise<string | null> {
  if (isForbiddenMediaKey(key)) return null;
  try {
    if (isMediaCloudfrontConfigured()) {
      return signSocialMediaCloudfrontUrl(key);
    }
    return await presignSocialMediaGet(key);
  } catch {
    return null;
  }
}

export type SignedSocialMedia = {
  kind: SocialMediaKind;
  url: string;
  contentType: SocialMediaContentType;
  playbackId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
};

/**
 * Display SoT for feeds / Home / Explore / profile activity.
 * Same-origin edge proxy — no CloudFront/S3 RSA on the page path.
 * Privileged short-lived GETs stay on signedSocialMediaUrl / presignSocialMediaGet
 * (the media API). Social video playback does not use them.
 */
export async function signedSocialMediaItems(
  media: unknown,
  authorId: string,
  lane: SocialMediaLane = "posts",
): Promise<SignedSocialMedia[]> {
  return socialMediaProxies(media, authorId, lane);
}

export async function signedSocialMediaByPostId(
  posts: readonly { id: string; author_id: string; media: unknown }[],
): Promise<Map<string, SignedSocialMedia[]>> {
  return socialMediaProxiesByPostId(posts);
}
