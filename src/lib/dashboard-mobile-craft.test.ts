import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DASHBOARD_ADMIN_CHROME_CLASS,
  DASHBOARD_ADMIN_HERO_ATTENTION_CLASS,
  DASHBOARD_ADMIN_HERO_REVENUE_CLASS,
  DASHBOARD_ADMIN_OVERVIEW_CLASS,
  DASHBOARD_ADMIN_STACK_CLASS,
  DASHBOARD_ADMIN_TOP_ROW_CELL_CLASS,
  DASHBOARD_MOBILE_BREAKPOINT_CLASS,
  DASHBOARD_CARD_PAD_HERO,
  DASHBOARD_CHART_FRAME_CLASS,
  DASHBOARD_CHART_HEIGHT_DESKTOP,
  DASHBOARD_CHART_HEIGHT_MOBILE,
  DASHBOARD_DO_NEXT_SECONDARY_CLASS,
  DASHBOARD_FIXTURE_BANNER_CLASS,
  DASHBOARD_PERIOD_SHEET_HOST_CLASS,
  DASHBOARD_TITLE_DESKTOP_CLASS,
  DASHBOARD_TITLE_MOBILE_CLASS,
} from "@/lib/dashboard-craft";

describe("company-admin Dashboard mobile craft", () => {
  it("locks phone composition to < md without reopening a peer $ collage", () => {
    expect(DASHBOARD_MOBILE_BREAKPOINT_CLASS).toBe("max-md");
    expect(DASHBOARD_ADMIN_OVERVIEW_CLASS).toContain("w-full");
    expect(DASHBOARD_ADMIN_OVERVIEW_CLASS).toContain("gap-[var(--space-6)]");
    expect(DASHBOARD_ADMIN_OVERVIEW_CLASS).not.toContain("md:grid-cols-5");
    expect(DASHBOARD_ADMIN_OVERVIEW_CLASS).not.toContain("sm:grid-cols-5");
    expect(DASHBOARD_ADMIN_STACK_CLASS).toContain("w-full");
    expect(DASHBOARD_ADMIN_STACK_CLASS).toContain("flex-col");
    expect(DASHBOARD_ADMIN_STACK_CLASS).not.toContain("items-start");
    expect(DASHBOARD_ADMIN_TOP_ROW_CELL_CLASS).toContain("w-full");
    expect(DASHBOARD_ADMIN_HERO_REVENUE_CLASS).toContain("w-full");
    expect(DASHBOARD_ADMIN_HERO_ATTENTION_CLASS).toContain("w-full");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).toContain("md:flex-row");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).not.toContain("sm:flex-row");
    expect(DASHBOARD_TITLE_MOBILE_CLASS).toContain("md:hidden");
    expect(DASHBOARD_TITLE_MOBILE_CLASS).not.toContain("t-label");
    expect(DASHBOARD_TITLE_DESKTOP_CLASS).toContain("max-md:hidden");
    expect(DASHBOARD_CARD_PAD_HERO).toContain("px-[var(--space-4)]");
    expect(DASHBOARD_CARD_PAD_HERO).toContain("py-[var(--space-4)]");
    expect(DASHBOARD_ADMIN_STACK_CLASS).toContain("gap-[var(--space-6)]");
    expect(DASHBOARD_ADMIN_STACK_CLASS).not.toContain("md:gap-[var(--space-12)]");
    expect(DASHBOARD_DO_NEXT_SECONDARY_CLASS).toContain("max-md:");
  });

  it("stretches the phone overview + stack to the content column — shared tokens only", () => {
    const hero = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");
    const page = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");
    const attention = readFileSync("src/components/dashboard/dashboard-attention.tsx", "utf8");
    const licensing = readFileSync("src/components/dashboard/dashboard-licensing-status.tsx", "utf8");
    const ranked = readFileSync("src/components/dashboard/dashboard-ranked.tsx", "utf8");
    expect(DASHBOARD_ADMIN_STACK_CLASS.split(/\s+/)).toEqual(
      expect.arrayContaining(["flex", "w-full", "flex-col"]),
    );
    expect(DASHBOARD_ADMIN_STACK_CLASS.split(/\s+/)).not.toContain("items-start");
    expect(hero).toContain("DASHBOARD_ADMIN_OVERVIEW_CLASS");
    expect(hero).toContain("DASHBOARD_ADMIN_STACK_CLASS");
    expect(hero).toContain("DASHBOARD_ADMIN_HERO_REVENUE_CLASS");
    expect(hero).toContain("DASHBOARD_ADMIN_HERO_ATTENTION_CLASS");
    expect(page).toContain("DASHBOARD_ADMIN_STACK_CLASS");
    expect(hero).toContain('data-dashboard-mobile-stack=""');
    for (const src of [attention, licensing, ranked]) {
      expect(src).not.toMatch(/className=\{[^}]*w-full/);
    }
  });

  it("keeps the scrub in the 160–200px band and full width on phone", () => {
    expect(DASHBOARD_CHART_HEIGHT_MOBILE).toBeGreaterThanOrEqual(160);
    expect(DASHBOARD_CHART_HEIGHT_MOBILE).toBeLessThanOrEqual(200);
    expect(DASHBOARD_CHART_HEIGHT_DESKTOP).toBe(240);
    expect(DASHBOARD_CHART_FRAME_CLASS).toContain("w-full");
    expect(DASHBOARD_CHART_FRAME_CLASS).toContain("h-[176px]");
    expect(DASHBOARD_CHART_FRAME_CLASS).toContain("md:h-[240px]");
  });

  it("keeps Find-user off Dashboard on phone and md+ and Period on a bottom sheet", () => {
    expect(DASHBOARD_PERIOD_SHEET_HOST_CLASS).toContain("md:hidden");
    expect(DASHBOARD_PERIOD_SHEET_HOST_CLASS).toContain("justify-end");
    const controls = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
    const craft = readFileSync("src/lib/dashboard-craft.ts", "utf8");
    expect(controls).toContain("data-dashboard-period-sheet");
    expect(controls).not.toContain("data-dashboard-user");
    expect(controls).not.toContain("data-dashboard-user-overflow");
    expect(controls).not.toContain("data-dashboard-user-sheet");
    expect(controls).not.toContain("Find a user account");
    expect(craft).not.toContain("DASHBOARD_USER_FIELD_DESKTOP_CLASS");
    expect(craft).not.toContain("max-md:hidden\" // user");
  });

  it("keeps Sample banner + populated fixture rules and kills RL / export / chips", () => {
    const hero = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");
    const controls = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
    const page = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");
    const chart = readFileSync("src/components/dashboard/dashboard-revenue-chart.tsx", "utf8");
    expect(DASHBOARD_FIXTURE_BANNER_CLASS).toContain("max-md:sticky");
    expect(hero).toContain("data-dashboard-fixture-banner");
    expect(page).toContain("dashboardFixtureActivity");
    expect(page).toContain("DASHBOARD_FIXTURE_PLATFORMS");
    for (const src of [hero, controls, page, chart]) {
      expect(src).not.toContain("data-dashboard-period-grains");
      expect(src).not.toContain("data-reports-download");
      expect(src).not.toContain("Export CSV");
      expect(src).not.toContain("recharts");
      expect(src).not.toContain("royalogic");
      expect(src).not.toMatch(/#[Ff][Ff]|orange|emerald|rose/);
    }
  });
});
