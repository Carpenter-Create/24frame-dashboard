import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DashboardAdminChrome } from "@/components/dashboard/dashboard-admin-hero";
import { DashboardAdminControls } from "@/components/dashboard/dashboard-admin-controls";
import { DASHBOARD_ADMIN, dashboardPeriodOptions, parseDashboardPeriod } from "@/lib/dashboard-admin";
import {
  DASHBOARD_ADMIN_CHROME_CLASS,
  DASHBOARD_ORG_NAME_MOBILE_CLASS,
  DASHBOARD_PERIOD_SHEET_HOST_CLASS,
  DASHBOARD_PERIOD_TRIGGER_CLASS,
  DASHBOARD_TITLE_MOBILE_CLASS,
} from "@/lib/dashboard-craft";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  WORKSPACE_SWITCHER,
  WORKSPACE_SWITCHER_PANEL_CLASS,
} from "@/lib/workspace-switcher";
import { WorkspaceSwitcher } from "@/components/chrome/workspace-switcher";

vi.mock("next/navigation", () => ({
  usePathname: () => "/aggregation/dashboard",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));
vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    prefetch?: boolean;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink, useLinkStatus: () => ({ pending: false }) };
});

const now = new Date("2026-09-16T12:00:00.000Z");
const options = dashboardPeriodOptions(now, [
  { year: 2025, month: 12 },
  { year: 2026, month: 8 },
]);
const shellSrc = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const heroSrc = readFileSync("src/components/dashboard/dashboard-admin-hero.tsx", "utf8");
const controlsSrc = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
const craftSrc = readFileSync("src/lib/dashboard-craft.ts", "utf8");
const switcherSrc = readFileSync("src/lib/workspace-switcher.ts", "utf8");

function chromeHtml() {
  return renderToStaticMarkup(
    createElement(DashboardAdminChrome, {
      periodKey: parseDashboardPeriod("all", now).key,
      options,
      periodMenuOpen: true,
    }),
  );
}

describe("Aggregation Dashboard mobile chrome — emblem left, dest chips under top", () => {
  it("keeps the emblem alone on the lead — no workspace pill, no hamburger", () => {
    expect(APP_HEADER_LEADING_CLASS).toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("justify-center");
    expect(switcherSrc).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(switcherSrc).not.toContain("WORKSPACE_SWITCHER_PILL_TRIGGER_CLASS");
    expect(leadSrc).toContain("data-app-header-leading");
    expect(leadSrc).not.toContain("data-app-header-workspace-pill");
    expect(leadSrc).toContain("APP_HEADER_LEADING_CLASS");
    expect(leadSrc).not.toContain('tone="pill"');
    expect(shellSrc).not.toContain("MobileNavSlot");
    expect(shellSrc).not.toContain("DestChipsSlot");
    expect(shellSrc).toContain("<HouseLeadChrome");
    const header = leadSrc.slice(
      leadSrc.indexOf("data-app-header="),
      leadSrc.indexOf("</header>"),
    );
    expect(header).not.toContain("justify-center");
    expect(header).not.toContain("left-1/2");
    expect(header).not.toContain("-translate-x-1/2");
    const leading = header.slice(
      header.indexOf("data-app-header-leading"),
      header.indexOf("data-app-header-trailing"),
    );
    expect(leading).toContain("{leadingNav}");
    expect(leading).not.toContain("data-app-header-workspace-pill");
    expect(leading).not.toContain("WorkspaceSwitcher");
    expect(leading).not.toContain("{accountMenu}");
    expect(leading).not.toContain("{trailingNav}");
    expect(shellSrc).not.toContain("afterLead=");
    expect(shellSrc).not.toContain("MessagesHeaderSlot");
    expect(shellSrc).toContain("AskAiOverlayProvider");
    expect(shellSrc).not.toContain("destChips=");
    expect(shellSrc).not.toContain("trailingNav=");
  });

  it("leaves the trailing avatar alone — no Aggregation+avatar phone cluster", () => {
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("shrink-0");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(
      /(?:^|\s)gap-\[var\(--space-3\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(switcherSrc).toContain('APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS = "hidden md:contents"');
    expect(switcherSrc).toContain('APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS = "shrink-0 md:hidden"');
    expect(leadSrc).toContain("data-app-header-trailing");
    expect(leadSrc).toContain("APP_HEADER_TRAILING_CLUSTER_CLASS");
    const trailing = leadSrc.slice(
      leadSrc.indexOf("data-app-header-trailing"),
      leadSrc.indexOf("</header>"),
    );
    expect(trailing).toContain('presentation="pills"');
    expect(trailing).toContain('presentation="waffle"');
    expect(trailing).toContain("data-app-header-workspace-desktop");
    expect(trailing).toContain("APP_HEADER_WORKSPACE_DESKTOP_HOST_CLASS");
    expect(trailing).not.toContain('tone="pill"');
    expect(trailing).not.toContain("data-app-header-workspace-pill");
    expect(trailing).toContain("{accountMenu}");
    expect(trailing).toContain("{trailingSearch");
    expect(trailing).toContain("{trailingNav}");
    expect(trailing).toContain('data-app-header-trailing-nav="" className="md:hidden"');
    expect(trailing).not.toContain("data-education-header-search-host");
    expect(trailing.indexOf("{trailingNav}")).toBeLessThan(
      trailing.indexOf('presentation="waffle"'),
    );
    expect(trailing.indexOf('presentation="pills"')).toBeLessThan(
      trailing.indexOf("<AskAssistantHeaderLink"),
    );
    expect(trailing.indexOf("<ActivityBell")).toBeLessThan(
      trailing.indexOf('presentation="waffle"'),
    );
    expect(trailing.indexOf('presentation="waffle"')).toBeLessThan(
      trailing.indexOf("{accountMenu}"),
    );
    expect(shellSrc).toContain("accountMenu=");
    expect(shellSrc).toContain("AccountMenuSlot");
    expect(trailing).not.toContain("data-dashboard-period");
    expect(trailing).not.toContain("Move");
    expect(shellSrc).not.toContain("data-header-move");
    expect(shellSrc).not.toContain("data-mercury-search");
    expect(shellSrc).not.toContain("data-workspace-switcher-lead");
    expect(shellSrc).not.toContain("data-workspace-switcher-rail");
  });

  it("opens a portaled Workspaces panel of Layer 1 tiles", () => {
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("fixed");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).toContain("z-50");
    expect(WORKSPACE_SWITCHER_PANEL_CLASS).not.toContain("absolute");
    expect(WORKSPACE_SWITCHER.heading).toBe("Workspaces");
    const open = renderToStaticMarkup(
      createElement(WorkspaceSwitcher, {
        current: "aggregation",
        defaultOpen: true,
      }),
    );
    expect(open).toContain("data-workspace-switcher-popover");
    expect(open).toContain(WORKSPACE_SWITCHER.heading);
    expect(open).toContain('data-workspace-waffle-tile="social"');
    expect(open).toContain('data-workspace-waffle-tile="education"');
    expect(open).toContain('data-workspace-waffle-tile="aggregation"');
    expect(open).not.toContain('data-workspace-waffle-tile="co-productions"');
    expect(open).toContain(WORKSPACE_SWITCHER_PANEL_CLASS);
    expect(switcherSrc).toContain("Workspaces");
  });

  it("does not put Period in the top header next to Aggregation", () => {
    const header = shellSrc.slice(
      shellSrc.indexOf("data-app-header="),
      shellSrc.indexOf("</header>"),
    );
    expect(header).not.toContain("DashboardAdminControls");
    expect(header).not.toContain("data-dashboard-period");
    expect(header).not.toContain("DASHBOARD_ADMIN.period");
    expect(shellSrc).not.toContain("data-dashboard-period");
    expect(heroSrc).not.toContain("data-app-header");
  });
});

describe("Aggregation Dashboard mobile chrome — org-row Period", () => {
  it("puts quiet All time ⌄ on the org row and drops the PERIOD kicker", () => {
    const html = chromeHtml();
    expect(html).toContain("data-dashboard-identity-row");
    expect(html).toContain("data-dashboard-title-mobile");
    expect(html).toContain("Aggregation");
    expect(html).not.toContain("GCNH, LLC");
    expect(html).toMatch(/data-dashboard-title-desktop=""[^>]*>Aggregation</);
    expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>All time</);
    expect(html).toContain("data-dashboard-period");
    expect(html).toContain("data-dashboard-period-one");
    expect(html).toContain("data-dashboard-period-current");
    expect(html).toContain(DASHBOARD_ADMIN.allTime);
    expect(html).toContain("data-dashboard-period-chevron");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).toContain("items-center");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).toContain("justify-between");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).toContain("gap-[var(--space-2)]");
    expect(DASHBOARD_ADMIN_CHROME_CLASS).not.toContain("flex-col");
    expect(DASHBOARD_TITLE_MOBILE_CLASS).toBe(DASHBOARD_ORG_NAME_MOBILE_CLASS);
    expect(DASHBOARD_ORG_NAME_MOBILE_CLASS).toContain("t-heading");
    expect(DASHBOARD_ORG_NAME_MOBILE_CLASS).toContain("text-ink");
    expect(DASHBOARD_ORG_NAME_MOBILE_CLASS).toContain("md:hidden");
    expect(DASHBOARD_ORG_NAME_MOBILE_CLASS).not.toContain("t-title");
    expect(DASHBOARD_ORG_NAME_MOBILE_CLASS).not.toContain("t-label");
    expect(html).not.toContain("data-dashboard-period-kicker");
    expect(controlsSrc).not.toContain("data-dashboard-period-kicker");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).toContain("t-body-sm");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).toContain("max-md:bg-transparent");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).toContain("max-md:border-0");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).toContain("max-md:flex-none");
    expect(DASHBOARD_PERIOD_TRIGGER_CLASS).not.toContain("max-md:flex-1");
    expect(html.indexOf("data-dashboard-title-mobile")).toBeLessThan(
      html.indexOf("data-dashboard-period-current"),
    );
    expect(heroSrc).toContain("data-dashboard-identity-row");
    expect(heroSrc).not.toContain("period.label");
    expect(craftSrc).not.toContain("DASHBOARD_PERIOD_KICKER_CLASS");
  });

  it("opens Period from the org-row control into the existing bottom sheet", () => {
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
    expect(html.split("data-dashboard-period=").length - 1).toBe(1);
    expect(html).not.toContain("data-dashboard-period-grains");
    expect(html).not.toContain("<select");
  });

  it("keeps Find-user off Dashboard and does not return Markets or Export", () => {
    const html = chromeHtml();
    expect(html).not.toContain("data-dashboard-user");
    expect(html).not.toContain("data-dashboard-user-overflow");
    expect(html).not.toContain("data-dashboard-user-sheet");
    expect(html).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(html).not.toContain("FIND A USER ACCOUNT");
    expect(html).not.toContain(DASHBOARD_ADMIN.allCompany);
    expect(controlsSrc).not.toContain("Find a user account");
    expect(controlsSrc).not.toContain("data-dashboard-user");
    expect(craftSrc).not.toContain("DASHBOARD_USER_FIELD_DESKTOP_CLASS");
    expect(heroSrc).not.toMatch(/\bMarkets\b/);
    expect(heroSrc).not.toContain("Export CSV");
    expect(controlsSrc).not.toContain("Export CSV");
  });
});
