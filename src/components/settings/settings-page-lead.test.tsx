import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { PAGE_LEAD_STACK_CLASS, PageHeaderBackLink } from "@/components/ui/page-header";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import {
  SETTINGS,
  SETTINGS_PAGE_LEAD_BACK_CLASS,
  settingsHeaderBack,
} from "@/lib/settings";
import { SettingsPageLead } from "./settings-page-lead";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "settings-page-lead.tsx"), "utf8");
const hubBackSrc = readFileSync(join(here, "settings-hub-back-link.tsx"), "utf8");
const pageHeaderSrc = readFileSync(join(here, "../ui/page-header.tsx"), "utf8");
const shellSrc = readFileSync(join(here, "../chrome/app-shell.tsx"), "utf8");
const hubSrc = readFileSync(join(here, "../chrome/settings-hub-list.tsx"), "utf8");
const railSrc = readFileSync(join(here, "../chrome/settings-rail.tsx"), "utf8");
const leadChromeSrc = readFileSync(join(here, "../chrome/house-lead-chrome.tsx"), "utf8");
const newsSrc = readFileSync("src/lib/news.ts", "utf8");

const SETTINGS_PANES = [
  "src/components/chrome/settings-hub-list.tsx",
  "src/components/settings/profile-settings.tsx",
  "src/components/settings/organization-settings.tsx",
  "src/app/(app)/settings/organization/roles/page.tsx",
  "src/components/settings/preferences-settings.tsx",
  "src/app/(app)/settings/agreements/page.tsx",
  "src/app/(app)/settings/refer/page.tsx",
] as const;

const SETTINGS_EDIT_PANES = [
  "src/app/(app)/settings/profile/name/page.tsx",
  "src/app/(app)/settings/preferences/theme/page.tsx",
  "src/app/(app)/settings/preferences/notifications/page.tsx",
  "src/app/(app)/settings/preferences/location/page.tsx",
  "src/app/(app)/settings/organization/company/page.tsx",
  "src/app/(app)/settings/organization/entities/new/page.tsx",
  "src/app/(app)/settings/organization/entities/[entityId]/page.tsx",
] as const;

describe("SettingsPageLead", () => {
  it("reuses News PageHeader ArrowLeft — Back on the hub, Settings on a pane", () => {
    const hub = renderToStaticMarkup(
      createElement(SettingsPageLead, { title: SETTINGS.title, pathname: SETTINGS.href }),
    );
    const hubBack = settingsHeaderBack(SETTINGS.href);
    expect(hub).toContain('data-settings-page-lead=""');
    expect(hub).toContain(`href="${hubBack.href}"`);
    expect(hub).toContain(hubBack.label);
    expect(hub).not.toContain(">Home<");
    expect(hub).toContain(TEXT_ACTION_CLASS);
    expect(hub).toContain(SETTINGS_PAGE_LEAD_BACK_CLASS);
    expect(hub).toContain(PAGE_LEAD_STACK_CLASS);
    expect(hub).toMatch(/<h1[^>]*>Settings<\/h1>/);
    expect(hubBack).toEqual({ href: SETTINGS.dashboardHref, label: "Back" });

    const pane = renderToStaticMarkup(
      createElement(SettingsPageLead, {
        title: "Rights Holder",
        pathname: SETTINGS.organizationHref,
      }),
    );
    const paneBack = settingsHeaderBack(SETTINGS.organizationHref);
    expect(pane).toContain(`href="${paneBack.href}"`);
    expect(pane).toContain(paneBack.label);
    expect(pane).toContain(PAGE_LEAD_STACK_CLASS);
    expect(pane).toMatch(/<h1[^>]*>Rights Holder<\/h1>/);
    expect(paneBack).toEqual({ href: SETTINGS.href, label: SETTINGS.title });

    expect(src).toContain("PageHeaderBackLink");
    expect(src).toContain("SettingsHubBackLink");
    expect(src).toContain("settingsHeaderBack");
    expect(src).toContain("PAGE_LEAD_STACK_CLASS");
    expect(src).toContain("SETTINGS_PAGE_LEAD_BACK_CLASS");
    expect(src).toContain("SETTINGS_PANE_TITLE_CLASS");
    expect(src).not.toContain("flex flex-col gap-1");
    expect(src).not.toContain("CaretLeft");
    expect(src).not.toContain("SettingsHeaderBack");
    expect(pageHeaderSrc).toContain("ArrowLeft");
    expect(pageHeaderSrc).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");
    expect(pageHeaderSrc).toContain("PAGE_LEAD_STACK_CLASS");
    expect(pageHeaderSrc).not.toContain("flex flex-col gap-1");
    expect(pageHeaderSrc).not.toContain("CaretLeft");
    expect(PAGE_LEAD_STACK_CLASS).toBe("flex flex-col gap-3");
    expect(SETTINGS_PAGE_LEAD_BACK_CLASS).toBe("md:hidden");

    const editLead = renderToStaticMarkup(
      createElement(SettingsPageLead, {
        title: "Company name",
        pathname: "/settings/organization/company",
        helper: "Name of the company aggregation workspace on this account.",
      }),
    );
    expect(editLead).toContain("data-settings-page-lead-helper");
    expect(editLead).toContain("Rights Holder");
    expect(editLead).toMatch(/<h1[^>]*>Company name<\/h1>/);
  });

  it("mounts an optional helper under the title for drill-in panes", () => {
    const html = renderToStaticMarkup(
      createElement(SettingsPageLead, {
        title: "Theme",
        pathname: SETTINGS.themeHref,
        helper: SETTINGS.themeHelper,
      }),
    );
    expect(html).toContain('data-settings-page-lead-helper=""');
    expect(html).toContain(SETTINGS.themeHelper);
    expect(html).toContain(`href="${SETTINGS.preferencesHref}"`);
    expect(html).toContain(">Preferences<");
    expect(html).not.toMatch(/href="\/settings"/);
    expect(html).toMatch(/<h1[^>]*>Theme<\/h1>/);
  });

  it("is the one title-block SoT — hub and every pane mount it, chrome does not", () => {
    expect(hubSrc).toContain("SettingsPageLead");
    expect(hubSrc).toContain("SETTINGS.href");
    expect(hubSrc).toContain("SettingsDrillRow");
    expect(hubSrc).toContain("SETTINGS_DRILL_LIST_CLASS");
    expect(hubSrc).not.toContain("SETTINGS_QUIET_ROW_CLASS");
    expect(hubSrc).not.toContain("<h1");
    for (const path of SETTINGS_PANES) {
      const page = readFileSync(path, "utf8");
      expect(page).toContain("SettingsPageLead");
      expect(page).not.toContain("SettingsHeaderBack");
      expect(page).not.toContain("data-settings-header-back");
      expect(page).not.toContain("CaretLeft");
      expect(page).not.toContain("SETTINGS_HEADER_BACK_CLASS");
    }
    expect(existsSync("src/components/chrome/settings-header-back.tsx")).toBe(false);
    expect(existsSync("src/components/chrome/settings-header-back.test.tsx")).toBe(false);
    expect(shellSrc).not.toContain("SettingsHeaderBack");
    expect(shellSrc).not.toContain("leadingNav");
    expect(shellSrc).not.toContain("settings-header-back");
    expect(railSrc).not.toContain("SettingsHeaderBack");
    expect(railSrc).not.toContain("SettingsPageLead");
    expect(leadChromeSrc).not.toContain("SettingsHeaderBack");
    expect(leadChromeSrc).not.toContain("CaretLeft");
    const editPane = readFileSync(join(here, "settings-drill.tsx"), "utf8");
    expect(editPane).toContain("SettingsPageLead");
    expect(editPane).toContain("helper");
    for (const path of SETTINGS_EDIT_PANES) {
      const page = readFileSync(path, "utf8");
      expect(page).toContain("SettingsEditPane");
      expect(page).not.toContain("SettingsHeaderBack");
      expect(page).not.toContain("CaretLeft");
      expect(page).not.toContain("@phosphor-icons/react");
    }
    const backLink = renderToStaticMarkup(
      createElement(PageHeaderBackLink, { href: "/home", label: "Home" }),
    );
    expect(backLink).toContain(TEXT_ACTION_CLASS);
    expect(backLink).toContain("Home");
    expect(backLink).toContain('href="/home"');
    expect(newsSrc).toContain('back: "Home"');
  });

  it("hub Back uses in-app history and dashboard fallback — still PageHeader ArrowLeft", () => {
    expect(hubBackSrc).toContain('"use client"');
    expect(hubBackSrc).toContain("PageHeaderBackLink");
    expect(hubBackSrc).toContain("useRouter");
    expect(hubBackSrc).toContain("router.back()");
    expect(hubBackSrc).toContain("settingsHubHasInAppReferrer");
    expect(hubBackSrc).toContain("settingsHeaderBack");
    expect(hubBackSrc).toContain("document.referrer");
    expect(hubBackSrc).toContain("readSettingsHubExitHref()");
    expect(hubBackSrc).toContain("router.push(dest)");
    expect(hubBackSrc).toContain("if (historyBack)");
    expect(hubBackSrc).toContain("href?: string");
    expect(hubBackSrc).toContain("label?: string");
    expect(hubBackSrc).not.toContain('label: "Home"');
    expect(hubBackSrc).not.toContain('"Home"');
    expect(src).toContain("SettingsHubBackLink");
    expect(src).toContain("SETTINGS.href");
  });
});
