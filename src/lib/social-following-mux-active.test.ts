import { describe, expect, it } from "vitest";

import {
  SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN,
  socialFollowingMuxPlaybackArmed,
} from "./social-following-mux-active";

describe("socialFollowingMuxPlaybackArmed", () => {
  it("stays live outside the Following gate", () => {
    expect(
      socialFollowingMuxPlaybackArmed({
        gate: false,
        playbackId: "VisiblePlayback0001",
        armedId: null,
      }),
    ).toBe(true);
  });

  it("stays cold until this playback id has entered the band", () => {
    expect(
      socialFollowingMuxPlaybackArmed({
        gate: true,
        playbackId: "ColdPlayback0000001",
        armedId: null,
      }),
    ).toBe(false);
    expect(
      socialFollowingMuxPlaybackArmed({
        gate: true,
        playbackId: "ColdPlayback0000001",
        armedId: "VisiblePlayback0001",
      }),
    ).toBe(false);
  });

  it("arms the playback id that entered the band and keeps that id armed", () => {
    expect(
      socialFollowingMuxPlaybackArmed({
        gate: true,
        playbackId: "VisiblePlayback0001",
        armedId: "VisiblePlayback0001",
      }),
    ).toBe(true);
  });

  it("names a one-viewport root margin", () => {
    expect(SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN).toBe("100% 0px");
  });
});
