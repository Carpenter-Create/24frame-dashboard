import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DASHBOARD_ADMIN, dashboardPeriodOptions } from "@/lib/dashboard-admin";
import {
  DASHBOARD_PERIOD_OPTION_CHECK_CLASS,
  DASHBOARD_PERIOD_PANEL_CLASS,
  DASHBOARD_PERIOD_TRIGGER_CLASS,
} from "@/lib/dashboard-craft";
import { DashboardAdminControls } from "./dashboard-admin-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const now = new Date("2026-09-16T12:00:00.000Z");
const options = dashboardPeriodOptions(now, [
  { year: 2025, month: 12 },
  { year: 2026, month: 8 },
]);

describe("DashboardAdminControls", () => {
  it("renders one unlabeled period menu with a Sporty Blue check and no grain chips", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardAdminControls, {
        periodKey: "all",
        options,
        defaultOpen: true,
      }),
    );
    expect(html).toContain("data-dashboard-period");
    expect(html).toContain("data-dashboard-period-menu");
    expect(html).toContain("data-dashboard-period-current");
    expect(html).not.toContain("data-dashboard-period-kicker");
    expect(html).toContain(DASHBOARD_ADMIN.allTime);
    expect(html).toContain(DASHBOARD_ADMIN.ytd);
    expect(html).toContain('data-dashboard-period-group="year"');
    expect(html).toContain('data-dashboard-period-group="quarter"');
    expect(html).toContain('data-dashboard-period-group="month"');
    expect(html).toContain('data-dashboard-period-option="all"');
    expect(html).toContain('data-dashboard-period-option="ytd"');
    expect(html).toContain('data-dashboard-period-option="2026"');
    expect(html).toContain('data-dashboard-period-option="Q32026"');
    expect(html).toContain('data-dashboard-period-option="2026-09"');
    expect(html).toContain(DASHBOARD_PERIOD_TRIGGER_CLASS);
    expect(html).toContain(DASHBOARD_PERIOD_PANEL_CLASS);
    expect(html).toContain(DASHBOARD_PERIOD_OPTION_CHECK_CLASS);
    expect(html).toContain("data-appearance-check");
    expect(html).toContain("shadow-none");
    expect(html).not.toContain("data-dashboard-period-grains");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("REPORTS_SELECT_CLASS");
    expect(html).not.toMatch(/<label[^>]*>[\s\S]*data-dashboard-period-menu/);
    expect(html).toContain("data-dashboard-period-sheet");
    expect(html).toContain("max-md:hidden");
    expect(html).toContain("md:hidden");
    expect(html).not.toContain("data-dashboard-user");
    expect(html).not.toContain("data-dashboard-user-overflow");
    expect(html).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(html).not.toContain(DASHBOARD_ADMIN.allCompany);
  });

  it("opens phone Period as a house bottom sheet and keeps Find-user off Dashboard chrome", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardAdminControls, {
        periodKey: "all",
        options,
        defaultOpen: true,
      }),
    );
    expect(html).toContain("data-dashboard-period-sheet");
    expect(html).toContain(DASHBOARD_ADMIN.period);
    expect(html).toContain(DASHBOARD_ADMIN.close);
    expect(html).toContain("app-sheet-rise");
    expect(html).not.toContain("data-dashboard-user");
    expect(html).not.toContain("data-dashboard-user-sheet");
    expect(html).not.toContain("data-dashboard-user-overflow");
    expect(html).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(html).not.toContain("FIND A USER ACCOUNT");
    expect(html).not.toContain(DASHBOARD_ADMIN.allCompany);
    expect(html).not.toContain("data-dashboard-period-grains");
  });

  it("keeps URL sync on replace and does not mount a native select", () => {
    const src = readFileSync("src/components/dashboard/dashboard-admin-controls.tsx", "utf8");
    const primitive = readFileSync("src/components/chrome/house-page-select.tsx", "utf8");
    expect(src).toContain("router.replace");
    expect(src).toContain("dashboardHref");
    expect(src).toContain("HousePageSelect");
    expect(src).not.toContain("<select");
    expect(src).not.toContain("DASHBOARD_PERIOD_GRAINS");
    expect(src).not.toContain("data-dashboard-period-grains");
    expect(src).not.toMatch(/<label[\s\S]*data-dashboard-period[\s\S]*<\/label>/);
    expect(primitive).toContain("AppearanceCheck");
    expect(primitive).toContain("createPortal");
    expect(src).not.toContain("DotsThree");
    expect(src).not.toContain("DashboardUserField");
    expect(src).not.toContain("data-dashboard-user");
    expect(src).not.toContain("data-dashboard-user-sheet");
    expect(src).not.toContain("DASHBOARD_USER_OVERFLOW_CLASS");
    expect(src).not.toContain("DASHBOARD_USER_FIELD_DESKTOP_CLASS");
    expect(src).not.toContain("filterDashboardUsers");
    expect(src).not.toContain("findUser");
  });
});
