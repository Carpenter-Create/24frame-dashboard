import { afterEach, describe, expect, it } from "vitest";

import { HOUSE_SEGMENTED_THUMB_DURATION_MS } from "./house-shell";
import {
  clearSegmentedThumbCache,
  cubicBezierProgress,
  isUsableSegmentedThumbBox,
  measureSegmentedBox,
  mixSegmentedThumbBox,
  projectSegmentedThumbFlight,
  readSegmentedRailScroll,
  readSegmentedThumbCache,
  scheduleSegmentedThumbRestore,
  SEGMENTED_ITEM_SELECTED_ATTR,
  SEGMENTED_TRACK_PERSIST,
  commitSegmentedVisualIntent,
  readSegmentedVisualIndex,
  readSegmentedVisualPersist,
  resolveSegmentedVisualIndex,
  SEGMENTED_ITEM_HOLD_ATTR,
  segmentedItemHoldsVisualIntent,
  segmentedItemOn,
  segmentedItemSelectedProps,
  segmentedThumbNeedsRestore,
  segmentedThumbStyle,
  segmentedTrackSelection,
  startSegmentedThumbFlight,
  writeSegmentedThumbCache,
  writeSegmentedVisualIndex,
  writeSegmentedRailScroll,
} from "./segmented-track";
import { overviewLeadActiveIndex, overviewLeadPills } from "./overview";

afterEach(() => {
  clearSegmentedThumbCache();
});

describe("segmented track persist cache", () => {
  it("stores a usable box and ignores empty width", () => {
    writeSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace, {
      left: 24,
      width: 88,
    });
    expect(readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace)).toEqual({
      left: 24,
      width: 88,
    });

    writeSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.period, { left: 0, width: 0 });
    expect(readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.period)).toBeUndefined();
    expect(isUsableSegmentedThumbBox({ left: 0, width: 0 })).toBe(false);
    expect(isUsableSegmentedThumbBox({ left: 0, width: 12 })).toBe(true);
  });

  it("keeps workspace and period caches from overwriting each other", () => {
    writeSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace, {
      left: 10,
      width: 40,
    });
    writeSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.period, {
      left: 80,
      width: 32,
    });
    expect(readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace)?.left).toBe(10);
    expect(readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.period)?.left).toBe(80);
    clearSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace);
    expect(readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace)).toBeUndefined();
    expect(readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.period)?.width).toBe(32);
  });
});

describe("segmented thumb geometry", () => {
  it("measures left relative to the track, not the viewport", () => {
    const box = measureSegmentedBox(
      { getBoundingClientRect: () => ({ left: 200 }) },
      { getBoundingClientRect: () => ({ left: 280, width: 64 }) },
    );
    expect(box).toEqual({ left: 80, width: 64 });
    expect(segmentedThumbStyle(box)).toEqual({ left: 80, width: 64, opacity: 1 });

    const scrolled = measureSegmentedBox(
      { getBoundingClientRect: () => ({ left: -240 }) },
      { getBoundingClientRect: () => ({ left: 80, width: 96 }) },
    );
    expect(scrolled).toEqual({ left: 320, width: 96 });
  });

  it("restores only when the cached box is a different painted position", () => {
    const next = { left: 120, width: 72 };
    expect(segmentedThumbNeedsRestore(undefined, next)).toBe(false);
    expect(segmentedThumbNeedsRestore({ left: 120, width: 72 }, next)).toBe(false);
    expect(segmentedThumbNeedsRestore({ left: 120.2, width: 72 }, next)).toBe(false);
    expect(segmentedThumbNeedsRestore({ left: 24, width: 72 }, next)).toBe(true);
    expect(segmentedThumbNeedsRestore({ left: 120, width: 40 }, next)).toBe(true);
    expect(segmentedThumbNeedsRestore({ left: 24, width: 0 }, next)).toBe(false);
  });

  it("paints the cached box first, then applies the destination on the second frame", () => {
    const frames: FrameRequestCallback[] = [];
    const raf = (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    };
    const cancelled: number[] = [];
    const applied: Array<{ left: number; width: number }> = [];
    const cancel = scheduleSegmentedThumbRestore(
      (box) => applied.push(box),
      { left: 160, width: 80 },
      raf,
      (id) => {
        cancelled.push(id);
      },
    );

    expect(applied).toEqual([]);
    frames[0]?.(0);
    expect(applied).toEqual([]);
    frames[1]?.(0);
    expect(applied).toEqual([{ left: 160, width: 80 }]);

    cancel();
    expect(cancelled).toContain(1);
  });

  it("interpolates left and width together and keeps remaining time on remount", () => {
    const from = { left: 0, width: 48 };
    const to = { left: 120, width: 96 };
    expect(mixSegmentedThumbBox(from, to, 0.5)).toEqual({ left: 60, width: 72 });

    const mid = projectSegmentedThumbFlight(
      {
        from,
        to,
        startedAt: 1_000,
        durationMs: HOUSE_SEGMENTED_THUMB_DURATION_MS,
      },
      1_000 + HOUSE_SEGMENTED_THUMB_DURATION_MS / 2,
    );
    expect(mid.done).toBe(false);
    expect(mid.remainingMs).toBe(HOUSE_SEGMENTED_THUMB_DURATION_MS / 2);
    expect(mid.box.left).toBeGreaterThan(60);
    expect(mid.box.left).toBeLessThan(120);
    expect(mid.box.width).toBeGreaterThan(72);
    expect(mid.box.width).toBeLessThan(96);
    expect(cubicBezierProgress(0.5)).toBeGreaterThan(0.5);

    const done = projectSegmentedThumbFlight(
      {
        from,
        to,
        startedAt: 1_000,
        durationMs: HOUSE_SEGMENTED_THUMB_DURATION_MS,
      },
      1_000 + HOUSE_SEGMENTED_THUMB_DURATION_MS,
    );
    expect(done).toEqual({ box: to, remainingMs: 0, done: true });

    startSegmentedThumbFlight(SEGMENTED_TRACK_PERSIST.workspace, from, to, 5_000);
    const painted = readSegmentedThumbCache(SEGMENTED_TRACK_PERSIST.workspace, 5_080);
    expect(painted?.left).toBeGreaterThan(from.left);
    expect(painted?.left).toBeLessThan(to.left);
  });
});

describe("segmented track optimistic selection", () => {
  it("treats visualIndex as selected ink before the route family updates", () => {
    const routeIndex = 0;
    const visualIndex = 4;
    expect(segmentedTrackSelection(visualIndex)).toEqual({ selectedIndex: 4 });
    expect(segmentedItemOn(routeIndex, visualIndex)).toBe(false);
    expect(segmentedItemOn(visualIndex, visualIndex)).toBe(true);
    expect(segmentedItemSelectedProps(visualIndex, visualIndex)).toEqual({
      "data-segmented-selected": "",
    });
    expect(segmentedItemSelectedProps(routeIndex, visualIndex)).toEqual({});
    expect(SEGMENTED_ITEM_SELECTED_ATTR).toBe("data-segmented-selected");
    expect(SEGMENTED_TRACK_PERSIST.activityFamily).toBe("activity-family");
    expect(SEGMENTED_TRACK_PERSIST.period).toBe("house-period-presets");
    expect(SEGMENTED_TRACK_PERSIST.phoneDest).toBe("phone-dest");
    expect(SEGMENTED_TRACK_PERSIST.newsSource).toBe("news-source");
    expect(SEGMENTED_TRACK_PERSIST.socialActivity).toBe("social-activity");
    expect("socialCreateKind" in SEGMENTED_TRACK_PERSIST).toBe(false);
    expect(SEGMENTED_ITEM_HOLD_ATTR).toBe("data-segmented-hold");
  });

  it("does not treat a hold item click as a pending route", () => {
    expect(
      segmentedItemHoldsVisualIntent({
        hasAttribute: (name) => name === SEGMENTED_ITEM_HOLD_ATTR,
      }),
    ).toBe(true);
    expect(
      segmentedItemHoldsVisualIntent({
        hasAttribute: () => false,
      }),
    ).toBe(false);
    expect(segmentedItemHoldsVisualIntent(null)).toBe(false);
  });

  it("keeps pending visual index across remount until the route catches up", () => {
    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1, 0);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period)).toBe(1);
    expect(readSegmentedVisualPersist(SEGMENTED_TRACK_PERSIST.period)).toEqual({
      visualIndex: 1,
      fromRouteIndex: 0,
    });
    expect(resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 0)).toBe(1);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period)).toBe(1);
    expect(resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1)).toBe(1);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period)).toBeUndefined();
    expect(resolveSegmentedVisualIndex(undefined, 2)).toBe(2);
  });

  it("lets a new committed route win after settle, including Settings and leave", () => {
    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1, 0);
    expect(resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 4)).toBe(4);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period)).toBeUndefined();

    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1, 0);
    const settingsIndex = overviewLeadActiveIndex(
      "/settings/preferences",
      "aggregation",
      overviewLeadPills(),
    );
    expect(settingsIndex).toBe(-1);
    expect(
      resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace, settingsIndex),
    ).toBe(-1);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace)).toBeUndefined();
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period)).toBeUndefined();
    expect(resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 0)).toBe(0);

    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace, 2, 1);
    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1, 0);
    expect(
      resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace, settingsIndex),
    ).toBe(-1);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace)).toBeUndefined();
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period)).toBeUndefined();
  });

  it("does not persist a no-op re-click of the committed segment", () => {
    expect(
      commitSegmentedVisualIntent(SEGMENTED_TRACK_PERSIST.workspace, 1, 1),
    ).toBe(1);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace)).toBeUndefined();

    expect(
      commitSegmentedVisualIntent(SEGMENTED_TRACK_PERSIST.workspace, 2, 1),
    ).toBe(2);
    expect(readSegmentedVisualPersist(SEGMENTED_TRACK_PERSIST.workspace)).toEqual({
      visualIndex: 2,
      fromRouteIndex: 1,
    });
    expect(
      commitSegmentedVisualIntent(SEGMENTED_TRACK_PERSIST.workspace, 1, 1),
    ).toBe(1);
    expect(readSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.workspace)).toBeUndefined();
  });
});

describe("sideways rail memory (band lock v1.4)", () => {
  it("remembers where a rail was slid, per key, and ignores junk", () => {
    expect(readSegmentedRailScroll("rail-test-a")).toBeUndefined();
    writeSegmentedRailScroll("rail-test-a", 132);
    writeSegmentedRailScroll("rail-test-b", 8);
    expect(readSegmentedRailScroll("rail-test-a")).toBe(132);
    expect(readSegmentedRailScroll("rail-test-b")).toBe(8);
    writeSegmentedRailScroll("rail-test-a", Number.NaN);
    writeSegmentedRailScroll("rail-test-a", -4);
    expect(readSegmentedRailScroll("rail-test-a")).toBe(132);
  });
});
