import "server-only";

import sharp from "sharp";

import { parseSocialMediaObjectKey, socialMediaObjectKey } from "@/lib/social-media";
import type { Json } from "@/lib/supabase/database.types";

// Decode and re-encode. The stored bytes are the new file, so a trailer
// after the image end marker is not kept. sharp is already a dependency.
// A buffer that is not a whole image of the declared type comes back null.

const FORMAT_FOR_TYPE = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

type ImageFormat = (typeof FORMAT_FOR_TYPE)[keyof typeof FORMAT_FOR_TYPE];

function declaredFormat(contentType: string): ImageFormat | null {
  const type = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return FORMAT_FOR_TYPE[type as keyof typeof FORMAT_FOR_TYPE] ?? null;
}

export async function reencodeSocialImage(
  bytes: Uint8Array,
  contentType: string,
): Promise<Uint8Array | null> {
  const format = declaredFormat(contentType);
  if (!format || bytes.byteLength === 0) return null;
  try {
    const animated = format === "gif" || format === "webp";
    const image = sharp(bytes, { animated, failOn: "error", limitInputPixels: 40_000_000 });
    const meta = await image.metadata();
    if (meta.format !== format) return null;
    // Rotate a single page only. sharp refuses rotate on a multi-page image,
    // and an animated WebP with an orientation tag must still publish.
    const pages = meta.pages ?? 1;
    const oriented = pages === 1 ? image.rotate() : image;
    const encoded =
      format === "jpeg"
        ? await oriented.jpeg().toBuffer()
        : format === "png"
          ? await oriented.png().toBuffer()
          : format === "webp"
            ? await oriented.webp().toBuffer()
            : await oriented.gif().toBuffer();
    if (encoded.byteLength === 0) return null;
    return new Uint8Array(encoded);
  } catch {
    return null;
  }
}

export type SocialImageRecheckPlan = "skip" | "store" | "hide";

/** Object metadata on a key this recheck wrote. A later run sees it and does not encode again. */
export const SOCIAL_IMAGE_REENCODED_METADATA = "gc-reencoded";
export const SOCIAL_IMAGE_PREVIOUS_KEY_METADATA = "gc-previous-key";

export function socialImageWasReencoded(metadata: Record<string, string> | undefined): boolean {
  return metadata?.[SOCIAL_IMAGE_REENCODED_METADATA] === "1";
}

/** skip: already re-encoded, or the bytes already match. store: write them. hide: decode failed. */
export function socialImageRecheckPlan(
  original: Uint8Array,
  reencoded: Uint8Array | null,
  alreadyReencoded = false,
): SocialImageRecheckPlan {
  if (alreadyReencoded) return "skip";
  if (!reencoded) return "hide";
  if (original.byteLength === reencoded.byteLength && original.every((byte, index) => byte === reencoded[index])) {
    return "skip";
  }
  return "store";
}

/** A new posts/ or stories/ key. Never the key the bytes were read from. */
export function recheckedSocialImageKey(originalKey: string, contentType: string, objectId: string): string {
  const parsed = parseSocialMediaObjectKey(originalKey);
  if (!parsed) throw new Error("Recheck key is not a published image");
  const next = socialMediaObjectKey(parsed.userId, objectId, contentType, parsed.lane);
  if (next === originalKey) throw new Error("Recheck must not overwrite the original key");
  return next;
}

export function pointSocialMediaAtRecheckedImage(media: unknown, fromKey: string, toKey: string): Json {
  if (fromKey === toKey) throw new Error("Recheck must not overwrite the original key");
  if (!Array.isArray(media)) throw new Error("Recheck media is not a list");
  return media.map((entry) => {
    if (!entry || typeof entry !== "object") return entry;
    const row = entry as { key?: string };
    if (row.key !== fromKey) return entry;
    return { ...entry, key: toKey };
  }) as Json;
}

export const SOCIAL_IMAGE_RECHECK_PAGE = 200;
export const SOCIAL_IMAGE_RECHECK_ORDER = "id";

export type SocialImageRecheckSurface = "post" | "story" | "avatar";

export type SocialImageRecheckItem = {
  surface: SocialImageRecheckSurface;
  parentId: string;
  key: string;
  original: Uint8Array;
  contentType: string;
  /** The object already carries the recheck marker. Do not read or write it again. */
  alreadyReencoded?: boolean;
  /** Set when the object could not be read. Not a decode failure. */
  readError?: string;
};

export type SocialImageRecheckStoreResult =
  | void
  | {
      /** The parent changed after the page was read. The new object is an orphan. */
      skipped?: boolean;
      orphanKey?: string;
      /** The pointer names this key. It is not an orphan. */
      liveKey?: string;
      /** The pointer read failed. It is not an orphan. */
      unverifiedKey?: string;
    };

export type SocialImageRecheckReport = {
  dryRun: boolean;
  skip: number;
  store: number;
  hide: number;
  reported: number;
  /** A read failed. The parent stays active so the next run tries again. */
  unfinished: number;
  /** Canonical avatar keys that are not in the bucket. Skipped, not unfinished. */
  no_object: number;
  /** Hidden post ids. A later run can set status back to active. */
  hiddenPosts: string[];
  /** Hidden story ids. */
  hiddenStories: string[];
  /** Avatar profile ids whose pointer was cleared. */
  clearedAvatars: string[];
  /** Parents whose media or avatar pointer changed before the write. */
  skippedParents: string[];
  /** New keys a successful pointer read does not name. Clean these up only through the orphan script. */
  orphanedKeys: string[];
  /** Keys the pointer names. Never delete these as orphans. */
  liveKeys: string[];
  /** Keys whose pointer read failed. Never delete these as orphans. */
  unverifiedKeys: string[];
  /** Posts that still carry a non-Mux video. Counted once, not unfinished. */
  legacyS3Video: number;
};

export function blankSocialImageRecheckReport(dryRun: boolean): SocialImageRecheckReport {
  return {
    dryRun,
    skip: 0,
    store: 0,
    hide: 0,
    reported: 0,
    unfinished: 0,
    no_object: 0,
    hiddenPosts: [],
    hiddenStories: [],
    clearedAvatars: [],
    skippedParents: [],
    orphanedKeys: [],
    liveKeys: [],
    unverifiedKeys: [],
    legacyS3Video: 0,
  };
}

function pushReportedKeys(target: string[], keys: readonly string[] | undefined): void {
  if (!keys) return;
  for (const key of keys) {
    if (key) target.push(key);
  }
}

function recordRecheckKey(
  report: SocialImageRecheckReport,
  row:
    | {
        orphanKey?: string;
        liveKey?: string;
        unverifiedKey?: string;
        unverifiedKeys?: readonly string[];
        orphanKeys?: readonly string[];
      }
    | null
    | undefined
    | void,
): void {
  if (!row) return;
  if (Array.isArray(row.unverifiedKeys) || Array.isArray(row.orphanKeys)) {
    pushReportedKeys(report.unverifiedKeys, row.unverifiedKeys);
    pushReportedKeys(report.orphanedKeys, row.orphanKeys);
    if ((row.unverifiedKeys?.length ?? 0) > 0 || (row.orphanKeys?.length ?? 0) > 0) return;
  }
  if (typeof row.liveKey === "string" && row.liveKey) {
    report.liveKeys.push(row.liveKey);
    return;
  }
  if (typeof row.unverifiedKey === "string" && row.unverifiedKey) {
    report.unverifiedKeys.push(row.unverifiedKey);
    return;
  }
  if (typeof row.orphanKey === "string" && row.orphanKey) report.orphanedKeys.push(row.orphanKey);
}

function addRecheckReport(total: SocialImageRecheckReport, page: SocialImageRecheckReport): void {
  total.skip += page.skip;
  total.store += page.store;
  total.hide += page.hide;
  total.reported += page.reported;
  total.unfinished += page.unfinished;
  total.no_object += page.no_object ?? 0;
  total.hiddenPosts.push(...(page.hiddenPosts ?? []));
  total.hiddenStories.push(...(page.hiddenStories ?? []));
  total.clearedAvatars.push(...(page.clearedAvatars ?? []));
  total.skippedParents.push(...(page.skippedParents ?? []));
  total.orphanedKeys.push(...(page.orphanedKeys ?? []));
  total.liveKeys.push(...(page.liveKeys ?? []));
  total.unverifiedKeys.push(...(page.unverifiedKeys ?? []));
  total.legacyS3Video += page.legacyS3Video ?? 0;
}

/** True only when the process was started with --execute. Dry-run is the default. */
export function recheckWantsExecute(argv: readonly string[]): boolean {
  return argv.includes("--execute");
}

/**
 * Dry-run is the default. A post or story that will not decode is hidden.
 * A read error or a store error is unfinished: reported, not hidden, and
 * still active so the next run tries it again. An avatar that will not
 * decode is cleared so the default face shows. The original bytes stay
 * where they are. One item failure does not stop the next.
 */
export async function runSocialImageRecheck(input: {
  execute: boolean;
  items: readonly SocialImageRecheckItem[];
  reencode?: (bytes: Uint8Array, contentType: string) => Promise<Uint8Array | null>;
  store: (item: SocialImageRecheckItem, bytes: Uint8Array) => Promise<SocialImageRecheckStoreResult>;
  hide: (parent: { surface: "post" | "story"; parentId: string }) => Promise<void>;
  clearAvatar?: (parentId: string) => Promise<SocialImageRecheckStoreResult>;
  report?: (line: string) => void;
}): Promise<SocialImageRecheckReport> {
  const reencode = input.reencode ?? reencodeSocialImage;
  const report = blankSocialImageRecheckReport(!input.execute);
  const hidden = new Set<string>();
  for (const item of input.items) {
    const parentKey = `${item.surface}:${item.parentId}`;
    if (hidden.has(parentKey)) continue;
    if (item.readError) {
      report.unfinished += 1;
      input.report?.(`${item.surface} ${item.parentId} unfinished: ${item.readError}`);
      continue;
    }
    if (item.alreadyReencoded) {
      report.skip += 1;
      continue;
    }
    try {
      const encoded = await reencode(item.original, item.contentType);
      const plan = socialImageRecheckPlan(item.original, encoded, item.alreadyReencoded);
      if (plan === "skip") {
        report.skip += 1;
        continue;
      }
      if (plan === "hide" || !encoded) {
        if (item.surface === "avatar") {
          report.reported += 1;
          input.report?.(`avatar ${item.parentId} did not decode`);
          if (input.execute) {
            const cleared = await input.clearAvatar?.(item.parentId);
            recordRecheckKey(report, cleared);
            if (cleared?.skipped) {
              report.skippedParents.push(`avatar:${item.parentId}`);
              input.report?.(`avatar ${item.parentId} skipped; pointer changed`);
              continue;
            }
          }
          report.clearedAvatars.push(item.parentId);
          continue;
        }
        report.hide += 1;
        if (item.surface === "post") report.hiddenPosts.push(item.parentId);
        else report.hiddenStories.push(item.parentId);
        hidden.add(parentKey);
        input.report?.(`${item.surface} ${item.parentId} hidden`);
        if (input.execute) await input.hide({ surface: item.surface, parentId: item.parentId });
        continue;
      }
      if (input.execute) {
        const stored = await input.store(item, encoded);
        recordRecheckKey(report, stored);
        if (stored?.skipped) {
          report.skippedParents.push(`${item.surface}:${item.parentId}`);
          input.report?.(`${item.surface} ${item.parentId} skipped; media changed`);
          continue;
        }
      }
      report.store += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : "recheck_failed";
      recordRecheckKey(report, error as { orphanKey?: string; liveKey?: string; unverifiedKey?: string });
      input.report?.(`${item.surface} ${item.parentId} failed: ${message}`);
      report.unfinished += 1;
    }
  }
  return report;
}

/** One parent page at a time, keyed by id. The page's bytes are dropped before the next read. */
export async function recheckParentPages<T extends { id: string }>(input: {
  execute: boolean;
  pageSize: number;
  loadParents: (afterId: string | null, limit: number) => Promise<T[]>;
  recheck: (parents: readonly T[]) => Promise<SocialImageRecheckReport>;
}): Promise<SocialImageRecheckReport> {
  const report = blankSocialImageRecheckReport(!input.execute);
  let afterId: string | null = null;
  for (;;) {
    const parents = await input.loadParents(afterId, input.pageSize);
    const page = await input.recheck(parents);
    addRecheckReport(report, page);
    if (parents.length < input.pageSize) break;
    afterId = parents[parents.length - 1]?.id ?? afterId;
    if (!afterId) break;
  }
  return report;
}

/** A post whose media still holds a video that is not Mux. The image recheck cannot repoint it. */
export function socialPostHasLegacyS3Video(media: unknown): boolean {
  if (!Array.isArray(media)) return false;
  return media.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as { kind?: string; contentType?: string; provider?: string };
    const type = (row.contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const video = row.kind === "video" || type.startsWith("video/");
    return video && row.provider !== "mux";
  });
}
