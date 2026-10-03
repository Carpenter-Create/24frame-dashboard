import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { NAV, GC_NAV } from "@/lib/nav";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const OTHER_PAGES = [
  "src/app/(app)/aggregation/dashboard/page.tsx",
  "src/app/(app)/aggregation/attention/page.tsx",
  "src/app/(app)/activity/page.tsx",
  "src/app/(app)/(operator)/staff/gc/titles/[id]/page.tsx",
  "src/app/(app)/aggregation/titles/[id]/page.tsx",
  "src/components/dashboard/dashboard-home.tsx",
  "src/components/ui/card.tsx",
] as const;

const TITLES_COMMENT_PATHS = [
  "src/lib/titles-catalog.ts",
  "src/lib/titles-lifecycle.ts",
  "src/components/titles/titles-catalog.tsx",
  "src/app/(app)/aggregation/titles/page.tsx",
  "src/app/(app)/aggregation/titles/[id]/page.tsx",
  "src/components/layout/title-hero.tsx",
  "src/app/(app)/aggregation/titles/add-title-button.tsx",
] as const;

describe("titles catalog scope", () => {
  it("keeps catalog search on /titles and staff /queue — same toolbar SoT", () => {
    const catalogPage = src("src/app/(app)/aggregation/titles/page.tsx");
    const homePage = src("src/app/(app)/aggregation/dashboard/page.tsx");
    const shell = src("src/components/chrome/app-shell.tsx");
    const housePageSearch = src("src/components/chrome/house-page-search.tsx");
    const accessGate = src("src/components/messages/access-upgrade-gate.tsx");
    const thread = src("src/components/messages/ask-frame-ai-thread.tsx");
    const landing = src("src/components/messages/ask-frame-ai-landing.tsx");
    const messagesHeader = src("src/components/chrome/messages-app-header.tsx");
    const titleDetail = src("src/app/(app)/aggregation/titles/[id]/page.tsx");
    const queue = src("src/app/(app)/(operator)/staff/queue/page.tsx");
    const deliveries = src("src/app/(app)/(operator)/staff/gc/deliveries/page.tsx");

    expect(catalogPage).toContain("HousePageSearch");
    expect(catalogPage).toContain("TITLES_CATALOG.searchPlaceholder");
    expect(catalogPage).toContain("TitlesCatalogToolbar");
    expect(catalogPage).toContain("catalogSearchQuery");
    expect(catalogPage).toContain("catalogSearchMissCopy");
    expect(queue).toContain("HousePageSearch");
    expect(queue).toContain("TITLES_CATALOG.searchPlaceholder");
    expect(queue).toContain("TitlesCatalogToolbar");
    expect(queue).toContain("filterTitles");
    expect(queue).toContain("catalogSearchQuery");
    expect(queue).toContain("catalogSearchMissCopy");
    expect(queue).not.toContain("Search queue");
    expect(deliveries).toContain("HousePageSearch");
    expect(deliveries).toContain("GC_LICENSING_STATUS.searchPlaceholder");
    expect(deliveries).toContain("TitlesCatalogToolbar");
    expect(housePageSearch).toContain("MagnifyingGlass");
    expect(housePageSearch).not.toContain("lucide-react");
    expect(shell).not.toContain("TitlesHeaderSearch");
    expect(shell).not.toContain("SearchField");
    expect(shell).not.toContain("HousePageSearch");
    expect(shell).not.toContain("Search titles");
    expect(shell).not.toMatch(/⌘K|CommandK|command-k/i);
    expect(homePage).not.toContain("SearchField");
    expect(homePage).not.toContain("HousePageSearch");
    expect(homePage).not.toContain("TitlesHeaderSearch");
    expect(homePage).not.toContain("AddTitleButton");
    expect(titleDetail).not.toContain("SearchField");
    expect(titleDetail).not.toContain("HousePageSearch");
    expect(titleDetail).not.toContain("TitlesHeaderSearch");
    expect(titleDetail).not.toContain("AddTitleButton");
    expect(titleDetail).not.toContain("data-add-title");
    expect(accessGate).not.toContain("SearchField");
    expect(accessGate).not.toContain("HousePageSearch");
    expect(thread).not.toContain("SearchField");
    expect(thread).not.toContain("HousePageSearch");
    expect(landing).not.toContain("SearchField");
    expect(landing).not.toContain("HousePageSearch");
    expect(messagesHeader).toContain("HousePageSearch");
    expect(messagesHeader).toContain("access-gate");
  });

  it("does not restyle shared primitives or other pages", () => {
    for (const file of OTHER_PAGES) {
      const contents = src(file);
      expect(contents).not.toContain("titles-catalog");
      expect(contents).not.toContain("@/lib/titles-catalog");
      expect(contents).not.toContain("@/components/titles/titles-catalog");
    }
  });

  it("keeps the list 16 inset on the /titles frame, not a -mx-4 cancel", () => {
    const catalog = src("src/components/titles/titles-catalog.tsx");
    const catalogLib = src("src/lib/titles-catalog.ts");
    const home = src("src/components/dashboard/dashboard-home.tsx");
    const titleDetail = src("src/app/(app)/aggregation/titles/[id]/page.tsx");
    const homePage = src("src/app/(app)/aggregation/dashboard/page.tsx");

    expect(catalog).toContain("px-[var(--space-4)]");
    expect(catalog).toContain("titles-catalog-list");
    expect(catalogLib).toContain("aspect-[16/9]");
    expect(catalog).toContain("TITLES_THUMB_CLASS");
    expect(catalog).toContain("TitlesCatalogStatusFilter");
    expect(catalog).not.toContain("@/components/layout/status-filter");
    expect(catalog).not.toContain("titles-catalog-rail");
    expect(catalog).not.toContain("titles-catalog-grid");
    expect(catalog).not.toContain("aspect-[2/3]");
    expect(catalog).not.toContain("-mx-[var(--space-4)]");
    expect(home).not.toContain("titles-catalog-list");
    expect(home).not.toContain("-mx-[var(--space-4)]");
    expect(titleDetail).not.toContain("titles-catalog");
    expect(titleDetail).not.toContain("-mx-[var(--space-4)]");
    expect(homePage).not.toContain("titles-catalog");
    expect(homePage).not.toContain("-mx-[var(--space-4)]");
  });

  it("deep-links title detail into Titles and Attention", () => {
    const titleDetail = src("src/app/(app)/aggregation/titles/[id]/page.tsx");
    expect(titleDetail).toContain("backHref={TITLES_HREF}");
    expect(titleDetail).toContain("href={ATTENTION_HREF}");
    expect(titleDetail).toContain("data-title-ops-links");
    expect(titleDetail).toContain("TITLE_DETAIL");
  });

  it("does not add a drafts nav item or move the catalog onto deliveries", () => {
    expect(NAV.filter((item) => item.href === "/aggregation/titles")).toHaveLength(1);
    expect(NAV.some((item) => /draft/i.test(item.label))).toBe(false);
    expect(NAV.find((item) => item.href === "/aggregation/attention")?.label).toBe("Recent activity");
    expect(NAV.find((item) => item.href === "/activity")).toBeUndefined();
    expect(NAV.find((item) => item.href === "/aggregation/activity")).toBeUndefined();
    expect(NAV.some((item) => item.label === "Activity")).toBe(false);
    expect(NAV.find((item) => item.href === "/deliveries")).toBeUndefined();
    expect(GC_NAV.some((item) => item.href === "/aggregation/titles")).toBe(false);
  });

  it("loads landscape row skeletons, not a poster grid", () => {
    const skeletons = src("src/components/layout/page-skeletons.tsx");
    expect(skeletons).toContain("data-titles-catalog-skeleton");
    expect(skeletons).toContain("aspect-[16/9]");
    expect(skeletons).toContain("w-full");
    expect(skeletons).toContain("flex flex-col");
    expect(skeletons).toContain("md:flex-row");
    expect(skeletons).not.toContain("w-[40%]");
    expect(skeletons).not.toContain("PosterGridSkeleton");
    expect(skeletons).not.toContain("aspect-[2/3]");
    expect(skeletons).toContain("size-[44px]");
    expect(skeletons).not.toContain("h-8 w-24 md:hidden");
    expect(src("src/app/(app)/aggregation/titles/loading.tsx")).toContain("CatalogSkeleton");
    expect(src("src/app/(app)/aggregation/titles/[id]/loading.tsx")).toContain("TitleDetailSkeleton");
    expect(src("src/app/(app)/(operator)/staff/queue/loading.tsx")).toContain("CatalogSkeleton");
  });

  it("absorbs staff /queue into the Titles catalog list — no Card lookalike", () => {
    const queue = src("src/app/(app)/(operator)/staff/queue/page.tsx");
    const catalog = src("src/components/titles/titles-catalog.tsx");
    expect(queue).toContain("@/components/titles/titles-catalog");
    expect(queue).toContain("@/lib/titles-catalog");
    expect(queue).toContain("TitlesCatalogFrame");
    expect(queue).toContain("TitlesCatalogList");
    expect(queue).toContain("TitlesCatalogListRow");
    expect(queue).toContain("TitlesCatalogToolbar");
    expect(queue).toContain("HousePageSearch");
    expect(queue).toContain("staff=");
    expect(queue).not.toContain("@/components/ui/card");
    expect(queue).not.toContain("QueueRow");
    expect(catalog).toContain("TitlesCatalogStaffCols");
    expect(catalog).toContain("data-titles-catalog-submitter");
    expect(catalog).toContain("data-titles-catalog-submitted");
    expect(GC_NAV.find((item) => item.href === "/staff/queue")?.label).toBe("Queue");
  });

  it("keeps house-shell language in titles comments — no reference-brand word", () => {
    for (const path of TITLES_COMMENT_PATHS) {
      const contents = src(path);
      expect(contents, path).not.toMatch(/Filmhub/i);
      expect(contents, path).not.toMatch(/Relay/i);
      expect(contents, path).not.toMatch(/Coinbase/i);
    }
  });
});
