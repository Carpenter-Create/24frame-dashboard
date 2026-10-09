import { describe, expect, it } from "vitest";

import { DELIVERY_STATUS_FILTERS } from "@/lib/deliveries-browse";
import { GC_NAV } from "@/lib/nav";

import {
  GC_DELIVERIES_EMPTY,
  GC_LICENSING_STATUS,
  GC_LICENSING_VENDOR_ALL,
  LICENSING_VENDOR_INDENT_CLASS,
  buildGcLicensingQuery,
  filterLicensingGroups,
  gcLicensingHasFilters,
  gcLicensingHref,
  gcLicensingShowAllHref,
  gcLicensingVendorLabel,
  gcLicensingVendorOptions,
  groupLicensingTitles,
  licensingDeliverLabel,
  licensingDeliverVisible,
  licensingDrawnVendors,
  licensingTitleMeta,
  parseDeliveryStatusFilter,
  parseGcLicensingChannelFilter,
  parseGcLicensingVendorFilter,
} from "./gc-deliveries";

const VENDOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("GC_LICENSING_STATUS copy", () => {
  it("locks staff nav, H1, and empty strings on Licensing Status", () => {
    expect(GC_LICENSING_STATUS.title).toBe("Licensing Status");
    expect(GC_LICENSING_STATUS).not.toHaveProperty("intro");
    expect(GC_LICENSING_STATUS.searchPlaceholder).toBe("Search titles or channels");
    expect(GC_LICENSING_STATUS.vendorFilterLabel).toBe("Filter by channel");
    expect(GC_LICENSING_STATUS.empty).toBe("No licensing status yet.");
    expect(GC_DELIVERIES_EMPTY.title).toBe(GC_LICENSING_STATUS.empty);
    expect(GC_DELIVERIES_EMPTY.actionLabel).toBe("View titles");
    expect(GC_DELIVERIES_EMPTY.actionHref).toBe("/aggregation/titles");
    expect(GC_NAV.find((item) => item.href === "/staff/gc/deliveries")?.label).toBe(
      GC_LICENSING_STATUS.title,
    );
  });
});

describe("staff licensing filters", () => {
  it("reuses the live delivery-status enum SoT", () => {
    expect(DELIVERY_STATUS_FILTERS.map((f) => f.key)).toEqual([
      "all",
      "pending",
      "delivered",
      "live",
      "rejected",
      "taken_down",
    ]);
    expect(parseDeliveryStatusFilter("live")).toBe("live");
    expect(parseDeliveryStatusFilter("bogus")).toBe("all");
  });

  it("accepts a canonical vendor UUID and fail-closes everything else to all", () => {
    expect(parseGcLicensingVendorFilter(VENDOR_ID)).toBe(VENDOR_ID);
    expect(parseGcLicensingVendorFilter(VENDOR_ID.toUpperCase())).toBe(VENDOR_ID);
    expect(parseGcLicensingVendorFilter(GC_LICENSING_VENDOR_ALL)).toBeNull();
    expect(parseGcLicensingVendorFilter("")).toBeNull();
    expect(parseGcLicensingVendorFilter(undefined)).toBeNull();
    expect(parseGcLicensingVendorFilter("not-a-uuid")).toBeNull();
    expect(parseGcLicensingVendorFilter([VENDOR_ID])).toBeNull();
  });

  it("builds /gc/deliveries hrefs that preserve the other filter", () => {
    expect(buildGcLicensingQuery({ status: "all", vendor: null })).toBe("");
    expect(buildGcLicensingQuery({ status: "live", vendor: null })).toBe("?status=live");
    expect(buildGcLicensingQuery({ status: "all", vendor: VENDOR_ID })).toBe(
      `?channel=${VENDOR_ID}`,
    );
    expect(gcLicensingHref("pending", VENDOR_ID, "finals")).toBe(
      `/staff/gc/deliveries?q=finals&status=pending&channel=${VENDOR_ID}`,
    );
    expect(gcLicensingHref("pending", VENDOR_ID)).toBe(
      `/staff/gc/deliveries?status=pending&channel=${VENDOR_ID}`,
    );
    expect(parseGcLicensingChannelFilter(VENDOR_ID)).toBe(VENDOR_ID);
    expect(parseGcLicensingChannelFilter(undefined, VENDOR_ID)).toBe(VENDOR_ID);
    expect(parseGcLicensingChannelFilter("all", VENDOR_ID)).toBe(VENDOR_ID);
    expect(parseGcLicensingChannelFilter(undefined, undefined)).toBeNull();
    expect(gcLicensingShowAllHref()).toBe("/staff/gc/deliveries");
    expect(gcLicensingHasFilters("all", null)).toBe(false);
    expect(gcLicensingHasFilters("live", null)).toBe(true);
    expect(gcLicensingHasFilters("all", VENDOR_ID)).toBe(true);
  });

  it("labels the vendor select from the house All + named options", () => {
    const vendors = [
      { id: VENDOR_ID, name: "Acme Distribution" },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", name: "Northwind" },
    ];
    expect(gcLicensingVendorOptions(vendors)).toEqual([
      { key: GC_LICENSING_VENDOR_ALL, label: "All" },
      { key: VENDOR_ID, label: "Acme Distribution" },
      { key: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", label: "Northwind" },
    ]);
    expect(gcLicensingVendorLabel(null, vendors)).toBe("All");
    expect(gcLicensingVendorLabel(VENDOR_ID, vendors)).toBe("Acme Distribution");
    expect(gcLicensingVendorLabel("cccccccc-cccc-4ccc-8ccc-cccccccccccc", vendors)).toBe("All");
  });
});

const TITLE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const TITLE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const VENDOR_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("licensing title groups", () => {
  it("nests vendor rows under Titles parents and gates Deliver on selection", () => {
    const groups = groupLicensingTitles({
      deliveries: [
        {
          id: "d1",
          title_id: TITLE_A,
          vendor_id: VENDOR_ID,
          status: "pending",
          created_at: "2026-09-12T00:00:00.000Z",
          titles: { title: "North Star", catalog_id: "GC-0001234", release_date: "2024-01-01" },
          vendors: { name: "Acme Distribution" },
        },
        {
          id: "d2",
          title_id: TITLE_A,
          vendor_id: VENDOR_B,
          status: "live",
          created_at: "2026-09-10T00:00:00.000Z",
          titles: { title: "North Star", catalog_id: "GC-0001234" },
          vendors: { name: "Northwind" },
        },
        {
          id: "d3",
          title_id: TITLE_B,
          vendor_id: VENDOR_ID,
          status: "delivered",
          created_at: "2026-09-08T00:00:00.000Z",
          titles: { title: "Harbor Cut", catalog_id: "GC-0001235" },
          vendors: { name: "Acme Distribution" },
        },
      ],
      titles: [{ id: TITLE_A, title: "North Star", catalog_id: "GC-0001234", release_date: "2024-01-01" }],
    });

    expect(groups.map((group) => group.id)).toEqual([TITLE_A, TITLE_B]);
    expect(groups[0].vendors.map((row) => row.vendorName)).toEqual([
      "Acme Distribution",
      "Northwind",
    ]);
    expect(licensingTitleMeta(groups[0])).toContain("2 channels");
    expect(licensingTitleMeta(groups[0])).toContain("last activity");
    expect(LICENSING_VENDOR_INDENT_CLASS).toContain("--space-6");
    expect(licensingDeliverVisible(0)).toBe(false);
    expect(licensingDeliverVisible(2)).toBe(true);
    expect(licensingDeliverLabel(2)).toBe("Deliver · 2");
  });

  it("filters by search, delivery status, and vendor without inventing a lens", () => {
    const groups = groupLicensingTitles({
      deliveries: [
        {
          id: "d1",
          title_id: TITLE_A,
          vendor_id: VENDOR_ID,
          status: "pending",
          created_at: "2026-09-12T00:00:00.000Z",
          titles: { title: "North Star" },
          vendors: { name: "Acme Distribution" },
        },
        {
          id: "d2",
          title_id: TITLE_B,
          vendor_id: VENDOR_B,
          status: "live",
          created_at: "2026-09-08T00:00:00.000Z",
          titles: { title: "Harbor Cut" },
          vendors: { name: "Northwind" },
        },
      ],
    });

    expect(filterLicensingGroups(groups, { q: "northwind" }).map((g) => g.id)).toEqual([TITLE_B]);
    expect(filterLicensingGroups(groups, { status: "pending" }).map((g) => g.id)).toEqual([TITLE_A]);
    expect(filterLicensingGroups(groups, { vendor: VENDOR_B }).map((g) => g.id)).toEqual([TITLE_B]);
  });
});

describe("licensingDrawnVendors", () => {
  const rows = [{ deliveryId: "d1" }, { deliveryId: "d2" }, { deliveryId: "d3" }];

  it("keeps every row when nothing is held", () => {
    expect(licensingDrawnVendors(rows, [])).toBe(rows);
  });

  it("keeps rows Deliver just created out of sight while its window is open", () => {
    expect(licensingDrawnVendors(rows, ["d2"])).toEqual([{ deliveryId: "d1" }, { deliveryId: "d3" }]);
    expect(licensingDrawnVendors(rows, ["d1", "d2", "d3"])).toEqual([]);
    expect(licensingDrawnVendors(rows, ["d9"])).toEqual(rows);
  });
});
