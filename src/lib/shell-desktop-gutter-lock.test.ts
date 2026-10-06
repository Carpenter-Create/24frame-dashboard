import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS,
  HOUSE_LEAD_PHONE_PAD_CLASS,
} from "@/lib/house-lead-chrome";
import {
  HOUSE_AGG_SHELL_COLUMN_CLASS,
  HOUSE_CANVAS_X_CLASS,
  HOUSE_HOME_RAIL_COLUMN_CLASS,
  HOUSE_PHONE_TRAILING_GUTTER_CLASS,
  HOUSE_RAIL_BRAND_BAND_CLASS,
  HOUSE_RAIL_COLUMN_CLASS,
  HOUSE_SHELL_GUTTER_X_CLASS,
} from "@/lib/house-shell";
import { RAIL_WIDTH_CLASS } from "@/lib/rail-collapse";
import {
  SOCIAL_DESKTOP_FRAME_PAD_CLASS,
  SOCIAL_HOME_LAYOUT_CLASS,
} from "@/lib/social-chrome";

// docs/design-locks/shell-desktop-horizontal-gutter-lock-v2.md
const tokens = readFileSync("src/app/tokens.css", "utf8");
const lead = readFileSync("src/lib/house-lead-chrome.ts", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");

describe("desktop shell horizontal gutters — lock v2", () => {
  it("G1–G2 locks the shared 32 / 32 pair and does not keep 44 or round to 48", () => {
    // The 32 / 32 token values are pinned once in src/app/tokens.test.ts.
    expect(tokens).not.toMatch(/--shell-gutter-inline-end:\s*44px;/);
    expect(tokens).not.toMatch(/--shell-gutter-inline-end:\s*48px;/);
    expect(tokens).not.toMatch(/--shell-gutter-inline-start:\s*16px;/);
    expect(HOUSE_SHELL_GUTTER_X_CLASS).toBe(
      "md:pl-[var(--shell-gutter-inline-start)] md:pr-[var(--shell-gutter-inline-end)]",
    );
  });

  // Coinbase register: the brand mark's ink stays at 32 (in the side
  // menu's band, or in the bar where a page has no side menu, which then
  // takes the 32 / 32 pair); the avatar's ink stays 32 from the right.
  // Beside a side menu the bar's lead pad is the board's 24.
  it("G4 wires one shell class on house lead chrome", () => {
    expect(lead).toContain("HOUSE_SHELL_GUTTER_X_CLASS");
    expect(HOUSE_LEAD_DESKTOP_BRAND_PAD_CLASS).toBe(HOUSE_SHELL_GUTTER_X_CLASS);
    expect(HOUSE_RAIL_BRAND_BAND_CLASS).toContain("pl-[var(--shell-gutter-inline-start)]");
    expect(HOUSE_LEAD_CHROME_CLASS).not.toContain("md:px-[var(--content-inset)]");
    expect(shell).toContain("<HouseLeadChrome");
  });

  it("G3 aligns shell-gutter columns to the same pair, trail flush to the avatar", () => {
    expect(HOUSE_HOME_RAIL_COLUMN_CLASS).toBe(
      "w-full md:ml-[var(--shell-gutter-inline-start)] md:mr-[var(--shell-gutter-inline-end)] md:w-[calc(100%-var(--shell-gutter-inline-start)-var(--shell-gutter-inline-end))]",
    );
    expect(HOUSE_HOME_RAIL_COLUMN_CLASS).not.toContain("--content-inset");
    expect(HOUSE_HOME_RAIL_COLUMN_CLASS).not.toContain("--chrome-gutter");
    expect(HOUSE_HOME_RAIL_COLUMN_CLASS).not.toContain("--access-rail-width");
    expect(shell).toContain("HOUSE_HOME_RAIL_COLUMN_CLASS");
    expect(HOUSE_AGG_SHELL_COLUMN_CLASS).toContain("md:pr-[var(--shell-gutter-inline-end)]");
    expect(HOUSE_AGG_SHELL_COLUMN_CLASS).toContain("max-md:px-[var(--chrome-gutter)]");
    expect(HOUSE_AGG_SHELL_COLUMN_CLASS).not.toContain("mx-auto");
    expect(HOUSE_AGG_SHELL_COLUMN_CLASS).not.toContain("page-max-width");
    expect(shell).toContain("HOUSE_AGG_SHELL_COLUMN_CLASS");
    expect(shell).toContain("aggregationCards");
    expect(SOCIAL_DESKTOP_FRAME_PAD_CLASS).not.toMatch(
      /(?:^|\s)md:px-\[var\(--chrome-gutter\)\]/,
    );
    expect(SOCIAL_HOME_LAYOUT_CLASS).toContain("lg:max-w-[1052px]");
    expect(readFileSync("src/app/(app)/social/stories/new/page.tsx", "utf8")).not.toContain(
      "SOCIAL_HOME_LAYOUT_CLASS",
    );
    expect(readFileSync("src/app/(app)/social/stories/new/page.tsx", "utf8")).not.toContain(
      "--shell-gutter",
    );
  });

  // Coinbase register: phone bar 16 lead / 12 trail (the board); desktop
  // keeps the 32 end gutter.
  it("G8 keeps phone on its own pads and drops desktop shell px-16", () => {
    expect(HOUSE_PHONE_TRAILING_GUTTER_CLASS).toBe("max-md:pr-[var(--space-3)]");
    expect(HOUSE_LEAD_PHONE_PAD_CLASS).toBe(
      "max-md:pl-[var(--chrome-gutter)] max-md:pr-[var(--space-3)]",
    );
    expect(HOUSE_LEAD_CHROME_CLASS).toContain(HOUSE_LEAD_PHONE_PAD_CLASS);
  });

  // Screening chrome: the side menu is a flush column (no gutter inset);
  // soft-nav and Settings content stay on --chrome-gutter.
  it("G6–G7 keeps the side menu flush and soft-nav and Settings off the shell gutters", () => {
    expect(HOUSE_RAIL_COLUMN_CLASS).not.toContain("--shell-gutter");
    expect(RAIL_WIDTH_CLASS).toBe("w-[var(--sidebar-width)]");
    expect(HOUSE_CANVAS_X_CLASS).toBe("px-[var(--chrome-gutter)]");
    expect(readFileSync("src/lib/house-client-shell.ts", "utf8")).not.toContain(
      "--shell-gutter",
    );
    expect(readFileSync("src/components/chrome/side-nav.tsx", "utf8")).not.toContain(
      "--shell-gutter",
    );
    expect(readFileSync("src/components/chrome/settings-rail.tsx", "utf8")).not.toContain(
      "--shell-gutter",
    );
  });
});
