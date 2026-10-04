// Profile cover. Display geometry:
// docs/design-locks/social-profile-stage-lock-v1.md (founder picks
// 2026-10-04: Layout "A · Stage", cover frame "Frame once, phone area
// shown"). It supersedes the 4:1 band and the 1784×446 master of
// social-profile-header-linkedin-lock-v1.md. UI tokens live in
// social-chrome; this module is the numeric lock tests import.
//
// One frame: the desktop hero is 16:7 at every desktop width, the editor
// drag surface is that same 16:7 frame, and the saved crop is a 2400×1050
// JPEG of exactly what the member framed. Phones show the centred
// phone-safe part of that frame (coverPhoneSafeRegion in
// social-profile-cover-frame.ts) in a 61:55 card (mockup 366×330).

import { SOCIAL_IMAGE_CONTENT_TYPES, SOCIAL_IMAGE_MAX_BYTES } from "@/lib/social-media";

export const SOCIAL_PROFILE_COVER_STAGE = {
  /** Desktop hero = editor frame = crop. */
  aspectWidth: 16,
  aspectHeight: 7,
  /** Phone hero card (mockup 366×330). */
  phoneAspectWidth: 61,
  phoneAspectHeight: 55,
  /**
   * The 61:55 card is for portrait phones only. From this viewport width
   * (landscape phones, small tablets) the card is the 16:7 frame, so it is
   * never taller than a landscape screen. It shows more than the phone-safe
   * outline there, so the outline stays a lower bound.
   */
  phoneCardBelowRem: 30,
  /** Saved crop: 2400×1050 JPEG (16:7). */
  outputWidth: 2400,
  outputHeight: 1050,
  /** Hero corner (--radius-xl) and the phone card inset from the screen edge. */
  radiusPx: 24,
  phoneInsetPx: 12,
} as const;

/** One overlay step: avatar, name and handle over the scrim, in CSS px. */
export type SocialProfileHeroStep = {
  avatarPx: number;
  /** Side and bottom padding. */
  padPx: number;
  avatarNameGapPx: number;
  /** Name line box: house title 28 × 1.1, or hero 56 × 1 (leading-none). */
  nameLinePx: number;
  nameHandleGapPx: number;
  /** Handle line box: 13 or 15 × 1.375 (leading-snug). */
  handleLinePx: number;
};

/**
 * Hero overlay steps, by hero width (the `hero` container):
 * - tight, desktop only, below heroTightMaxRem (the 388 column at 1024
 *   beside For You): avatar 48, padding 16, name stays at title 28;
 * - compact, the phone sizes: avatar 64, name 28, handle 13, padding 20;
 * - large, from heroLargeMinRem: avatar 80, name 56, handle 15, padding 28.
 * Each step keeps a two-line name inside 16:7, with topGapPx of photo above
 * the avatar, at the narrowest desktop hero it serves (desktopMinHeroPx for
 * tight). Literal container-query strings in social-chrome must match
 * (Tailwind only sees literals; tests compare them).
 */
export const SOCIAL_PROFILE_STAGE_HERO = {
  heroTightMaxRem: 28,
  heroLargeMinRem: 40,
  /** The narrowest desktop hero: the centre column at 1024 beside For You. */
  desktopMinHeroPx: 388,
  /** Least photo above the avatar; the hero grows rather than cut it. */
  topGapPx: 12,
  avatarRingPx: 3,
  steps: {
    tight: { avatarPx: 48, padPx: 16, avatarNameGapPx: 8, nameLinePx: 30.8, nameHandleGapPx: 4, handleLinePx: 17.875 },
    compact: { avatarPx: 64, padPx: 20, avatarNameGapPx: 12, nameLinePx: 30.8, nameHandleGapPx: 4, handleLinePx: 17.875 },
    large: { avatarPx: 80, padPx: 28, avatarNameGapPx: 16, nameLinePx: 56, nameHandleGapPx: 8, handleLinePx: 20.625 },
  },
} as const satisfies {
  heroTightMaxRem: number;
  heroLargeMinRem: number;
  desktopMinHeroPx: number;
  topGapPx: number;
  avatarRingPx: number;
  steps: Record<"tight" | "compact" | "large", SocialProfileHeroStep>;
};

/**
 * Height the identity needs inside the hero for a name of `nameLines`
 * lines: the top gap, the avatar, the name and the handle with the step's
 * padding. The hero is 16:7 while this fits width × 7/16; past it the hero
 * grows (never truncate) and the cover keeps its own 16:7 box at the top.
 */
export function socialProfileHeroOverlayPx(step: SocialProfileHeroStep, nameLines: number): number {
  const lines = Math.max(1, Math.ceil(nameLines));
  return (
    SOCIAL_PROFILE_STAGE_HERO.topGapPx +
    step.avatarPx +
    step.avatarNameGapPx +
    lines * step.nameLinePx +
    step.nameHandleGapPx +
    step.handleLinePx +
    step.padPx
  );
}

export const SOCIAL_PROFILE_COVER_ACCEPT = SOCIAL_IMAGE_CONTENT_TYPES.join(",");

/** The crop view the editor frame maps onto (16:7). */
export const COVER_CROP_VIEW_WIDTH = 320;
export const COVER_CROP_VIEW_HEIGHT = 140;
export const COVER_CROP_OUTPUT_WIDTH = SOCIAL_PROFILE_COVER_STAGE.outputWidth;
export const COVER_CROP_OUTPUT_HEIGHT = SOCIAL_PROFILE_COVER_STAGE.outputHeight;
export const COVER_CROP_OUTPUT_NAME = "cover.jpg";
/** The posts stills lane cap the crop uploads through (10 MB). */
export const COVER_CROP_MAX_BYTES = SOCIAL_IMAGE_MAX_BYTES;

/** Trimmed cover URL. Blank is absent: the hero shows the --band fill. */
export function socialProfileCoverPhoto(coverUrl?: string | null): string | null {
  if (typeof coverUrl !== "string") return null;
  const photo = coverUrl.trim();
  return photo.length > 0 ? photo : null;
}
