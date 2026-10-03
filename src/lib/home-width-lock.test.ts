import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_ACCESS_RAIL_WIDTH,
  HOUSE_HOME_CONTENT_WIDTH,
  HOUSE_HOME_RAIL_COLUMN_CLASS,
} from "@/lib/house-shell";
import {
  HOME_CONTENT_COLUMN_PX,
  HOME_FIGMA_FRAME_PX,
  HOME_LEFT_INSET_PX,
  HOME_RIGHT_INSET_PX,
  HOME_WIDTH_LOCK,
} from "@/lib/home-width-lock";

const stamp = readFileSync("src/lib/HOME-width-lock.md", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");

describe("Home width lock", () => {
  it("stamps 32 left + 32 right + 1376 content at the 1440 frame", () => {
    expect(HOME_FIGMA_FRAME_PX).toBe(1440);
    expect(HOME_LEFT_INSET_PX).toBe(32);
    expect(HOME_RIGHT_INSET_PX).toBe(32);
    expect(HOME_CONTENT_COLUMN_PX).toBe(1376);
    expect(HOME_LEFT_INSET_PX + HOME_RIGHT_INSET_PX + HOME_CONTENT_COLUMN_PX).toBe(
      HOME_FIGMA_FRAME_PX,
    );
    expect(HOME_WIDTH_LOCK).toEqual({
      figmaFrame: 1440,
      leftInset: 32,
      rightInset: 32,
      contentColumn: 1376,
    });
    expect(stamp).toContain("32px");
    expect(stamp).not.toContain("44px");
    expect(stamp).toContain("1376px");
    expect(stamp).toContain("1440");
    expect(stamp).toContain("--shell-gutter-inline-start");
    expect(stamp).toContain("--shell-gutter-inline-end");
    expect(stamp).toContain("shell-desktop-horizontal-gutter-lock-v2");
    expect(stamp).not.toMatch(/1080|--page-max-width/);
    expect(stamp).not.toContain("1220px");
    expect(stamp).not.toContain("Phantom Access rail inset");
  });

  it("insets Home with house tokens — not the dest-rail slot or page cap", () => {
    expect(tokens).toMatch(/--sidebar-width:\s*256px;/);
    expect(tokens).toMatch(/--access-rail-width:\s*var\(--sidebar-width\);/);
    expect(tokens).toMatch(/--content-inset:\s*48px;/);
    expect(tokens).toMatch(/--chrome-gutter:\s*16px;/);
    expect(tokens).toMatch(/--home-content-width:\s*1376px;/);
    expect(tokens).not.toMatch(/--home-content-width:\s*1364px;/);
    expect(tokens).not.toMatch(/--home-content-width:\s*1220px;/);
    expect(HOUSE_ACCESS_RAIL_WIDTH).toBe("var(--access-rail-width)");
    expect(HOUSE_HOME_CONTENT_WIDTH).toBe("var(--home-content-width)");
    expect(HOUSE_HOME_RAIL_COLUMN_CLASS).toBe(
      "w-full md:ml-[var(--shell-gutter-inline-start)] md:mr-[var(--shell-gutter-inline-end)] md:w-[calc(100%-var(--shell-gutter-inline-start)-var(--shell-gutter-inline-end))]",
    );
    expect(HOUSE_HOME_RAIL_COLUMN_CLASS).not.toContain("--access-rail-width");
    const homeArm = shell.slice(shell.indexOf(": homePage"), shell.indexOf(": cn(\"mx-auto"));
    expect(homeArm).toContain("HOUSE_HOME_RAIL_COLUMN_CLASS");
    expect(homeArm).not.toContain("page-max-width");
    expect(homeArm).not.toContain("mx-auto");
    expect(homeArm).not.toContain("1080");
    expect(shell.match(/<HouseScreenOutlet>/g)?.length).toBe(1);
    expect(shell).toContain("data-home-chrome");
    expect(shell).toContain("overviewHidesRail");
    expect(shell).toContain('const homePage = pathname === "/" || homeChrome');
    expect(shell).not.toContain('pathname === "/dashboard" || homeChrome');
  });
});
