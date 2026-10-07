import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardAdminHero, DashboardRecentActivity } from "@/components/dashboard/dashboard-admin-hero";
import { DashboardDoNext } from "@/components/dashboard/dashboard-home";
import { DashboardFindingsGlance, DashboardTopTitles } from "@/components/dashboard/dashboard-modules";
import { DASHBOARD_ADMIN, parseDashboardPeriod } from "@/lib/dashboard-admin";
import {
  DASHBOARD_CARD_PAD_HERO,
  DASHBOARD_CARD_PAD_LIST,
  DASHBOARD_DO_NEXT_SECONDARY_CLASS,
  DASHBOARD_HERO_DELTA_CLASS,
  DASHBOARD_HERO_VALUE_CLASS,
  DASHBOARD_KICKER_CLASS,
  DASHBOARD_MONEY_CLASS,
  DASHBOARD_PERIOD_TRIGGER_CLASS,
  DASHBOARD_RANKED_LIST_CLASS,
  DASHBOARD_ROW_CLASS,
  DASHBOARD_ROW_STACK_CLASS,
  DASHBOARD_ROW_TITLE_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/lib/dashboard-craft";
import { DASHBOARD_HOME } from "@/lib/dashboard-home";
import { HOUSE_PHONE_WRAP_CLASS, housePhoneForbidsTruncate } from "@/lib/house-phone-stack";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const now = new Date("2026-09-16T12:00:00.000Z");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const heroSrc = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");
const pageSrc = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");
const craftSrc = readFileSync("src/lib/dashboard-craft.ts", "utf8");

function adminHero(compare: boolean) {
  return renderToStaticMarkup(
    createElement(DashboardAdminHero, {
      period: parseDashboardPeriod("all", now),
      options: [
        { key: "all", label: "All time", group: "all" },
        { key: "ytd", label: "YTD 2026", group: "ytd" },
      ],
      hero: {
        totalCents: 120_000_00,
        asOf: "All time",
        updated: "2026-07",
        compare: compare ? { text: "+10.0%", priorLabel: "2025-10" } : null,
        points: [
          { key: "2026-07", label: "2026-07", year: 2026, month: 7, netCents: 120_000_00 },
        ],
      },
      activity: [],
      fixture: true,
      periodMenuOpen: true,
    }),
  );
}

describe("Dashboard Fidelity × Royalogic density", () => {
  it("keeps dominant $ with a quieter greyscale delta under — never green, never peer", () => {
    const html = adminHero(true);
    expect(html).toMatch(/data-dashboard-stat="revenue"[^>]*t-display t-data/);
    expect(DASHBOARD_HERO_VALUE_CLASS).toContain("t-data");
    expect(DASHBOARD_HERO_DELTA_CLASS).toBe("t-body-sm text-ink-3");
    expect(DASHBOARD_HERO_DELTA_CLASS).not.toContain("t-display");
    expect(DASHBOARD_HERO_DELTA_CLASS).not.toContain("t-title");
    expect(html).toContain("data-dashboard-revenue-compare");
    expect(html).toContain("data-dashboard-revenue-asof");
    expect(html.indexOf('data-dashboard-stat="revenue"')).toBeLessThan(
      html.indexOf("data-dashboard-revenue-compare"),
    );
    expect(html.indexOf("data-dashboard-revenue-compare")).toBeLessThan(
      html.indexOf("data-dashboard-revenue-asof"),
    );
    expect(html).toContain("text-ink-3");
    expect(html).not.toContain("text-emerald");
    expect(html).not.toContain("text-green");
    expect(html).not.toContain("text-rose");
    expect(heroSrc).not.toMatch(/emerald|text-green|#22c55e|#16a34a|#00[a-fA-F0-9]{4}/);
  });

  it("keeps Period as one calm selected control — no grain row, no display type", () => {
    const html = adminHero(false);
    expect(html).toContain("data-dashboard-period-one");
    expect(html).toContain(DASHBOARD_PERIOD_TRIGGER_CLASS);
    expect(html).not.toContain("data-dashboard-period-grains");
    expect(html.split("data-dashboard-period=").length - 1).toBe(1);
    expect(heroSrc).not.toContain("data-dashboard-period-grains");
    expect(pageSrc).not.toContain("data-dashboard-period-grains");
  });

  it("binds ink sentence-case section titles and right-aligned tabular money on modules", () => {
    const hero = adminHero(true);
    const top = renderToStaticMarkup(
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
    const doNext = renderToStaticMarkup(
      createElement(DashboardDoNext, {
        items: [{ id: "d1", title: "Draft Work", reason: null, status: "draft" }],
        secondary: true,
      }),
    );
    const findings = renderToStaticMarkup(
      createElement(DashboardFindingsGlance, { count: 1, isPartial: false }),
    );
    const activity = renderToStaticMarkup(
      createElement(DashboardRecentActivity, {
        items: [
          {
            id: "title:a",
            title: "Winter Light",
            href: "/titles/a",
            at: "2026-09-02T00:00:00.000Z",
            count: 3,
            detail: DASHBOARD_ADMIN.titleAdded,
            actorId: null,
            actor: { id: null, initial: "?" },
            kind: "title_added",
          },
        ],
      }),
    );

    expect(DASHBOARD_KICKER_CLASS).toBe("t-label text-ink-3");
    expect(hero).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_ADMIN.revenue}`);
    expect(activity).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_ADMIN.activity}`);
    expect(top).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.topTitles}`);
    expect(doNext).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.doNext}`);
    expect(findings).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.findingsGlance}`);
    expect(hero).not.toContain(`t-label text-ink-3">${DASHBOARD_ADMIN.revenue}`);
    expect(DASHBOARD_MONEY_CLASS).toContain("t-data");
    expect(DASHBOARD_MONEY_CLASS).toContain("text-right");
    expect(top).toContain(DASHBOARD_MONEY_CLASS);
  });

  it("locks related gap 8, card pad 16, section air 24, and dense hairline rows", () => {
    expect(DASHBOARD_CARD_PAD_LIST).toBe("px-[var(--space-4)] py-[var(--space-4)]");
    expect(DASHBOARD_CARD_PAD_HERO).toBe(DASHBOARD_CARD_PAD_LIST);
    expect(DASHBOARD_ROW_CLASS).toContain("min-h-10");
    expect(DASHBOARD_ROW_CLASS).toContain("py-[var(--space-2)]");
    expect(DASHBOARD_ROW_CLASS).toContain("px-[var(--space-4)]");
    // The stacked row is the Dashboard row plus the phone stack (house
    // gospel 2026-09-19; SoT auditor 2026-10-05, Home AI next): below md
    // the label wraps and the rest sits under it.
    expect(DASHBOARD_ROW_STACK_CLASS).toBe(
      `${DASHBOARD_ROW_CLASS} max-md:flex-col max-md:items-stretch max-md:justify-start max-md:gap-[var(--space-1)]`,
    );
    expect(DASHBOARD_ROW_TITLE_CLASS).toBe(`${HOUSE_PHONE_WRAP_CLASS} t-body-sm font-medium text-ink`);
    expect(housePhoneForbidsTruncate(DASHBOARD_ROW_STACK_CLASS)).toBe(true);
    expect(housePhoneForbidsTruncate(DASHBOARD_ROW_TITLE_CLASS)).toBe(true);
    expect(DASHBOARD_RANKED_LIST_CLASS).toContain("gap-[var(--space-2)]");
  });

  it("keeps compact Aggregation secondaries — no Markets, Do next not peer to hero", () => {
    const doNext = renderToStaticMarkup(
      createElement(DashboardDoNext, {
        items: [{ id: "d1", title: "Draft Work", reason: null, status: "draft" }],
        secondary: true,
      }),
    );
    expect(doNext).toContain("data-dashboard-do-next-secondary");
    expect(DASHBOARD_DO_NEXT_SECONDARY_CLASS).toContain("max-md:bg-transparent");
    expect(pageSrc).not.toContain("secondary={isAdmin}");
    expect(pageSrc).toContain("isAdmin ? null");
    expect(pageSrc).not.toMatch(/\bMarkets\b/);
    expect(heroSrc).not.toMatch(/\bMarkets\b/);
    expect(craftSrc).not.toMatch(/\bMarkets\b/);
    expect(pageSrc).not.toContain("data-dashboard-markets");
    expect(doNext).not.toContain("t-display");
    expect(doNext).not.toContain("data-dashboard-hero");
  });

  it("stays on the light house shell — no dark Fidelity port, no soft shadows, no green", () => {
    expect(tokens).toMatch(/--border:\s*#ecedf0;/);
    expect(craftSrc).toContain("shadow-none");
    expect(craftSrc).not.toContain("shadow-lg");
    expect(craftSrc).not.toContain("shadow-md");
    expect(pageSrc).not.toContain("bg-band");
    expect(heroSrc).not.toContain("bg-band");
    expect(heroSrc).not.toContain("dark:");
  });
});
