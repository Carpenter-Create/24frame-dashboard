import "server-only";

import { copySocialMediaObject, headSocialMediaObject, putPublishedSocialImage, readSocialMediaObjectIfMatch } from "@/lib/s3-social-media";
import { reencodeSocialImage } from "@/lib/social-image-reencode";
import {
  isOwnedSocialMediaStagingKey,
  isSocialMuxMediaItem,
  socialMediaObjectKey,
  storedSocialMediaRejection,
  type SocialMediaItem,
  type SocialMediaKind,
  type SocialMediaLane,
  type SocialMediaRuleError,
} from "@/lib/social-media";

// Save publishes each upload key to a posts/ or stories/ key that only this
// server copy writes. The copy is pinned to the ETag that HEAD checked, so
// bytes PUT to the upload URL afterwards never reach a row, a viewer, or the
// topic tagger. Rows store only the published key.
//
// The published id is random. An id derived from the upload key and ETag
// (both known to the client) would let a row written straight to the table
// name a key before Save fills it, so a photo could appear on it later.

/**
 * HEAD every upload, check them all, then copy each one. Items come back in
 * order with the published key; Mux items come back untouched.
 */
export async function publishSocialMediaItems(
  items: readonly SocialMediaItem[],
  userId: string,
  lane: SocialMediaLane,
): Promise<
  | { ok: true; items: SocialMediaItem[] }
  | { ok: false; error: SocialMediaRuleError; kind?: SocialMediaKind }
> {
  for (const item of items) {
    if (isSocialMuxMediaItem(item)) continue;
    if (!isOwnedSocialMediaStagingKey(item.key, userId, lane, item.contentType)) {
      return { ok: false, error: "forbidden" };
    }
  }

  const cleaned = new Map<number, Uint8Array>();
  const heads = await Promise.all(
    items.map((item) =>
      isSocialMuxMediaItem(item)
        ? null
        : headSocialMediaObject(item.key, (error) => logPublishFailure(lane, "head", error)),
    ),
  );
  // Nothing is copied unless every upload passes.
  for (const [index, item] of items.entries()) {
    if (isSocialMuxMediaItem(item)) continue;
    const head = heads[index];
    const rejection = storedSocialMediaRejection(item, head);
    if (rejection) return { ok: false, error: rejection, kind: item.kind };
    if (!head?.etag) return { ok: false, error: "missing", kind: item.kind };
    // HeadObject does not return bytes. Read the whole image, decode it,
    // and keep only the re-encoded file. A trailer after the image is dropped.
    if (item.kind === "image") {
      const bytes = await readSocialMediaObjectIfMatch(item.key, head.etag);
      if (!bytes) return { ok: false, error: "missing", kind: item.kind };
      const encoded = await reencodeSocialImage(bytes, item.contentType);
      if (!encoded) return { ok: false, error: "type", kind: item.kind };
      cleaned.set(index, encoded);
    }
  }

  const published = await Promise.all(
    items.map(async (item, index): Promise<SocialMediaItem | null> => {
      const head = heads[index];
      if (isSocialMuxMediaItem(item) || !head?.etag) return item;
      const key = socialMediaObjectKey(userId, crypto.randomUUID(), item.contentType, lane);
      const encoded = cleaned.get(index);
      try {
        if (encoded) {
          await putPublishedSocialImage({ key, body: encoded, contentType: item.contentType });
        } else {
          await copySocialMediaObject({
            sourceKey: item.key,
            etag: head.etag,
            destinationKey: key,
            contentType: item.contentType,
          });
        }
      } catch (error) {
        // 412 or 409 when the SDK retries a copy whose response was lost:
        // only this copy writes the key, so a match is ours.
        const existing = await headSocialMediaObject(key);
        const expectedBytes = encoded ? encoded.byteLength : head.bytes;
        if (!existing || existing.bytes !== expectedBytes || existing.contentType !== item.contentType) {
          logPublishFailure(lane, "copy", error);
          return null;
        }
      }
      return { ...item, key };
    }),
  );
  const ready = published.filter((item): item is SocialMediaItem => item !== null);
  if (ready.length !== items.length) return { ok: false, error: "store" };
  return { ok: true, items: ready };
}

// Before Save: signing a photo PUT, the browser PUT itself (reported by the
// client), or asking Mux for a video upload or its finished asset. The member
// sees one generic message, so the cause lives here. Fields are the error
// name, HTTP status, network cause code, and the error text cut to 200
// characters. That text is ours or the provider's; none of these paths put
// keys or URLs in it.
export type SocialMediaUploadStep = "presign" | "s3-put" | "mux-create" | "mux-put" | "mux-finalize";

export function logSocialMediaUploadFailure(
  lane: SocialMediaLane,
  step: SocialMediaUploadStep,
  error: unknown,
): void {
  const failure = error as {
    name?: unknown;
    message?: unknown;
    status?: unknown;
    cause?: { code?: unknown } | null;
    $metadata?: { httpStatusCode?: unknown };
  } | null;
  const status = failure?.$metadata?.httpStatusCode ?? failure?.status;
  console.error(
    JSON.stringify({
      msg: "social media upload failed",
      lane,
      step,
      name: typeof failure?.name === "string" ? failure.name : null,
      status: typeof status === "number" ? status : null,
      cause: typeof failure?.cause?.code === "string" ? failure.cause.code : null,
      detail: typeof failure?.message === "string" ? failure.message.slice(0, 200) : null,
    }),
  );
}

// Step, name, and status only: never keys, ETags, or credentials.
function logPublishFailure(lane: SocialMediaLane, step: "head" | "copy", error: unknown): void {
  const failure = error as { name?: unknown; $metadata?: { httpStatusCode?: unknown } } | null;
  const status = failure?.$metadata?.httpStatusCode;
  console.error(
    JSON.stringify({
      msg: "social media publish failed",
      lane,
      step,
      name: typeof failure?.name === "string" ? failure.name : null,
      status: typeof status === "number" ? status : null,
    }),
  );
}
