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

/** Where the bar settles: the way it was moving, or the nearer end. */
export function housePhoneSheetSnapTarget(
  offset: number,
  direction: number,
  band = HOUSE_PHONE_BAND_ROW_PX,
): number {
  if (offset <= 0 || offset >= band) return offset;
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
  /** The page scrolled. */
  scroll: () => void;
  /** The scroll is at rest and no finger is down: settle. */
  settle: () => void;
  /** A vertical drag on the bar began. */
  dragStart: () => void;
  /** The finger is `dy` below where the drag began (up is negative). */
  drag: (dy: number) => void;
  dragEnd: () => void;
  /** Bring the band and the dock back (keyboard focus into the band). */
  open: () => void;
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
): boolean {
  return y <= band && offset <= Math.max(0, y) && range >= y + (band - offset);
}

/** The page position the chrome follows: clamped to the page, so an
 *  overscroll bounce at either end reads as no scroll. */
export function housePhoneSheetPageY(y: number, range: number): number {
  return Math.min(Math.max(0, range), Math.max(0, y));
}

/** Where the dock lands when the bar comes to rest: hidden under a covered
 *  band, shown with an open one, as it was otherwise. */
export function housePhoneDockAtRest(offset: number, dockHidden: boolean, band = HOUSE_PHONE_BAND_ROW_PX): boolean {
  if (offset >= band) return true;
  if (offset <= 0) return false;
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
  /** Scroll the page; `smooth` for a settle. */
  scrollPage: (y: number, smooth: boolean) => void;
  /** The bar's cover in px; `settle` is true for the eased settle. */
  onOffset: (offset: number, settle: boolean) => void;
  onChange: (next: HousePhoneChromeState) => void;
  band?: number;
}): HousePhoneChromeController {
  const pageY = () => housePhoneSheetPageY(readY(), readRange());
  let lastY = pageY();
  let offset = 0;
  let direction = 0;
  let dock: SocialTabBarScrollTracker = createSocialTabBarScrollTracker(lastY);
  let state = HOUSE_PHONE_CHROME_OPEN;
  let dragOrigin = 0;
  let dragPageOrigin = 0;
  let dragPage = false;
  let lastDragDy = 0;

  const emit = (dockHidden: boolean) => {
    const next = { dockHidden, bandTucked: offset >= band };
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

  const moveTo = (next: number, settle: boolean) => {
    if (next === offset && !settle) return;
    offset = next;
    onOffset(offset, settle);
  };

  // Follow the page's scroll position (from a scroll event, or at once
  // after the bar's own drag scrolled the page).
  const track = () => {
    const y = pageY();
    const dy = y - lastY;
    lastY = y;
    if (dy !== 0) direction = Math.sign(dy);
    moveTo(housePhoneSheetOffset(offset, dy, y, band), false);
    dock = stepSocialTabBarScroll(dock, y);
    emit(dock.state === "hidden");
  };

  return {
    scroll: track,
    settle() {
      const target = housePhoneSheetSnapTarget(offset, direction, band);
      const y = pageY();
      // Near the top, scroll the page so the content travels with the bar
      // (the bar follows it; the next rest lands the dock).
      if (target !== offset && y > 0 && housePhoneSheetMovesPage(y, offset, readRange(), band)) {
        scrollPage(housePhoneSheetPageTarget(y, offset, target), true);
        return;
      }
      if (target !== offset) moveTo(target, true);
      landDock();
    },
    dragStart() {
      const y = pageY();
      dragPage = housePhoneSheetMovesPage(y, offset, readRange(), band);
      dragOrigin = offset;
      dragPageOrigin = y;
      lastDragDy = 0;
    },
    drag(dy) {
      // Finger down opens (less cover); up covers.
      if (dy !== lastDragDy) direction = Math.sign(lastDragDy - dy);
      lastDragDy = dy;
      const next = Math.min(band, Math.max(0, dragOrigin - dy));
      // Near the top the drag scrolls the page, and the bar follows it now
      // rather than a frame later.
      if (dragPage) {
        scrollPage(housePhoneSheetPageTarget(dragPageOrigin, dragOrigin, next), false);
        const drift = direction;
        track();
        direction = drift;
        return;
      }
      moveTo(next, false);
      emit(state.dockHidden);
    },
    dragEnd() {
      if (dragPage) {
        // The drag tracked the page at once, so the cover is current.
        const y = pageY();
        const target = housePhoneSheetSnapTarget(offset, direction, band);
        if (target !== offset) scrollPage(housePhoneSheetPageTarget(y, offset, target), true);
        dragPage = false;
        return;
      }
      const target = housePhoneSheetSnapTarget(offset, direction, band);
      if (target !== offset) moveTo(target, true);
      // A full cover from the bar hides the dock with it; opening brings it back.
      landDock();
    },
    open() {
      direction = -1;
      moveTo(0, true);
      landDock();
    },
    offset: () => offset,
    state: () => state,
  };
}
