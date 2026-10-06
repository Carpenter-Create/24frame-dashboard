import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  DashboardRankedBars,
  DashboardRankedRows,
  DashboardTopPerforming,
  DashboardTopPlatforms,
  DashboardTopTerritories,
  DashboardTopTitles,
} from "@/components/dashboard/dashboard-ranked";
import { DashboardTerritoryMap } from "@/components/dashboard/dashboard-territory-map";
import { DashboardViewAll, DashboardViewAlts } from "@/components/dashboard/dashboard-view-alts";
import { ReportsTerritories } from "@/components/reports/reports-ranked";
import {
  DASHBOARD_CHOROPLETH_LEGEND_BAR_CLASS,
  DASHBOARD_CHOROPLETH_SWATCH_CLASS,
  DASHBOARD_RANKED_PANE_CLASS,
  DASHBOARD_RANKED_PANE_MIN_HEIGHT_CLASS,
  DASHBOARD_RANKED_SHARE_TRACK_CLASS,
  DASHBOARD_RANKED_TABLE_ROW_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/lib/dashboard-craft";
import { DASHBOARD_HOME } from "@/lib/dashboard-home";
import {
  DASHBOARD_CHOROPLETH_SCALE,
  DASHBOARD_LIST_DEFAULT_LIMIT,
  DASHBOARD_MAP_CENTER,
  DASHBOARD_MAP_HEIGHT,
  DASHBOARD_MAP_SCALE,
  DASHBOARD_MAP_WIDTH,
  DASHBOARD_TERRITORY_MAP_SAMPLE,
  dashboardChoroplethFill,
  dashboardChoroplethIndex,
  dashboardConcentration,
  dashboardConcentrationLine,
  dashboardListLimitLabel,
  dashboardModuleMetaLine,
  dashboardRowForTopologyId,
  dashboardRowsByAlpha2,
  dashboardShareLabel,
  dashboardShowTopLabel,
  dashboardTerritoryCountLabel,
  rankedRowsFromCounts,
  resolveTerritoryRef,
  splitDashboardTitle,
} from "@/lib/dashboard-register";
import { isoAlpha2FromNumeric, isoNumericForAlpha2, NUMERIC_TO_ALPHA2 } from "@/lib/iso3166-numeric";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

describe("dashboard register helpers", () => {
  it("resolves territory codes and names without inventing unofficial codes", () => {
    expect(resolveTerritoryRef("US")).toEqual({ code: "US", name: "United States" });
    expect(resolveTerritoryRef("United States")).toEqual({ code: "US", name: "United States" });
    expect(isoNumericForAlpha2("US")).toBe(840);
    expect(isoAlpha2FromNumeric(840)).toBe("US");
    expect(isoAlpha2FromNumeric("826")).toBe("GB");
    expect(NUMERIC_TO_ALPHA2["840"]).toBe("US");
    expect(NUMERIC_TO_ALPHA2["036"]).toBe("AU");
    expect(NUMERIC_TO_ALPHA2["36"]).toBe("AU");
    expect(isoAlpha2FromNumeric("036")).toBe("AU");
    expect(isoAlpha2FromNumeric("036")).toBe(isoAlpha2FromNumeric(36));
    const rows = rankedRowsFromCounts(
      [
        { name: "US", count: 14 },
        { name: "United Kingdom", count: 6 },
      ],
      true,
    );
    expect(rows[0]).toMatchObject({ code: "US", label: "United States", numeric: 840 });
    expect(dashboardShareLabel(14, 20)).toBe("70%");
    expect(dashboardTerritoryCountLabel(1)).toBe("1 territory");
    expect(dashboardTerritoryCountLabel(5)).toBe("5 territories");
    expect(dashboardModuleMetaLine({ period: "All time", updated: "2026-07" })).toBe(
      "All time · Updated 2026-07",
    );
  });

  it("fills the choropleth from a discrete Sporty Blue scale — never amber or green", () => {
    expect(DASHBOARD_CHOROPLETH_SCALE).toHaveLength(6);
    expect(dashboardChoroplethFill(0, 100)).toBe("var(--surface-muted)");
    expect(dashboardChoroplethFill(0, 0)).toBe(DASHBOARD_CHOROPLETH_SCALE[0]);
    expect(dashboardChoroplethIndex(0, 100)).toBe(0);
    expect(dashboardChoroplethIndex(1, 100)).toBe(1);
    expect(dashboardChoroplethIndex(100, 100)).toBe(5);
    expect(dashboardChoroplethFill(100, 100)).toBe(DASHBOARD_CHOROPLETH_SCALE[5]);
    expect(dashboardChoroplethFill(100, 100)).toContain("var(--accent)");
    expect(dashboardChoroplethFill(100, 100)).toMatch(/color-mix/);
    expect(dashboardChoroplethFill(100, 100)).not.toMatch(/100%/);
    expect(dashboardChoroplethFill(50, 100)).not.toMatch(/amber|orange|#[Ff][Ff]|emerald|green|#1769FF/);
    expect(dashboardChoroplethFill(20, 100)).toBe(dashboardChoroplethFill(21, 100));
  });

  it("splits title parentheticals and reports Top 1 / Top 5 share", () => {
    expect(splitDashboardTitle("Winter Light")).toEqual(["Winter Light", null]);
    expect(splitDashboardTitle("Winter Light (Theatrical)")).toEqual([
      "Winter Light",
      "(Theatrical)",
    ]);
    expect(dashboardConcentration([4, 2, 3, 1, 2])).toEqual({
      top1Pct: (4 / 12) * 100,
      top5Pct: 100,
    });
    expect(dashboardConcentrationLine([4, 2, 3, 1, 2])).toBe("33.3% Top 1 · 100.0% Top 5");
    expect(DASHBOARD_LIST_DEFAULT_LIMIT).toBe(10);
    expect(dashboardListLimitLabel(12)).toBe("View all 12 territories");
    expect(dashboardShowTopLabel()).toBe("Show top 10");
  });
});

describe("dashboard register chrome", () => {
  it("renders the view-alt cluster and View all arrow in Sporty Blue", () => {
    const alts = renderToStaticMarkup(
      createElement(DashboardViewAlts, {
        modes: ["map", "list", "bars"],
        mode: "map",
        onChange: () => undefined,
      }),
    );
    const viewAll = renderToStaticMarkup(createElement(DashboardViewAll, { href: "/titles" }));
    expect(alts).toContain("data-dashboard-view-alts");
    expect(alts).toContain('data-dashboard-view-alt="map"');
    expect(alts).toContain('data-dashboard-view-alt="list"');
    expect(alts).toContain('data-dashboard-view-alt="bars"');
    expect(alts).toContain("border-hairline");
    expect(alts).toContain("divide-hairline");
    expect(alts).toContain("text-accent");
    expect(alts).not.toContain("bg-surface-muted");
    expect(alts).not.toContain("bg-accent");
    expect(viewAll).toContain("data-dashboard-view-all");
    expect(viewAll).toContain("data-dashboard-view-all-arrow");
    expect(viewAll).toContain(DASHBOARD_HOME.viewAll);
    expect(viewAll).toContain("text-accent");
    expect(viewAll).not.toContain("text-amber");
    expect(alts).not.toContain("Top works");
    const mapSrc = readFileSync("src/components/dashboard/dashboard-territory-map.tsx", "utf8");
    expect(mapSrc).not.toMatch(/from ["']geojson["']/);
    expect(mapSrc).toContain("CountryFeature");
    expect(mapSrc).toContain("TerritoryPath");
    expect(mapSrc).toContain("geoMercator");
    expect(mapSrc).toContain("DASHBOARD_MAP_SCALE");
    expect(mapSrc).toContain("DASHBOARD_MAP_CENTER");
    expect(mapSrc).toContain("data-dashboard-territory-swatch");
    expect(mapSrc).toContain("dashboardRowForTopologyId");
    expect(mapSrc).toContain("dashboardRowsByAlpha2");
    expect(mapSrc).toContain("DASHBOARD_MAP_PAD_CLASS");
    expect(mapSrc).not.toMatch(/from ["']react-simple-maps["']/);
    expect(mapSrc).not.toContain("rounded-[var(--radius-sm)]");
    expect(DASHBOARD_CHOROPLETH_LEGEND_BAR_CLASS).toBe("flex gap-0.5");
    expect(DASHBOARD_CHOROPLETH_SWATCH_CLASS).toBe("h-2 w-5 rounded-sm");
    expect(DASHBOARD_CHOROPLETH_SWATCH_CLASS).not.toContain("--radius-sm");
    expect(mapSrc).not.toContain("p-[var(--space-4)]");
    expect(mapSrc).not.toContain("geoGraticule10");
    expect(mapSrc).not.toContain("geoNaturalEarth1");
    expect(mapSrc).not.toMatch(/amber|orange|#[Ff][Ff]|hsl\(38/);
    expect(DASHBOARD_MAP_WIDTH).toBe(700);
    expect(DASHBOARD_MAP_HEIGHT).toBe(340);
    expect(DASHBOARD_MAP_SCALE).toBe(120);
    expect(DASHBOARD_MAP_CENTER).toEqual([0, 30]);
  });

  it("uses Sources table grammar for list and bars — not a stub chart", () => {
    const sample = [{ key: "a", label: "Window A", count: 4 }];
    const listRows = renderToStaticMarkup(
      createElement(DashboardRankedRows, { rows: sample, mode: "list" }),
    );
    const barRows = renderToStaticMarkup(
      createElement(DashboardRankedRows, { rows: sample, mode: "bars" }),
    );
    const titles = renderToStaticMarkup(
      createElement(DashboardTopTitles, {
        items: [
          {
            id: "t1",
            title: "Winter Light",
            status: "live",
            created_at: "2026-09-02T00:00:00.000Z",
            count: 3,
          },
        ],
      }),
    );
    const platforms = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.platforms,
        empty: DASHBOARD_HOME.platformsEmpty,
        rows: [{ name: "Window A", count: 4 }],
        testId: "platforms",
        viewAllHref: "/titles",
      }),
    );
    const territories = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.territories,
        empty: DASHBOARD_HOME.territoriesEmpty,
        rows: [{ name: "US", count: 4 }],
        testId: "territories",
        viewAllHref: "/titles",
        territory: true,
        defaultMode: "list",
      }),
    );
    for (const html of [listRows, barRows, titles, platforms, territories]) {
      expect(html).toContain("data-dashboard-ranked-mark");
      expect(html).toContain("data-dashboard-ranked-rank");
      expect(html).toContain("data-dashboard-ranked-share");
      expect(html).toContain("data-dashboard-ranked-value");
      expect(html).toContain(DASHBOARD_RANKED_TABLE_ROW_CLASS);
      expect(html).not.toContain("flex-col items-stretch");
      expect(html).not.toContain("h-1 w-16");
    }
    expect(listRows).toContain('data-dashboard-ranked-grammar="grade"');
    expect(listRows).not.toContain("data-dashboard-ranked-bar");
    expect(territories).toContain('data-dashboard-ranked-grammar="grade"');
    expect(territories).not.toContain("data-dashboard-ranked-bar");
    for (const html of [barRows, titles, platforms]) {
      expect(html).toContain('data-dashboard-ranked-grammar="table"');
      expect(html).toContain("data-dashboard-ranked-bar");
      expect(html).toContain(DASHBOARD_RANKED_SHARE_TRACK_CLASS);
    }
    expect(DASHBOARD_RANKED_SHARE_TRACK_CLASS).toContain("h-2");
    expect(DASHBOARD_RANKED_SHARE_TRACK_CLASS).toContain("min-w-16");
    expect(DASHBOARD_RANKED_SHARE_TRACK_CLASS).toContain("flex-1");
    expect(listRows).toContain('data-dashboard-ranked-rows="list"');
    expect(barRows).toContain('data-dashboard-ranked-rows="bars"');
    expect(titles).toContain("data-dashboard-concentration");
    expect(titles).toContain("data-dashboard-view-all-arrow");
    expect(platforms).toContain(DASHBOARD_HOME.platforms);
    expect(territories).toContain(DASHBOARD_HOME.territories);
    expect(territories).toContain("100%");
    expect(territories).not.toContain("Top territories");
  });

  it("renders Top titles, Top platforms, and Top territories as stacked modules", () => {
    const titles = renderToStaticMarkup(
      createElement(DashboardTopTitles, {
        items: [
          {
            id: "t1",
            title: "Winter Light",
            status: "live",
            created_at: "2026-09-02T00:00:00.000Z",
            count: 3,
          },
        ],
        periodLabel: "All time",
        defaultMode: "list",
      }),
    );
    const platforms = renderToStaticMarkup(
      createElement(DashboardTopPlatforms, {
        rows: [{ name: "Window A", count: 4 }],
      }),
    );
    const territories = renderToStaticMarkup(
      createElement(DashboardTopTerritories, {
        rows: [{ name: "US", count: 4 }],
      }),
    );
    const stack = renderToStaticMarkup(
      createElement(DashboardTopPerforming, {
        titles: [
          {
            id: "t1",
            title: "Winter Light",
            status: "live",
            created_at: "2026-09-02T00:00:00.000Z",
            count: 3,
          },
        ],
        platforms: [{ name: "Window A", count: 4 }],
        territories: [{ name: "US", count: 4 }],
        periodLabel: "All time",
      }),
    );
    expect(DASHBOARD_HOME.topTitles).toBe("Top titles");
    expect(DASHBOARD_HOME.topPlatforms).toBe("Top platforms");
    expect(DASHBOARD_HOME.platforms).toBe("Top platforms");
    expect(DASHBOARD_SECTION_TITLE_CLASS).not.toContain("text-ink-3");
    expect(stack).toContain("data-dashboard-top-performing");
    expect(stack).not.toContain("data-dashboard-top-pills");
    expect(stack).not.toContain("data-dashboard-top-pill=");
    expect(stack).not.toContain("data-dashboard-top-pill-active");
    expect(stack).not.toContain(DASHBOARD_HOME.topPerforming);
    expect(stack).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topTitles}`);
    expect(stack).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topPlatforms}`);
    expect(stack).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topTerritories}`);
    expect(stack).toContain('data-dashboard-module="top-titles"');
    expect(stack).toContain('data-dashboard-ranked="platforms"');
    expect(stack).toContain('data-dashboard-ranked="territories"');
    expect(stack.indexOf('data-dashboard-module="top-titles"')).toBeLessThan(
      stack.indexOf('data-dashboard-ranked="platforms"'),
    );
    expect(stack.indexOf('data-dashboard-ranked="platforms"')).toBeLessThan(
      stack.indexOf('data-dashboard-ranked="territories"'),
    );
    expect(stack).toContain("Winter Light");
    expect(stack).toContain("Window A");
    expect(stack).toContain("data-dashboard-territory-map");
    expect(stack).not.toContain("Top works");
    expect(titles).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topTitles}`);
    expect(titles).toContain('data-dashboard-view="list"');
    expect(titles).toContain('data-dashboard-ranked-grammar="grade"');
    expect(titles).toContain("data-dashboard-ranked-mark");
    expect(titles).toContain("data-dashboard-ranked-rank");
    expect(titles).not.toContain("data-dashboard-ranked-bar");
    expect(titles).toContain("Winter Light");
    expect(titles).toContain('data-dashboard-view-alt="list"');
    expect(titles).toContain('data-dashboard-view-alt="bars"');
    expect(titles).not.toContain('data-dashboard-view-alt="map"');
    expect(titles).toContain("data-dashboard-view-all-arrow");
    expect(titles).toContain('href="/aggregation/titles"');
    expect(titles).not.toContain("Window A");
    expect(platforms).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topPlatforms}`);
    expect(platforms).toContain('data-dashboard-view="list"');
    expect(platforms).toContain("Window A");
    expect(platforms).toContain('data-dashboard-ranked-grammar="grade"');
    expect(platforms).toContain('href="/aggregation/titles"');
    expect(platforms).not.toContain('data-dashboard-view-alt="map"');
    expect(territories).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topTerritories}`);
    expect(territories).toContain('data-dashboard-view="map"');
    expect(territories).toContain("data-dashboard-territory-map");
    expect(territories).toContain('data-dashboard-territory-scale="overview"');
    expect(territories).toContain("min-h-[340px]");
    expect(territories).toContain("p-[var(--space-6)]");
    expect(territories).toContain('data-dashboard-view-alt="map"');
    expect(territories).toContain('data-dashboard-view-alt="list"');
    expect(territories).toContain('data-dashboard-view-alt="bars"');
    expect(DASHBOARD_RANKED_PANE_MIN_HEIGHT_CLASS).toBe(
      "min-h-[calc(340px+2*var(--space-6))]",
    );
    expect(DASHBOARD_RANKED_PANE_MIN_HEIGHT_CLASS).toContain("340px");
    expect(DASHBOARD_RANKED_PANE_MIN_HEIGHT_CLASS).toContain("var(--space-6)");
    expect(DASHBOARD_RANKED_PANE_CLASS).toContain("[overflow-anchor:none]");
    expect(DASHBOARD_RANKED_PANE_CLASS).toContain(DASHBOARD_RANKED_PANE_MIN_HEIGHT_CLASS);
  });

  it("does not multiplex Titles, Platforms, and Territories behind one pill row", () => {
    const src = readFileSync("src/components/dashboard/dashboard-ranked.tsx", "utf8");
    expect(src).not.toContain("TOP_PERFORMING_PANES");
    expect(src).not.toContain("selectPill");
    expect(src).not.toContain("data-dashboard-top-pills");
    expect(src).not.toContain("data-dashboard-top-pill");
    expect(src).not.toContain("SEGMENTED_TRACK_PERSIST");
    expect(src).not.toContain("preserveWindowScroll");
    expect(src).toContain("export function DashboardTopTitles");
    expect(src).toContain("export function DashboardTopPlatforms");
    expect(src).toContain("export function DashboardTopTerritories");
    expect(src).toContain('defaultMode="list"');
    expect(src).toContain('defaultMode="map"');
  });

  it("gives Top titles list/bars and Territories map/list/bars — 24Frame nouns only", () => {
    const titles = renderToStaticMarkup(
      createElement(DashboardTopTitles, {
        items: [
          {
            id: "t1",
            title: "Winter Light",
            status: "live",
            created_at: "2026-09-02T00:00:00.000Z",
            count: 3,
          },
        ],
        periodLabel: "All time",
      }),
    );
    const territories = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.territories,
        empty: DASHBOARD_HOME.territoriesEmpty,
        rows: [{ name: "US", count: 4 }],
        testId: "territories",
        viewAllHref: "/titles",
        territory: true,
        periodLabel: "All time",
      }),
    );
    const platforms = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.platforms,
        empty: DASHBOARD_HOME.platformsEmpty,
        rows: [{ name: "Window A", count: 4 }],
        testId: "platforms",
        viewAllHref: "/titles",
      }),
    );
    expect(DASHBOARD_HOME.territories).not.toBe("Top territories");
    expect(titles).toContain(DASHBOARD_HOME.topTitles);
    expect(titles).toContain('data-dashboard-view-alt="list"');
    expect(titles).toContain('data-dashboard-view-alt="bars"');
    expect(titles).not.toContain('data-dashboard-view-alt="map"');
    expect(titles).toContain("data-dashboard-view-all-arrow");
    expect(titles).toContain("data-dashboard-concentration");
    expect(titles).toContain("100.0% Top 1");
    expect(titles).toContain("100.0% Top 5");
    expect(titles).not.toContain("Top works");
    expect(territories).toContain(DASHBOARD_HOME.territories);
    expect(territories).not.toContain("Top territories");
    expect(territories).toContain('data-dashboard-view-alt="map"');
    expect(territories).toContain("data-dashboard-territory-map");
    expect(territories).toContain('data-dashboard-territory-scale="overview"');
    expect(territories).toContain("min-h-[340px]");
    expect(territories).toContain("p-[var(--space-6)]");
    expect(territories).toContain(DASHBOARD_HOME.legendLow);
    expect(territories).toContain(DASHBOARD_HOME.legendHigh);
    expect(territories).toContain("data-dashboard-territory-swatch");
    expect(territories.split("data-dashboard-territory-swatch").length - 1).toBe(5);
    expect(platforms).toContain(DASHBOARD_HOME.platforms);
    expect(platforms).toContain('data-dashboard-view-alt="list"');
    expect(platforms).toContain('data-dashboard-view-alt="bars"');
    expect(platforms).not.toContain('data-dashboard-view-alt="map"');
    expect(platforms).not.toContain("contributors");
    expect(`${titles}${territories}${platforms}`).not.toContain("Exports");
  });

  it("keeps quiet empty Top modules instead of omitting them", () => {
    const titles = renderToStaticMarkup(
      createElement(DashboardTopTitles, { items: [], quietEmpty: true }),
    );
    const platforms = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.platforms,
        empty: DASHBOARD_HOME.platformsEmpty,
        rows: [],
        testId: "platforms",
        viewAllHref: "/titles",
      }),
    );
    const territories = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.territories,
        empty: DASHBOARD_HOME.territoriesEmpty,
        rows: [],
        testId: "territories",
        viewAllHref: "/titles",
        territory: true,
      }),
    );
    expect(titles).toContain('data-dashboard-module="top-titles"');
    expect(titles).toContain("data-dashboard-ranked-empty");
    expect(titles).toContain(DASHBOARD_HOME.topTitlesEmpty);
    expect(titles).toContain("data-dashboard-view-alts");
    expect(titles).toContain("data-dashboard-view-all");
    expect(platforms).toContain('data-dashboard-ranked="platforms"');
    expect(platforms).toContain(DASHBOARD_HOME.platformsEmpty);
    expect(platforms).toContain('data-dashboard-view-alt="list"');
    expect(platforms).toContain('data-dashboard-view-alt="bars"');
    expect(territories).toContain("data-dashboard-territory");
    expect(territories).toContain(DASHBOARD_HOME.territoriesEmpty);
    expect(territories).toContain('data-dashboard-view-alt="map"');
    expect(territories).toContain("data-dashboard-territory-map");
    expect(territories).toContain('data-dashboard-territory-scale="overview"');
    expect(territories).toContain("0 territories");
    expect(territories).toContain("data-dashboard-territory-swatch");
    expect(territories).toContain("data-dashboard-territory-legend-bar");
    expect(territories).toContain(DASHBOARD_HOME.legendLow);
    expect(territories).toContain(DASHBOARD_HOME.legendHigh);
  });

  it("keeps parentheticals quiet on Top titles and expands Territories past 10", () => {
    const titles = renderToStaticMarkup(
      createElement(DashboardTopTitles, {
        items: [
          {
            id: "t1",
            title: "Winter Light (Theatrical)",
            status: "live",
            created_at: "2026-09-02T00:00:00.000Z",
            count: 6,
          },
          {
            id: "t2",
            title: "Harbor",
            status: "live",
            created_at: "2026-09-01T00:00:00.000Z",
            count: 4,
          },
        ],
      }),
    );
    expect(titles).toContain("Winter Light");
    expect(titles).toContain("(Theatrical)");
    expect(titles).toContain("60.0% Top 1");
    expect(titles).toContain("100.0% Top 5");
    expect(titles).not.toContain("Top works");

    const many = Array.from({ length: 12 }, (_, i) => ({
      name: `T${String(i + 1).padStart(2, "0")}`,
      count: 12 - i,
    }));
    const territories = renderToStaticMarkup(
      createElement(DashboardRankedBars, {
        label: DASHBOARD_HOME.territories,
        empty: DASHBOARD_HOME.territoriesEmpty,
        rows: many,
        testId: "territories",
        viewAllHref: "/titles",
        territory: true,
        defaultMode: "list",
      }),
    );
    expect(territories).toContain("data-dashboard-territory-more");
    expect(territories).toContain("View all 12 territories");
    expect(territories).toContain(">T01<");
    expect(territories).toContain(">T10<");
    expect(territories).not.toContain(">T11<");
  });
});

describe("dashboard territory map rematch", () => {
  function countryFill(html: string, code: string): string | null {
    const match = html.match(
      new RegExp(`data-dashboard-territory-country="${code}"[^>]*fill="([^"]+)"`),
    );
    return match?.[1] ?? null;
  }

  it("joins sample ranked rows onto filled paths and a continuous LOW HIGH legend", () => {
    const ranked = rankedRowsFromCounts(DASHBOARD_TERRITORY_MAP_SAMPLE, true);
    expect(ranked.map((row) => row.code)).toEqual(["US", "GB", "CA", "DE", "AU"]);
    const byCode = dashboardRowsByAlpha2(ranked);
    expect(dashboardRowForTopologyId(byCode, "840")?.code).toBe("US");
    expect(dashboardRowForTopologyId(byCode, "036")?.code).toBe("AU");
    expect(dashboardRowForTopologyId(byCode, 36)?.code).toBe("AU");
    expect(dashboardRowForTopologyId(byCode, null, "United States of America")?.code).toBe("US");
    expect(dashboardRowForTopologyId(byCode, "010")).toBeNull();

    const html = renderToStaticMarkup(createElement(DashboardTerritoryMap, { rows: ranked }));
    expect(html).toContain('data-dashboard-territory-scale="overview"');
    expect(html).toContain("5 territories");
    expect(html).toContain("data-dashboard-territory-legend-bar");
    expect(html).toContain(DASHBOARD_CHOROPLETH_LEGEND_BAR_CLASS);
    expect(html).toContain(DASHBOARD_CHOROPLETH_SWATCH_CLASS);
    expect(html.split("data-dashboard-territory-swatch").length - 1).toBe(5);
    expect(html).not.toContain("rounded-[var(--radius-sm)]");
    expect(html).toContain(DASHBOARD_HOME.legendLow);
    expect(html).toContain(DASHBOARD_HOME.legendHigh);

    for (const code of ["US", "GB", "CA", "DE", "AU"] as const) {
      const fill = countryFill(html, code);
      expect(fill, code).toBeTruthy();
      expect(fill, code).toContain("var(--accent)");
      expect(fill, code).toMatch(/color-mix/);
      expect(fill, code).not.toBe("var(--surface-muted)");
      expect(html).toContain(`data-dashboard-territory-country="${code}"`);
    }
    expect(html.split("data-dashboard-territory-filled").length - 1).toBe(5);
    expect(countryFill(html, "FR")).toBe("var(--surface-muted)");
  });

  it("keeps one DashboardTerritoryMap SoT for Top territories and Reports Territories", () => {
    const top = renderToStaticMarkup(
      createElement(DashboardTopTerritories, { rows: DASHBOARD_TERRITORY_MAP_SAMPLE }),
    );
    const reports = renderToStaticMarkup(
      createElement(ReportsTerritories, { rows: DASHBOARD_TERRITORY_MAP_SAMPLE }),
    );
    for (const html of [top, reports]) {
      expect(html).toContain("data-dashboard-territory-map");
      expect(html).toContain('data-dashboard-territory-country="US"');
      expect(html).toContain("data-dashboard-territory-filled");
      expect(html).toContain("data-dashboard-territory-legend-bar");
      expect(html).toContain("5 territories");
      expect(countryFill(html, "US")).toContain("var(--accent)");
    }
    const rankedSrc = readFileSync("src/components/dashboard/dashboard-ranked.tsx", "utf8");
    const reportsSrc = readFileSync("src/components/reports/reports-ranked.tsx", "utf8");
    const altsSrc = readFileSync("src/components/dashboard/dashboard-view-alts.tsx", "utf8");
    expect(rankedSrc).toContain("DashboardTerritoryMap");
    expect(reportsSrc).toContain("DashboardTerritoryMap");
    expect(rankedSrc).not.toContain("react-simple-maps");
    expect(reportsSrc).not.toContain("react-simple-maps");
    expect(altsSrc).toContain("Globe");
    expect(altsSrc).toContain("List");
    expect(altsSrc).toContain("ChartBar");
    expect(altsSrc).not.toContain("BarChart3");
  });
});
