import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  AVATAR_SIGNED_URL_TTL_SECONDS,
  avatarObjectKey,
  isAvatarContentType,
} from "@/lib/account-avatar";
import { socialImageBytesMatchContentType } from "@/lib/social-media";
import { socialAvatarFaces } from "@/lib/social-edge";
import { privateMaxAgeCacheControl, stablePresignOptions } from "@/lib/signing-window";

// Dedicated private avatars bucket. Same AWS account and credentials as
// title assets (AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY).
// S3_AVATARS_BUCKET must not equal S3_BUCKET — faces are never written
// into the title-asset bucket or served through title CloudFront.

function avatarsBucket(): string {
  const bucket = process.env.S3_AVATARS_BUCKET;
  if (!bucket) throw new Error("S3_AVATARS_BUCKET environment variable is not set");
  const titles = process.env.S3_BUCKET;
  if (titles && bucket === titles) {
    throw new Error("S3_AVATARS_BUCKET must be a dedicated bucket, not S3_BUCKET");
  }
  return bucket;
}

function avatarsRegion(): string {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error("AWS_REGION environment variable is not set");
  return region;
}

function avatarsClient(): { bucket: string; s3: S3Client } {
  return { bucket: avatarsBucket(), s3: new S3Client({ region: avatarsRegion() }) };
}

export async function putAvatarObject(
  userId: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  if (!isAvatarContentType(contentType) || !socialImageBytesMatchContentType(body, contentType)) {
    throw new Error("Unsupported avatar content type");
  }
  const key = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, max-age=300",
    }),
  );
}

export async function deleteAvatarObject(userId: string): Promise<void> {
  const key = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function headAvatarObject(userId: string): Promise<boolean> {
  const key = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "NotFound") return false;
    throw e;
  }
}

export async function presignAvatarGet(userId: string): Promise<string> {
  const key = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseCacheControl: privateMaxAgeCacheControl(AVATAR_SIGNED_URL_TTL_SECONDS),
    }),
    stablePresignOptions(AVATAR_SIGNED_URL_TTL_SECONDS),
  );
}

/** True when the face object exists. Missing / unconfigured is false — never throw. */
export async function hasAvatarObject(userId: string): Promise<boolean> {
  try {
    return await headAvatarObject(userId);
  } catch {
    return false;
  }
}

/** Signed GET for the card, or null when empty / bucket not applied yet. */
export async function signedAvatarUrl(userId: string): Promise<string | null> {
  try {
    if (!(await headAvatarObject(userId))) return null;
    return presignAvatarGet(userId);
  } catch {
    return null;
  }
}

/**
 * Display SoT for lists / feeds / Home / Aggregation faces.
 * Resolves to the session-gated edge proxy — no HEAD, no RSA.
 * Privileged short-lived GETs stay on signedAvatarUrl / presignAvatarGet
 * (avatar API, account photo hop).
 */
export async function signedAvatarUrls(
  userIds: readonly string[],
): Promise<Map<string, string | null>> {
  const faces = socialAvatarFaces(userIds);
  return new Map([...faces.entries()]);
}
