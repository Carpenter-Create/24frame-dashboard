// Home Following Mux active gate.
// docs/design-locks/social-home-following-mux-active-gate-lock-v1.md
//
// The first Following page can hold SOCIAL_FOLLOWING_WALL_LIMIT posts.
// Signed playback JWTs and Mux player mount stay inside the near-viewport
// band. A post outside that band stays cold.

/** One viewport above and below the fold. Farther posts stay cold. */
export const SOCIAL_FOLLOWING_MUX_ACTIVE_ROOT_MARGIN = "100% 0px";

/**
 * Outside the Following gate, playback stays live (Stories, Explore, DMs).
 * Inside the gate, only the playback id that has entered the band is armed.
 * Armed stays armed: a later miss does not tear down the clip being watched.
 */
export function socialFollowingMuxPlaybackArmed(input: {
  gate: boolean;
  playbackId: string;
  armedId: string | null;
}): boolean {
  if (!input.gate) return true;
  return input.armedId === input.playbackId;
}
