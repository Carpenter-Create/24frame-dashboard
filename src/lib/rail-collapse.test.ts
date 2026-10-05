import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  RAIL_COLLAPSE_CHEVRON,
  RAIL_COLLAPSE_CHEVRON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_CLASS,
  RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT,
  RAIL_COLLAPSE_WIDTH_VAR,
  RAIL_EXPAND_CHEVRON_CLASS,
  RAIL_WIDTH_CLASS,
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
    // Screening chrome: 28 radius-6 collapse beside the eyebrow; 40×32
    // radius-10 expand atop the 64 column; quiet ink.
    expect(RAIL_COLLAPSE_CHEVRON_CLASS).toBe(
      "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-3 dark:text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink",
    );
    expect(RAIL_EXPAND_CHEVRON_CLASS).toBe(
      "flex h-8 w-10 shrink-0 items-center justify-center rounded-[var(--radius)] text-ink-3 dark:text-ink-2 transition-colors hover:bg-surface-muted hover:text-ink",
    );
    expect(RAIL_COLLAPSE_CHEVRON_CLASS).not.toContain("rounded-full");
    expect(RAIL_COLLAPSE_CHEVRON_ICON_CLASS).toBe("h-4 w-4");
    expect(RAIL_COLLAPSE_CHEVRON_ICON_WEIGHT).toBe("bold");
    expect(RAIL_EXPAND_CHEVRON_CLASS).not.toMatch(/border|hairline/);
    // The column is the whole slot: 200 / 64, no inset.
    expect(RAIL_WIDTH_CLASS).toBe("w-[var(--sidebar-width)]");
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
