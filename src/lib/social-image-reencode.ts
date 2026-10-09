import "server-only";

import sharp from "sharp";

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
    const encoded =
      format === "jpeg"
        ? await image.jpeg().toBuffer()
        : format === "png"
          ? await image.png().toBuffer()
          : format === "webp"
            ? await image.webp().toBuffer()
            : await image.gif().toBuffer();
    if (encoded.byteLength === 0) return null;
    return new Uint8Array(encoded);
  } catch {
    return null;
  }
}

export type SocialImageRecheckPlan = "skip" | "store" | "hide";

/** skip: already the re-encoded bytes. store: write them. hide: decode failed. */
export function socialImageRecheckPlan(
  original: Uint8Array,
  reencoded: Uint8Array | null,
): SocialImageRecheckPlan {
  if (!reencoded) return "hide";
  if (original.byteLength === reencoded.byteLength && original.every((byte, index) => byte === reencoded[index])) {
    return "skip";
  }
  return "store";
}

export type SocialImageRecheckSurface = "post" | "story" | "avatar";

export type SocialImageRecheckItem = {
  surface: SocialImageRecheckSurface;
  parentId: string;
  key: string;
  original: Uint8Array;
  contentType: string;
  /** Set when the object could not be read. Not a decode failure. */
  readError?: string;
};

export type SocialImageRecheckReport = {
  dryRun: boolean;
  skip: number;
  store: number;
  hide: number;
  reported: number;
  /** A read failed. The parent stays active so the next run tries again. */
  unfinished: number;
};

/**
 * Dry-run is the default. A post or story that will not decode is hidden.
 * A read error is unfinished: reported, not hidden, and still active so
 * the next run tries it again. An avatar that will not decode is reported
 * and left in place. One item failure does not stop the next.
 */
export async function runSocialImageRecheck(input: {
  execute: boolean;
  items: readonly SocialImageRecheckItem[];
  reencode?: (bytes: Uint8Array, contentType: string) => Promise<Uint8Array | null>;
  store: (item: SocialImageRecheckItem, bytes: Uint8Array) => Promise<void>;
  hide: (parent: { surface: "post" | "story"; parentId: string }) => Promise<void>;
  report?: (line: string) => void;
}): Promise<SocialImageRecheckReport> {
  const reencode = input.reencode ?? reencodeSocialImage;
  const report: SocialImageRecheckReport = {
    dryRun: !input.execute,
    skip: 0,
    store: 0,
    hide: 0,
    reported: 0,
    unfinished: 0,
  };
  const hidden = new Set<string>();
  for (const item of input.items) {
    const parentKey = `${item.surface}:${item.parentId}`;
    if (hidden.has(parentKey)) continue;
    if (item.readError) {
      report.unfinished += 1;
      input.report?.(`${item.surface} ${item.parentId} unfinished: ${item.readError}`);
      continue;
    }
    try {
      const encoded = await reencode(item.original, item.contentType);
      const plan = socialImageRecheckPlan(item.original, encoded);
      if (plan === "skip") {
        report.skip += 1;
        continue;
      }
      if (plan === "hide" || !encoded) {
        if (item.surface === "avatar") {
          report.reported += 1;
          input.report?.(`avatar ${item.parentId} did not decode`);
          continue;
        }
        report.hide += 1;
        hidden.add(parentKey);
        if (input.execute) await input.hide({ surface: item.surface, parentId: item.parentId });
        continue;
      }
      report.store += 1;
      if (input.execute) await input.store(item, encoded);
    } catch (error) {
      const message = error instanceof Error ? error.message : "recheck_failed";
      input.report?.(`${item.surface} ${item.parentId} failed: ${message}`);
      if (item.surface === "avatar") {
        report.reported += 1;
        continue;
      }
      report.hide += 1;
      hidden.add(parentKey);
      if (input.execute) {
        try {
          await input.hide({ surface: item.surface, parentId: item.parentId });
        } catch (hideError) {
          const hideMessage = hideError instanceof Error ? hideError.message : "hide_failed";
          input.report?.(`${item.surface} ${item.parentId} hide failed: ${hideMessage}`);
        }
      }
    }
  }
  return report;
}
