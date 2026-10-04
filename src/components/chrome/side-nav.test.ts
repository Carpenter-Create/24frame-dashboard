import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  HOUSE_DEST_RAIL_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_IDLE_CLASS,
  HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS,
  HOUSE_DEST_RAIL_TILE_CLASS,
  HOUSE_DEST_RAIL_TILE_IDLE_CLASS,
  HOUSE_RAIL_ACTIVE_CLASS,
  HOUSE_RAIL_IDLE_CLASS,
  HOUSE_RAIL_ITEM_CLASS,
  HOUSE_RAIL_LABEL_CLASS,
  HOUSE_RAIL_TITLE_CLASS,
} from "@/lib/house-shell";
import { NAV } from "@/lib/nav";

const navSrc = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "side-nav.tsx"), "utf8");

describe("SideNav Access rail", () => {
  it("keeps the locked client destinations", () => {
    expect(NAV.map((item) => item.label)).toEqual([
      "Dashboard",
      "Titles",
      "Recent activity",
      "Reports",
    ]);
    expect(NAV.map((item) => item.label)).not.toContain("Activity");
    expect(NAV.map((item) => item.label)).not.toContain("Ask 24Frame AI");
    expect(NAV.map((item) => item.href)).toEqual([
      "/aggregation/dashboard",
      "/aggregation/titles",
      "/aggregation/attention",
      "/aggregation/reports",
    ]);
    expect(NAV.map((item) => item.href)).not.toContain("/activity");
    expect(NAV.map((item) => item.href)).not.toContain("/aggregation/activity");
    expect(NAV.map((item) => item.href)).not.toContain("?ai=1");
    expect(navSrc).not.toContain("AskAiOpenButton");
    expect(navSrc).not.toContain("data-side-nav-ask-ai");
    expect(navSrc).not.toContain("isHouseAiNavItem");
  });

  it("uses house --text-base / t-body labels, 16px Phosphor Bold/Fill in a 28 tile, and a 4px row gap", () => {
    const tokens = readFileSync("src/app/tokens.css", "utf8");
    const globals = readFileSync("src/app/globals.css", "utf8");
    expect(navSrc).toContain("HOUSE_RAIL_ITEM_CLASS");
    expect(navSrc).toContain("house --text-base / t-body labels");
    expect(tokens).toMatch(/--text-base:\s*1\.0625rem;/);
    expect(globals).toMatch(/\.t-body\s*\{[\s\S]*?font-size:\s*var\(--text-base\)/);
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("t-body leading-6");
    expect(HOUSE_RAIL_ITEM_CLASS).not.toContain("t-body-sm");
    expect(HOUSE_RAIL_ITEM_CLASS).not.toContain("text-[0.875rem]");
    expect(HOUSE_RAIL_ITEM_CLASS).toMatch(/(?:^|[\s"])t-body(?:[\s"]|$)/);
    expect(navSrc).not.toContain("text-[0.875rem]");
    expect(navSrc).toContain("<NavGlyph item={item} active={active} />");
    expect(navSrc).toContain("16px Phosphor Bold idle");
    expect(navSrc).not.toContain("16px Lucide at 1.33");
    expect(navSrc).not.toContain("NavMark");
    expect(navSrc).not.toContain("markSrc");
    expect(navSrc).not.toContain("ask-globee-16.png");
    expect(navSrc).not.toContain("size-6");
    expect(navSrc).toContain('cn("flex flex-col gap-1", collapsed ? "px-1" : "px-2")');
    expect(navSrc).toContain('collapsed ? "justify-center px-0 py-1" : "gap-3 py-1 pl-2 pr-3"');
    expect(navSrc).not.toContain('collapsed ? "px-1.5" : "px-3"');
    expect(navSrc).not.toContain("gap-2.5 px-3");
    expect(navSrc).not.toContain("gap-2.5");
    expect(navSrc).toContain("STAFF_RAIL_EYEBROW");
    expect(navSrc).toContain("aria-label={item.ariaLabel ?? (collapsed ? item.label : undefined)}");
    expect(navSrc).not.toContain("PRODUCT_NAME");
    expect(navSrc).not.toContain("strokeWidth={1.5}");
    expect(navSrc).not.toContain("strokeWidth={1.33}");
  });

  it("turns Social viewport prefetch on and keeps Aggregation hover-only", () => {
    expect(navSrc).toContain("prefetch={social}");
    expect(navSrc).toContain("Aggregation: VIEWPORT prefetch off, HOVER prefetch on");
    expect(navSrc).toContain("Social: VIEWPORT prefetch on");
    expect(navSrc).toContain("same five");
    expect(navSrc).toContain("SocialCreateSheet");
    expect(navSrc).toContain("isSocialCreateDest");
    expect(navSrc).toContain('data-social-create-sheet="dest"');
    expect(navSrc).toContain("useSocialNavPending");
    expect(navSrc).toContain("SocialNavPendingProbe");
    expect(navSrc).toContain("data-social-rail-pending");
    expect(navSrc).not.toContain("prefetch={false}");
    expect(navSrc).not.toContain("four destinations");
  });

  it("keeps Social Create as a quiet dest row with the shared icon tile", () => {
    expect(navSrc).toContain("HOUSE_DEST_RAIL_TILE_CLASS");
    expect(navSrc).not.toContain("HOUSE_RAIL_ICON_CLASS");
    expect(navSrc).not.toContain("SocialIcon");
    expect(navSrc).toContain("HOUSE_RAIL_LABEL_CLASS");
    expect(navSrc).toContain("data-side-nav-icon");
    expect(navSrc).toContain("className={rowClass}");
    expect(navSrc).toContain('data-social-create-sheet="dest"');
    expect(navSrc).not.toContain("bg-accent ");
    expect(navSrc).not.toContain("bg-accent\"");
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("inline-flex");
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("w-full");
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("text-left");
    expect(HOUSE_RAIL_ITEM_CLASS).not.toMatch(/(?:^|[\s"])bg-accent(?:[\s"]|$)/);
    expect(HOUSE_RAIL_LABEL_CLASS).toBe("min-w-0 flex-1 truncate text-left");
    expect(HOUSE_RAIL_ACTIVE_CLASS).toBe("bg-accent-wash text-accent-ink");
  });

  it("marks the active row with a muted wash, ink label, and an accent tile (Adam 2026-10-04)", () => {
    expect(navSrc).toContain("HOUSE_DEST_RAIL_ACTIVE_CLASS");
    expect(navSrc).toContain("HOUSE_DEST_RAIL_IDLE_CLASS");
    expect(navSrc).toContain("HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS");
    expect(navSrc).toContain("HOUSE_DEST_RAIL_TILE_IDLE_CLASS");
    expect(navSrc).toContain("houseRailActiveIndex");
    expect(navSrc).not.toContain("HOUSE_RAIL_ACTIVE_CLASS");
    expect(HOUSE_DEST_RAIL_TILE_CLASS).toBe(
      "flex size-7 shrink-0 items-center justify-center rounded-[var(--radius)]",
    );
    expect(HOUSE_DEST_RAIL_TILE_IDLE_CLASS).toBe("bg-surface-muted text-ink-2");
    expect(HOUSE_DEST_RAIL_TILE_ACTIVE_CLASS).toBe("bg-accent text-accent-contrast");
    expect(HOUSE_DEST_RAIL_ACTIVE_CLASS).toBe("bg-surface-muted text-ink");
    expect(HOUSE_DEST_RAIL_IDLE_CLASS).toBe("text-ink-2 hover:bg-surface-muted");
    expect(HOUSE_DEST_RAIL_ACTIVE_CLASS).not.toMatch(/font-(?:normal|medium|semibold|bold)/);
    // Settings and the Education course rail keep the wash + accent-ink rows.
    expect(HOUSE_RAIL_ITEM_CLASS).toContain("rounded-full");
    expect(HOUSE_RAIL_ACTIVE_CLASS).toBe("bg-accent-wash text-accent-ink");
    expect(HOUSE_RAIL_ACTIVE_CLASS).not.toMatch(/font-(?:normal|medium|semibold|bold)/);
    expect(HOUSE_RAIL_IDLE_CLASS).toBe("text-ink hover:bg-surface-muted");
    expect(HOUSE_RAIL_IDLE_CLASS).not.toContain("font-normal");
    expect(navSrc).not.toContain("font-normal text-ink-2");
    expect(navSrc).not.toContain("bg-surface-muted font-medium text-ink");
    expect(navSrc).not.toContain('active ? "bg-surface text-ink"');
    expect(navSrc).not.toContain("BrandWordmark");
  });

  it("uses the shared HOUSE_RAIL_TITLE_CLASS for the workspace and staff eyebrows", () => {
    expect(navSrc).toContain("HOUSE_RAIL_TITLE_CLASS");
    expect(navSrc).toContain("className={HOUSE_RAIL_TITLE_CLASS}");
    expect(navSrc).toContain("data-side-nav-eyebrow");
    expect(navSrc).toContain("houseRailModel");
    expect(navSrc).not.toContain("Destinations");
    expect(navSrc).not.toContain("SOCIAL_RAIL.workspace");
    expect(HOUSE_RAIL_TITLE_CLASS).toBe("px-2 pb-1 t-label text-ink-3");
    expect(navSrc).not.toContain('"px-2 pb-1 t-label text-ink-3"');
  });
});
