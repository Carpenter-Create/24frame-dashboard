"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

import { HOUSE_PHONE_CHROME_MEDIA, HOUSE_PHONE_CHROME_OPEN } from "@/lib/house-phone-chrome";
import {
  createHousePhoneChromeRuntime,
  housePhoneChromeRestMode,
  housePhoneSheetCoverFromTranslate,
  type HousePhoneChromeRuntime,
} from "@/lib/house-phone-chrome-runtime";
import { HOUSE_LEAD_SCROLL_TO_TOP_EVENT } from "@/lib/house-lead-scroll-to-top";

// One phone chrome state for the dock and the workspace band
// (shell-phone-workspace-band-lock-v1 §5). HousePhoneAppShell owns it.
// The bar's position is written straight to CSS variables on the shell
// every scroll frame (no React render per frame); React state changes
// only when the dock hides or the band is fully covered.
// G9 page scroll lives on main (`[data-house-lead-scroll]`), not window.
//
// v1.5 (Adam 2026-10-09): the timing lives in house-phone-chrome-runtime;
// this only binds it. It runs below `md` only (HOUSE_PHONE_CHROME_MEDIA):
// at `md` and up nothing is bound and the chrome reads open. It stops in
// the new route's commit (a layout effect), so a settle never writes into
// the next page. The band reads its own context (HousePhoneBandContext),
// so a dock flip never re-renders it; the dock hides from the shell's
// mark, written in the same handler as the cover.

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

/** The band's half of the chrome: it never changes with the dock. */
export type HousePhoneBand = {
  bandTucked: boolean;
  open: () => void;
};

export const HousePhoneBandContext = createContext<HousePhoneBand>({
  bandTucked: false,
  open: () => {},
});

export function useHousePhoneBand(): HousePhoneBand {
  return useContext(HousePhoneBandContext);
}

export function useHousePhoneBandValue(chrome: HousePhoneChrome): HousePhoneBand {
  const { bandTucked, open } = chrome;
  return useMemo(() => ({ bandTucked, open }), [bandTucked, open]);
}

// One query for the page's life (React reads the snapshot every render).
let phoneQuery: MediaQueryList | null = null;
function phoneMedia(): MediaQueryList | null {
  if (phoneQuery) return phoneQuery;
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return null;
  phoneQuery = window.matchMedia(HOUSE_PHONE_CHROME_MEDIA);
  return phoneQuery;
}

function subscribePhone(onChange: () => void): () => void {
  const media = phoneMedia();
  if (!media) return () => {};
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

const phoneSnapshot = () => phoneMedia()?.matches ?? false;
const phoneServerSnapshot = () => false;

export function useHousePhoneChromeTracker(
  rootRef: RefObject<HTMLElement | null>,
  pathname: string,
): HousePhoneChrome {
  const [chrome, setChrome] = useState({ path: pathname, ...HOUSE_PHONE_CHROME_OPEN });
  if (chrome.path !== pathname) {
    setChrome({ path: pathname, ...HOUSE_PHONE_CHROME_OPEN });
  }
  const phone = useSyncExternalStore(subscribePhone, phoneSnapshot, phoneServerSnapshot);
  const runtime = useRef<HousePhoneChromeRuntime | null>(null);

  // Every navigation stops the tracker in the new route's commit, before
  // it paints: no settle frame writes into the next page, and the dock's
  // mark comes off with React's open state.
  const halt = useCallback(() => runtime.current?.stop(), []);
  useLayoutEffect(() => halt, [pathname, halt]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !phone) return undefined;
    const scroller = root.querySelector<HTMLElement>("[data-house-lead-scroll]");
    const readY = () => (scroller ? scroller.scrollTop : window.scrollY);
    const motion =
      typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const target: EventTarget = scroller ?? window;
    const restMode = housePhoneChromeRestMode(target);

    const sheet = createHousePhoneChromeRuntime({
      root,
      scroller,
      readY,
      // The bar on screen while it eases (its computed translate).
      readLiveCover: () => {
        const bar = root.querySelector<HTMLElement>("[data-house-lead-chrome]");
        return bar ? housePhoneSheetCoverFromTranslate(window.getComputedStyle(bar).translate) : null;
      },
      restMode,
      reduceMotion: () => motion?.matches ?? false,
      clock: {
        now: () => performance.now(),
        setTimeout: (callback, ms) => window.setTimeout(callback, ms),
        clearTimeout: (handle) => window.clearTimeout(handle as number),
        requestFrame: (callback) => window.requestAnimationFrame(callback),
        cancelFrame: (handle) => window.cancelAnimationFrame(handle as number),
      },
      onChange: (next) =>
        setChrome((current) => (current.path !== pathname ? current : { path: pathname, ...next })),
    });
    runtime.current = sheet;

    // The chrome's height (band + bar + Education search row) pads the
    // page under it; the visible part (less the bar's cover) is where
    // sticky rows and scroll-into-view stop.
    const measure = () => {
      const stack = root.querySelector<HTMLElement>("[data-house-lead-stack]");
      // A stack hidden with display:none (the immersive feed) has no box:
      // keep the last height, so the page's top pad does not collapse.
      if (stack && stack.getClientRects().length === 0) return;
      sheet.setChromeHeight(stack ? stack.offsetHeight : 0);
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

    const { onScroll, onScrollEnd, onForeignScroll, onTouchStart, onTouchMove, onTouchEnd } = sheet;
    target.addEventListener("scroll", onScroll, { passive: true });
    // `scrollend` where it fires, the 120ms timer where it does not: never both.
    if (restMode === "scrollend") target.addEventListener("scrollend", onScrollEnd, { passive: true });
    // The status-bar tap's signal, just before its smooth scroll.
    target.addEventListener(HOUSE_LEAD_SCROLL_TO_TOP_EVENT, onForeignScroll);
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: true });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      if (restMode === "scrollend") target.removeEventListener("scrollend", onScrollEnd);
      target.removeEventListener(HOUSE_LEAD_SCROLL_TO_TOP_EVENT, onForeignScroll);
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
      resize?.disconnect();
      swaps?.disconnect();
      sheet.stop();
      runtime.current = null;
    };
  }, [pathname, rootRef, phone]);

  const open = useCallback(() => runtime.current?.open(), []);
  const live = phone && chrome.path === pathname ? chrome : { path: pathname, ...HOUSE_PHONE_CHROME_OPEN };
  const { dockHidden, bandTucked } = live;
  return useMemo(() => ({ dockHidden, bandTucked, open }), [dockHidden, bandTucked, open]);
}
