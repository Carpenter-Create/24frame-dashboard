import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const navigation = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
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

import { readFileSync } from "node:fs";

import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_LABEL_CLASS,
  HOUSE_DEST_RAIL_ROW_CLASS,
  HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_UNREAD_DOT_CLASS,
  HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS,
  HOUSE_RAIL_FOOT_CLASS,
  HOUSE_RAIL_FOOT_COLLAPSED_CLASS,
} from "@/lib/house-shell";
import { STAFF_RAIL_EYEBROW } from "@/lib/nav";
import type { WorkspaceMode } from "@/lib/workspace";
import { RailCollapse } from "./rail-collapse";
import { SideNav } from "./side-nav";

const appShellSrc = readFileSync("src/components/chrome/app-shell.tsx", "utf8");

function render(
  pathname: string,
  workspace: WorkspaceMode,
  opts: { collapsed?: boolean; isGcStaff?: boolean; homeOwned?: boolean; messagesUnread?: number } = {},
): string {
  navigation.pathname = pathname;
  try {
    return renderToStaticMarkup(
      <SideNav
        workspace={workspace}
        collapsed={opts.collapsed}
        isGcStaff={opts.isGcStaff}
        homeOwned={opts.homeOwned}
        messagesUnread={opts.messagesUnread}
      />,
    );
  } finally {
    navigation.pathname = "/";
  }
}

/** Accent fill other than the current row's wash. */
const ACCENT_FILL = /bg-accent(?!-wash)/;

/** The row (link or button) holding the given label. */
function rowWith(html: string, label: string): string {
  const at = html.indexOf(`>${label}<`);
  const start = Math.max(html.lastIndexOf("<a ", at), html.lastIndexOf("<button", at));
  const end = Math.min(
    ...["</a>", "</button>"].map((tag) => html.indexOf(tag, at)).filter((i) => i >= 0),
  );
  return html.slice(start, end);
}

function activeGlyphs(html: string): number {
  return (html.match(/data-side-nav-icon-active=""/g) ?? []).length;
}

function rowLabels(html: string): string[] {
  return [...html.matchAll(/<span data-side-nav-label="" class="[^"]*">([^<]+)<\/span>/g)].map(
    (row) => row[1] ?? "",
  );
}

describe("SideNav — one rail pattern on every workspace (Coinbase register)", () => {
  it("is the rows alone — no workspace eyebrow, no top-row control; the workspace names the nav", () => {
    for (const [path, workspace, name, opts] of [
      ["/home", "aggregation", "Home", { homeOwned: true }],
      ["/aggregation/dashboard", "aggregation", "Aggregation", {}],
      ["/social", "social", "Social", {}],
      ["/education", "education", "Education", {}],
      ["/staff/queue", "staff", "Staff", { isGcStaff: true }],
    ] as const) {
      const html = render(path, workspace, opts);
      expect(html, path).toMatch(new RegExp(`^<nav [^>]*aria-label="${name}"`));
      expect(html, path).not.toContain("data-side-nav-eyebrow");
      expect(html, path).not.toContain("data-side-nav-top");
      expect(html, path).not.toContain("data-rail-collapse");
      // The nav's first child is the first row.
      const first = html.slice(html.indexOf(">") + 1);
      expect(first, path).toMatch(/^<(?:a|button) /);
      const collapsed = render(path, workspace, { ...opts, collapsed: true });
      expect(collapsed, path).not.toContain("data-side-nav-eyebrow");
      expect(collapsed, path).not.toContain("data-side-nav-rule");
      expect(collapsed, path).toContain("data-side-nav-collapsed");
      expect(collapsed, path).toContain(HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS);
      expect(collapsed, path).not.toContain("data-side-nav-label");
    }
  });

  // Focus: the collapse control sits in one foot element at the bottom
  // of the column, rendered in both states with only its class changing,
  // so React keeps the one <button> and keyboard focus stays on it.
  it("keeps the one collapse button in the same foot slot in both states, so focus survives the toggle", () => {
    const foot = appShellSrc.slice(appShellSrc.indexOf("data-app-rail-foot"));
    expect(foot.slice(0, foot.indexOf("</div>"))).toContain(
      "className={collapsed ? HOUSE_RAIL_FOOT_COLLAPSED_CLASS : HOUSE_RAIL_FOOT_CLASS}",
    );
    expect(foot.slice(0, foot.indexOf("</div>"))).toContain("<RailCollapse collapsed={collapsed} onToggle={toggle} />");
    expect(appShellSrc.match(/<RailCollapse /g)?.length).toBe(1);
    // The foot follows the rows (after the scroll body), never the band.
    expect(appShellSrc.indexOf("data-app-rail-body")).toBeLessThan(appShellSrc.indexOf("data-app-rail-foot"));
    expect(appShellSrc.indexOf("<RailBrand")).toBeLessThan(appShellSrc.indexOf("data-app-rail-body"));
    expect(HOUSE_RAIL_FOOT_CLASS).toBe("flex shrink-0 px-[var(--space-6)] pb-[var(--space-6)] pt-[var(--space-2)]");
    expect(HOUSE_RAIL_FOOT_COLLAPSED_CLASS).toBe("flex shrink-0 justify-center pb-[var(--space-6)] pt-[var(--space-2)]");
    // RailCollapse renders a bare <button> in both states, so the same
    // DOM node carries focus from "Collapse sidebar" to "Expand sidebar".
    for (const state of [false, true]) {
      expect(renderToStaticMarkup(<RailCollapse collapsed={state} onToggle={() => {}} />)).toMatch(/^<button /);
    }
  });

  it("paints rows with no icon tiles and exactly one current row per path — the wash, filled glyph", () => {
    for (const [path, workspace, label, opts] of [
      ["/home", "aggregation", "Home", { homeOwned: true }],
      ["/home/news", "aggregation", "Industry news", { homeOwned: true }],
      ["/aggregation/titles", "aggregation", "Titles", {}],
      ["/social", "social", "Feed", {}],
      ["/social/u/ada", "social", "Profile", {}],
      ["/social/live", "social", "Create", {}],
      ["/education/manage", "education", "Manage courses", { isGcStaff: true }],
      ["/staff/queue", "staff", "Queue", { isGcStaff: true }],
    ] as const) {
      const html = render(path, workspace, opts);
      expect(activeGlyphs(html), path).toBe(1);
      const row = rowWith(html, label);
      expect(row, path).toContain(`${HOUSE_DEST_RAIL_ROW_CLASS} ${HOUSE_DEST_RAIL_ACTIVE_CLASS}`);
      expect(row, path).toContain('aria-current="page"');
      expect(html.match(/aria-current="page"/g)?.length, path).toBe(1);
      expect(html.match(/bg-accent-wash/g)?.length, path).toBe(1);
      // No accent fill anywhere: Create is an ordinary row.
      expect(html, path).not.toMatch(ACCENT_FILL);
    }
    const idle = render("/aggregation/titles", "aggregation");
    expect(idle.match(new RegExp(`${HOUSE_DEST_RAIL_ROW_CLASS} ${HOUSE_DEST_RAIL_IDLE_CLASS}`.replace(/[[\]().*+?^$|]/g, "\\$&"), "g"))?.length).toBe(3);
    expect(idle.match(new RegExp(HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS.replace(/[[\]().*+?^$|]/g, "\\$&"), "g"))?.length).toBe(4);
  });

  it("makes Social's Create an ordinary row — no tile, no accent, collapsed or not", () => {
    for (const collapsed of [false, true]) {
      const html = render("/social", "social", { collapsed });
      expect(html).not.toContain("data-side-nav-create-tile");
      expect(html).not.toMatch(ACCENT_FILL);
      const create = html.slice(html.indexOf('data-social-create-compose="dest"'));
      const button = html.slice(html.lastIndexOf("<button", html.indexOf('data-social-create-compose="dest"')), html.indexOf("</button>", html.indexOf('data-social-create-compose="dest"')));
      expect(create.length).toBeGreaterThan(0);
      expect(button).toContain(collapsed ? HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS : HOUSE_DEST_RAIL_ROW_CLASS);
      expect(button).toContain(HOUSE_DEST_RAIL_IDLE_CLASS);
      // It opens the composer window (a dialog), not a chooser.
      expect(button).toContain('aria-haspopup="dialog"');
      expect(button).toContain('aria-expanded="false"');
    }
    const agg = render("/aggregation/dashboard", "aggregation");
    expect(agg).not.toMatch(ACCENT_FILL);
    expect(agg).not.toContain("data-side-nav-create-tile");
  });

  it("dots Messages when DMs are unread — 8 accent, count in the accessible name; nothing at zero", () => {
    const idle = render("/social", "social");
    expect(idle).not.toContain("data-side-nav-unread");
    expect(idle).not.toContain("unread");
    const html = render("/social", "social", { messagesUnread: 2 });
    expect(html.match(/data-side-nav-unread=""/g)?.length).toBe(1);
    const messages = rowWith(html, "Messages");
    expect(messages).toContain('aria-label="Messages, 2 unread"');
    expect(messages).toContain(`<span aria-hidden="true" data-side-nav-unread="" class="${HOUSE_DEST_RAIL_UNREAD_DOT_CLASS}"></span>`);
    const collapsed = render("/social", "social", { messagesUnread: 1, collapsed: true });
    expect(collapsed).toContain('aria-label="Messages, 1 unread"');
    expect(collapsed).toContain(`class="${HOUSE_DEST_RAIL_UNREAD_DOT_COLLAPSED_CLASS}"`);
    // Only Social shows it; other rails have no Messages row.
    expect(render("/aggregation/dashboard", "aggregation", { messagesUnread: 3 })).not.toContain("data-side-nav-unread");
  });

  it("splits the Education staff rows with a hairline and the Team eyebrow (a short rule when collapsed)", () => {
    const html = render("/education/manage", "education", { isGcStaff: true });
    expect(html).toContain(`<div aria-hidden="true" class="${HOUSE_DEST_RAIL_DIVIDER_CLASS}"></div>`);
    expect(html).toContain(`<span data-side-nav-section-eyebrow="" class="${HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS}">${STAFF_RAIL_EYEBROW}</span>`);
    expect(html.indexOf(HOUSE_DEST_RAIL_DIVIDER_CLASS)).toBeLessThan(html.indexOf("data-side-nav-section-eyebrow"));
    const collapsed = render("/education/manage", "education", { isGcStaff: true, collapsed: true });
    expect(collapsed).toContain(`<div aria-hidden="true" class="${HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS}"></div>`);
    expect(collapsed).not.toContain("data-side-nav-section-eyebrow");
    expect(render("/education", "education")).not.toContain(HOUSE_DEST_RAIL_DIVIDER_CLASS);
  });

  it("builds the Home rail from Home's own dests and Social's from Feed · Explore · Create · Messages · Profile", () => {
    expect(rowLabels(render("/home", "aggregation", { homeOwned: true }))).toEqual(["Home", "Industry news"]);
    expect(rowLabels(render("/social", "social"))).toEqual([
      "Feed",
      "Explore",
      "Create",
      "Messages",
      "Profile",
    ]);
    expect(rowLabels(render("/aggregation/dashboard", "aggregation"))).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(render("/social", "social")).toContain(`class="${HOUSE_DEST_RAIL_LABEL_CLASS}"`);
  });
});
