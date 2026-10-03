import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { CHANNELS_PAGE, VENDOR_FORM_FIELD_LABELS } from "@/lib/vendors-directory";
import { GC_NAV, NAV } from "@/lib/nav";

import GcChannelsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/channels",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type VendorRow = {
  id: string;
  name: string;
  delivery_mode: "portal_upload" | "email";
  active: boolean;
};

const REAL_VENDOR: VendorRow = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Acme Distribution",
  delivery_mode: "email",
  active: true,
};

function stubClient(rows: VendorRow[] | null, deliveries: unknown[] | null = []) {
  const vendorsChain = {
    select: vi.fn(() => vendorsChain),
    order: vi.fn(() => vendorsChain),
    range: vi.fn(async () => ({ data: rows, error: null })),
  };
  const deliveriesChain = {
    select: vi.fn(() => deliveriesChain),
    range: vi.fn(async () => ({ data: deliveries, error: null })),
  };
  const from = vi.fn((table: string) => {
    if (table === "vendors") return vendorsChain;
    if (table === "deliveries") return deliveriesChain;
    throw new Error(`unexpected from(${table})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, vendorsChain, deliveriesChain };
}

async function renderChannels(rows: VendorRow[] | null = []) {
  stubClient(rows);
  return renderToStaticMarkup(await GcChannelsPage());
}

const pageSrc = readFileSync("src/app/(app)/(operator)/staff/channels/page.tsx", "utf8");

describe("staff /channels card grid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders identity + empty copy and one Add channel control", async () => {
    const html = await renderChannels([]);

    expect(html).toContain(CHANNELS_PAGE.title);
    expect(html).toContain(CHANNELS_PAGE.identity);
    expect(html).toContain(CHANNELS_PAGE.emptyTitle);
    expect(html).not.toContain("GC distribution partners.");
    expect(html).not.toContain("Add your first partner.");
    expect(pageSrc).not.toContain("emptySupport");
    expect(html).toContain(CHANNELS_PAGE.addChannel);
    expect(html).toContain(`href="${CHANNELS_PAGE.addHref}"`);
    expect(html).toContain("data-channels-empty");
    expect(html).toContain("data-channels-add");
    expect(html).toContain("0 channels");
    expect(html).toContain("data-house-page-select");
    expect(html).toContain("data-channels-status-trigger");
    expect(html).not.toContain('role="group"');
    expect(html).not.toContain("data-channels-grid");
    expect(html).not.toContain("data-staff-directory");
    expect(html).not.toContain("Vendors");
    expect(pageSrc).toContain("ChannelsStatusFilter");
    expect(pageSrc).not.toContain("@/components/layout/status-filter");
    expect(pageSrc).not.toContain("import { StatusFilter }");
  });

  it("does not render VendorForm fields on the empty page", async () => {
    const html = await renderChannels([]);

    for (const label of VENDOR_FORM_FIELD_LABELS) {
      if (label === "Active") continue; // directory status option, not the form checkbox
      expect(html).not.toContain(label);
    }
    expect(html).not.toContain("Company info");
    expect(html).not.toContain("Export format spec");
    expect(html).not.toContain("Save channel");
    expect(pageSrc).not.toContain("VendorForm");
    expect(pageSrc).not.toContain("New channel");
  });

  it("uses house empty chrome and the Channels card primitives, not a Filmhub skin", async () => {
    const html = await renderChannels([]);

    expect(html).toContain("rounded-[var(--radius-lg)]");
    expect(html).toContain("bg-surface-muted");
    expect(html).toContain("size-12");
    expect(html).toContain("size-6");
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain("stroke-width=\"1.33\"");
    expect(html).not.toContain("border-dashed");
    expect(html).not.toContain("#635BFF");
    expect(pageSrc).not.toContain("EmptyState");
    expect(pageSrc).not.toContain("StaffDirectoryList");
    expect(pageSrc).toContain("PageHeader");
    expect(pageSrc).toContain("ChannelCardGrid");
    expect(pageSrc).toContain("ChannelCard");
  });

  it("renders empty Add channel as Sporty Blue text, matching Titles empty action", async () => {
    const html = await renderChannels([]);
    const marker = html.indexOf('data-channels-add=""');
    const addStart = html.lastIndexOf("<a", marker);
    const addEnd = html.indexOf("</a>", marker);
    const add = html.slice(addStart, addEnd);
    const viewTitlesClass = "t-body-sm text-accent transition-colors hover:underline";
    const titlesSrc = readFileSync("src/app/(app)/aggregation/titles/page.tsx", "utf8");

    expect(titlesSrc).toContain("AddTitleButton");
    expect(pageSrc).toContain(viewTitlesClass);
    expect(add).toContain("t-body-sm");
    expect(add).toContain("text-accent");
    expect(add).toContain("hover:underline");
    expect(add).toContain(CHANNELS_PAGE.addChannel);
    expect(add).not.toContain("bg-accent");
    expect(add).not.toContain("text-accent-contrast");
    expect(add).not.toContain("rounded-[12px]");
    expect(add).not.toContain("px-[var(--space-4)]");
    expect(add).not.toContain("py-[var(--space-2)]");
    expect(add).not.toContain("inline-flex");
  });

  it("does not put Add channel in the header when the directory is empty", async () => {
    const html = await renderChannels([]);
    const headerEnd = html.indexOf("data-channels-directory");
    const header = html.slice(0, headerEnd);
    expect(header).toContain(CHANNELS_PAGE.title);
    expect(header).toContain(CHANNELS_PAGE.identity);
    expect(header).not.toContain(CHANNELS_PAGE.addChannel);
    expect(header).not.toContain(CHANNELS_PAGE.addHref);
  });

  it("renders a house card grid of real channels", async () => {
    const inactive: VendorRow = {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Northwind Partners",
      delivery_mode: "portal_upload",
      active: false,
    };
    const html = await renderChannels([REAL_VENDOR, inactive]);

    expect(html).toContain("data-channels-grid");
    expect(html).toContain(`data-channel-card="${REAL_VENDOR.id}"`);
    expect(html).toContain("data-channel-card-plate");
    expect(html).toContain("data-channel-card-tags");
    expect(html).not.toContain("data-staff-directory-row");
    expect(html).not.toContain("data-channels-empty=\"\"");
    expect(html).toContain("data-channels-add=\"\"");
    expect(html).toContain("Acme Distribution");
    expect(html).toContain("Northwind Partners");
    expect(html).toContain(`/channels/${REAL_VENDOR.id}`);
    expect(html).toContain(`/channels/${inactive.id}`);
    expect(html).toContain("Email");
    expect(html).toContain("Portal upload");
    expect(html).toContain("Active");
    expect(html).toContain("Inactive");
    expect(html).toContain("AD");
    expect(html).toContain("NP");
    expect(html).toContain("2 channels");
    expect(html).toContain(CHANNELS_PAGE.identity);
    expect(html).not.toContain("ACTION ADVENTURE");
    expect(html).not.toMatch(/verified|checkmark/i);
    for (const label of VENDOR_FORM_FIELD_LABELS) {
      if (label === "Active") continue;
      expect(html).not.toContain(label);
    }
  });

  it("filters the card grid by ?status= without a chip strip", async () => {
    const inactive: VendorRow = {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Northwind Partners",
      delivery_mode: "portal_upload",
      active: false,
    };
    stubClient([REAL_VENDOR, inactive]);
    const html = renderToStaticMarkup(
      await GcChannelsPage({ searchParams: Promise.resolve({ status: "active" }) }),
    );

    expect(html).toContain("data-channels-status-trigger");
    expect(html).toContain("Acme Distribution");
    expect(html).not.toContain("Northwind Partners");
    expect(html).toContain("1 channel");
    expect(html).not.toContain('role="group"');
    expect(pageSrc).not.toContain("@/components/layout/status-filter");
    expect(pageSrc).not.toContain("import { StatusFilter }");
  });

  it("does not invent fixture channels in the page source", () => {
    expect(pageSrc).not.toMatch(/Netflix|Amazon|Hulu|Meridian|FIXTURE/i);
    expect(pageSrc).toContain("normalizeVendorDirectory");
    expect(pageSrc).not.toContain("VendorForm");
  });

  it("bounds the vendors table read", async () => {
    const { from, vendorsChain, deliveriesChain } = stubClient([]);
    await GcChannelsPage();
    expect(from).toHaveBeenCalledWith("vendors");
    expect(from).toHaveBeenCalledWith("deliveries");
    expect(vendorsChain.range).toHaveBeenCalled();
    expect(deliveriesChain.range).toHaveBeenCalled();
    expect(UNPAGINATED_MAX).toBeGreaterThan(0);
  });
});

describe("staff rail and neighboring locks", () => {
  it("keeps operator dests on GC_NAV, not concatenated under Aggregation", () => {
    expect(GC_NAV.map((item) => item.label)).toEqual([
      "Queue",
      "Avails",
      "Licensing Status",
      "Channels",
      "Finance",
      "Clients",
    ]);
    expect(NAV.map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(GC_NAV.map((item) => item.label)).not.toContain("Ask 24Frame AI");
  });

  it("does not restyle 24Frame AI, client home, Access, or /aggregation/titles", () => {
    const ask = readFileSync("src/components/messages/ask-frame-ai-landing.tsx", "utf8");
    const titles = readFileSync("src/app/(app)/aggregation/titles/page.tsx", "utf8");
    const nav = readFileSync("src/components/chrome/side-nav.tsx", "utf8");
    const home = readFileSync("src/app/(app)/aggregation/dashboard/page.tsx", "utf8");

    expect(ask).toContain("Overlay landing, Mercury-direct");
    expect(ask).toContain("rounded-[28px]");
    expect(titles).toContain("TITLES_CATALOG");
    expect(nav).toContain("Access rail");
    expect(home).toContain("GcClientsDirectory");
    expect(pageSrc).not.toContain("ask-frame-ai");
    expect(pageSrc).not.toContain("TITLES_CATALOG");
    expect(readFileSync("src/app/(app)/(operator)/staff/channels/new/page.tsx", "utf8")).toContain(
      "VendorForm",
    );
    expect(readFileSync("src/app/(app)/(operator)/staff/channels/[id]/edit/page.tsx", "utf8")).toContain(
      "VendorForm",
    );
    expect(readFileSync("src/app/(app)/(operator)/staff/channels/[id]/page.tsx", "utf8")).not.toContain(
      "VendorForm",
    );
  });
});
