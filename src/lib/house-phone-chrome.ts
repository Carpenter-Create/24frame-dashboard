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
// (social-tab-bar-scroll) from the same scroll events.

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

/** Near the top the page itself carries the bar (it can scroll a full
 *  band, and the bar has not covered more than the page has scrolled). */
export function housePhoneSheetMovesPage(
  y: number,
  offset: number,
  range: number,
  band = HOUSE_PHONE_BAND_ROW_PX,
): boolean {
  return y <= band && range >= band && offset <= Math.max(0, y);
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
  let lastY = Math.max(0, readY());
  let offset = 0;
  let direction = 0;
  let dock: SocialTabBarScrollTracker = createSocialTabBarScrollTracker(lastY);
  let state = HOUSE_PHONE_CHROME_OPEN;
  let dragOrigin = 0;
  let dragPage = false;
  let lastDragDy = 0;

  const emit = (dockHidden: boolean) => {
    const next = { dockHidden, bandTucked: offset >= band };
    if (next.dockHidden === state.dockHidden && next.bandTucked === state.bandTucked) return;
    state = next;
    onChange(next);
  };

  const moveTo = (next: number, settle: boolean) => {
    if (next === offset && !settle) return;
    offset = next;
    onOffset(offset, settle);
  };

  // Follow the page's scroll position (from a scroll event, or at once
  // after the bar's own drag scrolled the page).
  const track = () => {
    const y = readY();
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
      if (target === offset) return;
      const y = readY();
      // Near the top, scroll the page so the content travels with the bar.
      if (y > 0 && housePhoneSheetMovesPage(y, offset, readRange(), band)) {
        scrollPage(target, true);
        return;
      }
      moveTo(target, true);
      emit(state.dockHidden);
    },
    dragStart() {
      const y = Math.max(0, readY());
      dragPage = housePhoneSheetMovesPage(y, offset, readRange(), band);
      dragOrigin = dragPage ? y : offset;
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
        scrollPage(next, false);
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
        // Decide from where the page is, not the last tracked frame.
        const y = Math.max(0, readY());
        const target = housePhoneSheetSnapTarget(Math.min(y, band), direction, band);
        if (target !== y) scrollPage(target, true);
        dragPage = false;
        return;
      }
      const target = housePhoneSheetSnapTarget(offset, direction, band);
      if (target !== offset) moveTo(target, true);
      // A full cover from the bar hides the dock with it; opening brings it back.
      const dockHidden = offset >= band ? true : offset <= 0 ? false : state.dockHidden;
      dock = { lastY: Math.max(0, readY()), acc: 0, state: dockHidden ? "hidden" : "visible" };
      emit(dockHidden);
    },
    open() {
      direction = -1;
      moveTo(0, true);
      dock = { lastY: Math.max(0, readY()), acc: 0, state: "visible" };
      emit(false);
    },
    offset: () => offset,
    state: () => state,
  };
}
