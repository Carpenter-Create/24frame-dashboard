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
  HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS,
  HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS,
  HOUSE_LEAD_SEARCH_HEADER_GLYPH_CLASS,
  HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS,
  HOUSE_LEAD_DESKTOP_PAD_CLASS,
  HOUSE_HEADER_DESKTOP_AVATAR_CLASS,
  HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS,
  HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS,
  HOUSE_HEADER_ROUND_BUTTON_CLASS,
  HOUSE_LEAD_SEARCH_MAX_WIDTH_PX,
  HOUSE_LEAD_SEARCH_MIN_WIDTH_PX,
  HOUSE_LEAD_SHELL_CLASS,
  HOUSE_LEAD_SLOT_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
  HOUSE_HEADER_TRAILING_AVATAR_CLASS,
  HOUSE_HEADER_TRAILING_HIT_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS,
  HOUSE_HEADER_TRAILING_SLOT_CLASS,
  HOUSE_ASK_AI_HEADER_CLASS,
  HOUSE_LEAD_SEARCH_ICON_CLASS,
  HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS,
  HOUSE_THEME_TOGGLE_CLASS,
} from "@/lib/house-lead-chrome";
import { ASK_FRAME_AI } from "@/lib/ask-frame-ai";
import { ACTIVITY_BELL_TRIGGER_CLASS, ACTIVITY_BELL_TRIGGER_OPEN_CLASS } from "@/lib/activity";
import { HOUSE_HEADER_SEARCH_GAP_CLASS, HOUSE_SEARCH_PILL_CLASS } from "@/lib/house-shell";
import { EDUCATION_SEARCH } from "@/lib/course-search";
import { SOCIAL } from "@/lib/social";
import { workspaceHome } from "@/lib/workspace";
import {
  APP_HEADER_LEADING_CLASS,
  APP_HEADER_TRAILING_CLUSTER_CLASS,
  WORKSPACE_SWITCHER_HOST_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_CLASS,
  WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS,
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

function leadHtml(workspace: "aggregation" | "social" | "education", brandInHeader = false) {
  return renderToStaticMarkup(
    createElement(HouseLeadChrome, {
      workspace,
      brandInHeader,
      search:
        workspace === "social"
          ? createElement(HouseLeadSearch, { tone: "live", presentation: "header" })
          : workspace === "education"
            ? createElement(HouseLeadSearch, { tone: "quiet", presentation: "header" })
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

  it("G3 mounts Social live search first in the trailing cluster as the wide grey pill", () => {
    // Coinbase register: the 44 grey pill flexes 240–360 from xl (flex
    // 0 1 360px); below xl the round grey icon keeps the slider unclipped.
    expect(HOUSE_LEAD_SEARCH_MIN_WIDTH_PX).toBe(240);
    expect(HOUSE_LEAD_SEARCH_MAX_WIDTH_PX).toBe(360);
    expect(HOUSE_LEAD_SEARCH_DESKTOP_CLASS).toBe(
      "hidden min-w-[240px] max-w-[360px] flex-[0_1_360px] xl:flex",
    );
    expect(HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS).toBe(
      "flex h-[var(--header-control-size)] w-full min-w-0 items-center gap-[var(--space-3)] rounded-full border-0 bg-surface-muted px-[var(--space-4)] text-ink-2",
    );
    expect(HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS).toContain("text-[length:var(--text-base)]");
    expect(HOUSE_LEAD_SEARCH_HEADER_INPUT_CLASS).toContain("placeholder:text-ink-2");
    expect(HOUSE_LEAD_SEARCH_HEADER_GLYPH_CLASS).toBe("size-5 shrink-0 text-ink-2");
    expect(leadLib).toContain("Facebook-compact");
    expect(leadSearch).toContain("HOUSE_LEAD_SEARCH_PILL_CLASS");
    expect(leadSearch).toContain("HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS");
    expect(shell).toContain('<HouseLeadSearch tone="live" presentation="header" />');
    expect(shell).toContain('<HouseLeadSearch tone="quiet" presentation="header" />');
    expect(leadSearch).toContain("data-social-header-search");
    expect(leadSearch).not.toContain("w-[420px]");

    const social = leadHtml("social");
    expect(social).toContain("data-house-lead-search");
    expect(social).toContain("data-social-header-search");
    expect(social).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    expect(social).toContain(`class="${HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS}`);
    expect(social).toContain('data-house-lead-search-face="header"');
    // The header face, not the 48 field pill.
    expect(social).not.toContain(HOUSE_LEAD_SEARCH_PILL_CLASS);
    expect(HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS).toContain(HOUSE_SEARCH_PILL_CLASS);
    expect(social).toContain(SOCIAL.explore.searchSocial);
    // Founder 2026-10-05, decision 1: the Social pill reads "Search Social".
    expect(social).toContain('placeholder="Search Social"');
    expect(SOCIAL.search.headerPlaceholder).toBe("Search Social");
    expect(social).not.toContain('placeholder="Search people"');
    expect(social).toContain('action="/social/search"');
    expect(social).toContain('value="people"');
    expect(social).not.toContain("w-[420px]");
    expect(social.indexOf("data-app-header-trailing")).toBeLessThan(
      social.indexOf("data-house-lead-search"),
    );
    expect(social.indexOf("data-house-lead-search")).toBeLessThan(
      social.indexOf("data-ask-assistant-header"),
    );
  });

  it("G10 orders desktop as slider | search · Ask · bell · avatar — no hairline, no brand in the bar beside a side menu, no Ask label", () => {
    for (const workspace of ["aggregation", "social", "education"] as const) {
      const html = leadHtml(workspace);
      expect(html, workspace).not.toContain("data-app-header-divider");
      // The desktop brand mark lives in the side menu's top band; the bar
      // keeps only the phone emblem (md:hidden).
      expect(html, workspace).not.toContain("hidden shrink-0 items-center md:inline-flex");
      const row = html.indexOf("data-workspace-switcher-slider");
      const trailing = html.indexOf("data-app-header-trailing");
      expect(row, workspace).toBeGreaterThan(-1);
      expect(row, workspace).toBeLessThan(trailing);
      expect(html.indexOf('data-workspace-switcher-segment="home"'), workspace).toBeLessThan(
        html.indexOf('data-workspace-switcher-segment="aggregation"'),
      );
      expect(html.indexOf("data-ask-assistant-header"), workspace).toBeLessThan(
        html.indexOf("data-activity-bell"),
      );
      // Ask: no visible label at any width; the name is the aria-label
      // and the tooltip (founder decision 1).
      expect(html, workspace).not.toContain("data-ask-assistant-header-label");
      const askAt = html.indexOf('data-ask-assistant-header=""');
      const askTag = html.slice(html.lastIndexOf("<button", askAt), html.indexOf(">", askAt));
      expect(askTag, workspace).toContain(`aria-label="${ASK_FRAME_AI.headline}"`);
      expect(askTag, workspace).toContain(`title="${ASK_FRAME_AI.headline}"`);
    }
    expect(ASK_FRAME_AI.headline).toBe("Ask 24Frame AI");
    expect(leadHtml("aggregation")).not.toContain("data-house-lead-search");
    // Ask is the round grey 44 — no xl pill, no border.
    expect(HOUSE_ASK_AI_HEADER_CLASS).toBe(HOUSE_HEADER_ROUND_BUTTON_CLASS);
    expect(HOUSE_ASK_AI_HEADER_CLASS).not.toMatch(/xl:|border/);
    expect(leadLib).not.toContain("HOUSE_ASK_AI_HEADER_LABEL_CLASS");
  });

  it("heads the bar with the brand mark only where the page has no side menu, its ink at 32", () => {
    const html = leadHtml("social", true);
    expect(html).toContain('data-app-header-brand=""');
    expect(html).toContain("hidden shrink-0 items-center md:inline-flex");
    expect(html).toContain(`href="${workspaceHome("social")}"`);
    expect(htmlClass(html, 'data-app-header=""')).toContain(HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS);
    expect(HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS).toBe(
      "md:pl-[var(--shell-gutter-inline-start)] md:pr-[var(--shell-gutter-inline-end)]",
    );
    const beside = leadHtml("social");
    expect(beside).not.toContain('data-app-header-brand=""');
    expect(htmlClass(beside, 'data-app-header=""')).toContain(HOUSE_LEAD_DESKTOP_PAD_CLASS);
    expect(HOUSE_LEAD_DESKTOP_PAD_CLASS).toBe("md:pl-[var(--space-6)] md:pr-[var(--shell-gutter-inline-end)]");
    // AppShell: the bar carries the mark exactly when the side menu is off.
    expect(shell).toContain("brandInHeader={hideDestRail}");
  });

  it("G11 collapses Social and Education search to an icon below xl — Social links to Search, Education opens the field", () => {
    expect(HOUSE_LEAD_SEARCH_ICON_CLASS).toBe(`${HOUSE_THEME_TOGGLE_CLASS} xl:hidden`);
    expect(HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS).toBe("relative hidden md:flex xl:hidden");
    const socialIcon = renderToStaticMarkup(
      createElement(HouseLeadSearch, { tone: "live", presentation: "icon" }),
    );
    expect(socialIcon).toContain('href="/social/search?intent=people"');
    expect(socialIcon).toContain(HOUSE_LEAD_SEARCH_ICON_CLASS);
    expect(socialIcon).not.toContain("md:hidden\"");
    const educationIcon = renderToStaticMarkup(
      createElement(HouseLeadSearch, { tone: "quiet", presentation: "icon" }),
    );
    expect(educationIcon).toContain("data-house-lead-search-toggle");
    expect(educationIcon).toContain(HOUSE_LEAD_SEARCH_TOGGLE_HOST_CLASS);
    expect(educationIcon).toContain(`aria-label="${EDUCATION_SEARCH.label}"`);
    expect(educationIcon).toContain('aria-expanded="false"');
    expect(educationIcon).not.toContain("data-house-lead-search-panel");
    expect(educationIcon).not.toContain("href=");
    expect(shell).toContain('inputId="education-header-q-compact"');
  });

  it("G4 mounts Education quiet search with the same gap and width as Social", () => {
    expect(leadSearch).toContain("HOUSE_LEAD_SEARCH_PILL_CLASS");
    expect(leadSearch).not.toContain("w-[420px]");

    const social = leadHtml("social");
    const education = leadHtml("education");
    expect(education).toContain("data-house-lead-search");
    expect(education).toContain("data-education-header-search");
    expect(education).toContain(HOUSE_LEAD_SEARCH_DESKTOP_CLASS);
    // Same 232×34 header face as Social (screening chrome).
    expect(education).toContain(`class="${HOUSE_LEAD_SEARCH_HEADER_FIELD_CLASS}`);
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
    // Desktop pads ride beside the bar class: 24 after the side menu's
    // edge, the shell gutter 32 at the end (the avatar lines up with the
    // page's right edge).
    expect(HOUSE_LEAD_DESKTOP_PAD_CLASS).toContain("md:pl-[var(--space-6)]");
    expect(HOUSE_LEAD_DESKTOP_PAD_CLASS).toContain("md:pr-[var(--shell-gutter-inline-end)]");
    expect(htmlClass(aggregation, 'data-app-header=""')).toBe(htmlClass(social, 'data-app-header=""'));
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("md:px-[var(--chrome-gutter)]");
    expect(leadSrc).not.toContain("md:pl-5");
    expect(leadSrc).not.toContain("justify-between");
    expect(leadSrc).toContain("search ?");
  });

  it("G7 keeps the grid button on the lead and Ask + bell + avatar trailing on all three", () => {
    for (const workspace of ["aggregation", "social", "education"] as const) {
      const html = leadHtml(workspace);
      expect(html).toContain("data-app-header-trailing");
      expect(html).toContain(APP_HEADER_TRAILING_CLUSTER_CLASS);
      expect(html).toContain("data-workspace-waffle");
      expect(html).toContain('data-workspace-switcher-presentation="waffle"');
      expect(html).toContain('data-workspace-switcher-presentation="slider"');
      expect(html).toContain("hidden lg:contents");
      expect(html).toContain("lg:hidden");
      expect(html).toContain("data-ask-assistant-header");
      expect(html).not.toContain("data-theme-toggle");
      expect(html).toContain("data-activity-bell");
      expect(html).toContain("data-user-menu-host");
      expect(html.indexOf("data-ask-assistant-header")).toBeLessThan(
        html.indexOf("data-activity-bell"),
      );
      expect(html.indexOf("data-workspace-waffle")).toBeLessThan(
        html.indexOf("data-app-header-trailing"),
      );
      expect(html.indexOf("data-activity-bell")).toBeLessThan(
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
    // Coinbase register: every header control is the round grey 44 on
    // phone and desktop — muted fill, ink glyph, no 34 radius-10 box.
    expect(HOUSE_THEME_TOGGLE_CLASS).toBe(HOUSE_HEADER_ROUND_BUTTON_CLASS);
    expect(HOUSE_HEADER_ROUND_BUTTON_CLASS).toContain("bg-surface-muted text-ink");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("md:size-[var(--header-desktop-control-size)]");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("md:rounded-[var(--radius)]");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("purple");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("violet");
    expect(HOUSE_THEME_TOGGLE_CLASS).not.toContain("border-hairline");
    expect(HOUSE_ASK_AI_HEADER_CLASS).toContain(HOUSE_THEME_TOGGLE_CLASS);
    // Open steps the grey fill one stop (the sparkle owns its accent).
    expect(HOUSE_ASK_AI_HEADER_CLASS).toContain("aria-pressed:bg-hairline");
  });

  it("marks Ask hover and open with the hairline grey the bell and pill use, since no child takes the hit's ink", () => {
    // The Ask hit's only child is the accent sparkle (Adam 2026-10-04,
    // "Blue, as in the mockup"), so hover or pressed ink on the hit would
    // repaint nothing; hover and open (aria-pressed) step the grey fill.
    const html = leadHtml("aggregation");
    const askAt = html.indexOf('data-ask-assistant-header=""');
    const ask = html.slice(askAt, html.indexOf("</button>", askAt));
    const marks = [...ask.matchAll(/<svg[^>]*class="([^"]*)"/g)].map((m) => m[1].split(" "));
    expect(marks).toHaveLength(1);
    for (const cls of marks) expect(cls).toEqual(["size-5", "shrink-0", "text-accent"]);

    const hit = htmlClass(html, 'data-ask-assistant-header=""').split(" ");
    expect(hit).toEqual(HOUSE_ASK_AI_HEADER_CLASS.split(" "));
    expect(hit).toContain("bg-surface-muted");
    expect(hit).toContain("hover:bg-hairline");
    expect(hit).toContain(`aria-pressed:${ACTIVITY_BELL_TRIGGER_OPEN_CLASS}`);
    // The same step the trailing toggles that own a panel already use.
    expect(ACTIVITY_BELL_TRIGGER_CLASS.split(" ")).toContain("hover:bg-hairline");
    expect(WORKSPACE_WAFFLE_TRIGGER_CLASS.split(" ")).toContain("hover:bg-hairline");
    expect(WORKSPACE_WAFFLE_TRIGGER_OPEN_CLASS).toBe(ACTIVITY_BELL_TRIGGER_OPEN_CLASS);
    expect(hit.some((c) => c.startsWith("aria-pressed:text-"))).toBe(false);
    expect(leadLib).not.toContain("Pressed ink marks open");
  });

  // Coinbase register (Adam 2026-10-05): 80 desktop (supersedes the
  // screening chrome's 52), 60 phone; every header control 44; the
  // avatar 44 on both.
  it("locks desktop header height and the sizes that derive from it", () => {
    const tokens = readFileSync("src/app/tokens.css", "utf8");
    expect(tokens).toMatch(/--header-height:\s*80px;/);
    expect(tokens).not.toMatch(/--header-height:\s*52px;/);
    expect(tokens).not.toMatch(/--header-height:\s*88px;/);
    expect(tokens).toMatch(/--header-avatar-size:\s*44px;/);
    expect(tokens).toMatch(/--header-control-size:\s*44px;/);
    expect(tokens).toMatch(/--header-desktop-control-size:\s*44px;/);
    expect(tokens).toMatch(/--header-search-height:\s*48px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-height:\s*60px;/);
    expect(tokens).toMatch(/max-width:\s*767px[\s\S]*--header-avatar-size:\s*44px;/);
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
    // Desktop: the 44 photo, 8 out like every control (no extra 4);
    // phone: the 44 hit holds the 44 face.
    expect(HOUSE_HEADER_DESKTOP_AVATAR_CLASS).toBe(HOUSE_HEADER_TRAILING_AVATAR_CLASS);
    expect(HOUSE_HEADER_PHONE_ACCOUNT_HIT_CLASS).toContain("size-[var(--header-control-size)]");
    expect(HOUSE_HEADER_PHONE_ACCOUNT_FACE_CLASS).toBe(`${HOUSE_HEADER_TRAILING_AVATAR_CLASS} overflow-hidden`);
    expect(HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS).toBe("contents md:hidden");
    expect(HOUSE_HEADER_TRAILING_SLOT_CLASS).toBe("contents");
    expect(leadSrc).toContain("HOUSE_HEADER_TRAILING_SLOT_CLASS");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toBe(
      "flex min-w-0 items-center gap-[var(--space-1)] md:gap-[var(--space-2)] max-md:shrink-0",
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
    // md+ the stack starts at the full-height side menu's edge.
    expect(HOUSE_LEAD_STACK_CLASS).toBe("sticky top-0 z-40 shrink-0 md:ml-[var(--sidebar-width)]");
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
    // Coinbase register: phone hits 4 apart; desktop controls 8 apart.
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-1\)\](?:\s|$)/);
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("md:gap-[var(--space-2)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-4)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toContain("md:gap-[var(--space-3)]");
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).not.toMatch(
      /(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/,
    );
    expect(APP_HEADER_TRAILING_CLUSTER_CLASS).toContain("max-md:shrink-0");
    expect(leadSrc).not.toContain("APP_HEADER_WORKSPACE_PILL_HOST_CLASS");
    expect(APP_HEADER_LEADING_CLASS).not.toMatch(/(?:^|\s)(?:max-md:)?overflow-hidden(?:\s|$)/);
    expect(APP_HEADER_LEADING_CLASS).toContain("overflow-visible");
    expect(APP_HEADER_LEADING_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/);
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
    expect(ancestors[0]).toBe(`${HOUSE_LEAD_CHROME_CLASS} ${HOUSE_LEAD_DESKTOP_PAD_CLASS}`);
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
    expect(leadLib).toContain("then\n// the grey workspace pill (filled grid + the current workspace's name,\n// 15 / 600 ink)");
    expect(APP_HEADER_LEADING_CLASS).toMatch(/(?:^|\s)gap-\[var\(--space-2\)\](?:\s|$)/);
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
      // Beside a side menu the desktop mark is in the menu's band, not here.
      expect(html).not.toContain("hidden shrink-0 items-center md:inline-flex");
      expect(leadClass).toContain("md:hidden");
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
