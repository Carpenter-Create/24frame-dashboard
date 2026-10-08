import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS,
  HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS,
  HOUSE_SEGMENTED_ITEM_BASE_CLASS,
} from "@/lib/house-shell";
import { SEGMENTED_ITEM_SELECTED_ATTR } from "@/lib/segmented-track";
import { SegmentedTrack, stampSegmentedSelected, type SegmentedTrackProps } from "./segmented-track";

const src = readFileSync("src/components/ui/segmented-track.tsx", "utf8");
const lib = readFileSync("src/lib/segmented-track.ts", "utf8");

// The workspace switcher left this list with the screening chrome (Adam
// 2026-10-04, "Yes, everywhere"): plain text lanes, no track or thumb.
const CONSUMERS = [
  "src/components/chrome/house-period-presets.tsx",
  "src/components/activity/activity-family-chips.tsx",
  "src/components/reports/reports-ranked.tsx",
  "src/components/reports/reports-controls.tsx",
  "src/components/news/news-sources-filter.tsx",
] as const;

const CHOICE_MENUS = CONSUMERS;

describe("SegmentedTrack server paint (H register pill slider)", () => {
  // The thumb is measured on the client; until then the track is marked
  // pending and the lit segment paints the thumb's ink itself, so a
  // page-colour label ("Social", "Following") never reads white on grey.
  it("marks the track pending before the thumb is placed, and the lit pill segment carries the ink", () => {
    // The track's children is a render function, so it rides in the props.
    const props: SegmentedTrackProps = {
      activeIndex: 1,
      persistKey: "test-scope",
      children: () => [
        createElement("a", { key: "a", href: "#a", "data-segmented-item": "", className: HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS }, "Following"),
        createElement("a", { key: "b", href: "#b", "data-segmented-item": "", className: HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS }, "For you"),
      ],
    };
    const html = renderToStaticMarkup(createElement(SegmentedTrack, props));
    expect(html).toMatch(/^<div[^>]*data-segmented-pending=""/);
    expect(html).toContain('style="opacity:0"');
    expect(html).toMatch(/<a href="#b" data-segmented-item=""[^>]*data-segmented-selected=""/);
    expect(HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS).toBe("in-data-segmented-pending:data-segmented-selected:bg-ink");
    expect(HOUSE_PILL_SLIDER_SEGMENT_BASE_CLASS).toContain(HOUSE_PILL_SLIDER_SEGMENT_PENDING_CLASS);
    // The first placement clears it.
    expect(src).toContain("setPending(false)");
    expect(src).toContain('data-segmented-pending={pending ? "" : undefined}');
  });
});

describe("SegmentedTrack slide SoT", () => {
  it("slides left/width, restores a cached box across remount, and commits the click before the route", () => {
    expect(src).toContain("persistKey");
    expect(src).toContain("readSegmentedThumbFlight");
    expect(src).toContain("startSegmentedThumbFlight");
    expect(src).toContain("projectSegmentedThumbFlight");
    expect(src).toContain("scheduleSegmentedThumbRestore");
    expect(src).toContain("remainingMs");
    expect(src).toContain("onClickCapture");
    expect(src).toContain("setVisualIndex");
    expect(src).toContain("ResizeObserver");
    expect(src).toContain("scrollIntoView");
    expect(src).toContain("data-segmented-persist");
    expect(src).toContain("transition: \"none\"");
    expect(src).toContain("houseSegmentedThumbHidden");
    expect(src).toContain("setThumbStyle({ opacity: 0 })");
    expect(src).not.toContain("transition-opacity");
    expect(lib).toContain("SEGMENTED_TRACK_PERSIST");
    expect(lib).toContain("workspace-pills");
    expect(lib).toContain("requestAnimationFrame");
  });

  it("owns optimistic selected ink from visualIndex — hosts do not fork pending", () => {
    expect(src).toContain("segmentedTrackSelection(visualIndex)");
    expect(src).toContain("stampSegmentedSelected");
    expect(src).toContain("children(selection)");
    expect(src).toContain("commitVisualIndex(index)");
    expect(src).toContain("commitSegmentedVisualIntent");
    expect(src).toContain("resolveSegmentedVisualIndex");
    expect(src).not.toContain("writeSegmentedVisualIndex(persistKey, index)");
    expect(lib).toContain("visualIndex is the SoT");
    expect(lib).toContain("resolveSegmentedVisualIndex");
    expect(lib).toContain("commitSegmentedVisualIntent");
    expect(lib).toContain("segmentedItemHoldsVisualIntent");
    expect(lib).toContain("fromRouteIndex");
    expect(lib).not.toContain("pendingIndex ?? routeIndex");
    expect(HOUSE_SEGMENTED_ITEM_BASE_CLASS).not.toContain("duration-[320ms]");

    for (const path of CONSUMERS) {
      const body = readFileSync(path, "utf8");
      expect(body, path).toMatch(
        /persistKey=\{(?:SEGMENTED_TRACK_PERSIST\.|housePhoneDestPersistKey\()/,
      );
      expect(body, path).toContain("({ selectedIndex })");
      expect(body, path).toContain("segmentedItemOn");
      expect(body, path).not.toContain("pendingIndex");
      expect(body, path).not.toContain("pendingFamily");
      expect(body, path).not.toContain("setPending");
    }

    const inbox = readFileSync("src/components/activity/activity-inbox.tsx", "utf8");
    expect(inbox).toContain("ActivityFamilyChips");
    expect(inbox).not.toContain("SegmentedTrack");
    expect(inbox).not.toContain("pendingFamily");
  });

  it("keeps exclusive choice menus off gapped HOUSE_FILTER_PILL_CLUSTER", () => {
    const house = readFileSync("src/lib/house-shell.ts", "utf8");
    expect(house).toContain("Gapped HOUSE_FILTER_PILL_* is not for choice menus");
    expect(house).toContain("Exclusive choice menus are SegmentedTrack");
    expect(house).toContain("HOUSE_FILTER_PILL_CLUSTER_CLASS");

    for (const path of CHOICE_MENUS) {
      const body = readFileSync(path, "utf8");
      expect(body, path).not.toContain("HOUSE_FILTER_PILL_CLUSTER_CLASS");
      expect(body, path).toContain("SegmentedTrack");
    }

    const waffle = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
    expect(waffle).toContain("workspaceWaffleTiles");
    expect(waffle).toContain("workspaceSliderSegments");
    expect(waffle).toContain('data-workspace-waffle=""');
    // H register: the desktop workspace switcher is the primary pill
    // slider — this SegmentedTrack, with an ink thumb (one component per
    // pattern; supersedes the screening chrome's plain lanes).
    expect(waffle).toContain("<SegmentedTrack");
    expect(waffle).toContain("thumbClass={WORKSPACE_SWITCHER_SLIDER_THUMB_CLASS}");
    expect(waffle).toContain('role="tablist"');
    expect(waffle).toContain("data-workspace-switcher-slider");
    expect(waffle).not.toContain("data-workspace-switcher-lanes");
    expect(waffle).not.toContain("HOUSE_FILTER_PILL_CLUSTER_CLASS");
  });

  it("stamps data-segmented-selected on the visual item before the route commits", () => {
    const html = renderToStaticMarkup(
      createElement(
        "div",
        null,
        stampSegmentedSelected(
          [
            createElement("a", { key: "all", "data-segmented-item": "" }, "All"),
            createElement(
              "a",
              { key: "education", "data-segmented-item": "" },
              "Education",
            ),
          ],
          1,
        ),
      ),
    );
    expect(html).toContain("data-segmented-item");
    expect(html).toContain(SEGMENTED_ITEM_SELECTED_ATTR);
    expect(html.indexOf('data-segmented-item=""')).toBeLessThan(
      html.indexOf(SEGMENTED_ITEM_SELECTED_ATTR),
    );
    expect(html.indexOf(">All<")).toBeLessThan(html.indexOf(SEGMENTED_ITEM_SELECTED_ATTR));
    expect(html.indexOf(SEGMENTED_ITEM_SELECTED_ATTR)).toBeLessThan(
      html.indexOf(">Education<"),
    );
  });
});
