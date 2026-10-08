import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
} from "./house-lead-chrome";
import {
  SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS,
  SOCIAL_HOME_TOPIC_FADE_CLASS,
  SOCIAL_HOME_TOPIC_TRACK_CLASS,
} from "./social-chrome";
import {
  APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS,
  WORKSPACE_BAND_CLASS,
  WORKSPACE_BAND_ICON_CURRENT_WEIGHT,
  WORKSPACE_BAND_ICON_WEIGHT,
  WORKSPACE_BAND_PILL_CLASS,
  WORKSPACE_BAND_PILL_CURRENT_CLASS,
  WORKSPACE_BAND_PILL_HIT_CLASS,
  WORKSPACE_BAND_ROW_CLASS,
  workspaceBandPillClass,
  workspaceSliderSegments,
} from "./workspace-switcher";

// docs/design-locks/shell-phone-workspace-band-lock-v1.md (Adam 2026-10-08).
const lock = readFileSync("docs/design-locks/shell-phone-workspace-band-lock-v1.md", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");

const classes = (value: string) => value.split(/\s+/).filter(Boolean);
const block = (selector: string) => {
  const start = tokens.indexOf(`${selector} {`);
  return tokens.slice(start, tokens.indexOf("\n}", start));
};

describe("phone workspace band lock v1", () => {
  it("records the founder's words", () => {
    for (const quote of [
      "1) top section (blue on the screenshot) can be our workspaces",
      "I'm okay with the workspace row scrolling like scrolling pills",
      "logo - use emblem on mobile",
      "wouldn't icon with words look best",
      "in dark mode, don't use the light blue since that is not a brand color",
      "I think remove the arrow and let the rows slide",
      "it must be aligned like the screenshot I gave you",
      "build the band next",
    ]) {
      expect(lock, quote).toContain(quote);
    }
  });

  it("G3: the band is Sporty Blue in both themes — never the dark light blue", () => {
    const root = block(":root");
    const dark = block(".dark");
    expect(root).toContain("--workspace-band: #1769ff;");
    expect(root).toContain("--workspace-band-ink: #ffffff;");
    expect(root).toContain("--workspace-band-pill-ink: var(--accent-ink);");
    // .dark keeps the band (no override) and maps the current pill's ink to white.
    expect(dark).not.toMatch(/--workspace-band:/);
    expect(dark).toContain("--workspace-band-pill-ink: #ffffff;");
    expect(tokens).not.toMatch(/--workspace-band[a-z-]*:\s*(?:#70b5f9|var\(--accent\))/i);
    for (const name of ["workspace-band", "workspace-band-ink", "workspace-band-pill-ink"]) {
      expect(globals).toContain(`--color-${name}: var(--${name});`);
    }
  });

  it("G1: the band leads the stack, flush under the status bar, phone only", () => {
    expect(classes(WORKSPACE_BAND_CLASS)).toEqual(
      expect.arrayContaining(["bg-workspace-band", "pt-[env(safe-area-inset-top)]", "md:hidden"]),
    );
    // No other top space: no margin or extra top padding on the band.
    expect(WORKSPACE_BAND_CLASS).not.toMatch(/(?:^|\s)(?:mt-|pt-\d|py-)/);
    const stack = leadSrc.indexOf('data-house-lead-stack=""');
    expect(leadSrc.indexOf('presentation="band"', stack)).toBeLessThan(leadSrc.indexOf("<header", stack));
    expect(classes(HOUSE_LEAD_STACK_CLASS)).toContain("max-md:bg-workspace-band");
  });

  it("G4: one sliding row of icon + word pills — no arrow, no fade", () => {
    expect(classes(WORKSPACE_BAND_ROW_CLASS)).toEqual(
      expect.arrayContaining(["no-scrollbar", "flex", "h-14", "overflow-x-auto", "whitespace-nowrap", "px-[var(--space-4)]"]),
    );
    expect(WORKSPACE_BAND_ROW_CLASS).not.toMatch(/scroll-pe|gradient|fade/);
    expect(classes(WORKSPACE_BAND_PILL_HIT_CLASS)).toEqual(expect.arrayContaining(["h-11", "shrink-0"]));
    // The house focus ring, white on the blue, hugging the pill.
    expect(classes(WORKSPACE_BAND_PILL_HIT_CLASS)).toEqual(
      expect.arrayContaining(["focus-visible:outline-workspace-band-ink!", "focus-visible:rounded-full!"]),
    );
    expect(classes(WORKSPACE_BAND_PILL_CLASS)).toEqual(
      expect.arrayContaining(["h-9", "rounded-full", "px-3.5", "gap-1.5", "font-medium", "text-workspace-band-ink"]),
    );
    expect(WORKSPACE_BAND_PILL_CLASS).not.toContain("bg-");
    expect(WORKSPACE_BAND_PILL_CLASS).not.toContain("truncate");
    // Current: the page colour with the pill ink; a filled glyph.
    expect(classes(WORKSPACE_BAND_PILL_CURRENT_CLASS)).toEqual(
      expect.arrayContaining(["bg-bg", "text-workspace-band-pill-ink"]),
    );
    expect(workspaceBandPillClass(true)).toBe(WORKSPACE_BAND_PILL_CURRENT_CLASS);
    expect(workspaceBandPillClass(false)).toBe(WORKSPACE_BAND_PILL_CLASS);
    expect(WORKSPACE_BAND_ICON_WEIGHT).toBe("regular");
    expect(WORKSPACE_BAND_ICON_CURRENT_WEIGHT).toBe("fill");
    expect(workspaceSliderSegments().map((pill) => pill.id)).toEqual([
      "home",
      "aggregation",
      "social",
      "education",
    ]);
  });

  it("G5: the bar is an opaque sheet over the band; the grey pill is md to lg only", () => {
    expect(classes(HOUSE_LEAD_CHROME_CLASS)).toEqual(
      expect.arrayContaining(["max-md:rounded-t-[var(--radius-xl)]", "max-md:bg-bg", "max-md:backdrop-blur-none"]),
    );
    expect(classes(HOUSE_LEAD_UNDER_NAV_CLASS)).toContain("bg-bg");
    expect(HOUSE_LEAD_UNDER_NAV_CLASS).not.toContain("bg-bg/85");
    expect(classes(APP_HEADER_WORKSPACE_WAFFLE_HOST_CLASS)).toEqual(["hidden", "shrink-0", "md:block", "lg:hidden"]);
  });

  it("G6: the Feed topic row slides on phone — its fade, More topics, and cut rule are desktop only", () => {
    expect(classes(SOCIAL_HOME_TOPIC_FADE_CLASS)).toContain("max-md:hidden");
    expect(classes(SOCIAL_HOME_TOPIC_CHIP_CUT_CLASS)).toEqual(["md:pointer-events-none", "md:opacity-0"]);
    expect(classes(SOCIAL_HOME_TOPIC_TRACK_CLASS)).toContain("md:scroll-pe-24");
    expect(classes(SOCIAL_HOME_TOPIC_TRACK_CLASS)).not.toContain("scroll-pe-24");
  });
});
