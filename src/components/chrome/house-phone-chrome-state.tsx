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
  HOUSE_PHONE_CHROME_OPEN,
  HOUSE_PHONE_CHROME_SWIPE_ZONE,
  type HousePhoneChromeController,
} from "@/lib/house-phone-chrome";

// One phone chrome state for the dock and the workspace band
// (shell-phone-workspace-band-lock-v1 §5). HousePhoneAppShell owns it;
// the dock hides and the band folds from the same tracker.
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
    const scroller = root?.querySelector<HTMLElement>("[data-house-lead-scroll]") ?? null;
    const tuck = createHousePhoneChrome({
      readY: () => (scroller ? scroller.scrollTop : window.scrollY),
      readRange: () => (scroller ? scroller.scrollHeight - scroller.clientHeight : 0),
      now: () => performance.now(),
      onChange: (next) =>
        setChrome((current) => (current.path !== pathname ? current : { path: pathname, ...next })),
    });
    controller.current = tuck;

    const target: EventTarget = scroller ?? window;
    const onScroll = () => tuck.scroll();

    // Pull the bar down / push it up: a vertical drag that starts on the
    // lead stack. Passive, so taps and the band's sideways slide are
    // untouched.
    let start: { x: number; y: number } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      const el = event.target instanceof Element ? event.target : null;
      const touch = event.touches[0];
      start =
        event.touches.length === 1 && touch && el?.closest(HOUSE_PHONE_CHROME_SWIPE_ZONE)
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!start || event.touches.length !== 1 || !touch) return;
      if (tuck.swipe(touch.clientX - start.x, touch.clientY - start.y)) start = null;
    };
    const onTouchEnd = () => {
      start = null;
    };

    target.addEventListener("scroll", onScroll, { passive: true });
    root?.addEventListener("touchstart", onTouchStart, { passive: true });
    root?.addEventListener("touchmove", onTouchMove, { passive: true });
    root?.addEventListener("touchend", onTouchEnd, { passive: true });
    root?.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      root?.removeEventListener("touchstart", onTouchStart);
      root?.removeEventListener("touchmove", onTouchMove);
      root?.removeEventListener("touchend", onTouchEnd);
      root?.removeEventListener("touchcancel", onTouchEnd);
      controller.current = null;
    };
  }, [pathname, rootRef]);

  const open = useCallback(() => controller.current?.open(), []);
  const live = chrome.path === pathname ? chrome : { path: pathname, ...HOUSE_PHONE_CHROME_OPEN };
  const { dockHidden, bandTucked } = live;
  return useMemo(() => ({ dockHidden, bandTucked, open }), [dockHidden, bandTucked, open]);
}
