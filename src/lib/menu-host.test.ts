import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { HOUSE_RAIL_COLUMN_CLASS } from "@/lib/house-shell";
import {
  HOUSE_PAGE_SELECT_OPTION_LABEL_CLASS,
  HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS,
} from "@/lib/house-page-select";
import { HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS } from "@/lib/house-lead-chrome";
import { IDENTITY_EMAIL_CLASS } from "@/lib/house-sheet";
import { SETTINGS_DRILL_ROW_CLASS } from "@/lib/settings";
import {
  MENU_DESKTOP_SOT,
  MENU_FAMILIES,
  MENU_FAMILY_LOCK,
  MENU_FAMILY_LOCK_DATE,
  MENU_GATED_SURFACES,
  MENU_HOST_DESKTOP_CLASS,
  MENU_HOST_DESKTOP_PANEL_CLASS,
  MENU_HOST_PHONE_CLASS,
  MENU_HOST_PHONE_SLOT_CLASS,
  MENU_PARKED_SURFACES,
  menuFamilyIds,
  menuHostClass,
  menuHostGateViolation,
  menuLabelTruncatesOnPhone,
  menuSourceHasGate,
  menuSourceMixesHosts,
  menuSurfaceViolations,
} from "@/lib/menu-host";

function walkSources(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) walkSources(path, acc);
    else if (/\.(ts|tsx)$/.test(name) && !name.includes(".test.")) acc.push(path);
  }
  return acc;
}

describe("menu family hard gate", () => {
  it("locks families A–D and the desktop SoT — no fifth family", () => {
    expect(MENU_FAMILY_LOCK).toBe("mobile-menu-family-tree-v1");
    expect(MENU_FAMILY_LOCK_DATE).toBe("2026-09-22");
    expect(menuFamilyIds()).toEqual(["A", "B", "C", "D"]);
    expect(MENU_FAMILIES.A.primitive).toBe("AppSheet+SheetGroup");
    expect(MENU_FAMILIES.B.primitive).toBe("SettingsHubList+SettingsDrillRow");
    expect(MENU_FAMILIES.C.primitive).toBe("HousePageSelect");
    expect(MENU_FAMILIES.D.primitive).toBe("MobileNav+AppSheet");
    expect(MENU_FAMILIES.D.mounted).toBe(false);
    expect(MENU_DESKTOP_SOT).toEqual(["MenuSurface", "dropdown", "rail"]);
    expect(menuHostClass("phone")).toBe(MENU_HOST_PHONE_CLASS);
    expect(menuHostClass("desktop")).toBe(MENU_HOST_DESKTOP_CLASS);
    expect(menuHostClass("desktop", "panel")).toBe(MENU_HOST_DESKTOP_PANEL_CLASS);
    expect(menuHostClass("phone", "slot")).toBe(MENU_HOST_PHONE_SLOT_CLASS);
    expect(MENU_HOST_PHONE_SLOT_CLASS).toBe(HOUSE_HEADER_TRAILING_PHONE_SLOT_CLASS);
    expect(menuHostClass("desktop", "slot")).toBe("hidden md:contents");
  });

  it("fails when a file mixes phone and desktop primitives without the gate", () => {
    const hybrid = `
      export function HybridMenu() {
        return (
          <>
            <SheetGroup />
            <MenuSurface />
          </>
        );
      }
    `;
    expect(menuSourceMixesHosts(hybrid)).toBe(true);
    expect(menuSourceHasGate(hybrid)).toBe(false);
    expect(menuHostGateViolation(hybrid)).toMatch(/without MenuDualHost or menuHostClass/);

    const gated = `
      export function GatedMenu() {
        return (
          <MenuDualHost
            phone={<SheetGroup />}
            desktop={<MenuSurface />}
          />
        );
      }
    `;
    expect(menuHostGateViolation(gated)).toBeNull();

    const classGated = `
      export function ClassGated() {
        return (
          <>
            <AccountSheet className={menuHostClass("phone")} />
            <AccountMenuDropdown className={menuHostClass("desktop")} />
          </>
        );
      }
    `;
    expect(menuHostGateViolation(classGated)).toBeNull();
  });

  it("keeps phone menu labels from truncating", () => {
    expect(menuLabelTruncatesOnPhone("min-w-0 truncate")).toBe(true);
    expect(menuLabelTruncatesOnPhone("max-md:truncate")).toBe(true);
    expect(menuLabelTruncatesOnPhone("md:truncate")).toBe(false);
    expect(menuLabelTruncatesOnPhone(HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS)).toBe(false);
    expect(HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS).toContain("break-words");
    expect(HOUSE_PAGE_SELECT_TRIGGER_LABEL_CLASS).toContain("md:truncate");
    expect(menuLabelTruncatesOnPhone(HOUSE_PAGE_SELECT_OPTION_LABEL_CLASS)).toBe(false);
    expect(menuLabelTruncatesOnPhone(SETTINGS_DRILL_ROW_CLASS)).toBe(false);
    expect(menuLabelTruncatesOnPhone(IDENTITY_EMAIL_CLASS)).toBe(false);
    expect(SETTINGS_DRILL_ROW_CLASS).not.toContain("divide-y");
    expect(SETTINGS_DRILL_ROW_CLASS).not.toContain("rounded-");
  });

  it("gates every absorbable surface and rejects mixed grammar", () => {
    for (const surface of MENU_GATED_SURFACES) {
      const source = readFileSync(surface.file, "utf8");
      expect(menuSurfaceViolations(surface, source), surface.id).toEqual([]);
    }
  });

  it("fails the registry when a gated surface drops the gate", () => {
    const surface = MENU_GATED_SURFACES.find((item) => item.id === "account-sheet");
    expect(surface).toBeDefined();
    const broken = readFileSync(surface!.file, "utf8").replaceAll("menuHostClass(", "menuHostLiteral(");
    expect(menuSurfaceViolations(surface!, broken).length).toBeGreaterThan(0);
  });

  it("scans sources and fails if an ungated file mixes hosts", () => {
    const parked = new Set(MENU_PARKED_SURFACES.map((item) => item.file));
    const gated = new Set(MENU_GATED_SURFACES.map((item) => item.file));
    const mixes = walkSources("src").filter((file) => {
      if (parked.has(file) || gated.has(file)) return false;
      return menuHostGateViolation(readFileSync(file, "utf8")) !== null;
    });
    expect(mixes).toEqual([]);
  });

  it("parks the miss-list and does not assign those files a family", () => {
    expect(MENU_PARKED_SURFACES.map((item) => item.id)).toEqual([
      "workspace-switcher",
      "activity-bell",
      "thread-overflow",
      "titles-overflow",
      "house-form-select",
      "social-odd-menus",
    ]);
    for (const surface of MENU_PARKED_SURFACES) {
      const source = readFileSync(surface.file, "utf8");
      expect(source, surface.id).not.toContain('data-menu-family="E"');
      expect(source, surface.id).not.toContain("<MenuDualHost");
      expect(surface.plan.length).toBeGreaterThan(0);
    }
  });

  it("keeps family D unmounted on AppSheet — hamburger stays off, dock is not a menu", () => {
    const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
    const dock = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
    const lead = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
    expect(shell).not.toContain("data-mobile-nav-sheet");
    expect(shell).not.toContain("data-mobile-nav-trigger");
    expect(dock).not.toContain("<SheetGroup");
    expect(dock).not.toContain("data-mobile-nav-sheet");
    expect(lead).toContain("No hamburger");
    expect(HOUSE_RAIL_COLUMN_CLASS).toContain("hidden");
    expect(HOUSE_RAIL_COLUMN_CLASS).toContain("md:flex");
  });
});
