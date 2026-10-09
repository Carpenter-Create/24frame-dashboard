// Account photo object rules. Faces live in the dedicated private avatars
// bucket. Key is derived from the session user id; no SQL.

import { z } from "zod";

export const AVATAR_KEY_PREFIX = "avatars";
export const AVATAR_OBJECT_NAME = "avatar";
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_SIGNED_URL_TTL_SECONDS = 300;

export const AVATAR_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[number];

export const AVATAR_ACCEPT = AVATAR_CONTENT_TYPES.join(",");

/** Same-origin chrome face. The route re-signs on each GET so a 5-minute S3 URL is never held in the client shell. */
export const ACCOUNT_PHOTO_HREF = "/api/account/photo";

const userIdSchema = z.string().uuid();

export function isAvatarContentType(value: string): value is AvatarContentType {
  return (AVATAR_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * `avatars/{user-id}/avatar` — the only legal face key.
 * Rejects anything that is not a UUID so a caller cannot write
 * a path-traversal key or a title-asset prefix.
 */
export function avatarObjectKey(userId: string): string {
  const parsed = userIdSchema.safeParse(userId);
  if (!parsed.success) {
    throw new Error("Avatar key requires a UUID user id");
  }
  return `${AVATAR_KEY_PREFIX}/${parsed.data}/avatar`;
}

/** Profile pointer after a recheck that could not decode the face. The object stays; nothing signs it. */
export const AVATAR_CLEARED = "cleared";

const AVATAR_RECHECK_KEY =
  /^avatars\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/recheck\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

const AVATAR_QUARANTINE_KEY =
  /^avatars\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/quarantine\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/;

/** A recheck writes here. The canonical `avatars/{user-id}/avatar` object is left as it was. */
export function avatarRecheckObjectKey(userId: string, objectId: string): string {
  const user = userIdSchema.safeParse(userId);
  const object = userIdSchema.safeParse(objectId);
  if (!user.success || !object.success) {
    throw new Error("Avatar key requires a UUID user id");
  }
  return `${AVATAR_KEY_PREFIX}/${user.data}/recheck/${object.data}`;
}

export function isAvatarRecheckKey(key: string, userId: string): boolean {
  const match = AVATAR_RECHECK_KEY.exec(key);
  return match?.[1] === userId;
}

/** Tag Adam's 30-day lifecycle rule matches. A prefix of `avatars/` would expire live faces. */
export const AVATAR_QUARANTINE_HOLD_TAG = "gc-hold=quarantine";

/** Private hold for a face the recheck could not decode. Never signed. */
export function avatarQuarantineObjectKey(userId: string, objectId: string): string {
  const user = userIdSchema.safeParse(userId);
  const object = userIdSchema.safeParse(objectId);
  if (!user.success || !object.success) {
    throw new Error("Avatar key requires a UUID user id");
  }
  return `${AVATAR_KEY_PREFIX}/${user.data}/quarantine/${object.data}`;
}

/** Prefix for this member's quarantine copies. Not a lifecycle prefix: it still starts with `avatars/`. */
export function avatarQuarantinePrefix(userId: string): string {
  const user = userIdSchema.safeParse(userId);
  if (!user.success) throw new Error("Avatar key requires a UUID user id");
  return `${AVATAR_KEY_PREFIX}/${user.data}/quarantine/`;
}

/** Prefix for this member's recheck copies. Same shape as quarantine: list, then delete own keys only. */
export function avatarRecheckPrefix(userId: string): string {
  const user = userIdSchema.safeParse(userId);
  if (!user.success) throw new Error("Avatar key requires a UUID user id");
  return `${AVATAR_KEY_PREFIX}/${user.data}/recheck/`;
}

export function isAvatarQuarantineKey(key: string, userId?: string): boolean {
  const match = AVATAR_QUARANTINE_KEY.exec(key);
  if (!match) return false;
  if (userId && match[1] !== userId) return false;
  return true;
}

/**
 * A profile read that failed, or a row that is not visible, must not fall
 * through to the canonical object.
 */
export function avatarKeyFromProfileRead(
  error: { message: string } | null | undefined,
  row: { avatar_key?: string | null } | null | undefined,
): { sign: false } | { sign: true; key: string | null } {
  if (error || !row) return { sign: false };
  return { sign: true, key: row.avatar_key ?? null };
}

/**
 * Which object to sign. A cleared pointer signs nothing, so the default face
 * shows. A recheck pointer signs that object. Anything else, including a
 * null column, signs the one canonical face.
 */
export function avatarServeKey(userId: string, stored: string | null | undefined): string | null {
  if (stored === AVATAR_CLEARED) return null;
  if (typeof stored === "string" && isAvatarQuarantineKey(stored)) return null;
  if (typeof stored === "string" && isAvatarRecheckKey(stored, userId)) return stored;
  try {
    return avatarObjectKey(userId);
  } catch {
    return null;
  }
}

/**
 * Known keys a successful replace may delete. The new key stays.
 * Quarantine copies are not in this list. The delete lists this member's
 * quarantine prefix after the swap and removes those objects there.
 */
export function replacedAvatarObjectKeys(
  userId: string,
  previousKey: string | null,
  newKey: string,
): string[] {
  const canonical = avatarObjectKey(userId);
  const keys: string[] = [];
  if (canonical !== newKey) keys.push(canonical);
  if (
    typeof previousKey === "string" &&
    previousKey !== newKey &&
    previousKey !== canonical &&
    isAvatarRecheckKey(previousKey, userId)
  ) {
    keys.push(previousKey);
  }
  return keys;
}

export function isAvatarObjectKey(key: string, userId: string): boolean {
  try {
    return key === avatarObjectKey(userId);
  } catch {
    return false;
  }
}

/** Signed GET, or null when empty so chrome never mounts a broken img. */
export function accountPhotoSrc(photoUrl?: string | null): string | null {
  if (typeof photoUrl !== "string") return null;
  const trimmed = photoUrl.trim();
  return trimmed.length > 0 ? trimmed : null;
}
