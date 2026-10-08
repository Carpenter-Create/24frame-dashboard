import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  HOUSE_LEAD_CHROME_CLASS,
  HOUSE_LEAD_CORNER_FILL_CLASS,
  HOUSE_LEAD_GRIP_CLASS,
  HOUSE_LEAD_SCROLL_CLASS,
  HOUSE_LEAD_SHELL_CLASS,
  HOUSE_LEAD_STACK_CLASS,
  HOUSE_LEAD_UNDER_NAV_CLASS,
  HOUSE_PHONE_CHROME_SPACER_CLASS,
  HOUSE_PHONE_SHEET_MOTION_CLASS,
} from "./house-lead-chrome";
import {
  HOUSE_PHONE_BAND_ROW_PX,
  HOUSE_PHONE_CHROME_DRAG_ZONE,
  HOUSE_PHONE_SHEET_IDLE_MS,
  HOUSE_PHONE_SHEET_SNAP_MS,
} from "./house-phone-chrome";
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
  WORKSPACE_BAND_THUMB_CLASS,
  workspaceBandPillClass,
  workspaceSliderSegments,
} from "./workspace-switcher";

// docs/design-locks/shell-phone-workspace-band-lock-v1.md (Adam 2026-10-08).
const lock = readFileSync("docs/design-locks/shell-phone-workspace-band-lock-v1.md", "utf8");
const tokens = readFileSync("src/app/tokens.css", "utf8");
const globals = readFileSync("src/app/globals.css", "utf8");
const leadSrc = readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8");
const switcherSrc = readFileSync("src/components/chrome/workspace-switcher.tsx", "utf8");
const dockSrc = readFileSync("src/components/chrome/house-phone-bottom-nav.tsx", "utf8");
const phoneShellSrc = readFileSync("src/components/chrome/house-phone-app-shell.tsx", "utf8");
const trackerSrc = readFileSync("src/components/chrome/house-phone-chrome-state.tsx", "utf8");
const shellSrc = readFileSync("src/components/chrome/app-shell.tsx", "utf8");

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
      "can we add that thing so the user can push the page up to cover the top navigation section, or pull it back down?",
      "leave that off for now. merge 781",
      "also I've decided...let's do this now.",
      "either way, the bar doesn't feel like it works very fluidly or naturally",
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
    // v1.3: the stack floats over the page and carries no fill of its own
    // (the band and the corner strip paint the blue).
    expect(classes(HOUSE_LEAD_STACK_CLASS)).not.toContain("max-md:bg-workspace-band");
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
    // Current: the page colour with the pill ink; a filled glyph. The
    // colour is the sliding thumb (shell-phone-nav-motion-lock-v1); the
    // face paints it only until the thumb is placed.
    expect(classes(WORKSPACE_BAND_PILL_CURRENT_CLASS)).toEqual(
      expect.arrayContaining(["in-data-segmented-pending:bg-bg", "text-workspace-band-pill-ink"]),
    );
    expect(classes(WORKSPACE_BAND_THUMB_CLASS)).toEqual(
      expect.arrayContaining(["bg-bg", "h-9", "rounded-full"]),
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
  it("G7: on phone the chrome floats over the page, which starts under it; the band never changes height", () => {
    expect(classes(HOUSE_LEAD_STACK_CLASS)).toEqual(
      expect.arrayContaining(["max-md:absolute", "max-md:inset-x-0", "max-md:top-0", "sticky", "top-0"]),
    );
    expect(classes(HOUSE_LEAD_SHELL_CLASS)).toContain("max-md:relative");
    expect(classes(HOUSE_PHONE_CHROME_SPACER_CLASS)).toEqual(
      expect.arrayContaining([
        "md:hidden",
        "shrink-0",
        "h-[var(--house-phone-chrome-h,calc(env(safe-area-inset-top)+7.5rem))]",
      ]),
    );
    // The spacer is main's first child; scroll-into-view stops under the chrome.
    const main = shellSrc.indexOf("<main");
    expect(shellSrc.indexOf("data-house-phone-chrome-spacer", main)).toBeGreaterThan(main);
    expect(shellSrc.indexOf("data-house-phone-chrome-spacer", main)).toBeLessThan(
      shellSrc.indexOf("<HouseScreenOutlet>", main),
    );
    expect(classes(HOUSE_LEAD_SCROLL_CLASS)).toContain("max-md:scroll-pt-[var(--house-phone-chrome-visible,0px)]");
    // No fold: nothing in the band animates its height.
    expect(switcherSrc).not.toContain("data-workspace-band-fold");
    expect(WORKSPACE_BAND_CLASS).not.toMatch(/transition-\[height\]|h-0/);
    expect(classes(WORKSPACE_BAND_ROW_CLASS)).toContain("h-14");
    expect(HOUSE_PHONE_BAND_ROW_PX).toBe(56);
    // The covered band stays in the accessibility tree; focus brings it back.
    expect(switcherSrc).toContain("onFocus={bandTucked ? open : undefined}");
    expect(switcherSrc).not.toMatch(/aria-hidden=\{bandTucked/);
  });

  it("G8: one tracker writes the cover; the bar, its corners, and the search row move by it", () => {
    expect(phoneShellSrc).toContain("<HousePhoneChromeContext.Provider value={phoneChrome}>");
    expect(dockSrc).toContain("useHousePhoneChrome()");
    expect(switcherSrc).toContain("useHousePhoneChrome()");
    expect(dockSrc).not.toContain("addEventListener");
    expect(trackerSrc.match(/addEventListener\("scroll"/g)).toHaveLength(1);
    // Written straight to CSS variables, not a React render per frame.
    expect(trackerSrc).toContain("root.style.setProperty(HOUSE_PHONE_SHEET_Y_VAR");
    expect(classes(HOUSE_PHONE_SHEET_MOTION_CLASS)).toEqual(
      expect.arrayContaining([
        "max-md:translate-y-[calc(var(--house-phone-sheet-y,0px)*-1)]",
        "max-md:transition-[translate]",
        "max-md:duration-0",
        "max-md:in-data-house-phone-sheet-settle:duration-[180ms]",
      ]),
    );
    expect(HOUSE_PHONE_SHEET_SNAP_MS).toBe(180);
    expect(HOUSE_PHONE_SHEET_IDLE_MS).toBe(120);
    expect(leadSrc).toContain("HOUSE_PHONE_SHEET_MOTION_CLASS,\n        )}");
    expect(leadSrc).toContain("className={cn(HOUSE_LEAD_UNDER_NAV_CLASS, HOUSE_PHONE_SHEET_MOTION_CLASS)}");
    // The corner strip: Sporty Blue, 24 tall, just under the band, moving with the bar.
    expect(classes(HOUSE_LEAD_CORNER_FILL_CLASS)).toEqual(
      expect.arrayContaining([
        "absolute",
        "h-6",
        "bg-workspace-band",
        "md:hidden",
        "top-[calc(env(safe-area-inset-top)+3.5rem)]",
        "max-md:translate-y-[calc(var(--house-phone-sheet-y,0px)*-1)]",
      ]),
    );
    const stack = leadSrc.indexOf('data-house-lead-stack=""');
    expect(leadSrc.indexOf("data-house-lead-corner-fill", stack)).toBeGreaterThan(leadSrc.indexOf('presentation="band"', stack));
    expect(leadSrc.indexOf("data-house-lead-corner-fill", stack)).toBeLessThan(leadSrc.indexOf("<header", stack));
  });

  it("G9: the bar carries the grab handle in an 8 phone strip", () => {
    expect(classes(HOUSE_LEAD_GRIP_CLASS)).toEqual(
      expect.arrayContaining([
        "pointer-events-none",
        "absolute",
        "inset-x-0",
        "mx-auto",
        "top-[var(--space-1)]",
        "h-1",
        "w-9",
        "rounded-full",
        "bg-ink-3/40",
        "md:hidden",
      ]),
    );
    expect(classes(HOUSE_LEAD_CHROME_CLASS)).toEqual(
      expect.arrayContaining([
        "max-md:h-[calc(var(--header-height)+var(--space-2))]",
        "max-md:pt-[var(--space-2)]",
        "h-[var(--header-height)]",
      ]),
    );
    expect(leadSrc).toContain('<span aria-hidden="true" data-house-lead-grip="" className={HOUSE_LEAD_GRIP_CLASS} />');
  });

  it("G10: the drag zone is the whole chrome, and sticky page rows stop under it", () => {
    expect(HOUSE_PHONE_CHROME_DRAG_ZONE).toBe("[data-house-lead-stack]");
    expect(leadSrc).toContain('data-house-lead-stack=""');
    expect(trackerSrc).toContain("closest(HOUSE_PHONE_CHROME_DRAG_ZONE)");
    expect(lock).toContain("exactly as far as the page scrolls");
    for (const file of ["src/lib/dashboard-craft.ts", "src/lib/reports-craft.ts", "src/lib/news-sticky.ts"]) {
      expect(readFileSync(file, "utf8"), file).toContain("max-md:top-[var(--house-phone-chrome-visible,0px)]");
    }
  });
});
