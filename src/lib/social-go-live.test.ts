import { describe, expect, it } from "vitest";

import { SOCIAL } from "./social";
import { SOCIAL_VIDEO_MAX_BYTES } from "./social-media";
import { formatStoryRecorderClock } from "./social-story-recorder";
import {
  formatGoLiveClock,
  goLiveFileName,
  goLiveFitsByteCap,
  goLiveReachedCap,
  goLiveFrameCut,
  goLiveRecorderOptions,
  goLiveRemainingMs,
  goLiveVideoConstraints,
  SOCIAL_GO_LIVE_DEFAULT_FRAME,
  SOCIAL_GO_LIVE_FRAME_ASPECT,
  SOCIAL_GO_LIVE_FRAMES,
  SOCIAL_GO_LIVE_MAX_MS,
  SOCIAL_GO_LIVE_VIDEO_BITS_PER_SECOND,
} from "./social-go-live";

describe("Go live duration cap", () => {
  it("caps at 10 minutes and counts remaining time down to 0:00", () => {
    expect(SOCIAL_GO_LIVE_MAX_MS).toBe(10 * 60 * 1000);
    expect(goLiveRemainingMs(0)).toBe(SOCIAL_GO_LIVE_MAX_MS);
    expect(goLiveRemainingMs(60_000)).toBe(9 * 60 * 1000);
    expect(goLiveRemainingMs(SOCIAL_GO_LIVE_MAX_MS)).toBe(0);
    expect(goLiveRemainingMs(SOCIAL_GO_LIVE_MAX_MS + 5_000)).toBe(0);
    expect(goLiveReachedCap(SOCIAL_GO_LIVE_MAX_MS - 1)).toBe(false);
    expect(goLiveReachedCap(SOCIAL_GO_LIVE_MAX_MS)).toBe(true);
    expect(formatGoLiveClock(SOCIAL_GO_LIVE_MAX_MS)).toBe("10:00");
    expect(formatGoLiveClock(0)).toBe("0:00");
    expect(formatGoLiveClock(goLiveRemainingMs(90_000))).toBe("8:30");
    expect(formatGoLiveClock(90_000)).toBe(formatStoryRecorderClock(90_000));
  });

  it("names the recorded file and keeps the bitrate under the bumped video cap", () => {
    expect(goLiveFileName("video/webm")).toBe("live.webm");
    expect(goLiveFileName("video/mp4")).toBe("live.mp4");
    expect(goLiveRecorderOptions("video/webm").videoBitsPerSecond).toBe(
      SOCIAL_GO_LIVE_VIDEO_BITS_PER_SECOND,
    );
    expect(SOCIAL_VIDEO_MAX_BYTES).toBe(250 * 1024 * 1024);
    expect(goLiveFitsByteCap(12)).toBe(true);
    expect(goLiveFitsByteCap(SOCIAL_VIDEO_MAX_BYTES + 1)).toBe(false);
    expect(goLiveFitsByteCap(0)).toBe(false);
  });

  // Desktop frame (Adam 2026-10-08): the full camera by default, a switch
  // to a reel cut that records as 9:16.
  it("opens on the full camera, with Reel the one alternative", () => {
    expect(SOCIAL_GO_LIVE_DEFAULT_FRAME).toBe("full");
    expect(SOCIAL_GO_LIVE_FRAMES).toEqual(["full", "reel"]);
  });

  // Adam 2026-10-08: "instead of the language "Full" and "Reel" – use the
  // aspect ratio" … "It needs to be standard youtube video/landscape video
  // dimensions" … "and then vertical reel dimensions".
  it("names each frame by its shape: 16:9 landscape, 9:16 vertical", () => {
    expect(SOCIAL_GO_LIVE_FRAME_ASPECT).toEqual({ full: 16 / 9, reel: 9 / 16 });
    expect(SOCIAL.create.liveFrame).toBe("Aspect ratio");
    expect(SOCIAL.create.liveFrameFull).toBe("16:9");
    expect(SOCIAL.create.liveFrameReel).toBe("9:16");
  });

  it("asks a computer's camera for 16:9 HD (ideal), and the phone's for nothing", () => {
    expect(goLiveVideoConstraints("user", true)).toEqual({
      facingMode: { ideal: "user" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    });
    expect(goLiveVideoConstraints("environment", false)).toEqual({ facingMode: { ideal: "environment" } });
    expect(JSON.stringify(goLiveVideoConstraints("user", true))).not.toContain("exact");
  });

  it("cuts 9:16 from the centre of the camera frame, no upscale, even sizes", () => {
    const reel = SOCIAL_GO_LIVE_FRAME_ASPECT.reel;
    // 1080p webcam: keeps the height, loses the sides.
    expect(goLiveFrameCut(1920, 1080, reel)).toEqual({ sx: 657, sy: 0, sw: 606, sh: 1080 });
    expect(goLiveFrameCut(1280, 720, reel)).toEqual({ sx: 438, sy: 0, sw: 404, sh: 720 });
    // 4:3 (the fake camera in the browser check): 640×480 → 270×480.
    expect(goLiveFrameCut(640, 480, reel)).toEqual({ sx: 185, sy: 0, sw: 270, sh: 480 });
    // Taller than 9:16: keeps the width, loses top and bottom.
    expect(goLiveFrameCut(720, 1600, reel)).toEqual({ sx: 0, sy: 160, sw: 720, sh: 1280 });
    // Already 9:16: no cut, the camera records as it is.
    expect(goLiveFrameCut(1080, 1920, reel)).toBeNull();
    for (const [w, h] of [[1280, 720], [640, 480], [1366, 768]] as const) {
      const crop = goLiveFrameCut(w, h, reel)!;
      expect(crop.sw % 2).toBe(0);
      expect(crop.sh % 2).toBe(0);
      expect(crop.sw / crop.sh).toBeCloseTo(9 / 16, 1);
      expect(crop.sx + crop.sw).toBeLessThanOrEqual(w);
    }
    expect(goLiveFrameCut(0, 720, reel)).toBeNull();
  });

  it("records 16:9 as the camera gives it, and cuts a camera of another shape to 16:9", () => {
    const landscape = SOCIAL_GO_LIVE_FRAME_ASPECT.full;
    // 16:9 webcams (1080p, 720p, and 1366×768 within 1%): no cut.
    expect(goLiveFrameCut(1920, 1080, landscape)).toBeNull();
    expect(goLiveFrameCut(1280, 720, landscape)).toBeNull();
    expect(goLiveFrameCut(1366, 768, landscape)).toBeNull();
    // 4:3 (a browser's default 640×480): keeps the width, loses top and bottom.
    expect(goLiveFrameCut(640, 480, landscape)).toEqual({ sx: 0, sy: 60, sw: 640, sh: 360 });
    // 16:10: 1920×1200 → 1920×1080.
    expect(goLiveFrameCut(1920, 1200, landscape)).toEqual({ sx: 0, sy: 60, sw: 1920, sh: 1080 });
  });
});
