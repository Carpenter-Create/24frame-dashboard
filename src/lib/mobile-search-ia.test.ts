import { createElement } from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/education",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: React.ReactNode;
    prefetch?: boolean;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink, useLinkStatus: () => ({ pending: false }) };
});

import { HouseLeadChrome } from "@/components/chrome/house-lead-chrome";
import { HouseLeadSearch } from "@/components/chrome/house-lead-search";
import { SocialSearchSheet } from "@/components/social/social-search-sheet";
import { UserMenu } from "@/components/chrome/user-menu";
import {
  HOUSE_LEAD_SEARCH_DESKTOP_CLASS,
  HOUSE_LEAD_SEARCH_PILL_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
} from "@/lib/house-lead-chrome";
import { HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { EDUCATION_SEARCH } from "@/lib/course-search";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";
import {
  SOCIAL_SEARCH_SHEET_HOST_CLASS,
  type SocialSearchRecentItem,
} from "@/lib/social-search";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
} from "@/lib/workspace-switcher";

const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const leadLib = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
const shellSrc = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const searchSrc = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");
const sheetSrc = readFileSync("src/components/social/social-search-sheet.tsx", "utf8");

function htmlClass(html: string, attr: string): string {
  const start = html.indexOf(attr);
  if (start < 0) return "";
  const tag = html.slice(html.lastIndexOf("<", start), html.indexOf(">", start));
  return tag.match(/class="([^"]*)"/)?.[1] ?? "";
}

describe("mobile search IA — Education under-nav + Social icon sheet", () => {
  it("keeps Education phone search under HouseLeadChrome, not in the top nav", () => {
    const html = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "education",
        search: createElement(HouseLeadSearch, { tone: "quiet" }),
        underNav: createElement(HouseLeadSearch, {
          tone: "quiet",
          inputId: "education-header-q-phone",
        }),
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );

    expect(html).toContain("data-house-lead-stack");
    expect(html).toContain("data-house-under-nav");
    expect(html).toContain('data-education-header-search-host="desktop"');
    expect(html).toContain('data-education-header-search-host="phone"');
    expect(html).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(html).toContain(HOUSE_LEAD_UNDER_NAV_CLASS);
    expect(html).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(html).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(html).toContain(EDUCATION_SEARCH.placeholder);
    expect(html.indexOf("data-house-lead-chrome")).toBeLessThan(html.indexOf("data-house-under-nav"));
    expect(html.indexOf("data-app-header-trailing")).toBeLessThan(
      html.indexOf('data-education-header-search-host="phone"'),
    );

    const header = html.slice(
      html.indexOf("data-app-header="),
      html.indexOf("data-house-under-nav"),
    );
    expect(header).toContain('data-education-header-search-host="desktop"');
    expect(header).not.toContain('data-education-header-search-host="phone"');
    expect(header).not.toContain("education-header-q-phone");

    const leading = header.slice(
      header.indexOf("data-app-header-leading"),
      header.indexOf("data-app-header-trailing"),
    );
    expect(leading).not.toContain("data-education-header-search-host=\"phone\"");
    expect(htmlClass(html, 'data-app-header-leading=""')).toBe(APP_HEADER_LEADING_CLASS);
    expect(leadSrc).not.toContain("phoneSearch");
    expect(shellSrc).toContain("underNav=");
    expect(shellSrc).not.toContain("phoneSearch=");
  });

  it("keeps Education desktop search beside the logo and Aggregation empty", () => {
    const education = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "education",
        search: createElement(HouseLeadSearch, { tone: "quiet" }),
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    expect(education.indexOf("data-brand-emblem")).toBeLessThan(
      education.indexOf("data-house-lead-search"),
    );
    expect(education).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(education).not.toContain("data-house-under-nav");

    const aggregation = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "aggregation",
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    expect(aggregation).toContain("data-house-lead");
    expect(aggregation).not.toContain("data-house-lead-search");
    expect(aggregation).not.toContain("data-house-under-nav");
    expect(aggregation).not.toContain("data-social-header-actions");
    expect(leadLib).toContain("agg-search-no");
  });

  it("puts the Social phone search in the trailing cluster as an icon", () => {
    const html = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "social",
        logoVisible: "always",
        search: createElement(HouseLeadSearch, { tone: "live" }),
        trailingSearch: createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
        accountMenu: createElement(UserMenu, { email: "ada@example.com", name: "Ada" }),
      }),
    );
    expect(html).toContain("data-social-header-search-icon");
    expect(html).toContain("data-social-header-actions");
    expect(html).toContain(APP_HEADER_TRAILING_CLUSTER_CLASS);
    expect(html.indexOf("data-app-header-trailing")).toBeLessThan(
      html.indexOf("data-social-header-search-icon"),
    );
    expect(html.indexOf("data-social-header-search-icon")).toBeLessThan(
      html.indexOf("data-ask-assistant-header"),
    );

    const leading = html.slice(
      html.indexOf("data-app-header-leading"),
      html.indexOf("data-app-header-trailing"),
    );
    expect(leading).not.toContain("data-social-header-search-icon");
    expect(leading).not.toContain("data-house-lead-search-icon");
    expect(html).not.toContain("data-social-search-sheet");
    expect(shellSrc).toContain('<HouseLeadSearch tone="live" presentation="icon" />');
  });

  it("opens a house Social search sheet — back, pill, Recent — not Meta AI", () => {
    const recents: SocialSearchRecentItem[] = [
      {
        id: "ada",
        name: "Ada Lovelace",
        meta: "Publisher",
        href: "/social/u/ada",
        initial: "A",
      },
    ];
    const open = renderToStaticMarkup(
      createElement(SocialSearchSheet, {
        defaultOpen: true,
        recents,
        field: createElement(HouseLeadSearch, {
          tone: "live",
          inputId: "social-search-sheet-q",
          autoFocus: true,
        }),
      }),
    );

    expect(open).toContain("data-social-search-sheet");
    expect(open).toContain("data-social-search-sheet-back");
    expect(open).toContain(SOCIAL.explore.searchBack);
    expect(open).toContain(SOCIAL.explore.recent);
    expect(open).toContain("data-social-search-recent-row");
    expect(open).toContain("Ada Lovelace");
    expect(open).toContain("Publisher");
    expect(open).toContain('href="/social/u/ada"');
    expect(open).toContain('id="social-search-sheet-q"');
    expect(open).toContain(`action="${SOCIAL_ROUTES.search}"`);
    expect(open).toContain('value="people"');
    expect(open).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(open).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(open).toContain(SOCIAL_SEARCH_SHEET_HOST_CLASS);
    expect(open).toContain("autofocus");
    expect(open).not.toContain("Meta AI");
    expect(open).not.toContain("Search with Meta AI");
    expect(sheetSrc).toContain("CaretLeft");
    expect(sheetSrc).toContain("MagnifyingGlass");
    expect(sheetSrc).not.toMatch(/Meta AI|facebook|Facebook/i);

    const empty = renderToStaticMarkup(
      createElement(SocialSearchSheet, {
        defaultOpen: true,
        field: createElement("div"),
      }),
    );
    expect(empty).toContain(SOCIAL.explore.recent);
    expect(empty).toContain(SOCIAL.explore.recentEmpty);
    expect(empty).toContain("data-social-search-recent-empty");
    expect(empty).not.toContain("data-social-search-recent-row");

    expect(searchSrc).toContain("socialSearchHref");
    expect(searchSrc).not.toContain("SocialSearchSheet");
    expect(searchSrc).not.toContain("prefetch");
  });
});
