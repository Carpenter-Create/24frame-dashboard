// Test helper: the HousePageSelect markups pinned byte for byte in
// src/components/chrome/house-page-select.pin.json, so any change to what
// today's callers draw fails house-page-select.test.tsx. The pin was first
// rendered from origin/main 553a53a, before HousePageSelectOptions gained
// its opt-in inline / multiple / detail props. When a change to a caller's
// markup is meant, rewrite it and say so in the pull request:
//   UPDATE_HOUSE_PAGE_SELECT_PIN=1 pnpm exec vitest run src/components/chrome/house-page-select.test.tsx
// The caller mocks next/navigation.

import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HousePageSelect } from "@/components/chrome/house-page-select";
import { HousePeriodPresets } from "@/components/chrome/house-period-presets";
import { DashboardAdminControls } from "@/components/dashboard/dashboard-admin-controls";
import { TitlesCatalogStatusFilter } from "@/components/titles/titles-status-filter";
import { ChannelsStatusFilter } from "@/app/(app)/(operator)/staff/channels/channels-status-filter";
import { LicensingStatusFilter } from "@/app/(app)/(operator)/staff/gc/deliveries/licensing-status-filter";
import { LicensingVendorFilter } from "@/app/(app)/(operator)/staff/gc/deliveries/licensing-vendor-filter";
import { ClientsStatusFilter } from "@/app/(app)/(operator)/staff/gc/clients/clients-status-filter";
import { dashboardPeriodOptions } from "@/lib/dashboard-admin";
import { REPORTS_PERIOD_PRESETS } from "@/lib/reports";

type PageSelectProps = ComponentProps<typeof HousePageSelect>;

export const HOUSE_PAGE_SELECT_PIN_PATH = "src/components/chrome/house-page-select.pin.json";

/** Set to "1" to rewrite the pin from what the cases draw now. */
export const HOUSE_PAGE_SELECT_PIN_UPDATE_ENV = "UPDATE_HOUSE_PAGE_SELECT_PIN";

/** The pin file's exact text for a set of renders. */
export function housePageSelectPinJson(renders: Record<string, string>): string {
  return `${JSON.stringify(renders, null, 2)}\n`;
}

const noop = () => undefined;

const attr = (name: string) => ({ [`data-pin-${name}`]: "" });

// Every branch the options list has today: flat and grouped, a shown group
// label, hideLabel, an empty label, chosen and unchosen rows, every attrs
// hook, both menu alignments, closed, and a value that matches no option.
const PRIMITIVE_CASES: Record<string, PageSelectProps> = {
  "flat-open": {
    value: "live",
    label: "Live",
    ariaLabel: "Filter",
    defaultOpen: true,
    onPick: noop,
    options: [
      { key: "all", label: "All" },
      { key: "live", label: "Live" },
      { key: "archived", label: "Archived" },
    ],
  },
  "grouped-attrs-start": {
    value: "2026-08",
    label: "August 2026",
    ariaLabel: "Period",
    sheetTitle: "Pick a period",
    closeLabel: "Done",
    defaultOpen: true,
    onPick: noop,
    menuAlign: "start",
    triggerClassName: "pin-trigger",
    groups: [
      { id: "top", label: "", hideLabel: true, options: [{ key: "all", label: "All time" }] },
      {
        id: "months",
        label: "Months",
        options: [
          { key: "2026-08", label: "August 2026" },
          { key: "2026-07", label: "July 2026" },
        ],
      },
      { id: "blank", label: "", options: [{ key: "x", label: "Other" }] },
    ],
    attrs: {
      host: attr("host"),
      trigger: attr("trigger"),
      current: attr("current"),
      chevron: attr("chevron"),
      menu: attr("menu"),
      sheet: attr("sheet"),
      group: (id) => ({ "data-pin-group": id }),
      groupLabel: attr("group-label"),
      option: (key) => ({ "data-pin-option": key }),
      optionLabel: attr("option-label"),
      optionCheck: attr("option-check"),
    },
  },
  "no-match-open": {
    value: "",
    label: "Select territory",
    ariaLabel: "Territory",
    sheetTitle: "Territory",
    closeLabel: "Close",
    defaultOpen: true,
    menuAlign: "start",
    onPick: noop,
    options: [
      { key: "ww", label: "Worldwide" },
      { key: "us", label: "United States" },
    ],
  },
  closed: {
    value: "all",
    label: "All",
    ariaLabel: "Filter",
    onPick: noop,
    options: [
      { key: "all", label: "All" },
      { key: "live", label: "Live" },
    ],
  },
};

/** The pinned markups, keyed as in house-page-select.pin.json. */
export function housePageSelectPinRenders(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, props] of Object.entries(PRIMITIVE_CASES)) {
    out[`primitive:${name}`] = renderToStaticMarkup(createElement(HousePageSelect, props));
  }
  const now = new Date("2026-09-16T12:00:00.000Z");
  out["consumer:dashboard-period"] = renderToStaticMarkup(
    createElement(DashboardAdminControls, {
      periodKey: "all",
      options: dashboardPeriodOptions(now, [
        { year: 2025, month: 12 },
        { year: 2026, month: 8 },
      ]),
      defaultOpen: true,
    }),
  );
  out["consumer:period-presets"] = renderToStaticMarkup(
    createElement(HousePeriodPresets, {
      value: "all",
      items: REPORTS_PERIOD_PRESETS.map((preset) => ({
        key: preset.grain,
        label: preset.label,
        href: preset.grain === "all" ? "/home" : `/home?period=${preset.grain}`,
      })),
      ariaLabel: "Period",
      defaultOpen: true,
    }),
  );
  out["consumer:titles-status"] = renderToStaticMarkup(
    createElement(TitlesCatalogStatusFilter, { q: "", status: "all", defaultOpen: true }),
  );
  out["consumer:channels-status"] = renderToStaticMarkup(
    createElement(ChannelsStatusFilter, { status: "all", defaultOpen: true }),
  );
  out["consumer:licensing-status"] = renderToStaticMarkup(
    createElement(LicensingStatusFilter, { status: "all", vendor: null, q: "", defaultOpen: true }),
  );
  out["consumer:licensing-vendor"] = renderToStaticMarkup(
    createElement(LicensingVendorFilter, {
      status: "all",
      vendor: null,
      vendors: [{ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", name: "Channel A" }],
      defaultOpen: true,
    }),
  );
  out["consumer:clients-status"] = renderToStaticMarkup(
    createElement(ClientsStatusFilter, { status: "all", defaultOpen: true }),
  );
  return out;
}
