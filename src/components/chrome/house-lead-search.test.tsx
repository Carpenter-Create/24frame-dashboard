import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = {
  pathname: "/education",
  query: "cut",
};

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.query ? { q: navigation.query } : undefined),
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
  return { __esModule: true, default: MockLink };
});

import { HouseLeadSearch } from "@/components/chrome/house-lead-search";
import { HOUSE_LEAD_SEARCH_PILL_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_HEADER_TRAILING_HIT_CLASS } from "@/lib/house-lead-chrome";
import { HOUSE_ICON_BUTTON_CLASS, HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { EDUCATION_SEARCH } from "@/lib/course-search";
import { SOCIAL, SOCIAL_ROUTES } from "@/lib/social";

const src = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const pageSearch = readFileSync("src/components/chrome/house-page-search.tsx", "utf8");

describe("HouseLeadSearch — one SoT for Social live and Education quiet", () => {
  it("G1 ships one lead-search implementation and deletes the twins", () => {
    expect(existsSync("src/components/chrome/house-lead-search.tsx")).toBe(true);
    expect(existsSync("src/components/social/social-header-search.tsx")).toBe(false);
    expect(existsSync("src/components/chrome/education-header-search.tsx")).toBe(false);
    expect(src).not.toContain("SocialHeaderSearch");
    expect(src).not.toContain("EducationHeaderSearch");
    expect(src).not.toContain("export {");
    expect(shell).toContain("HouseLeadSearch");
    expect(shell).not.toContain("SocialHeaderSearch");
    expect(shell).not.toContain("EducationHeaderSearch");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(shell).toContain("HouseLeadSearch");
  });

  it("G2 keeps live people Search submit empty and quiet Education bound to the current q", () => {
    navigation.pathname = "/education/orientation";
    navigation.query = "cut";

    const live = renderToStaticMarkup(createElement(HouseLeadSearch, { tone: "live" }));
    expect(live).toContain('data-house-lead-search-tone="live"');
    expect(live).toContain("data-social-header-search");
    expect(live).not.toContain("data-education-header-search");
    expect(live).toContain(`action="${SOCIAL_ROUTES.search}"`);
    expect(live).toContain('name="intent"');
    expect(live).toContain('value="people"');
    // Founder 2026-10-05, decision 1: "Search Social" is the header's
    // default text on Social (the Search page keeps "Search people").
    expect(live).toContain(`placeholder="${SOCIAL.search.headerPlaceholder}"`);
    expect(SOCIAL.search.headerPlaceholder).toBe("Search Social");
    expect(live).not.toContain(`placeholder="${SOCIAL.search.searchPlaceholder}"`);
    expect(live).toContain(SOCIAL.explore.searchSocial);
    expect(live).toContain('id="social-header-q"');
    expect(live).not.toContain('value="cut"');
    expect(live).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(live).toContain(HOUSE_SEARCH_PILL_CLASS);

    const quiet = renderToStaticMarkup(createElement(HouseLeadSearch, { tone: "quiet" }));
    expect(quiet).toContain('data-house-lead-search-tone="quiet"');
    expect(quiet).toContain("data-education-header-search");
    expect(quiet).not.toContain("data-social-header-search");
    expect(quiet).toContain('action="/education/orientation"');
    expect(quiet).toContain(EDUCATION_SEARCH.placeholder);
    expect(quiet).toContain('id="education-header-q"');
    expect(quiet).toContain('value="cut"');
    expect(quiet).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(quiet).toContain(HOUSE_SEARCH_PILL_CLASS);

    navigation.pathname = "/education/orientation";
    const consume = renderToStaticMarkup(
      createElement(HouseLeadSearch, { tone: "quiet", inputId: "education-header-q-phone" }),
    );
    expect(consume).toContain('action="/education/orientation"');
    expect(consume).toContain('id="education-header-q-phone"');
  });

  it("keeps the Social phone hit as an icon on the same primitive", () => {
    const icon = renderToStaticMarkup(
      createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
    );
    expect(icon).toContain("data-house-lead-search-icon");
    expect(icon).toContain("data-social-header-search-icon");
    expect(icon).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    expect(icon).toContain(HOUSE_ICON_BUTTON_CLASS);
    expect(icon).not.toContain("data-house-lead-search-field");
    expect(icon).not.toContain("data-social-search-sheet");
    expect(icon).not.toContain(`href="${SOCIAL_ROUTES.explore}"`);
    expect(icon).toContain('href="/social/search?intent=people"');
  });

  it("reuses house pill tokens and does not absorb Titles SearchField", () => {
    expect(src).toContain('variant="bare"');
    expect(src).not.toContain("caret-accent");
    expect(src).not.toContain("focus:border-accent");
    expect(src).not.toContain("focus:ring-accent");
    expect(src).not.toContain("#1769");
    expect(src).not.toContain("@/components/layout/search-field");
    expect(src).not.toMatch(/(?:^|[^A-Za-z])SearchField(?:[^A-Za-z]|$)/);
    expect(pageSearch).toContain("HOUSE_SEARCH_PILL_CLASS");
    expect(pageSearch).toContain("HOUSE_LEAD_SEARCH_PILL_CLASS");
    expect(pageSearch).toContain('variant="bare"');
    expect(pageSearch).not.toContain("caret-accent");
    expect(pageSearch).not.toContain("focus:border-accent");
  });
});
