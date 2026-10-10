// Phone chrome runtime (docs/design-locks/shell-phone-workspace-band-lock-v1.md
// §5 and G14, v1.5: Adam 2026-10-09, on the scroll review, "fix and change
// everything that you recommend"). The pure controller (house-phone-chrome)
// owns the geometry; this owns the timing, with no framework, so every path
// is testable with fake timers and frames. The hook (house-phone-chrome-
// state) only binds it to the shell.
//
//   - Rest: the page scroller's `scrollend` where it fires (Safari 26.2 and
//     later), with a 600ms watchdog if it never comes; 120ms without a
//     scroll event where it does not. Never both. A frame with no scroll
//     confirms each rest (two after an event), and a rest settles once.
//   - Near the top the settle is a glide: the page and the bar written in
//     the same animation frame, over 180ms on the deep settle's curve,
//     started only from a proven rest or a drag released with no other
//     scroll during the touch. On the 120ms path the browser's smooth
//     scroll moves the page and the bar follows it.
//   - Every settle ends in `land()`: open or covered, the dock with it.
//   - Nothing settles, lands or writes the page while a finger is down.
//   - The runtime's own page writes are told apart from the user's scroll
//     (their echo), so they never start a rest or cancel a glide.
//   - A drag applies once per frame; the release flushes it first.
//   - The status-bar tap's signal, a touch, or a scroll the settle did not
//     make stops a settle; `stop()` (navigation, width, unmount) ends all.

import {
  HOUSE_PHONE_CHROME_HEIGHT_VAR,
  HOUSE_PHONE_CHROME_VISIBLE_VAR,
  HOUSE_PHONE_DOCK_HIDDEN_ATTR,
  HOUSE_PHONE_SHEET_SETTLE_ATTR,
  HOUSE_PHONE_SHEET_Y_VAR,
} from "./house-lead-chrome";
import { HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS } from "./house-lead-scroll-to-top";
import {
  createHousePhoneChrome,
  HOUSE_PHONE_CHROME_DRAG_ZONE,
  HOUSE_PHONE_CHROME_OPEN,
  HOUSE_PHONE_SHEET_EASE,
  HOUSE_PHONE_SHEET_IDLE_MS,
  HOUSE_PHONE_SHEET_SNAP_MS,
  HOUSE_PHONE_SHEET_TOLERANCE_PX,
  housePhoneSheetDragAxis,
  type HousePhoneChromeState,
} from "./house-phone-chrome";
import { cubicBezierProgress } from "./segmented-track";

/** With `scrollend`, a rest that never fires one stands in after this. */
export const HOUSE_PHONE_SHEET_REST_WATCHDOG_MS = 600;

/** The 120ms path's smooth settle lands this long after its last event. */
export const HOUSE_PHONE_SHEET_NATIVE_QUIET_MS = HOUSE_PHONE_SHEET_IDLE_MS;

/** A glide whose frames stop (a hidden tab) still lands after this. */
export const HOUSE_PHONE_SHEET_GLIDE_WATCHDOG_MS = HOUSE_PHONE_SHEET_SNAP_MS + HOUSE_PHONE_SHEET_IDLE_MS;

/** The settle mark comes off the shell once the 180ms ease is done. */
export const HOUSE_PHONE_SHEET_EASE_CLEAR_MS = HOUSE_PHONE_SHEET_SNAP_MS + 40;

/** A scroll within this of the runtime's own last write is that write. */
export const HOUSE_PHONE_SHEET_FOREIGN_PX = 1;

/** Frames with no scroll that confirm a rest. A frame asked for from an
 *  event handler runs in that same rendering update, so it takes two; one
 *  asked for from a timer runs after the next update's scroll events. */
export const HOUSE_PHONE_SHEET_QUIET_FRAMES = { event: 2, timer: 1 } as const;

/** A finger counted down this long with no touch event is lifted (the
 *  status-bar bridge's rule). */
export const HOUSE_PHONE_SHEET_TOUCH_STALE_MS = HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS;

export type HousePhoneChromeRestMode = "scrollend" | "timer";

export type HousePhoneChromeClock = {
  now: () => number;
  setTimeout: (callback: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
  requestFrame: (callback: (time: number) => void) => unknown;
  cancelFrame: (handle: unknown) => void;
};

/** The shell element: the marks and the variables go on it. */
export type HousePhoneChromeRoot = {
  setAttribute: (name: string, value: string) => void;
  removeAttribute: (name: string) => void;
  style: { setProperty: (name: string, value: string) => void };
};

/** The page scroller (`main[data-house-lead-scroll]`). */
export type HousePhoneChromeScroller = {
  scrollTop: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
  scrollTo: (options: { top: number; behavior: "smooth" }) => void;
};

export type HousePhoneTouchPoint = { clientX: number; clientY: number };

/** A touch event, duck-typed (node has no TouchEvent). */
export type HousePhoneTouchLike = {
  touches: ArrayLike<HousePhoneTouchPoint>;
  target: unknown;
  cancelable?: boolean;
  preventDefault?: () => void;
};

export type HousePhoneChromeRuntimeEnv = {
  root: HousePhoneChromeRoot;
  scroller: HousePhoneChromeScroller | null;
  readY: () => number;
  /** The bar's cover on screen (its computed translate), or null. */
  readLiveCover: () => number | null;
  /** Fixed at creation: `scrollend` or the 120ms timer, never both. */
  restMode: HousePhoneChromeRestMode;
  /** Read at every settle, so a change applies from the next rest. */
  reduceMotion: () => boolean;
  clock: HousePhoneChromeClock;
  onChange: (next: HousePhoneChromeState) => void;
};

export type HousePhoneChromeRuntime = {
  onScroll: () => void;
  onScrollEnd: () => void;
  /** The status-bar tap is about to scroll the page (synchronous). */
  onForeignScroll: () => void;
  onTouchStart: (event: HousePhoneTouchLike) => void;
  onTouchMove: (event: HousePhoneTouchLike) => void;
  onTouchEnd: (event: HousePhoneTouchLike) => void;
  /** Bring the band and the dock back (keyboard focus into the band). */
  open: () => void;
  setChromeHeight: (px: number) => void;
  /** End everything (navigation, a width change, unmount). Idempotent. */
  stop: () => void;
};

/** `scrollend` where the scroller has it (WebKit ships the handler with the
 *  event), the 120ms timer otherwise. */
export function housePhoneChromeRestMode(target: object): HousePhoneChromeRestMode {
  return "onscrollend" in target ? "scrollend" : "timer";
}

/** The page position `elapsed` ms into a near-top glide: whole pixels, on
 *  the settle's curve. */
export function housePhoneSheetGlideY(
  from: number,
  to: number,
  elapsed: number,
  duration = HOUSE_PHONE_SHEET_SNAP_MS,
): number {
  const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration));
  const [x1, y1, x2, y2] = HOUSE_PHONE_SHEET_EASE;
  return Math.round(from + (to - from) * cubicBezierProgress(t, x1, y1, x2, y2));
}

const PX = /^(-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)px$/i;

/** The cover from a computed `translate` ("0px -23.5px" is 23.5). One
 *  length or `none` is no vertical move; anything else is unknown (null). */
export function housePhoneSheetCoverFromTranslate(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "none") return 0;
  const tokens = text.split(/\s+/);
  const length = (token: string | undefined) => {
    const match = token === undefined ? null : PX.exec(token);
    return match ? Number(match[1]) : null;
  };
  if (tokens.length === 1) return length(tokens[0]) === null ? null : 0;
  const y = length(tokens[1]);
  if (y === null) return null;
  return y === 0 ? 0 : -y;
}

type TouchTarget = {
  isConnected: boolean;
  closest: (selector: string) => unknown;
  addEventListener: (type: string, listener: (event: unknown) => void, options?: { passive?: boolean }) => void;
  removeEventListener: (type: string, listener: (event: unknown) => void) => void;
};

function isTouchTarget(value: unknown): value is TouchTarget {
  if (typeof value !== "object" || value === null) return false;
  const el = value as Partial<TouchTarget>;
  return (
    typeof el.closest === "function" &&
    typeof el.addEventListener === "function" &&
    typeof el.removeEventListener === "function"
  );
}

function isTouchLike(event: unknown): event is HousePhoneTouchLike {
  return typeof event === "object" && event !== null && "touches" in event;
}

type Phase = "idle" | "moving" | "touch" | "drag" | "glide" | "native" | "stopped";

type RestSource = "scrollend" | "watchdog" | "timer" | "lift";

type Glide = { from: number; to: number; t0: number | null; frame: unknown; watchdog: unknown };

export function createHousePhoneChromeRuntime(env: HousePhoneChromeRuntimeEnv): HousePhoneChromeRuntime {
  const { root, scroller, clock, restMode } = env;
  const readTop = () => (scroller ? scroller.scrollTop : env.readY());

  // One phase, no separate touching flag: idle (landed or easing), moving
  // (no finger, waiting for rest), touch, drag (a vertical chrome drag),
  // glide, native (the 120ms path's smooth settle), stopped.
  let phase: Phase = "idle";
  // Raised by the user's (or the bridge's) scrolls only, never by our writes.
  let scrollSeq = 0;
  let restSeen = false;
  let scrolledDuringTouch = false;
  let echo: number | null = null;
  let seenTop = readTop();
  let easing = false;
  let easeTimer: unknown;
  let glide: Glide | null = null;
  let nativeQuiet: unknown;
  let restTimer: unknown;
  let quiet: { frame: unknown } | null = null;
  let drag: { x: number; y: number; axis: "vertical" | "horizontal" | null } | null = null;
  let pendingDy: number | null = null;
  let dragFrame: unknown;
  let endTarget: TouchTarget | null = null;
  let staleTimer: unknown;
  let lastTouchAt = 0;
  let pageRequest: number | null = null;
  let chromeHeight = 0;

  const clearTimer = (handle: unknown) => {
    if (handle !== undefined) clock.clearTimeout(handle);
  };
  const cancelFrame = (handle: unknown) => {
    if (handle !== undefined) clock.cancelFrame(handle);
  };
  const fingerDown = () => phase === "touch" || phase === "drag";

  const paint = (offset: number) => {
    root.style.setProperty(HOUSE_PHONE_SHEET_Y_VAR, `${offset}px`);
    root.style.setProperty(HOUSE_PHONE_CHROME_VISIBLE_VAR, `${Math.max(0, chromeHeight - offset)}px`);
  };

  // A page write, remembered so its scroll event reads as ours.
  const writeTop = (y: number) => {
    if (!scroller) return;
    scroller.scrollTop = y;
    const after = scroller.scrollTop;
    if (after !== seenTop) echo = after;
    seenTop = after;
  };

  const controller = createHousePhoneChrome({
    readY: env.readY,
    readRange: () => (scroller ? scroller.scrollHeight - scroller.clientHeight : 0),
    scrollPage: (y, settle) => {
      if (settle) pageRequest = y;
      else writeTop(y);
    },
    onOffset: (offset, settle) => {
      clearTimer(easeTimer);
      easeTimer = undefined;
      if (settle) {
        root.setAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR, "");
        easing = true;
        easeTimer = clock.setTimeout(() => {
          easeTimer = undefined;
          easing = false;
          root.removeAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR);
        }, HOUSE_PHONE_SHEET_EASE_CLEAR_MS);
      } else {
        root.removeAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR);
        easing = false;
      }
      paint(offset);
    },
    // The dock's mark goes on in the same callback as the cover.
    onChange: (next) => {
      if (next.dockHidden) root.setAttribute(HOUSE_PHONE_DOCK_HIDDEN_ATTR, "");
      else root.removeAttribute(HOUSE_PHONE_DOCK_HIDDEN_ATTR);
      env.onChange(next);
    },
  });

  // While the bar eases, a move carries on from where it is on screen.
  const liveCover = () => (easing ? (env.readLiveCover() ?? undefined) : undefined);

  const clearRest = () => {
    clearTimer(restTimer);
    restTimer = undefined;
  };
  const cancelQuiet = () => {
    if (quiet) cancelFrame(quiet.frame);
    quiet = null;
  };
  const cancelNativeQuiet = () => {
    clearTimer(nativeQuiet);
    nativeQuiet = undefined;
  };
  const cancelDragFrame = () => {
    cancelFrame(dragFrame);
    dragFrame = undefined;
  };
  const clearStale = () => {
    clearTimer(staleTimer);
    staleTimer = undefined;
  };
  const cancelGlide = () => {
    if (!glide) return;
    cancelFrame(glide.frame);
    clearTimer(glide.watchdog);
    glide = null;
  };

  const armRest = () => {
    clearRest();
    const timer = restMode === "timer";
    restTimer = clock.setTimeout(
      () => {
        restTimer = undefined;
        quietCheck(timer ? "timer" : "watchdog", HOUSE_PHONE_SHEET_QUIET_FRAMES.timer);
      },
      timer ? HOUSE_PHONE_SHEET_IDLE_MS : HOUSE_PHONE_SHEET_REST_WATCHDOG_MS,
    );
  };

  // A rest counts once `frames` frames pass with no scroll.
  const quietCheck = (source: RestSource, frames: number) => {
    cancelQuiet();
    const seq = scrollSeq;
    let left = frames;
    const check: { frame: unknown } = { frame: undefined };
    const step = () => {
      if (quiet !== check) return;
      if (scrollSeq !== seq) {
        quiet = null;
        return;
      }
      left -= 1;
      if (left > 0) {
        check.frame = clock.requestFrame(step);
        return;
      }
      quiet = null;
      onRest(source);
    };
    quiet = check;
    check.frame = clock.requestFrame(step);
  };

  // A rest acts only while the page is moving with no finger down, and a
  // settle leaves that phase: one settle per rest.
  const onRest = (source: RestSource) => {
    if (phase !== "moving") return;
    clearRest();
    cancelQuiet();
    runSettle(controller.settle, source === "timer" ? "native" : "glide");
  };

  const armNativeQuiet = () => {
    cancelNativeQuiet();
    nativeQuiet = clock.setTimeout(() => {
      nativeQuiet = undefined;
      if (phase !== "native") return;
      controller.land();
      phase = "idle";
    }, HOUSE_PHONE_SHEET_NATIVE_QUIET_MS);
  };

  const finishGlide = () => {
    const run = glide;
    if (!run) return;
    cancelGlide();
    if (scroller && Math.abs(scroller.scrollTop - run.to) > HOUSE_PHONE_SHEET_TOLERANCE_PX) writeTop(run.to);
    controller.scroll();
    controller.land();
    phase = "idle";
  };

  // The page and the cover in the same frame; 180ms from the first frame.
  const glideFrame = (run: Glide, time: number) => {
    if (glide !== run || !scroller) return;
    if (run.t0 === null) run.t0 = time;
    const elapsed = time - run.t0;
    const y = housePhoneSheetGlideY(run.from, run.to, elapsed);
    if (y !== scroller.scrollTop) writeTop(y);
    controller.scroll();
    if (elapsed >= HOUSE_PHONE_SHEET_SNAP_MS) {
      finishGlide();
      return;
    }
    run.frame = clock.requestFrame((next) => glideFrame(run, next));
  };

  const startGlide = (to: number) => {
    const run: Glide = { from: readTop(), to, t0: null, frame: undefined, watchdog: undefined };
    glide = run;
    phase = "glide";
    run.frame = clock.requestFrame((time) => glideFrame(run, time));
    run.watchdog = clock.setTimeout(() => {
      if (glide === run) finishGlide();
    }, HOUSE_PHONE_SHEET_GLIDE_WATCHDOG_MS);
  };

  // Run a controller settle (settle or dragEnd) and carry out its page
  // request, if it made one.
  const runSettle = (settle: () => void, how: "glide" | "native" | "defer") => {
    pageRequest = null;
    settle();
    const top = pageRequest;
    pageRequest = null;
    // The bar eased (or nothing was needed), and the dock landed.
    if (top === null) {
      phase = "idle";
      return;
    }
    // The page took another scroll during the touch: wait for its rest.
    if (how === "defer") {
      phase = "moving";
      if (restMode === "scrollend" && restSeen) quietCheck("lift", HOUSE_PHONE_SHEET_QUIET_FRAMES.event);
      else armRest();
      return;
    }
    if (!scroller || env.reduceMotion()) {
      controller.land();
      phase = "idle";
      return;
    }
    if (how === "glide") {
      startGlide(Math.round(top));
      return;
    }
    scroller.scrollTo({ top, behavior: "smooth" });
    phase = "native";
    armNativeQuiet();
  };

  const onScroll = () => {
    if (phase === "stopped") return;
    const top = readTop();
    const mine = echo !== null && Math.abs(top - echo) <= HOUSE_PHONE_SHEET_FOREIGN_PX;
    echo = null;
    seenTop = top;
    if (mine) {
      controller.scroll();
      return;
    }
    // A scroll the glide did not make takes over from it.
    if (phase === "glide") {
      cancelGlide();
      phase = "moving";
    }
    if (phase === "native") {
      controller.scroll();
      armNativeQuiet();
      return;
    }
    controller.scroll(liveCover());
    scrollSeq += 1;
    restSeen = false;
    cancelQuiet();
    if (fingerDown()) {
      scrolledDuringTouch = true;
      return;
    }
    phase = "moving";
    armRest();
  };

  const onScrollEnd = () => {
    if (restMode !== "scrollend") return;
    if (fingerDown()) {
      if (scrolledDuringTouch) restSeen = true;
      return;
    }
    if (phase === "moving") quietCheck("scrollend", HOUSE_PHONE_SHEET_QUIET_FRAMES.event);
  };

  const onForeignScroll = () => {
    if (phase === "stopped") return;
    cancelGlide();
    cancelNativeQuiet();
    clearRest();
    cancelQuiet();
    echo = null;
    scrollSeq += 1;
    if (fingerDown()) {
      scrolledDuringTouch = true;
      return;
    }
    phase = "moving";
    armRest();
  };

  const flushDrag = () => {
    cancelDragFrame();
    if (pendingDy === null) return;
    const dy = pendingDy;
    pendingDy = null;
    if (phase === "drag") controller.drag(dy);
  };

  const scheduleDrag = () => {
    if (dragFrame !== undefined) return;
    dragFrame = clock.requestFrame(() => {
      dragFrame = undefined;
      flushDrag();
    });
  };

  // The last finger is up (or counted up): settle a drag at once, or wait
  // for the page's rest.
  const lift = () => {
    clearStale();
    const dragged = phase === "drag";
    drag = null;
    if (dragged) {
      flushDrag();
      runSettle(controller.dragEnd, scrolledDuringTouch ? "defer" : "glide");
      return;
    }
    phase = "moving";
    if (restMode === "timer") armRest();
    else if (!scrolledDuringTouch || restSeen) quietCheck("lift", HOUSE_PHONE_SHEET_QUIET_FRAMES.event);
    else armRest();
  };

  const checkStale = () => {
    staleTimer = undefined;
    if (!fingerDown()) return;
    const idle = clock.now() - lastTouchAt;
    if (idle >= HOUSE_PHONE_SHEET_TOUCH_STALE_MS) {
      lift();
      return;
    }
    staleTimer = clock.setTimeout(checkStale, HOUSE_PHONE_SHEET_TOUCH_STALE_MS - idle);
  };

  const armStale = () => {
    clearStale();
    staleTimer = clock.setTimeout(checkStale, HOUSE_PHONE_SHEET_TOUCH_STALE_MS);
  };

  // A touch whose element is removed mid-gesture (the header's Suspense
  // swap, a skeleton giving way to the feed) moves and ends on that
  // element, out of the root's reach: listen there too, or the bar stops
  // following the finger and never settles.
  const releaseEndTarget = () => {
    endTarget?.removeEventListener("touchmove", onDetachedMove);
    endTarget?.removeEventListener("touchend", onDetachedEnd);
    endTarget?.removeEventListener("touchcancel", onDetachedEnd);
    endTarget = null;
  };
  const onDetachedMove = (event: unknown) => {
    const el = endTarget;
    // Still attached: the event reaches the root, which moves it there.
    if (el && !el.isConnected && isTouchLike(event)) onTouchMove(event);
  };
  const onDetachedEnd = (event: unknown) => {
    const el = endTarget;
    releaseEndTarget();
    // Still attached: the event reaches the root, which ends it there.
    if (el && !el.isConnected && isTouchLike(event)) onTouchEnd(event);
  };

  const onTouchStart = (event: HousePhoneTouchLike) => {
    if (phase === "stopped") return;
    lastTouchAt = clock.now();
    if (fingerDown() && event.touches.length > 1) {
      // Another finger: a drag stops where it is; the last lift settles.
      if (phase === "drag") {
        flushDrag();
        controller.dragAbort();
      }
      cancelDragFrame();
      pendingDy = null;
      drag = null;
      phase = "touch";
      return;
    }
    // A first finger (it also heals a lift that was never seen).
    if (phase === "drag") controller.dragAbort();
    cancelGlide();
    cancelNativeQuiet();
    clearRest();
    cancelQuiet();
    cancelDragFrame();
    pendingDy = null;
    restSeen = false;
    scrolledDuringTouch = false;
    armStale();
    const el = isTouchTarget(event.target) ? event.target : null;
    releaseEndTarget();
    if (el) {
      endTarget = el;
      el.addEventListener("touchmove", onDetachedMove, { passive: true });
      el.addEventListener("touchend", onDetachedEnd, { passive: true });
      el.addEventListener("touchcancel", onDetachedEnd, { passive: true });
    }
    // A drag on the bar or the band moves the bar under the finger once it
    // reads as vertical; a sideways drag leaves the band's pills to slide.
    const touch = event.touches[0];
    drag =
      event.touches.length === 1 && touch && el?.closest(HOUSE_PHONE_CHROME_DRAG_ZONE)
        ? { x: touch.clientX, y: touch.clientY, axis: null }
        : null;
    phase = "touch";
  };

  const onTouchMove = (event: HousePhoneTouchLike) => {
    if (!fingerDown()) return;
    lastTouchAt = clock.now();
    const touch = event.touches[0];
    if (!drag || event.touches.length !== 1 || !touch) return;
    const dx = touch.clientX - drag.x;
    const dy = touch.clientY - drag.y;
    if (!drag.axis) {
      drag.axis = housePhoneSheetDragAxis(dx, dy);
      if (drag.axis !== "vertical") return;
      phase = "drag";
      controller.dragStart(liveCover());
    }
    if (phase !== "drag") return;
    // Once per frame: the latest finger position wins.
    pendingDy = dy;
    scheduleDrag();
  };

  const onTouchEnd = (event: HousePhoneTouchLike) => {
    if (event.touches.length > 0 || !fingerDown()) return;
    lift();
  };

  const open = () => {
    if (phase === "stopped") return;
    cancelGlide();
    cancelNativeQuiet();
    clearRest();
    cancelQuiet();
    if (phase === "drag") {
      flushDrag();
      controller.dragAbort();
      drag = null;
      phase = "touch";
    }
    controller.open();
    if (!fingerDown()) phase = "idle";
  };

  const setChromeHeight = (px: number) => {
    if (phase === "stopped") return;
    chromeHeight = px;
    root.style.setProperty(HOUSE_PHONE_CHROME_HEIGHT_VAR, `${px}px`);
    paint(controller.offset());
  };

  const stop = () => {
    if (phase === "stopped") return;
    phase = "stopped";
    cancelGlide();
    cancelNativeQuiet();
    clearRest();
    cancelQuiet();
    cancelDragFrame();
    pendingDy = null;
    clearStale();
    clearTimer(easeTimer);
    easeTimer = undefined;
    easing = false;
    releaseEndTarget();
    drag = null;
    echo = null;
    root.removeAttribute(HOUSE_PHONE_SHEET_SETTLE_ATTR);
    root.removeAttribute(HOUSE_PHONE_DOCK_HIDDEN_ATTR);
    paint(0);
    // The chrome reads open from here (a width change back to phone starts
    // a new tracker from open).
    const last = controller.state();
    if (last.dockHidden || last.bandTucked) env.onChange(HOUSE_PHONE_CHROME_OPEN);
  };

  return {
    onScroll,
    onScrollEnd,
    onForeignScroll,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    open,
    setChromeHeight,
    stop,
  };
}
