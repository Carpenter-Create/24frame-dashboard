"use client";

import { useEffect } from "react";

import {
  HOUSE_LEAD_SCROLL_TO_TOP_MEDIA,
  HOUSE_LEAD_SCROLL_TO_TOP_MIN_HEIGHT,
  HOUSE_LEAD_SCROLL_TO_TOP_OFFSET,
  HOUSE_LEAD_SCROLL_TO_TOP_OVERFLOW_ANCHOR,
  HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR,
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

    const onScroll = () => {
      if (!houseLeadScrollToTopIsTap(window.scrollY)) return;
      document
        .querySelectorAll<HTMLElement>(HOUSE_LEAD_SCROLL_TO_TOP_SELECTOR)
        .forEach((scroller) => {
          scroller.scrollTo({ top: 0, behavior: "smooth" });
        });
      window.scrollTo(0, HOUSE_LEAD_SCROLL_TO_TOP_OFFSET);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      root.style.minHeight = previousMinHeight;
      root.style.overflowAnchor = previousOverflowAnchor;
    };
  }, []);
  return null;
}
