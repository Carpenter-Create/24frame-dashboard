// Profile cover save — keep the original (founder decision 3, 2026-10-04).
// Storage and editor rules: docs/design-locks/social-profile-header-linkedin-lock-v1.md.
// Crop geometry: docs/design-locks/social-profile-stage-lock-v1.md.
//
// A new cover sends three things: the cropped 16:7 JPEG, 2400×1050
// ("media"), the uncropped original ("source") and the framing ("crop",
// fractions of the original). Both files are fresh staging uploads that the server copies to
// immutable keys before it stores them.
//
// Reposition sends only a new cropped JPEG and new framing, plus "opened":
// the cover_key the editor opened. The server reads the stored original
// itself and keeps it: a client never names a stored source key. "opened" is
// a compare-and-swap token only, never written: the save lands only while
// that cover is still current, so a stale tab cannot frame one original and
// write the framing over another.
//
// A cropped file alone (no source, no crop) stores a cover with no original,
// as covers saved before this lock. That is also the path when the original
// cannot be uploaded (type or size), so a cover save never fails on it.

import {
  isOwnedSocialMediaKey,
  profileCoverItemFromMedia,
  socialMediaKindFor,
  socialMediaMaxBytes,
  type SocialMediaItem,
} from "@/lib/social-media";
import { type CoverCrop, parseCoverCrop } from "@/lib/social-profile-cover-frame";

export const SOCIAL_PROFILE_COVER_SAVE_FIELDS = {
  media: "media",
  source: "source",
  crop: "crop",
  opened: "opened",
} as const;

export type SocialProfileCoverSave =
  | { mode: "framed"; item: SocialMediaItem; source: SocialMediaItem; crop: CoverCrop }
  | { mode: "reframe"; item: SocialMediaItem; crop: CoverCrop; opened: string }
  | { mode: "plain"; item: SocialMediaItem };

/** Server: the checked save, or null for any malformed or foreign part. */
export function parseSocialProfileCoverSave(
  form: FormData,
  userId: string,
): SocialProfileCoverSave | null {
  const fields = SOCIAL_PROFILE_COVER_SAVE_FIELDS;
  const item = profileCoverItemFromMedia(form.get(fields.media), userId);
  if (!item) return null;
  if (form.has(fields.source)) {
    const source = profileCoverItemFromMedia(form.get(fields.source), userId);
    const crop = parseCoverCrop(form.get(fields.crop));
    if (!source || !crop || source.key === item.key) return null;
    return { mode: "framed", item, source, crop };
  }
  if (form.has(fields.crop)) {
    const crop = parseCoverCrop(form.get(fields.crop));
    const opened = form.get(fields.opened);
    // The opened cover is a published copy in this member's posts lane.
    if (!crop || typeof opened !== "string" || !isOwnedSocialMediaKey(opened, userId, "posts")) {
      return null;
    }
    return { mode: "reframe", item, crop, opened };
  }
  return { mode: "plain", item };
}

export type CoverUploadItem = { kind: string; key: string; contentType: string };

/** Client: the form for saveSocialProfileCover. */
export function socialProfileCoverSaveForm(input: {
  item: CoverUploadItem;
  source?: CoverUploadItem | null;
  crop?: CoverCrop | null;
  /** Reposition of a stored original only: the cover_key the editor opened. */
  opened?: string | null;
}): FormData {
  const fields = SOCIAL_PROFILE_COVER_SAVE_FIELDS;
  const form = new FormData();
  form.set(fields.media, JSON.stringify([input.item]));
  if (input.source) form.set(fields.source, JSON.stringify([input.source]));
  if (input.crop) form.set(fields.crop, JSON.stringify(input.crop));
  if (input.opened && !input.source) form.set(fields.opened, input.opened);
  return form;
}

/** Client: the original can ride along only as a posts-lane still under the image cap. */
export function coverSourceUploadable(file: Pick<File, "type" | "size">): boolean {
  return (
    socialMediaKindFor(file.type) === "image" &&
    file.size > 0 &&
    file.size <= socialMediaMaxBytes("image")
  );
}

export type CoverPresign = (body: FormData) => Promise<{
  error?: string;
  key?: string;
  url?: string;
  kind?: string;
  contentType?: string;
}>;

export type CoverUploadResult =
  | { ok: true; item: CoverUploadItem }
  | { ok: false; error: string | null };

/** Client: presign a posts-lane staging key and PUT the file. Error is the server copy, if any. */
export async function uploadCoverFile(
  file: File,
  presign: CoverPresign,
  fetchImpl: typeof fetch = fetch,
): Promise<CoverUploadResult> {
  const body = new FormData();
  body.set("content_type", file.type);
  body.set("byte_length", String(file.size));
  body.set("lane", "posts");
  const signed = await presign(body);
  if (signed.error || !signed.url || !signed.key || !signed.kind || !signed.contentType) {
    return { ok: false, error: signed.error ?? null };
  }
  const put = await fetchImpl(signed.url, {
    method: "PUT",
    headers: { "Content-Type": signed.contentType },
    body: file,
  });
  if (!put.ok) return { ok: false, error: null };
  return {
    ok: true,
    item: { kind: signed.kind, key: signed.key, contentType: signed.contentType },
  };
}
