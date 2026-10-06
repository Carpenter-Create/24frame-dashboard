import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TITLE_STATUS_LABELS, type TitleStatus } from "@/lib/titles";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

vi.mock("next/image", () => ({
  default: ({
    src,
    className,
  }: {
    src: string;
    className?: string;
  }) => createElement("img", { src, className, alt: "" }),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

import {
  DASHBOARD_TITLE_DESKTOP_CLASS,
  DASHBOARD_TITLE_MOBILE_CLASS,
} from "@/lib/dashboard-craft";
import {
  TITLES_CATALOG,
  TITLES_TITLE_DESKTOP_CLASS,
  TITLES_TITLE_MOBILE_CLASS,
} from "@/lib/titles-catalog";

import {
  TitlesCatalogFrame,
  TitlesCatalogHeader,
  TitlesCatalogList,
  TitlesCatalogListRow,
  TitlesCatalogStatusFilter,
  TitlesCatalogToolbar,
} from "./titles-catalog";
import { TITLE_STATUS_TRACK_STEPS } from "@/lib/status-progress";

const ALL_STATUSES = Object.keys(TITLE_STATUS_LABELS) as TitleStatus[];

function renderRow(props: {
  href: string;
  title: string;
  stillUrl: string | null;
  status: string;
  liveCount?: number;
  year?: string | null;
  publicId?: string | null;
  overflow?: React.ReactNode;
  staff?: {
    submitter: string;
    submittedOn: string;
    orgName?: string | null;
    findings?: number;
  };
}): string {
  return renderToStaticMarkup(createElement(TitlesCatalogListRow, props));
}

function openingTagWith(html: string, marker: string): string {
  const at = html.indexOf(marker);
  const start = html.lastIndexOf("<", at);
  const end = html.indexOf(">", at);
  return html.slice(start, end + 1);
}

describe("TitlesCatalogListRow craft", () => {
  it("is a landscape-thumb row — not a poster card", () => {
    const html = renderRow({
      href: "/titles/1",
      title: "Craft film",
      stillUrl: "https://cdn/wide.jpg",
      status: "live",
      year: "2019",
    });
    const row = openingTagWith(html, 'data-titles-catalog-list-row=""');
    const frame = openingTagWith(html, 'data-titles-catalog-frame=""');

    expect(row).toContain("flex flex-col");
    expect(row).toContain("md:flex-row");
    expect(row).toContain("md:items-center");
    expect(row).toContain("md:px-[var(--space-4)]");
    expect(row).toContain("md:py-[var(--space-4)]");
    expect(frame).toContain("aspect-[16/9]");
    expect(frame).toContain("w-full");
    expect(frame).toContain("md:w-[160px]");
    expect(frame).toContain("md:rounded-[var(--radius-lg)]");
    expect(frame).toContain('data-titles-catalog-crop="cover"');
    expect(html).not.toContain("w-[40%]");
    expect(html).not.toContain("aspect-[2/3]");
    expect(html).not.toContain("data-titles-catalog-card");
    expect(html).not.toContain("bg-gradient");
    expect(html).not.toContain("shadow");
    expect(html).not.toMatch(/hover:scale|group-hover:scale/);
  });

  it("keeps a null still as a muted camera wash — no image, no monogram", () => {
    const html = renderRow({
      href: "/titles/1",
      title: "Empty film",
      stillUrl: null,
      status: "draft",
    });

    expect(html).toContain("data-titles-catalog-empty-art");
    expect(html).not.toContain("<img");
    expect(html).not.toContain('rel="preload"');
    expect(html).not.toContain("poster.jpg");
    expect(html).not.toContain("t-data select-none text-3xl");
  });

  it("keeps title ink, year quiet, and the status pill trailing", () => {
    const html = renderRow({
      href: "/titles/1",
      title: "Craft film",
      stillUrl: null,
      status: "live",
      year: "2019",
    });
    const name = openingTagWith(html, 'data-titles-catalog-name=""');
    const year = openingTagWith(html, 'data-titles-catalog-year=""');

    expect(name).toContain("t-body font-medium text-ink");
    expect(name).toContain("md:truncate");
    expect(name.includes("truncate")).toBe(true);
    expect(name.replaceAll("md:truncate", "")).not.toContain("truncate");
    expect(name).not.toContain("t-heading");
    expect(name).not.toContain("t-label");
    expect(year).toContain("t-body-sm text-ink-3");
    expect(html).toMatch(
      /data-titles-catalog-name[\s\S]*Craft film[\s\S]*data-titles-catalog-year[\s\S]*2019[\s\S]*data-titles-catalog-status[\s\S]*Approved/,
    );
  });

  it("marks on-track statuses as a Sporty Blue segment track and off-track as a muted badge", () => {
    const live = renderRow({
      href: "/titles/1",
      title: "Craft film",
      stillUrl: null,
      status: "live",
    });
    const draft = renderRow({
      href: "/titles/2",
      title: "Draft film",
      stillUrl: null,
      status: "draft",
    });
    const takedown = renderRow({
      href: "/titles/3",
      title: "Takedown film",
      stillUrl: null,
      status: "takedown_requested",
    });
    const liveHost = openingTagWith(live, 'data-titles-catalog-status=""');
    const takedownHost = openingTagWith(takedown, 'data-titles-catalog-status=""');

    expect(liveHost).toContain('data-status-progress-variant="pipeline"');
    expect(liveHost).toContain("mr-[var(--space-4)]");
    expect(takedownHost).toContain("mr-[var(--space-4)]");
    expect(live.match(/data-status-progress-seg="filled"/g) ?? []).toHaveLength(5);
    expect(live).toContain("bg-accent");
    expect(live).toContain("Approved");
    expect(live).not.toMatch(/green|emerald|success|rose|red/);
    expect(draft.match(/data-status-progress-seg="filled"/g) ?? []).toHaveLength(1);
    expect(draft).toContain("Draft");
    expect(takedownHost).toContain('data-status-progress-variant="off"');
    expect(takedownHost).toContain("border-hairline");
    expect(takedownHost).toContain("text-ink-2");
    expect(takedown).not.toContain("data-status-progress-track");
    expect(takedown).toContain(TITLE_STATUS_LABELS.takedown_requested);
  });

  it("places title, year, and the track stage label — In delivery is not Submitted", () => {
    for (const status of ALL_STATUSES) {
      const html = renderRow({
        href: `/titles/${status}`,
        title: `${status} film`,
        stillUrl: null,
        status,
        year: status === "live" ? "2019" : null,
      });
      expect(html).toContain(`${status} film`);
      if (status === "in_delivery") {
        expect(html).toContain(TITLE_STATUS_TRACK_STEPS[3]);
        expect(html).not.toContain("Submitted");
      } else {
        expect(html).toContain(TITLE_STATUS_LABELS[status]);
      }
      if (status === "live") {
        expect(html).toContain("data-titles-catalog-year");
        expect(html).toContain("2019");
      } else {
        expect(html).not.toContain("data-titles-catalog-year");
      }
    }
    expect(TITLE_STATUS_LABELS.submitted).toBe("Submitted");
  });

  it("adds staff submitter, date, and findings on the same row shell", () => {
    const html = renderRow({
      href: "/gc/titles/1",
      title: "Harbor Cut",
      stillUrl: null,
      status: "in_review",
      year: "2019",
      publicId: "GC-0001234",
      staff: {
        submitter: "Maya Chen",
        submittedOn: "Mar 15, 2026",
        orgName: "North",
        findings: 2,
      },
    });
    const row = openingTagWith(html, 'data-titles-catalog-list-row=""');
    const submitter = openingTagWith(html, 'data-titles-catalog-submitter=""');
    const submitted = openingTagWith(html, 'data-titles-catalog-submitted=""');

    expect(row).toContain("flex flex-col");
    expect(row).toContain("md:flex-row");
    expect(html).toContain("data-titles-catalog-staff");
    expect(html).toContain("Maya Chen");
    expect(html).toContain("Mar 15, 2026");
    expect(html).toContain("North");
    expect(html).toContain("GC-0001234");
    expect(html).toContain("data-titles-catalog-org");
    expect(html).toContain("data-titles-catalog-findings");
    expect(html).toContain("⚑ 2");
    expect(html).toContain(TITLE_STATUS_TRACK_STEPS[2]);
    expect(submitter).toContain("t-body-sm");
    expect(submitted).toContain("t-body-sm");
    expect(html).toContain("flex flex-col");
    expect(html).toContain("hidden");
    expect(html).toContain("md:inline");
    const staffAt = html.indexOf("data-titles-catalog-staff");
    const orgAt = html.indexOf("data-titles-catalog-org");
    const yearAt = html.indexOf("data-titles-catalog-year");
    expect(staffAt).toBeGreaterThan(-1);
    expect(orgAt).toBeGreaterThan(staffAt);
    expect(yearAt).toBeGreaterThan(-1);
    expect(orgAt).toBeGreaterThan(yearAt);
    expect(html).not.toContain("data-titles-catalog-card");
    expect(html).not.toContain("hover:border-accent");
  });

  it("omits staff columns on the client catalog row", () => {
    const html = renderRow({
      href: "/titles/1",
      title: "Craft film",
      stillUrl: null,
      status: "live",
      year: "2019",
    });
    expect(html).not.toContain("data-titles-catalog-staff");
    expect(html).not.toContain("data-titles-catalog-submitter");
    expect(html).not.toContain("data-titles-catalog-submitted");
    expect(html).not.toContain("data-titles-catalog-findings");
    expect(html).not.toContain("data-titles-catalog-org");
  });

  it("shows a row overflow slot only when lifecycle flags allow it", () => {
    const withActions = renderRow({
      href: "/titles/1",
      title: "Draft film",
      stillUrl: null,
      status: "draft",
      overflow: createElement("button", { "data-title-lifecycle-menu": "" }, "Title actions"),
    });
    const hidden = renderRow({
      href: "/titles/1",
      title: "Draft film",
      stillUrl: null,
      status: "draft",
    });
    expect(withActions).toContain("data-titles-catalog-row-actions");
    expect(withActions).toContain("data-title-lifecycle-menu");
    expect(withActions).toContain("Title actions");
    expect(hidden).not.toContain("data-titles-catalog-row-actions");
    expect(hidden).not.toContain("data-title-lifecycle-menu");
  });
});

describe("TitlesCatalogFrame craft", () => {
  it("uses tight 8 air from H1 through the list", () => {
    const html = renderToStaticMarkup(createElement(TitlesCatalogFrame));
    expect(html).toContain("gap-[var(--space-2)]");
    expect(html).not.toContain("gap-[var(--space-6)]");
    expect(html).not.toContain("md:gap-[var(--space-8)]");
    expect(html).not.toContain("gap-[var(--space-12)]");
    expect(html).not.toContain("gap-[var(--space-10)]");
  });

  it("keeps empty catalog on the same tight air", () => {
    const html = renderToStaticMarkup(createElement(TitlesCatalogFrame, { empty: true }));
    expect(html).toContain("gap-[var(--space-2)]");
    expect(html).not.toContain("md:gap-[var(--space-8)]");
  });
});

describe("TitlesCatalogHeader type lock", () => {
  it("can render a staff Queue title on the same header register", () => {
    const html = renderToStaticMarkup(
      createElement(TitlesCatalogHeader, {
        title: "Queue",
      }),
    );
    const mobile = openingTagWith(html, 'data-titles-catalog-title-mobile=""');
    const desktop = openingTagWith(html, 'data-titles-catalog-title-desktop=""');
    expect(html).toContain("Queue");
    expect(html).not.toContain("Licensing Status");
    expect(html).not.toContain("data-titles-catalog-trailing");
    expect(html).not.toContain("Titles");
    expect(mobile).toContain("t-heading text-ink");
    expect(desktop).toContain("t-title text-ink");
  });

  it("matches the Dashboard page-title register", () => {
    const html = renderToStaticMarkup(createElement(TitlesCatalogHeader));
    const mobile = openingTagWith(html, 'data-titles-catalog-title-mobile=""');
    const desktop = openingTagWith(html, 'data-titles-catalog-title-desktop=""');

    expect(TITLES_TITLE_MOBILE_CLASS).toBe(DASHBOARD_TITLE_MOBILE_CLASS);
    expect(TITLES_TITLE_DESKTOP_CLASS).toBe(DASHBOARD_TITLE_DESKTOP_CLASS);
    expect(mobile).toContain("t-heading text-ink");
    expect(mobile).toContain("md:hidden");
    expect(desktop).toContain("t-title text-ink");
    expect(desktop).toContain("max-md:hidden");
    expect(html).toContain(TITLES_CATALOG.title);
    expect(html).not.toMatch(/<h1[^>]*t-display/);
    expect(html).not.toMatch(/<h1[^>]*t-section/);
    expect(html).not.toContain("t-label");
  });

  it("omits a count subtitle under Titles", () => {
    const html = renderToStaticMarkup(createElement(TitlesCatalogHeader));

    expect(html).not.toContain("data-titles-catalog-count");
    expect(html).not.toContain("in catalog");
    expect(html).not.toContain("data-titles-catalog-operate");
    expect(html).not.toContain("data-titles-catalog-filters");
    expect(html).not.toContain("data-titles-catalog-header-cluster");
    expect(html).not.toContain("data-titles-catalog-header-operate");
  });

  it("trails status house select on the title row when q/status are passed", () => {
    const html = renderToStaticMarkup(
      createElement(TitlesCatalogHeader, {
        q: "",
        status: "all",
      }),
    );
    const header = openingTagWith(html, 'data-titles-catalog-header-row=""');
    expect(header).toContain("flex flex-row");
    expect(header).toContain("justify-between");
    expect(html).toContain("data-titles-catalog-filters");
    expect(html).toContain("data-titles-catalog-status-compact");
    expect(html).toContain("data-house-page-select");
    expect(html).toContain(">All<");
    const titleAt = html.indexOf("<h1");
    const filtersAt = html.indexOf("data-titles-catalog-filters");
    expect(titleAt).toBeGreaterThan(-1);
    expect(filtersAt).toBeGreaterThan(titleAt);
    expect(html).not.toContain("data-titles-catalog-count");
    expect(html).not.toContain("in catalog");
  });

  it("keeps Titles as the page title on phone and desktop", () => {
    const html = renderToStaticMarkup(createElement(TitlesCatalogHeader));
    expect(html).toContain("data-titles-catalog-title-mobile");
    expect(html).toContain("data-titles-catalog-title-desktop");
    expect(html.match(/Titles/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).not.toContain("data-titles-catalog-identity");
    expect(html).not.toContain("Meridian Pictures");
  });
});

describe("TitlesCatalogList landscape row lock", () => {
  it("is one hairline list for phone and desktop — landscape thumb, no 5-up, no snap rail", () => {
    const html = renderToStaticMarkup(
      createElement(
        TitlesCatalogFrame,
        null,
        createElement(
          TitlesCatalogList,
          null,
          createElement(TitlesCatalogListRow, {
            href: "/titles/24F-0001234",
            title: "Craft film",
            stillUrl: null,
            status: "live",
            year: "2019",
            publicId: "24F-0001234",
          }),
        ),
      ),
    );
    const catalog = openingTagWith(html, 'data-titles-catalog=""');
    const list = openingTagWith(html, 'data-titles-catalog-list=""');
    const row = openingTagWith(html, 'data-titles-catalog-list-row=""');
    const frame = openingTagWith(html, 'data-titles-catalog-frame=""');
    const name = openingTagWith(html, 'data-titles-catalog-name=""');
    const year = openingTagWith(html, 'data-titles-catalog-year=""');
    const track = openingTagWith(html, 'data-titles-catalog-status=""');

    expect(html).not.toContain("Recently added");
    expect(html).not.toContain("Recent");
    expect(html).not.toContain("Store");
    expect(html).not.toContain("Spotlight");
    expect(html).not.toContain("snap-x");
    expect(html).not.toContain("w-[140px]");
    expect(html).not.toContain("xl:grid-cols-5");
    expect(html).not.toContain("data-titles-catalog-grid");
    expect(catalog).toContain("px-[var(--space-4)]");
    expect(list).toContain("md:rounded-[var(--radius-lg)]");
    expect(list).toContain("md:border-hairline");
    expect(list).not.toContain("md:hidden");
    expect(row).toContain("flex flex-col");
    expect(row).toContain("md:flex-row");
    expect(row).toContain("md:border-b");
    expect(frame).toContain("aspect-[16/9]");
    expect(frame).toContain("w-full");
    expect(name).toContain("t-body font-medium text-ink");
    expect(name).toContain("md:truncate");
    expect(year).toContain("t-body-sm text-ink-3");
    expect(html).toContain("2019");
    expect(html).toContain("data-titles-catalog-public-id");
    expect(html).toContain("24F-0001234");
    expect(track).toContain('data-status-progress-variant="pipeline"');
    expect(html).toContain("bg-accent");
    expect(html).toContain("Approved");
    expect(html).not.toContain("bg-band");
    expect(html).not.toMatch(/\bStore\b/);
    expect(html.match(/data-titles-catalog-list=""/g) ?? []).toHaveLength(1);
  });
});

describe("TitlesCatalogStatusFilter craft", () => {
  it("uses HousePageSelect (Dashboard All time SoT), not pills or native select", () => {
    const html = renderToStaticMarkup(
      createElement(TitlesCatalogStatusFilter, { q: "", status: "all", defaultOpen: true }),
    );
    const compact = openingTagWith(html, 'data-titles-catalog-status-compact=""');
    const current = openingTagWith(html, 'data-titles-catalog-status-current=""');

    expect(html).toContain("data-house-page-select");
    expect(html).toContain("data-house-page-select-menu");
    expect(html).toContain("data-house-page-select-sheet");
    expect(html).toContain("data-titles-catalog-status-trigger");
    expect(html).toContain("data-appearance-check");
    expect(compact).toContain("w-auto");
    expect(compact).toContain("shrink-0");
    expect(html).not.toContain("data-titles-catalog-status-pills");
    expect(html).not.toContain("<select");
    expect(html).toContain("t-body-sm");
    expect(html).toContain("All");
    expect(html).toContain("Draft");
    expect(html).toContain(TITLE_STATUS_LABELS.in_review);
    expect(html).toContain(TITLE_STATUS_LABELS.takedown_requested);
    expect(html).toContain("Archived");
    expect(current).not.toContain("t-label");
    expect(html).not.toContain("Upcoming");
    expect(html).not.toContain("In progress");
  });

  it("trails status on the header identity row like Dashboard period — not toolbar chrome", () => {
    const catalog = readFileSync(join(ROOT, "src/components/titles/titles-catalog.tsx"), "utf8");
    const filter = readFileSync(
      join(ROOT, "src/components/titles/titles-status-filter.tsx"),
      "utf8",
    );
    expect(catalog).toContain("data-titles-catalog-header-row");
    expect(catalog).toContain("TitlesCatalogStatusFilter");
    expect(catalog).toMatch(/TitlesCatalogHeader[\s\S]*TitlesCatalogStatusFilter/);
    expect(catalog).toMatch(/Phone toolbar is search only/i);
    expect(filter).toContain("HousePageSelect");
    expect(filter).not.toMatch(/triggerClassName=/);
    expect(filter).toContain('menuAlign="end"');
    expect(catalog).not.toContain("data-titles-catalog-status-pills");
  });
});

describe("Titles catalog phone CTA cluster", () => {
  it("trails phone + on the header with All, and keeps toolbar search-only on phone", () => {
    const html = renderToStaticMarkup(
      createElement(TitlesCatalogHeader, {
        q: "",
        status: "all",
        action: createElement("button", {
          "data-add-title": "",
          "data-add-title-icon": "",
          "aria-label": TITLES_CATALOG.addTitle,
        }),
      }),
    );
    const cluster = openingTagWith(html, 'data-titles-catalog-header-cluster=""');
    const operate = openingTagWith(html, 'data-titles-catalog-header-operate=""');

    expect(cluster).toContain("gap-[var(--space-2)]");
    expect(html).toContain("data-titles-catalog-filters");
    expect(html).toContain("data-titles-catalog-status-compact");
    expect(html).toContain(">All<");
    expect(operate).toContain("md:hidden");
    expect(html).toContain("data-add-title-icon");
    expect(html).toContain(`aria-label="${TITLES_CATALOG.addTitle}"`);
    const filtersAt = html.indexOf("data-titles-catalog-filters");
    const operateAt = html.indexOf("data-titles-catalog-header-operate");
    expect(filtersAt).toBeGreaterThan(-1);
    expect(operateAt).toBeGreaterThan(filtersAt);
  });

  it("hides labeled Add Title from the phone toolbar row", () => {
    const html = renderToStaticMarkup(
      createElement(TitlesCatalogToolbar, {
        search: createElement("input", { placeholder: TITLES_CATALOG.searchPlaceholder }),
        action: createElement("button", {
          "data-add-title": "",
          "data-add-title-labeled": "",
        }),
      }),
    );
    const chrome = openingTagWith(html, 'data-titles-catalog-chrome=""');
    const search = openingTagWith(html, 'data-titles-catalog-search=""');
    expect(html).toContain("data-titles-catalog-search");
    expect(search).toContain("md:w-56");
    expect(search).not.toContain("[&_input]");
    expect(html).toContain(TITLES_CATALOG.searchPlaceholder);
    expect(chrome).toContain("hidden");
    expect(chrome).toContain("md:contents");
    expect(html).toContain("data-add-title-labeled");
    expect(html).not.toContain("data-add-title-icon");
    expect(html).not.toContain("data-titles-catalog-fab");
  });
});

describe("Titles catalog has no stray FAB", () => {
  it("keeps Sporty Blue Add Title in header/toolbar chrome and no fixed list/up control", () => {
    const catalog = readFileSync(join(ROOT, "src/components/titles/titles-catalog.tsx"), "utf8");
    const page = readFileSync(join(ROOT, "src/app/(app)/aggregation/titles/page.tsx"), "utf8");
    const add = readFileSync(join(ROOT, "src/app/(app)/aggregation/titles/add-title-button.tsx"), "utf8");

    expect(catalog).not.toMatch(/fixed[\s\S]{0,80}(bottom|right)/);
    expect(catalog).not.toContain("data-titles-catalog-fab");
    expect(catalog).not.toContain("ArrowUp");
    expect(catalog).toContain('from "@phosphor-icons/react/ssr"');
    expect(catalog).toContain("Camera");
    expect(catalog).not.toContain("from \"lucide-react\"");
    expect(catalog).not.toMatch(/import \{[^}]*\bList\b/);
    expect(page).not.toContain("data-titles-catalog-fab");
    expect(page).not.toMatch(/fixed[\s\S]{0,80}(bottom|right)/);
    expect(page).toContain('appearance="icon"');
    expect(page).toContain('appearance="labeled"');
    expect(add).toContain("data-add-title");
    expect(add).toContain("data-add-title-icon");
    expect(add).toContain("Plus");
    expect(add).not.toContain("fixed");
  });
});
