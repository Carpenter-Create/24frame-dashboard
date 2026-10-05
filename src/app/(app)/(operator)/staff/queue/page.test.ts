import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { titleArtworkUrls } from "@/lib/artwork";
import { createClient } from "@/lib/supabase/server";
import { LIST_PAGE } from "@/lib/list-bounds";
import { QUEUE_ACTIVE_STATUSES, QUEUE_PAGE } from "@/lib/queue";
import { TITLES_CATALOG, catalogSearchMissCopy } from "@/lib/titles-catalog";
import GcQueuePage from "./page";
import { TITLE_STATUS_TRACK_STEPS } from "@/lib/status-progress";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/queue",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/artwork", () => ({
  titleArtworkUrls: vi.fn(async () => new Map()),
}));
vi.mock("next/image", () => ({
  default: ({ src, className }: { src: string; className?: string }) =>
    createElement("img", { src, className, alt: "" }),
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
  }) => createElement("a", { href, ...props }, children),
}));

type TitleRow = {
  id: string;
  title: string;
  catalog_id: string | null;
  status: string;
  created_at: string;
  created_by: string | null;
  release_date: string | null;
  organizations: { name: string } | null;
};

function titleRow(overrides: Partial<TitleRow> = {}): TitleRow {
  return {
    id: "title-1",
    title: "Harbor Cut",
    catalog_id: "GC-0001234",
    status: "in_review",
    created_at: "2026-01-01T00:00:00Z",
    created_by: "user-1",
    release_date: "2019-05-01",
    organizations: { name: "Meridian Pictures" },
    ...overrides,
  };
}

function stubClient({
  titles = [] as TitleRow[],
  findings = [] as { entity_id: string }[],
  profiles = [] as { id: string; display_name: string }[],
  audit = [] as { entity_id: string; at: string; after: unknown }[],
} = {}) {
  const titlesChain = {
    select: vi.fn(() => titlesChain),
    in: vi.fn(() => titlesChain),
    is: vi.fn(() => titlesChain),
    order: vi.fn(() => titlesChain),
    range: vi.fn(async () => ({ data: titles, error: null })),
  };
  const findingsChain = {
    select: vi.fn(() => findingsChain),
    eq: vi.fn(() => findingsChain),
    in: vi.fn(() => findingsChain),
    range: vi.fn(async () => ({ data: findings, error: null })),
  };
  const profilesChain = {
    select: vi.fn(() => profilesChain),
    in: vi.fn(async () => ({ data: profiles, error: null })),
  };
  const auditChain = {
    select: vi.fn(() => auditChain),
    eq: vi.fn(() => auditChain),
    in: vi.fn(() => auditChain),
    order: vi.fn(() => auditChain),
    range: vi.fn(async () => ({ data: audit, error: null })),
  };
  const from = vi.fn((table: string) => {
    if (table === "titles") return titlesChain;
    if (table === "findings") return findingsChain;
    if (table === "profiles") return profilesChain;
    if (table === "audit_log") return auditChain;
    throw new Error(`unexpected from(${table})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, titlesChain, findingsChain, profilesChain, auditChain };
}

async function renderQueue(search: Record<string, string | string[] | undefined> = {}) {
  return renderToStaticMarkup(await GcQueuePage({ searchParams: Promise.resolve(search) }));
}

/**
 * Queue remains the focused work queue at /queue. Staff home moving to `/`
 * must not absorb or remove this surface. The list is the Titles catalog
 * primitive plus staff columns — not a Card stack.
 */
describe("GcQueuePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(titleArtworkUrls).mockResolvedValue(new Map());
  });

  it("still renders the focused work queue at /queue through the Titles catalog", async () => {
    const { from, titlesChain } = stubClient();

    const html = renderToStaticMarkup(await GcQueuePage());

    expect(from).toHaveBeenCalledWith("titles");
    expect(titlesChain.in).toHaveBeenCalledWith("status", [...QUEUE_ACTIVE_STATUSES]);
    expect(titlesChain.is).toHaveBeenCalledWith("deleted_at", null);
    expect(html).toContain("data-titles-catalog");
    expect(html).toContain("data-queue-catalog");
    expect(html).toContain("data-titles-catalog-header-row");
    expect(html).toContain(QUEUE_PAGE.title);
    expect(html).not.toContain("Licensing Status");
    expect(html).not.toContain("data-queue-licensing-status");
    expect(html).not.toContain('href="/gc/deliveries"');
    expect(html).not.toContain("Delivery queue");
    expect(html).not.toContain("Needs review");
    expect(html).not.toContain("Ready to deliver");
    expect(html).not.toContain("Titles that need your attention");
  });

  it("bounds the cross-org title read", async () => {
    const { titlesChain } = stubClient();
    await GcQueuePage();
    expect(titlesChain.range).toHaveBeenCalled();
    expect(LIST_PAGE).toBeGreaterThan(0);
  });

  it("renders one catalog empty surface with Nothing waiting.", async () => {
    stubClient();
    const html = renderToStaticMarkup(await GcQueuePage());

    expect(html).toContain(QUEUE_PAGE.empty);
    expect(html).toContain("titles-catalog-empty");
    expect(html).toContain("bg-surface");
    expect(html).not.toContain("Nothing awaiting review.");
    expect(html).not.toContain("Nothing ready to deliver.");
    expect(html).not.toContain("Add");
    expect(html).not.toContain("View titles");
    expect(html.match(new RegExp(QUEUE_PAGE.empty, "g")) ?? []).toHaveLength(1);
    expect(html).not.toContain("data-titles-catalog-list-row");
  });

  it("shows submitter, submitted date, and the Titles status track on each row", async () => {
    stubClient({
      titles: [
        titleRow({
          id: "title-1",
          title: "Harbor Cut",
          created_at: "2026-01-01T00:00:00Z",
          created_by: "user-1",
        }),
        titleRow({
          id: "title-2",
          title: "Winter Light",
          status: "in_delivery",
          created_at: "2026-02-01T00:00:00Z",
          created_by: null,
          catalog_id: "GC-0001235",
          release_date: null,
          organizations: { name: "North" },
        }),
      ],
      profiles: [{ id: "user-1", display_name: "Maya Chen" }],
      audit: [
        {
          entity_id: "title-1",
          at: "2026-03-15T00:00:00Z",
          after: { status: "in_review" },
        },
      ],
      findings: [{ entity_id: "title-1" }, { entity_id: "title-1" }],
    });

    const html = renderToStaticMarkup(await GcQueuePage());

    expect(html).toContain("data-titles-catalog-list");
    expect(html).toContain("data-titles-catalog-list-row");
    expect(html).toContain("data-titles-catalog-staff");
    expect(html).toContain("Harbor Cut");
    expect(html).toContain("Winter Light");
    expect(html).toContain("/gc/titles/title-1");
    expect(html).toContain("/gc/titles/title-2");
    expect(html).toContain("Maya Chen");
    expect(html).toContain("Mar 15, 2026");
    expect(html).toContain("Feb 1, 2026");
    expect(html).toContain("—");
    expect(html).toContain("Meridian Pictures");
    expect(html).toContain("North");
    expect(html).toContain("GC-0001234");
    expect(html).toContain("2019");
    expect(html).toContain("data-titles-catalog-submitter");
    expect(html).toContain("data-titles-catalog-submitted");
    expect(html).toContain("data-titles-catalog-org");
    expect(html).toContain("data-titles-catalog-status");
    expect(html).toContain(TITLE_STATUS_TRACK_STEPS[2]);
    expect(html).toContain(TITLE_STATUS_TRACK_STEPS[3]);
    expect(html).toContain("data-titles-catalog-findings");
    expect(html).toContain("⚑ 2");
    expect(html).not.toContain("Approved · ready to deliver");
    expect(html).not.toContain("from \"@/components/ui/card\"");
  });

  it("does not add a status setter on queue rows — one control lives on title detail", () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf8");
    expect(src).toContain("@/components/titles/titles-catalog");
    expect(src).toContain("TitlesCatalogListRow");
    expect(src).toContain("TitlesCatalogToolbar");
    expect(src).toContain("HousePageSearch");
    expect(src).toContain("TITLES_CATALOG.searchPlaceholder");
    expect(src).toContain("filterTitles");
    expect(src).toContain("catalogSearchMissCopy");
    expect(src).toContain("QUEUE_ACTIVE_STATUSES");
    expect(src).not.toContain("GcTitleStatusControl");
    expect(src).not.toContain("setGcTitleStatus");
    expect(src).not.toContain("gc_set_title_status");
    expect(src).not.toContain("@/components/ui/card");
    expect(src).not.toContain("QueueRow");
    expect(src).not.toContain("Delivery queue");
    expect(src).not.toContain("Search queue");
  });

  it("mounts the Titles Search titles toolbar when the queue has rows", async () => {
    stubClient({ titles: [titleRow()] });
    const html = await renderQueue();

    expect(html).toContain(QUEUE_PAGE.title);
    expect(html).not.toContain("Licensing Status");
    expect(html).not.toContain("data-queue-licensing-status");
    expect(html).toContain("data-titles-catalog-toolbar");
    expect(html).toContain("data-titles-catalog-search");
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(html).toContain("data-house-page-search");
    expect(html).toContain('placeholder="Search titles..."');
    expect(html).toContain(">Search titles...</label>");
    expect(html).toContain("Harbor Cut");
    expect(html).not.toContain("data-titles-catalog-filters");
    expect(html).not.toContain("data-add-title");
  });

  it("filters the queue by URL q without widening status scope", async () => {
    const { titlesChain } = stubClient({
      titles: [
        titleRow({ id: "title-1", title: "Harbor Cut" }),
        titleRow({
          id: "title-2",
          title: "Winter Light",
          status: "in_delivery",
          catalog_id: "GC-0001235",
        }),
      ],
    });

    const html = await renderQueue({ q: "winter" });

    expect(titlesChain.in).toHaveBeenCalledWith("status", [...QUEUE_ACTIVE_STATUSES]);
    expect(html).toContain("Winter Light");
    expect(html).not.toContain("Harbor Cut");
    expect(html).toContain("data-titles-catalog-toolbar");
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(html.match(/data-titles-catalog-list-row=""/g) ?? []).toHaveLength(1);
  });

  it("uses Titles search-miss grammar when q matches nothing in the queue", async () => {
    stubClient({ titles: [titleRow()] });
    const html = await renderQueue({ q: "Meridian" });

    expect(html).toContain(catalogSearchMissCopy("Meridian"));
    expect(html).toContain(TITLES_CATALOG.searchMiss("Meridian"));
    expect(html).toContain(TITLES_CATALOG.searchMissHint);
    expect(html).toContain("data-titles-catalog-toolbar");
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(html).toContain("titles-catalog-empty");
    expect(html).not.toContain("Harbor Cut");
    expect(html).not.toContain("Nothing matching");
    expect(html).not.toContain(QUEUE_PAGE.empty);
    expect(html).not.toContain("data-titles-catalog-list-row");
  });

  it("keeps Nothing waiting. and hides search when the queue itself is empty", async () => {
    stubClient();
    const html = await renderQueue({ q: "Harbor" });

    expect(html).toContain(QUEUE_PAGE.empty);
    expect(html).not.toContain(catalogSearchMissCopy("Harbor"));
    expect(html).not.toContain("data-titles-catalog-toolbar");
    expect(html).not.toContain("data-titles-catalog-search");
    expect(html).not.toContain(TITLES_CATALOG.searchPlaceholder);
  });
});
