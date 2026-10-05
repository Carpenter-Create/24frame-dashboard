import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NewsSourceChips } from "./news-sources-filter";
import {
  DASHBOARD_NEWS_SOURCE_CHIP_OFF_CLASS,
  DASHBOARD_NEWS_SOURCE_CHIP_ON_CLASS,
  DASHBOARD_NEWS_SOURCE_CHIPS_CLASS,
  DASHBOARD_NEWS_SOURCE_TRACK_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_ON_CLASS,
  DASHBOARD_TOP_PILL_CLUSTER_CLASS,
} from "@/lib/dashboard-craft";
import {
  HOUSE_SEGMENTED_TRACK_CLASS,
  HOUSE_SEGMENTED_TRACK_SCROLL_CLASS,
} from "@/lib/house-shell";
import { NEWS_PAGE, NEWS_SOURCE_FILTER_SOURCES } from "@/lib/news";
import { SEGMENTED_ITEM_SELECTED_ATTR, SEGMENTED_TRACK_PERSIST } from "@/lib/segmented-track";

const src = readFileSync("src/components/news/news-sources-filter.tsx", "utf8");

describe("NewsSourceChips", () => {
  it("mounts house SegmentedTrack with visualIndex ink and no multi-select", () => {
    const html = renderToStaticMarkup(
      createElement(NewsSourceChips, { selected: [], onSelect: () => undefined }),
    );
    expect(html).toContain("data-news-source-chips");
    expect(html).toContain("data-news-source-track");
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_CHIPS_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_TRACK_CLASS);
    expect(html).toContain(DASHBOARD_TOP_PILL_CLUSTER_CLASS);
    expect(html).toContain(DASHBOARD_TOP_PILL_BUTTON_CLASS);
    expect(html).toContain(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS);
    expect(html).toContain(DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS);
    expect(html).toContain('data-segmented-persist="news-source"');
    expect(html).toContain(SEGMENTED_ITEM_SELECTED_ATTR);
    expect(html).toContain(NEWS_PAGE.sourcesAll);
    expect(html).not.toContain("type=\"checkbox\"");
    expect(html).not.toContain("gap-[var(--space-2)]");
    expect(SEGMENTED_TRACK_PERSIST.newsSource).toBe("news-source");
    expect(DASHBOARD_NEWS_SOURCE_CHIP_ON_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS);
    expect(DASHBOARD_NEWS_SOURCE_CHIP_OFF_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS);
    expect(src).toContain("({ selectedIndex })");
    expect(src).toContain("segmentedItemOn");
    expect(src).toContain("persistKey={SEGMENTED_TRACK_PERSIST.newsSource}");
    expect(src).toContain("selectNewsSourceFilter");
    expect(src).not.toContain("toggleNewsSourceFilter");
    expect(readFileSync("src/lib/news.ts", "utf8")).not.toContain("toggleNewsSourceFilter");
    expect(readFileSync("src/lib/news.ts", "utf8")).not.toContain(".join(\",\")");
    expect(src).not.toContain("pendingIndex");
    expect(src).not.toContain("pendingFamily");
  });

  it("lists All first, then outlets A-Z, with exclusive hrefs", () => {
    const html = renderToStaticMarkup(
      createElement(NewsSourceChips, { selected: ["variety"], onSelect: () => undefined }),
    );
    expect(html.indexOf('data-news-source-option="all"')).toBeLessThan(
      html.indexOf('data-news-source-option="deadline"'),
    );
    const ids = NEWS_SOURCE_FILTER_SOURCES.map((source) => source.id);
    for (let i = 0; i < ids.length - 1; i += 1) {
      const current = ids[i];
      const next = ids[i + 1];
      expect(current).toBeTruthy();
      expect(next).toBeTruthy();
      expect(html.indexOf(`data-news-source-option="${current}"`)).toBeLessThan(
        html.indexOf(`data-news-source-option="${next}"`),
      );
    }
    expect(html).toContain('href="/home/news"');
    expect(html).toContain('href="/home/news?source=variety"');
    expect(html).toContain('href="/home/news?source=deadline"');
    expect(html).not.toMatch(/href="\/home\/news\?source=[^"]*,/);
    expect(html).toMatch(
      /data-news-source-option="variety"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-news-source-option="variety"/,
    );
    expect(html).not.toMatch(
      /data-news-source-option="all"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-news-source-option="all"/,
    );
  });

  it("scroll host wraps a content-width house track so chips stay inside the muted pill", () => {
    const html = renderToStaticMarkup(
      createElement(NewsSourceChips, { selected: [], onSelect: () => undefined }),
    );
    expect(DASHBOARD_NEWS_SOURCE_TRACK_CLASS).toBe(HOUSE_SEGMENTED_TRACK_SCROLL_CLASS);
    expect(HOUSE_SEGMENTED_TRACK_SCROLL_CLASS).toContain(HOUSE_SEGMENTED_TRACK_CLASS);
    expect(HOUSE_SEGMENTED_TRACK_SCROLL_CLASS).toContain("w-max");
    expect(HOUSE_SEGMENTED_TRACK_SCROLL_CLASS).toContain("min-w-full");
    expect(DASHBOARD_NEWS_SOURCE_CHIPS_CLASS).toContain("overflow-x-auto");
    expect(DASHBOARD_NEWS_SOURCE_CHIPS_CLASS).not.toContain("w-max");
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_CHIPS_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_TRACK_CLASS);
    expect(html.indexOf("data-news-source-chips")).toBeLessThan(
      html.indexOf("data-news-source-track"),
    );
    expect(src).toContain("className={DASHBOARD_NEWS_SOURCE_CHIPS_CLASS}");
    expect(src).toContain("trackClass={DASHBOARD_NEWS_SOURCE_TRACK_CLASS}");
    const optionCount = NEWS_SOURCE_FILTER_SOURCES.length + 1;
    expect(optionCount).toBeGreaterThan(8);
    expect(html.split("data-news-source-option=").length - 1).toBe(optionCount);
  });
});
