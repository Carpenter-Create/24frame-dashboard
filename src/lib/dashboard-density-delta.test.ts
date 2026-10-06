import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardAdminHero } from "@/components/dashboard/dashboard-admin-hero";
import { DashboardAdminControls } from "@/components/dashboard/dashboard-admin-controls";
import {
  DASHBOARD_ADMIN,
  dashboardHeroMoney,
  dashboardPeriodOptions,
  parseDashboardPeriod,
} from "@/lib/dashboard-admin";
import {
  DASHBOARD_ADMIN_CHROME_CLASS,
  DASHBOARD_CHART_EMPTY_CLASS,
  DASHBOARD_HERO_ASOF_CLASS,
  DASHBOARD_HERO_TO_CHART_GAP_CLASS,
  DASHBOARD_PERIOD_SHEET_HOST_CLASS,
  DASHBOARD_STANDARD_STACK_CLASS,
} from "@/lib/dashboard-craft";
import { DASHBOARD_FIXTURE } from "@/lib/dashboard-fixture";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const now = new Date("2026-09-16T12:00:00.000Z");
const options = dashboardPeriodOptions(now, [
  { year: 2025, month: 12 },
  { year: 2026, month: 8 },
]);
const heroSrc = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");
const controlsSrc = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
const craftSrc = readFileSync("src/lib/dashboard-craft.ts", "utf8");
const chartSrc = readFileSync("src/components/dashboard/dashboard-revenue-chart.tsx", "utf8");

function emptyHeroHtml() {
  return renderToStaticMarkup(
    createElement(DashboardAdminHero, {
      period: parseDashboardPeriod("all", now),
      options,
      hero: {
        totalCents: null,
        asOf: "All time",
        updated: null,
        compare: null,
        points: [],
      },
      activity: [],
      periodMenuOpen: true,
    }),
  );
}

function revenueStat(html: string): string {
  const match = html.match(/data-dashboard-stat="revenue"[^>]*>([^<]*)/);
  return match?.[1] ?? "";
}

describe("Aggregation Dashboard density delta after #332", () => {
  it("binds empty hero to tabular $0.00 — never the essay in the metric slot", () => {
    const html = emptyHeroHtml();
    const stat = revenueStat(html);
    expect(dashboardHeroMoney(null)).toBe("$0.00");
    expect(stat).toBe("$0.00");
    expect(stat).not.toContain(DASHBOARD_ADMIN.revenueEmpty);
    expect(html).toMatch(/data-dashboard-stat="revenue"[^>]*t-display t-data/);
    expect(html).not.toMatch(/data-dashboard-stat="revenue"[^>]*>No revenue/);
    expect(heroSrc).not.toContain("DASHBOARD_ADMIN.revenueEmpty");
    expect(heroSrc).toContain("dashboardHeroMoney");
    expect(html).toContain("data-dashboard-revenue-asof");
    expect(html).toContain("As of All time · No closed statement.");
    expect(html).toContain(DASHBOARD_HERO_ASOF_CLASS);
    expect(html).not.toContain("data-dashboard-fixture-banner");
  });

  it("keeps a compact empty chart slot — no tall theater, no essay in the well", () => {
    const html = emptyHeroHtml();
    expect(html).toContain("data-dashboard-chart-empty");
    expect(html).toContain("data-dashboard-chart-empty-slot");
    expect(html).toContain(DASHBOARD_CHART_EMPTY_CLASS);
    expect(DASHBOARD_CHART_EMPTY_CLASS).toContain("h-[var(--space-12)]");
    expect(DASHBOARD_CHART_EMPTY_CLASS).not.toContain("h-[176px]");
    expect(DASHBOARD_CHART_EMPTY_CLASS).not.toContain("h-[200px]");
    expect(chartSrc).not.toContain("DASHBOARD_ADMIN.chartEmpty");
    expect(html).not.toMatch(/data-dashboard-revenue-chart[\s\S]*No closed statement for this period/);
  });

  it("opens phone Period as one Fidelity-calm bottom sheet with the full list", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardAdminControls, {
        periodKey: "all",
        options,
        defaultOpen: true,
      }),
    );
    expect(html).toContain("data-dashboard-period-one");
    expect(html).toContain("data-dashboard-period-sheet");
    expect(html).toContain(DASHBOARD_PERIOD_SHEET_HOST_CLASS);
    expect(html).toContain("app-sheet-rise");
    expect(html).toContain(DASHBOARD_ADMIN.allTime);
    expect(html).toContain(DASHBOARD_ADMIN.ytd);
    expect(html).toContain('data-dashboard-period-group="year"');
    expect(html).toContain('data-dashboard-period-group="quarter"');
    expect(html).toContain('data-dashboard-period-group="month"');
    expect(html).toContain('data-dashboard-period-option="all"');
    expect(html).toContain('data-dashboard-period-option="ytd"');
    expect(html).not.toContain("data-dashboard-period-grains");
    expect(html).not.toContain("<select");
    expect(html.split("data-dashboard-period=").length - 1).toBe(1);
    expect(controlsSrc).toContain("data-dashboard-period-sheet");
    expect(controlsSrc).not.toContain("data-dashboard-period-grains");
  });

  it("removes Find-user from Dashboard on phone and md+", () => {
    const html = emptyHeroHtml();
    expect(html).not.toContain("data-dashboard-user");
    expect(html).not.toContain("data-dashboard-user-overflow");
    expect(html).not.toContain("data-dashboard-user-sheet");
    expect(html).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(html).not.toContain("FIND A USER ACCOUNT");
    expect(html).not.toContain(DASHBOARD_ADMIN.allCompany);
    expect(controlsSrc).not.toContain("DotsThree");
    expect(controlsSrc).not.toContain("DashboardUserField");
    expect(controlsSrc).not.toContain("data-dashboard-user");
    expect(controlsSrc).not.toContain("data-dashboard-user-overflow");
    expect(controlsSrc).not.toContain("data-dashboard-user-sheet");
    expect(controlsSrc).not.toContain("DASHBOARD_USER_FIELD_DESKTOP_CLASS");
    expect(craftSrc).not.toContain("DASHBOARD_USER_FIELD_DESKTOP_CLASS");
    expect(craftSrc).not.toContain("DASHBOARD_USER_OVERFLOW_CLASS");
    expect(craftSrc).not.toContain("DASHBOARD_USER_SHEET_HOST_CLASS");
    expect(heroSrc).not.toContain("users=");
    expect(heroSrc).not.toContain("userId");
  });

  it("locks air to 8 / 16 / 24 and page 48 — no fifth gutter", () => {
    expect(DASHBOARD_HERO_TO_CHART_GAP_CLASS).toBe("pt-[var(--space-4)]");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).toContain("gap-[var(--space-6)]");
    expect(DASHBOARD_STANDARD_STACK_CLASS).toBe("flex flex-col gap-[var(--space-12)]");
    expect(heroSrc).toContain("DASHBOARD_HERO_TO_CHART_GAP_CLASS");
    expect(craftSrc).not.toMatch(/gap-\[var\(--space-3\)\]/);
    expect(craftSrc).not.toMatch(/gap-\[var\(--space-5\)\]/);
    expect(craftSrc).not.toMatch(/gap-\[var\(--space-8\)\]/);
    expect(craftSrc).not.toMatch(/gap-\[var\(--space-10\)\]/);
    expect(craftSrc).not.toMatch(/gap-\[var\(--space-20\)\]/);
  });

  it("shows the Sample banner when the fixture is on — never silent fake $", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardAdminHero, {
        period: parseDashboardPeriod("all", now),
        options: [{ key: "all", label: "All time", group: "all" }],
        hero: {
          totalCents: 120_000_00,
          asOf: "All time",
          updated: "2026-07",
          compare: null,
          points: [
            { key: "2026-07", label: "2026-07", year: 2026, month: 7, netCents: 120_000_00 },
          ],
        },
        activity: [],
        fixture: true,
      }),
    );
    expect(html).toContain("data-dashboard-fixture-banner");
    expect(html).toContain(DASHBOARD_FIXTURE.banner);
    expect(html).toContain(DASHBOARD_FIXTURE.sampleMark);
    expect(revenueStat(html)).toContain("$120,000.00");
    expect(html).not.toContain(DASHBOARD_ADMIN.revenueEmpty);
  });
});
