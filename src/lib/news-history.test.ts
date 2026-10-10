import { describe, expect, it } from "vitest";

import {
  NEWS_HREF,
  NEWS_PAGE,
  NEWS_SOURCE_IDS,
  NEWS_SOURCE_PARAM,
  NEWS_SOURCES,
  NEWS_SOURCE_FILTER_SOURCES,
  canonicalizeNewsSourceFilter,
  filterNewsBySources,
  newsHistoryEmptyCopy,
  newsHistoryHref,
  newsSourceFilterIndex,
  newsSourceFilterIsAll,
  newsSourceFilterLabel,
  parseNewsSourceFilter,
  selectNewsSourceFilter,
  type NewsItem,
} from "./news";

function item(id: string, source: NewsItem["source"]): NewsItem {
  return {
    id,
    title: id,
    url: `https://example.com/${id}`,
    source,
    published_at: "2026-09-17T12:00:00.000Z",
    image_url: null,
  };
}

describe("news history source filter URL", () => {
  it("treats absent, empty, all, and invalid-only as All", () => {
    expect(parseNewsSourceFilter(undefined)).toEqual([]);
    expect(parseNewsSourceFilter(null)).toEqual([]);
    expect(parseNewsSourceFilter("")).toEqual([]);
    expect(parseNewsSourceFilter("all")).toEqual([]);
    expect(parseNewsSourceFilter("not-a-source")).toEqual([]);
    expect(newsSourceFilterIsAll([])).toBe(true);
    expect(newsHistoryHref([])).toBe(NEWS_HREF);
    expect(newsSourceFilterIndex([])).toBe(0);
    expect(NEWS_SOURCE_PARAM).toBe("source");
  });

  it("parses one source and writes a single ?source= id", () => {
    expect(parseNewsSourceFilter("variety")).toEqual(["variety"]);
    expect(newsHistoryHref(["variety"])).toBe(`${NEWS_HREF}?source=variety`);
    expect(newsSourceFilterIsAll(["variety"])).toBe(false);
    expect(newsSourceFilterLabel(["variety"])).toBe("Variety");
    expect(newsSourceFilterIndex(["variety"])).toBe(
      NEWS_SOURCE_FILTER_SOURCES.findIndex((source) => source.id === "variety") + 1,
    );
  });

  it("collapses legacy comma-multi or repeated params to the first A-Z id", () => {
    // deadline before variety in the filter SoT. Fail-closed single-select:
    // never keep two ids. Treat-as-All is not this lock.
    expect(parseNewsSourceFilter("deadline,variety")).toEqual(["deadline"]);
    expect(parseNewsSourceFilter(["deadline", "variety"])).toEqual(["deadline"]);
    expect(parseNewsSourceFilter("variety,deadline,not-a-source")).toEqual(["deadline"]);
    expect(newsHistoryHref(["deadline", "variety"])).toBe(`${NEWS_HREF}?source=deadline`);
    expect(newsHistoryHref(["variety", "deadline"])).toBe(`${NEWS_HREF}?source=deadline`);
    expect(newsSourceFilterLabel(["variety", "deadline"])).toBe("Deadline");
    expect(canonicalizeNewsSourceFilter(["variety", "deadline"])).toEqual(["deadline"]);
  });

  it("selects All or one outlet exclusively", () => {
    expect(selectNewsSourceFilter("all")).toEqual([]);
    expect(selectNewsSourceFilter("variety")).toEqual(["variety"]);
    expect(selectNewsSourceFilter("deadline")).toEqual(["deadline"]);
    expect(canonicalizeNewsSourceFilter([...NEWS_SOURCE_IDS])).toEqual([]);
  });

  it("lists filter outlets All first, then A-Z by label", () => {
    expect(NEWS_SOURCE_FILTER_SOURCES.map((source) => source.label)).toEqual([
      "Deadline",
      "Film Threat",
      "Filmmaker Magazine",
      "Hollywood Reporter",
      "IndieWire",
      "MovieMaker",
      "No Film School",
      "Screen Daily",
      "TVLine",
      "Variety",
    ]);
    expect(NEWS_SOURCES.map((source) => source.id)).not.toEqual(
      NEWS_SOURCE_FILTER_SOURCES.map((source) => source.id),
    );
  });
});

describe("news history source filter rows", () => {
  const rows = [
    item("v", "variety"),
    item("d", "deadline"),
    item("i", "indiewire"),
  ];

  it("keeps every row for All and filters one exclusive outlet", () => {
    expect(filterNewsBySources(rows, []).map((row) => row.id)).toEqual(["v", "d", "i"]);
    expect(filterNewsBySources(rows, ["variety"]).map((row) => row.id)).toEqual(["v"]);
    expect(filterNewsBySources(rows, ["variety", "deadline"]).map((row) => row.id)).toEqual([
      "d",
    ]);
    expect(filterNewsBySources(rows, ["film-threat"])).toEqual([]);
    expect(newsHistoryEmptyCopy([], [])).toBe(NEWS_PAGE.empty);
    expect(newsHistoryEmptyCopy(rows, [])).toBe(NEWS_PAGE.filterEmpty);
    expect(newsHistoryEmptyCopy([], [], true)).toBeNull();
    expect(newsHistoryEmptyCopy(rows, rows, true)).toBe(NEWS_PAGE.empty);
  });
});

describe("news history retention window", () => {
  it("locks 90 days for history / TTL / query — not the Home cap", () => {
    expect(NEWS_PAGE.empty).toContain("90 days");
    expect(NEWS_PAGE.subtitle).toContain("90 days");
    expect(NEWS_PAGE.empty).not.toContain("30 days");
  });
});
