import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  RAIL_COLLAPSE_CHEVRON,
  RAIL_COLLAPSE_CHEVRON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT,
  RAIL_COLLAPSE_WIDTH_VAR,
  RAIL_EXPAND_CHEVRON_CLASS,
  SIDEBAR_COLLAPSED_COOKIE,
  SIDEBAR_COLLAPSED_COOKIE_LEGACY,
  parseSidebarCollapsedCookie,
  readSidebarCollapsed,
  shouldMigrateSidebarCollapsedCookie,
  sidebarCollapsedCookieClearLegacy,
  sidebarCollapsedCookieWrite,
} from "./rail-collapse";

const src = readFileSync("src/lib/rail-collapse.ts", "utf8");

describe("rail-collapse tokens", () => {
  it("keeps house chevron names and measured values", () => {
    expect(RAIL_COLLAPSE_CHEVRON).toBe("chevron");
    // Coinbase register: one quiet 44 round transparent button at the
    // bottom of the side menu, a 20 « / » in ink-2, in both states.
    expect(RAIL_COLLAPSE_CHEVRON_CLASS).toBe(
      "flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink",
    );
    expect(RAIL_EXPAND_CHEVRON_CLASS).toBe(RAIL_COLLAPSE_CHEVRON_CLASS);
    expect(RAIL_COLLAPSE_CHEVRON_CLASS).not.toMatch(/(?:^|\s)bg-(?!surface-muted)/);
    expect(RAIL_COLLAPSE_CHEVRON_ICON_CLASS).toBe("size-5");
    expect(RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT).toBe("regular");
    expect(RAIL_EXPAND_CHEVRON_CLASS).not.toMatch(/border|hairline/);
    // The column is the whole slot: 240 / 80, no inset.
    expect(RAIL_COLLAPSE_WIDTH_VAR).toBe("var(--sidebar-width-collapsed)");
    expect(src).not.toMatch(/\brl-/);
    expect(src).not.toContain("RAIL_COLLAPSE_RL");
    expect(src).not.toMatch(/Royalogic/i);
    expect(src).not.toContain("social-sidebar-collapsed");
    expect(src).not.toContain("SOCIAL_RAIL_COLLAPSE");
  });
});

describe("sidebar collapsed cookie", () => {
  it("writes the house name and can read the legacy name once", () => {
    expect(SIDEBAR_COLLAPSED_COOKIE).toBe("24frame_sidebar_collapsed");
    expect(SIDEBAR_COLLAPSED_COOKIE_LEGACY).toBe("gc_sidebar_collapsed");
    expect(parseSidebarCollapsedCookie("1")).toBe(true);
    expect(parseSidebarCollapsedCookie("0")).toBe(false);
    expect(readSidebarCollapsed(() => undefined)).toBe(false);
    expect(readSidebarCollapsed((name) => (name === SIDEBAR_COLLAPSED_COOKIE ? "1" : undefined))).toBe(
      true,
    );
    expect(
      readSidebarCollapsed((name) => (name === SIDEBAR_COLLAPSED_COOKIE_LEGACY ? "1" : undefined)),
    ).toBe(true);
    expect(
      readSidebarCollapsed((name) =>
        name === SIDEBAR_COLLAPSED_COOKIE ? "0" : name === SIDEBAR_COLLAPSED_COOKIE_LEGACY ? "1" : undefined,
      ),
    ).toBe(false);
    expect(sidebarCollapsedCookieWrite(true)).toContain("24frame_sidebar_collapsed=1");
    expect(sidebarCollapsedCookieClearLegacy()).toContain("gc_sidebar_collapsed=");
    expect(sidebarCollapsedCookieClearLegacy()).toContain("max-age=0");
  });

  it("migrates only when the legacy cookie is present and the house cookie is not", () => {
    expect(shouldMigrateSidebarCollapsedCookie("gc_sidebar_collapsed=1")).toBe(true);
    expect(shouldMigrateSidebarCollapsedCookie("24frame_sidebar_collapsed=0")).toBe(false);
    expect(
      shouldMigrateSidebarCollapsedCookie("24frame_sidebar_collapsed=0; gc_sidebar_collapsed=1"),
    ).toBe(false);
    expect(shouldMigrateSidebarCollapsedCookie("")).toBe(false);
  });
});
