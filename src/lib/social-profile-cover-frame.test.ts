import { describe, expect, it } from "vitest";

import { AVATAR_CROP_MAX_SCALE, rectCropSourceRect } from "./account-avatar-crop";
import {
  COVER_CROP_OUTPUT_HEIGHT,
  COVER_CROP_OUTPUT_WIDTH,
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
  SOCIAL_PROFILE_COVER_STAGE,
} from "./social-profile-cover";
import {
  COVER_FOCUS_CENTER,
  COVER_FRAME_ASPECT,
  COVER_GRID_COLUMNS,
  COVER_GRID_ROWS,
  COVER_KEY_NUDGE_PX,
  COVER_KEY_NUDGE_SHIFT,
  COVER_NUDGE_DIRECTIONS,
  COVER_STEP_REPEAT_DELAY_MS,
  COVER_STEP_REPEAT_MS,
  COVER_PHONE_ASPECT,
  COVER_SLACK_MIN_PX,
  COVER_ZOOM_KEY_STEP,
  COVER_ZOOM_MAX,
  COVER_ZOOM_MAX_UPSCALE,
  COVER_ZOOM_MIN,
  COVER_ZOOM_STEP,
  COVER_ZOOM_STEP_CONTROLS,
  COVER_ZOOM_WHEEL_RATE,
  type CoverFocus,
  type CoverImageSize,
  type CoverNudgeDirection,
  clampCoverZoom,
  coverBandOverflow,
  coverCenteredRegion,
  coverCropFrame,
  coverCropRect,
  coverDragKeyAction,
  coverEditorHint,
  coverFocusFromCrop,
  coverHasSlack,
  coverKeyDelta,
  coverMaxZoom,
  coverNudgeBlocked,
  coverNudgeDelta,
  coverPhoneSafeRegion,
  coverPinchZoom,
  coverPointerDistance,
  coverPreviewBox,
  coverRegionStyle,
  coverStepBlocked,
  coverStepFocus,
  coverWheelZoom,
  coverZoomKeyStep,
  coverZoomTo,
  moveCoverFocus,
  parseCoverCrop,
} from "./social-profile-cover-frame";

const IMAGES: CoverImageSize[] = [
  { width: 3000, height: 2000 },
  { width: 1920, height: 1080 },
  { width: 1584, height: 396 },
  { width: 1080, height: 1920 },
  { width: 6000, height: 1000 },
  { width: 2400, height: 1050 },
];
// Phone editor frames (390 → 366 card) and every desktop hero width.
const WIDTHS = [320, 342, 366, 406, 388, 464, 544, 644, 720];
const SPOTS = [
  { x: 0.5, y: 0.5 },
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 0.3, y: 0.8 },
];
const ZOOMS = [1, 1.25, 1.77, 2, 3];

// Every spot at every zoom this image allows (zoom clamped to its max).
function focusesFor(image: CoverImageSize): CoverFocus[] {
  return SPOTS.flatMap((spot) =>
    ZOOMS.map((zoom) => ({ ...spot, zoom: clampCoverZoom(zoom, image) })),
  );
}

// Source window at zoom z: min(iw, (16/7)·ih) / z wide, 16:7.
function windowOf(image: CoverImageSize, zoom: number) {
  const width = Math.min(image.width, (16 / 7) * image.height) / zoom;
  return { width, height: (width * 7) / 16 };
}

// What the browser lays out: the preview box from coverPreviewBox as CSS
// percentages in the 16:7 frame (the drag surface's one grid cell) W wide.
// Width and margin percentages resolve against W, height against the frame
// height W × 7/16.
function paintedSourceRect(image: CoverImageSize, frameWidth: number, focus: CoverFocus) {
  const box = coverPreviewBox(focus, image);
  if (!box) throw new Error("no preview box");
  const pct = (value: string) => {
    expect(value.endsWith("%")).toBe(true);
    return Number.parseFloat(value) / 100;
  };
  const frameHeight = (frameWidth * 7) / 16;
  const left = pct(box.marginLeft) * frameWidth;
  const top = pct(box.marginTop) * frameWidth;
  const width = pct(box.width) * frameWidth;
  const height = pct(box.height) * frameHeight;
  // The box has the image's own aspect, so object-fit: cover crops nothing inside it.
  expect(Math.abs(width / height - image.width / image.height)).toBeLessThanOrEqual(1e-9 * (image.width / image.height));
  const scale = width / image.width;
  return {
    sx: -left / scale,
    sy: -top / scale,
    sw: frameWidth / scale,
    sh: frameHeight / scale,
    scale,
  };
}

// object-fit: cover, object-position 50% 50%, in any W × H box.
function paintedSourceRectIn(image: CoverImageSize, boxWidth: number, boxHeight: number) {
  const scale = Math.max(boxWidth / image.width, boxHeight / image.height);
  const offsetX = (boxWidth - image.width * scale) * 0.5;
  const offsetY = (boxHeight - image.height * scale) * 0.5;
  return { sx: -offsetX / scale, sy: -offsetY / scale, sw: boxWidth / scale, sh: boxHeight / scale };
}

function savedSourceRect(image: CoverImageSize, focus: CoverFocus) {
  return rectCropSourceRect(
    image.width,
    image.height,
    COVER_CROP_VIEW_WIDTH,
    COVER_CROP_VIEW_HEIGHT,
    coverCropFrame(focus, image),
  );
}

function expectRectClose(
  actual: { sx: number; sy: number; sw: number; sh: number },
  expected: { sx: number; sy: number; sw: number; sh: number },
  tolerance: number,
) {
  expect(Math.abs(actual.sx - expected.sx)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.sy - expected.sy)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.sw - expected.sw)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(actual.sh - expected.sh)).toBeLessThanOrEqual(tolerance);
}

describe("cover focus model — what you frame is what lands", () => {
  it("saves exactly the source pixels the preview paints (6 images × 9 widths × 4 spots × 5 zooms)", () => {
    let checked = 0;
    for (const image of IMAGES) {
      for (const width of WIDTHS) {
        for (const focus of focusesFor(image)) {
          expectRectClose(savedSourceRect(image, focus), paintedSourceRect(image, width, focus), 1e-6);
          checked += 1;
        }
      }
    }
    expect(checked).toBe(IMAGES.length * WIDTHS.length * SPOTS.length * ZOOMS.length);
  });

  it("paints the same source window at every frame width, zoomed or not", () => {
    for (const image of IMAGES) {
      for (const zoom of [1, coverMaxZoom(image)]) {
        const focus = { x: 0.3, y: 0.8, zoom };
        expectRectClose(paintedSourceRect(image, 366, focus), paintedSourceRect(image, 720, focus), 1e-6);
      }
    }
  });

  it("zoom z shows a window 1/z of cover-fit, placed by focus in the slack", () => {
    for (const image of IMAGES) {
      for (const focus of focusesFor(image)) {
        const rect = savedSourceRect(image, focus);
        const view = windowOf(image, focus.zoom);
        const tolerance = 1e-6 * Math.max(image.width, image.height);
        expect(Math.abs(rect.sw - view.width)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(rect.sh - view.height)).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(rect.sx - focus.x * (image.width - view.width))).toBeLessThanOrEqual(tolerance);
        expect(Math.abs(rect.sy - focus.y * (image.height - view.height))).toBeLessThanOrEqual(tolerance);
        expect(coverCropFrame(focus, image).scale).toBe(focus.zoom);
      }
    }
  });

  it("stores the framing as the painted window in fractions of the original", () => {
    for (const image of IMAGES) {
      for (const focus of focusesFor(image)) {
        const crop = coverCropRect(focus, image);
        const painted = paintedSourceRect(image, 720, focus);
        const unit = 1e-6 * Math.max(image.width, image.height);
        expect(Math.abs(crop.x * image.width - painted.sx)).toBeLessThanOrEqual(unit);
        expect(Math.abs(crop.y * image.height - painted.sy)).toBeLessThanOrEqual(unit);
        expect(Math.abs(crop.w * image.width - painted.sw)).toBeLessThanOrEqual(unit);
        expect(Math.abs(crop.h * image.height - painted.sh)).toBeLessThanOrEqual(unit);
        // The stored framing is valid as written and survives the server parse.
        expect(parseCoverCrop(JSON.stringify(crop))).toEqual(crop);
        expect(Math.round(crop.x * 1e6) + Math.round(crop.w * 1e6)).toBeLessThanOrEqual(1e6);
        expect(Math.round(crop.y * 1e6) + Math.round(crop.h * 1e6)).toBeLessThanOrEqual(1e6);
      }
    }
  });

  it("reopens the original at its stored framing: zoom from the crop size, then focus", () => {
    for (const image of IMAGES) {
      for (const focus of focusesFor(image)) {
        const crop = coverCropRect(focus, image);
        const back = coverFocusFromCrop(crop, image);
        expect(Math.abs(back.zoom - focus.zoom)).toBeLessThanOrEqual(1e-5);
        const view = windowOf(image, focus.zoom);
        const spanX = image.width - view.width;
        const spanY = image.height - view.height;
        if (spanX > COVER_SLACK_MIN_PX) expect(Math.abs(back.x - focus.x)).toBeLessThanOrEqual(1e-5);
        else expect(back.x).toBe(0.5);
        if (spanY > COVER_SLACK_MIN_PX) expect(Math.abs(back.y - focus.y)).toBeLessThanOrEqual(1e-5);
        else expect(back.y).toBe(0.5);
        // The exact view comes back: saving the reopened focus stores the same
        // crop, give or take one stored millionth (0.002px on a 1584 original).
        const again = coverCropRect(back, image);
        for (const key of ["x", "y", "w", "h"] as const) {
          expect(Math.abs(Math.round(again[key] * 1e6) - Math.round(crop[key] * 1e6))).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("reads a framing saved before zoom as zoom 1", () => {
    const image = { width: 1920, height: 1080 };
    const legacy = coverCropRect({ x: 0.2, y: 0.7, zoom: 1 }, image);
    expect(legacy.w).toBe(1);
    const back = coverFocusFromCrop(legacy, image);
    expect(back.zoom).toBe(1);
    expect(Math.abs(back.y - 0.7)).toBeLessThanOrEqual(1e-5);
    // A crop wider than cover-fit (not one this editor writes) clamps to zoom 1.
    expect(coverFocusFromCrop({ x: 0, y: 0, w: 1, h: 1 }, image).zoom).toBe(1);
  });

  it("follows the pointer 1:1 in frame pixels at every zoom", () => {
    let checked = 0;
    for (const image of IMAGES) {
      for (const zoom of [1, 1.5, coverMaxZoom(image)]) {
        const start = coverZoomTo(COVER_FOCUS_CENTER, zoom, image);
        for (const width of WIDTHS) {
          const overflow = coverBandOverflow(image, width, start.zoom);
          const before = paintedSourceRect(image, width, start);
          if (overflow.x >= 20) {
            const moved = moveCoverFocus(start, { x: 10, y: 0 }, image, width);
            const after = paintedSourceRect(image, width, moved);
            expect(Math.abs(after.sx - before.sx - -10 / before.scale)).toBeLessThanOrEqual(1e-6);
            expect(Math.abs(after.sy - before.sy)).toBeLessThanOrEqual(1e-6);
            expect(moved.zoom).toBe(start.zoom);
            checked += 1;
          }
          if (overflow.y >= 20) {
            const moved = moveCoverFocus(start, { x: 0, y: 10 }, image, width);
            const after = paintedSourceRect(image, width, moved);
            expect(Math.abs(after.sy - before.sy - -10 / before.scale)).toBeLessThanOrEqual(1e-6);
            expect(Math.abs(after.sx - before.sx)).toBeLessThanOrEqual(1e-6);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(60);
  });

  it("stops at the image edge and keeps a still axis centred", () => {
    const landscape = { width: 6000, height: 1000 };
    const at = (x: number, y: number) => ({ x, y, zoom: 1 });
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 10000, y: 0 }, landscape, 390)).toEqual(at(0, 0.5));
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: -10000, y: 0 }, landscape, 390)).toEqual(at(1, 0.5));
    const portrait = { width: 1080, height: 1920 };
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: 10000 }, portrait, 720)).toEqual(at(0.5, 0));
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: -10000 }, portrait, 720)).toEqual(at(0.5, 1));
    // An axis with zero overflow stays at 0.5 whatever the drag.
    expect(moveCoverFocus(at(0.2, 0.9), { x: 500, y: 500 }, portrait, 720).x).toBe(0.5);
    // Zoomed in, both axes have slack, and both stop at the edge.
    const zoomed = { x: 0.5, y: 0.5, zoom: 1.5 };
    expect(moveCoverFocus(zoomed, { x: 10000, y: 10000 }, landscape, 390)).toEqual({ x: 0, y: 0, zoom: 1.5 });
    expect(moveCoverFocus(zoomed, { x: -10000, y: -10000 }, landscape, 390)).toEqual({ x: 1, y: 1, zoom: 1.5 });
    for (const image of IMAGES) {
      for (const width of WIDTHS) {
        for (const delta of [10000, -10000]) {
          for (const zoom of [1, 3]) {
            const start = { ...COVER_FOCUS_CENTER, zoom };
            const next = moveCoverFocus(start, { x: delta, y: delta }, image, width);
            for (const axis of [next.x, next.y]) {
              expect(axis).toBeGreaterThanOrEqual(0);
              expect(axis).toBeLessThanOrEqual(1);
            }
            expect(next.zoom).toBe(clampCoverZoom(zoom, image));
          }
        }
      }
    }
  });

  it("an exact 16:7 photo cannot move at zoom 1 (every half-pixel width) and can once zoomed in", () => {
    for (const image of [{ width: 2400, height: 1050 }, { width: 1600, height: 700 }]) {
      for (let width = 280; width <= 1200; width += 0.5) {
        expect(coverBandOverflow(image, width, 1)).toEqual({ x: 0, y: 0 });
        expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 1, y: 1 }, image, width)).toEqual(COVER_FOCUS_CENTER);
      }
      expect(coverHasSlack(image, 1)).toBe(false);
      expect(coverEditorHint(COVER_FOCUS_CENTER, image)).toBe("zoom");
      // Zoom 1.25 on a 720 frame: the image is 1.25× the frame on both axes.
      const zoomed = coverZoomTo(COVER_FOCUS_CENTER, 1.25, image);
      expect(zoomed).toEqual({ x: 0.5, y: 0.5, zoom: 1.25 });
      const overflow = coverBandOverflow(image, 720, zoomed.zoom);
      expect(overflow.x).toBeCloseTo(180, 6);
      expect(overflow.y).toBeCloseTo(78.75, 6);
      expect(coverHasSlack(image, zoomed.zoom)).toBe(true);
      expect(coverEditorHint(zoomed, image)).toBe("drag");
      const moved = moveCoverFocus(zoomed, { x: -50, y: 20 }, image, 720);
      expect(moved.x).toBeCloseTo(0.5 + 50 / 180, 9);
      expect(moved.y).toBeCloseTo(0.5 - 20 / 78.75, 9);
      expect(coverCropRect(moved, image)).not.toEqual(coverCropRect(zoomed, image));
    }
    expect(coverHasSlack({ width: 1920, height: 1080 }, 1)).toBe(true);
    // 4:1 LinkedIn-era files have slack at zoom 1: the 16:7 frame crops their
    // sides, so the 1584×396 banner drags sideways without zooming.
    expect(coverHasSlack({ width: 1784, height: 446 }, 1)).toBe(true);
    expect(coverHasSlack({ width: 1584, height: 396 }, 1)).toBe(true);
    expect(coverBandOverflow({ width: 1584, height: 396 }, 720, 1)).toEqual({ x: 540, y: 0 });
    expect(COVER_SLACK_MIN_PX).toBe(0.5);
  });

  it("nudges with the arrow keys like an 8px drag", () => {
    expect(COVER_KEY_NUDGE_PX).toBe(8);
    const image = { width: 1920, height: 1080 };
    expect(coverKeyDelta("ArrowDown", false)).toEqual({ x: 0, y: COVER_KEY_NUDGE_PX });
    expect(coverKeyDelta("ArrowUp", false)).toEqual({ x: 0, y: -COVER_KEY_NUDGE_PX });
    expect(coverKeyDelta("ArrowLeft", false)).toEqual({ x: -COVER_KEY_NUDGE_PX, y: 0 });
    expect(coverKeyDelta("ArrowRight", true)).toEqual({ x: COVER_KEY_NUDGE_PX * COVER_KEY_NUDGE_SHIFT, y: 0 });
    expect(coverKeyDelta("Enter", false)).toBeNull();
    expect(moveCoverFocus(COVER_FOCUS_CENTER, coverKeyDelta("ArrowDown", false)!, image, 390)).toEqual(
      moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: 8 }, image, 390),
    );
  });

  it("holds Escape, the arrows and the zoom keys while Save runs, as the disabled Cancel does", () => {
    // Idle editor: Escape is the keyboard Cancel, arrows the keyboard drag.
    expect(coverDragKeyAction("Escape", false, false)).toEqual({ type: "cancel" });
    expect(coverDragKeyAction("ArrowLeft", false, false)).toEqual({
      type: "nudge",
      delta: coverKeyDelta("ArrowLeft", false),
    });
    expect(coverDragKeyAction("ArrowDown", true, false)).toEqual({
      type: "nudge",
      delta: { x: 0, y: COVER_KEY_NUDGE_PX * COVER_KEY_NUDGE_SHIFT },
    });
    // + / = zoom in, - zooms out; Shift (US "+" and "_") is the bigger step.
    expect(coverDragKeyAction("=", false, false)).toEqual({ type: "zoom", step: COVER_ZOOM_KEY_STEP });
    expect(coverDragKeyAction("+", true, false)).toEqual({
      type: "zoom",
      step: COVER_ZOOM_KEY_STEP * COVER_KEY_NUDGE_SHIFT,
    });
    expect(coverDragKeyAction("+", false, false)).toEqual({ type: "zoom", step: COVER_ZOOM_KEY_STEP });
    expect(coverDragKeyAction("-", false, false)).toEqual({ type: "zoom", step: -COVER_ZOOM_KEY_STEP });
    expect(coverDragKeyAction("_", true, false)).toEqual({
      type: "zoom",
      step: -COVER_ZOOM_KEY_STEP * COVER_KEY_NUDGE_SHIFT,
    });
    expect(coverZoomKeyStep("0", false)).toBeNull();
    // Ctrl/Cmd/Alt with a zoom key is the browser's page zoom.
    expect(coverDragKeyAction("=", false, false, true)).toBeNull();
    expect(coverDragKeyAction("-", false, false, true)).toBeNull();
    // Saving: all are swallowed so the editor cannot close or change under a running save.
    expect(coverDragKeyAction("Escape", false, true)).toEqual({ type: "hold" });
    expect(coverDragKeyAction("Escape", true, true)).toEqual({ type: "hold" });
    expect(coverDragKeyAction("ArrowRight", false, true)).toEqual({ type: "hold" });
    expect(coverDragKeyAction("=", false, true)).toEqual({ type: "hold" });
    expect(coverDragKeyAction("-", true, true)).toEqual({ type: "hold" });
    // Not an editor key: the browser keeps it (Tab moves focus on to Zoom and Save).
    expect(coverDragKeyAction("Tab", false, false)).toBeNull();
    expect(coverDragKeyAction("Tab", false, true)).toBeNull();
    expect(coverDragKeyAction("Enter", false, true)).toBeNull();
  });
});

describe("cover zoom", () => {
  it("runs from 1 (cover-fit) to 3, capped at 2× upscaling of the 2400 Stage output and floored to the slider step", () => {
    expect(COVER_ZOOM_MIN).toBe(1);
    expect(COVER_ZOOM_MAX).toBe(3);
    // The crop's own scale clamp is the same ceiling, so preview and crop agree at the top.
    expect(COVER_ZOOM_MAX).toBe(AVATAR_CROP_MAX_SCALE);
    expect(COVER_ZOOM_MAX_UPSCALE).toBe(2);
    expect(COVER_ZOOM_STEP).toBe(0.01);
    // The cap is the Stage crop width (2400×1050), not the LinkedIn-era 1784:
    // the source window never goes under 1200px.
    expect(COVER_CROP_OUTPUT_WIDTH).toBe(SOCIAL_PROFILE_COVER_STAGE.outputWidth);
    expect(coverMaxZoom({ width: 2400, height: 1050 })).toBe(2);
    expect(coverMaxZoom({ width: 1600, height: 700 })).toBe(1.33);
    expect(coverMaxZoom({ width: 1920, height: 1080 })).toBe(1.6);
    expect(coverMaxZoom({ width: 3000, height: 2000 })).toBe(2.5);
    expect(coverMaxZoom({ width: 4000, height: 3000 })).toBe(3);
    expect(coverMaxZoom({ width: 6000, height: 1000 })).toBe(1.9);
    // Windows at or under 1200 at cover-fit cannot zoom: the 1584×396 banner
    // (905 wide in 16:7) and the 1784×446 file (1019) drag sideways instead.
    expect(coverMaxZoom({ width: 1584, height: 396 })).toBe(1);
    expect(coverMaxZoom({ width: 1784, height: 446 })).toBe(1);
    expect(coverMaxZoom({ width: 1080, height: 1920 })).toBe(1);
    // Small originals: exactly 1 (no zoom), never below.
    expect(coverMaxZoom({ width: 1200, height: 525 })).toBe(1);
    expect(coverMaxZoom({ width: 1210, height: 530 })).toBe(1);
    expect(coverMaxZoom({ width: 800, height: 350 })).toBe(1);
    expect(coverMaxZoom({ width: 0, height: 200 })).toBe(1);
    for (const image of [
      ...IMAGES,
      { width: 4000, height: 3000 },
      { width: 900, height: 600 },
      { width: 1200, height: 300 },
      { width: 2500, height: 700 },
      { width: 5000, height: 400 },
      { width: 3600, height: 1575 },
    ]) {
      const max = coverMaxZoom(image);
      expect(max).toBeGreaterThanOrEqual(COVER_ZOOM_MIN);
      expect(max).toBeLessThanOrEqual(COVER_ZOOM_MAX);
      expect(Math.round(max * 100) / 100).toBe(max);
      const fit = Math.min(image.width, (16 / 7) * image.height);
      if (fit >= COVER_CROP_OUTPUT_WIDTH / 2) {
        // At the max the saved crop's source window is at least half the output width…
        const crop = coverCropRect({ x: 0.5, y: 0.5, zoom: max }, image);
        expect(crop.w * image.width).toBeGreaterThanOrEqual(COVER_CROP_OUTPUT_WIDTH / 2 - 1e-6 * image.width);
        // …and one more step would break the cap, unless 3 is the limit.
        if (max < COVER_ZOOM_MAX) expect(fit / (max + COVER_ZOOM_STEP)).toBeLessThan(COVER_CROP_OUTPUT_WIDTH / 2);
      }
    }
  });

  it("clamps zoom into [1, max] everywhere it is read", () => {
    const photo = { width: 1920, height: 1080 };
    expect(clampCoverZoom(0.5, photo)).toBe(1);
    expect(clampCoverZoom(Number.NaN, photo)).toBe(1);
    expect(clampCoverZoom(Number.POSITIVE_INFINITY, photo)).toBe(1);
    expect(clampCoverZoom(1.4, photo)).toBe(1.4);
    expect(clampCoverZoom(9, photo)).toBe(1.6);
    expect(coverZoomTo(COVER_FOCUS_CENTER, 9, photo).zoom).toBe(1.6);
    expect(coverZoomTo(COVER_FOCUS_CENTER, 0.2, photo).zoom).toBe(1);
    // A focus carrying more zoom than the image allows is read at the max.
    const over = { x: 0.5, y: 0.5, zoom: 2.5 };
    expect(coverCropFrame(over, photo).scale).toBe(1.6);
    expect(coverCropRect(over, photo)).toEqual(coverCropRect({ ...over, zoom: 1.6 }, photo));
    expect(moveCoverFocus(over, { x: 0, y: 0 }, photo, 720).zoom).toBe(1.6);
    // The 1584×396 banner cannot zoom in the 16:7 frame: every read is 1.
    const banner = { width: 1584, height: 396 };
    expect(clampCoverZoom(1.77, banner)).toBe(1);
    expect(coverZoomTo(COVER_FOCUS_CENTER, 2, banner).zoom).toBe(1);
  });

  it("keeps the visible centre fixed when the zoom changes, then clamps to the image", () => {
    const centreOf = (image: CoverImageSize, focus: CoverFocus) => {
      const rect = savedSourceRect(image, focus);
      return { x: rect.sx + rect.sw / 2, y: rect.sy + rect.sh / 2, rect };
    };
    let fixed = 0;
    for (const image of [...IMAGES, { width: 4000, height: 3000 }]) {
      const max = coverMaxZoom(image);
      for (const start of focusesFor(image)) {
        for (const target of [1, 1.1, 1.5, max]) {
          const next = coverZoomTo(start, target, image);
          expect(next.zoom).toBe(clampCoverZoom(target, image));
          const before = centreOf(image, start);
          const after = centreOf(image, next);
          // The window never leaves the image.
          expect(after.rect.sx).toBeGreaterThanOrEqual(-1e-6);
          expect(after.rect.sy).toBeGreaterThanOrEqual(-1e-6);
          expect(after.rect.sx + after.rect.sw).toBeLessThanOrEqual(image.width + 1e-6);
          expect(after.rect.sy + after.rect.sh).toBeLessThanOrEqual(image.height + 1e-6);
          // Where the centre can stay (window still inside the image), it does.
          const half = { w: after.rect.sw / 2, h: after.rect.sh / 2 };
          const fitsX = before.x - half.w >= 0 && before.x + half.w <= image.width;
          const fitsY = before.y - half.h >= 0 && before.y + half.h <= image.height;
          if (fitsX) expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1e-6 * image.width);
          if (fitsY) expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1e-6 * image.height);
          if (fitsX && fitsY && next.zoom !== start.zoom) fixed += 1;
        }
      }
    }
    expect(fixed).toBeGreaterThan(50);
    // Zoomed into the top-left corner, zooming out clamps to the edge instead of leaving the image.
    const exact = { width: 2400, height: 1050 };
    const corner = { x: 0, y: 0, zoom: 2 };
    const out = coverZoomTo(corner, 1.2, exact);
    expect(out).toEqual({ x: 0, y: 0, zoom: 1.2 });
    // Back to 1 on an exact 16:7 photo there is no slack: centred.
    expect(coverZoomTo(corner, 1, exact)).toEqual(COVER_FOCUS_CENTER);
  });

  it("zooms with Ctrl/Cmd + wheel and trackpad pinch: up zooms in, down zooms out", () => {
    expect(COVER_ZOOM_WHEEL_RATE).toBe(0.002);
    expect(coverWheelZoom(1, -100)).toBeCloseTo(Math.exp(0.2), 12);
    expect(coverWheelZoom(2, 100)).toBeCloseTo(2 * Math.exp(-0.2), 12);
    // Lines (deltaMode 1) are 16px; a Firefox notch of 3 lines is a 48px step.
    expect(coverWheelZoom(1, -3, 1)).toBeCloseTo(coverWheelZoom(1, -48), 12);
    expect(coverWheelZoom(1, -1, 2)).toBeCloseTo(coverWheelZoom(1, -400), 12);
    expect(coverWheelZoom(1.5, Number.NaN)).toBe(1.5);
  });

  it("pinches with two fingers: the zoom follows the finger spread", () => {
    expect(coverPointerDistance({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50);
    expect(coverPinchZoom(1, 100, 150)).toBe(1.5);
    expect(coverPinchZoom(2, 100, 50)).toBe(1);
    expect(coverPinchZoom(1.3, 0, 80)).toBe(1.3);
    expect(coverPinchZoom(1.3, 100, Number.NaN)).toBe(1.3);
  });

  it("hints drag with slack, zoom in when only zooming frees it, nothing when it cannot move", () => {
    expect(coverEditorHint(COVER_FOCUS_CENTER, null)).toBeNull();
    expect(coverEditorHint(COVER_FOCUS_CENTER, { width: 1920, height: 1080 })).toBe("drag");
    expect(coverEditorHint(COVER_FOCUS_CENTER, { width: 2400, height: 1050 })).toBe("zoom");
    expect(coverEditorHint({ x: 0.5, y: 0.5, zoom: 1.01 }, { width: 2400, height: 1050 })).toBe("drag");
    // The 4:1 banner has sideways slack in 16:7, so it drags at zoom 1.
    expect(coverEditorHint(COVER_FOCUS_CENTER, { width: 1584, height: 396 })).toBe("drag");
    // Too small to zoom and exactly 16:7: nothing to say.
    expect(coverEditorHint(COVER_FOCUS_CENTER, { width: 800, height: 350 })).toBeNull();
  });

  it("paints the preview as the crop frame's drawn image, in frame percentages", () => {
    expect(coverPreviewBox(COVER_FOCUS_CENTER, null)).toBeNull();
    expect(coverPreviewBox(COVER_FOCUS_CENTER, { width: 0, height: 10 })).toBeNull();
    const exact = { width: 2400, height: 1050 };
    const fit = coverPreviewBox(COVER_FOCUS_CENTER, exact)!;
    expect(Number.parseFloat(fit.width)).toBeCloseTo(100, 9);
    expect(Number.parseFloat(fit.height)).toBeCloseTo(100, 9);
    expect(Math.abs(Number.parseFloat(fit.marginLeft))).toBeLessThan(1e-9);
    expect(Math.abs(Number.parseFloat(fit.marginTop))).toBeLessThan(1e-9);
    // Zoom 1.5 centred: a box 150% × 150%, shifted a quarter of the frame each way.
    const zoomed = coverPreviewBox({ x: 0.5, y: 0.5, zoom: 1.5 }, exact)!;
    expect(Number.parseFloat(zoomed.width)).toBeCloseTo(150, 9);
    expect(Number.parseFloat(zoomed.height)).toBeCloseTo(150, 9);
    expect(Number.parseFloat(zoomed.marginLeft)).toBeCloseTo(-25, 9);
    // margin-top resolves against the frame WIDTH: a quarter of the height is 0.25 × 7/16 = 10.9375% of the width.
    expect(Number.parseFloat(zoomed.marginTop)).toBeCloseTo(-10.9375, 9);
  });
});

describe("Stage frame — 16:7 frame, phone-safe region (docs/design-locks/social-profile-stage-lock-v1.md)", () => {
  it("frames 16:7 and crops through a 16:7 view", () => {
    expect(COVER_FRAME_ASPECT).toBe(16 / 7);
    expect(COVER_FRAME_ASPECT).toBe(SOCIAL_PROFILE_COVER_STAGE.aspectWidth / SOCIAL_PROFILE_COVER_STAGE.aspectHeight);
    expect(COVER_CROP_VIEW_WIDTH / COVER_CROP_VIEW_HEIGHT).toBe(COVER_FRAME_ASPECT);
    expect(coverBandOverflow({ width: 3000, height: 3000 }, 720, 1)).toEqual({ x: 0, y: 720 - 315 });
    expect(coverCropRect(COVER_FOCUS_CENTER, { width: 3200, height: 3200 })).toEqual({
      x: 0,
      y: 0.28125,
      w: 1,
      h: 0.4375,
    });
  });

  it("phone-safe region is the centred full-height strip the 61:55 phone card shows", () => {
    expect(COVER_PHONE_ASPECT).toBe(61 / 55);
    const region = coverPhoneSafeRegion();
    const w = (61 / 55) / (16 / 7);
    expect(region.w).toBeCloseTo(w, 12);
    expect(region.w).toBeCloseTo(0.4852, 4);
    expect(region.x).toBeCloseTo((1 - w) / 2, 12);
    expect(region.x).toBeCloseTo(0.2574, 4);
    expect(region).toMatchObject({ y: 0, h: 1 });
    expect(region).toEqual(coverCenteredRegion(COVER_FRAME_ASPECT, COVER_PHONE_ASPECT));
    expect(coverRegionStyle(region)).toEqual({ marginLeft: "25.7386%", marginTop: "0%", width: "48.5227%", height: "100%" });
  });

  it("equals what object-fit: cover, centred, paints of a 16:7 crop in the phone card", () => {
    // The phone hero renders the saved 2400×1050 crop with object-cover at
    // object-position 50% 50% in a W × (55/61)W card.
    const region = coverPhoneSafeRegion();
    // Portrait phones only: from 30rem of viewport the card is the 16:7 frame.
    for (const cardWidth of [296, 336, 342, 366, 406, 455]) {
      const cardHeight = (cardWidth * 55) / 61;
      const painted = paintedSourceRectIn({ width: 2400, height: 1050 }, cardWidth, cardHeight);
      expect(painted.sx / 2400).toBeCloseTo(region.x, 9);
      expect(painted.sw / 2400).toBeCloseTo(region.w, 9);
      expect(painted.sy / 1050).toBeCloseTo(region.y, 9);
      expect(painted.sh / 1050).toBeCloseTo(region.h, 9);
    }
  });

  it("outlines the phone render at every zoom: the outline is frame space, the zoom only changes what is under it", () => {
    // The outline is one fixed region of the 16:7 frame (no zoom input). The
    // phone shows that same region of the saved crop. So at any zoom, the
    // original's pixels inside the editor outline (from the preview box) are
    // the original's pixels the phone card paints (from the saved crop).
    const region = coverPhoneSafeRegion();
    const style = coverRegionStyle(region);
    let checked = 0;
    for (const image of [...IMAGES, { width: 4000, height: 3000 }]) {
      for (const focus of focusesFor(image)) {
        for (const frameWidth of [366, 720]) {
          // Editor: the outline box in frame px, mapped through the preview box.
          const painted = paintedSourceRect(image, frameWidth, focus);
          const pct = (value: string) => Number.parseFloat(value) / 100;
          const frameHeight = (frameWidth * 7) / 16;
          const outline = {
            left: pct(style.marginLeft) * frameWidth,
            top: pct(style.marginTop) * frameWidth,
            width: pct(style.width) * frameWidth,
            height: pct(style.height) * frameHeight,
          };
          const inOutline = {
            sx: painted.sx + outline.left / painted.scale,
            sy: painted.sy + outline.top / painted.scale,
            sw: outline.width / painted.scale,
            sh: outline.height / painted.scale,
          };
          // Phone: the saved crop (the exact window) shown centred in 61:55.
          const saved = savedSourceRect(image, focus);
          const card = paintedSourceRectIn(
            { width: COVER_CROP_OUTPUT_WIDTH, height: COVER_CROP_OUTPUT_HEIGHT },
            342,
            (342 * 55) / 61,
          );
          const perOut = saved.sw / COVER_CROP_OUTPUT_WIDTH;
          const onPhone = {
            sx: saved.sx + card.sx * perOut,
            sy: saved.sy + card.sy * perOut,
            sw: card.sw * perOut,
            sh: card.sh * perOut,
          };
          // The style rounds to 1e-6 of a percent; that is well under 0.01 source px.
          expectRectClose(inOutline, onPhone, 0.01);
          checked += 1;
        }
      }
    }
    expect(checked).toBe((IMAGES.length + 1) * SPOTS.length * ZOOMS.length * 2);
  });

  it("places a region with a top offset by a width-relative margin", () => {
    // Percentage margins resolve against the frame's width on both axes, so a
    // region y down a 16:7 frame needs margin-top = y × 7/16 of the width.
    // (In Chromium, a 700-wide 16:7 grid cell puts this box at 0.1190 of the
    // height with 5.2083%; the raw 11.9048% put it at 0.2721.)
    const band = coverCenteredRegion(COVER_FRAME_ASPECT, 3);
    expect(band.y).toBeCloseTo((1 - 16 / 7 / 3) / 2, 12);
    expect(coverRegionStyle(band)).toEqual({ marginLeft: "0%", marginTop: "5.2083%", width: "100%", height: "76.1905%" });
    const frameWidth = 700;
    const frameHeight = frameWidth / COVER_FRAME_ASPECT;
    const marginTopPx = (parseFloat(coverRegionStyle(band).marginTop) / 100) * frameWidth;
    expect(marginTopPx / frameHeight).toBeCloseTo(band.y, 5);
    // Another frame aspect scales the same way; a bad aspect falls back to 1.
    expect(coverRegionStyle({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 }, 2).marginTop).toBe("10%");
    expect(coverRegionStyle({ x: 0.1, y: 0.2, w: 0.5, h: 0.5 }, Number.NaN).marginTop).toBe("20%");
  });

  it("describes wider boxes as a centred full-width band, and guards bad input", () => {
    expect(coverCenteredRegion(16 / 7, 4)).toEqual({ x: 0, y: (1 - 4 / 7) / 2, w: 1, h: 4 / 7 });
    expect(coverCenteredRegion(16 / 7, 16 / 7)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(coverCenteredRegion(Number.NaN, 1)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    expect(coverCenteredRegion(2, 0)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("reopens a framing saved in the 4:1 band around the same centre", () => {
    const image = { width: 3000, height: 2000 };
    // A 4:1 window of this original: 3000 × 750 starting 500 down.
    const legacy = { x: 0, y: 0.25, w: 1, h: 0.375 };
    const focus = coverFocusFromCrop(legacy, image);
    expect(focus.zoom).toBe(1);
    const reopened = coverCropRect(focus, image);
    const centre = (crop: { y: number; h: number }) => crop.y + crop.h / 2;
    expect(centre(reopened)).toBeCloseTo(centre(legacy), 5);
    expect(reopened.h * image.height).toBeCloseTo((3000 * 7) / 16, 0);
    // Near an edge the 16:7 window clamps to the image instead of overflowing.
    const top = coverFocusFromCrop({ x: 0, y: 0, w: 1, h: 0.375 }, image);
    expect(top.y).toBe(0);
  });

  it("reopens a zoomed 4:1 framing at the zoom its width implies, centred on the same subject", () => {
    // Saved on the 4:1 editor at zoom 2, centred, on a 4000×3000 photo: a
    // 2000 × 500 window at (1000, 1250).
    const image = { width: 4000, height: 3000 };
    const legacy = { x: 0.25, y: 1250 / 3000, w: 0.5, h: 500 / 3000 };
    const focus = coverFocusFromCrop(legacy, image);
    expect(focus.zoom).toBeCloseTo(2, 9);
    expect(focus.x).toBeCloseTo(0.5, 9);
    expect(focus.y).toBeCloseTo(0.5, 9);
    const reopened = coverCropRect(focus, image);
    // Same width (same zoom), same centre, 16:7 height (2000 × 875).
    expect(reopened.w).toBe(legacy.w);
    expect((reopened.x + reopened.w / 2) * image.width).toBeCloseTo(2000, 2);
    expect((reopened.y + reopened.h / 2) * image.height).toBeCloseTo(1500, 2);
    expect(reopened.h * image.height).toBeCloseTo(875, 2);
    // A 4:1 zoom past this original's 16:7 range reads at its max.
    const banner = { width: 1584, height: 396 };
    const narrow = coverFocusFromCrop({ x: 0.2, y: 0, w: 0.565, h: 1 }, banner);
    expect(narrow.zoom).toBe(1);
  });
});

describe("parseCoverCrop — server check of the stored framing", () => {
  it("accepts four numbers in 0..1 with x + w <= 1 and y + h <= 1", () => {
    expect(parseCoverCrop({ x: 0.1, y: 0, w: 0.5, h: 0.25 })).toEqual({ x: 0.1, y: 0, w: 0.5, h: 0.25 });
    expect(parseCoverCrop('{"x":0.5,"y":0.75,"w":0.5,"h":0.25}')).toEqual({ x: 0.5, y: 0.75, w: 0.5, h: 0.25 });
    expect(parseCoverCrop({ x: 0, y: 0, w: 1, h: 1 })).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("rejects out-of-range, non-number, missing, extra and non-object framings", () => {
    for (const bad of [
      { x: 0.6, y: 0, w: 0.5, h: 0.25 },
      { x: 0, y: 0.8, w: 0.5, h: 0.25 },
      { x: -0.1, y: 0, w: 0.5, h: 0.25 },
      { x: 0, y: 0, w: 0, h: 0.25 },
      { x: 0, y: 0, w: 0.5, h: 0 },
      { x: "0.1", y: 0, w: 0.5, h: 0.25 },
      { x: 0, y: 0, w: 0.5, h: null },
      { x: 0, y: 0, w: 0.5 },
      { x: 0, y: 0, w: 0.5, h: 0.25, z: 1 },
      { x: Number.POSITIVE_INFINITY, y: 0, w: 0.5, h: 0.25 },
      { x: 0, y: 0, w: 1e-9, h: 0.25 },
      [0, 0, 1, 0.25],
      null,
      "not json",
      42,
    ]) {
      expect(parseCoverCrop(bad)).toBeNull();
    }
  });

  it("rounds to millionths so the database CHECK sees the same sums", () => {
    // 0.30000000000000004 + 0.7 is 1 in floats but > 1 in SQL numeric.
    const parsed = parseCoverCrop({ x: 0.30000000000000004, y: 0, w: 0.7, h: 0.25 });
    expect(parsed).toEqual({ x: 0.3, y: 0, w: 0.7, h: 0.25 });
    expect(String(parsed?.x)).toBe("0.3");
  });

  it("keeps x + w <= 1 and y + h <= 1 for zoomed crops pushed to the far edge", () => {
    const units = (value: number) => Math.round(value * 1e6);
    for (const image of [...IMAGES, { width: 1585, height: 397 }, { width: 2999, height: 1001 }, { width: 4000, height: 3000 }]) {
      for (const zoom of [1, 1.13, 1.77, coverMaxZoom(image)]) {
        const crop = coverCropRect({ x: 1, y: 1, zoom: clampCoverZoom(zoom, image) }, image);
        expect(units(crop.x) + units(crop.w)).toBeLessThanOrEqual(1e6);
        expect(units(crop.y) + units(crop.h)).toBeLessThanOrEqual(1e6);
        expect(parseCoverCrop(crop)).toEqual(crop);
      }
    }
    // Far-edge crops whose y and h both round up to the next millionth:
    // unclamped they sum to 1.000001 and the server refuses the save. The
    // far edge gives way by one millionth instead. (In the 16:7 frame the
    // window height is a multiple of 7/16, so these land on other sizes than
    // the 4:1 band's did; none was found on x up to 4000 wide.)
    expect(coverCropRect({ x: 1, y: 1, zoom: 1 }, { width: 267, height: 200 })).toEqual({
      x: 0,
      y: 0.415937,
      w: 1,
      h: 0.584063,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1 }, { width: 106, height: 80 })).toEqual({
      x: 0,
      y: 0.420312,
      w: 1,
      h: 0.579688,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.04 }, { width: 1599, height: 700 })).toEqual({
      x: 0.038462,
      y: 0.039062,
      w: 0.961538,
      h: 0.960938,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.12 }, { width: 1667, height: 1250 })).toEqual({
      x: 0.107143,
      y: 0.479062,
      w: 0.892857,
      h: 0.520938,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.6 }, { width: 1920, height: 1920 })).toEqual({
      x: 0.375,
      y: 0.726562,
      w: 0.625,
      h: 0.273438,
    });
    // Every integer width 100..2400 at 16:7, 4:1 banner, square and 4:3
    // shapes, on the whole slider grid: the far-edge crop always passes the
    // server check.
    const refused: string[] = [];
    for (let width = 100; width <= 2400; width += 1) {
      for (const height of [Math.round((width * 7) / 16), Math.round(width / 4), width, Math.round(width * 0.75)]) {
        const image = { width, height };
        const steps = Math.round((coverMaxZoom(image) - 1) / COVER_ZOOM_STEP);
        for (let step = 0; step <= steps; step += 1) {
          const zoom = 1 + step * COVER_ZOOM_STEP;
          const crop = coverCropRect({ x: 1, y: 1, zoom }, image);
          const fits = units(crop.x) + units(crop.w) <= 1e6 && units(crop.y) + units(crop.h) <= 1e6;
          if (!fits || parseCoverCrop(crop) === null) refused.push(`${width}x${height}@${zoom.toFixed(2)}`);
        }
      }
    }
    expect(refused).toEqual([]);
  });
});

// docs/design-locks/social-profile-cover-grid-nudge-lock-v1.md
describe("cover nudge pad", () => {
  const KEYS: Record<CoverNudgeDirection, string> = {
    left: "ArrowLeft",
    up: "ArrowUp",
    down: "ArrowDown",
    right: "ArrowRight",
  };

  it("steps exactly as its arrow key does, in pad order, with the hold timings", () => {
    expect(COVER_NUDGE_DIRECTIONS).toEqual(["left", "up", "down", "right"]);
    for (const direction of COVER_NUDGE_DIRECTIONS) {
      expect(coverNudgeDelta(direction)).toEqual(coverKeyDelta(KEYS[direction], false));
    }
    expect(coverNudgeDelta("left")).toEqual({ x: -COVER_KEY_NUDGE_PX, y: 0 });
    expect(COVER_STEP_REPEAT_DELAY_MS).toBe(350);
    expect(COVER_STEP_REPEAT_MS).toBe(70);
  });

  it("moves the image the way its arrow points", () => {
    const image = { width: 1920, height: 1080 };
    const start = coverZoomTo(COVER_FOCUS_CENTER, 1.5, image);
    const box = (focus: CoverFocus) => {
      const preview = coverPreviewBox(focus, image)!;
      return { left: parseFloat(preview.marginLeft), top: parseFloat(preview.marginTop) };
    };
    const step = (direction: CoverNudgeDirection) => box(moveCoverFocus(start, coverNudgeDelta(direction), image, 366));
    expect(step("left").left).toBeLessThan(box(start).left);
    expect(step("right").left).toBeGreaterThan(box(start).left);
    expect(step("up").top).toBeLessThan(box(start).top);
    expect(step("down").top).toBeGreaterThan(box(start).top);
    expect(step("left").top).toBeCloseTo(box(start).top, 9);
    expect(step("up").left).toBeCloseTo(box(start).left, 9);
  });

  it("blocks a direction at that edge, or on an axis with no slack", () => {
    const blocked = (focus: CoverFocus, image: CoverImageSize) =>
      COVER_NUDGE_DIRECTIONS.filter((direction) => coverNudgeBlocked(focus, image, direction));
    // 16:9 at zoom 1 fills the frame's width: only up and down move it.
    const wide = { width: 1920, height: 1080 };
    expect(blocked(COVER_FOCUS_CENTER, wide)).toEqual(["left", "right"]);
    // Moving up pushes focus toward 1, so focus 1 is the top edge's stop.
    expect(blocked({ x: 0.5, y: 1, zoom: 1 }, wide)).toEqual(["left", "up", "right"]);
    expect(blocked({ x: 0.5, y: 0, zoom: 1 }, wide)).toEqual(["left", "down", "right"]);
    // The 1584×396 banner only drags sideways.
    const banner = { width: 1584, height: 396 };
    expect(blocked(COVER_FOCUS_CENTER, banner)).toEqual(["up", "down"]);
    expect(blocked({ x: 0, y: 0.5, zoom: 1 }, banner)).toEqual(["up", "down", "right"]);
    expect(blocked({ x: 1, y: 0.5, zoom: 1 }, banner)).toEqual(["left", "up", "down"]);
    // An exact 16:7 photo cannot move at zoom 1, and can in every direction once zoomed.
    const exact = { width: 2400, height: 1050 };
    expect(blocked(COVER_FOCUS_CENTER, exact)).toEqual([...COVER_NUDGE_DIRECTIONS]);
    expect(blocked(coverZoomTo(COVER_FOCUS_CENTER, 1.5, exact), exact)).toEqual([]);
    // Before the original's size is known, nothing nudges.
    expect(blocked(COVER_FOCUS_CENTER, { width: 0, height: 0 })).toEqual([...COVER_NUDGE_DIRECTIONS]);
  });

  it("held nudges walk to the edge and stop there, never past the image", () => {
    for (const image of IMAGES) {
      for (const width of WIDTHS) {
        for (const zoom of [1, 1.5]) {
          for (const direction of COVER_NUDGE_DIRECTIONS) {
            let focus = coverZoomTo(COVER_FOCUS_CENTER, zoom, image);
            let steps = 0;
            while (!coverNudgeBlocked(focus, image, direction) && steps < 2000) {
              focus = moveCoverFocus(focus, coverNudgeDelta(direction), image, width);
              steps += 1;
            }
            // Every hold ends: the edge (or no slack) blocks the button.
            expect(coverNudgeBlocked(focus, image, direction)).toBe(true);
            expect(steps).toBeLessThan(2000);
            // One more step changes nothing, and the window stays inside the original.
            expect(moveCoverFocus(focus, coverNudgeDelta(direction), image, width)).toEqual(focus);
            const rect = coverCropRect(focus, image);
            expect(parseCoverCrop(rect)).toEqual(rect);
            expect(rect.x + rect.w).toBeLessThanOrEqual(1);
            expect(rect.y + rect.h).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });
});

describe("cover framing grid", () => {
  it("draws the rule of thirds over the whole 16:7 frame", () => {
    // Column band: its side edges are the vertical lines at 1/3 and 2/3.
    expect(COVER_GRID_COLUMNS.x).toBeCloseTo(1 / 3, 12);
    expect(COVER_GRID_COLUMNS.x + COVER_GRID_COLUMNS.w).toBeCloseTo(2 / 3, 12);
    expect(COVER_GRID_COLUMNS.y).toBe(0);
    expect(COVER_GRID_COLUMNS.h).toBe(1);
    // Row band: its top and bottom edges are the horizontal lines at 1/3 and 2/3.
    expect(COVER_GRID_ROWS.y).toBeCloseTo(1 / 3, 12);
    expect(COVER_GRID_ROWS.y + COVER_GRID_ROWS.h).toBeCloseTo(2 / 3, 12);
    expect(COVER_GRID_ROWS.x).toBe(0);
    expect(COVER_GRID_ROWS.w).toBe(1);
  });

  it("places both bands with in-flow margins, the row's top scaled by 7/16", () => {
    expect(coverRegionStyle(COVER_GRID_COLUMNS)).toEqual({
      marginLeft: "33.3333%",
      marginTop: "0%",
      width: "33.3333%",
      height: "100%",
    });
    expect(coverRegionStyle(COVER_GRID_ROWS)).toEqual({
      marginLeft: "0%",
      marginTop: "14.5833%",
      width: "100%",
      height: "33.3333%",
    });
    // A percentage margin resolves against the frame's width: at 720 the
    // 315-tall frame's first horizontal line sits 105 down.
    for (const frameWidth of WIDTHS) {
      const top = (parseFloat(coverRegionStyle(COVER_GRID_ROWS).marginTop) / 100) * frameWidth;
      expect(top).toBeCloseTo(frameWidth / COVER_FRAME_ASPECT / 3, 1);
    }
  });
});

describe("cover zoom step buttons", () => {
  it("− then +, each the - / + key's step with the centre held", () => {
    expect(COVER_ZOOM_STEP_CONTROLS).toEqual(["out", "in"]);
    const image = { width: 4000, height: 3000 };
    const start = coverZoomTo({ x: 0.3, y: 0.7, zoom: 1.5 }, 1.5, image);
    expect(coverStepFocus(start, image, "in", 366)).toEqual(coverZoomTo(start, 1.5 + COVER_ZOOM_KEY_STEP, image));
    expect(coverStepFocus(start, image, "out", 366)).toEqual(coverZoomTo(start, 1.5 - COVER_ZOOM_KEY_STEP, image));
    // An arrow through the same entry point is its nudge.
    expect(coverStepFocus(start, image, "left", 366)).toEqual(moveCoverFocus(start, coverNudgeDelta("left"), image, 366));
  });

  it("− greys out at zoom 1 and + at this original's max, even after float sums of 0.1", () => {
    const image = { width: 2400, height: 1050 };
    expect(coverMaxZoom(image)).toBe(2);
    let focus: CoverFocus = { ...COVER_FOCUS_CENTER };
    expect(coverStepBlocked(focus, image, "out")).toBe(true);
    expect(coverStepBlocked(focus, image, "in")).toBe(false);
    let steps = 0;
    while (!coverStepBlocked(focus, image, "in") && steps < 100) {
      focus = coverStepFocus(focus, image, "in", 366);
      steps += 1;
    }
    expect(steps).toBe(10);
    expect(focus.zoom).toBe(2);
    expect(coverStepBlocked(focus, image, "out")).toBe(false);
    steps = 0;
    while (!coverStepBlocked(focus, image, "out") && steps < 100) {
      focus = coverStepFocus(focus, image, "out", 366);
      steps += 1;
    }
    expect(steps).toBe(10);
    expect(focus.zoom).toBeCloseTo(1, 9);
    // A banner too small to zoom: both stay grey.
    const banner = { width: 1584, height: 396 };
    expect(coverStepBlocked(COVER_FOCUS_CENTER, banner, "in")).toBe(true);
    expect(coverStepBlocked(COVER_FOCUS_CENTER, banner, "out")).toBe(true);
    expect(coverStepBlocked(COVER_FOCUS_CENTER, { width: 0, height: 0 }, "in")).toBe(true);
  });
});
