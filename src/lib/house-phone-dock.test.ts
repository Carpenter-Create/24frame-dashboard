import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  HOUSE_PHONE_BOTTOM_NAV_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS,
} from "@/lib/house-phone-shell";
import {
  HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS,
  HOUSE_PHONE_DOCK_CHROME_PB_CLASS,
  HOUSE_PHONE_DOCK_CLEARANCE,
} from "@/lib/house-phone-dock";
import { HOUSE_MODULE_CLASS, HOUSE_SECTION_AIR_CLASS } from "@/lib/house-shell";
import { isSocialExplorePath } from "@/lib/social";
import {
  SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_POST_CLASS,
  SOCIAL_POST_TEXT_CARD_CLASS,
} from "@/lib/social-chrome";

const dockSrc = readFileSync("src/lib/house-phone-dock.ts", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const socialChrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const explore = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");

// The clearance token's value (pill h-14 + the 16 float + house 16) is
// pinned once in src/app/tokens.test.ts.
describe("phone dock clearance", () => {
  it("keeps one length: pill + float + house 16, and emits static utilities", () => {
    expect(HOUSE_PHONE_DOCK_CLEARANCE).toBe("var(--house-phone-dock-clearance)");
    expect(dockSrc).toContain('"max-md:pb-[var(--house-phone-dock-clearance)]"');
    expect(dockSrc).toContain('"max-md:bottom-[var(--house-phone-dock-clearance)]"');
    expect(dockSrc).not.toMatch(/\$\{HOUSE_PHONE_DOCK_CLEARANCE\}/);
    expect(HOUSE_PHONE_DOCK_CHROME_PB_CLASS).toBe(
      "max-md:pb-[var(--house-phone-dock-clearance)]",
    );
    expect(HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS).toBe(
      "max-md:bottom-[var(--house-phone-dock-clearance)]",
    );
  });

  it("keeps the floating phone dock on the bottom", () => {
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("fixed");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("inset-x-0");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("bottom-0");
    // The pill floats 16 off the bottom, as on the board (was 12), and
    // the clearance carries the same float so the 16 gap above it holds.
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).not.toContain("max(12px");
    // The 16 float is pinned in house-phone-shell.test.ts; the clearance
    // token (the 56 pill and its value) in tokens.test.ts.
    const float = HOUSE_PHONE_BOTTOM_NAV_CLASS.match(/pb-\[max\((\d+px),env\(safe-area-inset-bottom\)\)\]/)?.[1];
    // The clearance carries the same float as the dock.
    expect(tokens).toContain(`+ max(${float}, env(safe-area-inset-bottom)) + var(--space-4));`);
    expect(tokens).not.toContain("calc(3rem + max(");
  });

  it("lifts Explore caption and rail above the dock and leaves the video full-bleed", () => {
    expect(SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS).toContain(HOUSE_PHONE_DOCK_CHROME_PB_CLASS);
    expect(SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS).toContain(HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS);
    expect(SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS).toContain(
      "pb-[max(var(--space-4),env(safe-area-inset-bottom))]",
    );
    expect(SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS).toContain(
      "bottom-[max(var(--space-4),env(safe-area-inset-bottom))]",
    );
    expect(socialChrome).not.toContain("${HOUSE_PHONE_DOCK_CLEARANCE}");
    expect(SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS).toBe(
      "max-md:fixed max-md:inset-0 overflow-hidden bg-[#0A0A0B] md:absolute md:inset-0",
    );
    expect(SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS).toContain("max-md:fixed");
    expect(SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS).not.toMatch(/(^|\s)fixed inset-0/);
    expect(SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS).not.toContain("house-phone-dock-clearance");
    expect(explore).toContain("fit=\"cover\"");
    expect(explore).toContain("object-cover");
    expect(explore).not.toContain("HOUSE_PHONE_DOCK");
    expect(explore).not.toContain("progress");
  });

  it("pads the Home lead scroll with the same clearance and leaves dock chrome off the feed row", () => {
    expect(isSocialExplorePath("/social")).toBe(false);
    expect(isSocialExplorePath("/social/explore")).toBe(true);
    expect(HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS).toBe(HOUSE_PHONE_DOCK_CHROME_PB_CLASS);
    expect(shell).toContain(
      "phoneDestDock && !exploreStage ? HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS : undefined",
    );
    expect(shell).toContain("cn(HOUSE_LEAD_SCROLL_CLASS, phoneDestPad");
    expect(shell).toContain('data-house-lead-scroll=""');
    // H · Posts: the wall is 24 / 48; no post carries dock chrome.
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe(`flex flex-col ${HOUSE_SECTION_AIR_CLASS} md:gap-[var(--space-12)]`);
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("house-phone-dock-clearance");
    for (const post of [SOCIAL_POST_CLASS, SOCIAL_POST_TEXT_CARD_CLASS]) {
      expect(post).not.toContain(HOUSE_MODULE_CLASS);
      expect(post).not.toContain("border-y-2");
      expect(post).not.toContain("house-phone-dock-clearance");
    }
  });
});
