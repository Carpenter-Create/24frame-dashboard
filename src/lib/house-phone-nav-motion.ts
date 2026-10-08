// Phone nav motion (docs/design-locks/shell-phone-nav-motion-lock-v1.md,
// Adam 2026-10-08: "just build it"). The workspace band and every phone
// dock share one quiet motion: the current item's pill slides to the
// tapped item and settles, the item eases down under the finger, and its
// glyph turns from Regular to Fill as the pill lands. No glass, no
// colour fringe, no magnifier. Reduced motion: the global rule in
// tokens.css drops every transition to 0, so the pill jumps and the
// glyph swaps at once.

/** The pill's slide: 260ms on a curve that runs about 1% past the target
 *  and settles back (the band's 80 hop moves under 1px past). */
export const HOUSE_PHONE_NAV_THUMB_DURATION_MS = 260;

export const HOUSE_PHONE_NAV_THUMB_MOTION_CLASS =
  "transition-[left,width] duration-[260ms] ease-[cubic-bezier(0.25,1.2,0.5,1)] motion-reduce:transition-none";

/** Regular → Fill crossfade, timed to land with the pill (150 + 100). */
export const HOUSE_PHONE_NAV_GLYPH_FADE_CLASS =
  "transition-opacity duration-100 delay-150 motion-reduce:transition-none";

/** The glyph pair's box: the Fill glyph sits on the Regular one. */
export const HOUSE_PHONE_NAV_GLYPH_HOST_CLASS = "relative inline-flex shrink-0";

export const HOUSE_PHONE_NAV_GLYPH_FILL_CLASS = "absolute inset-0";

/** Press target: the hit carries the group; its face eases under it. */
export const HOUSE_PHONE_NAV_PRESS_GROUP_CLASS = "group/nav";

/** Band pill face under the finger: 96%. */
export const HOUSE_PHONE_NAV_PRESS_FACE_CLASS =
  "transition-transform duration-150 ease-out group-active/nav:scale-[0.96]";

/** Dock glyph under the finger: 90% (a 24 glyph needs more travel to read). */
export const HOUSE_PHONE_NAV_PRESS_GLYPH_CLASS =
  "transition-transform duration-150 ease-out group-active/nav:scale-90";

export function housePhoneNavGlyphOpacity(on: boolean): { idle: string; fill: string } {
  return on ? { idle: "opacity-0", fill: "opacity-100" } : { idle: "opacity-100", fill: "opacity-0" };
}
