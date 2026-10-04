import { describe, expect, it } from "vitest";

import { rectCropSourceRect } from "./account-avatar-crop";
import { COVER_CROP_VIEW_HEIGHT, COVER_CROP_VIEW_WIDTH } from "./social-profile-cover";
import {
  COVER_FOCUS_CENTER,
  COVER_KEY_NUDGE_PX,
  COVER_KEY_NUDGE_SHIFT,
  COVER_SLACK_MIN_PX,
  type CoverFocus,
  type CoverImageSize,
  coverBandOverflow,
  coverCropFrame,
  coverCropRect,
  coverDragKeyAction,
  coverFocusFromCrop,
  coverHasSlack,
  coverKeyDelta,
  coverObjectPosition,
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
const FOCUSES: CoverFocus[] = [
  { x: 0.5, y: 0.5 },
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 0.3, y: 0.8 },
];

// What the browser paints: object-fit cover in a 4:1 band W wide, with the
// CSS object-position the preview sets. offset = (band - draw) × p.
function paintedSourceRect(image: CoverImageSize, bandWidth: number, focus: CoverFocus) {
  const [px, py] = coverObjectPosition(focus)
    .split(" ")
    .map((part) => Number.parseFloat(part) / 100);
  const bandHeight = bandWidth / 4;
  const scale = Math.max(bandWidth / image.width, bandHeight / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (bandWidth - drawWidth) * px;
  const offsetY = (bandHeight - drawHeight) * py;
  return {
    sx: -offsetX / scale,
    sy: -offsetY / scale,
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
  it("saves exactly the source pixels the preview paints (6 images × 9 widths × 4 focuses)", () => {
    for (const image of IMAGES) {
      for (const width of WIDTHS) {
        for (const focus of FOCUSES) {
          expectRectClose(savedSourceRect(image, focus), paintedSourceRect(image, width, focus), 1e-6);
        }
      }
    }
  });

  it("paints the same source window at every band width", () => {
    const focus = { x: 0.3, y: 0.8 };
    for (const image of IMAGES) {
      expectRectClose(paintedSourceRect(image, 390, focus), paintedSourceRect(image, 718, focus), 1e-6);
    }
  });

  it("stores the framing as the painted window in fractions of the original", () => {
    for (const image of IMAGES) {
      for (const focus of FOCUSES) {
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

  it("reopens the original at its stored framing (crop → focus round trip)", () => {
    for (const image of IMAGES) {
      for (const focus of FOCUSES) {
        const back = coverFocusFromCrop(coverCropRect(focus, image), image);
        const view = Math.min(image.width, 4 * image.height);
        const spanX = image.width - view;
        const spanY = image.height - view / 4;
        if (spanX > COVER_SLACK_MIN_PX) expect(Math.abs(back.x - focus.x)).toBeLessThanOrEqual(1e-5);
        else expect(back.x).toBe(0.5);
        if (spanY > COVER_SLACK_MIN_PX) expect(Math.abs(back.y - focus.y)).toBeLessThanOrEqual(1e-5);
        else expect(back.y).toBe(0.5);
      }
    }
  });

  it("follows the pointer 1:1 in band pixels", () => {
    let checked = 0;
    for (const image of IMAGES) {
      for (const width of WIDTHS) {
        const overflow = coverBandOverflow(image, width);
        const before = paintedSourceRect(image, width, COVER_FOCUS_CENTER);
        if (overflow.x >= 20) {
          const moved = moveCoverFocus(COVER_FOCUS_CENTER, { x: 10, y: 0 }, image, width);
          const after = paintedSourceRect(image, width, moved);
          expect(Math.abs(after.sx - before.sx - -10 / before.scale)).toBeLessThanOrEqual(1e-6);
          expect(Math.abs(after.sy - before.sy)).toBeLessThanOrEqual(1e-6);
          checked += 1;
        }
        if (overflow.y >= 20) {
          const moved = moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: 10 }, image, width);
          const after = paintedSourceRect(image, width, moved);
          expect(Math.abs(after.sy - before.sy - -10 / before.scale)).toBeLessThanOrEqual(1e-6);
          expect(Math.abs(after.sx - before.sx)).toBeLessThanOrEqual(1e-6);
          checked += 1;
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("stops at the image edge and keeps a still axis centred", () => {
    const landscape = { width: 6000, height: 1000 };
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 10000, y: 0 }, landscape, 390)).toEqual({ x: 0, y: 0.5 });
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: -10000, y: 0 }, landscape, 390)).toEqual({ x: 1, y: 0.5 });
    const portrait = { width: 1080, height: 1920 };
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: 10000 }, portrait, 718)).toEqual({ x: 0.5, y: 0 });
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: -10000 }, portrait, 718)).toEqual({ x: 0.5, y: 1 });
    // An axis with zero overflow stays at 0.5 whatever the drag.
    expect(moveCoverFocus({ x: 0.2, y: 0.9 }, { x: 500, y: 500 }, portrait, 718).x).toBe(0.5);
    for (const image of IMAGES) {
      for (const width of WIDTHS) {
        for (const delta of [10000, -10000]) {
          const next = moveCoverFocus(COVER_FOCUS_CENTER, { x: delta, y: delta }, image, width);
          for (const axis of [next.x, next.y]) {
            expect(axis).toBeGreaterThanOrEqual(0);
            expect(axis).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("treats exact 4:1 files as having no slack at every half-pixel width", () => {
    for (const image of [{ width: 1784, height: 446 }, { width: 1584, height: 396 }]) {
      for (let width = 280; width <= 1200; width += 0.5) {
        expect(coverBandOverflow(image, width)).toEqual({ x: 0, y: 0 });
        expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 1, y: 1 }, image, width)).toEqual(COVER_FOCUS_CENTER);
      }
    }
    expect(coverHasSlack({ width: 1784, height: 446 })).toBe(false);
    expect(coverHasSlack({ width: 1920, height: 1080 })).toBe(true);
    expect(COVER_SLACK_MIN_PX).toBe(0.5);
  });

  it("nudges with the arrow keys like an 8px drag and formats object-position", () => {
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
    expect(coverObjectPosition({ x: 0.5, y: 0.5 })).toBe("50% 50%");
    expect(coverObjectPosition({ x: 0, y: 1 })).toBe("0% 100%");
  });

  it("holds Escape and the arrows while Save runs, as the disabled Cancel does", () => {
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
    // Saving: both are swallowed so the editor cannot close under a running save.
    expect(coverDragKeyAction("Escape", false, true)).toEqual({ type: "hold" });
    expect(coverDragKeyAction("Escape", true, true)).toEqual({ type: "hold" });
    expect(coverDragKeyAction("ArrowRight", false, true)).toEqual({ type: "hold" });
    // Not an editor key: the browser keeps it (Tab moves focus on to Save).
    expect(coverDragKeyAction("Tab", false, false)).toBeNull();
    expect(coverDragKeyAction("Tab", false, true)).toBeNull();
    expect(coverDragKeyAction("Enter", false, true)).toBeNull();
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
});
