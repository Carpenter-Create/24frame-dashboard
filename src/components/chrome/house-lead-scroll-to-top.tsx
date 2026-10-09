"use client";

import { useEffect } from "react";

import {
  HOUSE_LEAD_SCROLL_TO_TOP_MEDIA,
  HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT,
  HOUSE_LEAD_SCROLL_TO_TOP_OFFSET,
  HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR,
  HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR,
  HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_GRACE_MS,
  HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS,
  houseLeadScrollToTopIsTap,
} from "@/lib/house-lead-scroll-to-top";

// Mounted once per shell (Aggregation · Social · Education · Home). See
// `lib/house-lead-scroll-to-top` for the contract and rationale.

export function HouseLeadScrollToTop() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia(HOUSE_LEAD_SCROLL_TO_TOP_MEDIA).matches) return;

    const root = document.documentElement;
    const previousMinHeight = root.style.minHeight;
    const previousOverflowAnchor = root.style.overflowAnchor;
    root.style.minHeight = HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT;
    root.style.overflowAnchor = HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR;
    window.scrollTo(0, HOUSE_LEAD_SCROLL_TO_TOP_OFFSET);

    // Fingers on the page, when one last went down, and when the last lifted.
    let fingers = 0;
    let touchedAt = -Infinity;
    let liftedAt = -Infinity;
    const onTouch = (event: TouchEvent) => {
      fingers = event.touches.length;
      if (event.type === "touchstart") touchedAt = performance.now();
      if (fingers === 0) liftedAt = performance.now();
    };
    const fingerRecent = () => {
      const now = performance.now();
      return (
        (fingers > 0 && now - touchedAt < HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS) ||
        now - liftedAt < HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_GRACE_MS
      );
    };

    const onScroll = () => {
      if (window.scrollY !== 0) return;
      if (houseLeadScrollToTopIsTap(window.scrollY, fingerRecent())) {
        document
          .querySelectorAll<HTMLElement>(HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR)
          .forEach((scroller) => {
            scroller.scrollTo({ top: 0, behavior: "smooth" });
          });
      }
      // Either way the window goes back to 1, ready for the next tap.
      window.scrollTo(0, HOUSE_LEAD_SCROLL_TO_TOP_OFFSET);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true, capture: true });
    window.addEventListener("touchend", onTouch, { passive: true, capture: true });
    window.addEventListener("touchcancel", onTouch, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouch, { capture: true });
      window.removeEventListener("touchend", onTouch, { capture: true });
      window.removeEventListener("touchcancel", onTouch, { capture: true });
      root.style.minHeight = previousMinHeight;
      root.style.overflowAnchor = previousOverflowAnchor;
    };
  }, []);
  return null;
}
