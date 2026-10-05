import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardAdminHero } from "@/components/dashboard/dashboard-admin-hero";
import {
  DASHBOARD_ADMIN,
  parseDashboardPeriod,
  type DashboardActivityRow,
} from "@/lib/dashboard-admin";
import {
  DASHBOARD_ADMIN_HERO_ATTENTION_CLASS,
  DASHBOARD_ADMIN_HERO_REVENUE_CLASS,
  DASHBOARD_ADMIN_OVERVIEW_CLASS,
  DASHBOARD_ADMIN_TOP_ROW_CELL_CLASS,
  DASHBOARD_CARD_CLASS,
} from "@/lib/dashboard-craft";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const now = new Date("2026-09-16T12:00:00.000Z");
const craft = readFileSync("src/lib/dashboard-craft.ts", "utf8");
const hero = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");

function renderHero(rows: DashboardActivityRow[]) {
  return renderToStaticMarkup(
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
      activity: rows,
    }),
  );
}

describe("Dashboard top-row height pair (Net | Recent activity)", () => {
  it("G1/G6 — one shared row/cell/card contract, not an activity-only height hack", () => {
    expect(DASHBOARD_ADMIN_OVERVIEW_CLASS).not.toMatch(/(^|\s)items-stretch(\s|$)/);
    expect(DASHBOARD_ADMIN_TOP_ROW_CELL_CLASS).toBe("h-full min-h-0 w-full");
    expect(hero).not.toMatch(/min-h-\[/);
    expect(hero).not.toMatch(/\bh-\[/);
    expect(craft).not.toMatch(/DASHBOARD_ADMIN_HERO_ATTENTION_CLASS[\s\S]{0,80}min-h-/);
  });

  it("G2/G4 — Recent activity content stays top-aligned; no filler charts or fake rows", () => {
    const html = renderHero([
      {
        id: "title:a",
        title: "Winter Light",
        href: "/titles/24F-0001234",
        at: "2026-09-12T15:04:00.000Z",
        count: 1,
        detail: DASHBOARD_ADMIN.titleAdded,
        actorId: null,
        actor: { id: null, initial: "?" },
        kind: "title_added",
      },
    ]);
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).toContain(DASHBOARD_ADMIN.titleAdded);
    expect(html).toContain("Winter Light");
    expect(html).toContain("data-dashboard-activity-actor");
    expect(html).not.toContain('data-dashboard-module="attention"');
    expect(html).not.toContain("data-dashboard-attention-filler");
    expect(hero).not.toContain("justify-center");
    expect(hero).not.toContain("justify-end");
    expect(hero).not.toContain("mt-auto");
  });

  it("G3 — empty Recent activity still uses the shared fill contract (no shrink-wrap class)", () => {
    const html = renderHero([]);
    expect(html).toContain("data-dashboard-activity-empty");
    expect(html).toContain(DASHBOARD_ADMIN.activityEmpty);
    expect(html).not.toContain("data-dashboard-activity-actor");
    expect(html).toContain(DASHBOARD_ADMIN_OVERVIEW_CLASS);
    expect(html).toContain(DASHBOARD_ADMIN_HERO_REVENUE_CLASS);
    expect(html).toContain(DASHBOARD_ADMIN_HERO_ATTENTION_CLASS);
    expect(html).toContain(DASHBOARD_CARD_CLASS);
    const activityAt = html.indexOf('data-dashboard-module="recent-activity"');
    const revenueAt = html.indexOf("data-dashboard-revenue");
    expect(activityAt).toBeGreaterThan(-1);
    expect(revenueAt).toBeGreaterThan(-1);
    expect(html.slice(activityAt, activityAt + 280)).toContain("h-full");
    expect(html.slice(revenueAt, revenueAt + 280)).toContain("h-full");
  });

  it("G5 — phone stack stretches full width; equal-height stretch stays lg-only", () => {
    expect(htmlHasUnprefixedItemsStretch(DASHBOARD_ADMIN_OVERVIEW_CLASS)).toBe(false);
    expect(DASHBOARD_ADMIN.revenue).toBe("Revenue");
  });
});

function htmlHasUnprefixedItemsStretch(classes: string): boolean {
  return classes.split(/\s+/).includes("items-stretch");
}
