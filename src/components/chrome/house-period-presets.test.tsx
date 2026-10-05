import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { HousePeriodPresets } from "./house-period-presets";
import {
  HOUSE_PERIOD_PRESETS_PHONE_CLASS,
} from "@/lib/house-period-presets";
import {
  HOUSE_SEGMENTED_ITEM_BASE_CLASS,
  HOUSE_SEGMENTED_ITEM_OFF_CLASS,
  HOUSE_SEGMENTED_ITEM_ON_CLASS,
} from "@/lib/house-shell";
import { REPORTS_PAGE, REPORTS_PERIOD_PRESETS } from "@/lib/reports";
import {
  SEGMENTED_ITEM_SELECTED_ATTR,
  SEGMENTED_TRACK_PERSIST,
  clearSegmentedThumbCache,
  resolveSegmentedVisualIndex,
  writeSegmentedVisualIndex,
} from "@/lib/segmented-track";

const ITEMS = REPORTS_PERIOD_PRESETS.map((preset) => ({
  key: preset.grain,
  label: preset.label,
  href: preset.grain === "all" ? "/home" : `/home?period=${preset.grain}`,
}));

describe("HousePeriodPresets", () => {
  afterEach(() => {
    clearSegmentedThumbCache();
  });

  it("renders a segmented track on desktop plus a phone HousePageSelect", () => {
    const html = renderToStaticMarkup(
      createElement(HousePeriodPresets, {
        value: "all",
        items: ITEMS,
        ariaLabel: "Period",
        defaultOpen: true,
        chipDataAttr: "data-overview-revenue-period-chip",
      }),
    );

    expect(html).toContain("data-house-period-presets");
    expect(html).toContain("data-house-period-presets-chips");
    expect(html).toContain("data-house-period-presets-phone");
    expect(html).toContain("data-house-page-select");
    expect(html).toContain("data-house-page-select-trigger");
    expect(html).toContain("data-house-page-select-sheet");
    expect(html).toContain("rounded-full");
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain(HOUSE_PERIOD_PRESETS_PHONE_CLASS);
    expect(html).toContain(HOUSE_SEGMENTED_ITEM_BASE_CLASS);
    expect(html).toContain("data-segmented-thumb");
    expect(html).toContain("data-segmented-item");
    expect(html).toContain('data-segmented-persist="house-period-presets"');
    expect(html).toContain(REPORTS_PAGE.allTime);
    expect(html).toContain(REPORTS_PAGE.ytd);
    expect(html).toContain(REPORTS_PAGE.year);
    expect(html).toContain(REPORTS_PAGE.quarter);
    expect(html).toContain(REPORTS_PAGE.month);
    expect(html).toContain('data-overview-revenue-period-chip="month"');
    expect(html).not.toContain("flex-wrap");
    expect(html).not.toContain("<select");
  });

  it("keeps YTD ON ink across remount while the route is still All time", () => {
    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1, 0);
    const html = renderToStaticMarkup(
      createElement(HousePeriodPresets, {
        value: "all",
        items: ITEMS,
        ariaLabel: "Period",
        chipDataAttr: "data-overview-revenue-period-chip",
      }),
    );
    const ytd = html.match(
      /<a[^>]*data-overview-revenue-period-chip="ytd"[^>]*>/,
    );
    const all = html.match(
      /<a[^>]*data-overview-revenue-period-chip="all"[^>]*>/,
    );
    expect(ytd?.[0]).toContain(HOUSE_SEGMENTED_ITEM_ON_CLASS);
    expect(ytd?.[0]).toContain('aria-pressed="true"');
    expect(ytd?.[0]).toContain(SEGMENTED_ITEM_SELECTED_ATTR);
    expect(all?.[0]).toContain(HOUSE_SEGMENTED_ITEM_OFF_CLASS);
    expect(all?.[0]).toContain('aria-pressed="false"');
    expect(SEGMENTED_TRACK_PERSIST.period).toBe("house-period-presets");
  });

  it("yields to All time after a later committed route abandons the YTD hop", () => {
    writeSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 1, 0);
    expect(resolveSegmentedVisualIndex(SEGMENTED_TRACK_PERSIST.period, 4)).toBe(4);
    const html = renderToStaticMarkup(
      createElement(HousePeriodPresets, {
        value: "all",
        items: ITEMS,
        ariaLabel: "Period",
        chipDataAttr: "data-overview-revenue-period-chip",
      }),
    );
    const all = html.match(
      /<a[^>]*data-overview-revenue-period-chip="all"[^>]*>/,
    );
    const ytd = html.match(
      /<a[^>]*data-overview-revenue-period-chip="ytd"[^>]*>/,
    );
    expect(all?.[0]).toContain(HOUSE_SEGMENTED_ITEM_ON_CLASS);
    expect(ytd?.[0]).toContain(HOUSE_SEGMENTED_ITEM_OFF_CLASS);
  });
});
