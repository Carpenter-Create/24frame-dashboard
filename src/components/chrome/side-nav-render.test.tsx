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
  HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_TILE_CLASS,
  HOUSE_DEST_RAIL_TILE_IDLE_CLASS,
  HOUSE_RAIL_TITLE_CLASS,
} from "@/lib/house-shell";
import type { WorkspaceMode } from "@/lib/workspace";
import { SideNav } from "./side-nav";

function render(
  pathname: string,
  workspace: WorkspaceMode,
  opts: { collapsed?: boolean; isGcStaff?: boolean; homeOwned?: boolean } = {},
): string {
  navigation.pathname = pathname;
  try {
    return renderToStaticMarkup(
      <SideNav
        workspace={workspace}
        collapsed={opts.collapsed}
        isGcStaff={opts.isGcStaff}
        homeOwned={opts.homeOwned}
      />,
    );
  } finally {
    navigation.pathname = "/";
  }
}

function activeTiles(html: string): number {
  return (html.match(/data-side-nav-icon-active=""/g) ?? []).length;
}

function rowLabels(html: string): string[] {
  return [...html.matchAll(/<span class="min-w-0 flex-1 truncate text-left">([^<]+)<\/span>/g)].map(
    (row) => row[1] ?? "",
  );
}

describe("SideNav — one rail pattern on every workspace", () => {
  it("leads with the workspace eyebrow, expanded only", () => {
    for (const [path, workspace, eyebrow, opts] of [
      ["/home", "aggregation", "Home", { homeOwned: true }],
      ["/aggregation/dashboard", "aggregation", "Aggregation", {}],
      ["/social", "social", "Social", {}],
      ["/education", "education", "Education", {}],
      ["/staff/queue", "staff", "Staff", { isGcStaff: true }],
    ] as const) {
      const html = render(path, workspace, opts);
      const nav = html.slice(0, html.indexOf("<a "));
      expect(nav, path).toContain(`data-side-nav-eyebrow="" class="${HOUSE_RAIL_TITLE_CLASS}">${eyebrow}<`);
      const collapsed = render(path, workspace, { ...opts, collapsed: true });
      expect(collapsed, path).not.toContain("data-side-nav-eyebrow");
      expect(collapsed, path).toContain("px-1");
    }
  });

  it("paints [tile + label] rows with exactly one accent tile per path", () => {
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
      expect(activeTiles(html), path).toBe(1);
      const activeAt = html.indexOf('data-side-nav-icon-active=""');
      const rowStart = Math.max(html.lastIndexOf("<a ", activeAt), html.lastIndexOf("<button", activeAt));
      const row = html.slice(rowStart, html.indexOf(label === "Create" ? "</button>" : "</a>", activeAt));
      expect(row, path).toContain(HOUSE_DEST_RAIL_ACTIVE_CLASS);
      expect(row, path).toContain(`${HOUSE_DEST_RAIL_TILE_CLASS} ${HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS}`);
      expect(row, path).toContain(`>${label}<`);
      expect(row, path).toContain('aria-current="page"');
      expect(html.match(/aria-current="page"/g)?.length, path).toBe(1);
    }
    const idle = render("/aggregation/titles", "aggregation");
    expect(idle.match(new RegExp(HOUSE_DEST_RAIL_TILE_IDLE_CLASS, "g"))?.length).toBe(3);
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
  });
});
