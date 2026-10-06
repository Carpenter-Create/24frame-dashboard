import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PageHeader } from "@/components/ui/page-header";
import { NewsHistory } from "./news-history";
import { NewsRail } from "./news-rail";
import {
  DASHBOARD_NEWS_HISTORY_COLUMN_CLASS,
  DASHBOARD_NEWS_HISTORY_LAYOUT_CLASS,
  DASHBOARD_NEWS_HISTORY_LIST_CLASS,
  DASHBOARD_NEWS_HISTORY_THUMB_CLASS,
  DASHBOARD_NEWS_THUMB_CLASS,
  DASHBOARD_NEWS_SOURCE_CHIP_CLASS,
  DASHBOARD_NEWS_SOURCE_CHIP_OFF_CLASS,
  DASHBOARD_NEWS_SOURCE_CHIP_ON_CLASS,
  DASHBOARD_NEWS_SOURCE_CHIPS_CLASS,
  DASHBOARD_NEWS_SOURCE_TRACK_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_ON_CLASS,
  DASHBOARD_TOP_PILL_CLUSTER_CLASS,
} from "@/lib/dashboard-craft";
import { HOUSE_SEGMENTED_ITEM_ON_CLASS } from "@/lib/house-shell";
import { NEWS_PAGE, NEWS_SOURCE_FILTER_SOURCES, NEWS_SOURCES, type NewsItem } from "@/lib/news";
import { SEGMENTED_TRACK_PERSIST } from "@/lib/segmented-track";
import {
  NEWS_STICKY_PAGE_SURFACE_CLASS,
  NEWS_STICKY_PIN_CLASS,
} from "@/lib/news-sticky";

const NOW = new Date("2026-09-18T18:00:00.000Z");

const VARIETY: NewsItem = {
  id: "n1",
  title: "Harbor Cut lands a festival slot",
  url: "https://variety.com/harbor-cut",
  source: "variety",
  published_at: "2026-09-17T12:00:00.000Z",
  image_url: "https://variety.com/thumbs/harbor.jpg",
};

const DEADLINE: NewsItem = {
  ...VARIETY,
  id: "n2",
  title: "North Wind books a limited run",
  url: "https://deadline.com/north-wind",
  source: "deadline",
  image_url: null,
};

function markupClass(value: string): string {
  return value.replaceAll("&", "&amp;");
}

describe("NewsHistory layout", () => {
  it("uses house SegmentedTrack under the title and a dense list — no Sources rail", () => {
    const html = renderToStaticMarkup(
      createElement(NewsHistory, {
        items: [VARIETY, DEADLINE],
        now: NOW,
        selected: [],
      }),
    );
    expect(html).toContain("data-news-history-layout");
    expect(html).toContain(DASHBOARD_NEWS_HISTORY_LAYOUT_CLASS);
    expect(html).not.toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
    expect(html).toContain("data-news-history-main");
    expect(html).toContain(DASHBOARD_NEWS_HISTORY_LIST_CLASS);
    expect(html).not.toContain("lg:grid-cols-2");
    expect(html).toContain('data-news-card-density="history"');
    expect(html).toContain("flex-col");
    expect(html).toContain("md:flex-row");
    expect(html).toContain("md:items-stretch");
    expect(html).toContain("w-full");
    expect(html).not.toContain("w-40");
    expect(html).toContain("md:w-80");
    expect(html).toContain(markupClass(DASHBOARD_NEWS_THUMB_CLASS));
    expect(html).toContain(markupClass(DASHBOARD_NEWS_HISTORY_THUMB_CLASS));
    expect(html).toContain("data-news-outbound");
    expect(html).toContain("data-house-action-arrow");
    expect(html).toContain("text-accent");
    expect(html).not.toMatch(/\b(Read|Open|Visit)\b/);
    expect(html.indexOf("data-news-thumb")).toBeLessThan(html.indexOf("Harbor Cut lands a festival slot"));
    expect(html).toContain("data-news-source-chips");
    expect(html).toContain('data-news-sticky-header="page"');
    expect(html).toContain(NEWS_STICKY_PIN_CLASS);
    expect(html).toContain(NEWS_STICKY_PAGE_SURFACE_CLASS);
    expect(html).toContain("data-news-history-lead");
    expect(html).toContain(DASHBOARD_NEWS_HISTORY_COLUMN_CLASS);
    expect(html).toContain("max-w-[840px]");
    const stickyOpen = html.match(/data-news-sticky-header="page"[^>]*>/)?.[0] ?? "";
    expect(stickyOpen).toContain(NEWS_STICKY_PAGE_SURFACE_CLASS);
    expect(stickyOpen).not.toContain("max-w-[840px]");
    expect(stickyOpen).not.toContain("border");
    expect(stickyOpen).not.toContain("rounded");
    expect(html.indexOf("data-news-sticky-header")).toBeLessThan(
      html.indexOf("data-news-history-lead"),
    );
    expect(html.indexOf("data-news-history-lead")).toBeLessThan(
      html.indexOf("data-news-source-chips"),
    );
    expect(html.split("data-news-sticky-header=").length - 1).toBe(1);
    expect(html.indexOf("data-news-sticky-header")).toBeLessThan(
      html.indexOf("data-news-source-chips"),
    );
    expect(html.indexOf("data-news-source-chips")).toBeLessThan(
      html.indexOf("data-news-history-main"),
    );
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_CHIPS_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_TRACK_CLASS);
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("no-scrollbar");
    expect(html).toContain("w-max");
    expect(html).toContain("min-w-full");
    expect(html).toContain("data-news-source-track");
    expect(html).toContain(`data-segmented-persist="${SEGMENTED_TRACK_PERSIST.newsSource}"`);
    expect(html).toContain(DASHBOARD_TOP_PILL_CLUSTER_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_CHIP_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_CHIP_ON_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_SOURCE_CHIP_OFF_CLASS);
    expect(DASHBOARD_NEWS_SOURCE_CHIP_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_CLASS);
    expect(DASHBOARD_NEWS_SOURCE_CHIP_ON_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS);
    expect(DASHBOARD_NEWS_SOURCE_CHIP_ON_CLASS).toBe(HOUSE_SEGMENTED_ITEM_ON_CLASS);
    expect(DASHBOARD_NEWS_SOURCE_CHIP_OFF_CLASS).toBe(DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS);
    expect(html).toContain(NEWS_PAGE.sourcesAll);
    expect(html.indexOf('data-news-source-option="all"')).toBeLessThan(
      html.indexOf('data-news-source-option="deadline"'),
    );
    expect(html.indexOf('data-news-source-option="deadline"')).toBeLessThan(
      html.indexOf('data-news-source-option="variety"'),
    );
    for (const source of NEWS_SOURCES) {
      expect(html).toContain(source.label);
    }
    expect(NEWS_SOURCE_FILTER_SOURCES[0]?.label).toBe("Deadline");
    expect(html).toContain('href="/home/news?source=variety"');
    expect(html).not.toMatch(/href="\/home\/news\?source=[^"]*,/);
    expect(html).not.toContain("data-news-sources-rail");
    expect(html).not.toContain("data-news-sources-phone");
    expect(html).not.toContain("data-news-sources-sheet");
    expect(html).not.toContain("data-news-sources-trigger");
    expect(html).not.toContain('data-overview-module="news-sources"');
    expect(html).not.toContain("type=\"checkbox\"");
    expect(html).not.toContain("AppearanceCheck");
  });

  it("pins back + title + subtitle + chips in one sticky block — no leftover header", () => {
    const html = renderToStaticMarkup(
      createElement(NewsHistory, {
        items: [VARIETY],
        now: NOW,
        selected: [],
        heading: createElement(PageHeader, {
          title: NEWS_PAGE.title,
          subtitle: NEWS_PAGE.subtitle,
          backLink: { href: "/home", label: NEWS_PAGE.back },
          className: "pb-0",
        }),
      }),
    );
    expect(html).toContain('data-news-sticky-header="page"');
    expect(html.split("data-news-sticky-header=").length - 1).toBe(1);
    expect(html.split(NEWS_PAGE.title).length - 1).toBe(1);
    expect(html).toContain(NEWS_PAGE.subtitle);
    expect(html).toContain(NEWS_PAGE.back);
    expect(html).toContain('href="/home"');
    expect(html).toContain("data-news-source-chips");
    expect(html.indexOf("data-news-sticky-header")).toBeLessThan(html.indexOf(NEWS_PAGE.back));
    expect(html.indexOf(NEWS_PAGE.back)).toBeLessThan(html.indexOf(NEWS_PAGE.title));
    expect(html.indexOf(NEWS_PAGE.title)).toBeLessThan(html.indexOf(NEWS_PAGE.subtitle));
    expect(html.indexOf(NEWS_PAGE.subtitle)).toBeLessThan(html.indexOf("data-news-source-chips"));
    expect(html.indexOf("data-news-source-chips")).toBeLessThan(html.indexOf("Harbor Cut lands a festival slot"));
    expect(html).not.toContain('data-news-sticky-header="rail"');
  });

  it("filters All / one exclusive outlet and shows empty copy in the list column", () => {
    const all = renderToStaticMarkup(
      createElement(NewsHistory, {
        items: [VARIETY, DEADLINE],
        now: NOW,
        selected: [],
      }),
    );
    expect(all).toContain("Harbor Cut lands a festival slot");
    expect(all).toContain("North Wind books a limited run");
    expect(all).toContain('data-news-source-option="all"');
    expect(all).toContain('aria-pressed="true"');
    expect(all).toMatch(
      /data-news-source-option="all"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-news-source-option="all"/,
    );

    const one = renderToStaticMarkup(
      createElement(NewsHistory, {
        items: [VARIETY, DEADLINE],
        now: NOW,
        selected: ["variety"],
      }),
    );
    expect(one).toContain("Harbor Cut lands a festival slot");
    expect(one).not.toContain("North Wind books a limited run");
    expect(one).toContain('href="/home/news?source=deadline"');
    expect(one).toContain('href="/home/news"');
    expect(one).not.toMatch(/href="\/home\/news\?source=[^"]*,/);
    expect(one).toMatch(
      /data-news-source-option="variety"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-news-source-option="variety"/,
    );
    expect(one).not.toMatch(
      /data-news-source-option="all"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-news-source-option="all"/,
    );

    const legacy = renderToStaticMarkup(
      createElement(NewsHistory, {
        items: [VARIETY, DEADLINE],
        now: NOW,
        selected: ["variety", "deadline"],
      }),
    );
    expect(legacy).toContain("North Wind books a limited run");
    expect(legacy).not.toContain("Harbor Cut lands a festival slot");
    expect(legacy).toContain('href="/home/news?source=variety"');
    expect(legacy).toContain('href="/home/news?source=deadline"');
    expect(legacy).not.toMatch(/href="\/home\/news\?source=[^"]*,/);
    expect(legacy).toMatch(
      /data-news-source-option="deadline"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*data-news-source-option="deadline"/,
    );

    const empty = renderToStaticMarkup(
      createElement(NewsHistory, {
        items: [VARIETY, DEADLINE],
        now: NOW,
        selected: ["joblo"],
      }),
    );
    expect(empty).toContain(NEWS_PAGE.filterEmpty);
    expect(empty).not.toContain("Harbor Cut lands a festival slot");
    expect(empty).toContain("data-news-history-main");
    expect(empty).toContain("data-news-source-chips");
  });
});

describe("Home News rail stays stacked", () => {
  it("does not apply the history list + Sources filter to Home", () => {
    const html = renderToStaticMarkup(
      createElement(NewsRail, { items: [VARIETY], now: NOW, viewAll: true }),
    );
    expect(html).toContain('data-news-card-density="home"');
    expect(html).not.toContain("data-news-history-layout");
    expect(html).not.toContain("data-news-source-chips");
    expect(html).not.toContain('data-news-sticky-header="page"');
    expect(html).toContain('data-news-sticky-header="rail"');
    expect(html).not.toContain("data-news-sources-rail");
    expect(html).not.toContain("data-news-sources-phone");
    expect(html).not.toContain(markupClass(DASHBOARD_NEWS_HISTORY_THUMB_CLASS));
    expect(html).not.toContain("lg:grid-cols-2");
  });
});
