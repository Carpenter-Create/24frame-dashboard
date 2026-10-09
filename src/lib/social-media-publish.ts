import "server-only";

import { copySocialMediaObject, headSocialMediaObject, readSocialMediaPrefix } from "@/lib/s3-social-media";
import {
  isOwnedSocialMediaStagingKey,
  isSocialMuxMediaItem,
  socialImageBytesMatchContentType,
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
    // HeadObject does not return bytes. The stored object must be a real
    // image of the declared type before the copy.
    if (item.kind === "image") {
      const prefix = await readSocialMediaPrefix(item.key);
      if (!prefix) return { ok: false, error: "missing", kind: item.kind };
      if (!socialImageBytesMatchContentType(prefix, item.contentType)) {
        return { ok: false, error: "type", kind: item.kind };
      }
    }
  }

  const published = await Promise.all(
    items.map(async (item, index): Promise<SocialMediaItem | null> => {
      const head = heads[index];
      if (isSocialMuxMediaItem(item) || !head?.etag) return item;
      const key = socialMediaObjectKey(userId, crypto.randomUUID(), item.contentType, lane);
      try {
        await copySocialMediaObject({
          sourceKey: item.key,
          etag: head.etag,
          destinationKey: key,
          contentType: item.contentType,
        });
      } catch (error) {
        // 412 or 409 when the SDK retries a copy whose response was lost:
        // only this copy writes the key, so a match is ours.
        const existing = await headSocialMediaObject(key);
        if (!existing || existing.bytes !== head.bytes || existing.contentType !== item.contentType) {
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
