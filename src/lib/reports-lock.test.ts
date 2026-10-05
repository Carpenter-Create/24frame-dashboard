import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ReportsControls } from "@/components/reports/reports-controls";
import { ReportsBody } from "@/components/reports/reports-shell";
import { DASHBOARD_ADMIN, parseDashboardPeriod } from "@/lib/dashboard-admin";
import { DASHBOARD_HOME } from "@/lib/dashboard-home";
import {
  REPORTS_PAGE,
  parseReportsPeriod,
  reportsPeriodOptions,
} from "@/lib/reports";
import {
  HOUSE_SEGMENTED_ITEM_BASE_CLASS,
  HOUSE_SEGMENTED_ITEM_ON_CLASS,
} from "@/lib/house-shell";
import {
  REPORTS_CHART_HEIGHT_DESKTOP,
  REPORTS_DOWNLOAD_CLASS,
  REPORTS_TITLE_DESKTOP_CLASS,
} from "@/lib/reports-craft";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const now = new Date("2026-09-16T12:00:00.000Z");

const REPORTS_SRC_PATHS = [
  "src/lib/reports.ts",
  "src/lib/reports-craft.ts",
  "src/lib/reports-view.ts",
  "src/lib/reports-fixture.ts",
  "src/app/(app)/aggregation/reports/page.tsx",
  ...readdirSync("src/components/reports")
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => join("src/components/reports", name)),
];

function emptyHero() {
  return {
    totalCents: null,
    asOf: REPORTS_PAGE.allTime,
    updated: null,
    compare: null,
    points: [],
  };
}

describe("Aggregation Reports miss list v1.1", () => {
  it("keeps Find-user and Download off Dashboard and on Reports", () => {
    const dashboard = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");
    const dashControls = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
    const reportsPage = readFileSync("src/app/(app)/aggregation/reports/page.tsx", "utf8");
    expect(dashboard).not.toContain("data-reports-download");
    expect(dashboard).not.toContain("data-reports-user");
    expect(dashControls).not.toContain("data-dashboard-user");
    expect(dashControls).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(reportsPage).toContain("ReportsBody");
    expect(reportsPage).toContain("showUserScope={isAdmin}");
    expect(reportsPage).toContain("reportsDownloadHref");
    expect(readFileSync("src/components/dashboard/dashboard-modules.tsx", "utf8")).toContain(
      "DashboardReportsCta",
    );
  });

  it("uses a muted period cluster plus a custom stub, not Sporty Blue fill", () => {
    const html = renderToStaticMarkup(
      createElement(ReportsBody, {
        period: parseReportsPeriod("all", now),
        options: reportsPeriodOptions(now, []),
        userIds: [],
        users: [],
        downloadHref: null,
        showUserScope: true,
        hero: emptyHero(),
        composition: [],
        titles: [],
        platforms: [],
        userRows: [],
        territories: [],
        detail: [],
      }),
    );
    expect(html).toContain("data-reports-period-cluster");
    expect(html).toContain('data-reports-period-chip="all"');
    expect(html).toContain('data-reports-period-chip="year"');
    expect(html).toContain("data-reports-period-custom");
    expect(html).toContain(REPORTS_PAGE.customStub);
    expect(html).toContain(HOUSE_SEGMENTED_ITEM_BASE_CLASS);
    expect(html).toContain(HOUSE_SEGMENTED_ITEM_ON_CLASS);
    expect(html).toContain("data-segmented-thumb");
    expect(HOUSE_SEGMENTED_ITEM_BASE_CLASS).not.toContain("bg-accent");
    expect(html).toContain("data-reports-period-trigger");
    expect(html).not.toContain("<select");
    const sheet = renderToStaticMarkup(
      createElement(ReportsControls, {
        period: parseReportsPeriod("all", now),
        options: reportsPeriodOptions(now, []),
        userIds: [],
        users: [],
        downloadHref: null,
        periodSheetOpen: true,
      }),
    );
    expect(sheet).toContain("data-reports-period-sheet");
    expect(sheet).toContain("data-reports-period-custom");
    expect(sheet).toContain("data-reports-period-group-label");
    expect(sheet).toContain(REPORTS_PAGE.year);
    expect(sheet).toContain(REPORTS_PAGE.quarter);
    expect(sheet).toContain(REPORTS_PAGE.month);
  });

  it("keeps admin user scope as All activity plus typeahead multi-select", () => {
    const html = renderToStaticMarkup(
      createElement(ReportsControls, {
        period: parseReportsPeriod("all", now),
        options: reportsPeriodOptions(now, []),
        userIds: ["u1"],
        users: [
          { id: "u1", label: "Maya Chen" },
          { id: "u2", label: "Jordan Lee" },
        ],
        downloadHref: null,
        userScopeOpen: true,
      }),
    );
    expect(html).toContain("data-reports-user");
    expect(html).toContain("data-reports-user-panel");
    expect(html).toContain("data-reports-user-typeahead");
    expect(html).toContain("data-reports-user-clear");
    expect(html).toContain(REPORTS_PAGE.findUser);
    expect(html).toContain(REPORTS_PAGE.clearScope);
    expect(html).toContain("Maya Chen");
    expect(html).toContain("Jordan Lee");
    expect(html).toContain('<input');
  });

  it("keeps Download primary only for a concrete exportable period", () => {
    const off = renderToStaticMarkup(
      createElement(ReportsBody, {
        period: parseReportsPeriod("all", now),
        options: reportsPeriodOptions(now, []),
        userIds: [],
        users: [],
        downloadHref: null,
        showUserScope: true,
        hero: emptyHero(),
        composition: [],
        titles: [],
        platforms: [],
        userRows: [],
        territories: [],
        detail: [],
      }),
    );
    const on = renderToStaticMarkup(
      createElement(ReportsBody, {
        period: parseReportsPeriod("2026-08", now),
        options: reportsPeriodOptions(now, [{ year: 2026, month: 8 }]),
        userIds: [],
        users: [],
        downloadHref: "/reports/p-closed/export?format=pdf",
        showUserScope: true,
        hero: emptyHero(),
        composition: [],
        titles: [],
        platforms: [],
        userRows: [],
        territories: [],
        detail: [],
      }),
    );
    expect(off).toContain("data-reports-download-off");
    expect(on).toContain("data-reports-download");
    expect(on).toContain(REPORTS_DOWNLOAD_CLASS);
    expect(REPORTS_DOWNLOAD_CLASS).toContain("bg-accent");
  });

  it("renders hero $, composition, fuller chart, ranked 24Frame nouns, and a detail table", () => {
    const html = renderToStaticMarkup(
      createElement(ReportsBody, {
        period: parseReportsPeriod("all", now),
        options: reportsPeriodOptions(now, []),
        userIds: [],
        users: [{ id: "u1", label: "Maya" }],
        downloadHref: null,
        showUserScope: true,
        hero: {
          totalCents: 0,
          asOf: REPORTS_PAGE.allTime,
          updated: null,
          compare: null,
          points: [],
        },
        composition: [],
        titles: [],
        platforms: [],
        userRows: [],
        territories: [],
        detail: [],
      }),
    );
    expect(html).toContain("$0.00");
    expect(REPORTS_PAGE.revenue).toBe(DASHBOARD_ADMIN.revenue);
    expect(REPORTS_PAGE.series).toBe(DASHBOARD_ADMIN.revenue);
    expect(html).toContain(REPORTS_PAGE.revenue);
    expect(html).toContain("data-reports-composition");
    expect(html).toContain("data-reports-series");
    expect(REPORTS_CHART_HEIGHT_DESKTOP).toBe(280);
    expect(html).toContain(REPORTS_PAGE.topTitles);
    expect(html).toContain(REPORTS_PAGE.platforms);
    expect(html).toContain(REPORTS_PAGE.users);
    expect(html).toContain(REPORTS_PAGE.territories);
    expect(html).toContain("data-reports-detail");
    expect(html).toContain(DASHBOARD_HOME.viewAll);
    expect(html).not.toContain("Top works");
    expect(html).not.toContain("data-dashboard-do-next");
    expect(html).not.toContain("Needs attention");
    expect(html).toContain(REPORTS_TITLE_DESKTOP_CLASS);
    expect(html).not.toContain("min-h-[calc(340px+2*var(--space-6))]");
    expect(parseDashboardPeriod("ytd", now).kind).toBe("ytd");
  });

  it("bans the foreign brand word from Reports source comments", () => {
    for (const path of REPORTS_SRC_PATHS) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(/coinbase/i);
    }
  });
});
