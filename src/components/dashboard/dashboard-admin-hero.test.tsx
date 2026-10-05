import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DASHBOARD_ADMIN, parseDashboardPeriod } from "@/lib/dashboard-admin";
import { DASHBOARD_ACTIVITY_ROW_CLASS } from "@/lib/dashboard-craft";
import { DASHBOARD_FIXTURE } from "@/lib/dashboard-fixture";
import { dashboardJustInDate, dashboardJustInTime } from "@/lib/dashboard-home";
import { DashboardAdminHero, DashboardRecentActivity } from "./dashboard-admin-hero";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const now = new Date("2026-09-16T12:00:00.000Z");

const emptyActivity: never[] = [];

describe("DashboardAdminHero", () => {
  it("uses MetricCard stack and Top-works density without RL brand or export", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardAdminHero, {
        period: parseDashboardPeriod("all", now),
        options: [
          { key: "all", label: "All time", group: "all" },
          { key: "ytd", label: "YTD 2026", group: "ytd" },
          { key: "2026", label: "2026", group: "year" },
          { key: "Q32026", label: "Q3 2026", group: "quarter" },
          { key: "2026-09", label: "2026-09", group: "month" },
        ],
        hero: {
          totalCents: null,
          asOf: "All time",
          updated: null,
          compare: null,
          points: [],
        },
        activity: emptyActivity,
        periodMenuOpen: true,
      }),
    );
    expect(html).toContain("data-dashboard-admin-hero");
    expect(html).toContain("lg:grid-cols-5");
    expect(html).toContain("lg:items-stretch");
    expect(html).toContain("lg:col-span-3");
    expect(html).toContain("lg:col-span-2");
    expect(html).toContain("max-md:flex");
    expect(html).toContain("max-md:flex-col");
    expect(html).toContain("items-start");
    expect(html).toContain("data-dashboard-overview-revenue");
    expect(html).toContain("data-dashboard-overview-attention");
    expect(html.indexOf("data-dashboard-overview-revenue")).toBeLessThan(
      html.indexOf("data-dashboard-overview-attention"),
    );
    expect(html.indexOf("data-dashboard-revenue")).toBeLessThan(
      html.indexOf('data-dashboard-module="recent-activity"'),
    );
    expect(html).not.toContain('data-dashboard-module="licensing-status"');
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).not.toContain('data-dashboard-module="attention"');
    expect(html).toContain("data-dashboard-mobile-stack");
    expect(html).toContain("data-dashboard-title-mobile");
    expect(html).toContain("data-dashboard-title-desktop");
    expect(html).toMatch(/data-dashboard-title-desktop=""[^>]*>Aggregation</);
    expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>Acme</);
    expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>All time</);
    expect(html).not.toContain("data-dashboard-period-kicker");
    expect(html).toContain(DASHBOARD_ADMIN.revenue);
    expect(html).toContain(DASHBOARD_ADMIN.activity);
    expect(html).toContain(DASHBOARD_ADMIN.activity);
    expect(html).not.toContain("Recent account activity");
    expect(html).not.toContain("Licensing status");
    expect(html).not.toContain(">Attention<");
    expect(html).toContain("Aggregation");
    expect(html).not.toContain("Acme");
    expect(html).toContain("All time");
    expect(html).toContain("data-dashboard-period");
    expect(html).toContain("data-dashboard-period-menu");
    expect(html).toContain('data-dashboard-period-option="all"');
    expect(html).toContain('data-dashboard-period-option="ytd"');
    expect(html).not.toContain("data-dashboard-period-grains");
    expect(html).not.toContain("<select");
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain("shadow-none");
    expect(html).toMatch(/data-dashboard-stat="revenue"[^>]*t-display t-data/);
    expect(html).toContain("$0.00");
    expect(html).not.toContain(DASHBOARD_ADMIN.revenueEmpty);
    expect(html).not.toContain("data-dashboard-fixture-banner");
    expect(html).not.toContain("Export");
    expect(html).not.toContain("Royalogic");
  });

  it("labels fixture money when craft sample is on", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardAdminHero, {
        period: parseDashboardPeriod("all", now),
        options: [{ key: "all", label: "All time", group: "all" }],
        hero: {
          totalCents: 120_000_00,
          asOf: "All time",
          updated: "2026-07",
          compare: { text: "+10.0%", priorLabel: "2025-10" },
          points: [
            { key: "2026-07", label: "2026-07", year: 2026, month: 7, netCents: 120_000_00 },
          ],
        },
        activity: emptyActivity,
        fixture: true,
        periodMenuOpen: true,
      }),
    );
    expect(html).toContain("data-dashboard-fixture-banner");
    expect(html).toContain(DASHBOARD_FIXTURE.banner);
    expect(html).toContain(DASHBOARD_FIXTURE.sampleMark);
    expect(html).toContain("$120,000.00");
    expect(html).toMatch(/data-dashboard-stat="revenue"[^>]*t-display t-data/);
    expect(html).toContain("text-ink-3");
    expect(html).not.toContain("text-emerald");
    expect(html).not.toContain("text-rose");
    expect(html).toContain(DASHBOARD_ADMIN.activityEmpty);
    expect(html).toContain("data-dashboard-activity-empty");
    expect(html).not.toContain("Licensed");
  });

  it("renders Recent activity as social rows with actor and timestamp", () => {
    const at = "2026-09-02T15:04:00.000Z";
    const html = renderToStaticMarkup(
      createElement(DashboardRecentActivity, {
        items: [
          {
            id: "title:a",
            title: "Winter Light",
            href: "/titles/24F-0001234",
            at,
            count: 3,
            detail: DASHBOARD_ADMIN.titleAdded,
            actorId: "maya",
            actor: { id: "maya", initial: "M" },
            kind: "title_added",
          },
        ],
      }),
    );
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).toContain(DASHBOARD_ADMIN.activity);
    expect(html).toContain("Winter Light");
    expect(html).toContain(DASHBOARD_ADMIN.titleAdded);
    expect(html).not.toContain("data-dashboard-view-all");
    expect(html).not.toContain('href="/attention"');
    expect(html).toContain(DASHBOARD_ACTIVITY_ROW_CLASS);
    expect(html).toContain("data-dashboard-activity-actor");
    expect(html).toContain(">M<");
    expect(html).toContain("data-dashboard-activity-time");
    expect(html).toContain("data-dashboard-activity-clock");
    expect(html).toContain(dashboardJustInDate(at));
    expect(html).toContain(dashboardJustInTime(at));
    expect(html).toMatch(
      /data-dashboard-activity-clock="" class="block t-body-sm text-ink-3"/,
    );
    expect(html).not.toMatch(/data-dashboard-activity-clock=""[^>]*\bt-label\b/);
    expect(html).not.toContain("$");
  });

  it("renders title status and performance-report announcements, not findings", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardRecentActivity, {
        items: [
          {
            id: "title-status:a:2026-09-08T16:00:00.000Z",
            title: "Winter Light",
            href: "/titles/24F-0001234",
            at: "2026-09-08T16:00:00.000Z",
            count: 1,
            detail: "status updated to Approved",
            actorId: "sam",
            actor: { id: "sam", initial: "S" },
            kind: "title_status",
          },
          {
            id: "report:period-1",
            title: "",
            href: "/reports/period-1",
            at: "2026-09-01T12:00:00.000Z",
            count: 1,
            detail: DASHBOARD_ADMIN.performanceReportAvailable,
            actorId: null,
            actor: { id: null, initial: "?" },
            kind: "performance_report",
          },
        ],
      }),
    );
    expect(html).toContain("Winter Light");
    expect(html).toContain("status updated to Approved");
    expect(html.indexOf("Winter Light")).toBeLessThan(html.indexOf("status updated to Approved"));
    expect(html).toContain(DASHBOARD_ADMIN.performanceReportAvailable);
    expect(html).toContain('href="/reports/period-1"');
    expect(html).not.toContain("Synopsis is required.");
    expect(html).not.toContain('href="/attention"');
    expect(html).not.toContain("data-dashboard-view-all");
  });

  it("does not mount Recharts or RevenueTimeline on the admin hero", () => {
    const hero = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");
    const chart = readFileSync("src/components/dashboard/dashboard-revenue-chart.tsx", "utf8");
    const controls = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
    const page = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");
    const craft = readFileSync("src/lib/dashboard-craft.ts", "utf8");
    for (const src of [hero, chart, controls, page]) {
      expect(src).not.toContain("recharts");
      expect(src).not.toContain("RevenueTimeline");
      expect(src).not.toContain("royalogic");
      expect(src).not.toMatch(/#[Ff][Ff]|orange|emerald|rose/);
    }
    expect(controls).toContain("router.replace");
    expect(chart).toContain("strokeDasharray");
    expect(hero).toContain("DASHBOARD_ADMIN_OVERVIEW_CLASS");
    expect(hero).toContain("DASHBOARD_ADMIN_HERO_REVENUE_CLASS");
    expect(hero).toContain("DASHBOARD_ADMIN_HERO_ATTENTION_CLASS");
    expect(hero).toMatch(
      /data-dashboard-overview-revenue=""[\s\S]*data-dashboard-overview-attention=""/,
    );
    expect(hero).not.toMatch(
      /data-dashboard-overview-attention=""[\s\S]*data-dashboard-overview-revenue=""/,
    );
    expect(craft).toContain("lg:grid-cols-2");
    expect(craft).toContain("lg:grid-cols-5");
    expect(craft).toContain("lg:items-stretch");
    expect(craft).toContain("lg:col-span-3");
    expect(craft).toContain("lg:col-span-2");
    expect(craft).toContain("max-md:flex-col");
    expect(craft).toContain("md:flex-row");
    expect(craft).not.toContain("sm:flex-row");
    expect(page).toContain("DashboardAdminHero");
    expect(page).toContain("activity={adminActivity}");
    expect(page).not.toContain("DashboardRecentActivity");
    expect(page).not.toContain("buildAttentionGlance");
    expect(hero).toContain("DashboardRecentActivity");
  });
});
