import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { titleArtworkUrls } from "@/lib/artwork";
import { createClient } from "@/lib/supabase/server";
import {
  GC_DELIVERIES_EMPTY,
  GC_DELIVERIES_TRUNCATED,
  GC_LICENSING_STATUS,
} from "@/lib/gc-deliveries";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import GcDeliveriesPage from "./page";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/artwork", () => ({
  titleArtworkUrls: vi.fn(async () => new Map()),
}));
vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/gc/deliveries",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("./licensing-vendor-filter", () => ({
  LicensingVendorFilter: () =>
    createElement("div", { "data-gc-licensing-vendor": "" }, "All"),
}));
vi.mock("./licensing-status-filter", () => ({
  LicensingStatusFilter: () =>
    createElement("div", { "data-gc-licensing-status-compact": "" }, "Pending"),
}));

function stubClient(tables: Record<string, unknown[]> = {}) {
  const from = vi.fn((table: string) => {
    const rows = tables[table] ?? [];
    const chain: {
      select: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      range: ReturnType<typeof vi.fn>;
      in: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      is: ReturnType<typeof vi.fn>;
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => unknown;
    } = {
      select: vi.fn(() => chain),
      order: vi.fn(() => chain),
      range: vi.fn(() => chain),
      in: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      then: (resolve) => resolve({ data: rows, error: null }),
    };
    return chain;
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from };
}

function stubEmptyClient() {
  return stubClient();
}

async function renderEmptyDeliveries(
  search: Record<string, string | string[] | undefined> = {},
) {
  stubEmptyClient();
  return renderToStaticMarkup(
    await GcDeliveriesPage({ searchParams: Promise.resolve(search) }),
  );
}

const pageSrc = readFileSync("src/app/(app)/(operator)/staff/gc/deliveries/page.tsx", "utf8");
const companionsSrc = readFileSync("src/lib/gc-deliveries-companions.ts", "utf8");
const viewTitlesClass = "t-body-sm text-accent transition-colors hover:underline";

describe("staff /gc/deliveries empty copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(titleArtworkUrls).mockResolvedValue(new Map());
  });

  it("keeps the Licensing Status title and locked empty line", async () => {
    const html = await renderEmptyDeliveries();

    expect(html).toContain(GC_LICENSING_STATUS.title);
    expect(html).not.toContain("Licensing status across all clients");
    expect(html).not.toContain("Status is set by hand");
    expect(html).toContain(GC_DELIVERIES_EMPTY.title);
    expect(html).toContain("data-gc-licensing-status");
  });

  it("renders View titles as Sporty Blue text, not a filled button", async () => {
    const html = await renderEmptyDeliveries();
    const marker = html.indexOf(GC_DELIVERIES_EMPTY.actionLabel);
    const addStart = html.lastIndexOf("<a", marker);
    const addEnd = html.indexOf("</a>", marker);
    const link = html.slice(addStart, addEnd);

    expect(html).toContain('href="/aggregation/titles"');
    expect(html).toContain(GC_DELIVERIES_EMPTY.actionLabel);
    expect(pageSrc).toContain(viewTitlesClass);
    expect(link).toContain("t-body-sm");
    expect(link).toContain("text-accent");
    expect(link).toContain("hover:underline");
    expect(link).toContain(GC_DELIVERIES_EMPTY.actionLabel);
    expect(link).not.toContain("bg-accent");
    expect(link).not.toContain("text-accent-contrast");
    expect(link).not.toContain("rounded-[12px]");
    expect(link).not.toContain("px-[var(--space-4)]");
    expect(link).not.toContain("py-[var(--space-2)]");
    expect(link).not.toContain("inline-flex");
  });

  it("does not restyle client Titles or team Channels", () => {
    const titles = readFileSync("src/app/(app)/aggregation/titles/page.tsx", "utf8");
    const channels = readFileSync("src/app/(app)/(operator)/staff/channels/page.tsx", "utf8");

    expect(titles).toContain("TITLES_CATALOG");
    expect(titles).not.toContain("GC_LICENSING_STATUS");
    expect(channels).toContain("CHANNELS_PAGE");
    expect(pageSrc).not.toContain("EmptyState");
    expect(pageSrc).not.toContain("CHANNELS_PAGE");
  });
});

describe("staff /gc/deliveries licensing filters and craft", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(titleArtworkUrls).mockResolvedValue(new Map());
  });

  it("filters by live delivery status and vendor on the cross-org read", async () => {
    const vendorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const { from } = stubClient();
    await GcDeliveriesPage({
      searchParams: Promise.resolve({ status: "live", channel: vendorId }),
    });
    expect(from).toHaveBeenCalledWith("deliveries");
    const deliveriesChain = from.mock.results[0]?.value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(deliveriesChain.eq).toHaveBeenCalledWith("status", "live");
    expect(deliveriesChain.eq).toHaveBeenCalledWith("vendor_id", vendorId);
  });

  it("still reads a legacy ?vendor= filter", async () => {
    const vendorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const { from } = stubClient();
    await GcDeliveriesPage({
      searchParams: Promise.resolve({ status: "live", vendor: vendorId }),
    });
    const deliveriesChain = from.mock.results[0]?.value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(deliveriesChain.eq).toHaveBeenCalledWith("vendor_id", vendorId);
  });

  it("does not constrain the deliveries read when filters are all", async () => {
    const { from } = stubEmptyClient();
    await renderToStaticMarkup(
      await GcDeliveriesPage({ searchParams: Promise.resolve({}) }),
    );
    const deliveriesChain = from.mock.results[0]?.value as {
      eq: ReturnType<typeof vi.fn>;
    };
    expect(deliveriesChain.eq).not.toHaveBeenCalledWith("status", expect.anything());
    expect(deliveriesChain.eq).not.toHaveBeenCalledWith("vendor_id", expect.anything());
  });

  it("uses Titles chrome and HousePageSelect status — no StatusFilter chips", async () => {
    const html = await renderEmptyDeliveries({ status: "pending" });
    expect(html).toContain("data-titles-catalog");
    expect(html).toContain("data-titles-catalog-header-row");
    expect(html).toContain("data-titles-catalog-filters");
    expect(html).toContain("data-titles-catalog-toolbar");
    expect(html).toContain("data-gc-licensing-status-compact");
    expect(html).toContain("data-gc-licensing-vendor");
    expect(html).toContain("Pending");
    expect(pageSrc).toContain("TitlesCatalogFrame");
    expect(pageSrc).toContain("TitlesCatalogHeader");
    expect(pageSrc).toContain("TitlesCatalogToolbar");
    expect(pageSrc).toContain("HousePageSearch");
    expect(pageSrc).toContain("LicensingStatusFilter");
    expect(pageSrc).toContain("LicensingVendorFilter");
    expect(pageSrc).not.toContain("import { StatusFilter }");
    expect(pageSrc).not.toContain("data-gc-licensing-status-chips");
    expect(pageSrc).not.toContain("hidden md:flex");
    expect(pageSrc).not.toContain("@/components/layout/status-filter");
  });

  it("shows filter-miss copy and Show all when the lens is empty", async () => {
    const html = await renderEmptyDeliveries({ status: "rejected" });
    expect(html).toContain(GC_LICENSING_STATUS.filterMiss);
    expect(html).toContain(GC_LICENSING_STATUS.showAll);
    expect(html).toContain('href="/staff/gc/deliveries"');
    expect(html).not.toContain("No licensing status yet.");
  });

  it("does not ship create/export heroes or flat delivery cards", async () => {
    stubClient({
      deliveries: [
        {
          id: "d1",
          territory: "US",
          status: "live",
          vendor_id: "v1",
          title_id: "t1",
          created_at: "2026-09-12T00:00:00.000Z",
          titles: { title: "North Star", catalog_id: "GC-0000001" },
          vendors: { name: "Acme Distribution" },
        },
      ],
      titles: [{ id: "t1", title: "North Star", catalog_id: "GC-0000001" }],
    });
    const html = renderToStaticMarkup(await GcDeliveriesPage());
    expect(html).toContain('data-gc-licensing-title="t1"');
    expect(html).toContain("North Star");
    expect(html).toContain("Acme Distribution");
    expect(html).toContain("data-gc-licensing-indent");
    expect(html).toContain("data-status-progress");
    expect(html).not.toContain("Create delivery");
    expect(html).not.toContain("Export metadata");
    expect(html).not.toContain("New delivery");
    expect(pageSrc).not.toContain("NewDeliveryForm");
    expect(pageSrc).not.toContain("ExportPanel");
    expect(pageSrc).not.toContain("HOUSE_MODULE_CLASS");
    expect(pageSrc).not.toContain("@/components/ui/card");
  });
});

/**
 * Class 2: companion lists must never look finished when the read was cut off.
 * The page must not issue its own unbounded rights_grants / assets / portal_*
 * selects — those go through loadGcDeliveryCompanions (IN + probe).
 */
describe("staff /gc/deliveries companion bounds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(titleArtworkUrls).mockResolvedValue(new Map());
  });

  it("does not query companion tables on the page, and leaves class 1 list bounds alone", () => {
    expect(pageSrc).toContain("loadGcDeliveryCompanions");
    expect(companionsSrc).toContain("probeRange");
    expect(companionsSrc).toContain("splitProbe");
    expect(pageSrc).not.toContain('.from("rights_grants")');
    expect(pageSrc).not.toContain('.from("assets")');
    expect(pageSrc).not.toContain('.from("portal_links")');
    expect(pageSrc).not.toContain('.from("portal_sessions")');
    expect(pageSrc).not.toContain('.from("portal_access_events")');
    expect(pageSrc).toContain("range(...rangeFor(LIST_PAGE))");
    expect(pageSrc).toContain("range(...rangeFor(UNPAGINATED_MAX))");
    expect(pageSrc).not.toContain("probeRange(LIST_PAGE)");
  });

  it("renders no truncated state when companion reads are short", async () => {
    const html = await renderEmptyDeliveries();
    expect(html).not.toContain(GC_DELIVERIES_TRUNCATED.grants);
    expect(html).not.toContain(GC_DELIVERIES_TRUNCATED.companions);
    expect(html).not.toContain('data-gc-deliveries-truncated="grants"');
    expect(html).not.toContain('data-gc-deliveries-truncated="companions"');
  });

  it("shows the grants notice when the grant probe overflows", async () => {
    stubClient({
      titles: [{ id: "t1", title: "North Star", catalog_id: "GC-0000001" }],
      rights_grants: Array.from({ length: UNPAGINATED_MAX + 1 }, (_, i) => ({
        id: `g-${i}`,
        title_id: "t1",
        rights_type: "avod",
        territory_mode: "world",
        territories: [],
      })),
    });

    const html = renderToStaticMarkup(await GcDeliveriesPage());
    expect(html).toContain(GC_DELIVERIES_TRUNCATED.grants);
    expect(html).toContain('data-gc-deliveries-truncated="grants"');
    expect(html).not.toContain('data-gc-deliveries-truncated="companions"');
  });
});
