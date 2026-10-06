import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DashboardDoNext,
  DashboardHomePillLink,
  DashboardJustIn,
  DashboardOrgIdentity,
  DashboardSnapshot,
} from "@/components/dashboard/dashboard-home";
import { dashboardAttentionSummary } from "@/lib/findings";
import { UNPAGINATED_MAX } from "@/lib/list-bounds";
import { TITLE_STATUS_LABELS } from "@/lib/titles";
import { TITLES_CATALOG } from "@/lib/titles-catalog";
import {
  clientHomeSnapshot,
  dashboardCatalogValue,
  dashboardJustInDate,
  dashboardTitleStatusLabel,
  dashboardWhatChanged,
  deliveriesNeedingAction,
  pendingSubmissions,
  rankedBarPercent,
  topTitleActivity,
  topTitlesThisMonth,
  DASHBOARD_HOME,
  DASHBOARD_HOME_DO_NEXT,
  DASHBOARD_HOME_DRAFTS,
} from "./dashboard-home";
import { DASHBOARD_SECTION_TITLE_CLASS } from "@/lib/dashboard-craft";

const NOW = new Date("2026-08-16T12:00:00.000Z");

function title(partial: {
  id: string;
  title?: string;
  status?: string;
  created_at?: string;
}) {
  return {
    title: partial.title ?? partial.id,
    status: partial.status ?? "draft",
    created_at: partial.created_at ?? "2026-08-15T00:00:00.000Z",
    ...partial,
  };
}

describe("clientHomeSnapshot", () => {
  it("counts catalog, live, and org-scoped attention titles from existing rows", () => {
    const snap = clientHomeSnapshot({
      titles: [
        title({ id: "live-1", status: "live" }),
        title({ id: "draft-1", status: "draft" }),
        title({ id: "live-2", status: "live" }),
      ],
      findings: [
        { org_id: "org-1", entity_id: "live-1", message: "Synopsis is required." },
        { org_id: "org-1", entity_id: "live-1", message: "Genre is required." },
        { org_id: "org-2", entity_id: "other", message: "Director is recommended." },
      ],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });

    expect(snap.catalog).toBe(3);
    expect(snap.catalogIsPartial).toBe(false);
    expect(snap.findingsIsPartial).toBe(false);
    expect(snap.live).toBe(2);
    expect(snap.needsAttention).toBe(1);
    expect(snap.doNext.map((d) => d.id)).toEqual(["live-1", "draft-1"]);
    expect(snap.doNext[0]?.reason).toBe("Synopsis is required.");
    expect(snap.doNext[1]?.reason).toBeNull();
    expect(DASHBOARD_HOME.catalog).toBe("Catalog");
    expect(DASHBOARD_HOME.needsAttention).toBe("Needs attention");
    expect(DASHBOARD_HOME.doNext).toBe("Do next");
    expect(DASHBOARD_HOME.findingsGlance).toBe("Attention");
    expect(DASHBOARD_HOME.live).toBe(TITLE_STATUS_LABELS.live);
    expect(DASHBOARD_HOME.live).toBe("Approved");
  });

  it("excludes archived titles from the active catalog count", () => {
    const snap = clientHomeSnapshot({
      titles: [
        title({ id: "live-1", status: "live" }),
        title({ id: "arch-1", status: "archived" }),
        title({ id: "draft-1", status: "draft" }),
      ],
      findings: [],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.catalog).toBe(2);
    expect(snap.justIn.every((t) => t.status !== "archived")).toBe(true);
  });

  it("marks a bounded catalog and live count as a floor, not a claimed total", () => {
    const titles = Array.from({ length: UNPAGINATED_MAX }, (_, i) =>
      title({ id: `t-${i}`, status: i < 3 ? "draft" : "live" }),
    );
    const snap = clientHomeSnapshot({
      titles,
      findings: [],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.catalogIsPartial).toBe(true);
    expect(snap.catalog).toBe(UNPAGINATED_MAX);
    expect(snap.live).toBe(UNPAGINATED_MAX - 3);
    expect(dashboardCatalogValue(snap.catalog, snap.catalogIsPartial)).toBe(`${UNPAGINATED_MAX}+`);
    expect(dashboardCatalogValue(snap.live, snap.catalogIsPartial)).toBe(`${UNPAGINATED_MAX - 3}+`);
    expect(dashboardCatalogValue(2, false)).toBe("2");
  });

  it("marks a bounded findings count as a floor, not a claimed total", () => {
    const snap = clientHomeSnapshot({
      titles: [title({ id: "live-1", status: "live" })],
      findings: [{ org_id: "org-1", entity_id: "live-1", message: "Synopsis is required." }],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
      findingsIsPartial: true,
    });
    expect(snap.findingsIsPartial).toBe(true);
    expect(snap.needsAttention).toBe(1);
    expect(dashboardCatalogValue(snap.needsAttention, snap.findingsIsPartial)).toBe("1+");
  });

  it("lists finding rows before leftover drafts and ignores other lifecycle states as drafts", () => {
    const snap = clientHomeSnapshot({
      titles: [
        title({ id: "draft", status: "draft", created_at: "2026-08-15T10:00:00.000Z" }),
        title({ id: "submitted", status: "submitted", created_at: "2026-08-15T11:00:00.000Z" }),
        title({ id: "in-review", status: "in_review", created_at: "2026-08-15T12:00:00.000Z" }),
        title({ id: "older-draft", status: "draft", created_at: "2026-08-14T00:00:00.000Z" }),
      ],
      findings: [],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.doNext.map((d) => d.id)).toEqual(["draft", "older-draft"]);
    expect(snap.doNext).toHaveLength(Math.min(2, DASHBOARD_HOME_DRAFTS));
    expect(snap.doNext.every((row) => row.reason === null)).toBe(true);
  });

  it("does not invent a reason when a finding has no existing message", () => {
    const snap = clientHomeSnapshot({
      titles: [title({ id: "live-1", status: "live", title: "Winter Light" })],
      findings: [{ org_id: "org-1", entity_id: "live-1" }],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.doNext).toEqual([
      { id: "live-1", title: "Winter Light", reason: null, status: "live" },
    ]);
    expect(JSON.stringify(snap.doNext)).not.toMatch(/Artwork missing|Metadata incomplete/i);
  });

  it("prefers an existing high-severity finding message and does not duplicate a draft", () => {
    const snap = clientHomeSnapshot({
      titles: [
        title({
          id: "draft-1",
          title: "Harbor Cut",
          status: "draft",
          created_at: "2026-08-15T10:00:00.000Z",
        }),
      ],
      findings: [
        {
          org_id: "org-1",
          entity_id: "draft-1",
          severity: "low",
          message: "Director is recommended.",
        },
        {
          org_id: "org-1",
          entity_id: "draft-1",
          severity: "high",
          message: "Synopsis is required.",
        },
      ],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.doNext).toEqual([
      {
        id: "draft-1",
        title: "Harbor Cut",
        reason: "Synopsis is required.",
        status: "draft",
      },
    ]);
  });

  it("caps Do next and keeps just-in titles with their real status", () => {
    const titles = Array.from({ length: DASHBOARD_HOME_DO_NEXT + 2 }, (_, i) =>
      title({
        id: `draft-${i}`,
        status: "draft",
        created_at: `2026-08-15T0${i}:00:00.000Z`,
      }),
    );
    const snap = clientHomeSnapshot({
      titles: [
        ...titles,
        title({
          id: "new",
          status: "live",
          created_at: "2026-08-10T00:00:00.000Z",
        }),
        title({
          id: "old",
          status: "submitted",
          created_at: "2025-01-01T00:00:00.000Z",
        }),
      ],
      findings: [],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.doNext).toHaveLength(DASHBOARD_HOME_DO_NEXT);
    expect(snap.justIn.map((t) => t.id)).toEqual(titles.map((t) => t.id).reverse().slice(0, 5));
    expect(snap.justIn.every((t) => t.status === "draft")).toBe(true);
    expect(snap.justIn.some((t) => t.id === "new")).toBe(false);
    expect(snap).not.toHaveProperty("upcoming");
    expect(snap).not.toHaveProperty("revenue");
    expect(snap).not.toHaveProperty("createdAt");
  });

  it("keeps the real title status on Recent rows", () => {
    const snap = clientHomeSnapshot({
      titles: [
        title({
          id: "new",
          status: "live",
          created_at: "2026-08-10T00:00:00.000Z",
        }),
        title({
          id: "review",
          status: "in_review",
          created_at: "2026-08-12T00:00:00.000Z",
        }),
      ],
      findings: [],
      orgId: "org-1",
      now: NOW,
      bound: UNPAGINATED_MAX,
    });
    expect(snap.justIn).toEqual([
      {
        id: "review",
        title: "review",
        status: "in_review",
        created_at: "2026-08-12T00:00:00.000Z",
      },
      {
        id: "new",
        title: "new",
        status: "live",
        created_at: "2026-08-10T00:00:00.000Z",
      },
    ]);
  });
});

describe("dashboard home add-on derivation", () => {
  it("ranks this-month titles and pending submissions from real statuses", () => {
    const titles = [
      title({ id: "aug", status: "live", created_at: "2026-08-02T00:00:00.000Z" }),
      title({ id: "sep", status: "in_review", created_at: "2026-09-02T00:00:00.000Z" }),
      title({ id: "pipe", status: "submitted", created_at: "2026-07-01T00:00:00.000Z" }),
    ];
    const now = new Date("2026-09-16T12:00:00.000Z");
    expect(topTitlesThisMonth(titles, now).map((row) => row.id)).toEqual(["sep"]);
    expect(pendingSubmissions(titles).map((row) => row.id)).toEqual(["sep", "pipe"]);
    expect(
      topTitleActivity(titles, [{ title_id: "pipe" }, { title_id: "pipe" }, { title_id: "sep" }], now).map(
        (row) => row.id,
      ),
    ).toEqual(["pipe", "sep"]);
    expect(rankedBarPercent(2, 4)).toBe(50);
    expect(rankedBarPercent(0, 4)).toBe(0);
    expect(rankedBarPercent(1, 0)).toBe(0);
  });

  it("lists deliveries that need action and greyscale what-changed rows", () => {
    expect(
      deliveriesNeedingAction([
        {
          delivery_id: "d1",
          title_id: "t1",
          title: "A",
          vendor_name: "Alpha",
          territory: "US",
          status: "pending",
          updated_at: "2026-09-02T00:00:00.000Z",
        },
        {
          delivery_id: "d2",
          title_id: "t2",
          title: "B",
          vendor_name: "Beta",
          territory: "CA",
          status: "live",
          updated_at: "2026-09-03T00:00:00.000Z",
        },
      ]).map((row) => row.delivery_id),
    ).toEqual(["d1"]);
    expect(dashboardWhatChanged({ titlesAdded: 1, deliveriesUpdated: 0, findingsOpened: 2 })).toEqual([
      { key: "titles", label: "1 title added", count: 1 },
      { key: "findings", label: "2 findings opened", count: 2 },
    ]);
    expect(DASHBOARD_HOME.reportsCta).toBe("Reports");
    expect(DASHBOARD_HOME.hero).toBe("Catalog activity");
  });
});

describe("dashboardTitleStatusLabel", () => {
  it("reuses TITLE_STATUS_LABELS and does not invent a mark", () => {
    expect(dashboardTitleStatusLabel("live")).toBe(TITLE_STATUS_LABELS.live);
    expect(dashboardTitleStatusLabel("in_review")).toBe(TITLE_STATUS_LABELS.in_review);
    expect(dashboardTitleStatusLabel("unknown")).toBeNull();
  });
});

describe("house type register", () => {
  const globals = readFileSync("src/app/globals.css", "utf8");

  it("binds .t-* steps to those tokens instead of display clamp()", () => {
    expect(globals).toMatch(/\.t-display\s*\{[\s\S]*?font-size:\s*var\(--text-hero\)/);
    expect(globals).toMatch(/\.t-section\s*\{[\s\S]*?font-size:\s*var\(--text-title\)/);
    expect(globals).toMatch(/\.t-subhead\s*\{[\s\S]*?font-size:\s*var\(--text-lg\)/);
    expect(globals).toMatch(/\.t-label\s*\{[\s\S]*?font-size:\s*var\(--text-xs\)/);
    expect(globals).not.toMatch(
      /\.t-(display|title|statement|section|heading|subhead|lead)\s*\{[^}]*clamp\(/,
    );
  });
});

describe("client home type locks", () => {
  it("makes snapshot numbers the one large moment — Aggregation stays on the title step", () => {
    const identity = renderToStaticMarkup(createElement(DashboardOrgIdentity));
    const snapshot = renderToStaticMarkup(
      createElement(DashboardSnapshot, {
        catalog: "2",
        needsAttention: "1",
        live: "1",
      }),
    );

    expect(identity).toMatch(/<h1 class="t-title text-ink">Aggregation<\/h1>/);
    expect(identity).not.toContain("Acme");
    expect(identity).not.toContain("t-display");
    expect(identity).not.toContain("t-section");
    expect(identity).not.toMatch(/Active|Account owner|Registered/i);
    expect(identity).not.toContain("status");
    expect(identity).not.toContain("rounded-full bg-accent");
    expect(snapshot).toMatch(/data-dashboard-stat="catalog"[^>]*t-display t-data/);
    expect(snapshot).toMatch(/data-dashboard-stat="needsAttention"[^>]*t-display t-data/);
    expect(snapshot).toMatch(/data-dashboard-stat="live"[^>]*t-display t-data/);
    expect(snapshot).not.toContain("t-title");
    expect(snapshot).toContain(`t-label text-ink-3">${DASHBOARD_HOME.catalog}`);
    expect(snapshot).toContain(`t-label text-ink-3">${DASHBOARD_HOME.needsAttention}`);
    expect(snapshot).toContain(`t-label text-ink-3">${DASHBOARD_HOME.live}`);
    expect(snapshot).toMatch(/data-dashboard-stat="needsAttention"[^>]*text-accent/);
    expect(snapshot).toMatch(/data-dashboard-stat="catalog"[^>]*text-ink"/);
    expect(snapshot).toMatch(/data-dashboard-stat="live"[^>]*text-ink"/);
    expect(snapshot).toContain("p-[var(--space-6)]");
    expect(snapshot).not.toContain("248");
    expect(snapshot).not.toContain("Meridian");
  });

  it("keeps Needs attention on accent even when the count is zero", () => {
    const snapshot = renderToStaticMarkup(
      createElement(DashboardSnapshot, {
        catalog: "0",
        needsAttention: "0",
        live: "0",
      }),
    );
    expect(snapshot).toMatch(/data-dashboard-stat="needsAttention"[^>]*text-accent/);
  });

  it("renders Do next as finding + draft rows — no SaaS headline", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardDoNext, {
        items: [
          {
            id: "live-1",
            title: "Winter Light",
            reason: "Synopsis is required.",
            status: "live",
          },
          { id: "draft-1", title: "Draft Work", reason: null, status: "draft" },
        ],
      }),
    );

    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.doNext}`);
    expect(html).toContain("Winter Light");
    expect(html).toContain("Synopsis is required.");
    expect(html).toContain("Draft Work");
    expect(html).toContain(TITLE_STATUS_LABELS.draft);
    expect(html).toContain(TITLE_STATUS_LABELS.live);
    expect(html).toContain("data-dashboard-status-pill");
    expect(html).toContain("border-hairline");
    expect(html).toContain("t-body-sm font-medium text-ink");
    expect(html).not.toContain(dashboardAttentionSummary(1));
    expect(html).not.toContain("titles need your attention");
    expect(html).not.toContain("Artwork missing");
    expect(html).not.toContain("Metadata incomplete");
    expect(html).not.toContain("The Winter Line");
    expect(html).not.toContain("t-subhead");
    expect(html).not.toContain("t-display");
    expect(html).not.toContain("t-title");
    expect(html).not.toContain("t-section");
  });

  it("puts title and pill left-clustered on Recent, with the date on the right", () => {
    const created = "2026-08-12T00:00:00.000Z";
    const html = renderToStaticMarkup(
      createElement(DashboardJustIn, {
        titles: [
          {
            id: "title-1",
            title: "Winter Light",
            status: "submitted",
            created_at: created,
          },
        ],
      }),
    );

    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.justIn}`);
    expect(html).toContain("Winter Light");
    expect(html).toContain(TITLE_STATUS_LABELS.submitted);
    expect(html).toContain(dashboardJustInDate(created));
    expect(html).toContain("data-dashboard-status-pill");
    expect(html).toContain("data-dashboard-just-in-cluster");
    expect(html).toContain("justify-between");
    const clusterAt = html.indexOf("data-dashboard-just-in-cluster");
    const pillAt = html.indexOf("data-dashboard-status-pill");
    const dateAt = html.indexOf(dashboardJustInDate(created));
    expect(clusterAt).toBeGreaterThan(-1);
    expect(pillAt).toBeGreaterThan(clusterAt);
    expect(dateAt).toBeGreaterThan(pillAt);
    expect(html).not.toContain("added ");
    expect(html).not.toMatch(/text-green|bg-green|text-emerald/);
  });

  it("renders the Attention pill as the one accent action to /attention", () => {
    const html = renderToStaticMarkup(
      createElement(
        DashboardHomePillLink,
        { href: "/aggregation/attention" } as { href: string; children: string },
        DASHBOARD_HOME.catalogHealthCta,
      ),
    );
    expect(html).toContain('href="/aggregation/attention"');
    expect(html).toContain(DASHBOARD_HOME.catalogHealthCta);
    expect(html).toContain("h-9");
    expect(html).toContain("t-body-sm");
    expect(html).toContain("rounded-full");
    expect(html).toContain("bg-accent");
    expect(html).toContain("text-accent-contrast");
    expect(html).toContain("size-[14px]");
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain("stroke-width=\"1.33\"");
    expect(html).not.toContain("Meridian");
  });
});

describe("client home copy lock", () => {
  it("locks Recent, empty-catalog copy, and the existing Add Title action", () => {
    expect(DASHBOARD_HOME.justIn).toBe("Recent");
    expect(DASHBOARD_HOME.justIn).not.toBe("Just in");
    expect(DASHBOARD_HOME.catalogEmpty).toBe("The catalog is empty.");
    expect(DASHBOARD_HOME.addTitle).toBe("Add Title");
    expect(DASHBOARD_HOME.addTitle).toBe(TITLES_CATALOG.addTitle);
    expect(DASHBOARD_HOME.addTitleHref).toBe("/aggregation/titles");
  });

  it("does not keep Added-this-month / In-pipeline catalog-velocity copy or helpers", () => {
    expect(DASHBOARD_HOME).not.toHaveProperty("addedThisMonth");
    expect(DASHBOARD_HOME).not.toHaveProperty("inPipeline");
    const src = readFileSync("src/lib/dashboard-home.ts", "utf8");
    expect(src).not.toContain("titlesAddedThisMonth");
    expect(src).not.toContain("titlesInPipeline");
    expect(src).not.toContain("Added this month");
    expect(src).not.toContain("In pipeline");
  });

  it("renders The catalog is empty. with one Add Title text control", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardJustIn, {
        titles: [],
        catalogEmpty: true,
        canAddTitle: true,
      }),
    );
    const marker = html.indexOf('data-dashboard-add-title=""');
    const addStart = html.lastIndexOf("<a", marker);
    const addEnd = html.indexOf("</a>", marker);
    const link = html.slice(addStart, addEnd);

    expect(html).toContain(`${DASHBOARD_SECTION_TITLE_CLASS}">${DASHBOARD_HOME.justIn}`);
    expect(html).toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html.split(DASHBOARD_HOME.catalogEmpty).length - 1).toBe(1);
    expect(html.split(DASHBOARD_HOME.addTitle).length - 1).toBe(1);
    expect(html).not.toContain(DASHBOARD_HOME.justInEmpty);
    expect(html).not.toContain("Just in");
    expect(link).toContain('href="/aggregation/titles"');
    expect(link).toContain(DASHBOARD_HOME.addTitle);
    expect(link).toContain("t-body-sm");
    expect(link).toContain("text-accent");
    expect(link).toContain("hover:underline");
    expect(link).not.toContain("bg-accent");
    expect(link).not.toContain("data-add-title");
    expect(html).not.toContain("data-add-title");
  });

  it("keeps No titles added recently. when the catalog has titles but none are recent", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardJustIn, {
        titles: [],
        catalogEmpty: false,
        canAddTitle: true,
      }),
    );

    expect(html).toContain(DASHBOARD_HOME.justInEmpty);
    expect(html).not.toContain(DASHBOARD_HOME.catalogEmpty);
    expect(html).not.toContain("data-dashboard-add-title");
    expect(html).not.toContain(DASHBOARD_HOME.addTitle);
  });

  it("keeps an Artwork missing finding on Do next where it already is", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardDoNext, {
        items: [
          {
            id: "live-1",
            title: "Winter Light",
            reason: "Artwork missing",
            status: "live",
          },
        ],
      }),
    );

    expect(html).toContain("Artwork missing");
    expect(html.split("Artwork missing").length - 1).toBe(1);
    expect(html).toContain("Winter Light");
    expect(html).not.toContain("Metadata incomplete");
  });
});
