"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import {
  createHousePhoneChrome,
  HOUSE_PHONE_CHROME_DRAG_ZONE,
  HOUSE_PHONE_CHROME_OPEN,
  HOUSE_PHONE_SHEET_IDLE_MS,
  HOUSE_PHONE_SHEET_SNAP_MS,
  housePhoneSheetDragAxis,
  type HousePhoneChromeController,
} from "@/lib/house-phone-chrome";
import {
  HOUSE_PHONE_CHROME_HEIGHT_VAR,
  HOUSE_PHONE_CHROME_VISIBLE_VAR,
  HOUSE_PHONE_SHEET_SETTLE_ATTR,
  HOUSE_PHONE_SHEET_Y_VAR,
} from "@/lib/house-lead-chrome";

// One phone chrome state for the dock and the workspace band
// (shell-phone-workspace-band-lock-v1 §5). HousePhoneAppShell owns it.
// The bar's position is written straight to CSS variables on the shell
// every scroll frame (no React render per frame); React state changes
// only when the dock hides or the band is fully covered.
// G9 page scroll lives on main (`[data-house-lead-scroll]`), not window.

export type HousePhoneChrome = {
  dockHidden: boolean;
  bandTucked: boolean;
  /** Bring the band and the dock back (keyboard focus into the band). */
  open: () => void;
};

export const HousePhoneChromeContext = createContext<HousePhoneChrome>({
  ...HOUSE_PHONE_CHROME_OPEN,
  open: () => {},
});

export function useHousePhoneChrome(): HousePhoneChrome {
  return useContext(HousePhoneChromeContext);
}

export function useHousePhoneChromeTracker(
  rootRef: RefObject<HTMLElement | null>,
  pathname: string,
): HousePhoneChrome {
  const [chrome, setChrome] = useState({ path: pathname, ...HOUSE_PHONE_CHROME_OPEN });
  if (chrome.path !== pathname) {
    setChrome({ path: pathname, ...HOUSE_PHONE_CHROME_OPEN });
  }
  const controller = useRef<HousePhoneChromeController | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const scroller = root.querySelector<HTMLElement>("[data-house-lead-scroll]");
    const readY = () => (scroller ? scroller.scrollTop : window.scrollY);

    // The chrome's height (band + bar + Education search row) pads the
    // page under it; the visible part (less the bar's cover) is where
    // sticky rows and scroll-into-view stop.
    let chromeHeight = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const paint = (offset: number) => {
      root.style.setProperty(HOUSE_PHONE_SHEET_Y_VAR, `${offset}px`);
      root.style.setProperty(HOUSE_PHONE_CHROME_VISIBLE_VAR, `${Math.max(0, chromeHeight - offset)}px`);
    };
    const reduceMotion =
      typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sheet = createHousePhoneChrome({
      readY,
      readRange: () => (scroller ? scroller.scrollHeight - scroller.clientHeight : 0),
      scrollPage: (y, smooth) =>
        scroller?.scrollTo({ top: y, behavior: smooth && !reduceMotion ? "smooth" : "auto" }),
      onOffset: (offset, settle) => {
        clearTimeout(settleTimer);
        if (settle) {
          root.setAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR, "");
          settleTimer = setTimeout(
            () => root.removeAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR),
            HOUSE_PHONE_SHEET_SNAP_MS + 40,
          );
        } else {
          root.removeAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR);
        }
        paint(offset);
      },
      onChange: (next) =>
        setChrome((current) => (current.path !== pathname ? current : { path: pathname, ...next })),
    });
    controller.current = sheet;

    const measure = () => {
      const stack = root.querySelector<HTMLElement>("[data-house-lead-stack]");
      // A stack hidden with display:none (the immersive feed) has no box:
      // keep the last height, so the page's top pad does not collapse.
      if (stack && stack.getClientRects().length === 0) return;
      chromeHeight = stack ? stack.offsetHeight : 0;
      root.style.setProperty(HOUSE_PHONE_CHROME_HEIGHT_VAR, `${chromeHeight}px`);
      paint(sheet.offset());
    };
    // The stack is replaced when the header's data resolves (Suspense),
    // and it grows with Education's search row: watch both.
    const resize = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
    const watchStack = () => {
      resize?.disconnect();
      const stack = root.querySelector<HTMLElement>("[data-house-lead-stack]");
      if (stack) resize?.observe(stack);
      measure();
    };
    const swaps = typeof MutationObserver === "undefined" ? undefined : new MutationObserver(watchStack);
    swaps?.observe(root, { childList: true });
    watchStack();

    // Settle once the scroll is at rest and no finger is down.
    let touching = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const armSettle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!touching) sheet.settle();
      }, HOUSE_PHONE_SHEET_IDLE_MS);
    };
    const onScroll = () => {
      sheet.scroll();
      armSettle();
    };

    // A drag on the bar or the band moves the bar under the finger once it
    // reads as vertical; a sideways drag leaves the band's pills to slide.
    let drag: { x: number; y: number; axis: "vertical" | "horizontal" | null } | null = null;
    // A touch whose element is removed mid-gesture (the header's Suspense
    // swap, a skeleton giving way to the feed) ends on that element, out of
    // the root's reach: listen there too, or the finger reads as down for
    // good and the bar never settles.
    let endTarget: Element | null = null;
    const releaseEndTarget = () => {
      endTarget?.removeEventListener("touchend", onDetachedEnd);
      endTarget?.removeEventListener("touchcancel", onDetachedEnd);
      endTarget = null;
    };
    const onDetachedEnd = (event: Event) => {
      const el = endTarget;
      releaseEndTarget();
      // Still attached: the event reaches the root, which ends it there.
      if (el && !el.isConnected && event instanceof TouchEvent) onTouchEnd(event);
    };
    const onTouchStart = (event: TouchEvent) => {
      touching = true;
      clearTimeout(idleTimer);
      const el = event.target instanceof Element ? event.target : null;
      releaseEndTarget();
      if (el) {
        endTarget = el;
        el.addEventListener("touchend", onDetachedEnd, { passive: true });
        el.addEventListener("touchcancel", onDetachedEnd, { passive: true });
      }
      const touch = event.touches[0];
      drag =
        event.touches.length === 1 && touch && el?.closest(HOUSE_PHONE_CHROME_DRAG_ZONE)
          ? { x: touch.clientX, y: touch.clientY, axis: null }
          : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!drag || event.touches.length !== 1 || !touch) return;
      const dx = touch.clientX - drag.x;
      const dy = touch.clientY - drag.y;
      if (!drag.axis) {
        drag.axis = housePhoneSheetDragAxis(dx, dy);
        if (drag.axis === "vertical") sheet.dragStart();
        if (drag.axis !== "vertical") return;
      }
      if (drag.axis === "vertical") sheet.drag(dy);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (event.touches.length > 0) return;
      touching = false;
      if (drag?.axis === "vertical") sheet.dragEnd();
      else armSettle();
      drag = null;
    };

    const target: EventTarget = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      releaseEndTarget();
      swaps?.disconnect();
      resize?.disconnect();
      clearTimeout(idleTimer);
      clearTimeout(settleTimer);
      root.removeAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR);
      root.style.setProperty(HOUSE_PHONE_SHEET_Y_VAR, "0px");
      controller.current = null;
    };
  }, [pathname, rootRef]);

  const open = useCallback(() => controller.current?.open(), []);
  const live = chrome.path === pathname ? chrome : { path: pathname, ...HOUSE_PHONE_CHROME_OPEN };
  const { dockHidden, bandTucked } = live;
  return useMemo(() => ({ dockHidden, bandTucked, open }), [dockHidden, bandTucked, open]);
}
