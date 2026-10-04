import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardRankedRows, DashboardTopPerforming } from "@/components/dashboard/dashboard-ranked";
import { DashboardReportsCta } from "@/components/dashboard/dashboard-modules";
import { DashboardHomePillLink } from "@/components/dashboard/dashboard-home";
import {
  DASHBOARD_CARD_PAD,
  DASHBOARD_RELATED_GAP_CLASS,
  DASHBOARD_SECTION_AIR_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
  DASHBOARD_TITLE_DESKTOP_CLASS,
  DASHBOARD_TITLE_MOBILE_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS,
  DASHBOARD_TOP_PILL_BUTTON_ON_CLASS,
  DASHBOARD_PERIOD_TRIGGER_CLASS,
  DASHBOARD_PERIOD_OPTION_SELECTED_CLASS,
  DASHBOARD_RANKED_MARK_CLASS,
  DASHBOARD_RANKED_META_CLASS,
  DASHBOARD_RANKED_NAME_CLASS,
  DASHBOARD_MONEY_CLASS,
} from "@/lib/dashboard-craft";
import { DASHBOARD_HOME } from "@/lib/dashboard-home";
import {
  HOUSE_FILTER_OFF_CLASS,
  HOUSE_FILTER_ON_CLASS,
  HOUSE_RAIL_ACTIVE_CLASS,
  HOUSE_RAIL_IDLE_CLASS,
  HOUSE_SEARCH_PILL_CLASS,
} from "@/lib/house-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const tokens = readFileSync("src/app/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const craft = readFileSync("src/lib/dashboard-craft.ts", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const lead = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const sideNav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
const search = readFileSync("src/components/chrome/house-page-search.tsx", "utf8");
const housePageSelect = readFileSync("src/lib/house-page-select.ts", "utf8");
const period = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
const page = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");

describe("Coinbase shell rematch — Adam miss list v1", () => {
  it("keeps the page canvas on house white and cards on shared 16 radius", () => {
    expect(tokens).toMatch(/--bg:\s*#ffffff;/);
    expect(tokens).toMatch(/--surface:\s*#ffffff;/);
    expect(tokens).toMatch(/--surface-muted:\s*#f4f4f6;/);
    expect(tokens).toMatch(/--text:\s*#0A0B0D;/);
    expect(tokens).toMatch(/--accent:\s*#1769ff;/);
    expect(tokens).toMatch(/--radius-lg:\s*16px;/);
    expect(tokens).not.toMatch(/--radius-lg:\s*14px;/);
    expect(globals).toMatch(/\.card-surface\s*\{[\s\S]*?border-radius:\s*var\(--radius-lg\)/);
    expect(globals).toMatch(/\.card-surface\s*\{[\s\S]*?box-shadow:\s*none/);
    expect(DASHBOARD_RELATED_GAP_CLASS).toBe("gap-[var(--space-2)]");
    expect(DASHBOARD_CARD_PAD).toBe("px-[var(--space-4)] py-[var(--space-4)]");
    expect(DASHBOARD_SECTION_AIR_CLASS).toBe("gap-[var(--space-6)]");
    expect(tokens).toMatch(/--content-inset:\s*48px;/);
    expect(craft).toContain("shadow-none");
    expect(craft).not.toContain("shadow-lg");
    expect(tokens).not.toMatch(/\[data-dashboard/);
    expect(globals).not.toMatch(/\[data-dashboard[^\]]*\]\s*\{/);
  });

  it("paints the active dest rail as a muted row with an accent tile; Settings keeps the tint pill", () => {
    expect(sideNav).toContain("HOUSE_RAIL_ITEM_CLASS");
    expect(sideNav).toContain("HOUSE_DEST_RAIL_ACTIVE_CLASS");
    expect(sideNav).toContain("HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS");
    expect(sideNav).toContain("HOUSE_DEST_RAIL_IDLE_CLASS");
    expect(HOUSE_RAIL_ACTIVE_CLASS).toBe("bg-accent-wash text-accent-ink");
    expect(HOUSE_RAIL_IDLE_CLASS).toBe("text-ink hover:bg-surface-muted");
    expect(HOUSE_RAIL_IDLE_CLASS).not.toContain("font-normal");
    expect(sideNav).not.toContain("font-normal text-ink-2");
    expect(tokens).toContain("--accent-wash:");
    expect(lead).toContain("<BrandLogo />");
    expect(shell).not.toContain("BrandWordmark");
    expect(lead).not.toContain("BrandWordmark");
    expect(sideNav).not.toContain("BrandWordmark");
  });

  it("keeps Search a quiet #F4F4F6 pill and page titles black sentence-case", () => {
    expect(search).toContain("HOUSE_SEARCH_PILL_CLASS");
    expect(search).toContain("placeholder:text-ink-3");
    expect(HOUSE_SEARCH_PILL_CLASS).toBe("rounded-full border-0 bg-surface-muted");
    expect(search).not.toContain("bg-surface pl-8");
    expect(shell).not.toContain("SearchField");
    expect(lead).not.toContain('presentation="sheet" tone="pill"');
    expect(lead).toContain('presentation="pills"');
    expect(lead).toContain('presentation="waffle"');
    expect(lead).not.toContain('tone="pill"');
    expect(DASHBOARD_TITLE_DESKTOP_CLASS).toContain("t-title");
    expect(DASHBOARD_TITLE_DESKTOP_CLASS).toContain("text-ink");
    expect(DASHBOARD_TITLE_DESKTOP_CLASS).not.toContain("t-label");
    expect(DASHBOARD_TITLE_MOBILE_CLASS).toContain("t-heading");
    expect(DASHBOARD_TITLE_MOBILE_CLASS).toContain("text-ink");
    expect(DASHBOARD_SECTION_TITLE_CLASS).toBe("t-heading text-ink");
  });

  it("reserves Sporty Blue fill for CTA / rail wash / links — period is HousePageSelect", () => {
    expect(DASHBOARD_TOP_PILL_BUTTON_ON_CLASS).toBe("text-white");
    expect(DASHBOARD_TOP_PILL_BUTTON_OFF_CLASS).toBe("text-ink-2");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).toContain("bg-surface-muted");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).not.toContain("bg-accent");
    expect(DASHBOARD_PERIOD_OPTION_SELECTED_CLASS).toBe("bg-surface-muted");
    expect(existsSync("src/components/layout/status-filter.tsx")).toBe(false);
    expect(period).toContain("HousePageSelect");
    expect(period).not.toContain("status-filter");
    expect(housePageSelect).toContain("HOUSE_PERIOD_SELECTED_CLASS");
    expect(housePageSelect).toMatch(/Dashboard All time/);
    expect(HOUSE_FILTER_ON_CLASS).toBe("bg-ink text-surface");
    expect(HOUSE_FILTER_OFF_CLASS).toBe("bg-surface-muted text-ink");
    const chart = readFileSync("src/components/dashboard/dashboard-revenue-chart.tsx", "utf8");
    expect(chart).toContain('className="block text-accent"');
    expect(chart).not.toMatch(/#[0-9a-fA-F]{6}/);
  });

  it("keeps the register spine and rematches ranked rows to the quiet grade", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardTopPerforming, {
        titles: [
          {
            id: "t1",
            title: "Winter Light (Theatrical)",
            status: "live",
            created_at: "2026-09-02T00:00:00.000Z",
            count: 3,
          },
        ],
        platforms: [{ name: "Window A", count: 4 }],
        territories: [{ name: "US", count: 4 }],
      }),
    );
    const list = renderToStaticMarkup(
      createElement(DashboardRankedRows, {
        rows: [{ key: "a", label: "Winter Light (Theatrical)", count: 3 }],
        mode: "list",
      }),
    );
    expect(html).toContain("data-dashboard-top-performing");
    expect(html).toContain("data-dashboard-view-alts");
    expect(html).toContain("data-dashboard-view-all-arrow");
    expect(html).toContain(DASHBOARD_HOME.topTitles);
    expect(html).toContain(DASHBOARD_HOME.topPlatforms);
    expect(html).toContain(DASHBOARD_HOME.topTerritories);
    expect(html).not.toContain(DASHBOARD_HOME.topPerforming);
    expect(html).not.toContain("data-dashboard-top-pills");
    expect(list).toContain('data-dashboard-ranked-grammar="grade"');
    expect(list).toContain("data-dashboard-ranked-mark");
    expect(list).toContain(DASHBOARD_RANKED_MARK_CLASS);
    expect(list).toContain(DASHBOARD_RANKED_NAME_CLASS);
    expect(list).toContain("Winter Light");
    expect(list).toContain("(Theatrical)");
    expect(list).toContain(DASHBOARD_RANKED_META_CLASS);
    expect(list).toContain(DASHBOARD_MONEY_CLASS);
    expect(list).not.toContain("data-dashboard-ranked-bar");
    expect(page).toContain("DashboardTopPerforming");
    expect(page).not.toContain("Social");
    expect(page).not.toContain("Education");
  });

  it("keeps one filled Sporty Blue CTA on standard home and Reports as a text CTA", () => {
    const reports = renderToStaticMarkup(createElement(DashboardReportsCta));
    const catalog = renderToStaticMarkup(
      createElement(
        DashboardHomePillLink,
        { href: "/attention" } as { href: string; children: string },
        DASHBOARD_HOME.catalogHealthCta,
      ),
    );
    expect(reports).toContain("text-accent");
    expect(reports).not.toContain("bg-accent");
    expect(catalog).toContain("bg-accent");
    expect(page).toContain("DashboardHomePillLink");
    expect(page).toContain("isAdmin ? null");
    expect(page).toContain("<DashboardReportsCta />");
  });
});
