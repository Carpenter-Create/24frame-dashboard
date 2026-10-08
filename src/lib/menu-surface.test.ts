import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  MENU_SURFACE_ACCENT_CLASS,
  MENU_SURFACE_ACCENT_CLIP_CLASS,
  MENU_SURFACE_CONTENT_CLASS,
  MENU_SURFACE_CONTENT_PANEL_CLASS,
  MENU_SURFACE_CONTENT_SPARSE_CLASS,
  MENU_SURFACE_ITEM_CLASS,
  MENU_SURFACE_ITEM_DANGER_CLASS,
  MENU_SURFACE_SEPARATOR_CLASS,
  MENU_SURFACE_SPARSE_ITEM_MAX,
  countMenuSurfaceItems,
  menuSurfaceContentClass,
  menuSurfaceDensityForCount,
} from "./menu-surface";

const here = dirname(fileURLToPath(import.meta.url));

describe("menu surface chrome lock", () => {
  it("keeps one content / item / separator register", () => {
    expect(MENU_SURFACE_CONTENT_CLASS).toBe(
      "rounded-[12px] border border-hairline bg-surface p-[var(--space-2)] shadow-none",
    );
    expect(MENU_SURFACE_CONTENT_CLASS).not.toContain("17.5rem");
    expect(MENU_SURFACE_ITEM_CLASS).toBe(
      "min-h-[44px] rounded-[var(--radius-sm)] px-[var(--space-3)] py-[var(--space-2)] t-body-sm text-ink-2",
    );
    expect(MENU_SURFACE_SEPARATOR_CLASS).toBe("my-[var(--space-2)]");
    expect(MENU_SURFACE_ITEM_DANGER_CLASS).toBe(
      "text-[#c4564a] data-[highlighted]:text-[#c4564a]",
    );
    expect(MENU_SURFACE_ITEM_DANGER_CLASS).not.toContain("font-bold");
    expect(MENU_SURFACE_ITEM_DANGER_CLASS).not.toContain("bg-");
  });

  it("hugs ≤2 overflow items and keeps the 17.5rem panel for multi-item menus", () => {
    expect(MENU_SURFACE_SPARSE_ITEM_MAX).toBe(2);
    expect(menuSurfaceDensityForCount(1)).toBe("sparse");
    expect(menuSurfaceDensityForCount(2)).toBe("sparse");
    expect(menuSurfaceDensityForCount(3)).toBe("panel");
    expect(MENU_SURFACE_CONTENT_SPARSE_CLASS).toBe("w-max min-w-max");
    expect(MENU_SURFACE_CONTENT_SPARSE_CLASS).not.toContain("17.5rem");
    expect(MENU_SURFACE_CONTENT_PANEL_CLASS).toBe("min-w-[17.5rem]");
    expect(menuSurfaceContentClass("sparse")).toContain(MENU_SURFACE_CONTENT_SPARSE_CLASS);
    expect(menuSurfaceContentClass("sparse")).not.toContain("17.5rem");
    expect(menuSurfaceContentClass("panel")).toContain(MENU_SURFACE_CONTENT_PANEL_CLASS);
    expect(
      countMenuSurfaceItems([
        { props: {} },
        { props: { "data-menu-surface-separator": "" } },
        { props: { "data-thread-popover-hairline": "" } },
        { props: { "data-title-lifecycle-delete": "" } },
      ]),
    ).toBe(2);
  });

  it("locks the Identity half-bar to left-origin 50% 4px Sporty Blue with no track", () => {
    expect(MENU_SURFACE_ACCENT_CLASS).toBe(
      "pointer-events-none absolute left-0 top-0 h-[4px] w-1/2 bg-accent",
    );
    expect(MENU_SURFACE_ACCENT_CLASS).not.toContain("w-full");
    expect(MENU_SURFACE_ACCENT_CLASS).not.toContain("bg-hairline");
    expect(MENU_SURFACE_ACCENT_CLASS).not.toContain("bg-surface-muted");
    expect(MENU_SURFACE_ACCENT_CLASS).not.toContain("#1769");
    expect(MENU_SURFACE_ACCENT_CLIP_CLASS).toContain("overflow-hidden");
    expect(MENU_SURFACE_ACCENT_CLIP_CLASS).not.toContain("bg-");
  });

  it("does not put the half-bar on / or any dashboard card", () => {
    const dashboard = readFileSync(
      join(here, "../components/dashboard/dashboard-home.tsx"),
      "utf8",
    );
    const page = readFileSync(join(here, "../app/(app)/aggregation/dashboard/page.tsx"), "utf8");
    const card = readFileSync(join(here, "../components/ui/card.tsx"), "utf8");
    expect(dashboard).not.toContain("MENU_SURFACE_ACCENT");
    expect(dashboard).not.toContain("data-menu-surface-accent");
    expect(dashboard).not.toContain("MenuSurfaceAccent");
    expect(page).not.toContain("MENU_SURFACE_ACCENT");
    expect(page).not.toContain("data-menu-surface-accent");
    expect(page).not.toContain("MenuSurfaceAccent");
    expect(card).not.toContain("MENU_SURFACE_ACCENT");
    expect(card).not.toContain("data-menu-surface-accent");
    expect(card).not.toContain("h-[4px] w-1/2");
  });

  it("forbids a forked THREAD_POPOVER_* surface lookalike", () => {
    const houseSheet = readFileSync(join(here, "house-sheet.ts"), "utf8");
    const house = readFileSync(join(here, "../components/chrome/house.tsx"), "utf8");
    const header = readFileSync(
      join(here, "../components/chrome/messages-app-header.tsx"),
      "utf8",
    );
    const userMenu = readFileSync(join(here, "../components/chrome/user-menu.tsx"), "utf8");

    expect(houseSheet).not.toContain("THREAD_POPOVER_CONTENT_CLASS");
    expect(houseSheet).not.toContain("THREAD_POPOVER_ITEM_CLASS");
    expect(houseSheet).not.toContain("THREAD_POPOVER_DELETE_CLASS");
    expect(houseSheet).not.toContain("rounded-[12px]");
    expect(houseSheet).not.toContain("min-w-[17.5rem]");
    expect(house).not.toContain("THREAD_POPOVER_CONTENT_CLASS");
    expect(house).not.toContain("DropdownMenuPrimitive");
    expect(header).not.toContain("min-w-[17.5rem]");
    expect(header).not.toContain("USER_MENU_ITEM_CLASS");
    expect(userMenu).not.toContain("min-w-[17.5rem]");
    expect(userMenu).not.toContain("USER_MENU_ITEM_CLASS");
    expect(userMenu).not.toContain("USER_MENU_RULE_CLASS");
  });

  // The menu moves focus to the row under the pointer, so the house ring
  // would follow the mouse (and its 4 radius would square the 12 panel).
  // Menus mark the active row with the highlight wash instead. Radio and
  // checkbox rows (the Go live camera picker) are rows too (Bugbot #791).
  it("keeps the house focus ring off menu rows and the panel, and the panel's own radius", () => {
    const globals = readFileSync("src/app/globals.css", "utf8");
    const menuFocus = globals.slice(globals.indexOf("[data-radix-menu-content]:focus-visible,"));
    expect(menuFocus).toMatch(
      /^\[data-radix-menu-content\]:focus-visible,\s*\[data-radix-menu-content\] \[role="menuitem"\]:focus-visible,\s*\[data-radix-menu-content\] \[role="menuitemradio"\]:focus-visible,\s*\[data-radix-menu-content\] \[role="menuitemcheckbox"\]:focus-visible \{\s*outline: none;\s*border-radius: revert-layer;\s*\}/,
    );
    expect(globals.indexOf("[data-radix-menu-content]:focus-visible")).toBeGreaterThan(
      globals.indexOf(":focus-visible:not(input)"),
    );
    expect(MENU_SURFACE_ITEM_CLASS).toContain("rounded-[var(--radius-sm)]");
    expect(MENU_SURFACE_CONTENT_CLASS).toContain("rounded-[12px]");
  });
});
