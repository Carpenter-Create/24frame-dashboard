import { existsSync, readFileSync } from "node:fs";
import { createElement } from "react";
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
import { WorkspaceSwitcher } from "@/components/chrome/workspace-switcher";
import { UserMenu } from "@/components/chrome/user-menu";
import {
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_LOGO_CLASS,
  HOUSE_LEAD_SCROLL_CLASS,
  HOUSE_LEAD_SEARCH_DESKTOP_CLASS,
  HOUSE_LEAD_SEARCH_PILL_CLASS,
  HOUSE_LEAD_SEARCH_WIDTH_PX,
  HOUSE_LEAD_SHELL_CLASS,
  HOUSE_LEAD_SLOT_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
  HOUSE_HEADER_TRAILING_AVATAR_CLASS,
  HOUSE_HEADER_TRAILING_HIT_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS,
  HOUSE_HEADER_TRAILING_SLOT_CLASS,
  HOUSE_ASK_AI_HEADER_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import { HOUSE_HEADER_SEARCH_GAP_CLASS, HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { EDUCATION_SEARCH } from "@/lib/course-search";
import { SOCIAL } from "@/lib/social";
import { workspaceHome } from "@/lib/workspace";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  WORKSPACE_SWITCHER_HOST_CLASS,
} from "@/lib/workspace-switcher";

const leadLib = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const leadSearch = readFileSync("src/components/chrome/house-lead-search.tsx", "utf8");

function htmlClass(html: string, attr: string): string {
  const start = html.indexOf(attr);
  if (start < 0) return "";
  const tag = html.slice(html.lastIndexOf("<", start), html.indexOf(">", start));
  return tag.match(/class="([^"]*)"/)?.[1] ?? "";
}

function leadHtml(workspace: "aggregation" | "social" | "education") {
  return renderToStaticMarkup(
    createElement(HouseLeadChrome, {
      workspace,
      search:
        workspace === "social"
          ? createElement(HouseLeadSearch, { tone: "live" })
          : workspace === "education"
            ? createElement(HouseLeadSearch, { tone: "quiet" })
            : undefined,
      accountMenu: createElement("div", { "data-user-menu-host": "" }),
    }),
  );
}

describe("house lead chrome — unify-lead-now G1–G9", () => {
  it("G1 ships one shared lead primitive — AppShell mounts it; SocialTopBar is gone", () => {
    expect(existsSync("src/components/chrome/house-lead-chrome.tsx")).toBe(true);
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(shell).toContain("<HouseLeadChrome");
    expect(shell.match(/<HouseLeadChromeSlot/g)?.length).toBe(1);
    expect(leadSrc).not.toContain("md:pl-5");
    expect(leadSrc).not.toContain("w-[420px]");
    expect(leadSrc).toContain("data-house-lead-chrome");
    expect(leadSrc).toContain("HOUSE_LEAD_CHROME_CLASS");
    expect(leadSrc).toContain("HOUSE_LEAD_LOGO_CLASS");
    expect(leadSrc).toContain("HOUSE_LEAD_SEARCH_DESKTOP_CLASS");
  });

  it("G2 keeps the logo in one fixed lead slot on all three workspaces", () => {
    const aggregation = leadHtml("aggregation");
    const social = leadHtml("social");
    const education = leadHtml("education");

    for (const html of [aggregation, social, education]) {
      expect(html).toContain("data-house-lead-chrome");
      expect(html).toContain(HOUSE_LEAD_CHROME_CLASS);
      expect(html).toContain("data-house-lead");
      expect(html).toContain("data-brand-emblem");
      expect(html).toContain(HOUSE_LEAD_LOGO_CLASS);
      expect(html).toContain(HOUSE_HEADER_SEARCH_GAP_CLASS);
    }

    expect(aggregation.indexOf("data-brand-emblem")).toBeLessThan(
      aggregation.indexOf("data-app-header-trailing"),
    );
    expect(social.indexOf("data-brand-emblem")).toBeLessThan(
      social.indexOf("data-house-lead-search"),
    );
    expect(education.indexOf("data-brand-emblem")).toBeLessThan(
      education.indexOf("data-house-lead-search"),
    );
  });

  it("G3 mounts Social live explore search in mid-lead at Facebook-compact width", () => {
    expect(HOUSE_LEAD_SEARCH_WIDTH_PX).toBe(240);
    expect(HOUSE_LEAD_SEARCH_DESKTOP_CLASS).toBe("hidden w-[240px] shrink-0 md:flex");
    expect(leadLib).toContain("Facebook-compact");
    expect(leadSearch).toContain("HOUSE_LEAD_SEARCH_PILL_CLASS");
    expect(leadSearch).toContain("data-social-header-search");
    expect(leadSearch).not.toContain("w-[420px]");

    const social = leadHtml("social");
    expect(social).toContain("data-house-lead-search");
    expect(social).toContain("data-social-header-search");
    expect(social).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(social).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(social).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(social).toContain(SOCIAL.explore.searchSocial);
    expect(social).toContain('action="/social/search"');
    expect(social).toContain('value="people"');
    expect(social).not.toContain("w-[420px]");
    expect(social.indexOf("data-house-lead-search")).toBeLessThan(
      social.indexOf("data-app-header-trailing"),
    );
  });

  it("G4 mounts Education quiet search with the same gap and width as Social", () => {
    expect(leadSearch).toContain("HOUSE_LEAD_SEARCH_PILL_CLASS");
    expect(leadSearch).not.toContain("w-[420px]");

    const social = leadHtml("social");
    const education = leadHtml("education");
    expect(education).toContain("data-house-lead-search");
    expect(education).toContain("data-education-header-search");
    expect(education).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(education).toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(education).toContain(EDUCATION_SEARCH.placeholder);
    expect(education).toContain(HOUSE_HEADER_SEARCH_GAP_CLASS);
    expect(social).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(social).toContain(HOUSE_HEADER_SEARCH_GAP_CLASS);
    expect(education).not.toContain("w-[420px]");
  });

  it("G5 leaves Aggregation mid-lead empty — no invented search", () => {
    const aggregation = leadHtml("aggregation");
    expect(aggregation).toContain("data-house-lead");
    expect(aggregation).not.toContain("data-house-lead-search");
    expect(aggregation).not.toContain("data-social-header-search");
    expect(aggregation).not.toContain("data-education-header-search");
    expect(aggregation).not.toContain("SearchField");
    expect(shell).not.toContain("SearchField");
    expect(leadLib).toContain("agg-search-no");
  });

  it("G6 keeps Aggregation logo inset identical when the search slot is empty", () => {
    const aggregation = leadHtml("aggregation");
    const social = leadHtml("social");
    expect(aggregation).toContain(HOUSE_LEAD_CHROME_CLASS);
    expect(social).toContain(HOUSE_LEAD_CHROME_CLASS);
    expect(aggregation).toContain(HOUSE_LEAD_LOGO_CLASS);
    expect(social).toContain(HOUSE_LEAD_LOGO_CLASS);
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("relative");
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("md:pl-[var(--shell-gutter-inline-start)]");
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("md:pr-[var(--shell-gutter-inline-end)]");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("md:px-[var(--chrome-gutter)]");
    expect(leadSrc).not.toContain("md:pl-5");
    expect(leadSrc).not.toContain("justify-between");
    expect(leadSrc).toContain("search ?");
  });

  it("G7 keeps trailing workspace switcher + Ask + bell + avatar on all three", () => {
    for (const workspace of ["aggregation", "social", "education"] as const) {
      const html = leadHtml(workspace);
      expect(html).toContain("data-app-header-trailing");
      expect(html).toContain(APP_HEADER_TRAILING_CLUSTER_CLASS);
      expect(html).toContain("data-workspace-waffle");
      expect(html).toContain('data-workspace-switcher-presentation="waffle"');
      expect(html).toContain('data-workspace-switcher-presentation="pills"');
      expect(html).toContain("hidden md:contents");
      expect(html).toContain("md:hidden");
      expect(html).toContain("data-ask-assistant-header");
      expect(html).not.toContain("data-theme-toggle");
      expect(html).toContain("data-activity-bell");
      expect(html).toContain("data-user-menu-host");
      expect(html.indexOf("data-ask-assistant-header")).toBeLessThan(
        html.indexOf("data-activity-bell"),
      );
      expect(html.indexOf("data-activity-bell")).toBeLessThan(
        html.indexOf("data-workspace-waffle"),
      );
      expect(html.indexOf("data-workspace-waffle")).toBeLessThan(
        html.indexOf("data-user-menu-host"),
      );
      expect(html).not.toContain("lucide-");
      expect(html).not.toContain('stroke-width="1.33"');
      expect(html).toContain('data-house-ai-mark-register="stroke"');
    }
    expect(leadSrc.match(/<WorkspaceSwitcher/g)?.length).toBe(2);
    expect(leadSrc).toContain("<AskAssistantHeaderLink />");
    expect(leadSrc).not.toContain("ThemeToggle");
    expect(leadSrc).not.toContain('from "@/components/theme-toggle"');
    expect(leadSrc).toContain("<ActivityBell");
    expect(leadSrc).toContain("workspace={workspace}");
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain(HOUSE_HEADER_TRAILING_HIT_CLASS);
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain("min-h-[var(--header-control-size)]");
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain("min-w-[var(--header-control-size)]");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("size-[44px]");
    expect(HOUSE_THEME_TOGGLE_CLASS).toContain("rounded-full");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("purple");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("violet");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("border-hairline");
    expect(HOUSE_ASK_AI_HEADER_CLASS).toContain(HOUSE_THEME_TOGGLE_CLASS);
    expect(HOUSE_ASK_AI_HEADER_CLASS).toContain("aria-pressed:text-ink");
  });

  it("locks desktop header height and the sizes that derive from it", () => {
    const tokens = readFileSync("src/app/tokens.css", "utf8");
    expect(tokens).toMatch(/--header-height:\s*88px;/);
    expect(tokens).toMatch(/--header-avatar-size:\s*28px;/);
    expect(tokens).toMatch(/--header-control-size:\s*44px;/);
    expect(tokens).toMatch(/--header-search-height:\s*48px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-height:\s*64px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-avatar-size:\s*28px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-control-size:\s*44px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-search-height:\s*44px;/);
    expect(HOUSE_LEAD_SEARCH_PILL_CLASS).toContain("h-[var(--header-search-height)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).toContain("size-[var(--header-avatar-size)]");
    expect(leadSrc).toContain('style={{ minHeight: "var(--header-height)" }}');
    expect(HOUSE_LEAD_CHROME_CLASS).toContain("h-[var(--header-height)]");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("max-md:h-auto");
  });

  it("evens phone trailing AI · bell · avatar with one gap and no overlapping hits", () => {
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("size-4");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toMatch(/-m[xlr]-/);
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("p-[var(--space-2)]");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("size-6");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("size-5");
    expect(HOUSE_HEADER_TRAILING_HIT_CLASS).not.toContain("size-[44px]");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).toContain("size-[var(--header-avatar-size)]");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).not.toContain("h-8 w-8");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).not.toContain("p-[");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).not.toContain("-mx-");
    expect(HOUSE_HEADER_TRAILING_AVATAR_CLASS).not.toContain("ml-");
    expect(HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS).toBe("contents md:hidden");
    expect(HOUSE_HEADER_TRAILING_SLOT_CLASS).toBe("contents");
    expect(leadSrc).toContain("HOUSE_HEADER_TRAILING_SLOT_CLASS");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toBe(
      "flex min-w-0 items-center gap-[var(--space-3)] md:gap-[var(--space-4)] max-md:shrink-0",
    );
  });

  it("G8 absorbs SocialTopBar — wrapper gone, no drifted placement fork", () => {
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
    expect(shell).not.toContain("SocialTopBarFromChrome");
    expect(shell).not.toContain("SocialTopBarSlot");
    expect(shell).toContain("Do not use() this at the AppShell top");

    const absorbed = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "social",
        logoVisible: "always",
        search: createElement(HouseLeadSearch, { tone: "live" }),
        trailingSearch: createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
        accountMenu: createElement(UserMenu, { email: "ada@example.com", name: "Ada" }),
      }),
    );
    expect(absorbed).toContain("data-house-lead-chrome");
    expect(absorbed).toContain("data-social-top-bar");
    expect(absorbed).toContain(HOUSE_LEAD_CHROME_CLASS);
    expect(absorbed).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(absorbed).not.toContain("w-[420px]");
  });

  it("G9 pins the shared lead to the viewport — page scroll lives on main", () => {
    expect(HOUSE_LEAD_STACK_CLASS).toBe("sticky top-0 z-40 shrink-0");
    expect(HOUSE_LEAD_STACK_CLASS).toContain("sticky");
    expect(HOUSE_LEAD_STACK_CLASS).toContain("top-0");
    expect(HOUSE_LEAD_STACK_CLASS).toContain("shrink-0");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("sticky");
    expect(HOUSE_LEAD_UNDER_NAV_CLASS).toContain("md:hidden");
    expect(HOUSE_LEAD_UNDER_NAV_CLASS).toContain("py-[var(--space-3)]");
    expect(HOUSE_LEAD_UNDER_NAV_CLASS).not.toContain("py-[var(--space-2)]");
    expect(HOUSE_LEAD_UNDER_NAV_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(HOUSE_LEAD_SHELL_CLASS).toBe(
      "flex h-dvh flex-col overflow-hidden overscroll-none",
    );
    expect(HOUSE_LEAD_SCROLL_CLASS).toBe(
      "min-h-0 flex-1 overflow-y-auto overscroll-contain",
    );
    expect(HOUSE_LEAD_SHELL_CLASS).not.toContain("min-h-dvh");
    expect(leadLib).toContain("G9");
    expect(leadLib).toContain("not the scroll ancestor");
    expect(readFileSync("src/components/chrome/house-phone-app-shell.tsx", "utf8")).toContain(
      "HOUSE_LEAD_SHELL_CLASS",
    );
    expect(shell).toContain("HOUSE_LEAD_SCROLL_CLASS");
    expect(shell).toContain("HousePhoneAppShell");
    expect(shell.match(/HOUSE_LEAD_SCROLL_CLASS/g)?.length).toBe(2);
    expect(shell.match(/data-house-lead-scroll/g)?.length).toBe(1);
    expect(shell).not.toContain("min-h-dvh");
    expect(shell).not.toContain("min-h-[calc(100dvh-var(--header-height))]");
    expect(shell).not.toContain("minHeight: \"calc(100dvh - var(--header-height))\"");
    expect(shell).not.toContain("data-aggregation-sticky");
    expect(leadSrc).not.toContain("fixed inset-x-0");
  });

  it("keeps phone emblem from overlapping trailing chrome — no workspace pill", () => {
    expect(leadSrc).toContain("HOUSE_LEAD_STACK_CLASS");
    expect(leadSrc).toContain("data-house-lead-stack");
    expect(leadSrc).toContain("<BrandLogo />");
    expect(leadSrc).not.toContain("BrandEmblem");
    expect(leadSrc.match(/<BrandLogo/g)?.length).toBe(1);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(
      /(?:^|\s)gap-\[var\(--space-3\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(leadSrc).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).not.toContain("gap-[var(--space-1)]");
    expect(APP_HEADER_LEADING_CLASS).toContain("min-w-0");
    for (const workspace of ["aggregation", "social", "education"] as const) {
      const html = leadHtml(workspace);
      expect(html).toContain("data-brand-logo");
      expect(html).toContain('data-brand-logo-mark="emblem"');
      expect(html).toContain("/brand/24frame-emblem.svg");
      expect(html).toContain("/brand/24frame-logo-light.svg");
      expect(html).toContain("md:hidden");
      expect(html).toContain("data-workspace-waffle");
      expect(html).not.toContain("data-app-header-workspace-pill");
      expect(html.indexOf("data-brand-emblem")).toBeLessThan(
        html.indexOf("data-app-header-trailing"),
      );
    }
  });

  it("keeps the phone workspace panel out of overflow-hidden ancestors", () => {
    const phoneGap = APP_HEADER_LEADING_CLASS.match(
      /(?<![a-z0-9:-])gap-\[var\((--space-\d+)\)\]/,
    )?.[1];
    expect(Number(phoneGap?.replace("--space-", ""))).toBeGreaterThanOrEqual(2);

    const html = leadHtml("aggregation");
    const ancestors = [
      htmlClass(html, 'data-app-header=""'),
      htmlClass(html, 'data-app-header-leading=""'),
    ];
    expect(ancestors[0]).toBe(HOUSE_LEAD_CHROME_CLASS);
    expect(ancestors[1]).toBe(APP_HEADER_LEADING_CLASS);
    for (const className of ancestors) {
      expect(className).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    }

    const open = renderToStaticMarkup(
      createElement(WorkspaceSwitcher, {
        current: "aggregation",
        defaultOpen: true,
      }),
    );
    expect(htmlClass(open, "data-workspace-switcher=")).toBe(WORKSPACE_SWITCHER_HOST_CLASS);
    expect(htmlClass(open, "data-workspace-switcher=")).not.toMatch(/overflow-hidden/);
    expect(open).toContain("data-workspace-switcher-popover");
    expect(open).toContain('data-workspace-waffle-tile="social"');
    expect(open).toContain('data-workspace-waffle-tile="education"');
    expect(open).not.toContain('data-workspace-waffle-tile="co-productions"');
  });

  it("shows the phone emblem on every workspace — no hamburger", () => {
    expect(leadSrc).toContain('logoVisible = "always"');
    expect(leadSrc).toContain('logoVisible === "always" ? "flex" : "hidden md:flex"');
    expect(shell).toContain('logoVisible="always"');
    expect(shell).not.toContain('homeChrome ? "always" : "desktop"');
    expect(leadLib).toContain("Asset 8 emblem on every workspace");
    expect(leadLib).toContain("Emblem owns the phone left next to the workspace trigger");
    expect(APP_HEADER_LEADING_CLASS).toContain("gap-[var(--space-3)]");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);

    for (const workspace of ["aggregation", "social", "education", "staff"] as const) {
      const html = renderToStaticMarkup(
        createElement(HouseLeadChrome, {
          workspace,
          isGcStaff: workspace === "staff",
          accountMenu: createElement("div", { "data-user-menu-host": "" }),
        }),
      );
      const leadClass = htmlClass(html, 'data-house-lead=""');
      expect(leadClass).toContain("flex");
      expect(leadClass).toContain(HOUSE_LEAD_SLOT_CLASS);
      expect(leadClass).not.toMatch(/(?:^|\s)hidden(?:\s|$)/);
      expect(html).toContain("data-brand-emblem");
      expect(html).toContain("data-brand-logo");
      expect(html).toContain('data-brand-logo-mark="emblem"');
      expect(html).toContain("/brand/24frame-emblem.svg");
      const homeAt = html.indexOf('data-house-home=""');
      const phoneMark = html.slice(html.lastIndexOf("<a", homeAt), html.indexOf(">", homeAt) + 1);
      expect(phoneMark).toContain('href="/home"');
      expect(phoneMark).toContain("md:hidden");
      expect(phoneMark).not.toContain("md:inline-flex");
      expect(html).toContain(`href="${workspaceHome(workspace)}"`);
      expect(html).toContain("hidden shrink-0 items-center md:inline-flex");
      const leading = html.slice(
        html.indexOf("data-app-header-leading"),
        html.indexOf("data-app-header-trailing"),
      );
      expect(leading).not.toContain("data-mobile-nav-trigger");
      expect(leading.indexOf("data-brand-emblem")).toBeGreaterThan(-1);
      expect(html).not.toContain("data-mobile-nav-trigger");
      expect(html.indexOf("data-activity-bell")).toBeLessThan(
        html.indexOf("data-user-menu-host"),
      );
    }

    expect(shell).not.toContain("destChips=");
    expect(shell).not.toContain("<DestChipsSlot");
    expect(shell).not.toContain("<MobileNavSlot");
    expect(existsSync("src/components/social/social-top-bar.tsx")).toBe(false);
  });

  it("keeps Education search under the header without a dest-chip rail", () => {
    const html = renderToStaticMarkup(
      createElement(HouseLeadChrome, {
        workspace: "education",
        underNav: createElement(HouseLeadSearch, {
          tone: "quiet",
          inputId: "education-header-q-phone",
        }),
        accountMenu: createElement("div", { "data-user-menu-host": "" }),
      }),
    );
    expect(html).not.toContain("data-house-phone-dest-chips-host");
    expect(html.indexOf("data-house-under-nav")).toBeGreaterThan(
      html.indexOf("</header>"),
    );
    expect(html.indexOf("data-education-header-search")).toBeGreaterThan(
      html.indexOf("</header>"),
    );
    expect(HOUSE_LEAD_STACK_CLASS).toContain("z-40");
    expect(readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8")).toContain(
      "createPortal",
    );
  });
});
