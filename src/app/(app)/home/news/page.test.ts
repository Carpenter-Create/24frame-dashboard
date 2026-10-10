import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DASHBOARD_NEWS_HISTORY_COLUMN_CLASS,
  DASHBOARD_NEWS_HISTORY_LAYOUT_CLASS,
  DASHBOARD_NEWS_HISTORY_LIST_CLASS,
} from "@/lib/dashboard-craft";
import { TEXT_ACTION_CLASS } from "@/lib/house-sheet";
import { NEWS_HOME_HREF, NEWS_PAGE, newsHistoryBackLink } from "@/lib/news";
import { loadNewsHistory } from "@/lib/news-load";
import { OVERVIEW_HREF, OVERVIEW_PAGE } from "@/lib/overview";
import { getOrgContext } from "@/lib/supabase/context";
import NewsPage from "./page";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`REDIRECT:${to}`);
  }),
}));
vi.mock("@/lib/supabase/context", () => ({ getOrgContext: vi.fn() }));
vi.mock("@/lib/news-load", () => ({
  loadNewsHistory: vi.fn(),
}));

function ctx() {
  return {
    user: { id: "u1", email: "ada@example.com" },
    rows: [{ role: "account_owner", organizations: { id: "org-1", name: "Meridian", status: "active" } }],
    orgs: [{ id: "org-1", name: "Meridian" }],
    activeOrg: { id: "org-1", name: "Meridian", status: "active" },
    activeRole: "account_owner",
    canOperate: true,
    isGcStaff: false,
    unread: Promise.resolve(0),
  };
}

const ITEM = {
  id: "n1",
  title: "Harbor Cut lands a festival slot",
  url: "https://variety.com/harbor-cut",
  source: "variety" as const,
  published_at: "2026-09-17T12:00:00.000Z",
  image_url: null,
};

describe("NewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the 90-day history with a Home crumb, source chips, focused reading column, and no inner News title", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(loadNewsHistory).mockResolvedValue({
      rows: [ITEM],
      truncated: false,
      failed: false,
    });

    const html = renderToStaticMarkup(await NewsPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain("data-news-history");
    expect(html).toContain(NEWS_PAGE.title);
    expect(html).toContain(NEWS_PAGE.subtitle);
    expect(html).toContain("90 days");
    expect(html).toContain(`href="${NEWS_HOME_HREF}"`);
    expect(html).toContain(NEWS_PAGE.back);
    expect(newsHistoryBackLink()).toEqual({ href: OVERVIEW_HREF, label: OVERVIEW_PAGE.title });
    expect(NEWS_PAGE.back).toBe(OVERVIEW_PAGE.title);
    expect(html).toContain("Harbor Cut lands a festival slot");
    expect(html).toContain("https://variety.com/harbor-cut");
    expect(html).toContain("Variety");
    expect(html).toContain(DASHBOARD_NEWS_HISTORY_COLUMN_CLASS);
    expect(html).toContain("max-w-[840px]");
    expect(html).toContain(DASHBOARD_NEWS_HISTORY_LAYOUT_CLASS);
    expect(html).toContain(DASHBOARD_NEWS_HISTORY_LIST_CLASS);
    expect(html).toContain(TEXT_ACTION_CLASS);
    expect(html).toContain("data-news-source-chips");
    expect(html).toContain(NEWS_PAGE.sourcesAll);
    expect(html).toContain(NEWS_PAGE.sources);
    expect(html).not.toContain("data-news-sources-rail");
    expect(html).not.toContain("data-news-sources-phone");
    expect(html).not.toContain("lg:grid-cols-[minmax(0,1fr)_22rem]");
    expect(html).toContain("flex flex-col");
    expect(html.indexOf("data-news-thumb")).toBeLessThan(html.indexOf("Harbor Cut lands a festival slot"));
    expect(html).not.toContain("lg:grid-cols-2");
    expect(html).not.toMatch(/summary|rewrite|republish/i);
    expect(html).not.toContain(NEWS_PAGE.viewAll);
    expect(html.split(NEWS_PAGE.title).length - 1).toBe(1);
  });

  it("honors ?source= on first paint", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(loadNewsHistory).mockResolvedValue({
      rows: [ITEM],
      truncated: false,
      failed: false,
    });

    const html = renderToStaticMarkup(
      await NewsPage({ searchParams: Promise.resolve({ source: "film-threat" }) }),
    );
    expect(html).toContain(NEWS_PAGE.filterEmpty);
    expect(html).not.toContain("Harbor Cut lands a festival slot");
  });

  it("shows only the truncated notice when a capped history read has no rows", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(loadNewsHistory).mockResolvedValue({
      rows: [],
      truncated: true,
      failed: false,
    });

    const html = renderToStaticMarkup(await NewsPage({ searchParams: Promise.resolve({}) }));
    expect(NEWS_PAGE.truncated).toBe("Some headlines aren't shown here.");
    expect(html.replaceAll("&#x27;", "'")).toContain("Some headlines aren't shown here.");
    expect(html).toContain('data-my-list-truncated="news"');
    expect(html).not.toContain(NEWS_PAGE.empty);
  });

  it("shows the truncated notice with the rows when a capped history read has headlines", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(ctx() as never);
    vi.mocked(loadNewsHistory).mockResolvedValue({
      rows: [ITEM],
      truncated: true,
      failed: false,
    });

    const html = renderToStaticMarkup(await NewsPage({ searchParams: Promise.resolve({}) }));
    expect(html.replaceAll("&#x27;", "'")).toContain("Some headlines aren't shown here.");
    expect(html).toContain("Harbor Cut lands a festival slot");
    expect(html).not.toContain(NEWS_PAGE.empty);
  });

  it("sends an unauthenticated visitor to login", async () => {
    vi.mocked(getOrgContext).mockResolvedValue(null as never);
    await expect(NewsPage()).rejects.toThrow("REDIRECT:/login");
  });
});
