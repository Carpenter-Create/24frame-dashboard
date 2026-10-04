// Profile cover banner. Display geometry:
// docs/design-locks/social-profile-header-linkedin-lock-v1.md (founder
// approved 2026-10-04). It supersedes Lock A's display sizes (phone 112,
// desktop 224, avatar 80, lip 40). UI tokens live in social-chrome; this
// module is the numeric lock tests import.
//
// Upload master / LinkedIn header SoT = 1784×446 (Adam 2026-09-21).
// masterWidth × masterHeight is the named LinkedIn header lock.
// coverFit 1584×396 is a legacy cover-fit also accepted by LinkedIn —
// it is not the primary size. 1784×446 is the canonical target.
//
// Display: one 4:1 band at every width (aspect-[4/1]). A 4:1 file in a
// 4:1 band with object-cover shows the whole file, so what is framed is
// what lands. Crop master stays 1784×446 and is never painted in the
// profile UI.

import { SOCIAL_DESKTOP_MEASURE } from "@/lib/social-chrome";
import { SOCIAL_IMAGE_CONTENT_TYPES } from "@/lib/social-media";

export const SOCIAL_PROFILE_COVER_LOCK_A = {
  columnWidth: SOCIAL_DESKTOP_MEASURE.center,
  aspectWidth: 4,
  aspectHeight: 1,
  /** LinkedIn header SoT — 1784×446 (Adam 2026-09-21). */
  masterHeight: 446,
  /** LinkedIn header SoT — 1784×446 (Adam 2026-09-21). */
  masterWidth: 446 * 4,
  /** Legacy cover-fit also accepted by LinkedIn — not the primary size. */
  coverFitHeight: 396,
  /** Legacy cover-fit also accepted by LinkedIn — not the primary size. */
  coverFitWidth: 396 * 4,
} as const;

/**
 * Profile header lock numbers. The literal clamp strings in social-chrome
 * must match (Tailwind only sees literals; tests compare them).
 */
export const SOCIAL_PROFILE_HEADER_LOCK = {
  avatarPhone: { min: 88, cqw: 25, max: 112 },
  avatarDesktop: { min: 96, cqw: 19, max: 152 },
  ringPx: 4,
  lipRatio: 0.5,
} as const;

export const SOCIAL_PROFILE_COVER_ACCEPT = SOCIAL_IMAGE_CONTENT_TYPES.join(",");

export const COVER_CROP_VIEW_WIDTH = 320;
export const COVER_CROP_VIEW_HEIGHT = 80;
export const COVER_CROP_OUTPUT_WIDTH = SOCIAL_PROFILE_COVER_LOCK_A.masterWidth;
export const COVER_CROP_OUTPUT_HEIGHT = SOCIAL_PROFILE_COVER_LOCK_A.masterHeight;
export const COVER_CROP_OUTPUT_NAME = "cover.jpg";
export const COVER_CROP_MAX_BYTES = 10 * 1024 * 1024;

/** Trimmed cover URL. Blank is absent — visitors must not paint an empty band. */
export function socialProfileCoverPhoto(coverUrl?: string | null): string | null {
  if (typeof coverUrl !== "string") return null;
  const photo = coverUrl.trim();
  return photo.length > 0 ? photo : null;
}

/**
 * Owner keeps the band so Add cover stays on it.
 * Visitors render the band only when a real cover photo exists.
 */
export function socialProfileRendersCoverBand(input: {
  coverUrl?: string | null;
  owner: boolean;
}): boolean {
  return input.owner || socialProfileCoverPhoto(input.coverUrl) !== null;
}
