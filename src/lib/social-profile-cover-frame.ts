// Cover framing — one focus model for the editor preview, the saved crop,
// the stored framing and the display.
// docs/design-locks/social-profile-header-linkedin-lock-v1.md
//
// Focus is a zoom and object-position fractions (0..1; 0.5 = centred).
// Zoom 1 is cover-fit: the visible source window is min(iw, 4·ih) wide.
// Zoom z shows a window 1/z of that, and focus places it in the slack:
//   window = min(iw, 4·ih) / z wide, left edge = focus.x × (iw - window)
// and the same for y. The window does not depend on the band width, so the
// preview, the 320×80 crop view and every display band show the same
// source pixels. coverPreviewBox paints the preview from coverCropFrame,
// the frame the saved crop is cut with.

import { z } from "zod";

import {
  AVATAR_CROP_MAX_SCALE,
  type AvatarCropFrame,
  rectCoverDrawSize,
} from "@/lib/account-avatar-crop";
import {
  COVER_CROP_OUTPUT_WIDTH,
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
  SOCIAL_PROFILE_COVER_LOCK_A,
} from "@/lib/social-profile-cover";

export type CoverFocus = { x: number; y: number; zoom: number };

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

export const COVER_FOCUS_CENTER: Readonly<CoverFocus> = { x: 0.5, y: 0.5, zoom: 1 };

/** Arrow-key nudge in band px (house space-2). Shift multiplies it. */
export const COVER_KEY_NUDGE_PX = 8;
export const COVER_KEY_NUDGE_SHIFT = 4;

/** Zoom 1 = cover-fit. The ceiling is also the crop's own scale clamp. */
export const COVER_ZOOM_MIN = 1;
export const COVER_ZOOM_MAX = AVATAR_CROP_MAX_SCALE;

/**
 * Upscale cap: the saved crop's source window is never narrower than half
 * the 1784 output, so a small original is never blown up more than 2×.
 */
export const COVER_ZOOM_MAX_UPSCALE = 2;

/** Slider grid. The max zoom is floored onto it, so the slider reaches it exactly. */
export const COVER_ZOOM_STEPS_PER_UNIT = 100;
export const COVER_ZOOM_STEP = 1 / COVER_ZOOM_STEPS_PER_UNIT;

/** + / = and - zoom by this much. Shift multiplies it by COVER_KEY_NUDGE_SHIFT. */
export const COVER_ZOOM_KEY_STEP = 0.1;

/** Ctrl/Cmd + wheel and trackpad pinch: zoom × e^(-deltaY px × rate). */
export const COVER_ZOOM_WHEEL_RATE = 0.002;

// Wheel deltaMode 1 (lines, Firefox mouse wheels) and 2 (pages) in px.
const WHEEL_LINE_PX = 16;
const WHEEL_PAGE_PX = 400;

/**
 * Overflow at or under half a pixel counts as none. Exact 4:1 files carry
 * about 1e-13 px of float noise that would otherwise snap focus to an edge.
 */
export const COVER_SLACK_MIN_PX = 0.5;

const COVER_ASPECT = SOCIAL_PROFILE_COVER_LOCK_A.aspectWidth / SOCIAL_PROFILE_COVER_LOCK_A.aspectHeight;

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

/** Source window at this zoom: min(iw, 4·ih) / zoom wide, 4:1. */
function coverWindow(image: CoverImageSize, zoom = COVER_ZOOM_MIN): { width: number; height: number } {
  const width = Math.min(image.width, COVER_ASPECT * image.height) / zoom;
  return { width, height: width / COVER_ASPECT };
}

/**
 * Highest zoom for this original: 3, capped so the crop's source window
 * stays at least half the output width (no worse than 2× upscaling), and
 * floored onto the slider grid. Small originals get 1 (no zoom).
 */
export function coverMaxZoom(image: CoverImageSize): number {
  if (!validSize(image)) return COVER_ZOOM_MIN;
  const upscale = (coverWindow(image).width * COVER_ZOOM_MAX_UPSCALE) / COVER_CROP_OUTPUT_WIDTH;
  const steps = Math.floor(Math.min(COVER_ZOOM_MAX, upscale) * COVER_ZOOM_STEPS_PER_UNIT);
  return Math.max(COVER_ZOOM_MIN, steps / COVER_ZOOM_STEPS_PER_UNIT);
}

/** Zoom kept in [1, coverMaxZoom(image)]. Anything not finite is 1. */
export function clampCoverZoom(zoom: number, image: CoverImageSize): number {
  if (!Number.isFinite(zoom)) return COVER_ZOOM_MIN;
  return Math.min(coverMaxZoom(image), Math.max(COVER_ZOOM_MIN, zoom));
}

/** How far the image at this zoom overflows a 4:1 band of this width, per axis, in band px. */
export function coverBandOverflow(
  image: CoverImageSize,
  bandWidth: number,
  zoom: number,
): { x: number; y: number } {
  if (!validSize(image) || !Number.isFinite(bandWidth) || bandWidth <= 0) return { x: 0, y: 0 };
  const bandHeight = bandWidth / COVER_ASPECT;
  const draw = rectCoverDrawSize(
    image.width,
    image.height,
    bandWidth,
    bandHeight,
    clampCoverZoom(zoom, image),
  );
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
  const zoom = clampCoverZoom(focus.zoom, image);
  const overflow = coverBandOverflow(image, bandWidth, zoom);
  return {
    x: overflow.x > 0 ? clamp01(focus.x - delta.x / overflow.x) : 0.5,
    y: overflow.y > 0 ? clamp01(focus.y - delta.y / overflow.y) : 0.5,
    zoom,
  };
}

// Focus on one axis that puts the window's centre where it was, clamped to the image.
function refocusAxis(focus: number, size: number, from: number, to: number): number {
  const centre = clamp01(focus) * Math.max(0, size - from) + from / 2;
  const slack = size - to;
  if (slack <= COVER_SLACK_MIN_PX) return 0.5;
  return clamp01((centre - to / 2) / slack);
}

/**
 * Change zoom with the visible centre fixed, then clamp: the window never
 * leaves the image, and an axis with no slack centres.
 */
export function coverZoomTo(focus: CoverFocus, zoom: number, image: CoverImageSize): CoverFocus {
  if (!validSize(image)) return { ...COVER_FOCUS_CENTER };
  const next = clampCoverZoom(zoom, image);
  const from = coverWindow(image, clampCoverZoom(focus.zoom, image));
  const to = coverWindow(image, next);
  return {
    x: refocusAxis(focus.x, image.width, from.width, to.width),
    y: refocusAxis(focus.y, image.height, from.height, to.height),
    zoom: next,
  };
}

/** Ctrl/Cmd + wheel or a trackpad pinch (a wheel with ctrlKey): up zooms in. Unclamped. */
export function coverWheelZoom(zoom: number, deltaY: number, deltaMode = 0): number {
  if (!Number.isFinite(deltaY)) return zoom;
  const px = deltaY * (deltaMode === 1 ? WHEEL_LINE_PX : deltaMode === 2 ? WHEEL_PAGE_PX : 1);
  return zoom * Math.exp(-px * COVER_ZOOM_WHEEL_RATE);
}

export type CoverPoint = { x: number; y: number };

export function coverPointerDistance(a: CoverPoint, b: CoverPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Two-finger pinch: zoom scales with the finger spread. Unclamped. */
export function coverPinchZoom(startZoom: number, startDistance: number, distance: number): number {
  if (!(startDistance > 0) || !Number.isFinite(distance)) return startZoom;
  return startZoom * (distance / startDistance);
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

/**
 * + or = zooms in, - zooms out, by COVER_ZOOM_KEY_STEP (Shift × 4). On a US
 * layout Shift+= is "+" and Shift+- is "_", so those are the Shift steps.
 */
export function coverZoomKeyStep(key: string, shift: boolean): number | null {
  const step = COVER_ZOOM_KEY_STEP * (shift ? COVER_KEY_NUDGE_SHIFT : 1);
  if (key === "+" || key === "=") return step;
  if (key === "-" || key === "_") return -step;
  return null;
}

export type CoverDragKeyAction =
  | { type: "cancel" }
  | { type: "nudge"; delta: { x: number; y: number } }
  | { type: "zoom"; step: number }
  | { type: "hold" };

/**
 * Drag-surface keys: Escape is the keyboard Cancel, arrows the keyboard
 * drag, + / = and - the keyboard zoom. While Save runs all are held
 * (swallowed, no effect), because Cancel is disabled then and a cancel
 * would close the editor while the save still lands. Zoom keys with
 * Ctrl, Cmd or Alt stay the browser's (page zoom). Null: not an editor
 * key, so the browser keeps it.
 */
export function coverDragKeyAction(
  key: string,
  shift: boolean,
  saving: boolean,
  modified = false,
): CoverDragKeyAction | null {
  if (key === "Escape") return saving ? { type: "hold" } : { type: "cancel" };
  const delta = coverKeyDelta(key, shift);
  if (delta) return saving ? { type: "hold" } : { type: "nudge", delta };
  const step = coverZoomKeyStep(key, shift);
  if (step === null || modified) return null;
  return saving ? { type: "hold" } : { type: "zoom", step };
}

/** The 320×80 crop-view frame that paints exactly what the preview shows. */
export function coverCropFrame(focus: CoverFocus, image: CoverImageSize): AvatarCropFrame {
  if (!validSize(image)) return { scale: 1, offsetX: 0, offsetY: 0 };
  const zoom = clampCoverZoom(focus.zoom, image);
  const draw = rectCoverDrawSize(
    image.width,
    image.height,
    COVER_CROP_VIEW_WIDTH,
    COVER_CROP_VIEW_HEIGHT,
    zoom,
  );
  return {
    scale: zoom,
    offsetX: (COVER_CROP_VIEW_WIDTH - draw.width) * clamp01(focus.x),
    offsetY: (COVER_CROP_VIEW_HEIGHT - draw.height) * clamp01(focus.y),
  };
}

export type CoverPreviewBox = {
  width: string;
  height: string;
  marginLeft: string;
  marginTop: string;
};

function percent(value: number): string {
  return `${value * 100}%`;
}

/**
 * The editor preview: the image box is the drawn image of coverCropFrame,
 * scaled from the 320-wide crop view to the band as percentages, so it is
 * the saved crop at every band width. Margins keep the image in flow (no
 * positioned box over the surface's focus ring); a margin percentage
 * resolves against the band width, hence both margins divide by the view
 * width. Null until the original's size is known.
 */
export function coverPreviewBox(
  focus: CoverFocus,
  image: CoverImageSize | null,
): CoverPreviewBox | null {
  if (!image || !validSize(image)) return null;
  const frame = coverCropFrame(focus, image);
  const draw = rectCoverDrawSize(
    image.width,
    image.height,
    COVER_CROP_VIEW_WIDTH,
    COVER_CROP_VIEW_HEIGHT,
    frame.scale,
  );
  return {
    width: percent(draw.width / COVER_CROP_VIEW_WIDTH),
    height: percent(draw.height / COVER_CROP_VIEW_HEIGHT),
    marginLeft: percent(frame.offsetX / COVER_CROP_VIEW_WIDTH),
    marginTop: percent(frame.offsetY / COVER_CROP_VIEW_WIDTH),
  };
}

/** True when the image can move inside the band at this zoom. */
export function coverHasSlack(image: CoverImageSize, zoom: number): boolean {
  const overflow = coverBandOverflow(image, COVER_CROP_VIEW_WIDTH, zoom);
  return overflow.x > 0 || overflow.y > 0;
}

/**
 * Editor hint: drag when the image can move; zoom in when it cannot yet
 * but zooming would free it (an exact 4:1 banner at zoom 1); none when the
 * original is too small to zoom, or before it has loaded.
 */
export function coverEditorHint(
  focus: CoverFocus,
  image: CoverImageSize | null,
): "drag" | "zoom" | null {
  if (!image || !validSize(image)) return null;
  const zoom = clampCoverZoom(focus.zoom, image);
  if (coverHasSlack(image, zoom)) return "drag";
  return coverMaxZoom(image) > zoom ? "zoom" : null;
}

function toUnits(value: number): number {
  return Math.round(value * COVER_CROP_UNITS);
}

/**
 * Framing to store with the original: the visible window as fractions of
 * the original's natural size. Window = min(iw, 4·ih) / zoom wide; its left
 * edge is focus.x × (iw - window), and the same for y.
 */
export function coverCropRect(focus: CoverFocus, image: CoverImageSize): CoverCrop {
  if (!validSize(image)) return { x: 0, y: 0, w: 1, h: 1 };
  const view = coverWindow(image, clampCoverZoom(focus.zoom, image));
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
 * Focus that reopens the original at its stored framing. Zoom comes from
 * the stored window width (a framing saved before zoom is zoom 1), then
 * the window's left and top edges give the focus.
 */
export function coverFocusFromCrop(crop: CoverCrop, image: CoverImageSize): CoverFocus {
  if (!validSize(image)) return { ...COVER_FOCUS_CENTER };
  const zoom = clampCoverZoom(coverWindow(image).width / (crop.w * image.width), image);
  const view = coverWindow(image, zoom);
  const spanX = image.width - view.width;
  const spanY = image.height - view.height;
  return {
    x: spanX > COVER_SLACK_MIN_PX ? clamp01((crop.x * image.width) / spanX) : 0.5,
    y: spanY > COVER_SLACK_MIN_PX ? clamp01((crop.y * image.height) / spanY) : 0.5,
    zoom,
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
