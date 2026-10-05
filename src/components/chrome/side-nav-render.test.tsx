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

import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_COLLAPSED_RULE_CLASS,
  HOUSE_DEST_RAIL_CREATE_GLYPH_CLASS,
  HOUSE_DEST_RAIL_CREATE_GLYPH_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_CREATE_TILE_CLASS,
  HOUSE_DEST_RAIL_CREATE_TILE_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_CLASS,
  HOUSE_DEST_RAIL_DIVIDER_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_LABEL_CLASS,
  HOUSE_DEST_RAIL_ROW_CLASS,
  HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS,
  HOUSE_DEST_RAIL_SECTION_EYEBROW_CLASS,
  HOUSE_DEST_RAIL_TOP_ROW_CLASS,
  HOUSE_DEST_RAIL_TOP_ROW_COLLAPSED_CLASS,
} from "@/lib/house-shell";
import { STAFF_RAIL_EYEBROW } from "@/lib/nav";
import type { WorkspaceMode } from "@/lib/workspace";
import { RailCollapse } from "./rail-collapse";
import { SideNav } from "./side-nav";

function render(
  pathname: string,
  workspace: WorkspaceMode,
  opts: { collapsed?: boolean; isGcStaff?: boolean; homeOwned?: boolean; control?: boolean; rail?: boolean } = {},
): string {
  navigation.pathname = pathname;
  const control = opts.rail ? (
    <RailCollapse collapsed={opts.collapsed ?? false} onToggle={() => {}} />
  ) : opts.control ? (
    <button type="button" data-probe-collapse="" />
  ) : undefined;
  try {
    return renderToStaticMarkup(
      <SideNav
        workspace={workspace}
        collapsed={opts.collapsed}
        isGcStaff={opts.isGcStaff}
        homeOwned={opts.homeOwned}
        collapseControl={control}
      />,
    );
  } finally {
    navigation.pathname = "/";
  }
}

/** The nav's first child, up to its closing tag (the top row holds no nested div). */
function navFirstChild(html: string): string {
  const open = html.indexOf(">", html.indexOf("<nav ")) + 1;
  return html.slice(open, html.indexOf("</div>", open) + "</div>".length);
}

/** Social's Create tile span and the class of the plus inside it. */
function createTile(html: string): { tile: string; glyph: string } {
  const tile = /<span data-side-nav-icon=""[^>]*data-side-nav-create-tile=""[^>]*class="([^"]*)"/.exec(html);
  const after = html.slice(tile?.index ?? 0);
  const glyph = /<svg[^>]*class="([^"]*)"/.exec(after);
  return { tile: tile?.[1] ?? "", glyph: glyph?.[1] ?? "" };
}

function activeGlyphs(html: string): number {
  return (html.match(/data-side-nav-icon-active=""/g) ?? []).length;
}

function rowLabels(html: string): string[] {
  return [...html.matchAll(/<span data-side-nav-label="" class="[^"]*">([^<]+)<\/span>/g)].map(
    (row) => row[1] ?? "",
  );
}

describe("SideNav — one rail pattern on every workspace (screening chrome)", () => {
  it("leads with the workspace eyebrow and the collapse control in one row, expanded only", () => {
    for (const [path, workspace, eyebrow, opts] of [
      ["/home", "aggregation", "Home", { homeOwned: true }],
      ["/aggregation/dashboard", "aggregation", "Aggregation", {}],
      ["/social", "social", "Social", {}],
      ["/education", "education", "Education", {}],
      ["/staff/queue", "staff", "Staff", { isGcStaff: true }],
    ] as const) {
      const html = render(path, workspace, { ...opts, control: true });
      const nav = html.slice(0, html.indexOf("<a "));
      expect(nav, path).toContain(`data-side-nav-eyebrow="" class="${HOUSE_DEST_RAIL_EYEBROW_CLASS}">${eyebrow}<`);
      // Eyebrow, then the collapse control, inside the one top row.
      const top = nav.slice(nav.indexOf("data-side-nav-top"));
      expect(top.indexOf("data-side-nav-eyebrow"), path).toBeLessThan(top.indexOf("data-probe-collapse"));
      const collapsed = render(path, workspace, { ...opts, collapsed: true, control: true });
      expect(collapsed, path).not.toContain("data-side-nav-eyebrow");
      expect(collapsed, path).toContain("data-side-nav-collapsed");
      expect(collapsed, path).toContain(
        `<span aria-hidden="true" data-side-nav-rule="" class="${HOUSE_DEST_RAIL_COLLAPSED_RULE_CLASS}"></span>`,
      );
      expect(html, path).not.toContain("data-side-nav-rule");
      expect(collapsed.indexOf("data-probe-collapse"), path).toBeLessThan(collapsed.indexOf("data-side-nav-rule"));
      expect(collapsed, path).toContain(HOUSE_DEST_RAIL_ROW_COLLAPSED_CLASS);
      expect(collapsed, path).not.toContain("data-side-nav-label");
    }
  });

  // Review fix (focus): the collapse control must sit in the same element,
  // in the same slot, in both states. A different parent type (a Fragment
  // collapsed, a div expanded) made React unmount the focused button on
  // Enter, dropping keyboard focus to <body>.
  it("keeps the one collapse button in the same top-row slot in both states, so focus survives the toggle", () => {
    for (const [path, workspace, opts] of [
      ["/home", "aggregation", { homeOwned: true }],
      ["/aggregation/dashboard", "aggregation", {}],
      ["/social", "social", {}],
      ["/education", "education", {}],
      ["/staff/queue", "staff", { isGcStaff: true }],
    ] as const) {
      const expanded = render(path, workspace, { ...opts, rail: true });
      const collapsed = render(path, workspace, { ...opts, rail: true, collapsed: true });
      const top = navFirstChild(expanded);
      const topCollapsed = navFirstChild(collapsed);
      const topOpen = `<div data-side-nav-top="" class="${HOUSE_DEST_RAIL_TOP_ROW_CLASS}"><span data-side-nav-eyebrow=""`;
      const topCollapsedOpen = `<div data-side-nav-top="" class="${HOUSE_DEST_RAIL_TOP_ROW_COLLAPSED_CLASS}"><button `;
      expect(top.slice(0, topOpen.length), path).toBe(topOpen);
      expect(topCollapsed.slice(0, topCollapsedOpen.length), path).toBe(topCollapsedOpen);
      for (const row of [top, topCollapsed]) {
        // The button is the row's last child in both states (the eyebrow
        // slot before it is empty when collapsed), and the only control.
        expect(row, path).toMatch(/<button [^>]*data-rail-collapse="chevron"[^>]*>(?:(?!<button).)*<\/button><\/div>$/);
        expect(row.match(/<button /g)?.length, path).toBe(1);
      }
      // The 24×1 rule follows the row, outside it.
      expect(collapsed.slice(collapsed.indexOf(topCollapsed) + topCollapsed.length), path).toMatch(
        /^<span aria-hidden="true" data-side-nav-rule=""/,
      );
    }
    // RailCollapse renders a bare <button> in both states, so the same
    // DOM node carries focus from "Collapse sidebar" to "Expand sidebar".
    for (const state of [false, true]) {
      expect(renderToStaticMarkup(<RailCollapse collapsed={state} onToggle={() => {}} />)).toMatch(/^<button /);
    }
  });

  it("paints rows with no icon tiles and exactly one current row per path", () => {
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
      const activeAt = html.indexOf('data-side-nav-icon-active=""');
      const rowStart = Math.max(html.lastIndexOf("<a ", activeAt), html.lastIndexOf("<button", activeAt));
      const row = html.slice(rowStart, html.indexOf(label === "Create" ? "</button>" : "</a>", activeAt));
      expect(row, path).toContain(`${HOUSE_DEST_RAIL_ROW_CLASS} ${HOUSE_DEST_RAIL_ACTIVE_CLASS}`);
      expect(row, path).toContain(`>${label}<`);
      expect(row, path).toContain('aria-current="page"');
      expect(html.match(/aria-current="page"/g)?.length, path).toBe(1);
      // No accent anywhere on the rows except Social's Create tile.
      const withoutCreate = html.replace(/<span data-side-nav-icon=""[^>]*data-side-nav-create-tile=""[^>]*>/g, "");
      expect(withoutCreate, path).not.toContain("bg-accent");
    }
    const idle = render("/aggregation/titles", "aggregation");
    expect(idle.match(new RegExp(`${HOUSE_DEST_RAIL_ROW_CLASS} ${HOUSE_DEST_RAIL_IDLE_CLASS}`.replace(/[[\]().*+?^$|]/g, "\\$&"), "g"))?.length).toBe(3);
    expect(idle.match(new RegExp(HOUSE_DEST_RAIL_GLYPH_SLOT_CLASS.replace(/[[\]().*+?^$|]/g, "\\$&"), "g"))?.length).toBe(4);
  });

  it("keeps Social's Create the menu's only accent — a small tile with a plus", () => {
    const html = render("/social", "social");
    expect(html.match(/data-side-nav-create-tile=""/g)?.length).toBe(1);
    expect(html).toContain(HOUSE_DEST_RAIL_CREATE_TILE_CLASS);
    expect(html.match(/bg-accent/g)?.length).toBe(1);
    // Expanded: the 22 tile with the 14 plus. Collapsed: the 26 tile with
    // the 15 plus (lock §2 / G3) — never the other size.
    expect(createTile(html)).toEqual({
      tile: HOUSE_DEST_RAIL_CREATE_TILE_CLASS,
      glyph: HOUSE_DEST_RAIL_CREATE_GLYPH_CLASS,
    });
    const collapsed = render("/social", "social", { collapsed: true });
    expect(collapsed.match(/data-side-nav-create-tile=""/g)?.length).toBe(1);
    expect(createTile(collapsed)).toEqual({
      tile: HOUSE_DEST_RAIL_CREATE_TILE_COLLAPSED_CLASS,
      glyph: HOUSE_DEST_RAIL_CREATE_GLYPH_COLLAPSED_CLASS,
    });
    expect(collapsed.match(/bg-accent/g)?.length).toBe(1);
    expect(createTile(render("/social/live", "social", { collapsed: true })).tile).toBe(
      HOUSE_DEST_RAIL_CREATE_TILE_COLLAPSED_CLASS,
    );
    const agg = render("/aggregation/dashboard", "aggregation");
    expect(agg).not.toContain("bg-accent");
    expect(agg).not.toContain("data-side-nav-create-tile");
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
