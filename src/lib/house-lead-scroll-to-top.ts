// iOS Safari status-bar tap → active house lead scroller (Adam
// 2026-09-19). The G9 house shell is `h-dvh overflow-hidden` with page
// scroll nested on `main[data-house-lead-scroll]` — window itself never
// scrolls. iOS Safari's status-bar tap only scrolls the topmost
// UIScrollView (window), so on this shell it hits an empty document and
// does nothing.
//
// The house-united bridge below stays inside the G9 contract (no
// document/window scroll flip, no phone-only shell fork). On coarse-
// pointer devices only, `HouseLeadScrollToTop` gives html a single
// pixel of headroom, holds window at scrollY=`HOUSE_LEAD_SCROLL_TO_TOP.
// offset`, and forwards the OS's forced scroll-to-0 back to every
// `[data-house-lead-scroll]` scroller. Desktop stays a no-op — the
// media query gates the effect.
//
// This is a Home + workspace fix, not a Home-only patch — the same
// scroll ancestor contract (nested main scroll) survives across
// Aggregation · Social · Education · Home. Bottom-nav scroll-hide
// keeps reading the same nested scroller.

export const HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR = "[data-house-lead-scroll]";

/** Pixel of headroom on html so iOS Safari can fire scroll events on
 *  status-bar tap. Anything less and iOS treats the document as
 *  non-scrollable and does not fire the tap callback. */
export const HOUSE_LEAD_SCROLL_TO_TOP_OFFSET = 1;

/** Coarse-pointer devices only — mouse-first browsers never trigger
 *  the iOS status-bar tap and must stay at window scrollY = 0. */
export const HOUSE_LEAD_SCROLL_TO_TOP_MEDIA = "(pointer: coarse)";

/** Extra html headroom holding the 1px window-scroll bridge. */
export const HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT = "calc(100dvh + 1px)";

/** html's overflow-anchor while the bridge holds window at 1. The phone
 *  workspace band folds its row (shell-phone-workspace-band-lock-v1 §5);
 *  with scroll anchoring on (Chromium, so Android), that layout shift
 *  pulls the window from 1 to 0, which reads as a status-bar tap and
 *  sends the page to the top. */
export const HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR = "none";

export const HOUSE_LEAD_SCROLL_TO_TOP = {
  selector: HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR,
  offset: HOUSE_LEAD_SCROLL_TO_TOP_OFFSET,
  media: HOUSE_LEAD_SCROLL_TO_TOP_MEDIA,
  minHeight: HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT,
  overflowAnchor: HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR,
} as const;

/** Pure predicate — returns `true` when a scroll event indicates iOS
 *  Safari forced the window back to y = 0 (status-bar tap). Any other
 *  window scroll position leaves the bridge inert. */
export function houseLeadScrollToTopIsTap(scrollY: number): boolean {
  return scrollY === 0;
}
