// Cover framing — one focus model for the editor preview, the saved crop,
// the stored framing and the display.
// docs/design-locks/social-profile-stage-lock-v1.md (editor and storage
// rules carried over from social-profile-header-linkedin-lock-v1.md).
//
// Focus is a zoom and object-position fractions (0..1; 0.5 = centred).
// Zoom 1 is cover-fit in the 16:7 frame: the visible source window is
// min(iw, (16/7)·ih) wide. Zoom z shows a window 1/z of that, and focus
// places it in the slack:
//   window = min(iw, (16/7)·ih) / z wide, left edge = focus.x × (iw - window)
// and the same for y. The window does not depend on the frame width, so the
// preview, the 320×140 crop view and every desktop hero show the same
// source pixels. coverPreviewBox paints the preview from coverCropFrame,
// the frame the saved crop is cut with. Phones show the centred phone-safe
// part of that frame (coverPhoneSafeRegion), which the editor outlines in
// frame space, so the outline does not move with zoom.

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
  SOCIAL_PROFILE_COVER_STAGE,
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
 * the 2400 output (COVER_CROP_OUTPUT_WIDTH, the Stage 2400×1050 crop), so a
 * small original is never blown up more than 2×.
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

/** Source window at this zoom: min(iw, (16/7)·ih) / zoom wide, 16:7. */
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

/** How far the image at this zoom overflows a 16:7 frame of this width, per axis, in frame px. */
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

/** Nudge pad buttons, in on-screen order. Each moves the image, as a drag or arrow key does. */
export const COVER_NUDGE_DIRECTIONS = ["left", "up", "down", "right"] as const;
export type CoverNudgeDirection = (typeof COVER_NUDGE_DIRECTIONS)[number];

/** Zoom step buttons beside the slider, in on-screen order: − then +. */
export const COVER_ZOOM_STEP_CONTROLS = ["out", "in"] as const;
export type CoverZoomStepControl = (typeof COVER_ZOOM_STEP_CONTROLS)[number];

/** Every step button: the four arrows and − / +. */
export type CoverStepControl = CoverNudgeDirection | CoverZoomStepControl;

/** Hold on a step button: one step at once, then repeats after the delay at the interval. */
export const COVER_STEP_REPEAT_DELAY_MS = 350;
export const COVER_STEP_REPEAT_MS = 70;

// Zoom compares within this of an end, so float sums of 0.1 steps still read as the end.
const COVER_ZOOM_END_EPSILON = 1e-9;

const COVER_NUDGE_KEY: Record<CoverNudgeDirection, string> = {
  left: "ArrowLeft",
  up: "ArrowUp",
  down: "ArrowDown",
  right: "ArrowRight",
};

/** A nudge button step: exactly its arrow key's step (COVER_KEY_NUDGE_PX band px). */
export function coverNudgeDelta(direction: CoverNudgeDirection): { x: number; y: number } {
  return coverKeyDelta(COVER_NUDGE_KEY[direction], false) ?? { x: 0, y: 0 };
}

/**
 * True when a nudge this way cannot move the image: that axis has no slack
 * at this zoom, or the image already sits at that edge (moveCoverFocus
 * moves focus against the delta, so moving left stops at focus 1). Slack
 * is judged in the crop view, as coverHasSlack does for the drag hint.
 */
export function coverNudgeBlocked(
  focus: CoverFocus,
  image: CoverImageSize,
  direction: CoverNudgeDirection,
): boolean {
  if (!validSize(image)) return true;
  const overflow = coverBandOverflow(image, COVER_CROP_VIEW_WIDTH, focus.zoom);
  const delta = coverNudgeDelta(direction);
  if (delta.x !== 0) {
    if (overflow.x <= 0) return true;
    return delta.x < 0 ? clamp01(focus.x) >= 1 : clamp01(focus.x) <= 0;
  }
  if (overflow.y <= 0) return true;
  return delta.y < 0 ? clamp01(focus.y) >= 1 : clamp01(focus.y) <= 0;
}

function isZoomStep(control: CoverStepControl): control is CoverZoomStepControl {
  return control === "in" || control === "out";
}

/**
 * One step button press: an arrow moves like its arrow key; − / + zoom like
 * the - / + keys (COVER_ZOOM_KEY_STEP, centre held). Both clamp to the image.
 */
export function coverStepFocus(
  focus: CoverFocus,
  image: CoverImageSize,
  control: CoverStepControl,
  bandWidth: number,
): CoverFocus {
  if (isZoomStep(control)) {
    const step = control === "in" ? COVER_ZOOM_KEY_STEP : -COVER_ZOOM_KEY_STEP;
    return coverZoomTo(focus, focus.zoom + step, image);
  }
  return moveCoverFocus(focus, coverNudgeDelta(control), image, bandWidth);
}

/** True when a step button can do nothing: an arrow at its edge, − at zoom 1, + at this original's max. */
export function coverStepBlocked(focus: CoverFocus, image: CoverImageSize, control: CoverStepControl): boolean {
  if (!isZoomStep(control)) return coverNudgeBlocked(focus, image, control);
  if (!validSize(image)) return true;
  const zoom = clampCoverZoom(focus.zoom, image);
  return control === "in"
    ? zoom >= coverMaxZoom(image) - COVER_ZOOM_END_EPSILON
    : zoom <= COVER_ZOOM_MIN + COVER_ZOOM_END_EPSILON;
}

/** Zoom readout number, one decimal ("1.5"), as the slider shows it. */
export function coverZoomReadout(zoom: number): string {
  const value = Number.isFinite(zoom) ? Math.max(COVER_ZOOM_MIN, zoom) : COVER_ZOOM_MIN;
  return (Math.round(value * 10) / 10).toFixed(1);
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

/** The 320×140 crop-view frame that paints exactly what the preview shows. */
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
 * scaled from the 320-wide crop view to the frame as percentages, so it is
 * the saved crop at every frame width. Margins keep the image in flow (no
 * positioned box over the surface's focus ring); a margin percentage
 * resolves against the frame (grid cell) width, hence both margins divide
 * by the view width. Null until the original's size is known.
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

/** True when the image can move inside the 16:7 frame at this zoom. */
export function coverHasSlack(image: CoverImageSize, zoom: number): boolean {
  const overflow = coverBandOverflow(image, COVER_CROP_VIEW_WIDTH, zoom);
  return overflow.x > 0 || overflow.y > 0;
}

/**
 * Editor hint: drag when the image can move; zoom in when it cannot yet
 * but zooming would free it (an exact 16:7 photo at zoom 1); none when the
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
 * the original's natural size. Window = min(iw, (16/7)·ih) / zoom wide; its
 * left edge is focus.x × (iw - window), and the same for y. The fractions
 * carry no aspect, so profiles.cover_crop needs no change for the 16:7 frame.
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
 * the stored window width (a framing saved before zoom is zoom 1), clamped
 * to this original's range. The 16:7 window at that zoom is then centred on
 * the stored window's centre, so a framing saved in this frame reopens
 * exactly (same zoom, same window), and one saved in the earlier 4:1 band
 * reopens around the same subject (clamped to the image edge).
 */
export function coverFocusFromCrop(crop: CoverCrop, image: CoverImageSize): CoverFocus {
  if (!validSize(image)) return { ...COVER_FOCUS_CENTER };
  const zoom = clampCoverZoom(coverWindow(image).width / (crop.w * image.width), image);
  const view = coverWindow(image, zoom);
  const spanX = image.width - view.width;
  const spanY = image.height - view.height;
  const leftPx = (crop.x + crop.w / 2) * image.width - view.width / 2;
  const topPx = (crop.y + crop.h / 2) * image.height - view.height / 2;
  return {
    x: spanX > COVER_SLACK_MIN_PX ? clamp01(leftPx / spanX) : 0.5,
    y: spanY > COVER_SLACK_MIN_PX ? clamp01(topPx / spanY) : 0.5,
    zoom,
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
 * Rule-of-thirds grid over the 16:7 frame while framing: the middle column
 * band (its side edges are the vertical lines) and the middle row band (its
 * top and bottom edges are the horizontal lines). Frame space, like the
 * phone outline: no zoom or focus input, so the lines stay put.
 */
export const COVER_GRID_COLUMNS: Readonly<CoverRegion> = { x: 1 / 3, y: 0, w: 1 / 3, h: 1 };
export const COVER_GRID_ROWS: Readonly<CoverRegion> = { x: 0, y: 1 / 3, w: 1, h: 1 / 3 };

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
