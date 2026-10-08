// Phone chrome tuck (docs/design-locks/shell-phone-workspace-band-lock-v1.md
// §5, Adam 2026-10-08). One tracker for the bottom dock and the workspace
// band, so they leave and return together: scroll down and the sheet (the
// bar and the page) rides up over the band while the dock hides; scroll up,
// or pull the bar down, and both come back.
//
// The band folds its row's height (56 → 0), so the page scroller grows by
// the row. Two guards keep that from fighting the scroll:
//   - Settle: for a beat after the band folds or opens, scroll events only
//     re-base the tracker. Near the bottom of a page the fold clamps the
//     scroll position up to 56; that clamp must not read as a scroll up.
//   - Short pages: a scroll only folds the band when the page can still
//     scroll after the fold (more than two rows of travel). Otherwise the
//     dock hides alone and the band stays.
// A swipe on the lead stack (band, bar, Education search row) folds or
// opens it on any page.

import {
  createSocialTabBarScrollTracker,
  stepSocialTabBarScroll,
  type SocialTabBarScrollTracker,
} from "./social-tab-bar-scroll";

export type HousePhoneChromeState = {
  dockHidden: boolean;
  bandTucked: boolean;
};

export const HOUSE_PHONE_CHROME_OPEN: HousePhoneChromeState = {
  dockHidden: false,
  bandTucked: false,
};

const HOUSE_PHONE_CHROME_TUCKED: HousePhoneChromeState = {
  dockHidden: true,
  bandTucked: true,
};

/** The band row's height: WORKSPACE_BAND_FOLD_CLASS's h-14. */
export const HOUSE_PHONE_BAND_ROW_PX = 56;

/** The fold runs 200ms (duration-200); the settle outlasts it. */
export const HOUSE_PHONE_CHROME_SETTLE_MS = 280;

/** Vertical travel on the lead stack that counts as a pull or a push. */
export const HOUSE_PHONE_CHROME_SWIPE_PX = 24;

/** Where a swipe folds or opens the band. */
export const HOUSE_PHONE_CHROME_SWIPE_ZONE = "[data-house-lead-stack]";

/** True when the page can still scroll after the band folds. */
export function housePhoneBandCanTuck(scrollRange: number, rowPx = HOUSE_PHONE_BAND_ROW_PX): boolean {
  return scrollRange > rowPx * 2;
}

/** A mostly vertical drag past the threshold: down opens, up folds. */
export function housePhoneChromeSwipe(
  dx: number,
  dy: number,
  threshold = HOUSE_PHONE_CHROME_SWIPE_PX,
): "open" | "tuck" | null {
  if (Math.abs(dy) <= Math.abs(dx)) return null;
  if (dy >= threshold) return "open";
  if (dy <= -threshold) return "tuck";
  return null;
}

export type HousePhoneChromeController = {
  scroll: () => void;
  swipe: (dx: number, dy: number) => boolean;
  open: () => void;
  state: () => HousePhoneChromeState;
};

export function createHousePhoneChrome({
  readY,
  readRange,
  now,
  onChange,
}: {
  readY: () => number;
  /** scrollHeight - clientHeight of the page scroller. */
  readRange: () => number;
  now: () => number;
  onChange: (next: HousePhoneChromeState) => void;
}): HousePhoneChromeController {
  let tracker: SocialTabBarScrollTracker = createSocialTabBarScrollTracker(Math.max(0, readY()));
  let state = HOUSE_PHONE_CHROME_OPEN;
  let settleUntil = -Infinity;

  const apply = (next: HousePhoneChromeState) => {
    if (next.dockHidden === state.dockHidden && next.bandTucked === state.bandTucked) return;
    if (next.bandTucked !== state.bandTucked) settleUntil = now() + HOUSE_PHONE_CHROME_SETTLE_MS;
    state = next;
    onChange(next);
  };

  const force = (next: HousePhoneChromeState) => {
    tracker = {
      lastY: Math.max(0, readY()),
      acc: 0,
      state: next.dockHidden ? "hidden" : "visible",
    };
    apply(next);
  };

  return {
    scroll() {
      const y = readY();
      if (now() < settleUntil) {
        tracker = { ...tracker, lastY: Math.max(0, y), acc: 0 };
        return;
      }
      const next = stepSocialTabBarScroll(tracker, y);
      const changed = next.state !== tracker.state;
      tracker = next;
      if (!changed) return;
      apply(
        next.state === "hidden"
          ? { dockHidden: true, bandTucked: housePhoneBandCanTuck(readRange()) }
          : HOUSE_PHONE_CHROME_OPEN,
      );
    },
    swipe(dx, dy) {
      const move = housePhoneChromeSwipe(dx, dy);
      if (!move) return false;
      force(move === "open" ? HOUSE_PHONE_CHROME_OPEN : HOUSE_PHONE_CHROME_TUCKED);
      return true;
    },
    open() {
      force(HOUSE_PHONE_CHROME_OPEN);
    },
    state: () => state,
  };
}
