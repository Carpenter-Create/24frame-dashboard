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
  HOUSE_PHONE_CHROME_TOUCH_CLASS,
  HOUSE_PHONE_DOCK_HIDDEN_ATTR,
  HOUSE_PHONE_SHEET_MOTION_CLASS,
  HOUSE_PHONE_SHEET_SETTLE_ATTR,
} from "./house-lead-chrome";
import { HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS } from "./house-lead-scroll-to-top";
import { HOUSE_PHONE_BOTTOM_NAV_CLASS, HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS } from "./house-phone-shell";
import {
  HOUSE_PHONE_BAND_ROW_PX,
  HOUSE_PHONE_CHROME_DRAG_ZONE,
  HOUSE_PHONE_CHROME_MEDIA,
  HOUSE_PHONE_SHEET_EASE,
  HOUSE_PHONE_SHEET_IDLE_MS,
  HOUSE_PHONE_SHEET_REVERSE_PX,
  HOUSE_PHONE_SHEET_SNAP_MS,
  HOUSE_PHONE_SHEET_TOLERANCE_PX,
} from "./house-phone-chrome";
import {
  HOUSE_PHONE_SHEET_EASE_CLEAR_MS,
  HOUSE_PHONE_SHEET_FOREIGN_PX,
  HOUSE_PHONE_SHEET_GLIDE_WATCHDOG_MS,
  HOUSE_PHONE_SHEET_NATIVE_QUIET_MS,
  HOUSE_PHONE_SHEET_QUIET_FRAMES,
  HOUSE_PHONE_SHEET_REST_WATCHDOG_MS,
  HOUSE_PHONE_SHEET_TOUCH_STALE_MS,
} from "./house-phone-chrome-runtime";
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
const runtimeSrc = readFileSync("src/lib/house-phone-chrome-runtime.ts", "utf8");
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
      // v1.5 (2026-10-09), on the phone chrome scroll review.
      "after you are done. fix and change everything that you recommend. make sure we have the greatest quality perfectly built for the long-haul. do not cut corners or compromise anything.",
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
    // v1.5: the band reads its own half, so a dock flip never re-renders it.
    expect(phoneShellSrc).toContain("<HousePhoneBandContext.Provider value={phoneBand}>");
    expect(dockSrc).toContain("useHousePhoneChrome()");
    expect(switcherSrc).toContain("useHousePhoneBand()");
    expect(switcherSrc).not.toContain("useHousePhoneChrome()");
    expect(dockSrc).not.toContain("addEventListener");
    expect(trackerSrc.match(/addEventListener\("scroll"/g)).toHaveLength(1);
    expect(runtimeSrc).not.toContain("addEventListener(\"scroll\"");
    // Written straight to CSS variables, not a React render per frame, by
    // one writer: the runtime.
    expect(runtimeSrc).toContain("root.style.setProperty(HOUSE_PHONE_SHEET_Y_VAR");
    expect(trackerSrc).not.toContain("HOUSE_PHONE_SHEET_Y_VAR");
    expect(classes(HOUSE_PHONE_SHEET_MOTION_CLASS)).toEqual(
      expect.arrayContaining([
        "max-md:translate-y-[calc(var(--house-phone-sheet-y,0px)*-1)]",
        "max-md:transition-[translate]",
        "max-md:duration-0",
        "max-md:in-data-house-phone-sheet-settle:duration-[180ms]",
        // The deep settle's curve is the glide's (HOUSE_PHONE_SHEET_EASE).
        `max-md:ease-[cubic-bezier(${HOUSE_PHONE_SHEET_EASE.join(",")})]`,
        `max-md:in-${HOUSE_PHONE_SHEET_SETTLE_ATTR}:duration-[180ms]`,
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
    expect(runtimeSrc).toContain("closest(HOUSE_PHONE_CHROME_DRAG_ZONE)");
    expect(lock).toContain("exactly as far as the page scrolls");
    for (const file of ["src/lib/dashboard-craft.ts", "src/lib/reports-craft.ts", "src/lib/news-sticky.ts"]) {
      expect(readFileSync(file, "utf8"), file).toContain("max-md:top-[var(--house-phone-chrome-visible,0px)]");
    }
  });

  // v1.4 (Adam 2026-10-09: "Fix bugs, keep sheet", "Match bar at rest",
  // "Keep slide, stop jumps").
  it("G11: the chrome and the dock take sideways pans only; the document never rubber-bands", () => {
    const touch = ["touch-pan-x", "touch-pinch-zoom"];
    for (const [name, cls] of [
      ["band", WORKSPACE_BAND_CLASS],
      ["bar", HOUSE_LEAD_CHROME_CLASS],
      ["search row", HOUSE_LEAD_UNDER_NAV_CLASS],
    ] as const) {
      expect(cls, name).toContain(HOUSE_PHONE_CHROME_TOUCH_CLASS);
    }
    expect(HOUSE_PHONE_CHROME_TOUCH_CLASS).toContain("max-md:pointer-events-auto");
    for (const t of touch) {
      expect(HOUSE_PHONE_CHROME_TOUCH_CLASS).toContain(`max-md:${t}`);
      // The row is its own scroller, so its own touch-action counts inside it.
      expect(classes(WORKSPACE_BAND_ROW_CLASS)).toContain(t);
      expect(classes(HOUSE_PHONE_BOTTOM_NAV_CLASS)).toContain(t);
    }
    // The covered strip is the page's: the stack lets taps through.
    expect(classes(HOUSE_LEAD_STACK_CLASS)).toContain("max-md:pointer-events-none");
    const css = readFileSync("src/app/globals.css", "utf8");
    const rule = (sel: string) => css.slice(css.indexOf(`\n${sel} {`), css.indexOf("}", css.indexOf(`\n${sel} {`)));
    expect(rule("html")).toContain("overscroll-behavior-y: none;");
    expect(rule("body")).toContain("overscroll-behavior-y: none;");
    expect(lock).toContain("| Pull-to-refresh | (v1.4) None.");
  });

  it("G12: the dock lands with the bar at rest; ends are clamped; a lost finger-up still ends", () => {
    const motion = readFileSync("src/lib/house-phone-chrome.ts", "utf8");
    const at = (needle: string) => {
      const index = motion.indexOf(needle);
      expect(index, needle).toBeGreaterThan(-1);
      return index;
    };
    // Method order: scroll, settle, land, dragStart, drag, dragAbort, dragEnd, open.
    const settle = motion.slice(at("    settle() {"), at("    land() {"));
    expect(settle).toContain("landDock();");
    // land() (v1.5) lands the dock and never asks for another page settle.
    const land = motion.slice(at("    land() {"), at("    dragStart("));
    expect(land).toContain("landDock();");
    expect(land).not.toMatch(/scrollPage\([^;]*,\s*true\)/);
    expect(at("    dragStart(")).toBeLessThan(at("    drag(dy) {"));
    expect(at("    drag(dy) {")).toBeLessThan(at("    dragAbort() {"));
    expect(at("    dragAbort() {")).toBeLessThan(at("    dragEnd() {"));
    expect(at("    dragEnd() {")).toBeLessThan(at("    open() {"));
    expect(motion).toContain("const dockHidden = housePhoneDockAtRest(offset, state.dockHidden, band);");
    expect(motion).toContain("const pageY = () => housePhoneSheetPageY(readY(), readRange());");
    expect(motion).not.toContain("Math.max(0, readY())");
    // The finger's moves and lift land on the touched element when it is
    // removed mid-gesture (v1.5: moves too).
    expect(runtimeSrc).toContain('el.addEventListener("touchend", onDetachedEnd, { passive: true });');
    expect(runtimeSrc).toContain('el.addEventListener("touchmove", onDetachedMove, { passive: true });');
    expect(runtimeSrc).toContain("if (el && !el.isConnected && isTouchLike(event)) onTouchEnd(event);");
    expect(runtimeSrc).toContain("if (el && !el.isConnected && isTouchLike(event)) onTouchMove(event);");
    // The cleanup ends the runtime (which releases the touched element).
    expect(trackerSrc).toContain("swaps?.disconnect();\n      sheet.stop();");
    // A stack hidden by the immersive feed keeps the last measured height.
    expect(trackerSrc).toContain("if (stack && stack.getClientRects().length === 0) return;");
    expect(lock).toContain("At rest it lands the way the bar did");
  });

  it("G13: the band reopens where it was slid", () => {
    expect(switcherSrc).toMatch(/persistKey=\{SEGMENTED_TRACK_PERSIST\.workspaceBand\}[\s\S]*?rememberRail/);
    const track = readFileSync("src/components/ui/segmented-track.tsx", "utf8");
    // Restored before the reveal (layout effects run in order).
    expect(track.indexOf("readSegmentedRailScroll(persistKey)")).toBeGreaterThan(-1);
    expect(track.indexOf("readSegmentedRailScroll(persistKey)")).toBeLessThan(
      track.indexOf('if (revealActive) active.scrollIntoView({ block: "nearest", inline: "nearest" });'),
    );
    expect(classes(WORKSPACE_BAND_ROW_CLASS)).toContain("scroll-px-[var(--space-4)]");
  });

  // v1.5 (Adam 2026-10-09, on the phone chrome scroll review: "fix and
  // change everything that you recommend").
  it("G14: rest is scrollend where it fires, 120ms where it does not, never both; every settle lands", () => {
    expect(HOUSE_PHONE_SHEET_IDLE_MS).toBe(120);
    expect(HOUSE_PHONE_SHEET_SNAP_MS).toBe(180);
    expect(HOUSE_PHONE_SHEET_TOLERANCE_PX).toBe(0.5);
    expect(HOUSE_PHONE_SHEET_REVERSE_PX).toBe(3);
    expect(HOUSE_PHONE_SHEET_REST_WATCHDOG_MS).toBe(600);
    expect(HOUSE_PHONE_SHEET_NATIVE_QUIET_MS).toBe(HOUSE_PHONE_SHEET_IDLE_MS);
    expect(HOUSE_PHONE_SHEET_GLIDE_WATCHDOG_MS).toBe(HOUSE_PHONE_SHEET_SNAP_MS + HOUSE_PHONE_SHEET_IDLE_MS);
    expect(HOUSE_PHONE_SHEET_EASE_CLEAR_MS).toBe(HOUSE_PHONE_SHEET_SNAP_MS + 40);
    expect(HOUSE_PHONE_SHEET_FOREIGN_PX).toBe(1);
    expect(HOUSE_PHONE_SHEET_QUIET_FRAMES).toEqual({ event: 2, timer: 1 });
    expect(HOUSE_PHONE_SHEET_TOUCH_STALE_MS).toBe(HOUSE_LEAD_SCROLL_TO_TOP_TOUCH_STALE_MS);
    expect([...HOUSE_PHONE_SHEET_EASE]).toEqual([0, 0, 0.2, 1]);
    // The tracker binds scrollend only where the scroller has it.
    expect(trackerSrc).toContain('if (restMode === "scrollend") target.addEventListener("scrollend", onScrollEnd, { passive: true });');
    expect(trackerSrc).toContain("const restMode = housePhoneChromeRestMode(target);");
    expect(lock).toContain("never both");
    expect(lock).toContain("`scrollend`");
    expect(lock).toContain("**G14.**");
  });

  it("G15: the dock hides from the shell's mark, written with the cover; the state keeps assistive tech", () => {
    expect(HOUSE_PHONE_DOCK_HIDDEN_ATTR).toBe("data-house-phone-dock-hidden");
    expect(HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS).toBe(
      "in-data-house-phone-dock-hidden:pointer-events-none in-data-house-phone-dock-hidden:translate-y-full",
    );
    expect(HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS).toContain(`in-${HOUSE_PHONE_DOCK_HIDDEN_ATTR}:`);
    expect(dockSrc).toContain("cn(HOUSE_PHONE_BOTTOM_NAV_CLASS, HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS)");
    expect(dockSrc).not.toContain("hidden && ");
    expect(dockSrc).toContain("aria-hidden={hidden || undefined}");
    expect(dockSrc).toContain("tabIndex={hidden ? -1 : undefined}");
    // The mark goes on in the controller's change callback, right after the
    // cover's paint, and comes off at stop (every navigation).
    expect(runtimeSrc).toContain("if (next.dockHidden) root.setAttribute(HOUSE_PHONE_DOCK_HIDDEN_ATTR, \"\");");
    const stop = runtimeSrc.slice(runtimeSrc.indexOf("  const stop = () => {"));
    expect(stop).toContain("root.removeAttribute(HOUSE_PHONE_DOCK_HIDDEN_ATTR);");
    expect(trackerSrc).toContain("useLayoutEffect(() => halt, [pathname, halt]);");
    // The destinations are memoised: a dock flip never re-prefetches them.
    expect(dockSrc).toContain("const items = useMemo(");
    expect(dockSrc).toContain("[isGcStaff, workspace, homeOwned],");
    expect(lock).toContain("**G15.**");
  });

  it("G16: the tracker runs below md only", () => {
    expect(HOUSE_PHONE_CHROME_MEDIA).toBe("not all and (min-width: 48rem)");
    expect(trackerSrc).toContain("window.matchMedia(HOUSE_PHONE_CHROME_MEDIA)");
    expect(trackerSrc).toContain("if (!root || !phone) return undefined;");
    expect(trackerSrc).toContain("}, [pathname, rootRef, phone]);");
    expect(trackerSrc).toContain("const live = phone && chrome.path === pathname ? chrome :");
    expect(lock).toContain("**G16.**");
  });

  it("every listener the tracker and the runtime add, they remove with the same capture", () => {
    const wiring = /\.(add|remove)EventListener\(\s*("[^"]+"|[A-Za-z_][\w.]*)\s*,\s*([A-Za-z_]\w*)\s*(?:,\s*(\{[^}]*\}))?\s*\)/g;
    for (const [name, src] of [
      ["tracker", trackerSrc],
      ["runtime", runtimeSrc],
    ] as const) {
      const adds: string[] = [];
      const removes: string[] = [];
      for (const match of src.matchAll(wiring)) {
        const [, kind, type, handler, options = ""] = match;
        const key = `${type} ${handler} capture=${/capture:\s*true/.test(options)}`;
        (kind === "add" ? adds : removes).push(key);
      }
      expect(adds.length, name).toBeGreaterThan(0);
      expect([...removes].sort(), name).toEqual([...adds].sort());
    }
  });
});
