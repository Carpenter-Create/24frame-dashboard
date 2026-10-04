import { describe, expect, it } from "vitest";

import { AVATAR_CROP_MAX_SCALE, rectCropSourceRect } from "./account-avatar-crop";
import {
  COVER_CROP_OUTPUT_WIDTH,
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
} from "./social-profile-cover";
import {
  COVER_FOCUS_CENTER,
  COVER_KEY_NUDGE_PX,
  COVER_KEY_NUDGE_SHIFT,
  COVER_SLACK_MIN_PX,
  COVER_ZOOM_KEY_STEP,
  COVER_ZOOM_MAX,
  COVER_ZOOM_MAX_UPSCALE,
  COVER_ZOOM_MIN,
  COVER_ZOOM_STEP,
  COVER_ZOOM_WHEEL_RATE,
  type CoverFocus,
  type CoverImageSize,
  clampCoverZoom,
  coverBandOverflow,
  coverCropFrame,
  coverCropRect,
  coverDragKeyAction,
  coverEditorHint,
  coverFocusFromCrop,
  coverHasSlack,
  coverKeyDelta,
  coverMaxZoom,
  coverPinchZoom,
  coverPointerDistance,
  coverPreviewBox,
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
  { width: 1784, height: 446 },
];
const WIDTHS = [320, 360, 390, 430, 386, 462, 642, 718, 913];
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

// Source window at zoom z: min(iw, 4·ih) / z wide, 4:1.
function windowOf(image: CoverImageSize, zoom: number) {
  const width = Math.min(image.width, 4 * image.height) / zoom;
  return { width, height: width / 4 };
}

// What the browser lays out: the preview box from coverPreviewBox as CSS
// percentages in a 4:1 band W wide. Width and margin percentages resolve
// against W, height against the band height W / 4.
function paintedSourceRect(image: CoverImageSize, bandWidth: number, focus: CoverFocus) {
  const box = coverPreviewBox(focus, image);
  if (!box) throw new Error("no preview box");
  const pct = (value: string) => {
    expect(value.endsWith("%")).toBe(true);
    return Number.parseFloat(value) / 100;
  };
  const bandHeight = bandWidth / 4;
  const left = pct(box.marginLeft) * bandWidth;
  const top = pct(box.marginTop) * bandWidth;
  const width = pct(box.width) * bandWidth;
  const height = pct(box.height) * bandHeight;
  // The box has the image's own aspect, so object-fit: cover crops nothing inside it.
  expect(Math.abs(width / height - image.width / image.height)).toBeLessThanOrEqual(1e-9 * (image.width / image.height));
  const scale = width / image.width;
  return {
    sx: -left / scale,
    sy: -top / scale,
    sw: bandWidth / scale,
    sh: bandHeight / scale,
    scale,
  };
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

  it("paints the same source window at every band width, zoomed or not", () => {
    for (const image of IMAGES) {
      for (const zoom of [1, coverMaxZoom(image)]) {
        const focus = { x: 0.3, y: 0.8, zoom };
        expectRectClose(paintedSourceRect(image, 390, focus), paintedSourceRect(image, 718, focus), 1e-6);
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
        const painted = paintedSourceRect(image, 718, focus);
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

  it("follows the pointer 1:1 in band pixels at every zoom", () => {
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
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: 10000 }, portrait, 718)).toEqual(at(0.5, 0));
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: -10000 }, portrait, 718)).toEqual(at(0.5, 1));
    // An axis with zero overflow stays at 0.5 whatever the drag.
    expect(moveCoverFocus(at(0.2, 0.9), { x: 500, y: 500 }, portrait, 718).x).toBe(0.5);
    // Zoomed in, both axes have slack, and both stop at the edge.
    const zoomed = { x: 0.5, y: 0.5, zoom: 2 };
    expect(moveCoverFocus(zoomed, { x: 10000, y: 10000 }, landscape, 390)).toEqual({ x: 0, y: 0, zoom: 2 });
    expect(moveCoverFocus(zoomed, { x: -10000, y: -10000 }, landscape, 390)).toEqual({ x: 1, y: 1, zoom: 2 });
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

  it("an exact 4:1 banner cannot move at zoom 1 and can once zoomed in", () => {
    for (const image of [{ width: 1784, height: 446 }, { width: 1584, height: 396 }]) {
      for (let width = 280; width <= 1200; width += 0.5) {
        expect(coverBandOverflow(image, width, 1)).toEqual({ x: 0, y: 0 });
        expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 1, y: 1 }, image, width)).toEqual(COVER_FOCUS_CENTER);
      }
      expect(coverHasSlack(image, 1)).toBe(false);
      expect(coverEditorHint(COVER_FOCUS_CENTER, image)).toBe("zoom");
      // Zoom 1.5 on a 718 band: the image is 1.5× the band on both axes.
      const zoomed = coverZoomTo(COVER_FOCUS_CENTER, 1.5, image);
      expect(zoomed).toEqual({ x: 0.5, y: 0.5, zoom: 1.5 });
      const overflow = coverBandOverflow(image, 718, zoomed.zoom);
      expect(overflow.x).toBeCloseTo(359, 6);
      expect(overflow.y).toBeCloseTo(89.75, 6);
      expect(coverHasSlack(image, zoomed.zoom)).toBe(true);
      expect(coverEditorHint(zoomed, image)).toBe("drag");
      const moved = moveCoverFocus(zoomed, { x: -100, y: 40 }, image, 718);
      expect(moved.x).toBeCloseTo(0.5 + 100 / 359, 9);
      expect(moved.y).toBeCloseTo(0.5 - 40 / 89.75, 9);
      expect(coverCropRect(moved, image)).not.toEqual(coverCropRect(zoomed, image));
    }
    expect(coverHasSlack({ width: 1920, height: 1080 }, 1)).toBe(true);
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
  it("runs from 1 (cover-fit) to 3, capped at 2× upscaling of the 1784 output and floored to the slider step", () => {
    expect(COVER_ZOOM_MIN).toBe(1);
    expect(COVER_ZOOM_MAX).toBe(3);
    // The crop's own scale clamp is the same ceiling, so preview and crop agree at the top.
    expect(COVER_ZOOM_MAX).toBe(AVATAR_CROP_MAX_SCALE);
    expect(COVER_ZOOM_MAX_UPSCALE).toBe(2);
    expect(COVER_ZOOM_STEP).toBe(0.01);
    expect(coverMaxZoom({ width: 1584, height: 396 })).toBe(1.77);
    expect(coverMaxZoom({ width: 1784, height: 446 })).toBe(2);
    expect(coverMaxZoom({ width: 1920, height: 1080 })).toBe(2.15);
    expect(coverMaxZoom({ width: 1080, height: 1920 })).toBe(1.21);
    expect(coverMaxZoom({ width: 3000, height: 2000 })).toBe(3);
    expect(coverMaxZoom({ width: 6000, height: 1000 })).toBe(3);
    // Small originals: exactly 1 (no zoom), never below.
    expect(coverMaxZoom({ width: 892, height: 223 })).toBe(1);
    expect(coverMaxZoom({ width: 900, height: 225 })).toBe(1);
    expect(coverMaxZoom({ width: 800, height: 200 })).toBe(1);
    expect(coverMaxZoom({ width: 0, height: 200 })).toBe(1);
    for (const image of [
      ...IMAGES,
      { width: 900, height: 600 },
      { width: 1200, height: 300 },
      { width: 2500, height: 700 },
      { width: 5000, height: 400 },
    ]) {
      const max = coverMaxZoom(image);
      expect(max).toBeGreaterThanOrEqual(COVER_ZOOM_MIN);
      expect(max).toBeLessThanOrEqual(COVER_ZOOM_MAX);
      expect(Math.round(max * 100) / 100).toBe(max);
      const fit = Math.min(image.width, 4 * image.height);
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
    const banner = { width: 1584, height: 396 };
    expect(clampCoverZoom(0.5, banner)).toBe(1);
    expect(clampCoverZoom(Number.NaN, banner)).toBe(1);
    expect(clampCoverZoom(Number.POSITIVE_INFINITY, banner)).toBe(1);
    expect(clampCoverZoom(1.4, banner)).toBe(1.4);
    expect(clampCoverZoom(9, banner)).toBe(1.77);
    expect(coverZoomTo(COVER_FOCUS_CENTER, 9, banner).zoom).toBe(1.77);
    expect(coverZoomTo(COVER_FOCUS_CENTER, 0.2, banner).zoom).toBe(1);
    // A focus carrying more zoom than the image allows is read at the max.
    const over = { x: 0.5, y: 0.5, zoom: 2.5 };
    expect(coverCropFrame(over, banner).scale).toBe(1.77);
    expect(coverCropRect(over, banner)).toEqual(coverCropRect({ ...over, zoom: 1.77 }, banner));
    expect(moveCoverFocus(over, { x: 0, y: 0 }, banner, 718).zoom).toBe(1.77);
  });

  it("keeps the visible centre fixed when the zoom changes, then clamps to the image", () => {
    const centreOf = (image: CoverImageSize, focus: CoverFocus) => {
      const rect = savedSourceRect(image, focus);
      return { x: rect.sx + rect.sw / 2, y: rect.sy + rect.sh / 2, rect };
    };
    let fixed = 0;
    for (const image of IMAGES) {
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
    const banner = { width: 1584, height: 396 };
    const corner = { x: 0, y: 0, zoom: 1.77 };
    const out = coverZoomTo(corner, 1.2, banner);
    expect(out).toEqual({ x: 0, y: 0, zoom: 1.2 });
    // Back to 1 on an exact 4:1 banner there is no slack: centred.
    expect(coverZoomTo(corner, 1, banner)).toEqual(COVER_FOCUS_CENTER);
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
    expect(coverEditorHint(COVER_FOCUS_CENTER, { width: 1584, height: 396 })).toBe("zoom");
    expect(coverEditorHint({ x: 0.5, y: 0.5, zoom: 1.01 }, { width: 1584, height: 396 })).toBe("drag");
    // Too small to zoom and exactly 4:1: nothing to say.
    expect(coverEditorHint(COVER_FOCUS_CENTER, { width: 800, height: 200 })).toBeNull();
  });

  it("paints the preview as the crop frame's drawn image, in band percentages", () => {
    expect(coverPreviewBox(COVER_FOCUS_CENTER, null)).toBeNull();
    expect(coverPreviewBox(COVER_FOCUS_CENTER, { width: 0, height: 10 })).toBeNull();
    const banner = { width: 1584, height: 396 };
    const fit = coverPreviewBox(COVER_FOCUS_CENTER, banner)!;
    expect(Number.parseFloat(fit.width)).toBeCloseTo(100, 9);
    expect(Number.parseFloat(fit.height)).toBeCloseTo(100, 9);
    expect(Math.abs(Number.parseFloat(fit.marginLeft))).toBeLessThan(1e-9);
    expect(Math.abs(Number.parseFloat(fit.marginTop))).toBeLessThan(1e-9);
    // Zoom 1.5 centred: a box 150% × 150%, shifted a quarter of the band each way.
    const zoomed = coverPreviewBox({ x: 0.5, y: 0.5, zoom: 1.5 }, banner)!;
    expect(Number.parseFloat(zoomed.width)).toBeCloseTo(150, 9);
    expect(Number.parseFloat(zoomed.height)).toBeCloseTo(150, 9);
    expect(Number.parseFloat(zoomed.marginLeft)).toBeCloseTo(-25, 9);
    // margin-top resolves against the band WIDTH: a quarter of the height is 6.25% of the width.
    expect(Number.parseFloat(zoomed.marginTop)).toBeCloseTo(-6.25, 9);
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
    for (const image of [...IMAGES, { width: 1585, height: 397 }, { width: 2999, height: 1001 }]) {
      for (const zoom of [1, 1.13, 1.77, coverMaxZoom(image)]) {
        const crop = coverCropRect({ x: 1, y: 1, zoom: clampCoverZoom(zoom, image) }, image);
        expect(units(crop.x) + units(crop.w)).toBeLessThanOrEqual(1e6);
        expect(units(crop.y) + units(crop.h)).toBeLessThanOrEqual(1e6);
        expect(parseCoverCrop(crop)).toEqual(crop);
      }
    }
    // Far-edge crops whose x (or y) and w (or h) both round up to the next
    // millionth: unclamped they sum to 1.000001 and the server refuses the
    // save. The far edge gives way by one millionth instead.
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.28 }, { width: 1500, height: 1500 })).toEqual({
      x: 0.21875,
      y: 0.804687,
      w: 0.78125,
      h: 0.195313,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1 }, { width: 213, height: 160 })).toEqual({
      x: 0,
      y: 0.667187,
      w: 1,
      h: 0.332813,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.6 }, { width: 1501, height: 500 })).toEqual({
      x: 0.375,
      y: 0.530937,
      w: 0.625,
      h: 0.469063,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1 }, { width: 250, height: 64 })).toEqual({
      x: 0,
      y: 0.023437,
      w: 1,
      h: 0.976563,
    });
    // The same on x: originals wider than 4:1, at cover-fit and zoomed.
    expect(coverCropRect({ x: 1, y: 1, zoom: 1 }, { width: 512, height: 85 })).toEqual({
      x: 0.335937,
      y: 0,
      w: 0.664063,
      h: 1,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.28 }, { width: 1200, height: 291 })).toEqual({
      x: 0.242187,
      y: 0.21875,
      w: 0.757813,
      h: 0.78125,
    });
    expect(coverCropRect({ x: 1, y: 1, zoom: 1.2 }, { width: 1280, height: 273 })).toEqual({
      x: 0.289062,
      y: 0.166667,
      w: 0.710938,
      h: 0.833333,
    });
    // Every integer width 100..1600 at banner, square and 4:3 shapes, on the
    // whole slider grid: the far-edge crop always passes the server check.
    const refused: string[] = [];
    for (let width = 100; width <= 1600; width += 1) {
      for (const height of [Math.round(width / 4), width, Math.round(width * 0.75)]) {
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
