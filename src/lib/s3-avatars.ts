import "server-only";

import {
  CopyObjectCommand,
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
  avatarQuarantineObjectKey,
  avatarRecheckObjectKey,
  avatarServeKey,
  isAvatarContentType,
  isAvatarQuarantineKey,
  isAvatarRecheckKey,
  replacedAvatarObjectKeys,
} from "@/lib/account-avatar";
import {
  reencodeSocialImage,
  SOCIAL_IMAGE_PREVIOUS_KEY_METADATA,
  SOCIAL_IMAGE_REENCODED_METADATA,
  socialImageWasReencoded,
} from "@/lib/social-image-reencode";
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
): Promise<string> {
  if (!isAvatarContentType(contentType)) {
    throw new Error("Unsupported avatar content type");
  }
  const { bucket, s3 } = avatarsClient();
  const encoded = await reencodeSocialImage(body, contentType);
  if (!encoded) throw new Error("Unsupported avatar content type");
  const key = avatarObjectKey(userId);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: encoded,
      ContentType: contentType,
      CacheControl: "private, max-age=300",
      Metadata: {
        [SOCIAL_IMAGE_REENCODED_METADATA]: "1",
      },
    }),
  );
  return key;
}

/**
 * New face at avatars/{id}/recheck/{objectId}. The canonical object is not
 * written. The caller swaps the pointer only after this confirms the object
 * (Put ETag, or HeadObject when the put omits one).
 */
export async function storeAvatarReplacement(input: {
  userId: string;
  objectId: string;
  body: Uint8Array;
  contentType: string;
}): Promise<{ key: string; etag: string }> {
  if (!isAvatarContentType(input.contentType)) {
    throw new Error("Unsupported avatar content type");
  }
  const { bucket, s3 } = avatarsClient();
  const encoded = await reencodeSocialImage(input.body, input.contentType);
  if (!encoded) throw new Error("Unsupported avatar content type");
  const key = avatarRecheckObjectKey(input.userId, input.objectId);
  const put = await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: encoded,
      ContentType: input.contentType,
      CacheControl: "private, max-age=300",
      IfNoneMatch: "*",
      Metadata: {
        [SOCIAL_IMAGE_REENCODED_METADATA]: "1",
      },
    }),
  );
  const putEtag = put.ETag?.trim();
  if (putEtag) return { key, etag: putEtag };
  const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  const headEtag = head.ETag?.trim();
  if (!headEtag) throw new Error("Avatar replace did not confirm the new object");
  return { key, etag: headEtag };
}

/**
 * Re-encoded face at a new key. The canonical avatar object is not written.
 * IfNoneMatch refuses a key that already exists.
 */
export async function putAvatarRecheckObject(input: {
  userId: string;
  objectId: string;
  body: Uint8Array;
  contentType: string;
  previousKey: string;
}): Promise<string> {
  if (!isAvatarContentType(input.contentType) || input.body.byteLength === 0) {
    throw new Error("Unsupported avatar content type");
  }
  const key = avatarRecheckObjectKey(input.userId, input.objectId);
  if (key === input.previousKey) throw new Error("Avatar recheck must not overwrite the original");
  const { bucket, s3 } = avatarsClient();
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: "private, max-age=300",
      IfNoneMatch: "*",
      Metadata: {
        [SOCIAL_IMAGE_REENCODED_METADATA]: "1",
        [SOCIAL_IMAGE_PREVIOUS_KEY_METADATA]: input.previousKey,
      },
    }),
  );
  return key;
}

export async function headAvatarRecheck(key: string): Promise<{ reencoded: boolean } | null> {
  const { bucket, s3 } = avatarsClient();
  try {
    const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return { reencoded: socialImageWasReencoded(out.Metadata) };
  } catch {
    return null;
  }
}

export async function readAvatarObject(
  userId: string,
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const key = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const bytes = await response.Body?.transformToByteArray();
  if (!bytes || bytes.byteLength === 0) return null;
  const contentType = response.ContentType?.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!isAvatarContentType(contentType)) return null;
  return { bytes, contentType };
}

/** Delete the objects a successful replace left unreferenced. Quarantine stays. */
export async function deleteReplacedAvatarObjects(
  userId: string,
  previousKey: string | null,
  newKey: string,
): Promise<void> {
  const { bucket, s3 } = avatarsClient();
  for (const key of replacedAvatarObjectKeys(userId, previousKey, newKey)) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  }
}

export async function deleteAvatarObject(userId: string, storedKey?: string | null): Promise<void> {
  const key = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  if (
    typeof storedKey === "string" &&
    storedKey !== key &&
    (isAvatarRecheckKey(storedKey, userId) || isAvatarQuarantineKey(storedKey, userId))
  ) {
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: storedKey }));
  }
}

/**
 * Move avatars/{id}/avatar to avatars/{id}/quarantine/{objectId}.
 * The quarantine key is never signed. Rollback copies it back to the
 * canonical key and deletes the quarantine object.
 */
export async function quarantineAvatarObject(userId: string, objectId: string): Promise<string> {
  const source = avatarObjectKey(userId);
  const dest = avatarQuarantineObjectKey(userId, objectId);
  const { bucket, s3 } = avatarsClient();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: dest,
      CopySource: `${bucket}/${source.split("/").map(encodeURIComponent).join("/")}`,
      IfNoneMatch: "*",
    }),
  );
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: source }));
  return dest;
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
export async function signedAvatarUrl(userId: string, storedKey?: string | null): Promise<string | null> {
  const key = avatarServeKey(userId, storedKey);
  if (!key) return null;
  try {
    if (key === avatarObjectKey(userId)) {
      if (!(await headAvatarObject(userId))) return null;
      return presignAvatarGet(userId);
    }
    const { bucket, s3 } = avatarsClient();
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseCacheControl: privateMaxAgeCacheControl(AVATAR_SIGNED_URL_TTL_SECONDS),
      }),
      stablePresignOptions(AVATAR_SIGNED_URL_TTL_SECONDS),
    );
  } catch (e) {
    const name = (e as { name?: string })?.name;
    if (name === "NotFound") return null;
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
