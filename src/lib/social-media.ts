import { z } from "zod";

import {
  isSocialMuxId,
  SOCIAL_MUX_PLAYBACK_POLICIES,
  SOCIAL_MUX_PROVIDER,
  type SocialMuxPlaybackPolicy,
} from "@/lib/social-mux";

// Member post media rules. Keys live in posts.media (Pack 2 jsonb).
// Stills go to 24frame-media-source-prod. Social Video + Go live store
// Mux playback ids on the same author-bound key. Never title film keys,
// never S3_BUCKET / gc-content-assets, never avatars/.
// Stories stay on the 24frame-media-* stories lane. One still or one video.
// Mux playback stays on posts.
// Copy for these codes lives in SOCIAL.home / SOCIAL.stories.

export type SocialMediaRuleError =
  | "invalid"
  | "limit"
  | "forbidden"
  | "type"
  | "missing"
  | "tooLarge"
  | "store";

export const SOCIAL_MEDIA_KEY_PREFIX = "posts";
export const SOCIAL_MEDIA_LANES = ["posts", "stories"] as const;
export type SocialMediaLane = (typeof SOCIAL_MEDIA_LANES)[number];
export const SOCIAL_MEDIA_MAX_ITEMS = 4;
export const SOCIAL_STORY_MAX_ITEMS = 1;
export const SOCIAL_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
// 250MB covers a ~10 min Go live recording at the house bitrate.
export const SOCIAL_VIDEO_MAX_BYTES = 250 * 1024 * 1024;
// Design 144:1218 copy mentioned “up to 15 seconds”. Not an Adam lock.
// Do not add a story duration cap. Size/type bounds stay.
export const SOCIAL_MEDIA_SIGNED_URL_TTL_SECONDS = 300;
export const SOCIAL_MEDIA_PUT_TTL_SECONDS = 900;

export const SOCIAL_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export const SOCIAL_VIDEO_CONTENT_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;
export const SOCIAL_MEDIA_CONTENT_TYPES = [
  ...SOCIAL_IMAGE_CONTENT_TYPES,
  ...SOCIAL_VIDEO_CONTENT_TYPES,
] as const;

export type SocialImageContentType = (typeof SOCIAL_IMAGE_CONTENT_TYPES)[number];
export type SocialVideoContentType = (typeof SOCIAL_VIDEO_CONTENT_TYPES)[number];
export type SocialMediaContentType = (typeof SOCIAL_MEDIA_CONTENT_TYPES)[number];
export type SocialMediaKind = "image" | "video";

export type SocialMediaItem = {
  kind: SocialMediaKind;
  key: string;
  contentType: SocialMediaContentType;
  provider?: typeof SOCIAL_MUX_PROVIDER;
  playbackId?: string;
  uploadId?: string;
  assetId?: string;
  playbackPolicy?: SocialMuxPlaybackPolicy;
  /** Source pixels. In-feed video uses both edges for its real ratio. */
  width?: number;
  height?: number;
};

export const SOCIAL_MEDIA_ACCEPT = SOCIAL_MEDIA_CONTENT_TYPES.join(",");

export const TITLE_ASSET_BUCKET_NAME = "gc-content-assets";
export const FORBIDDEN_MEDIA_KEY_MARKERS = [
  "orgs/",
  "titles/",
  "avatars/",
  "gc-content-assets",
] as const;

const uuidSchema = z.string().uuid();
const EXT_BY_TYPE: Record<SocialMediaContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const muxIdSchema = z.string().refine(isSocialMuxId);

const sourcePixelSchema = z.preprocess(
  (value) =>
    typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 16384 ? value : undefined,
  z.number().int().positive().max(16384).optional(),
);

const itemSchema = z.object({
  kind: z.enum(["image", "video"]),
  key: z.string().min(1).max(200),
  contentType: z.enum(SOCIAL_MEDIA_CONTENT_TYPES),
  provider: z.literal(SOCIAL_MUX_PROVIDER).optional(),
  playbackId: muxIdSchema.optional(),
  uploadId: muxIdSchema.optional(),
  assetId: muxIdSchema.optional(),
  playbackPolicy: z.enum(SOCIAL_MUX_PLAYBACK_POLICIES).optional(),
  width: sourcePixelSchema,
  height: sourcePixelSchema,
});

/** Both edges, or nothing. One side must not flip a feed frame. */
export function socialMediaFrameFields(item: {
  width?: number | null;
  height?: number | null;
}): { width: number; height: number } | null {
  const width = item.width;
  const height = item.height;
  if (width == null || height == null) return null;
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if (width <= 0 || height <= 0 || width > 16384 || height > 16384) return null;
  return { width, height };
}

function storedMediaItem(item: SocialMediaItem): SocialMediaItem {
  const frame = socialMediaFrameFields(item);
  if (frame) return { ...item, width: frame.width, height: frame.height };
  if (item.width == null && item.height == null) return item;
  const next = { ...item };
  delete next.width;
  delete next.height;
  return next;
}

export function isSocialMuxMediaItem(item: SocialMediaItem): item is SocialMediaItem & {
  provider: typeof SOCIAL_MUX_PROVIDER;
  playbackId: string;
} {
  return item.kind === "video" && item.provider === SOCIAL_MUX_PROVIDER && !!item.playbackId && isSocialMuxId(item.playbackId);
}

export function isSocialMediaContentType(value: string): value is SocialMediaContentType {
  return (SOCIAL_MEDIA_CONTENT_TYPES as readonly string[]).includes(value);
}

export function socialMediaKindFor(contentType: string): SocialMediaKind | null {
  if ((SOCIAL_IMAGE_CONTENT_TYPES as readonly string[]).includes(contentType)) return "image";
  if ((SOCIAL_VIDEO_CONTENT_TYPES as readonly string[]).includes(contentType)) return "video";
  return null;
}

const STORY_PICK_EXTENSIONS: Record<string, SocialMediaContentType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

/** Library pickers often omit `file.type` or send `image/jpg`. Map those onto the house allowlist. */
export function storyPickContentType(file: { type: string; name: string }): SocialMediaContentType | null {
  // iOS sometimes appends `;codecs=…`. The allowlist is the bare type.
  const raw = (file.type.trim().toLowerCase().split(";")[0] ?? "").trim();
  if (raw === "image/jpg" || raw === "image/pjpeg") return "image/jpeg";
  if (isSocialMediaContentType(raw)) return raw;
  if (raw !== "" && raw !== "application/octet-stream") return null;
  const ext = file.name.split(".").pop()?.trim().toLowerCase() ?? "";
  return STORY_PICK_EXTENSIONS[ext] ?? null;
}

export function storyImageAccept(): string {
  return `${SOCIAL_IMAGE_CONTENT_TYPES.join(",")},.jpg,.jpeg,.png,.webp,.gif`;
}

/**
 * Snapshot the first file, then clear the input.
 * `FileList` is live — clearing `value` first drops the file and the pick looks dead.
 */
export function readStoryInputPick(input: {
  files: { readonly length: number; [index: number]: File | undefined } | null;
  value: string;
}): File | null {
  const file = input.files && input.files.length > 0 ? (input.files[0] ?? null) : null;
  input.value = "";
  return file;
}

export function storyPickFile(file: File): {
  file: File;
  contentType: SocialMediaContentType;
  kind: SocialMediaKind;
} | null {
  const contentType = storyPickContentType(file);
  if (!contentType) return null;
  const kind = socialMediaKindFor(contentType);
  if (!kind) return null;
  const typed =
    file.type === contentType
      ? file
      : new File([file], file.name, { type: contentType, lastModified: file.lastModified });
  return { file: typed, contentType, kind };
}

export function socialMediaMaxBytes(kind: SocialMediaKind): number {
  return kind === "video" ? SOCIAL_VIDEO_MAX_BYTES : SOCIAL_IMAGE_MAX_BYTES;
}

export function isForbiddenMediaKey(key: string): boolean {
  if (!key || key.includes("..") || key.includes("\\") || key.startsWith("/") || key.includes("//")) {
    return true;
  }
  const lower = key.toLowerCase();
  return FORBIDDEN_MEDIA_KEY_MARKERS.some((marker) => lower.includes(marker));
}

export function isForbiddenMediaBucket(bucket: string): boolean {
  const name = bucket.trim().toLowerCase();
  if (!name) return true;
  if (name === TITLE_ASSET_BUCKET_NAME) return true;
  if (name.includes("24frame-education") || name.includes("24frame-finance")) return true;
  if (name === (process.env.S3_BUCKET ?? "").toLowerCase()) return true;
  if (name === (process.env.S3_AVATARS_BUCKET ?? "").toLowerCase()) return true;
  return false;
}

export function parseSocialMediaLane(raw: string | null | undefined): SocialMediaLane {
  return raw === "stories" ? "stories" : "posts";
}

export function socialMediaObjectKey(
  userId: string,
  objectId: string,
  contentType: string,
  lane: SocialMediaLane = "posts",
): string {
  const user = uuidSchema.safeParse(userId);
  const object = uuidSchema.safeParse(objectId);
  if (!user.success || !object.success) {
    throw new Error("Media key requires UUID user and object ids");
  }
  if (!isSocialMediaContentType(contentType)) {
    throw new Error("Unsupported media content type");
  }
  return `${lane}/${user.data}/${object.data}.${EXT_BY_TYPE[contentType]}`;
}

export function socialMediaExtension(contentType: SocialMediaContentType): string {
  return EXT_BY_TYPE[contentType];
}

// Browsers PUT only to <lane>/upload/<user>/<object>.<ext>. Save copies the
// checked bytes to a posts/ or stories/ key that no upload URL can write
// (social-media-publish.ts). Rows never hold an upload key: the DB CHECK
// and isOwnedSocialMediaKey refuse it.
const SOCIAL_MEDIA_STAGING_SEGMENT = "upload";

export function socialMediaStagingKey(
  userId: string,
  objectId: string,
  contentType: string,
  lane: SocialMediaLane = "posts",
): string {
  const user = uuidSchema.safeParse(userId);
  const object = uuidSchema.safeParse(objectId);
  if (!user.success || !object.success) {
    throw new Error("Media key requires UUID user and object ids");
  }
  if (!isSocialMediaContentType(contentType)) {
    throw new Error("Unsupported media content type");
  }
  return `${lane}/${SOCIAL_MEDIA_STAGING_SEGMENT}/${user.data}/${object.data}.${EXT_BY_TYPE[contentType]}`;
}

// Case-sensitive, lowercase ids, one extension per type (no .jpeg).
const SOCIAL_MEDIA_STAGING_KEY =
  /^(posts|stories)\/upload\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|gif|mp4|mov|webm)$/;

/** Lane, uploader, and extension of an upload key. Null for any other shape. */
export function parseSocialMediaStagingKey(
  key: string,
): { lane: SocialMediaLane; userId: string; ext: string } | null {
  if (isForbiddenMediaKey(key)) return null;
  const match = key.match(SOCIAL_MEDIA_STAGING_KEY);
  const lane = match?.[1];
  const userId = match?.[2];
  const ext = match?.[3];
  if (lane !== "posts" && lane !== "stories") return null;
  if (!userId || !ext) return null;
  return { lane, userId, ext };
}

/** The caller's own upload key on this lane, with the extension its type maps to. */
export function isOwnedSocialMediaStagingKey(
  key: string,
  userId: string,
  lane: SocialMediaLane,
  contentType: string,
): boolean {
  const parsed = parseSocialMediaStagingKey(key);
  return (
    !!parsed &&
    parsed.lane === lane &&
    parsed.userId === userId &&
    isSocialMediaContentType(contentType) &&
    parsed.ext === EXT_BY_TYPE[contentType]
  );
}

const SOCIAL_MEDIA_OBJECT_KEY =
  /^(posts|stories)\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(jpg|jpeg|png|webp|gif|mp4|mov|webm)$/i;

/** Lane and author embedded in a posts/ or stories/ object key. Null when the key is closed or not that shape. */
export function parseSocialMediaObjectKey(
  key: string,
): { lane: SocialMediaLane; userId: string } | null {
  if (isForbiddenMediaKey(key)) return null;
  const match = key.match(SOCIAL_MEDIA_OBJECT_KEY);
  const lane = match?.[1];
  const userId = match?.[2];
  if (lane !== "posts" && lane !== "stories") return null;
  if (!userId) return null;
  return { lane, userId };
}

export function isOwnedSocialMediaKey(
  key: string,
  userId: string,
  lane: SocialMediaLane = "posts",
): boolean {
  const user = uuidSchema.safeParse(userId);
  if (!user.success) return false;
  const parsed = parseSocialMediaObjectKey(key);
  return !!parsed && parsed.lane === lane && parsed.userId === user.data;
}

export function parsePostMedia(value: unknown): SocialMediaItem[] {
  if (!Array.isArray(value)) return [];
  const items: SocialMediaItem[] = [];
  for (const raw of value.slice(0, SOCIAL_MEDIA_MAX_ITEMS)) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (isForbiddenMediaKey(parsed.data.key)) continue;
    if (socialMediaKindFor(parsed.data.contentType) !== parsed.data.kind) continue;
    if (parsed.data.provider === SOCIAL_MUX_PROVIDER && !isSocialMuxMediaItem(parsed.data)) continue;
    items.push(storedMediaItem(parsed.data));
  }
  return items;
}

export function ownedMediaItems(
  value: unknown,
  authorId: string,
  lane: SocialMediaLane = "posts",
): SocialMediaItem[] {
  return parsePostMedia(value).filter((item) => isOwnedSocialMediaKey(item.key, authorId, lane));
}

/** One welcome-video upload, or null. Reuses the posts media lane. Publish it before storing. */
export function welcomeVideoItemFromMedia(raw: unknown, userId: string): SocialMediaItem | null {
  const items = mediaItemsForPublish(raw, userId, "posts");
  if (!items.ok || items.items.length !== 1) return null;
  const only = items.items[0];
  return only.kind === "video" && !isSocialMuxMediaItem(only) ? only : null;
}

/** One profile-cover still upload, or null. Posts lane, image only. Publish it before storing. */
export function profileCoverItemFromMedia(raw: unknown, userId: string): SocialMediaItem | null {
  const items = mediaItemsForPublish(raw, userId, "posts");
  if (!items.ok || items.items.length !== 1) return null;
  const only = items.items[0];
  return only.kind === "image" ? only : null;
}

/**
 * Composer media checked for this author and lane. S3 items must be the
 * author's own upload keys: they are copy sources, so run the result
 * through publishSocialMediaItems before any insert. Mux items keep their
 * posts/ or stories/ label key.
 */
export function mediaItemsForPublish(
  raw: unknown,
  userId: string,
  lane: SocialMediaLane = "posts",
): { ok: true; items: SocialMediaItem[] } | { ok: false; error: SocialMediaRuleError } {
  if (raw == null || raw === "") return { ok: true, items: [] };
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid" };
    }
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "invalid" };
  const max = lane === "stories" ? SOCIAL_STORY_MAX_ITEMS : SOCIAL_MEDIA_MAX_ITEMS;
  if (parsed.length > max) {
    return { ok: false, error: "limit" };
  }

  const items: SocialMediaItem[] = [];
  for (const rawItem of parsed) {
    const item = itemSchema.safeParse(rawItem);
    if (!item.success) return { ok: false, error: "invalid" };
    const owned =
      item.data.provider === SOCIAL_MUX_PROVIDER
        ? isOwnedSocialMediaKey(item.data.key, userId, lane)
        : isOwnedSocialMediaStagingKey(item.data.key, userId, lane, item.data.contentType);
    if (isForbiddenMediaKey(item.data.key) || !owned) {
      return { ok: false, error: "forbidden" };
    }
    if (socialMediaKindFor(item.data.contentType) !== item.data.kind) {
      return { ok: false, error: "invalid" };
    }
    if (item.data.provider === SOCIAL_MUX_PROVIDER) {
      if (item.data.kind !== "video" || !isSocialMuxMediaItem(item.data)) {
        return { ok: false, error: "invalid" };
      }
    }
    items.push(storedMediaItem(item.data));
  }
  return { ok: true, items };
}

/** Post and story video complete only with a Mux playback id. */
export function socialPublishedVideoRejection(
  items: readonly SocialMediaItem[],
): SocialMediaRuleError | null {
  for (const item of items) {
    if (item.kind === "video" && !isSocialMuxMediaItem(item)) return "type";
  }
  return null;
}

export function validateMediaUpload(input: {
  contentType: string;
  byteLength: number;
  lane?: SocialMediaLane;
}):
  | { ok: true; kind: SocialMediaKind; contentType: SocialMediaContentType }
  | { ok: false; error: SocialMediaRuleError } {
  if (!isSocialMediaContentType(input.contentType)) {
    return { ok: false, error: "type" };
  }
  const kind = socialMediaKindFor(input.contentType);
  if (!kind) return { ok: false, error: "type" };
  if (!Number.isInteger(input.byteLength) || input.byteLength <= 0) {
    return { ok: false, error: "missing" };
  }
  if (input.byteLength > socialMediaMaxBytes(kind)) {
    return { ok: false, error: "tooLarge" };
  }
  return { ok: true, kind, contentType: input.contentType };
}

/** HeadObject must match the post or story row. Missing, empty, oversized, or a different type fails closed. */
export function storedSocialMediaRejection(
  item: { kind: SocialMediaKind; contentType: string },
  head: { bytes: number; contentType: string | null } | null,
): SocialMediaRuleError | null {
  if (!head || !Number.isInteger(head.bytes) || head.bytes <= 0) return "missing";
  if (head.bytes > socialMediaMaxBytes(item.kind)) return "tooLarge";
  if (head.contentType && head.contentType !== item.contentType) return "type";
  return null;
}
