// Cover framing — one focus model for the editor preview, the saved crop,
// the stored framing and the display.
// docs/design-locks/social-profile-stage-lock-v1.md (editor and storage
// rules carried over from social-profile-header-linkedin-lock-v1.md).
//
// Focus is object-position fractions (0..1; 0.5 = centred). With
// object-fit: cover a percentage object-position gives
//   offset = (box - draw) × p
// so the visible source window is min(iw, (16/7)·ih) wide and starts at
// p × (iw - window), whatever the frame width. The preview, the 320×140
// crop view and every desktop hero therefore show the same source pixels.
// Phones show the centred phone-safe part of that frame
// (coverPhoneSafeRegion), which the editor outlines.

import { z } from "zod";

import { type AvatarCropFrame, rectCoverDrawSize } from "@/lib/account-avatar-crop";
import {
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
  SOCIAL_PROFILE_COVER_STAGE,
} from "@/lib/social-profile-cover";

export type CoverFocus = { x: number; y: number };

export type CoverImageSize = { width: number; height: number };

/** Framing of the cover inside its original: fractions of the original's natural size. */
export type CoverCrop = { x: number; y: number; w: number; h: number };

/**
 * Owner only: the stored framing and the cover_key it produced, read
 * together. coverKey is the cover version the editor opens; a Reposition
 * Save sends it back as a compare-and-swap token only (never written), so
 * the save lands only while that cover is still current.
 */
export type CoverFraming = { crop: CoverCrop; coverKey: string };

export const COVER_FOCUS_CENTER: Readonly<CoverFocus> = { x: 0.5, y: 0.5 };

/** Arrow-key nudge in band px (house space-2). Shift multiplies it. */
export const COVER_KEY_NUDGE_PX = 8;
export const COVER_KEY_NUDGE_SHIFT = 4;

/**
 * Overflow at or under half a pixel counts as none. Exact 16:7 files carry
 * float noise that would otherwise snap focus to an edge.
 */
export const COVER_SLACK_MIN_PX = 0.5;

/** The one frame: desktop hero = editor drag surface = crop (16:7). */
export const COVER_FRAME_ASPECT =
  SOCIAL_PROFILE_COVER_STAGE.aspectWidth / SOCIAL_PROFILE_COVER_STAGE.aspectHeight;

/** The phone hero card (61:55, mockup 366×330). */
export const COVER_PHONE_ASPECT =
  SOCIAL_PROFILE_COVER_STAGE.phoneAspectWidth / SOCIAL_PROFILE_COVER_STAGE.phoneAspectHeight;

const COVER_ASPECT = COVER_FRAME_ASPECT;

/** Stored framing resolution: integer millionths, so x + w <= 1 holds exactly in SQL numeric. */
const COVER_CROP_UNITS = 1_000_000;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function validSize(image: CoverImageSize): boolean {
  return (
    Number.isFinite(image.width) &&
    Number.isFinite(image.height) &&
    image.width > 0 &&
    image.height > 0
  );
}

/** How far the cover-fit image overflows a 16:7 frame of this width, per axis, in frame px. */
export function coverBandOverflow(
  image: CoverImageSize,
  bandWidth: number,
): { x: number; y: number } {
  if (!validSize(image) || !Number.isFinite(bandWidth) || bandWidth <= 0) return { x: 0, y: 0 };
  const bandHeight = bandWidth / COVER_ASPECT;
  const draw = rectCoverDrawSize(image.width, image.height, bandWidth, bandHeight, 1);
  const x = draw.width - bandWidth;
  const y = draw.height - bandHeight;
  return {
    x: x > COVER_SLACK_MIN_PX ? x : 0,
    y: y > COVER_SLACK_MIN_PX ? y : 0,
  };
}

/** Drag by delta band px. The image follows the pointer 1:1 and stops at its edge. */
export function moveCoverFocus(
  focus: CoverFocus,
  delta: { x: number; y: number },
  image: CoverImageSize,
  bandWidth: number,
): CoverFocus {
  const overflow = coverBandOverflow(image, bandWidth);
  return {
    x: overflow.x > 0 ? clamp01(focus.x - delta.x / overflow.x) : 0.5,
    y: overflow.y > 0 ? clamp01(focus.y - delta.y / overflow.y) : 0.5,
  };
}

/** Arrow keys nudge like a drag of COVER_KEY_NUDGE_PX band px (Shift × 4). */
export function coverKeyDelta(key: string, shift: boolean): { x: number; y: number } | null {
  const step = COVER_KEY_NUDGE_PX * (shift ? COVER_KEY_NUDGE_SHIFT : 1);
  if (key === "ArrowLeft") return { x: -step, y: 0 };
  if (key === "ArrowRight") return { x: step, y: 0 };
  if (key === "ArrowUp") return { x: 0, y: -step };
  if (key === "ArrowDown") return { x: 0, y: step };
  return null;
}

export type CoverDragKeyAction =
  | { type: "cancel" }
  | { type: "nudge"; delta: { x: number; y: number } }
  | { type: "hold" };

/**
 * Drag-surface keys: Escape is the keyboard Cancel, arrows the keyboard
 * drag. While Save runs both are held (swallowed, no effect), because Cancel
 * is disabled then and a cancel would close the editor while the save still
 * lands. Null: not an editor key, so the browser keeps it.
 */
export function coverDragKeyAction(
  key: string,
  shift: boolean,
  saving: boolean,
): CoverDragKeyAction | null {
  if (key === "Escape") return saving ? { type: "hold" } : { type: "cancel" };
  const delta = coverKeyDelta(key, shift);
  if (!delta) return null;
  return saving ? { type: "hold" } : { type: "nudge", delta };
}

/** CSS object-position for a focus. */
export function coverObjectPosition(focus: CoverFocus): string {
  return `${clamp01(focus.x) * 100}% ${clamp01(focus.y) * 100}%`;
}

/** The 320×140 crop-view frame that paints exactly what the preview shows. */
export function coverCropFrame(focus: CoverFocus, image: CoverImageSize): AvatarCropFrame {
  if (!validSize(image)) return { scale: 1, offsetX: 0, offsetY: 0 };
  const draw = rectCoverDrawSize(
    image.width,
    image.height,
    COVER_CROP_VIEW_WIDTH,
    COVER_CROP_VIEW_HEIGHT,
    1,
  );
  return {
    scale: 1,
    offsetX: (COVER_CROP_VIEW_WIDTH - draw.width) * clamp01(focus.x),
    offsetY: (COVER_CROP_VIEW_HEIGHT - draw.height) * clamp01(focus.y),
  };
}

/** True when the image can move inside the frame (it is not already 16:7). */
export function coverHasSlack(image: CoverImageSize): boolean {
  const overflow = coverBandOverflow(image, COVER_CROP_VIEW_WIDTH);
  return overflow.x > 0 || overflow.y > 0;
}

function coverWindow(image: CoverImageSize): { width: number; height: number } {
  const width = Math.min(image.width, COVER_ASPECT * image.height);
  return { width, height: width / COVER_ASPECT };
}

function toUnits(value: number): number {
  return Math.round(value * COVER_CROP_UNITS);
}

/**
 * Framing to store with the original: the visible window as fractions of
 * the original's natural size. Window = min(iw, (16/7)·ih) wide; its left
 * edge is focus.x × (iw - window), and the same for y. The fractions carry
 * no aspect, so profiles.cover_crop needs no change for the 16:7 frame.
 */
export function coverCropRect(focus: CoverFocus, image: CoverImageSize): CoverCrop {
  if (!validSize(image)) return { x: 0, y: 0, w: 1, h: 1 };
  const view = coverWindow(image);
  const w = Math.min(COVER_CROP_UNITS, Math.max(1, toUnits(view.width / image.width)));
  const h = Math.min(COVER_CROP_UNITS, Math.max(1, toUnits(view.height / image.height)));
  const xPx = clamp01(focus.x) * (image.width - view.width);
  const yPx = clamp01(focus.y) * (image.height - view.height);
  const x = Math.min(COVER_CROP_UNITS - w, Math.max(0, toUnits(xPx / image.width)));
  const y = Math.min(COVER_CROP_UNITS - h, Math.max(0, toUnits(yPx / image.height)));
  return {
    x: x / COVER_CROP_UNITS,
    y: y / COVER_CROP_UNITS,
    w: w / COVER_CROP_UNITS,
    h: h / COVER_CROP_UNITS,
  };
}

/**
 * Focus that reopens the original at its stored framing. The 16:7 window is
 * centred on the stored window's centre, so a framing saved in this frame
 * reopens exactly, and one saved in the earlier 4:1 band reopens around the
 * same subject (clamped to the image edge).
 */
export function coverFocusFromCrop(crop: CoverCrop, image: CoverImageSize): CoverFocus {
  if (!validSize(image)) return { ...COVER_FOCUS_CENTER };
  const view = coverWindow(image);
  const spanX = image.width - view.width;
  const spanY = image.height - view.height;
  const leftPx = (crop.x + crop.w / 2) * image.width - view.width / 2;
  const topPx = (crop.y + crop.h / 2) * image.height - view.height / 2;
  return {
    x: spanX > COVER_SLACK_MIN_PX ? clamp01(leftPx / spanX) : 0.5,
    y: spanY > COVER_SLACK_MIN_PX ? clamp01(topPx / spanY) : 0.5,
  };
}

/** A region of the frame, as fractions of its width and height. */
export type CoverRegion = { x: number; y: number; w: number; h: number };

/**
 * The part of a frame (frameAspect) that a centred object-fit: cover box
 * (boxAspect) shows. A narrower box shows a centred full-height strip; a
 * wider box a centred full-width strip.
 */
export function coverCenteredRegion(frameAspect: number, boxAspect: number): CoverRegion {
  if (
    !Number.isFinite(frameAspect) ||
    !Number.isFinite(boxAspect) ||
    frameAspect <= 0 ||
    boxAspect <= 0
  ) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }
  if (boxAspect <= frameAspect) {
    const w = boxAspect / frameAspect;
    return { x: (1 - w) / 2, y: 0, w, h: 1 };
  }
  const h = frameAspect / boxAspect;
  return { x: 0, y: (1 - h) / 2, w: 1, h };
}

/**
 * Phone-safe region of the 16:7 frame: what the 61:55 phone hero shows of
 * the saved crop (object-fit: cover, centred). The editor outlines exactly
 * this region, so outline == phone render.
 */
export function coverPhoneSafeRegion(): CoverRegion {
  return coverCenteredRegion(COVER_FRAME_ASPECT, COVER_PHONE_ASPECT);
}

/**
 * In-flow box for a region inside its frame, for an unpositioned item that
 * fills the frame (the editor's grid cell). Width and height percentages
 * resolve against the frame's width and height, but percentage margins
 * resolve against its width on both axes, so the top margin is y scaled by
 * the frame's height-to-width ratio (1 / frameAspect).
 */
export function coverRegionStyle(
  region: CoverRegion,
  frameAspect: number = COVER_FRAME_ASPECT,
): {
  marginLeft: string;
  marginTop: string;
  width: string;
  height: string;
} {
  const pct = (value: number) => `${Math.round(value * 1e6) / 1e4}%`;
  const aspect = Number.isFinite(frameAspect) && frameAspect > 0 ? frameAspect : 1;
  return {
    marginLeft: pct(region.x),
    marginTop: pct(region.y / aspect),
    width: pct(region.w),
    height: pct(region.h),
  };
}

const coverCropSchema = z.strictObject({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().gt(0).max(1),
  h: z.number().gt(0).max(1),
});

/**
 * Stored framing from a client value or a profiles.cover_crop row: four
 * numbers in 0..1, w and h > 0, x + w <= 1, y + h <= 1. Rounded to
 * millionths first, so the bounds hold exactly in the database CHECK
 * (public.profile_cover_crop_valid). Anything else is null.
 */
export function parseCoverCrop(raw: unknown): CoverCrop | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  const parsed = coverCropSchema.safeParse(value);
  if (!parsed.success) return null;
  const units = {
    x: toUnits(parsed.data.x),
    y: toUnits(parsed.data.y),
    w: toUnits(parsed.data.w),
    h: toUnits(parsed.data.h),
  };
  if (units.w < 1 || units.h < 1) return null;
  if (units.x + units.w > COVER_CROP_UNITS || units.y + units.h > COVER_CROP_UNITS) return null;
  return {
    x: units.x / COVER_CROP_UNITS,
    y: units.y / COVER_CROP_UNITS,
    w: units.w / COVER_CROP_UNITS,
    h: units.h / COVER_CROP_UNITS,
  };
}
