import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/supabase/context";
import { CLIENTS_PAGE, ORG_ROLE_LABELS, ORG_STATUS_LABELS } from "@/lib/clients";
import { DASHBOARD_HOME, dashboardJustInDate, dashboardJustInTime } from "@/lib/dashboard-home";
import { AGGREGATION_LEAD_TITLE } from "@/lib/aggregation-lead-title";
import { DASHBOARD_ADMIN } from "@/lib/dashboard-admin";
import { DASHBOARD_LICENSING } from "@/lib/dashboard-licensing";
import { DASHBOARD_CRAFT_FIXTURE_ENV, DASHBOARD_FIXTURE } from "@/lib/dashboard-fixture";
import { FINANCE_PAGE } from "@/lib/finance";
import { loadRecipientDashboard } from "@/lib/finance-recipient-load";
import { REPORTS_HREF } from "@/lib/reports";
import { AGGREGATION_EMPTY } from "@/lib/aggregation-empty";
import { DASHBOARD_ATTENTION_CLEAR, dashboardAttentionSummary } from "@/lib/findings";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { TITLE_STATUS_LABELS } from "@/lib/titles";
import { DASHBOARD_SECTION_TITLE_CLASS } from "@/lib/dashboard-craft";
import DashboardPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/finance-recipient-load", () => ({ loadRecipientDashboard: vi.fn() }));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

type Status = "registered" | "awaiting_payment" | "active";

function ctx({
  isGcStaff,
  orgStatus,
  role = "delivery_ops",
}: {
  isGcStaff: boolean;
  orgStatus: Status | null;
  role?: string;
}) {
  const org = orgStatus ? { id: "org-1", name: "Acme", status: orgStatus } : null;
  return {
    user: { id: "u1", email: "someone@example.com" },
    rows: org ? [{ role, organizations: org }] : [],
    orgs: org ? [{ id: org.id, name: org.name }] : [],
    activeOrg: org,
    activeRole: org ? role : null,
    canOperate: !!org && (role === "account_owner" || role === "delivery_ops"),
    isGcStaff,
    unread: Promise.resolve(0),
  };
}

function stubClient(
  titles: {
    id: string;
    title: string;
    status: string;
    created_at: string;
    created_by?: string | null;
    catalog_id?: string | null;
  }[] = [],
  findings: {
    org_id: string;
    entity_id: string;
    message?: string | null;
    severity?: string | null;
    id?: string;
    created_at?: string;
  }[] = [],
  extras: {
    audit?: {
      entity: string;
      entity_id: string | null;
      action: string;
      actor: string | null;
      at: string;
      after?: unknown;
      before?: unknown;
    }[];
    profiles?: { id: string; display_name: string | null }[];
    deliveries?: {
      delivery_id: string;
      title_id: string;
      title: string;
      vendor_name: string;
      territory: string;
      status: string;
      updated_at: string | null;
    }[];
  } = {},
) {
  const eq = vi.fn();
  const titlesChain = {
    select: vi.fn(() => titlesChain),
    eq: (...args: unknown[]) => {
      eq(...args);
      return titlesChain;
    },
    order: vi.fn(() => titlesChain),
    range: vi.fn(async () => ({ data: titles, error: null })),
  };
  const financeChain = {
    select: vi.fn(() => financeChain),
    eq: vi.fn(() => financeChain),
    is: vi.fn(() => financeChain),
    order: vi.fn(() => financeChain),
    limit: vi.fn(() => financeChain),
    range: vi.fn(async () => ({ data: [], error: null })),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  const listChain = {
    select: vi.fn(() => listChain),
    eq: vi.fn(() => listChain),
    in: vi.fn(() => listChain),
    order: vi.fn(() => listChain),
    range: vi.fn(async () => ({ data: [], error: null })),
  };
  const auditChain = {
    select: vi.fn(() => auditChain),
    eq: vi.fn(() => auditChain),
    in: vi.fn(() => auditChain),
    order: vi.fn(() => auditChain),
    range: vi.fn(async () => ({ data: extras.audit ?? [], error: null })),
  };
  const profilesChain = {
    select: vi.fn(() => profilesChain),
    in: vi.fn(async () => ({ data: extras.profiles ?? [], error: null })),
  };
  const from = vi.fn((table: string) => {
    if (table === "titles") return titlesChain;
    if (table === "finance_periods" || table === "contract_terms") return financeChain;
    if (table === "audit_log") return auditChain;
    if (table === "profiles") return profilesChain;
    if (table === "memberships" || table === "assets" || table === "deliveries") {
      return listChain;
    }
    throw new Error(`unexpected from(${table})`);
  });
  const rpc = vi.fn(async (name: string) => {
    if (name === "my_findings") return { data: findings, error: null };
    if (name === "my_deliveries") return { data: extras.deliveries ?? [], error: null };
    if (name === "gc_client_directory") return { data: [], error: null };
    throw new Error(`unexpected rpc(${name})`);
  });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, eq, rpc, titlesChain };
}

function statValue(html: string, key: string): string | null {
  const match = html.match(new RegExp(`data-dashboard-stat="${key}"[^>]*>([^<]*)<`));
  return match?.[1] ?? null;
}

/** Catalog-velocity twin cards are gone from `/dashboard` — Adam lock 2026-09-16. */
function expectNoCatalogVelocityStrip(html: string) {
  expect(html).not.toContain("Added this month");
  expect(html).not.toContain("In pipeline");
  expect(html).not.toContain("data-dashboard-overview-cell");
  expect(html).not.toContain('data-dashboard-overview=""');
}

/** Company-admin structural delta — Adam lock 2026-09-16 via CoS. */
function expectCompanyAdminStructuralDelta(html: string) {
  expectNoCatalogVelocityStrip(html);
  expect(html).toMatch(
    new RegExp(
      `data-dashboard-title-desktop="" class="[^"]*max-md:hidden[^"]*">${AGGREGATION_LEAD_TITLE}<`,
    ),
  );
  expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>Acme</);
  expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>All time</);
  expect(html).not.toContain("data-dashboard-period-kicker");
  expect(html).not.toContain("data-dashboard-just-in");
  expect(html).not.toContain("data-dashboard-do-next");
  expect(html).not.toContain(`>${DASHBOARD_HOME.justIn}<`);
  expect(html).not.toContain(DASHBOARD_HOME.doNext);
  expect(html).not.toContain('data-dashboard-module="deliveries-action"');
  expect(html).not.toContain('data-dashboard-module="findings-glance"');
  expect(html).not.toContain('data-dashboard-module="what-changed"');
  expect(html).not.toContain('data-dashboard-module="pending"');
  expect(html).not.toContain(DASHBOARD_HOME.deliveriesAction);
  expect(html).not.toContain(DASHBOARD_HOME.whatChanged);
  expect(html).not.toContain(DASHBOARD_HOME.pending);
  expect(html).toContain("data-dashboard-revenue");
  expect(html).toContain("$0.00");
  expect(html).toContain("data-dashboard-period");
  expect(html).toContain("data-dashboard-period-current");
  expect(html).toContain("data-dashboard-period-chevron");
  expect(html).not.toContain('data-dashboard-module="attention"');
  expect(html).not.toContain("Recent account activity");
  expect(html).not.toContain('href="/attention"');
  expect(html).toContain('data-dashboard-module="licensing-status"');
  expect(html).toContain(DASHBOARD_LICENSING.title);
  expect(html).not.toContain("data-dashboard-licensing-summary");
  expect(html).toContain('data-dashboard-module="recent-activity"');
  expect(html).toContain(DASHBOARD_ADMIN.activity);
  expect(html).toContain("data-dashboard-top-performing");
  expect(html).toContain(DASHBOARD_HOME.topTitles);
  expect(html).toContain(DASHBOARD_HOME.topPlatforms);
  expect(html).toContain(DASHBOARD_HOME.topTerritories);
  expect(html).not.toContain(DASHBOARD_HOME.topPerforming);
  expect(html).not.toContain("data-dashboard-top-pills");
  expect(html).not.toContain('data-dashboard-top-pill="titles"');
  expect(html).not.toContain('data-dashboard-top-pill="platforms"');
  expect(html).not.toContain('data-dashboard-top-pill="territories"');
  expect(html).toContain('data-dashboard-module="top-titles"');
  expect(html).toContain("data-dashboard-view-alts");
  expect(html).toContain("data-dashboard-view-all");
  expect(html).toContain("data-dashboard-view-all-arrow");
  expect(html).toContain('data-dashboard-view-alt="list"');
  expect(html).toContain('data-dashboard-view-alt="bars"');
  expect(html).toContain('data-dashboard-view-alt="map"');
  expect(html).toContain('data-dashboard-ranked="platforms"');
  expect(html).toContain("data-dashboard-territory");
  expect(html).toContain('data-dashboard-ranked="territories"');
  expect(html).toContain("data-dashboard-territory-map");
  expect(html).not.toContain("lg:grid-cols-2");
  expect(html.indexOf('data-dashboard-module="top-titles"')).toBeLessThan(
    html.indexOf('data-dashboard-ranked="platforms"'),
  );
  expect(html.indexOf('data-dashboard-ranked="platforms"')).toBeLessThan(
    html.indexOf('data-dashboard-ranked="territories"'),
  );
  expect(html).toContain(DASHBOARD_HOME.topTitlesEmpty);
  expect(html).toContain("data-dashboard-ranked-empty");
  expect(html).not.toContain("data-dashboard-reports-cta");
  expect(html).not.toContain(`href="${REPORTS_HREF}"`);
  expect(html).not.toContain(DASHBOARD_HOME.reportsCta);
  expect(html).not.toContain(DASHBOARD_HOME.reportsPointer);
}

/**
 * `/dashboard` has two legitimate modes. A client org still gets the
 * organization-scoped portfolio. GC staff without a client org stay on
 * Dashboard and see the existing GC-wide clients roster — not /queue
 * (focused work stays there) and not the client wizard.
 */
describe("DashboardPage modes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadRecipientDashboard).mockResolvedValue({
      periods: [],
      latestClosed: null,
      latestStatement: null,
      ledger: [],
      clientRateBp: null,
    });
  });

  it("renders the organization-scoped portfolio for a user with a client org", async () => {
    const { from, eq, rpc } = stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(from).toHaveBeenCalledWith("titles");
    expect(eq).toHaveBeenCalledWith("org_id", "org-1");
    expect(rpc).toHaveBeenCalledWith("my_findings", {
      p_limit: UNPAGINATED_MAX + 1,
      p_org_id: "org-1",
    });
    expect(rpc).not.toHaveBeenCalledWith("gc_client_directory", expect.anything());
    expect(html).toContain(AGGREGATION_LEAD_TITLE);
    expect(html).toMatch(/<h1 class="t-title text-ink">Aggregation<\/h1>/);
    expect(html).not.toMatch(/<h1 class="t-title text-ink">Acme<\/h1>/);
    expect(html).not.toMatch(/<h1[^>]*t-display/);
    expect(html).not.toContain(ORG_STATUS_LABELS.active);
    expect(html).not.toContain(ORG_ROLE_LABELS.account_owner);
    expect(html).not.toMatch(/Active · Account owner/);
    expect(html).toContain(DASHBOARD_ATTENTION_CLEAR);
    expect(html).toContain("/attention");
    expect(html).toContain("data-dashboard-home");
    expect(html).toContain("data-dashboard-hero");
    expect(html).toContain("data-dashboard-overview-row");
    expectNoCatalogVelocityStrip(html);
    expect(html).toContain("data-dashboard-territory");
    expect(html).toContain("data-dashboard-ranked=\"platforms\"");
    expect(html).toContain("data-dashboard-reports-cta");
    expect(html).toContain(`href="${REPORTS_HREF}"`);
    expect(html).toContain(DASHBOARD_HOME.reportsCta);
    expect(html).not.toContain("data-finance-glance");
    expect(html).not.toContain("data-finance-glance-stub");
    expect(html).toContain("dashboard-home-pill");
    expect(html).toContain('href="/aggregation/attention"');
    expect(html).toContain("h-9");
    expect(html).toContain("size-[14px]");
    expect(html).toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html.split(DASHBOARD_HOME.catalogEmpty).length - 1).toBe(1);
    expect(html).toContain(DASHBOARD_HOME.addTitle);
    expect(html.split(DASHBOARD_HOME.addTitle).length - 1).toBe(1);
    expect(html).toContain(`href="${DASHBOARD_HOME.addTitleHref}"`);
    expect(html).toContain("data-dashboard-add-title");
    expect(html).not.toContain("data-add-title");
    expect(html).not.toContain(DASHBOARD_HOME.justInEmpty);
    expect(html).not.toContain("Just in");
    expect(html).toContain(DASHBOARD_HOME.catalogHealthCta);
    expect(html).toContain("bg-accent");
    expect(html).toContain("text-accent-contrast");
    expect(html).not.toContain(CLIENTS_PAGE.title);
    expect(html).not.toContain("Organizations with an active seat.");
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("lg:grid-cols-2");
    expect(html).not.toContain(dashboardAttentionSummary(1));
    expect(html).not.toContain("titles need your attention");
    expect(html).not.toContain("Meridian Pictures");
    expect(html).not.toContain("The Winter Line");
    expect(html).not.toContain(">248<");
    expect(html).not.toContain("Accounts");
  });

  it("lists just-in titles as ink links, not accent body copy", async () => {
    const createdAt = new Date().toISOString();
    stubClient([
      {
        id: "title-1",
        title: "Winter Light",
        status: "live",
        created_at: createdAt,
      },
    ]);
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Winter Light");
    expect(html).toContain("/titles/title-1");
    expect(html).toContain("dashboard-home-panel");
    expect(html).toContain("t-body-sm font-medium text-ink");
    expect(html).not.toContain("t-subhead");
    expect(html).not.toContain(DASHBOARD_HOME.justInEmpty);
    expect(html).not.toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html).not.toContain("data-dashboard-add-title");
    expect(html).not.toContain(DASHBOARD_HOME.addTitle);
    expect(html).toContain("data-dashboard-just-in-cluster");
    expect(html).toContain("t-body-sm font-medium text-ink");
    expect(html).toContain(TITLE_STATUS_LABELS.live);
    expect(html).toContain("data-dashboard-status-pill");
    expect(html).toContain(dashboardJustInDate(createdAt));
    expect(html).not.toContain("added ");
  });

  it("still renders the client portfolio when GC staff also hold a client org", async () => {
    const { rpc } = stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: true, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(rpc).toHaveBeenCalledWith("my_findings", {
      p_limit: UNPAGINATED_MAX + 1,
      p_org_id: "org-1",
    });
    expect(rpc).not.toHaveBeenCalledWith("gc_client_directory", expect.anything());
    expect(html).toContain(AGGREGATION_LEAD_TITLE);
    expect(html).toMatch(/<h1 class="t-title text-ink">Aggregation<\/h1>/);
    expect(html).not.toMatch(/<h1 class="t-title text-ink">Acme<\/h1>/);
    expect(html).toContain("data-dashboard-overview-row");
    expect(html).toContain("data-dashboard-hero");
    expect(html).toContain("data-dashboard-reports-cta");
    expect(html).toContain(DASHBOARD_HOME.reportsCta);
    expect(html).not.toContain("data-finance-glance");
    expect(html).not.toContain("data-finance-glance-stub");
    expect(html).not.toContain(FINANCE_PAGE.glance);
    expect(html).not.toContain("Organizations with an active seat.");
  });

  it("renders the GC-wide clients roster on Dashboard for staff with no client org", async () => {
    const { from, rpc } = stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: true, orgStatus: null }) as never,
    );

    const page = await DashboardPage();
    const html = renderToStaticMarkup(page);

    expect(rpc).toHaveBeenCalledWith("gc_client_directory", { p_limit: UNPAGINATED_MAX + 1 });
    expect(from).not.toHaveBeenCalledWith("titles");
    expect(html).toContain(CLIENTS_PAGE.title);
    expect(html).not.toContain("Organizations with an active seat.");
    expect(html).toContain(CLIENTS_PAGE.empty);
    expect(html).toContain("data-finance-glance-stub");
    expect(html).toContain(FINANCE_PAGE.glance);
    expect(html).not.toContain("Dashboard —");
    expect(html).not.toContain("/catalog-health");
    expect(html).not.toContain("data-dashboard-home");
    expect(html).not.toContain("dashboard-home-pill");
    expect(html).not.toContain(DASHBOARD_HOME.justInEmpty);
    expect(html).not.toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html).not.toContain("data-dashboard-add-title");
    expect(html).not.toContain(DASHBOARD_HOME.addTitle);
    expect(html).not.toContain("data-dashboard-snapshot");
    expect(html).not.toContain(DASHBOARD_HOME.doNext);
  });

  it("does not send GC staff with no client org to /queue or the wizard", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: true, orgStatus: null }) as never,
    );

    await expect(DashboardPage()).resolves.toBeTruthy();
  });

  it("shows the empty company workspace for a non-GC user with no org", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: null }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("data-aggregation-empty");
    expect(html).toContain(AGGREGATION_EMPTY.title);
    expect(html).toContain(AGGREGATION_EMPTY.create);
    expect(html).toContain("/onboarding");
    expect(html).not.toContain("data-dashboard-home");
  });

  it("sends an unauthenticated visitor to login", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(DashboardPage()).rejects.toThrow("REDIRECT:/login");
  });
});

function stubRecipient() {
  vi.mocked(loadRecipientDashboard).mockResolvedValue({
    periods: [],
    latestClosed: null,
    latestStatement: null,
    ledger: [],
    clientRateBp: null,
  });
}

describe("client home information model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRecipient();
  });

  it("shows the Overview hero, Top titles, ranked bars, Recent, and Do next without revenue", async () => {
    stubClient(
      [
        {
          id: "title-1",
          title: "Winter Light",
          status: "live",
          created_at: new Date().toISOString(),
        },
        {
          id: "title-2",
          title: "Draft Work",
          status: "draft",
          created_at: new Date().toISOString(),
        },
      ],
      [{ org_id: "org-1", entity_id: "title-1", message: "Synopsis is required." }],
    );
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(statValue(html, "catalog")).toBe("2");
    expect(statValue(html, "needsAttention")).toBe("1");
    expect(statValue(html, "live")).toBe("1");
    expect(html).toMatch(/<h1 class="t-title text-ink">Aggregation<\/h1>/);
    expect(html).not.toMatch(/<h1 class="t-title text-ink">Acme<\/h1>/);
    expect(html).toMatch(/data-dashboard-stat="catalog"[^>]*t-display t-data/);
    expect(html).toMatch(/data-dashboard-stat="needsAttention"[^>]*t-title t-data/);
    expect(html).toMatch(/data-dashboard-stat="live"/);
    expect(html).not.toMatch(/data-dashboard-stat="live"[^>]*t-display/);
    expect(html).not.toMatch(/data-dashboard-stat="catalog"[^>]*t-title/);
    expect(html).not.toMatch(/<h1[^>]*t-display/);
    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.hero}`);
    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.doNext}`);
    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.justIn}`);
    expect(html).toContain(DASHBOARD_HOME.live);
    expect(html).toContain(DASHBOARD_HOME.doNext);
    expect(html).toContain("data-dashboard-overview-row");
    expectNoCatalogVelocityStrip(html);
    expect(html).toContain("data-dashboard-territory");
    expect(html).toContain('data-dashboard-module="top-titles"');
    expect(html).not.toContain(dashboardAttentionSummary(1));
    expect(html).not.toContain("titles need your attention");
    expect(html).toContain("Synopsis is required.");
    expect(html).toContain("t-body-sm font-medium text-ink");
    expect(html).not.toContain("t-subhead");
    expect(html).toContain("Draft Work");
    expect(html).toContain(TITLE_STATUS_LABELS.draft);
    expect(html).toContain("Winter Light");
    expect(html).toContain(TITLE_STATUS_LABELS.live);
    expect(html).toContain("data-dashboard-status-pill");
    expect(html).toContain("data-dashboard-do-next");
    expect(html).toContain("data-dashboard-just-in");
    expect(html).toContain("data-dashboard-hero");
    expectNoCatalogVelocityStrip(html);
    expect(html).toContain("flex flex-col gap-[var(--space-6)]");
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("lg:grid-cols-2");
    expect(html).toContain(DASHBOARD_HOME.justIn);
    expect(html).not.toContain("Just in");
    expect(html).not.toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html).not.toContain("data-dashboard-add-title");
    expect(html).not.toContain(`${ORG_STATUS_LABELS.active} · ${ORG_ROLE_LABELS.account_owner}`);
    expect(html).not.toContain(ORG_STATUS_LABELS.active);
    expect(html).not.toContain(ORG_ROLE_LABELS.account_owner);
    expect(html).not.toContain("Revenue");
    expect(html).not.toContain("Upcoming");
    expect(html).toContain(DASHBOARD_HOME.hero);
    expect(html).not.toContain("dashboard-home-hero");
    expect(html).not.toContain("bg-band");
    expect(html).not.toContain("Access");
    expect(html).not.toContain("term ends");
    expect(html).not.toContain("Meridian Pictures");
    expect(html).not.toContain("Artwork missing");
    expect(html).not.toContain("Metadata incomplete");
    expect(html).not.toMatch(/>—</);
    expect(html.indexOf("data-dashboard-just-in")).toBeLessThan(
      html.indexOf("data-dashboard-do-next"),
    );
  });

  it("shows catalog and live as a floor when the title read is bounded", async () => {
    const createdAt = "2026-08-12T00:00:00.000Z";
    stubClient(
      Array.from({ length: UNPAGINATED_MAX }, (_, i) => ({
        id: `title-${i}`,
        title: `Title ${i}`,
        status: i === 0 ? "draft" : "live",
        created_at: createdAt,
      })),
    );
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(statValue(html, "catalog")).toBe(`${UNPAGINATED_MAX}+`);
    expect(statValue(html, "live")).toBe(`${UNPAGINATED_MAX - 1}+`);
    expect(statValue(html, "needsAttention")).toBe("0");
    expect(statValue(html, "catalog")).not.toBe(String(UNPAGINATED_MAX));
    expect(statValue(html, "live")).not.toBe(String(UNPAGINATED_MAX - 1));
  });

  it("shows needs attention as a floor when the findings probe overflows", async () => {
    stubClient(
      [
        {
          id: "title-1",
          title: "Winter Light",
          status: "live",
          created_at: "2026-08-12T00:00:00.000Z",
        },
      ],
      Array.from({ length: UNPAGINATED_MAX + 1 }, () => ({
        org_id: "org-1",
        entity_id: "title-1",
        message: "Synopsis is required.",
      })),
    );
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(statValue(html, "needsAttention")).toBe("1+");
    expect(statValue(html, "needsAttention")).not.toBe("1");
  });

  it("does not invent a stuck-too-long metric for drafts", async () => {
    stubClient([
      {
        id: "title-2",
        title: "Draft Work",
        status: "draft",
        created_at: "2024-01-01T00:00:00.000Z",
      },
    ]);
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain("Draft Work");
    expect(html).toContain(TITLE_STATUS_LABELS.draft);
    expect(html).not.toMatch(/stuck/i);
    expect(html).not.toContain(DASHBOARD_ATTENTION_CLEAR);
    expect(html).toContain(DASHBOARD_HOME.justInEmpty);
    expect(html).not.toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html).not.toContain("data-dashboard-add-title");
  });
});

describe("client home copy lock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRecipient();
  });

  it("locks empty catalog copy to The catalog is empty. and the existing Add Title action", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());
    const marker = html.indexOf('data-dashboard-add-title=""');
    const addStart = html.lastIndexOf("<a", marker);
    const addEnd = html.indexOf("</a>", marker);
    const link = html.slice(addStart, addEnd);

    expect(html).toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html.split(DASHBOARD_HOME.catalogEmpty).length - 1).toBe(1);
    expect(html.split("Add Title").length - 1).toBe(1);
    expect(html).toContain('href="/aggregation/titles"');
    expect(link).toContain("data-dashboard-add-title");
    expect(link).toContain("Add Title");
    expect(link).toContain('href="/aggregation/titles"');
    expect(link).toContain("t-body-sm");
    expect(link).toContain("text-accent");
    expect(link).toContain("hover:underline");
    expect(link).not.toContain("bg-accent");
    expect(link).not.toContain("text-accent-contrast");
    expect(link).not.toContain("data-add-title");
    expect(html).not.toContain("data-add-title");
    expect(html).not.toContain("No titles added recently.");
    expect(html).not.toContain("No titles yet.");
  });

  it("labels the section Recent, not Just in", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.justIn}`);
    expect(html).toContain(">Recent<");
    expect(html).not.toContain("Just in");
  });

  it("keeps an Artwork missing finding on Do next and does not invent one", async () => {
    stubClient(
      [
        {
          id: "title-1",
          title: "Winter Light",
          status: "live",
          created_at: new Date().toISOString(),
        },
      ],
      [{ org_id: "org-1", entity_id: "title-1", message: "Artwork missing" }],
    );
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );

    const html = renderToStaticMarkup(await DashboardPage());
    const rowStart = html.indexOf('data-dashboard-do-next-row="title-1"');
    const row = html.slice(rowStart, html.indexOf("</li>", rowStart));

    expect(row).toContain("Artwork missing");
    expect(html.split("Artwork missing").length - 1).toBe(1);
    expect(html).not.toContain("Metadata incomplete");
  });

  it("shows the Reports pointer and visual home modules for a client org", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("data-dashboard-hero");
    expect(html).toContain("data-dashboard-overview-row");
    expectNoCatalogVelocityStrip(html);
    expect(html).toContain("data-dashboard-territory");
    expect(html).toContain('data-dashboard-ranked="platforms"');
    expect(html).toContain('data-dashboard-module="top-titles"');
    expect(html).toContain('data-dashboard-module="deliveries-action"');
    expect(html).toContain('data-dashboard-module="findings-glance"');
    expect(html).toContain('data-dashboard-module="what-changed"');
    expect(html).toContain("data-dashboard-reports-cta");
    expect(html).toContain(`href="${REPORTS_HREF}"`);
    expect(html).toContain(DASHBOARD_HOME.reportsCta);
    expect(html).not.toContain("data-finance-glance");
    expect(html).not.toContain("data-finance-glance-stub");
    expect(html).not.toContain("Revenue");
    expect(html).not.toContain("bg-band");
    expect(html).not.toContain("data-reports-period");
    expect(html).not.toContain("data-reports-download");
  });

  it("still shows the Reports pointer when the recipient cannot view financial", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue({
      ...ctx({ isGcStaff: false, orgStatus: "active" }),
      activeRole: "viewer",
    } as never);
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("data-dashboard-home");
    expect(html).toContain("data-dashboard-reports-cta");
    expect(html).not.toContain("data-finance-glance");
    expect(html).not.toContain("data-finance-glance-stub");
  });

  it("hides Add Title on an empty catalog when the viewer cannot operate", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue({
      ...ctx({ isGcStaff: false, orgStatus: "active" }),
      canOperate: false,
    } as never);

    const html = renderToStaticMarkup(await DashboardPage());

    expect(html).toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html).not.toContain("data-dashboard-add-title");
    expect(html).not.toContain(DASHBOARD_HOME.addTitle);
  });
});

describe("company admin Overview hero", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubRecipient();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("rematches RL Overview: period chrome, revenue MetricCard, recent activity, no export", async () => {
    const { from } = stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain("data-dashboard-admin-hero");
    expect(html).toContain("data-dashboard-admin-chrome");
    expect(html).toContain("data-dashboard-admin-controls");
    expect(html).toContain("data-dashboard-period");
    expect(html).not.toContain("data-dashboard-period-grains");
    expect(html).not.toContain("<select");
    expect(html).not.toContain("data-dashboard-user");
    expect(html).toContain("data-dashboard-revenue");
    expect(html).toContain("data-dashboard-revenue-chart");
    expect(html).not.toContain('data-dashboard-module="attention"');
    expect(html).toContain('data-dashboard-module="licensing-status"');
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).toContain("lg:grid-cols-5");
    expect(html).toContain("lg:items-stretch");
    expect(html).toContain("lg:col-span-3");
    expect(html).toContain("lg:col-span-2");
    expect(html).toContain("max-md:flex-col");
    expect(html).toContain("data-dashboard-overview-revenue");
    expect(html).toContain("data-dashboard-overview-attention");
    expect(html).not.toContain("data-dashboard-overview-licensing");
    expect(html).not.toContain("data-dashboard-overview-activity");
    expect(html.indexOf("data-dashboard-overview-revenue")).toBeLessThan(
      html.indexOf("data-dashboard-overview-attention"),
    );
    expect(html.indexOf("data-dashboard-revenue")).toBeLessThan(
      html.indexOf('data-dashboard-module="recent-activity"'),
    );
    expect(html.indexOf('data-dashboard-module="recent-activity"')).toBeLessThan(
      html.indexOf('data-dashboard-module="licensing-status"'),
    );
    expect(html.indexOf('data-dashboard-module="licensing-status"')).toBeLessThan(
      html.indexOf("data-dashboard-top-performing"),
    );
    expect(html.split('data-dashboard-module="recent-activity"').length - 1).toBe(1);
    expect(html.indexOf("data-dashboard-top-performing")).toBeLessThan(
      html.indexOf('data-dashboard-module="top-titles"'),
    );
    expect(html.indexOf('data-dashboard-module="top-titles"')).toBeLessThan(
      html.indexOf('data-dashboard-ranked="platforms"'),
    );
    expect(html.indexOf('data-dashboard-ranked="platforms"')).toBeLessThan(
      html.indexOf('data-dashboard-ranked="territories"'),
    );
    expect(html).toContain("data-dashboard-mobile-stack");
    expect(html).toContain("data-dashboard-title-mobile");
    expect(html).toContain("data-dashboard-title-desktop");
    expect(html).not.toContain("data-dashboard-user-overflow");
    expect(html).not.toContain("data-dashboard-do-next-secondary");
    expectCompanyAdminStructuralDelta(html);
    expect(html).toContain(DASHBOARD_ADMIN.revenue);
    expect(html).toContain("$0.00");
    expect(html).not.toContain(DASHBOARD_ADMIN.revenueEmpty);
    expect(html).toContain(DASHBOARD_ADMIN.activity);
    expect(html).toContain(DASHBOARD_ADMIN.allTime);
    expect(html).toContain(DASHBOARD_ADMIN.period);
    expect(html).toContain("data-dashboard-period-current");
    expect(html).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(html).not.toContain("FIND A USER ACCOUNT");
    expect(html).not.toContain(DASHBOARD_ADMIN.allCompany);
    expect(from).not.toHaveBeenCalledWith("memberships");
    expect(from).not.toHaveBeenCalledWith("profiles");
    expect(html).toContain("As of All time");
    expect(html).toContain("data-dashboard-chart-empty");
    expect(html).not.toContain(DASHBOARD_ADMIN.chartEmpty);
    expect(html).toContain("data-dashboard-overview-row");
    expectNoCatalogVelocityStrip(html);
    expect(html).toContain("data-dashboard-period");
    expect(html).toContain("data-dashboard-revenue");
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).not.toContain("data-dashboard-reports-cta");
    expect(html).not.toContain(`href="${REPORTS_HREF}"`);
    expect(html).not.toContain(DASHBOARD_HOME.reportsCta);
    expect(html).not.toContain(DASHBOARD_HOME.reportsPointer);
    expect(html).not.toContain("data-reports-download");
    expect(html).not.toContain("Export CSV");
    expect(html).not.toContain("View lines");
    expect(html).not.toContain("Royalogic");
    expect(html).not.toContain("Advisory");
    expect(html).not.toContain("bg-band");
    expect(html).not.toContain("shadow-lg");
    expect(html).toContain('data-dashboard-module="top-titles"');
    expect(html).not.toContain("Top works");
    expect(html).not.toContain("HeadlineStats");
    expect(html).not.toContain("contributors");
    expect(html).not.toContain("recharts");
    expect(html).not.toContain("data-dashboard-fixture-banner");
    expect(html).not.toContain(DASHBOARD_FIXTURE.sampleMark);
    expect(loadRecipientDashboard).toHaveBeenCalledWith("org-1");
  });

  it("has no Added-this-month / In-pipeline strip on company-admin Dashboard", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expectCompanyAdminStructuralDelta(html);
    expect(html).toContain("data-dashboard-admin-hero");
  });

  it("locks quiet Period chrome and strips Recent, Do next, and the bottom four", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expectCompanyAdminStructuralDelta(html);
    expect(html).toMatch(/data-dashboard-title-desktop="" class="[^"]*t-title text-ink/);
    expect(html).not.toMatch(/data-dashboard-title-desktop="" class="[^"]*t-label/);
    expect(html).toContain(DASHBOARD_ADMIN.allTime);
    expect(html).toContain("As of All time");
    expect(html).toContain(DASHBOARD_LICENSING.empty);
    expect(html).not.toContain('data-dashboard-module="findings-glance"');
    expect(html).not.toContain(DASHBOARD_HOME.doNext);
  });

  it("labels sample revenue when the craft fixture gate is on", async () => {
    vi.stubEnv(DASHBOARD_CRAFT_FIXTURE_ENV, "1");
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("data-dashboard-fixture-banner");
    expect(html).toContain(DASHBOARD_FIXTURE.banner);
    expect(html).toContain(DASHBOARD_FIXTURE.sampleMark);
    expect(html).toContain("$2,104,000.00");
    expect(html).toContain("Sample title 01");
    expect(html).toContain(DASHBOARD_LICENSING.empty);
    expect(html).toContain("data-dashboard-licensing-empty");
    expect(html).not.toContain("Sample licensing");
    expect(html).toContain("data-dashboard-top-performing");
    expect(html).toContain(DASHBOARD_HOME.topTitles);
    expect(html).toContain(DASHBOARD_HOME.topPlatforms);
    expect(html).toContain(DASHBOARD_HOME.topTerritories);
    expect(html).not.toContain(DASHBOARD_HOME.topPerforming);
    expectNoCatalogVelocityStrip(html);
    expect(html).not.toContain(DASHBOARD_ADMIN.chartEmpty);
    expect(html).not.toContain(DASHBOARD_HOME.platformsEmpty);
    expect(html).not.toContain(DASHBOARD_HOME.territoriesEmpty);
    expect(html).not.toContain("data-reports-download");
  });

  it("keeps sample series when the month grain is selected", async () => {
    vi.stubEnv(DASHBOARD_CRAFT_FIXTURE_ENV, "1");
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(
      await DashboardPage({ searchParams: Promise.resolve({ period: "2026-09" }) }),
    );
    expect(html).toContain("data-dashboard-fixture-banner");
    expect(html).toContain("$154,000.00");
    expect(html).not.toContain(DASHBOARD_ADMIN.chartEmpty);
    expect(html).not.toContain(DASHBOARD_ADMIN.revenueEmpty);
  });

  it("does not fixture the standard-user Dashboard even when the env gate is on", async () => {
    vi.stubEnv(DASHBOARD_CRAFT_FIXTURE_ENV, "1");
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "delivery_ops" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).not.toContain("data-dashboard-admin-hero");
    expect(html).not.toContain("data-dashboard-fixture-banner");
    expect(html).not.toContain(DASHBOARD_FIXTURE.banner);
    expect(html).toContain("data-dashboard-hero");
  });

  it("keeps a named period in ?period= and does not invent a user roster", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(
      await DashboardPage({ searchParams: Promise.resolve({ period: "Q32026" }) }),
    );
    expect(html).toMatch(
      new RegExp(
        `data-dashboard-title-desktop="" class="[^"]*max-md:hidden[^"]*">${AGGREGATION_LEAD_TITLE}<`,
      ),
    );
    expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>Acme</);
    expect(html).not.toMatch(/data-dashboard-title-desktop=""[^>]*>Q3 2026</);
    expect(html).toContain("Q3 2026");
    expect(html).not.toContain('value="Q32026"');
    expect(html).not.toContain("data-dashboard-user");
    expect(html).not.toContain("data-dashboard-user-results");
    expect(html).not.toContain(DASHBOARD_ADMIN.findUser);
    expect(html).not.toContain(DASHBOARD_ADMIN.allCompany);
  });

  it("maps title and delivery events into Recent activity and deliveries into nested Licensing status", async () => {
    stubClient(
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Winter Light",
          status: "live",
          created_at: "2026-09-02T15:04:00.000Z",
          created_by: "maya",
          catalog_id: "GC-0001234",
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Harbor Cut",
          status: "in_review",
          created_at: "2026-09-03T00:00:00.000Z",
          catalog_id: "GC-0001235",
        },
      ],
      [
        {
          id: "f1",
          org_id: "org-1",
          entity_id: "11111111-1111-4111-8111-111111111111",
          severity: "high",
          message: "Synopsis is required.",
          created_at: "2026-09-12T15:04:00.000Z",
        },
      ],
      {
        deliveries: [
          {
            delivery_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            title_id: "11111111-1111-4111-8111-111111111111",
            title: "Winter Light",
            vendor_name: "Endpoint A",
            territory: "US",
            status: "pending",
            updated_at: "2026-09-12T00:00:00.000Z",
          },
          {
            delivery_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
            title_id: "11111111-1111-4111-8111-111111111111",
            title: "Winter Light",
            vendor_name: "Endpoint B",
            territory: "CA",
            status: "rejected",
            updated_at: "2026-09-11T00:00:00.000Z",
          },
        ],
      },
    );
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).toContain(DASHBOARD_ADMIN.activity);
    expect(html).toContain(DASHBOARD_ADMIN.titleAdded);
    expect(html).toContain(DASHBOARD_ADMIN.deliveryUpdated);
    expect(html).not.toContain('data-dashboard-module="attention"');
    expect(html).not.toContain("data-dashboard-attention-clock");
    expect(html).not.toContain("Synopsis is required.");
    expect(html).not.toContain(DASHBOARD_ADMIN.findingOpened);
    expect(html).not.toContain("Recent account activity");
    expect(html).not.toContain('href="/attention"');
    expect(html).toContain('data-dashboard-module="licensing-status"');
    expect(html).toContain("Winter Light");
    expect(html).toContain("Endpoint A");
    expect(html).toContain("Endpoint B");
    expect(html).toContain("data-dashboard-licensing-thumb");
    expect(html).toContain("data-dashboard-licensing-endpoints");
    expect(html).toContain('data-status-progress-variant="pipeline"');
    expect(html).toContain('data-status-progress-variant="off"');
    expect(html).not.toContain("data-dashboard-licensing-summary");
    expect(html).not.toContain("data-dashboard-licensing-pill");
    expect(html).toContain("data-dashboard-activity-actor");
    expect(html).toContain("data-dashboard-activity-clock");
    expect(html).toContain("?");
    expect(html).not.toContain("Licensed");
    expect(html).not.toContain("Removed");
    expect(html).not.toContain("Sample licensing");
  });

  it("maps title status updates and a closed performance report into Recent activity", async () => {
    stubClient(
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Winter Light",
          status: "live",
          created_at: "2026-07-02T00:00:00.000Z",
          catalog_id: "GC-0001234",
        },
      ],
      [
        {
          id: "f1",
          org_id: "org-1",
          entity_id: "11111111-1111-4111-8111-111111111111",
          severity: "high",
          message: "Synopsis is required.",
          created_at: "2026-09-12T15:04:00.000Z",
        },
      ],
      {
        audit: [
          {
            entity: "titles",
            entity_id: "11111111-1111-4111-8111-111111111111",
            action: "update",
            actor: "sam",
            at: "2026-09-08T16:00:00.000Z",
            before: { status: "in_review" },
            after: { status: "live" },
          },
        ],
      },
    );
    vi.mocked(loadRecipientDashboard).mockResolvedValue({
      periods: [],
      latestClosed: {
        id: "period-1",
        org_id: "org-1",
        period_year: 2026,
        period_month: 8,
        status: "closed",
        opening_balance_cents: 0,
        closing_balance_cents: 100,
        threshold_cents: null,
        closed_at: "2026-09-01T12:00:00.000Z",
      },
      latestStatement: { org: null } as never,
      ledger: [],
      clientRateBp: 8500,
    });
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('data-dashboard-module="recent-activity"');
    expect(html).toContain("Winter Light");
    expect(html).toContain("status updated to Approved");
    expect(html).toContain(DASHBOARD_ADMIN.performanceReportAvailable);
    expect(html).toContain('href="/aggregation/reports/period-1"');
    expect(html).not.toContain("Synopsis is required.");
    expect(html).not.toContain(DASHBOARD_ADMIN.findingOpened);
    expect(html).not.toContain('href="/attention"');
    expect(html).not.toContain("Recent account activity");
  });

  it("surfaces audit_log actor initials and exact timestamp without inventing people", async () => {
    const at = "2026-09-02T15:04:00.000Z";
    stubClient(
      [
        {
          id: "title-1",
          title: "Winter Light",
          status: "live",
          created_at: "2026-09-02T00:00:00.000Z",
          created_by: "ignored-creator",
          catalog_id: "GC-0001234",
        },
      ],
      [],
      {
        audit: [
          {
            entity: "titles",
            entity_id: "title-1",
            action: "insert",
            actor: "maya",
            at,
          },
        ],
        profiles: [{ id: "maya", display_name: "Maya Chen" }],
      },
    );
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(await DashboardPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("data-dashboard-activity-actor");
    expect(html).toContain(">M<");
    expect(html).toContain("data-dashboard-activity-clock");
    expect(html).toContain(dashboardJustInDate(at));
    expect(html).toContain(dashboardJustInTime(at));
    expect(html).not.toContain("Maya Chen");
    expect(html).not.toContain("ignored-creator");
  });

  it("does not load org money when a user is scoped", async () => {
    stubClient();
    vi.mocked(getOrgContext).mockResolvedValue(
      ctx({ isGcStaff: false, orgStatus: "active", role: "account_owner" }) as never,
    );
    const html = renderToStaticMarkup(
      await DashboardPage({ searchParams: Promise.resolve({ user: "maya" }) }),
    );
    expect(loadRecipientDashboard).not.toHaveBeenCalled();
    expect(html).toContain("$0.00");
    expect(html).not.toContain(DASHBOARD_ADMIN.revenueEmpty);
    expect(html).toContain("data-dashboard-chart-empty");
    expect(html).not.toContain(DASHBOARD_ADMIN.chartEmpty);
  });
});
