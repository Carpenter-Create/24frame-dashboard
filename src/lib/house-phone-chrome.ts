// Phone chrome motion (docs/design-locks/shell-phone-workspace-band-lock-v1.md
// §5, Adam 2026-10-08). The bar is a sheet over the workspace band, and it
// moves with the finger:
//
//   - Scroll down and the bar slides up over the band by exactly as far as
//     the page scrolls, up to the band's 56; scroll up and it slides back
//     down the same way. Half a scroll is half a cover.
//   - When the scroll comes to rest between the two, the bar settles the
//     way it was going: covered if the page was moving down, open if up.
//   - A vertical drag on the bar (or the band) moves it under the finger
//     and settles the same way on release.
//   - The top of the page always shows the band.
//   - Near the top (no more than the band's 56 scrolled), the page is the
//     sheet: a settle or a drag there scrolls the page itself, so the bar
//     and the content move together and no gap opens between them. Deeper
//     down the page is already under the bar, so only the bar moves.
//
// The bar and the band float over the page scroller (they never change its
// size), so the page scrolls at the finger's speed and nothing reflows
// while it moves. The bottom dock keeps its own hide-on-scroll rule
// (social-tab-bar-scroll) from the same scroll events while the page
// moves; at rest it lands the way the bar did: hidden under a covered
// band, back with an open one (Adam 2026-10-09, "Match bar at rest").
//
// The page position is read clamped to the page (0 to its range), so the
// rubber band at the top or the bottom never moves the bar or the dock.
//
// v1.5 (Adam 2026-10-09, on the scroll review: "fix and change everything
// that you recommend"): every rest lands.
//   - The rest itself is the runtime's (house-phone-chrome-runtime): the
//     page scroller's `scrollend` where it fires, 120ms otherwise.
//   - The way the bar settles turns only once a reverse reaches 3, so
//     jitter and the lift never turn it; the cover still follows every
//     pixel, and a drag keeps the finger's way, not the page's.
//   - An end within 0.5 counts as reached (fractional touches and offsets).
//   - A scroll or a drag during a settle carries on from the bar's cover
//     on screen (`live`), so nothing jumps.
//   - `land()` finishes any settle at once, open or covered, the dock with
//     it, and never asks for another page settle.

import {
  createSocialTabBarScrollTracker,
  stepSocialTabBarScroll,
  type SocialTabBarScrollTracker,
} from "./social-tab-bar-scroll";

export type HousePhoneChromeState = {
  dockHidden: boolean;
  /** The bar fully covers the band. */
  bandTucked: boolean;
};

export const HOUSE_PHONE_CHROME_OPEN: HousePhoneChromeState = {
  dockHidden: false,
  bandTucked: false,
};

/** How far the bar travels: the band row's height (h-14). */
export const HOUSE_PHONE_BAND_ROW_PX = 56;

/** The scroll is at rest after this long without a scroll event. */
export const HOUSE_PHONE_SHEET_IDLE_MS = 120;

/** The settle when the bar comes to rest between open and covered. */
export const HOUSE_PHONE_SHEET_SNAP_MS = 180;

/** A drag on the bar picks its axis after this much travel. */
export const HOUSE_PHONE_SHEET_AXIS_PX = 6;

/** Where a drag moves the bar. */
export const HOUSE_PHONE_CHROME_DRAG_ZONE = "[data-house-lead-stack]";

/** An end (open, covered, a settle's target) counts as reached within
 *  this much (v1.5): fractional touches and offsets never leave a
 *  sub-pixel settle or a bar that reads as not quite covered. */
export const HOUSE_PHONE_SHEET_TOLERANCE_PX = 0.5;

/** The way the bar settles turns only once a reverse reaches this (v1.5),
 *  so finger jitter and the lift never turn it. The cover itself still
 *  follows every pixel. */
export const HOUSE_PHONE_SHEET_REVERSE_PX = 3;

/** The settle's curve (CSS `ease-out`, `cubic-bezier(0, 0, 0.2, 1)`): the
 *  deep settle's transition and the near-top glide share it. */
export const HOUSE_PHONE_SHEET_EASE = [0, 0, 0.2, 1] as const;

/** The phone chrome runs only below `md` (Tailwind's `max-md`, written so
 *  every browser's matchMedia reads it). At `md` and up nothing tracks. */
export const HOUSE_PHONE_CHROME_MEDIA = "not all and (min-width: 48rem)";

/** The way the page (or the finger) is going, and how far it has gone
 *  back against that way since. */
export type HousePhoneSheetHeading = {
  direction: -1 | 0 | 1;
  reverse: number;
};

export const HOUSE_PHONE_SHEET_HEADING_NONE: HousePhoneSheetHeading = { direction: 0, reverse: 0 };

/** Two cover values are the same end within the tolerance. */
export function housePhoneSheetArrived(
  a: number,
  b: number,
  tolerance = HOUSE_PHONE_SHEET_TOLERANCE_PX,
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/** The heading after a move of `delta`: the same way (or no way yet) takes
 *  it at once and clears any reverse; the other way adds to the reverse
 *  and turns the heading once it reaches `threshold`. */
export function housePhoneSheetHeading(
  heading: HousePhoneSheetHeading,
  delta: number,
  threshold = HOUSE_PHONE_SHEET_REVERSE_PX,
): HousePhoneSheetHeading {
  if (delta === 0) return heading;
  const sign = delta > 0 ? 1 : -1;
  if (heading.direction === 0 || heading.direction === sign) {
    return heading.direction === sign && heading.reverse === 0 ? heading : { direction: sign, reverse: 0 };
  }
  const reverse = heading.reverse + Math.abs(delta);
  return reverse >= threshold ? { direction: sign, reverse: 0 } : { direction: heading.direction, reverse };
}

/** The bar's cover after a scroll of `dy` at position `y`. */
export function housePhoneSheetOffset(
  offset: number,
  dy: number,
  y: number,
  band = HOUSE_PHONE_BAND_ROW_PX,
): number {
  if (y <= 0) return 0;
  return Math.min(band, Math.max(0, offset + dy));
}

/** Where the bar settles: the way it was moving, or the nearer end. An
 *  end within the tolerance is that end. */
export function housePhoneSheetSnapTarget(
  offset: number,
  direction: number,
  band = HOUSE_PHONE_BAND_ROW_PX,
  tolerance = HOUSE_PHONE_SHEET_TOLERANCE_PX,
): number {
  if (offset <= tolerance) return 0;
  if (offset >= band - tolerance) return band;
  if (direction > 0) return band;
  if (direction < 0) return 0;
  return offset < band / 2 ? 0 : band;
}

/** A drag picks vertical only when it moves more up/down than sideways
 *  (the band's pills slide sideways). */
export function housePhoneSheetDragAxis(
  dx: number,
  dy: number,
  threshold = HOUSE_PHONE_SHEET_AXIS_PX,
): "vertical" | "horizontal" | null {
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
  return Math.abs(dy) > Math.abs(dx) ? "vertical" : "horizontal";
}

export type HousePhoneChromeController = {
  /** The page scrolled. `live` is the bar's cover on screen while it
   *  eases: the move carries on from there. */
  scroll: (live?: number) => void;
  /** The scroll is at rest and no finger is down: settle. Near the top it
   *  asks for a page settle (`scrollPage(y, true)`), which ends in `land`. */
  settle: () => void;
  /** Finish any settle now: open or covered, the dock landed. Never asks
   *  for another page settle. */
  land: () => void;
  /** A vertical drag on the bar began; `live` as for `scroll`. */
  dragStart: (live?: number) => void;
  /** The finger is `dy` below where the drag began (up is negative). */
  drag: (dy: number) => void;
  /** A second finger took the drag over: stop, with no settle. */
  dragAbort: () => void;
  dragEnd: () => void;
  /** Bring the band and the dock back (keyboard focus into the band). */
  open: () => void;
  /** A touch or the status-bar tap stopped the eased settle: the bar stays
   *  at `live`, its cover on screen, with no ease. The way is kept, so the
   *  next rest settles from there. */
  hold: (live: number) => void;
  offset: () => number;
  state: () => HousePhoneChromeState;
};

/** Near the top the page itself carries the bar: the bar has not covered
 *  more than the page has scrolled, and the page can scroll the rest of
 *  the cover. */
export function housePhoneSheetMovesPage(
  y: number,
  offset: number,
  range: number,
  band = HOUSE_PHONE_BAND_ROW_PX,
  tolerance = HOUSE_PHONE_SHEET_TOLERANCE_PX,
): boolean {
  return (
    y <= band + tolerance &&
    offset <= Math.max(0, y) + tolerance &&
    range + tolerance >= y + (band - offset)
  );
}

/** The page position the chrome follows: clamped to the page, so an
 *  overscroll bounce at either end reads as no scroll. */
export function housePhoneSheetPageY(y: number, range: number): number {
  return Math.min(Math.max(0, range), Math.max(0, y));
}

/** Where the dock lands when the bar comes to rest: hidden under a covered
 *  band, shown with an open one, as it was otherwise. */
export function housePhoneDockAtRest(
  offset: number,
  dockHidden: boolean,
  band = HOUSE_PHONE_BAND_ROW_PX,
  tolerance = HOUSE_PHONE_SHEET_TOLERANCE_PX,
): boolean {
  if (offset >= band - tolerance) return true;
  if (offset <= tolerance) return false;
  return dockHidden;
}

/** Where the page scrolls so the cover changes from `offset` to `target`:
 *  by the same amount, so the bar and the content move together. The
 *  cover and the page position can differ (after opening deeper down). */
export function housePhoneSheetPageTarget(y: number, offset: number, target: number): number {
  return Math.max(0, y + (target - offset));
}

export function createHousePhoneChrome({
  readY,
  readRange,
  scrollPage,
  onOffset,
  onChange,
  band = HOUSE_PHONE_BAND_ROW_PX,
}: {
  readY: () => number;
  /** scrollHeight - clientHeight of the page scroller. */
  readRange: () => number;
  /** Move the page. `settle` true is a settle request (settle, dragEnd):
   *  the runtime moves the page there and ends in `land`. `settle` false
   *  moves it there now (a drag, land), and the bar follows at once. */
  scrollPage: (y: number, settle: boolean) => void;
  /** The bar's cover in px; `settle` is true for the eased settle. */
  onOffset: (offset: number, settle: boolean) => void;
  onChange: (next: HousePhoneChromeState) => void;
  band?: number;
}): HousePhoneChromeController {
  const pageY = () => housePhoneSheetPageY(readY(), readRange());
  let lastY = pageY();
  let offset = 0;
  let heading = HOUSE_PHONE_SHEET_HEADING_NONE;
  // A drag owns the heading: the page's own moves under it never turn it.
  let dragging = false;
  let dock: SocialTabBarScrollTracker = createSocialTabBarScrollTracker(lastY);
  let state = HOUSE_PHONE_CHROME_OPEN;
  let dragOrigin = 0;
  let dragPageOrigin = 0;
  let dragPage = false;
  let lastDragDy = 0;

  const emit = (dockHidden: boolean) => {
    const next = { dockHidden, bandTucked: offset >= band - HOUSE_PHONE_SHEET_TOLERANCE_PX };
    if (next.dockHidden === state.dockHidden && next.bandTucked === state.bandTucked) return;
    state = next;
    onChange(next);
  };

  // At rest the dock lands the way the bar did; its own rule restarts here.
  const landDock = () => {
    const dockHidden = housePhoneDockAtRest(offset, state.dockHidden, band);
    dock = { lastY: pageY(), acc: 0, state: dockHidden ? "hidden" : "visible" };
    emit(dockHidden);
  };

  // The guard stays exact: a tolerance here would drop the 1:1 cover's
  // sub-pixel moves and let the bar drift from the page. `force` writes
  // even an unchanged value (a resync from the bar on screen).
  const moveTo = (next: number, settle: boolean, force = false) => {
    if (next === offset && !settle && !force) return;
    offset = next;
    onOffset(offset, settle);
  };

  const clampCover = (value: number) => Math.min(band, Math.max(0, value));

  // Follow the page's scroll position (from a scroll event, or at once
  // after the bar's own drag scrolled the page). `live`: the bar's cover
  // on screen while it eases, so the move carries on from there.
  const track = (live?: number) => {
    const y = pageY();
    const dy = y - lastY;
    lastY = y;
    const resync = dy !== 0 && live !== undefined;
    if (resync) offset = clampCover(live);
    if (!dragging) heading = housePhoneSheetHeading(heading, dy);
    moveTo(housePhoneSheetOffset(offset, dy, y, band), false, resync);
    dock = stepSocialTabBarScroll(dock, y);
    emit(dock.state === "hidden");
  };

  // The way the bar settles from here.
  const target = () => housePhoneSheetSnapTarget(offset, heading.direction, band);

  return {
    scroll: track,
    settle() {
      const to = target();
      const y = pageY();
      if (!housePhoneSheetArrived(to, offset)) {
        // Near the top, scroll the page so the content travels with the
        // bar: a settle request, which the runtime ends in land().
        if (y > 0 && housePhoneSheetMovesPage(y, offset, readRange(), band)) {
          scrollPage(housePhoneSheetPageTarget(y, offset, to), true);
          return;
        }
        moveTo(to, true);
      } else {
        // Within the tolerance: the exact end, not eased.
        moveTo(to, false);
      }
      landDock();
    },
    land() {
      const to = target();
      const y = pageY();
      // A page settle cut short (or never run) finishes at once, the page
      // with the bar, so no gap opens.
      if (!housePhoneSheetArrived(to, offset) && y > 0 && housePhoneSheetMovesPage(y, offset, readRange(), band)) {
        scrollPage(housePhoneSheetPageTarget(y, offset, to), false);
        track();
      }
      // The page could not move (or did not need to): the bar ends there.
      moveTo(to, false);
      landDock();
    },
    dragStart(live) {
      if (live !== undefined) moveTo(clampCover(live), false, true);
      const y = pageY();
      dragPage = housePhoneSheetMovesPage(y, offset, readRange(), band);
      dragOrigin = offset;
      dragPageOrigin = y;
      lastDragDy = 0;
      heading = HOUSE_PHONE_SHEET_HEADING_NONE;
      dragging = true;
    },
    drag(dy) {
      // Finger down opens (less cover); up covers.
      heading = housePhoneSheetHeading(heading, lastDragDy - dy);
      lastDragDy = dy;
      const next = Math.min(band, Math.max(0, dragOrigin - dy));
      // Near the top the drag scrolls the page, and the bar follows it now
      // rather than a frame later.
      if (dragPage) {
        scrollPage(housePhoneSheetPageTarget(dragPageOrigin, dragOrigin, next), false);
        track();
        return;
      }
      moveTo(next, false);
      emit(state.dockHidden);
    },
    dragAbort() {
      dragging = false;
      dragPage = false;
    },
    dragEnd() {
      dragging = false;
      const to = target();
      if (dragPage) {
        dragPage = false;
        // The drag tracked the page at once, so the cover is current.
        if (!housePhoneSheetArrived(to, offset)) {
          scrollPage(housePhoneSheetPageTarget(pageY(), offset, to), true);
          return;
        }
        moveTo(to, false);
        landDock();
        return;
      }
      if (!housePhoneSheetArrived(to, offset)) moveTo(to, true);
      else moveTo(to, false);
      // A full cover from the bar hides the dock with it; opening brings it back.
      landDock();
    },
    open() {
      heading = { direction: -1, reverse: 0 };
      moveTo(0, true);
      landDock();
    },
    hold(live) {
      moveTo(clampCover(live), false, true);
      emit(state.dockHidden);
    },
    offset: () => offset,
    state: () => state,
  };
}
