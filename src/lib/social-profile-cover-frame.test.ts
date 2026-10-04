import { describe, expect, it } from "vitest";

import { rectCropSourceRect } from "./account-avatar-crop";
import {
  COVER_CROP_VIEW_HEIGHT,
  COVER_CROP_VIEW_WIDTH,
  SOCIAL_PROFILE_COVER_STAGE,
} from "./social-profile-cover";
import {
  COVER_FOCUS_CENTER,
  COVER_FRAME_ASPECT,
  COVER_KEY_NUDGE_PX,
  COVER_KEY_NUDGE_SHIFT,
  COVER_PHONE_ASPECT,
  COVER_SLACK_MIN_PX,
  type CoverFocus,
  type CoverImageSize,
  coverBandOverflow,
  coverCenteredRegion,
  coverCropFrame,
  coverCropRect,
  coverDragKeyAction,
  coverFocusFromCrop,
  coverHasSlack,
  coverKeyDelta,
  coverObjectPosition,
  coverPhoneSafeRegion,
  coverRegionStyle,
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
const FOCUSES: CoverFocus[] = [
  { x: 0.5, y: 0.5 },
  { x: 0, y: 0 },
  { x: 1, y: 1 },
  { x: 0.3, y: 0.8 },
];

// What the browser paints: object-fit cover in a 16:7 frame W wide, with
// the CSS object-position the preview sets. offset = (frame - draw) × p.
function paintedSourceRect(image: CoverImageSize, bandWidth: number, focus: CoverFocus) {
  const [px, py] = coverObjectPosition(focus)
    .split(" ")
    .map((part) => Number.parseFloat(part) / 100);
  const bandHeight = (bandWidth * 7) / 16;
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
      expectRectClose(paintedSourceRect(image, 366, focus), paintedSourceRect(image, 720, focus), 1e-6);
    }
  });

  it("stores the framing as the painted window in fractions of the original", () => {
    for (const image of IMAGES) {
      for (const focus of FOCUSES) {
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

  it("reopens the original at its stored framing (crop → focus round trip)", () => {
    for (const image of IMAGES) {
      for (const focus of FOCUSES) {
        const back = coverFocusFromCrop(coverCropRect(focus, image), image);
        const view = Math.min(image.width, (16 / 7) * image.height);
        const spanX = image.width - view;
        const spanY = image.height - (view * 7) / 16;
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
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: 10000 }, portrait, 720)).toEqual({ x: 0.5, y: 0 });
    expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 0, y: -10000 }, portrait, 720)).toEqual({ x: 0.5, y: 1 });
    // An axis with zero overflow stays at 0.5 whatever the drag.
    expect(moveCoverFocus({ x: 0.2, y: 0.9 }, { x: 500, y: 500 }, portrait, 720).x).toBe(0.5);
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

  it("treats exact 16:7 files as having no slack at every half-pixel width", () => {
    for (const image of [{ width: 2400, height: 1050 }, { width: 1600, height: 700 }]) {
      for (let width = 280; width <= 1200; width += 0.5) {
        expect(coverBandOverflow(image, width)).toEqual({ x: 0, y: 0 });
        expect(moveCoverFocus(COVER_FOCUS_CENTER, { x: 1, y: 1 }, image, width)).toEqual(COVER_FOCUS_CENTER);
      }
    }
    expect(coverHasSlack({ width: 2400, height: 1050 })).toBe(false);
    expect(coverHasSlack({ width: 1920, height: 1080 })).toBe(true);
    // A 4:1 LinkedIn-era file now has slack: the 16:7 frame crops its sides.
    expect(coverHasSlack({ width: 1784, height: 446 })).toBe(true);
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

describe("Stage frame — 16:7 frame, phone-safe region (docs/design-locks/social-profile-stage-lock-v1.md)", () => {
  it("frames 16:7 and crops through a 16:7 view", () => {
    expect(COVER_FRAME_ASPECT).toBe(16 / 7);
    expect(COVER_FRAME_ASPECT).toBe(SOCIAL_PROFILE_COVER_STAGE.aspectWidth / SOCIAL_PROFILE_COVER_STAGE.aspectHeight);
    expect(COVER_CROP_VIEW_WIDTH / COVER_CROP_VIEW_HEIGHT).toBe(COVER_FRAME_ASPECT);
    expect(coverBandOverflow({ width: 3000, height: 3000 }, 720)).toEqual({ x: 0, y: 720 - 315 });
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
    const reopened = coverCropRect(focus, image);
    const centre = (crop: { y: number; h: number }) => crop.y + crop.h / 2;
    expect(centre(reopened)).toBeCloseTo(centre(legacy), 5);
    expect(reopened.h * image.height).toBeCloseTo((3000 * 7) / 16, 0);
    // Near an edge the 16:7 window clamps to the image instead of overflowing.
    const top = coverFocusFromCrop({ x: 0, y: 0, w: 1, h: 0.375 }, image);
    expect(top.y).toBe(0);
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
