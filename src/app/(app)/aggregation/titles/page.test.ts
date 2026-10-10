import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { titleArtworkUrls } from "@/lib/artwork";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/supabase/context";
import { LIST_PAGE } from "@/lib/list-bounds";
import { TITLE_STATUS_LABELS, type TitleStatus } from "@/lib/titles";
import { titleStatusProgress } from "@/lib/status-progress";
import { TITLES_CATALOG, catalogSearchMissCopy } from "@/lib/titles-catalog";
import { NAV } from "@/lib/nav";
import TitlesPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ refresh: vi.fn(), prefetch: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/aggregation/titles",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
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

const ALL_STATUSES: TitleStatus[] = [
  "draft",
  "submitted",
  "in_review",
  "in_delivery",
  "live",
  "takedown_requested",
  "taken_down",
];

function ctx({
  canOperate = true,
  isGcStaff = false,
  hasOrg = true,
  aggregationViewAs = null,
}: {
  canOperate?: boolean;
  isGcStaff?: boolean;
  hasOrg?: boolean;
  aggregationViewAs?: { orgId: string; orgName: string } | null;
} = {}) {
  const org = hasOrg ? { id: "org-1", name: "Acme", status: "active" } : null;
  return {
    user: { id: "u1", email: "someone@example.com" },
    rows: org ? [{ role: "account_owner", organizations: org }] : [],
    orgs: org ? [{ id: org.id, name: org.name }] : [],
    activeOrg: org,
    activeRole: org ? "account_owner" : null,
    canOperate: hasOrg && canOperate,
    isGcStaff,
    aggregationViewAs,
    unread: Promise.resolve(0),
  };
}

function titleRow(
  status: TitleStatus,
  i: number,
  extras: { release_date?: string | null; created_at?: string; title?: string; id?: string } = {},
) {
  return {
    id: extras.id ?? `title-${status}`,
    title: extras.title ?? `${status} film`,
    status,
    created_at: extras.created_at ?? `2026-08-${String(10 + i).padStart(2, "0")}T00:00:00Z`,
    catalog_id: `GC-${i}`,
    release_date: extras.release_date === undefined ? null : extras.release_date,
  };
}

function stubClient(
  titles: ReturnType<typeof titleRow>[] = ALL_STATUSES.map((status, i) => titleRow(status, i)),
  gcCanOperate = true,
) {
  const titlesChain = {
    select: vi.fn(() => titlesChain),
    eq: vi.fn(() => titlesChain),
    is: vi.fn(() => titlesChain),
    neq: vi.fn(() => titlesChain),
    in: vi.fn(() => titlesChain),
    order: vi.fn(() => titlesChain),
    range: vi.fn(async () => ({ data: titles, error: null })),
  };
  const from = vi.fn((table: string) => {
    if (table === "titles") return titlesChain;
    throw new Error(`unexpected from(${table})`);
  });
  // Staff only: gc_can(operate), delete_title's staff gate.
  const rpc = vi.fn(async (name: string) => {
    if (name === "gc_can") return { data: gcCanOperate, error: null };
    throw new Error(`unexpected rpc(${name})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc, titlesChain };
}

async function renderCatalog(
  search: Record<string, string | string[] | undefined> = {},
) {
  return renderToStaticMarkup(await TitlesPage({ searchParams: Promise.resolve(search) }));
}

/** Full opening tag that carries `marker` — not the leftover attrs after it. */
function openingTagsWith(html: string, marker: string): string[] {
  const tags: string[] = [];
  let from = 0;
  while (true) {
    const at = html.indexOf(marker, from);
    if (at === -1) break;
    const start = html.lastIndexOf("<", at);
    const end = html.indexOf(">", at);
    if (start === -1 || end === -1) break;
    tags.push(html.slice(start, end + 1));
    from = end + 1;
  }
  return tags;
}

describe("client /titles catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(titleArtworkUrls).mockResolvedValue(new Map());
  });

  it("lists every lifecycle state on one catalog page", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();

    expect(html).toContain("data-titles-catalog");
    expect(html).toContain("data-titles-catalog-list");
    expect(html).toContain("data-titles-catalog-list-row");
    expect(html).toContain("data-titles-catalog-toolbar");
    expect(html).toContain("aspect-[16/9]");
    expect(html).toContain("rounded-[var(--radius-lg)]");
    expect(html).toContain('data-titles-catalog-crop="cover"');
    expect(html).toContain("[&amp;_img]:object-cover");
    expect(html).toContain("[&amp;_img]:object-center");
    expect(html).not.toContain("data-titles-catalog-grid");
    expect(html).not.toContain("data-titles-catalog-card");
    expect(html).not.toContain("xl:grid-cols-5");
    expect(html).not.toContain("aspect-[2/3]");
    expect(html).not.toContain("Recently added");
    expect(html).not.toContain("Spotlight");
    expect(html).not.toContain("In progress");
    expect(html).not.toMatch(/\bUpcoming\b/);
    expect(html).not.toContain("FIXTURE");
    expect(html).not.toContain("Meridian");
    expect(html).not.toMatch(/hover:scale|group-hover:scale/);

    const rows = html.match(/data-titles-catalog-list-row=""/g) ?? [];
    expect(rows).toHaveLength(ALL_STATUSES.length);
    expect(html).toMatch(
      /data-titles-catalog-list-row[\s\S]*data-titles-catalog-frame[\s\S]*data-titles-catalog-status/,
    );

    const statusLabels = [...html.matchAll(/data-status-progress-label=""[^>]*>([^<]*)/g)].map(
      (match) => match[1],
    );
    expect(statusLabels).toEqual(ALL_STATUSES.map((status) => titleStatusProgress(status).label));
    expect(new Set(statusLabels).size).toBe(7);
    expect(statusLabels.filter((label) => label === "Submitted")).toHaveLength(1);
    expect(statusLabels.filter((label) => label === "In delivery")).toHaveLength(1);
    expect(statusLabels).not.toContain("Delivered");
    expect(statusLabels).not.toContain("delivered");

    for (const [i, status] of ALL_STATUSES.entries()) {
      expect(html).toContain(`${status} film`);
      expect(html).toContain(`/titles/24F-${i}`);
      expect(html).not.toContain(`/titles/title-${status}`);
      expect(html).toContain(`data-title-status="${status}"`);
      expect(html).toContain(titleStatusProgress(status).label);
    }
  });

  it("puts Titles + status and phone + on the header row, then search-only phone toolbar", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();

    expect(html).toContain("titles-catalog-header");
    expect(html).toContain("data-titles-catalog-header-row");
    expect(html).toContain("data-titles-catalog-header-cluster");
    expect(html).toContain("data-titles-catalog-toolbar");
    expect(html).toContain("data-titles-catalog-search");
    expect(html).toContain("data-titles-catalog-filters");
    expect(html).toContain("data-titles-catalog-header-operate");
    expect(html).toContain("data-titles-catalog-operate");
    expect(html).toContain(
      "titles-catalog mx-auto flex w-full flex-col gap-[var(--space-2)] px-[var(--space-4)]",
    );
    expect(html).not.toContain("md:gap-[var(--space-8)]");
    expect(html).toContain("data-titles-catalog-title-mobile");
    expect(html).toContain("data-titles-catalog-title-desktop");
    expect(html).toContain("t-heading text-ink");
    expect(html).toContain("t-title text-ink");
    expect(html).not.toMatch(/<h1[^>]*t-display/);
    expect(html).not.toMatch(/<h1[^>]*t-section/);
    expect(html).not.toContain("data-titles-catalog-count");
    expect(html).not.toContain("in catalog");

    const titleClose = html.indexOf("</h1>");
    const filtersAt = html.indexOf("data-titles-catalog-filters");
    const headerOperateAt = html.indexOf("data-titles-catalog-header-operate");
    const iconAt = html.indexOf("data-add-title-icon");
    const toolbarAt = html.indexOf("data-titles-catalog-toolbar");
    const searchAt = html.indexOf(TITLES_CATALOG.searchPlaceholder);
    const chromeAt = html.indexOf("data-titles-catalog-chrome");
    const labeledAt = html.indexOf("data-add-title-labeled");
    expect(titleClose).toBeGreaterThan(-1);
    // Status + phone plus trail on the header (Dashboard All time SoT), before toolbar.
    expect(filtersAt).toBeGreaterThan(-1);
    expect(filtersAt).toBeLessThan(toolbarAt);
    expect(headerOperateAt).toBeGreaterThan(filtersAt);
    expect(headerOperateAt).toBeLessThan(toolbarAt);
    expect(iconAt).toBeGreaterThan(headerOperateAt);
    expect(iconAt).toBeLessThan(toolbarAt);
    expect(toolbarAt).toBeGreaterThan(titleClose);
    expect(searchAt).toBeGreaterThan(toolbarAt);
    // Phone toolbar is search only; labeled Add Title stays desktop chrome.
    expect(chromeAt).toBeGreaterThan(searchAt);
    expect(labeledAt).toBeGreaterThan(chromeAt);
    expect(filtersAt).toBeLessThan(chromeAt);

    expect(html).toContain(TITLES_CATALOG.addTitle);
    expect(html).toContain(`aria-label="${TITLES_CATALOG.addTitle}"`);
    expect(html).toContain(TITLES_CATALOG.statusFilterLabel);
    expect(html).toContain("data-house-page-select");
    expect(html).toContain("data-titles-catalog-status-current");
    expect(html).toContain(">All<");
    expect(html).not.toContain("data-titles-catalog-status-pills");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("data-titles-catalog-fab");
  });

  it("keeps search, Add Title, and quiet TITLE_STATUS_LABELS pills — no SaaS subtitle", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();

    expect(html).toContain(TITLES_CATALOG.title);
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(html).toContain(TITLES_CATALOG.addTitle);
    expect(html).toContain("data-add-title");
    const add = openingTagsWith(html, 'data-add-title=""');
    const icon = openingTagsWith(html, 'data-add-title-icon=""');
    const labeled = openingTagsWith(html, 'data-add-title-labeled=""');
    expect(add).toHaveLength(2);
    expect(icon).toHaveLength(1);
    expect(labeled).toHaveLength(1);
    expect(icon[0]).toContain("bg-accent");
    expect(icon[0]).toContain("size-[44px]");
    expect(labeled[0]).toContain("t-body-sm");
    expect(labeled[0]).toContain("bg-accent");
    expect(labeled[0]).toContain("text-accent-contrast");
    expect(labeled[0]).toContain("rounded-full");
    expect(html).not.toContain("titles in Acme");
    expect(html).not.toContain("in Acme's catalog");
    expect(html).not.toMatch(/t-label[^>]*data-titles-catalog-status/);
    expect(html).not.toMatch(/genre/i);
    expect(html).not.toMatch(/director/i);

    const statusHosts = openingTagsWith(html, 'data-titles-catalog-status=""');
    expect(statusHosts.length).toBeGreaterThanOrEqual(ALL_STATUSES.length);
    const pipelineHosts = statusHosts.filter((open) =>
      open.includes('data-status-progress-variant="pipeline"'),
    );
    const offHosts = statusHosts.filter((open) =>
      open.includes('data-status-progress-variant="off"'),
    );
    expect(pipelineHosts.length).toBeGreaterThan(0);
    expect(offHosts.length).toBeGreaterThan(0);
    expect(html).toContain('data-status-progress-seg="filled"');
    expect(html).toContain("bg-accent");
    expect(html).not.toMatch(/data-titles-catalog-status[\s\S]{0,200}green|emerald|rose|red/);
    for (const open of offHosts) {
      expect(open).toContain("rounded-full");
      expect(open).toContain("border-hairline");
      expect(open).not.toContain("bg-accent");
    }
    expect(html).toContain("t-body font-medium text-ink");
    expect(html).toContain("t-heading text-ink");
    expect(html).not.toContain("rounded-full bg-surface-muted");
    expect(html).not.toMatch(/data-titles-catalog-list-row[\s\S]*t-section/);
    expect(html).not.toMatch(/data-titles-catalog-list-row[\s\S]*t-display/);
    expect(html).not.toMatch(/data-titles-catalog-list-row[\s\S]*t-title/);
    const filtersHtml = html.slice(
      html.indexOf("data-titles-catalog-filters"),
      html.indexOf("data-titles-catalog-header-operate"),
    );
    expect(filtersHtml).toContain("t-body-sm");
    expect(filtersHtml).toContain("data-titles-catalog-status-compact");
    expect(filtersHtml).not.toContain("t-label ");
    expect(filtersHtml).not.toContain("uppercase");
    expect(filtersHtml).not.toContain("data-status-progress-track");
    // Status is on the header identity row, not in toolbar chrome.
    expect(html).toContain("data-titles-catalog-header-row");
    expect(html.indexOf("data-titles-catalog-filters")).toBeLessThan(
      html.indexOf("data-titles-catalog-toolbar"),
    );
    expect(html).not.toContain("group-hover:text-ink-2");
    for (const status of ALL_STATUSES) {
      expect(html).toContain(titleStatusProgress(status).label);
    }
    expect(html).toContain(TITLE_STATUS_LABELS.submitted);
  });

  it("puts a quiet 24F- public id on the row and links with it", async () => {
    stubClient([titleRow("live", 0, { title: "Public id film", id: "uuid-live" })]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();

    expect(html).toContain('href="/aggregation/titles/24F-0"');
    expect(html).toContain("data-titles-catalog-public-id");
    expect(html).toContain("24F-0");
    expect(html).not.toContain("/aggregation/titles/uuid-live");
    expect(html).not.toContain("GC-0");
  });

  it("shows the release_date year on the row and omits it when unset", async () => {
    stubClient([
      titleRow("live", 0, {
        title: "Dated film",
        release_date: "2019-05-01",
        created_at: "2026-08-10T00:00:00Z",
      }),
      titleRow("draft", 1, {
        title: "Undated film",
        release_date: null,
        created_at: "2026-08-11T00:00:00Z",
      }),
    ]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();

    expect(html).toContain("Dated film");
    expect(html).toContain("data-titles-catalog-list-row");
    expect(html).toContain("data-titles-catalog-year");
    expect(html).toContain("2019");
    const yearTag = openingTagsWith(html, 'data-titles-catalog-year=""');
    expect(yearTag).toHaveLength(1);
    expect(yearTag[0]).toContain("t-body-sm text-ink-3");
    expect(html).toContain("Undated film");
    expect(html).not.toContain("—");
    expect(html).not.toContain("2026-08-10");
    expect(html).not.toContain("2026-08-11");
    expect(html).not.toMatch(/genre/i);
    const years = html.match(/data-titles-catalog-year=""/g) ?? [];
    expect(years).toHaveLength(1);
    expect(html).toMatch(
      /data-titles-catalog-list-row[\s\S]*Dated film[\s\S]*data-titles-catalog-year[\s\S]*2019[\s\S]*data-titles-catalog-status/,
    );
    const undatedRow = html.slice(html.indexOf("Undated film"));
    expect(undatedRow.slice(0, undatedRow.indexOf("data-titles-catalog-status"))).not.toContain(
      "data-titles-catalog-year",
    );
  });

  it("reads each title as a landscape-thumb row in a hairline list", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();
    const rows = openingTagsWith(html, 'data-titles-catalog-list-row=""');
    const frames = openingTagsWith(html, 'data-titles-catalog-frame=""');
    expect(rows).toHaveLength(ALL_STATUSES.length);
    expect(frames).toHaveLength(ALL_STATUSES.length);
    for (const open of rows) {
      expect(open).toContain("flex flex-col");
      expect(open).toContain("md:flex-row");
      expect(open).toContain("md:items-center");
      expect(open).toContain("md:px-[var(--space-4)]");
    }
    for (const open of frames) {
      expect(open).toContain("aspect-[16/9]");
      expect(open).toContain("rounded-[var(--radius-lg)]");
    }
    expect(html).not.toContain("bg-gradient");
    expect(html).not.toContain("from-accent");
    expect(html).not.toContain("bg-band");
  });

  it("applies the same 16:9 cover crop to every catalog still", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();
    const frames = openingTagsWith(html, 'data-titles-catalog-frame=""');
    expect(frames).toHaveLength(ALL_STATUSES.length);
    for (const open of frames) {
      expect(open).toContain("data-titles-catalog-frame");
      expect(open).toContain('data-titles-catalog-crop="cover"');
      expect(open).toContain("aspect-[16/9]");
      expect(open).toContain("[&amp;_img]:object-cover");
      expect(open).toContain("[&amp;_img]:object-center");
      expect(open).not.toContain("aspect-[2/3]");
      expect(open).not.toContain("object-contain");
    }
  });

  it("keeps title ink and year plus TITLE_STATUS_LABELS on the row", async () => {
    stubClient([
      titleRow("live", 0, { title: "Stacked film", release_date: "2019-05-01" }),
    ]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();
    const name = openingTagsWith(html, 'data-titles-catalog-name=""');
    expect(name).toHaveLength(1);
    expect(name[0]).toContain("t-body font-medium text-ink");
    expect(name[0]).toContain("md:truncate");
    expect(name[0].replaceAll("md:truncate", "")).not.toContain("truncate");
    expect(name[0]).not.toContain("t-heading");
    expect(html).toMatch(
      /data-titles-catalog-name[\s\S]*Stacked film[\s\S]*data-titles-catalog-year[\s\S]*2019[\s\S]*data-titles-catalog-status[\s\S]*Approved/,
    );
    expect(html).toContain("gap-[var(--space-1)]");
    expect(html).not.toContain("Delivered");
    expect(html).not.toContain("delivered");
  });

  it("uses landscape banners and leaves poster-only titles as muted placeholders", async () => {
    stubClient([
      titleRow("draft", 0, { title: "Poster title" }),
      titleRow("live", 1, { title: "Banner title" }),
    ]);
    vi.mocked(titleArtworkUrls).mockResolvedValue(
      new Map([
        ["title-draft", { poster: "https://cdn/poster.jpg", banner: null }],
        ["title-live", { poster: null, banner: "https://cdn/wide.jpg" }],
      ]),
    );
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();

    expect(html).toContain("https://cdn/wide.jpg");
    expect(html).not.toContain("https://cdn/poster.jpg");
    expect(html).toContain("data-titles-catalog-empty-art");
    const frames = openingTagsWith(html, 'data-titles-catalog-frame=""');
    expect(frames).toHaveLength(2);
    for (const open of frames) {
      expect(open).toContain('data-titles-catalog-crop="cover"');
      expect(open).toContain("aspect-[16/9]");
      expect(open).toContain("[&amp;_img]:object-cover");
      expect(open).toContain("[&amp;_img]:object-center");
    }
  });

  it("leaves missing artwork as an honest empty, not a fake poster", async () => {
    stubClient([titleRow("draft", 0)]);
    vi.mocked(titleArtworkUrls).mockResolvedValue(new Map());
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const html = await renderCatalog();

    expect(html).toContain("data-titles-catalog-empty-art");
    expect(html).not.toContain("t-data select-none text-3xl");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('rel="preload"');
    expect(html).not.toContain("poster.jpg");
    expect(html).not.toContain("https://cdn/");
  });

  it("shows row lifecycle actions for operate and hides them for a reader", async () => {
    stubClient([titleRow("draft", 0), titleRow("live", 1)]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ canOperate: true }) as never);
    const operate = await renderCatalog();
    expect(operate).toContain("data-title-lifecycle-menu");
    expect(operate).toContain("data-titles-catalog-row-actions");

    stubClient([titleRow("draft", 0), titleRow("live", 1)]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ canOperate: false }) as never);
    const reader = await renderCatalog();
    expect(reader).not.toContain("data-title-lifecycle-menu");
    expect(reader).not.toContain("data-titles-catalog-row-actions");
  });

  it("keeps staff lifecycle actions when view-as is off and hides Add Title", async () => {
    stubClient([titleRow("draft", 0)]);
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ canOperate: false, isGcStaff: true, aggregationViewAs: null }) as never,
    );

    const html = await renderCatalog();

    expect(html).toContain("data-title-lifecycle-menu");
    expect(html).toContain("data-title-lifecycle-delete-confirm");
    expect(html).not.toContain("data-add-title");
  });

  // Adam, 2026-10-10, "Yes, in #799 (Recommended)": delete_title's staff gate
  // is gc_can(auth.uid(), 'operate'); a read-only GC role is not offered Delete.
  it("offers staff Delete only when the GC role can operate", async () => {
    const operator = stubClient([titleRow("draft", 0)], true);
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ canOperate: false, isGcStaff: true, aggregationViewAs: null }) as never,
    );
    expect(await renderCatalog()).toContain("data-title-lifecycle-delete-confirm");
    expect(operator.rpc).toHaveBeenCalledWith("gc_can", { p_uid: "u1", p_capability: "operate" });

    stubClient([titleRow("draft", 0)], false);
    const readOnly = await renderCatalog();
    expect(readOnly).not.toContain("data-title-lifecycle-delete-confirm");
    expect(readOnly).not.toContain("data-title-lifecycle-menu");

    // An org role does not stand in for the GC role.
    stubClient([titleRow("draft", 0)], false);
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ canOperate: true, isGcStaff: true, aggregationViewAs: null }) as never,
    );
    expect(await renderCatalog()).not.toContain("data-title-lifecycle-delete-confirm");
  });

  it("never asks gc_can for a member who is not staff", async () => {
    const member = stubClient([titleRow("draft", 0)], false);
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ canOperate: true }) as never);
    expect(await renderCatalog()).toContain("data-title-lifecycle-delete-confirm");
    expect(member.rpc).not.toHaveBeenCalled();
  });

  it("hides catalog operate controls while Aggregation view-as is active", async () => {
    stubClient([titleRow("draft", 0), titleRow("live", 1)]);
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({
        canOperate: true,
        isGcStaff: true,
        aggregationViewAs: { orgId: "org-1", orgName: "Acme" },
      }) as never,
    );

    const html = await renderCatalog();

    expect(html).toContain("draft film");
    expect(html).toContain("live film");
    expect(html).not.toContain("data-title-lifecycle-menu");
    expect(html).not.toContain("data-titles-catalog-row-actions");
    expect(html).not.toContain("data-add-title");
    expect(html).not.toContain("data-add-title-icon");
    expect(html).not.toContain(TITLES_CATALOG.addTitle);
  });

  it("hides Add Title when the viewer cannot operate", async () => {
    stubClient([titleRow("live", 0)]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ canOperate: false }) as never);

    const html = await renderCatalog();

    expect(html).toContain("live film");
    expect(html).toContain(TITLE_STATUS_LABELS.live);
    expect(html).toContain("Search titles");
    expect(html).toContain("data-titles-catalog-status");
    expect(html).not.toContain("data-add-title");
    expect(html).not.toContain("data-add-title-icon");
    expect(html).not.toContain("data-titles-catalog-header-operate");
    expect(html).not.toContain(TITLES_CATALOG.addTitle);
  });

  it("does not split drafts onto another nav item", () => {
    const titleItems = NAV.filter((item) => item.href === "/aggregation/titles" || /draft/i.test(item.label));
    expect(titleItems).toEqual([expect.objectContaining({ label: "Titles", href: "/aggregation/titles" })]);
    expect(NAV.some((item) => item.href === "/deliveries" && /draft|title/i.test(item.label))).toBe(
      false,
    );
  });

  it("sends a user with no active org home, not to a second catalog", async () => {
    stubClient([]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx({ hasOrg: false, isGcStaff: true }) as never);
    await expect(renderCatalog()).rejects.toThrow("REDIRECT:/");
  });

  it("sends an unauthenticated visitor to login", async () => {
    stubClient([]);
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(renderCatalog()).rejects.toThrow("REDIRECT:/login");
  });

  it("omits a catalog-count subtitle and still names a bounded read", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const exact = await renderCatalog();
    expect(exact).not.toContain("in catalog");
    expect(exact).not.toContain("data-titles-catalog-count");

    const bounded = Array.from({ length: LIST_PAGE + 1 }, (_, i) =>
      titleRow("draft", i, { id: `title-draft-${i}`, title: `Bounded film ${i}` }),
    );
    stubClient(bounded);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();
    expect(html).not.toContain("in catalog");
    expect(html).not.toContain("data-titles-catalog-count");
    expect(html).toContain(`more than ${LIST_PAGE} titles`);
  });

  it("keeps search on the catalog page, not in the global header", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();

    expect(html).toContain(`placeholder="${TITLES_CATALOG.searchPlaceholder}"`);
    expect(html).toContain("data-titles-catalog-search");
    const searchAt = html.indexOf("data-titles-catalog-search");
    const searchOpen = html.slice(html.lastIndexOf("<", searchAt), html.indexOf(">", searchAt) + 1);
    expect(html.slice(searchAt)).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(searchOpen).not.toContain("max-md:hidden");
    expect(html).not.toContain("⌘K");
    expect(html).not.toContain("CommandK");
  });

  it("does not scale stills or invent fixture catalog chrome", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();
    const rows = openingTagsWith(html, 'data-titles-catalog-list-row=""');
    const frames = openingTagsWith(html, 'data-titles-catalog-frame=""');
    for (const open of [...rows, ...frames]) {
      expect(open).not.toMatch(/hover:scale|group-hover:scale|scale-/);
    }
    expect(html).not.toContain("FIXTURE");
    expect(html).not.toContain("Meridian");
    expect(html).not.toContain("The Cartographer");
    expect(html).not.toMatch(/hover:scale|group-hover:scale/);
  });

  it("locks phone and desktop to the same landscape-thumb row and one Sporty Blue Add Title pill", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();
    const list = openingTagsWith(html, 'data-titles-catalog-list=""');
    const rows = openingTagsWith(html, 'data-titles-catalog-list-row=""');
    const add = openingTagsWith(html, 'data-add-title=""');
    const icon = openingTagsWith(html, 'data-add-title-icon=""');
    const labeled = openingTagsWith(html, 'data-add-title-labeled=""');

    expect(html).toContain("Titles");
    expect(html).not.toContain("data-titles-catalog-identity");
    expect(html).not.toContain("Recent");
    expect(list).toHaveLength(1);
    expect(rows).toHaveLength(ALL_STATUSES.length);
    expect(html).not.toContain("snap-x");
    expect(html).not.toContain("w-[140px]");
    expect(html).not.toContain("h-[210px]");
    expect(html).not.toContain("w-[40%]");
    expect(html).toContain("w-full");
    expect(html).toContain("md:w-[160px]");
    expect(html).toContain("flex flex-col");
    expect(html).toContain("md:flex-row");
    expect(html).toContain("data-titles-catalog-status-compact");
    expect(html).toContain("data-house-page-select");
    expect(html).toContain("data-titles-catalog-chrome");
    expect(html).toContain("data-titles-catalog-header-operate");
    expect(html).not.toContain("data-titles-catalog-status-pills");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("data-titles-catalog-fab");
    expect(html).toContain(
      "titles-catalog mx-auto flex w-full flex-col gap-[var(--space-2)] px-[var(--space-4)]",
    );
    expect(add).toHaveLength(2);
    expect(icon).toHaveLength(1);
    expect(labeled).toHaveLength(1);
    expect(icon[0]).toContain("bg-accent");
    expect(icon[0]).toContain("size-[44px]");
    expect(labeled[0]).toContain("t-body-sm");
    expect(labeled[0]).toContain("bg-accent");
    expect(labeled[0]).toContain("rounded-full");
    expect(html).not.toContain("Recently added");
    expect(html).not.toContain("Store");
    expect(html).not.toContain("Apple TV");
    expect(html).not.toContain("bg-band");
    expect(html).not.toMatch(/\bStore\b/);
    expect(html.match(/data-titles-catalog-list=""/g) ?? []).toHaveLength(1);
    expect(html).not.toContain("data-titles-catalog-rail");
    expect(html).not.toContain("data-titles-catalog-grid");
  });

  it("locks empty catalog to one quiet line plus the Add Title pill", async () => {
    stubClient([]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();
    const add = openingTagsWith(html, 'data-add-title=""');
    const icon = openingTagsWith(html, 'data-add-title-icon=""');
    const labeled = openingTagsWith(html, 'data-add-title-labeled=""');

    expect(html).toContain(TITLES_CATALOG.empty);
    expect(html).toContain(TITLES_CATALOG.empty);
    expect(html.split(TITLES_CATALOG.empty).length - 1).toBe(1);
    expect(html).not.toContain("in catalog");
    expect(html).not.toContain("data-titles-catalog-count");
    expect(html).toContain(TITLES_CATALOG.addTitle);
    expect(html).toContain("data-titles-catalog-header-operate");
    expect(add).toHaveLength(2);
    expect(icon).toHaveLength(1);
    expect(labeled).toHaveLength(1);
    expect(icon[0]).toContain("bg-accent");
    expect(labeled[0]).toContain("t-body-sm");
    expect(labeled[0]).toContain("bg-accent");
    expect(labeled[0]).toContain("rounded-full");
    expect(html).not.toContain("data-titles-catalog-list");
    expect(html).not.toContain("data-titles-catalog-rail");
    expect(html).not.toContain("Store");
    expect(html).not.toContain("Recent");
    expect(html).not.toContain("Meridian Pictures");
  });

  it("locks Add Title as the Sporty Blue pill and keeps landscape rows, not a 5-up grid", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog();
    const add = openingTagsWith(html, 'data-add-title=""');
    const labeled = openingTagsWith(html, 'data-add-title-labeled=""');

    expect(add).toHaveLength(2);
    expect(labeled).toHaveLength(1);
    expect(labeled[0]).toContain("t-body-sm");
    expect(labeled[0]).toContain("bg-accent");
    expect(labeled[0]).toContain("text-accent-contrast");
    expect(labeled[0]).toContain("rounded-full");
    expect(html).toContain("data-titles-catalog-list");
    expect(html).toContain("aspect-[16/9]");
    expect(html).not.toContain("data-titles-catalog-grid");
    expect(html).not.toContain("xl:grid-cols-5");
    expect(html).not.toContain("aspect-[2/3]");
  });

  it("filters the list by a product-true status lens", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog({ status: "draft" });

    expect(html).toContain("draft film");
    expect(html).not.toContain("live film");
    expect(html).not.toContain("in_review film");
    expect(html.match(/data-titles-catalog-list-row=""/g) ?? []).toHaveLength(1);
    expect(html).toContain("data-titles-catalog-status-current");
    expect(html).toContain(">Draft<");
    expect(html).toContain("data-house-page-select");
    expect(html).toContain('aria-expanded="false"');
  });

  it("excludes Archived from the default catalog and shows it when filtered", async () => {
    stubClient([
      ...ALL_STATUSES.map((status, i) => titleRow(status, i)),
      titleRow("archived", 9, { title: "archived film", id: "title-archived" }),
    ]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const active = await renderCatalog();
    expect(active).toContain("draft film");
    expect(active).toContain("live film");
    expect(active).not.toContain("archived film");
    expect(active.match(/data-titles-catalog-list-row=""/g) ?? []).toHaveLength(
      ALL_STATUSES.length,
    );

    const archived = await renderCatalog({ status: "archived" });
    expect(archived).toContain("archived film");
    expect(archived).toContain(TITLE_STATUS_LABELS.archived);
    expect(archived).not.toContain("draft film");
    expect(archived.match(/data-titles-catalog-list-row=""/g) ?? []).toHaveLength(1);
  });

  it("filters by URL q and uses catalog search-miss grammar", async () => {
    stubClient([
      titleRow("live", 0, { title: "Harbor Cut", id: "title-harbor" }),
      titleRow("draft", 1, { title: "Winter Light", id: "title-winter" }),
    ]);
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);

    const hit = await renderCatalog({ q: "winter" });
    expect(hit).toContain("Winter Light");
    expect(hit).not.toContain("Harbor Cut");
    expect(hit).toContain(TITLES_CATALOG.searchPlaceholder);

    const miss = await renderCatalog({ q: "Meridian" });
    expect(miss).toContain(catalogSearchMissCopy("Meridian"));
    expect(miss).toContain(TITLES_CATALOG.searchMissHint);
    expect(miss).not.toContain("Harbor Cut");
    expect(miss).not.toContain("Winter Light");
  });

  it("treats submitted and in_delivery as one Submitted lens", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    const html = await renderCatalog({ status: "submitted" });

    expect(html).toContain("submitted film");
    expect(html).toContain("in_delivery film");
    expect(html).not.toContain("draft film");
    expect(html.match(/data-titles-catalog-list-row=""/g) ?? []).toHaveLength(2);
  });
});
