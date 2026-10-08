import { describe, expect, it } from "vitest";

import { SOCIAL_VIDEO_MAX_BYTES } from "./social-media";
import { formatStoryRecorderClock } from "./social-story-recorder";
import {
  formatGoLiveClock,
  goLiveCameraAspect,
  goLiveFileName,
  goLiveFitsByteCap,
  goLiveReachedCap,
  goLiveRecorderOptions,
  goLiveReelCrop,
  goLiveRemainingMs,
  SOCIAL_GO_LIVE_DEFAULT_FRAME,
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

  // Desktop frame (Adam 2026-10-08): the camera's own frame by default,
  // a switch to a reel cut that records as 9:16.
  it("opens on the camera's own frame, with Reel the one alternative", () => {
    expect(SOCIAL_GO_LIVE_DEFAULT_FRAME).toBe("full");
    expect(SOCIAL_GO_LIVE_FRAMES).toEqual(["full", "reel"]);
    expect(goLiveCameraAspect()).toBeCloseTo(16 / 9);
    expect(goLiveCameraAspect(640, 480)).toBeCloseTo(4 / 3);
    expect(goLiveCameraAspect(1280, 0)).toBeCloseTo(16 / 9);
  });

  it("cuts the reel from the centre of the camera frame at 9:16, no upscale, even sizes", () => {
    // 720p webcam: keeps the height, loses the sides.
    expect(goLiveReelCrop(1280, 720)).toEqual({ sx: 438, sy: 0, sw: 404, sh: 720 });
    expect(goLiveReelCrop(1920, 1080)).toEqual({ sx: 657, sy: 0, sw: 606, sh: 1080 });
    // 4:3 (the fake camera in the browser check): 640×480 → 270×480.
    expect(goLiveReelCrop(640, 480)).toEqual({ sx: 185, sy: 0, sw: 270, sh: 480 });
    // Already 9:16 (a phone): the whole frame.
    expect(goLiveReelCrop(720, 1280)).toEqual({ sx: 0, sy: 0, sw: 720, sh: 1280 });
    // Taller than 9:16: keeps the width, loses top and bottom.
    expect(goLiveReelCrop(720, 1600)).toEqual({ sx: 0, sy: 160, sw: 720, sh: 1280 });
    for (const [w, h] of [[1280, 720], [640, 480], [1366, 768]] as const) {
      const crop = goLiveReelCrop(w, h)!;
      expect(crop.sw % 2).toBe(0);
      expect(crop.sh % 2).toBe(0);
      expect(crop.sw / crop.sh).toBeCloseTo(9 / 16, 1);
      expect(crop.sx + crop.sw).toBeLessThanOrEqual(w);
    }
    expect(goLiveReelCrop(0, 720)).toBeNull();
  });
});
