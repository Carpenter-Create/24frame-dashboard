import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { NewsStickyHeader } from "@/components/news/news-sticky-header";
import {
  NEWS_STICKY_PAGE_SURFACE_CLASS,
  NEWS_STICKY_PIN_CLASS,
  NEWS_STICKY_RAIL_PANEL_CLASS,
  NEWS_STICKY_RAIL_SURFACE_CLASS,
  newsStickyHeaderClass,
} from "@/lib/news-sticky";

const rail = readFileSync("src/components/news/news-rail.tsx", "utf8");
const history = readFileSync("src/components/news/news-history.tsx", "utf8");
const page = readFileSync("src/app/(app)/home/news/page.tsx", "utf8");
const moduleSrc = readFileSync("src/components/overview/overview-module.tsx", "utf8");

describe("News sticky header SoT", () => {
  it("pins under chrome with one shared class and host surface tokens", () => {
    // Phone: the pin stops at the floating chrome's visible bottom
    // (shell-phone-workspace-band-lock-v1 §5 v1.3); md+ under the header.
    expect(NEWS_STICKY_PIN_CLASS).toBe(
      "sticky top-0 z-10 shrink-0 backdrop-blur max-md:top-[var(--house-phone-chrome-visible,0px)]",
    );
    expect(NEWS_STICKY_PIN_CLASS).toContain("sticky");
    expect(NEWS_STICKY_PIN_CLASS).toContain("top-0");
    expect(NEWS_STICKY_PIN_CLASS).toContain("z-10");
    expect(NEWS_STICKY_PIN_CLASS).not.toContain("z-40");
    expect(NEWS_STICKY_PIN_CLASS).not.toContain("--header-height");
    expect(NEWS_STICKY_RAIL_SURFACE_CLASS).toContain("bg-surface-muted/85");
    expect(NEWS_STICKY_RAIL_SURFACE_CLASS).toContain("rounded-t-[var(--radius-lg)]");
    expect(NEWS_STICKY_RAIL_SURFACE_CLASS).toBe("rounded-t-[var(--radius-lg)] bg-surface-muted/85");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).toContain("bg-bg/85");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).toContain("pb-[var(--space-4)]");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).toContain("pt-[var(--space-8)]");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).toContain("-mt-[var(--space-8)]");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).toContain("max-md:pt-[var(--space-6)]");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).toContain("max-md:-mt-[var(--space-6)]");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).not.toContain("border");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).not.toContain("rounded");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).not.toContain("shadow");
    expect(NEWS_STICKY_PAGE_SURFACE_CLASS).not.toContain("max-w-[840px]");
    expect(NEWS_STICKY_RAIL_PANEL_CLASS).toBe("overflow-visible");
    expect(newsStickyHeaderClass("rail")).toContain(NEWS_STICKY_PIN_CLASS);
    expect(newsStickyHeaderClass("rail")).toContain(NEWS_STICKY_RAIL_SURFACE_CLASS);
    expect(newsStickyHeaderClass("page")).toContain(NEWS_STICKY_PIN_CLASS);
    expect(newsStickyHeaderClass("page")).toContain(NEWS_STICKY_PAGE_SURFACE_CLASS);
    expect(newsStickyHeaderClass("page")).not.toContain(NEWS_STICKY_RAIL_SURFACE_CLASS);
    expect(newsStickyHeaderClass("page")).not.toContain("border");
    expect(newsStickyHeaderClass("page")).not.toContain("rounded");
  });

  it("renders one wrapper — Home rail and /home/news do not fork sticky classes", () => {
    const railHtml = renderToStaticMarkup(
      createElement(NewsStickyHeader, { surface: "rail" }, "Industry news"),
    );
    const pageHtml = renderToStaticMarkup(
      createElement(NewsStickyHeader, { surface: "page" }, "Industry news"),
    );
    expect(railHtml).toContain('data-news-sticky-header="rail"');
    expect(pageHtml).toContain('data-news-sticky-header="page"');
    expect(railHtml).toContain(NEWS_STICKY_PIN_CLASS);
    expect(pageHtml).toContain(NEWS_STICKY_PIN_CLASS);
    expect(rail).toContain("stickyHeader");
    expect(moduleSrc).toContain("NewsStickyHeader");
    expect(moduleSrc).toContain('surface="rail"');
    expect(history).toContain("NewsStickyHeader");
    expect(history).toContain('surface="page"');
    expect(page).toContain("heading=");
    expect(page).toContain("PageHeader");
    expect(page).toContain("className=\"pb-0\"");
    expect(page).not.toContain("DASHBOARD_NEWS_HISTORY_COLUMN_CLASS");
    expect((page.match(/<PageHeader/g) ?? []).length).toBe(1);
    expect(page.indexOf("<NewsHistory")).toBeLessThan(page.indexOf("heading="));
    expect(page.indexOf("heading=")).toBeLessThan(page.indexOf("<PageHeader"));
    expect(history).toContain("DASHBOARD_NEWS_HISTORY_COLUMN_CLASS");
    expect(history).toContain("data-news-history-lead");
    expect(history.indexOf("NewsStickyHeader")).toBeLessThan(
      history.indexOf("data-news-history-lead"),
    );
    expect(history.indexOf("data-news-history-lead")).toBeLessThan(
      history.indexOf("<NewsSourceChips"),
    );
  });
});
