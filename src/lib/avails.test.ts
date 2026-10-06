import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ACCOUNT_SHEET_ABSENT } from "@/lib/account-sheet";
import {
  AVAILS_EMPTY_CLASS,
  AVAILS_GRID_CLASS,
  AVAILS_HREF,
  AVAILS_PAGE,
  AVAILS_TILE_ART_CLASS,
  AVAILS_TILE_CLASS,
  AVAILS_TILE_TITLE_CLASS,
  availsTitleHref,
  toAvailsTile,
} from "@/lib/avails";
import { LIST_PAGE } from "@/lib/list-bounds";
import { GC_NAV, NAV, mobileNavDestinations, railDestinations } from "@/lib/nav";
import { SETTINGS_RAIL_ABSENT } from "@/lib/settings";
import {
  DELIVERY_STATUS_ROW_LABELS,
  GC_TITLE_STATUS_LABELS,
  TITLE_STATUS_LABELS,
  titleDisplayStatus,
} from "@/lib/titles";
import { TITLES_LANDSCAPE_ART_CLASS, TITLES_ROW_NAME_CLASS } from "@/lib/titles-catalog";
import { DELIVERY_STATUS_TRACK_STEPS, TITLE_STATUS_TRACK_STEPS } from "@/lib/status-progress";

describe("Avails staff surface", () => {
  it("is Team-nav only at /avails", () => {
    expect(AVAILS_PAGE.title).toBe("Avails");
    expect(AVAILS_HREF).toBe("/staff/avails");
    expect(GC_NAV.find((item) => item.href === AVAILS_HREF)?.label).toBe(AVAILS_PAGE.title);
    expect(NAV.map((item) => item.href)).not.toContain(AVAILS_HREF);
    expect(mobileNavDestinations(false).map((item) => item.href)).not.toContain(AVAILS_HREF);
    expect(railDestinations(false).staffItems).toEqual([]);
    expect(railDestinations(true).staffItems).toEqual([]);
    expect(railDestinations(true, "staff").items.map((item) => item.href)).toContain(AVAILS_HREF);
    expect(SETTINGS_RAIL_ABSENT).toContain(AVAILS_PAGE.title);
    expect(ACCOUNT_SHEET_ABSENT).toContain(AVAILS_PAGE.title);
  });

  it("keeps the avails-grid-3 body under the operator gate and does not invent a list or matrix", () => {
    expect(existsSync("src/app/(app)/(operator)/staff/avails/page.tsx")).toBe(true);
    expect(existsSync("src/app/(app)/avails/page.tsx")).toBe(false);
    const page = readFileSync("src/app/(app)/(operator)/staff/avails/page.tsx", "utf8");
    expect(page).toContain("AVAILS_PAGE.title");
    expect(page).toContain('eq("status", "live")');
    expect(page).toContain("AvailsGrid");
    expect(page).toContain("toAvailsTile");
    expect(page).not.toContain("TODO(design)");
    expect(page).not.toContain("status-progress-track");
    expect(page).not.toContain("StatusProgressTrack");
    expect(page).not.toContain("TitlesCatalogListRow");
    expect(page).not.toContain("BannerCard");
    expect(page).not.toContain("territory");
    expect(page).not.toContain("aspect-[2/3]");
    expect(page).not.toContain("grid-cols-2");
  });
});

describe("avails-grid-3 miss list", () => {
  it("G1: 3-wide desktop landscape tiles at house 16", () => {
    expect(AVAILS_GRID_CLASS).toContain("md:grid-cols-3");
    expect(AVAILS_GRID_CLASS).toContain("gap-[var(--space-4)]");
    expect(AVAILS_GRID_CLASS).not.toMatch(/gap-\[var\(--space-(1|3|5|7|10)\)\]/);
    expect(AVAILS_TILE_ART_CLASS).toContain("aspect-[16/9]");
    expect(AVAILS_TILE_ART_CLASS).not.toContain("aspect-[2/3]");
  });

  it("G2: shared Titles landscape art + quiet title", () => {
    expect(AVAILS_TILE_ART_CLASS).toContain(TITLES_LANDSCAPE_ART_CLASS);
    expect(AVAILS_TILE_TITLE_CLASS).toBe(TITLES_ROW_NAME_CLASS);
    expect(AVAILS_TILE_ART_CLASS).not.toContain("md:w-[160px]");
    const grid = readFileSync("src/components/avails/avails-grid.tsx", "utf8");
    expect(grid).toContain("TitlesLandscapeArt");
    expect(grid).toContain("@/components/titles/titles-catalog");
  });

  it("G3: phone 1-wide stack of the same tile", () => {
    expect(AVAILS_GRID_CLASS).toContain("grid-cols-1");
    expect(AVAILS_GRID_CLASS).not.toContain("grid-cols-2");
    expect(AVAILS_GRID_CLASS).not.toContain("sm:grid-cols");
    expect(AVAILS_TILE_CLASS).toContain("gap-[var(--space-2)]");
  });

  it("G4: no progress track · live only · Team staff · quiet empty", () => {
    const page = readFileSync("src/app/(app)/(operator)/staff/avails/page.tsx", "utf8");
    expect(page).toContain('eq("status", "live")');
    expect(page).not.toContain("StatusProgressTrack");
    expect(AVAILS_PAGE.empty).toBe("No Approved titles.");
    expect(AVAILS_EMPTY_CLASS).toContain("border-hairline");
    expect(AVAILS_PAGE.empty).not.toBe("Nothing waiting.");
    expect(AVAILS_PAGE.truncated(LIST_PAGE)).toContain(String(LIST_PAGE));
  });

  it("G5: HOUSE LAW — no Avails-only card fork", () => {
    const page = readFileSync("src/app/(app)/(operator)/staff/avails/page.tsx", "utf8");
    const grid = readFileSync("src/components/avails/avails-grid.tsx", "utf8");
    expect(page).not.toContain("BannerCard");
    expect(page).not.toContain("TitlesCatalogListRow");
    expect(page).not.toContain("territory");
    expect(grid).not.toContain("BannerCard");
    expect(grid).not.toContain("PosterCard");
    expect(grid).not.toContain("StatusProgressTrack");
    expect(grid).not.toContain("TitlesCatalogListRow");
    expect(AVAILS_TILE_ART_CLASS).toContain(TITLES_LANDSCAPE_ART_CLASS);
    expect(AVAILS_TILE_TITLE_CLASS).toBe(TITLES_ROW_NAME_CLASS);
  });
});

describe("Avails tile mapping", () => {
  it("maps live titles to staff detail with landscape stills only", () => {
    expect(availsTitleHref("title-1")).toBe("/staff/gc/titles/title-1");
    expect(toAvailsTile({ id: "t1", title: "Craft film" }, "https://cdn/banner.jpg")).toEqual({
      id: "t1",
      href: "/staff/gc/titles/t1",
      title: "Craft film",
      stillUrl: "https://cdn/banner.jpg",
    });
    expect(toAvailsTile({ id: "t2", title: "No art" }, null).stillUrl).toBeNull();
    expect(toAvailsTile({ id: "t3", title: "Poster only" }, "").stillUrl).toBeNull();
  });
});

describe("Approved label SoT", () => {
  it("uses Approved for title and delivery live keys without renaming the enum", () => {
    expect(GC_TITLE_STATUS_LABELS.live).toBe("Approved");
    expect(DELIVERY_STATUS_ROW_LABELS.live).toBe("Approved");
    expect(titleDisplayStatus("live", 2, 3)).toBe("Approved · 2 of 3 platforms");
    expect(TITLE_STATUS_TRACK_STEPS.at(-1)).toBe("Approved");
    expect(DELIVERY_STATUS_TRACK_STEPS.at(-1)).toBe("Approved");
    expect(Object.keys(TITLE_STATUS_LABELS)).toContain("live");
    expect(Object.keys(TITLE_STATUS_LABELS)).not.toContain("approved");
    expect(Object.keys(DELIVERY_STATUS_ROW_LABELS)).toContain("live");
    expect(Object.keys(DELIVERY_STATUS_ROW_LABELS)).not.toContain("approved");
  });
});
