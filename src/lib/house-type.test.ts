import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardAdminHero } from "@/components/dashboard/dashboard-admin-hero";
import { DashboardOrgIdentity } from "@/components/dashboard/dashboard-home";
import { DASHBOARD_ADMIN, parseDashboardPeriod } from "@/lib/dashboard-admin";
import { DASHBOARD_FIXTURE } from "@/lib/dashboard-fixture";
import {
  DASHBOARD_FIXTURE_BANNER_CLASS,
  DASHBOARD_PERIOD_TRIGGER_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
} from "@/lib/dashboard-craft";
import { HOUSE_RAIL_ITEM_CLASS } from "@/lib/house-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const tokens = readFileSync("src/app/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");

const DASHBOARD_CHROME_PATHS = [
  "src/app/tokens.css",
  "src/app/globals.css",
  "src/lib/dashboard-craft.ts",
  "src/app/(app)/aggregation/dashboard/page.tsx",
  ...readdirSync("src/components/dashboard")
    .filter((name) => name.endsWith(".ts") || name.endsWith(".tsx"))
    .map((name) => join("src/components/dashboard", name)),
];

const BANNED_ARBITRARY_PX = /text-\[\d+px\]/;
const BODY_400_DRIFT = /\bt-body(?:-sm)?\s+font-normal\b|\bfont-normal\s+t-body(?:-sm)?\b/;
const TITLE_500_DRIFT = /\bt-title\s+font-(?:medium|semibold)\b|\bfont-(?:medium|semibold)\s+t-title\b/;

const HOUSE_ROLE_PATHS = [
  "src/app/tokens.css",
  "src/app/globals.css",
  "src/lib/dashboard-craft.ts",
  "src/lib/house-shell.ts",
  "src/lib/house-sheet.ts",
  "src/lib/settings.ts",
  "src/lib/reports-craft.ts",
  "src/lib/workspace-switcher.ts",
  "src/lib/account-sheet.ts",
];

describe("house type ladder", () => {
  it("locks the shared rem ladder to 13 / 15 / 17 / 20 / 28 / 56", () => {
    // The ladder values are pinned once in src/app/tokens.test.ts; this lock keeps the old ladders out.
    expect(tokens).not.toMatch(/--text-xs:\s*0\.75rem;/);
    expect(tokens).not.toMatch(/--text-xs:\s*0\.6875rem;/);
    expect(tokens).not.toMatch(/--text-base:\s*0\.9375rem;/);
    expect(tokens).not.toMatch(/--text-title:\s*1\.5rem;/);
    expect(tokens).not.toMatch(/--text-title:\s*1\.25rem;/);
    expect(tokens).not.toMatch(/--text-hero:\s*3rem;/);
    expect(tokens).not.toMatch(/--text-hero:\s*2\.5rem;/);
    expect(tokens).not.toMatch(/12 \/ 13 \/ 15 \/ 17 \/ 24 \/ 48/);
    expect(tokens).not.toMatch(/11 \/ 12 \/ 13 \/ 15 \/ 20 \/ 40/);
    expect(tokens).not.toMatch(/title→20|hero→40|title->20|hero->40/);
  });

  it("is house-shared in tokens.css / globals .t-* — not a Dashboard-only scale", () => {
    expect(globals).toContain('@import "./tokens.css"');
    expect(tokens).toMatch(/Aggregation · Social · Education/);
    expect(tokens).not.toMatch(/\[data-dashboard[^\]]*\]/);
    expect(globals).not.toMatch(/\[data-dashboard[^\]]*\]\s*\{[^}]*--text-/);
    expect(readdirSync("src/app").some((name) => /dashboard.*\.(css)$/i.test(name))).toBe(false);
    expect(readdirSync("src/components/dashboard").some((name) => name.endsWith(".css"))).toBe(
      false,
    );
  });
});

describe("house type roles", () => {
  it("locks display / title / label / body weights, tracking, and leading", () => {
    // Adam 2026-09-19 Coinbase-pop A3 — title 480 · body 420 (pre-A delta).
    // Display 600 · heading/subhead 500 stay from A2. A/A2 600/500 were
    // interim body/title SoT — ban them here.
    // Pass A4: title tracking -0.028em / leading 1.1; display -0.042em /
    // leading 1.05 + tnum/kern; heading/subhead -0.02em. Geist stays.
    expect(tokens).toMatch(/--type-title-weight:\s*480;/);
    expect(tokens).toMatch(/--type-body-weight:\s*420;/);
    expect(tokens).not.toMatch(/--type-title-weight:\s*600;/);
    expect(tokens).not.toMatch(/--type-body-weight:\s*500;/);
    expect(tokens).not.toMatch(/--type-body-weight:\s*400;/);
    expect(tokens).toMatch(/--tracking-tight:\s*-0\.02em;/);
    expect(tokens).toMatch(/--tracking-title:\s*-0\.028em;/);
    expect(tokens).toMatch(/--tracking-display:\s*-0\.042em;/);
    expect(tokens).toMatch(/--tracking-rail:\s*-0\.01em;/);

    expect(globals).toMatch(
      /\.t-display\s*\{[\s\S]*?font-size:\s*var\(--text-hero\)[\s\S]*?font-weight:\s*600[\s\S]*?line-height:\s*1\.05[\s\S]*?letter-spacing:\s*var\(--tracking-display\)[\s\S]*?font-variant-numeric:\s*tabular-nums[\s\S]*?font-feature-settings:\s*"tnum" 1, "kern" 1/,
    );
    expect(globals).toMatch(
      /\.t-title\s*\{[\s\S]*?font-weight:\s*var\(--type-title-weight\)[\s\S]*?line-height:\s*1\.1[\s\S]*?letter-spacing:\s*var\(--tracking-title\)/,
    );
    expect(globals).toMatch(
      /\.t-section\s*\{[\s\S]*?font-weight:\s*var\(--type-title-weight\)[\s\S]*?line-height:\s*1\.1[\s\S]*?letter-spacing:\s*var\(--tracking-title\)/,
    );
    expect(globals).toMatch(
      /\.t-statement\s*\{[\s\S]*?font-weight:\s*var\(--type-title-weight\)[\s\S]*?line-height:\s*1\.1[\s\S]*?letter-spacing:\s*var\(--tracking-title\)/,
    );
    expect(globals).toMatch(
      /\.t-label\s*\{[\s\S]*?font-weight:\s*600[\s\S]*?letter-spacing:\s*0\.12em[\s\S]*?text-transform:\s*uppercase/,
    );
    expect(globals).toMatch(
      /\.t-heading\s*\{[\s\S]*?font-weight:\s*500[\s\S]*?letter-spacing:\s*var\(--tracking-tight\)/,
    );
    expect(globals).toMatch(
      /\.t-subhead\s*\{[\s\S]*?font-weight:\s*500[\s\S]*?letter-spacing:\s*var\(--tracking-tight\)/,
    );
    expect(globals).toMatch(/\.t-body\s*\{[\s\S]*?font-weight:\s*var\(--type-body-weight\)/);
    expect(globals).toMatch(/\.t-body-sm\s*\{[\s\S]*?font-weight:\s*var\(--type-body-weight\)/);
    expect(globals).toMatch(/\.t-lead\s*\{[\s\S]*?font-weight:\s*var\(--type-body-weight\)/);
    expect(globals).toMatch(
      /^body\s*\{[\s\S]*?font-weight:\s*var\(--type-body-weight\)/m,
    );
    expect(globals).toMatch(/\.t-data\s*\{[\s\S]*?font-variant-numeric:\s*tabular-nums/);
    expect(globals).toMatch(
      /\.t-display\.t-data\s*\{[\s\S]*?letter-spacing:\s*var\(--tracking-display\)/,
    );
    expect(globals).toMatch(
      /\.t-rail\s*\{[\s\S]*?letter-spacing:\s*var\(--tracking-rail\)/,
    );
    expect(globals).not.toMatch(/\.t-rail\s*\{[^}]*font-weight:/);
    expect(globals).toMatch(
      /@media \(max-width: 767px\)\s*\{\s*\.t-display\s*\{[\s\S]*?font-size:\s*var\(--text-title\)/,
    );
    expect(globals).not.toMatch(/\.t-display\s*\{[^}]*font-weight:\s*700/);
    expect(globals).not.toMatch(/\.t-display\s*\{[^}]*font-weight:\s*500/);
    expect(globals).not.toMatch(/\.t-title\s*\{[^}]*font-weight:\s*500/);
    expect(globals).not.toMatch(/\.t-section\s*\{[^}]*font-weight:\s*500/);
    expect(globals).not.toMatch(/\.t-statement\s*\{[^}]*font-weight:\s*500/);
    expect(globals).not.toMatch(/\.t-heading\s*\{[^}]*font-weight:\s*600/);
    expect(globals).not.toMatch(/\.t-subhead\s*\{[^}]*font-weight:\s*600/);
    expect(globals).not.toMatch(/\.t-body\s*\{[^}]*font-weight:\s*400/);
    expect(globals).not.toMatch(/\.t-body-sm\s*\{[^}]*font-weight:\s*400/);
    expect(globals).not.toMatch(/\.t-lead\s*\{[^}]*font-weight:\s*400/);
    expect(globals).not.toMatch(/font-variation-settings/);
  });

  it("locks light-mode ink and body subpixel smoothing (Coinbase-pop A)", () => {
    expect(tokens).toMatch(/--text-secondary:\s*#3D4450;/);
    expect(tokens).not.toMatch(/--text:\s*#14171a;/i);
    expect(tokens).not.toMatch(/--text-secondary:\s*#5e646e;/i);
    expect(tokens).not.toMatch(/--text-tertiary:\s*#9aa0a9;/i);

    expect(globals).toMatch(/-webkit-font-smoothing:\s*auto;/);
    expect(globals).toMatch(/-moz-osx-font-smoothing:\s*auto;/);
    expect(globals).not.toMatch(/-webkit-font-smoothing:\s*antialiased;/);
    expect(globals).not.toMatch(/-moz-osx-font-smoothing:\s*grayscale;/);
  });

  it("kills 400-as-body and Tailwind title-weight overrides on shared house chrome", () => {
    for (const path of HOUSE_ROLE_PATHS) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(BODY_400_DRIFT);
      expect(src, path).not.toMatch(TITLE_500_DRIFT);
    }
  });

  it("sizes the rail to house body 420 — not t-body-sm + idle font-normal", () => {
    // Rail is 17px t-body, inherits 420.
    // A4: t-rail tracking only. Do not invent a second rail weight.
    expect(HOUSE_RAIL_ITEM_CLASS).toMatch(/(?:^|[\s"])t-body(?:[\s"]|$)/);
    expect(HOUSE_RAIL_ITEM_CLASS).toMatch(/(?:^|[\s"])t-rail(?:[\s"]|$)/);
    expect(HOUSE_RAIL_ITEM_CLASS).not.toMatch(/font-(?:normal|medium|semibold|bold)/);
  });
});

describe("Dashboard type jobs", () => {
  const now = new Date("2026-09-16T12:00:00.000Z");

  it("binds hero $, title, kickers, period, rows, and sample banner to house roles", () => {
    const identity = renderToStaticMarkup(
      createElement(DashboardOrgIdentity),
    );
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
        activity: [
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
        ],
        fixture: true,
        periodMenuOpen: true,
      }),
    );

    expect(identity).toMatch(/<h1 class="t-title text-ink">Aggregation<\/h1>/);
    expect(html).toMatch(/data-dashboard-title-desktop="" class="[^"]*t-title text-ink[^"]*"/);
    expect(html).toMatch(/data-dashboard-stat="revenue"[^>]*t-display t-data/);
    expect(html).toContain("data-dashboard-revenue-compare");
    expect(html).toContain("data-dashboard-revenue-asof");
    expect(html.indexOf('data-dashboard-stat="revenue"')).toBeLessThan(
      html.indexOf("data-dashboard-revenue-compare"),
    );
    expect(html.indexOf("data-dashboard-revenue-compare")).toBeLessThan(
      html.indexOf("data-dashboard-revenue-asof"),
    );
    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_ADMIN.revenue}`);
    expect(html).not.toContain(`t-label text-ink-3">${DASHBOARD_ADMIN.revenue}`);
    expect(html).toContain(DASHBOARD_PERIOD_TRIGGER_CLASS);
    expect(html).toContain("t-body-sm text-ink-3");
    expect(html).toContain("data-dashboard-activity-clock");
    expect(html).not.toContain("t-display t-body-sm");
    expect(html).toContain("data-dashboard-fixture-banner");
    expect(html).toContain(DASHBOARD_FIXTURE.banner);
    expect(DASHBOARD_FIXTURE_BANNER_CLASS).toMatch(/\bt-label\b|\bt-body-sm\b/);
    expect(DASHBOARD_FIXTURE_BANNER_CLASS).not.toContain("t-display");
  });

  it("bans invented 11 / 13 / 20 / 40 px utilities on Dashboard chrome", () => {
    for (const path of DASHBOARD_CHROME_PATHS) {
      const src = readFileSync(path, "utf8");
      expect(src, path).not.toMatch(BANNED_ARBITRARY_PX);
    }
  });
});
