import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  HOUSE_PHONE_BOTTOM_NAV_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PAD_CLASS,
  HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS,
} from "@/lib/house-phone-shell";
import {
  HOUSE_PHONE_DOCK_CHROME_BOTTOM_CLASS,
  HOUSE_PHONE_DOCK_CHROME_PB_CLASS,
  HOUSE_PHONE_DOCK_CLEARANCE,
} from "@/lib/house-phone-dock";
import { isSocialExplorePath } from "@/lib/social";
import {
  SOCIAL_EXPLORE_FOR_YOU_CAPTION_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_FRAME_CLASS,
  SOCIAL_EXPLORE_FOR_YOU_RAIL_CLASS,
  SOCIAL_FEED_GUTTER_CLASS,
  SOCIAL_FEED_ROW_CLASS,
} from "@/lib/social-chrome";

const dockSrc = readFileSync("src/lib/house-phone-dock.ts", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const shell = readFileSync("src/components/chrome/app-shell.tsx", "utf8");
const socialChrome = readFileSync("src/lib/social-chrome.ts", "utf8");
const explore = readFileSync("src/components/social/social-explore-for-you.tsx", "utf8");

/** Pill h-12 + dock float + house 16. Safe-area replaces the 12px float. */
const HOUSE_PHONE_DOCK_CLEARANCE_FORMULA =
  "--house-phone-dock-clearance: calc(3rem + max(12px, env(safe-area-inset-bottom)) + var(--space-4));";

describe("phone dock clearance", () => {
  it("keeps one length: pill + float + house 16, and emits static utilities", () => {
    expect(tokens).toContain(HOUSE_PHONE_DOCK_CLEARANCE_FORMULA);
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
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("z-40");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain("md:hidden");
    expect(HOUSE_PHONE_BOTTOM_NAV_CLASS).toContain(
      "pb-[max(12px,env(safe-area-inset-bottom))]",
    );
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("h-12");
    expect(HOUSE_PHONE_BOTTOM_NAV_PILL_CLASS).toContain("rounded-full");
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
    expect(SOCIAL_FEED_GUTTER_CLASS).toBe("flex flex-col");
    expect(SOCIAL_FEED_GUTTER_CLASS).not.toContain("house-phone-dock-clearance");
    expect(SOCIAL_FEED_ROW_CLASS).toContain("border-y-2 border-hairline");
    expect(SOCIAL_FEED_ROW_CLASS).not.toContain("house-phone-dock-clearance");
  });
});
