"use client";

import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";

import {
  HOUSE_SEGMENTED_THUMB_CLASS,
  HOUSE_SEGMENTED_THUMB_DURATION_MS,
  HOUSE_SEGMENTED_TRACK_CLASS,
  houseSegmentedThumbHidden,
} from "@/lib/house-shell";
import {
  commitSegmentedVisualIntent,
  measureSegmentedBox,
  projectSegmentedThumbFlight,
  readSegmentedRailScroll,
  readSegmentedThumbFlight,
  resolveSegmentedVisualIndex,
  scheduleSegmentedThumbRestore,
  segmentedItemIndexFromEventTarget,
  segmentedItemOn,
  segmentedThumbNeedsRestore,
  segmentedThumbStyle,
  segmentedTrackSelection,
  startSegmentedThumbFlight,
  writeSegmentedRailScroll,
  type SegmentedThumbBox,
  type SegmentedTrackSelection,
} from "@/lib/segmented-track";

export type { SegmentedTrackSelection };

export interface SegmentedTrackProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children"> {
  activeIndex: number;
  persistKey?: string;
  trackClass?: string;
  thumbClass?: string;
  /** Thumb slide duration for the remount flight. Match the thumb
   *  class's CSS duration. Defaults to the house 320ms. */
  durationMs?: number;
  /** Scroll the lit item into view when it changes (a sideways rail).
   *  Off for a track that can sit off screen, such as the phone dock
   *  while it hides: scrolling to it would move the page. */
  revealActive?: boolean;
  /** The track's parent is a sideways rail (the phone workspace band):
   *  remember where it was slid (per `persistKey`) and reopen it there on
   *  a remount, before the lit item is revealed, so the row never jumps
   *  back to its start. */
  rememberRail?: boolean;
  children: (selection: SegmentedTrackSelection) => ReactNode;
}

function isSegmentedItem(node: ReactNode): node is ReactElement<{
  "data-segmented-item"?: unknown;
  "data-segmented-selected"?: "";
}> {
  return (
    isValidElement(node) &&
    (node.props as { "data-segmented-item"?: unknown })["data-segmented-item"] !==
      undefined
  );
}

export function stampSegmentedSelected(
  children: ReactNode,
  selectedIndex: number,
): ReactNode {
  let itemIndex = 0;

  function mapNode(node: ReactNode): ReactNode {
    if (isValidElement(node) && node.type === Fragment) {
      const nested = (node.props as { children?: ReactNode }).children;
      return cloneElement(node, undefined, Children.map(nested, mapNode));
    }
    if (!isSegmentedItem(node)) return node;
    const index = itemIndex;
    itemIndex += 1;
    return cloneElement(node, {
      "data-segmented-selected": segmentedItemOn(index, selectedIndex)
        ? ""
        : undefined,
    });
  }

  return Children.map(children, mapNode);
}

function thumbCss(
  box: SegmentedThumbBox,
  snap = false,
  durationMs?: number,
): CSSProperties {
  if (snap) return { ...segmentedThumbStyle(box), transition: "none" };
  if (durationMs != null) {
    return { ...segmentedThumbStyle(box), transitionDuration: `${durationMs}ms` };
  }
  return segmentedThumbStyle(box);
}

export function SegmentedTrack({
  activeIndex,
  persistKey,
  trackClass = HOUSE_SEGMENTED_TRACK_CLASS,
  thumbClass = HOUSE_SEGMENTED_THUMB_CLASS,
  durationMs = HOUSE_SEGMENTED_THUMB_DURATION_MS,
  revealActive = true,
  rememberRail = false,
  children,
  onClickCapture,
  ...rest
}: SegmentedTrackProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const placedRef = useRef(false);
  const routeIndexRef = useRef(activeIndex);
  const lastBoxRef = useRef<SegmentedThumbBox | undefined>(undefined);
  const [visualIndex, setVisualIndex] = useState(() =>
    resolveSegmentedVisualIndex(persistKey, activeIndex),
  );

  function commitVisualIndex(index: number) {
    setVisualIndex(commitSegmentedVisualIntent(persistKey, index, activeIndex));
  }
  const [thumbStyle, setThumbStyle] = useState<CSSProperties>(() => {
    if (houseSegmentedThumbHidden(activeIndex) || !persistKey) return { opacity: 0 };
    const flight = readSegmentedThumbFlight(persistKey);
    if (!flight) return { opacity: 0 };
    const view = projectSegmentedThumbFlight(
      flight,
      typeof performance === "undefined" ? 0 : performance.now(),
    );
    return segmentedThumbStyle(view.box);
  });
  // Until the thumb is placed (the server paint; the first layout pass
  // places it before the browser paints again), the track says so and
  // the lit segment can paint the thumb's fill itself.
  const [pending, setPending] = useState(() => thumbStyle.opacity === 0);

  // Before the reveal below (layout effects run in order): put the rail
  // back where it was left, so "nearest" moves it only when the lit item
  // is off screen.
  useLayoutEffect(() => {
    const rail = trackRef.current?.parentElement;
    if (!rememberRail || !persistKey || !rail) return undefined;
    const left = readSegmentedRailScroll(persistKey);
    if (left !== undefined) rail.scrollLeft = left;
    const onScroll = () => writeSegmentedRailScroll(persistKey, rail.scrollLeft);
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [rememberRail, persistKey]);

  useLayoutEffect(() => {
    if (routeIndexRef.current === activeIndex) return;
    routeIndexRef.current = activeIndex;
    setVisualIndex(resolveSegmentedVisualIndex(persistKey, activeIndex));
  }, [activeIndex, persistKey]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;
    const items = track.querySelectorAll<HTMLElement>("[data-segmented-item]");
    const active = items[visualIndex];
    if (houseSegmentedThumbHidden(visualIndex) || !active) {
      lastBoxRef.current = undefined;
      setThumbStyle({ opacity: 0 });
      return undefined;
    }

    const next = measureSegmentedBox(track, active);
    if (revealActive) active.scrollIntoView({ block: "nearest", inline: "nearest" });
    const now = typeof performance === "undefined" ? 0 : performance.now();
    const apply = (box: SegmentedThumbBox, snap = false, durationMs?: number) => {
      lastBoxRef.current = box;
      setThumbStyle(thumbCss(box, snap, durationMs));
      setPending(false);
    };

    let cancelRestore: (() => void) | undefined;
    if (!placedRef.current) {
      placedRef.current = true;
      const flight = persistKey ? readSegmentedThumbFlight(persistKey) : undefined;
      const view = flight ? projectSegmentedThumbFlight(flight, now) : undefined;
      if (view && !view.done && segmentedThumbNeedsRestore(view.box, next)) {
        apply(view.box, true);
        cancelRestore = scheduleSegmentedThumbRestore(
          (box) => apply(box, false, view.remainingMs),
          next,
        );
      } else {
        apply(next, true);
      }
    } else {
      const flight = persistKey ? readSegmentedThumbFlight(persistKey) : undefined;
      const view = flight ? projectSegmentedThumbFlight(flight, now) : undefined;
      const from = view && !view.done ? view.box : lastBoxRef.current;
      if (persistKey && from && segmentedThumbNeedsRestore(from, next)) {
        startSegmentedThumbFlight(
          persistKey,
          from,
          next,
          now,
          durationMs,
        );
      }
      apply(next);
    }

    return () => {
      cancelRestore?.();
    };
  }, [visualIndex, persistKey, durationMs, revealActive]);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return undefined;

    const syncThumbBox = () => {
      if (!placedRef.current) return;
      const items = track.querySelectorAll<HTMLElement>("[data-segmented-item]");
      const active = items[visualIndex];
      if (houseSegmentedThumbHidden(visualIndex) || !active) return;
      const next = measureSegmentedBox(track, active);
      if (!segmentedThumbNeedsRestore(lastBoxRef.current, next)) return;
      lastBoxRef.current = next;
      setThumbStyle(thumbCss(next, true));
    };

    const observer = new ResizeObserver(syncThumbBox);
    observer.observe(track);
    return () => observer.disconnect();
  }, [visualIndex]);

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const track = trackRef.current;
    if (track) {
      const index = segmentedItemIndexFromEventTarget(track, event.target);
      if (index >= 0) commitVisualIndex(index);
    }
    onClickCapture?.(event);
  }

  const selection = segmentedTrackSelection(visualIndex);

  return (
    <div
      {...rest}
      ref={trackRef}
      className={trackClass}
      data-segmented-persist={persistKey}
      data-segmented-pending={pending ? "" : undefined}
      onClickCapture={handleClickCapture}
    >
      <div
        data-segmented-thumb=""
        className={thumbClass}
        style={thumbStyle}
        aria-hidden="true"
      />
      {stampSegmentedSelected(children(selection), selection.selectedIndex)}
    </div>
  );
}

export { HOUSE_SEGMENTED_TRACK_CLASS, HOUSE_SEGMENTED_THUMB_CLASS };
