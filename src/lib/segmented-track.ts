// House segmented-track behavior. Tokens stay in house-shell.
// The thumb slides by transitioning left + width. Route hops that
// remount the track (workspace Social fork, period query commits)
// would otherwise snap. A module flight stores from/to + start time
// so the next mount can paint the in-flight box and finish the glide
// with the remaining duration.
//
// visualIndex is the SoT for BOTH the thumb and selected ink.
// Ink snaps (ITEM_ON has no color transition). Only the thumb eases 320ms.
// Click intent advances it immediately. Route hops that remount
// the track (Home `?period=` Suspense, workspace Social fork)
// would otherwise reset ink to the stale route while the thumb
// flight continues. Persist remembers the route index at click
// and only wins while that stale route is still showing. A new
// committed index (Settings -1, leave/return, settled hop)
// yields to the route. No-op re-clicks do not write persist.
// Hosts must not keep a local pendingIndex / pendingFamily fork.

import {
  HOUSE_SEGMENTED_THUMB_DURATION_MS,
  HOUSE_SEGMENTED_THUMB_EASE,
} from "@/lib/house-shell";

export type SegmentedThumbBox = {
  left: number;
  width: number;
};

export type SegmentedThumbFlight = {
  from: SegmentedThumbBox;
  to: SegmentedThumbBox;
  startedAt: number;
  durationMs: number;
};

export type SegmentedThumbProjection = {
  box: SegmentedThumbBox;
  remainingMs: number;
  done: boolean;
};

export const SEGMENTED_TRACK_PERSIST = {
  workspace: "workspace-pills",
  period: "house-period-presets",
  activityStatus: "activity-status",
  activityPeriod: "activity-period",
  activityFamily: "activity-family",
  reportsPeriod: "reports-period",
  reportsRanked: "reports-top-pills",
  phoneDest: "phone-dest",
  newsSource: "news-source",
  socialActivity: "social-activity",
} as const;

export type SegmentedVisualPersist = {
  visualIndex: number;
  fromRouteIndex: number;
};

const thumbFlights = new Map<string, SegmentedThumbFlight>();
const visualIndexes = new Map<string, SegmentedVisualPersist>();

export function readSegmentedThumbFlight(
  persistKey: string,
): SegmentedThumbFlight | undefined {
  return thumbFlights.get(persistKey);
}

export function writeSegmentedThumbFlight(
  persistKey: string,
  flight: SegmentedThumbFlight,
): void {
  if (!isUsableSegmentedThumbBox(flight.from) && !isUsableSegmentedThumbBox(flight.to)) {
    return;
  }
  thumbFlights.set(persistKey, flight);
}

export function readSegmentedThumbCache(
  persistKey: string,
  now = typeof performance === "undefined" ? 0 : performance.now(),
): SegmentedThumbBox | undefined {
  const flight = thumbFlights.get(persistKey);
  if (!flight) return undefined;
  return projectSegmentedThumbFlight(flight, now).box;
}

export function writeSegmentedThumbCache(
  persistKey: string,
  box: SegmentedThumbBox,
): void {
  if (!isUsableSegmentedThumbBox(box)) return;
  thumbFlights.set(persistKey, {
    from: box,
    to: box,
    startedAt: 0,
    durationMs: 0,
  });
}

export function clearSegmentedThumbCache(persistKey?: string): void {
  if (persistKey) {
    thumbFlights.delete(persistKey);
    visualIndexes.delete(persistKey);
    return;
  }
  thumbFlights.clear();
  visualIndexes.clear();
}

export function readSegmentedVisualIndex(
  persistKey: string,
): number | undefined {
  return visualIndexes.get(persistKey)?.visualIndex;
}

export function readSegmentedVisualPersist(
  persistKey: string,
): SegmentedVisualPersist | undefined {
  return visualIndexes.get(persistKey);
}

export function writeSegmentedVisualIndex(
  persistKey: string,
  visualIndex: number,
  fromRouteIndex: number,
): void {
  if (!Number.isInteger(visualIndex) || !Number.isInteger(fromRouteIndex)) {
    return;
  }
  visualIndexes.set(persistKey, { visualIndex, fromRouteIndex });
}

export function clearSegmentedVisualIndex(persistKey?: string): void {
  if (persistKey) {
    visualIndexes.delete(persistKey);
    return;
  }
  visualIndexes.clear();
}

/** Persist wins only while the stale click-time route is still showing. */
export function resolveSegmentedVisualIndex(
  persistKey: string | undefined,
  routeIndex: number,
): number {
  if (persistKey == null) return routeIndex;
  // None selected (Settings) is a settled leave. Drop every hop so a
  // later Home/period remount cannot restore abandoned ink.
  if (routeIndex < 0) {
    visualIndexes.clear();
    return routeIndex;
  }
  const pending = visualIndexes.get(persistKey);
  if (pending == null) return routeIndex;
  if (pending.visualIndex === routeIndex) {
    visualIndexes.delete(persistKey);
    return routeIndex;
  }
  if (pending.fromRouteIndex === routeIndex) {
    return pending.visualIndex;
  }
  visualIndexes.delete(persistKey);
  return routeIndex;
}

/** Click intent. Re-clicking the committed segment clears persist. */
export function commitSegmentedVisualIntent(
  persistKey: string | undefined,
  intentIndex: number,
  routeIndex: number,
): number {
  if (!Number.isInteger(intentIndex)) return routeIndex;
  if (intentIndex === routeIndex) {
    if (persistKey) visualIndexes.delete(persistKey);
    return routeIndex;
  }
  if (persistKey) {
    writeSegmentedVisualIndex(persistKey, intentIndex, routeIndex);
  }
  return intentIndex;
}

export function isUsableSegmentedThumbBox(box: SegmentedThumbBox): boolean {
  return Number.isFinite(box.left) && Number.isFinite(box.width) && box.width > 0;
}

export function measureSegmentedBox(
  track: { getBoundingClientRect(): { left: number } },
  item: { getBoundingClientRect(): { left: number; width: number } },
): SegmentedThumbBox {
  const trackRect = track.getBoundingClientRect();
  const itemRect = item.getBoundingClientRect();
  return {
    left: itemRect.left - trackRect.left,
    width: itemRect.width,
  };
}

export function segmentedThumbStyle(
  box: SegmentedThumbBox,
  opacity = 1,
): { left: number; width: number; opacity: number } {
  return { left: box.left, width: box.width, opacity };
}

export function mixSegmentedThumbBox(
  from: SegmentedThumbBox,
  to: SegmentedThumbBox,
  progress: number,
): SegmentedThumbBox {
  const t = Math.min(1, Math.max(0, progress));
  return {
    left: from.left + (to.left - from.left) * t,
    width: from.width + (to.width - from.width) * t,
  };
}

function bezier1d(t: number, a: number, b: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * a + 3 * mt * t * t * b + t * t * t;
}

function bezier1dDeriv(t: number, a: number, b: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * a + 6 * mt * t * (b - a) + 3 * t * t * (1 - b);
}

export function cubicBezierProgress(
  x: number,
  x1 = HOUSE_SEGMENTED_THUMB_EASE[0],
  y1 = HOUSE_SEGMENTED_THUMB_EASE[1],
  x2 = HOUSE_SEGMENTED_THUMB_EASE[2],
  y2 = HOUSE_SEGMENTED_THUMB_EASE[3],
): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i += 1) {
    const xEst = bezier1d(t, x1, x2);
    const deriv = bezier1dDeriv(t, x1, x2);
    if (Math.abs(deriv) < 1e-6) break;
    t = Math.min(1, Math.max(0, t - (xEst - x) / deriv));
  }
  return bezier1d(t, y1, y2);
}

export function projectSegmentedThumbFlight(
  flight: SegmentedThumbFlight,
  now: number,
): SegmentedThumbProjection {
  if (flight.durationMs <= 0) {
    return { box: flight.to, remainingMs: 0, done: true };
  }
  const elapsed = now - flight.startedAt;
  if (elapsed <= 0) {
    return { box: flight.from, remainingMs: flight.durationMs, done: false };
  }
  if (elapsed >= flight.durationMs) {
    return { box: flight.to, remainingMs: 0, done: true };
  }
  const progress = cubicBezierProgress(elapsed / flight.durationMs);
  return {
    box: mixSegmentedThumbBox(flight.from, flight.to, progress),
    remainingMs: flight.durationMs - elapsed,
    done: false,
  };
}

export function startSegmentedThumbFlight(
  persistKey: string,
  from: SegmentedThumbBox,
  to: SegmentedThumbBox,
  startedAt: number,
  durationMs = HOUSE_SEGMENTED_THUMB_DURATION_MS,
): SegmentedThumbFlight {
  const flight = { from, to, startedAt, durationMs };
  writeSegmentedThumbFlight(persistKey, flight);
  return flight;
}

export function segmentedThumbNeedsRestore(
  cached: SegmentedThumbBox | undefined,
  next: SegmentedThumbBox,
  epsilon = 0.5,
): boolean {
  if (!cached || !isUsableSegmentedThumbBox(cached) || !isUsableSegmentedThumbBox(next)) {
    return false;
  }
  return (
    Math.abs(cached.left - next.left) > epsilon ||
    Math.abs(cached.width - next.width) > epsilon
  );
}

export function scheduleSegmentedThumbRestore(
  apply: (box: SegmentedThumbBox) => void,
  next: SegmentedThumbBox,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  caf: (id: number) => void = cancelAnimationFrame,
): () => void {
  let inner = 0;
  const outer = raf(() => {
    inner = raf(() => {
      apply(next);
    });
  });
  return () => {
    caf(outer);
    if (inner) caf(inner);
  };
}

export function segmentedItemIndexFromEventTarget(
  track: Element,
  target: EventTarget | null,
): number {
  if (!target || typeof Element === "undefined" || !(target instanceof Element)) {
    return -1;
  }
  const item = target.closest("[data-segmented-item]");
  if (!item || !track.contains(item)) return -1;
  if (segmentedItemHoldsVisualIntent(item)) return -1;
  const items = track.querySelectorAll("[data-segmented-item]");
  return Array.prototype.indexOf.call(items, item);
}

export type SegmentedTrackSelection = {
  selectedIndex: number;
};

export const SEGMENTED_ITEM_SELECTED_ATTR = "data-segmented-selected";
export const SEGMENTED_ITEM_HOLD_ATTR = "data-segmented-hold";

export function segmentedItemHoldsVisualIntent(
  item: { hasAttribute(name: string): boolean } | null | undefined,
): boolean {
  return item?.hasAttribute(SEGMENTED_ITEM_HOLD_ATTR) === true;
}

export function segmentedTrackSelection(
  visualIndex: number,
): SegmentedTrackSelection {
  return { selectedIndex: visualIndex };
}

export function segmentedItemOn(
  index: number,
  selectedIndex: number,
): boolean {
  return index === selectedIndex;
}

export function segmentedItemSelectedProps(
  index: number,
  selectedIndex: number,
): { "data-segmented-selected"?: "" } {
  return segmentedItemOn(index, selectedIndex)
    ? { "data-segmented-selected": "" }
    : {};
}
