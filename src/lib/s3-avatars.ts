import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectTaggingCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  AVATAR_SIGNED_URL_TTL_SECONDS,
  avatarKeysReadForRemove,
  avatarObjectKey,
  avatarPointerNamesKey,
  AVATAR_QUARANTINE_HOLD_TAG,
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

export type AvatarPointerReader = () => Promise<string | null>;

const AVATAR_HOLD_TAG_KEY = "gc-hold";
const AVATAR_HOLD_TAG_VALUE = "quarantine";

function holdTagPresent(tagSet: { Key?: string; Value?: string }[] | undefined): boolean {
  return (tagSet ?? []).some(
    (tag) => tag.Key === AVATAR_HOLD_TAG_KEY && tag.Value === AVATAR_HOLD_TAG_VALUE,
  );
}

function holdTagRemains(tagSet: { Key?: string; Value?: string }[] | undefined): boolean {
  return (tagSet ?? []).some((tag) => tag.Key === AVATAR_HOLD_TAG_KEY);
}

function noSuchTagSet(error: unknown): boolean {
  const name = (error as { name?: string; Code?: string }).name;
  const code = (error as { name?: string; Code?: string }).Code;
  return name === "NoSuchTagSet" || code === "NoSuchTagSet";
}

async function readObjectTags(
  s3: S3Client,
  bucket: string,
  key: string,
): Promise<{ Key?: string; Value?: string }[]> {
  try {
    const out = await s3.send(new GetObjectTaggingCommand({ Bucket: bucket, Key: key }));
    return out.TagSet ?? [];
  } catch (error) {
    if (noSuchTagSet(error)) return [];
    throw error;
  }
}

export async function readAvatarObjectTags(key: string): Promise<{ Key?: string; Value?: string }[]> {
  const { bucket, s3 } = avatarsClient();
  return readObjectTags(s3, bucket, key);
}

/** Remove gc-hold from a live face and confirm the read has no gc-hold tag. */
export async function clearAvatarHoldTag(key: string): Promise<void> {
  const { bucket, s3 } = avatarsClient();
  await s3.send(new DeleteObjectTaggingCommand({ Bucket: bucket, Key: key }));
  const tags = await readObjectTags(s3, bucket, key);
  if (holdTagRemains(tags)) throw new Error("Avatar hold tag remains on a live face");
}

/** Delete one object the caller has already proven is not a live pointer. */
export async function deleteUnreferencedAvatarObject(key: string): Promise<void> {
  const { bucket, s3 } = avatarsClient();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/** The put or copy claimed this tag. Refuse to continue when the read does not show it. */
async function assertHoldTagStored(s3: S3Client, bucket: string, key: string): Promise<void> {
  const tags = await readObjectTags(s3, bucket, key);
  if (!holdTagPresent(tags)) throw new Error("Avatar hold tag was not stored");
}

async function writeHoldTag(s3: S3Client, bucket: string, key: string): Promise<void> {
  await s3.send(
    new PutObjectTaggingCommand({
      Bucket: bucket,
      Key: key,
      Tagging: { TagSet: [{ Key: AVATAR_HOLD_TAG_KEY, Value: AVATAR_HOLD_TAG_VALUE }] },
    }),
  );
  await assertHoldTagStored(s3, bucket, key);
}

/**
 * After a gc-hold tag is stored, read the pointer again. When that read names
 * this key, the face is live: remove the tag and confirm it is gone.
 * A failed pointer read does not remove the tag. The unhold script is the net.
 */
async function stripHoldTagIfPointerNamesKey(
  s3: S3Client,
  bucket: string,
  userId: string,
  key: string,
  readPointer: AvatarPointerReader,
): Promise<boolean> {
  let current: string | null;
  try {
    current = await readPointer();
  } catch {
    return false;
  }
  if (!avatarPointerNamesKey(userId, current, key)) return false;
  await s3.send(new DeleteObjectTaggingCommand({ Bucket: bucket, Key: key }));
  const tags = await readObjectTags(s3, bucket, key);
  if (holdTagRemains(tags)) throw new Error("Avatar hold tag remains on a live face");
  return true;
}

/**
 * Put gc-hold back on this member's face so the 30-day rule can expire an object the pointer does not name.
 * Callers tag only after they have proof the swap or tag-delete did not commit, and after a pointer
 * read shows this key is not live. This write then reads the pointer again and strips the tag when
 * that read names the key. Returns "live" when the tag was stripped.
 */
export async function applyAvatarHoldTag(
  userId: string,
  key: string,
  readPointer: AvatarPointerReader = async () => {
    throw new Error("avatar pointer was not read");
  },
): Promise<"held" | "live"> {
  const allowed =
    key === avatarObjectKey(userId) ||
    isAvatarRecheckKey(key, userId) ||
    isAvatarQuarantineKey(key, userId);
  if (!allowed) throw new Error("Avatar hold tag is only set on this member's face");
  const { bucket, s3 } = avatarsClient();
  await writeHoldTag(s3, bucket, key);
  const live = await stripHoldTagIfPointerNamesKey(s3, bucket, userId, key, readPointer);
  return live ? "live" : "held";
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
  readPointer?: AvatarPointerReader;
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
      Tagging: AVATAR_QUARANTINE_HOLD_TAG,
      Metadata: {
        [SOCIAL_IMAGE_REENCODED_METADATA]: "1",
      },
    }),
  );
  const putEtag = put.ETag?.trim();
  let etag = putEtag ?? "";
  if (!etag) {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    etag = head.ETag?.trim() ?? "";
  }
  if (!etag) throw new Error("Avatar replace did not confirm the new object");
  await assertHoldTagStored(s3, bucket, key);
  if (input.readPointer) await stripHoldTagIfPointerNamesKey(s3, bucket, input.userId, key, input.readPointer);
  return { key, etag };
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
  readPointer?: AvatarPointerReader;
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
      Tagging: AVATAR_QUARANTINE_HOLD_TAG,
      Metadata: {
        [SOCIAL_IMAGE_REENCODED_METADATA]: "1",
        [SOCIAL_IMAGE_PREVIOUS_KEY_METADATA]: input.previousKey,
      },
    }),
  );
  await assertHoldTagStored(s3, bucket, key);
  if (input.readPointer) await stripHoldTagIfPointerNamesKey(s3, bucket, input.userId, key, input.readPointer);
  return key;
}

/**
 * Remove gc-hold and confirm the read has no gc-hold tag.
 * Callers move the pointer only after this returns. A throw leaves the old face in place.
 * A thrown tag read is not proof the tag delete rolled back, so the tag stays off.
 * A successful read that still shows gc-hold is that proof. Putting the tag back
 * then re-reads the pointer. The tag is written only when that read shows the key
 * is not live. A read that names the key, or a read that fails, leaves the tag off.
 */
export async function releaseAvatarHoldTag(
  userId: string,
  key: string,
  readPointer: AvatarPointerReader = async () => {
    throw new Error("avatar pointer was not read");
  },
): Promise<void> {
  if (!isAvatarRecheckKey(key, userId)) throw new Error("Avatar hold tag is only cleared on this member's recheck key");
  const { bucket, s3 } = avatarsClient();
  const restoreHold = async (): Promise<void> => {
    let current: string | null;
    try {
      current = await readPointer();
    } catch {
      return;
    }
    if (avatarPointerNamesKey(userId, current, key)) return;
    await writeHoldTag(s3, bucket, key);
    await stripHoldTagIfPointerNamesKey(s3, bucket, userId, key, readPointer);
  };
  await s3.send(new DeleteObjectTaggingCommand({ Bucket: bucket, Key: key }));
  const tags = await readObjectTags(s3, bucket, key);
  if (!holdTagRemains(tags)) return;
  await restoreHold();
  throw new Error("Avatar hold tag remains");
}

/**
 * Head this avatar object. A 404 and any other failure both throw.
 * The recheck script splits 404/NoSuchKey from a retryable head error.
 */
export async function headAvatarRecheck(key: string): Promise<{ reencoded: boolean }> {
  const { bucket, s3 } = avatarsClient();
  const out = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
  return { reencoded: socialImageWasReencoded(out.Metadata) };
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

/**
 * Delete these exact keys. Read the pointer immediately before each delete
 * and leave the key that read names. A read failure deletes nothing further.
 * A thrown DeleteObject is not proof the object remains. S3 has no rollback
 * class this caller can use, and another head would be a new read. Report
 * the leftover and do not tag it.
 */
async function deleteExactAvatarKeys(
  userId: string,
  keys: readonly string[],
  readPointer: AvatarPointerReader,
): Promise<void> {
  const { bucket, s3 } = avatarsClient();
  const leftovers: { key: string; tagged: boolean }[] = [];
  for (const key of keys) {
    const current = await readPointer();
    if (avatarPointerNamesKey(userId, current, key)) continue;
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      let tagged = false;
      try {
        tagged = holdTagRemains(await readObjectTags(s3, bucket, key));
      } catch {
        tagged = false;
      }
      leftovers.push({ key, tagged });
    }
  }
  if (leftovers.length > 0) {
    throw Object.assign(new Error("avatar delete left objects"), {
      leftoverKeys: leftovers.map((row) => row.key),
      taggedLeftoverKeys: leftovers.filter((row) => row.tagged).map((row) => row.key),
    });
  }
}

/** Delete the exact keys a successful replace left unreferenced. The new key stays. */
export async function deleteReplacedAvatarObjects(
  userId: string,
  previousKey: string | null,
  newKey: string,
  readPointer: AvatarPointerReader,
): Promise<void> {
  await deleteExactAvatarKeys(userId, replacedAvatarObjectKeys(userId, previousKey, newKey), readPointer);
}

/** Delete only the exact keys `storedKey` named. Re-read the pointer before each one. */
export async function deleteAvatarObject(
  userId: string,
  storedKey: string | null | undefined,
  readPointer: AvatarPointerReader,
): Promise<void> {
  await deleteExactAvatarKeys(userId, avatarKeysReadForRemove(userId, storedKey ?? null), readPointer);
}

/**
 * Move avatars/{id}/avatar to avatars/{id}/quarantine/{objectId}.
 * The quarantine key is never signed. Rollback is restoreQuarantinedAvatar:
 * the copy back replaces tags, the hold is confirmed gone, and only then
 * may the pointer name the canonical key.
 */
export async function quarantineAvatarObject(
  userId: string,
  objectId: string,
  readPointer: AvatarPointerReader,
): Promise<string> {
  const source = avatarObjectKey(userId);
  const dest = avatarQuarantineObjectKey(userId, objectId);
  const { bucket, s3 } = avatarsClient();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: dest,
      CopySource: `${bucket}/${source.split("/").map(encodeURIComponent).join("/")}`,
      IfNoneMatch: "*",
      TaggingDirective: "REPLACE",
      Tagging: AVATAR_QUARANTINE_HOLD_TAG,
    }),
  );
  await assertHoldTagStored(s3, bucket, dest);
  const current = await readPointer();
  if (avatarPointerNamesKey(userId, current, dest)) {
    await s3.send(new DeleteObjectTaggingCommand({ Bucket: bucket, Key: dest }));
    const tags = await readObjectTags(s3, bucket, dest);
    if (holdTagRemains(tags)) throw new Error("Avatar hold tag remains on a live face");
  }
  if (avatarPointerNamesKey(userId, current, source)) return dest;
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: source }));
  return dest;
}

/**
 * Copy a quarantine object back to the canonical key without gc-hold.
 * The quarantine object is deleted only after the canonical key's tag read
 * has no gc-hold. The caller sets profiles.avatar_key only after this returns.
 */
export async function restoreQuarantinedAvatar(userId: string, objectId: string): Promise<string> {
  const source = avatarQuarantineObjectKey(userId, objectId);
  const dest = avatarObjectKey(userId);
  const { bucket, s3 } = avatarsClient();
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: dest,
      CopySource: `${bucket}/${source.split("/").map(encodeURIComponent).join("/")}`,
      TaggingDirective: "REPLACE",
      Tagging: "",
    }),
  );
  await s3.send(new DeleteObjectTaggingCommand({ Bucket: bucket, Key: dest }));
  const tags = await readObjectTags(s3, bucket, dest);
  if (holdTagRemains(tags)) throw new Error("Avatar hold tag remains");
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
