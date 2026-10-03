import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS } from "./ask-ai-overlay";
import {
  ASK_FRAME_AI_CLOCK_BUTTON_CLASS,
  MOBILE_CHROME_CLOCK_DOCK_CLASS,
  MOBILE_CHROME_HAMBURGER_BUTTON_CLASS,
  MOBILE_CHROME_ICON_BUTTON_CLASS,
  MOBILE_CHROME_ICON_CLASS,
  MOBILE_CHROME_ICON_GLYPH_PX,
  MOBILE_CHROME_ICON_HIT_PX,
  MOBILE_CHROME_LEAD_PAD_CLASS,
  MOBILE_CHROME_LEAD_PAD_PX,
  MOBILE_CHROME_MESSAGES_FRAME_PAD_PX,
  MOBILE_CHROME_SHEET_PAD_PX,
  mobileChromeClockDockOffsetPx,
  mobileChromeGlyphCenterPx,
} from "./mobile-chrome";

const here = dirname(fileURLToPath(import.meta.url));
const tokens = readFileSync(join(here, "../app/tokens.css"), "utf8");
const shellSrc = readFileSync(join(here, "../components/chrome/app-shell.tsx"), "utf8");
const overlaySrc = readFileSync(join(here, "../components/chrome/ask-ai-overlay.tsx"), "utf8");
const leadLibSrc = readFileSync(join(here, "house-lead-chrome.ts"), "utf8");
const destsSrc = readFileSync(join(here, "../components/chrome/house-phone-bottom-nav.tsx"), "utf8");
const landingSrc = readFileSync(join(here, "../components/messages/ask-frame-ai-landing.tsx"), "utf8");
const historySrc = readFileSync(join(here, "../components/messages/ask-frame-ai-history.tsx"), "utf8");
const threadSrc = readFileSync(join(here, "../components/messages/ask-frame-ai-thread.tsx"), "utf8");

describe("mobile chrome clock lock", () => {
  it("shares lead inset, 44 hit, and 16 glyph for the 24Frame AI clock", () => {
    expect(tokens).toMatch(/--space-6:\s*1\.5rem/);
    expect(tokens).toMatch(/--content-inset:\s*48px;/);
    expect(MOBILE_CHROME_LEAD_PAD_PX).toBe(24);
    expect(MOBILE_CHROME_MESSAGES_FRAME_PAD_PX).toBe(48);
    expect(MOBILE_CHROME_ICON_HIT_PX).toBe(44);
    expect(MOBILE_CHROME_ICON_GLYPH_PX).toBe(16);

    expect(MOBILE_CHROME_LEAD_PAD_CLASS).toBe("px-[var(--space-6)]");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).toContain("size-[44px]");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).toContain("min-h-[44px]");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).toContain("min-w-[44px]");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).toContain("overflow-visible");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).toContain("text-ink-3");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).toContain("rounded-full");
    expect(MOBILE_CHROME_ICON_BUTTON_CLASS).not.toContain("bg-surface-muted");
    expect(MOBILE_CHROME_ICON_CLASS).toBe("size-4 overflow-visible");

    expect(MOBILE_CHROME_HAMBURGER_BUTTON_CLASS).toContain(MOBILE_CHROME_ICON_BUTTON_CLASS);
    expect(MOBILE_CHROME_HAMBURGER_BUTTON_CLASS).toContain("md:hidden");
    expect(ASK_FRAME_AI_CLOCK_BUTTON_CLASS).toContain(MOBILE_CHROME_ICON_BUTTON_CLASS);
    expect(ASK_FRAME_AI_CLOCK_BUTTON_CLASS).toContain("md:size-4");
    expect(ASK_FRAME_AI_CLOCK_BUTTON_CLASS).toContain("md:min-h-4");
    expect(ASK_FRAME_AI_CLOCK_BUTTON_CLASS).toContain("md:min-w-4");

    expect(MOBILE_CHROME_SHEET_PAD_PX).toBe(16);
    expect(mobileChromeClockDockOffsetPx()).toBe(16);
    expect(mobileChromeClockDockOffsetPx()).toBeGreaterThan(0);
    expect(MOBILE_CHROME_CLOCK_DOCK_CLASS).toContain("max-md:left-[var(--space-4)]");
    expect(MOBILE_CHROME_CLOCK_DOCK_CLASS).not.toContain("--content-inset");
    expect(MOBILE_CHROME_CLOCK_DOCK_CLASS).not.toContain("calc(");
    expect(ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS).toBe(MOBILE_CHROME_CLOCK_DOCK_CLASS);

    const clockCenter = mobileChromeGlyphCenterPx(mobileChromeClockDockOffsetPx());
    expect(mobileChromeGlyphCenterPx(MOBILE_CHROME_LEAD_PAD_PX)).toBe(46);
    expect(clockCenter).toBe(38);
    expect(clockCenter).toBeGreaterThan(mobileChromeClockDockOffsetPx());
  });

  it("is consumed by the 24Frame AI clock, not dest chips or the thread", () => {
    expect(leadLibSrc).toContain("HOUSE_LEAD_PHONE_PAD_CLASS");
    expect(leadLibSrc).toContain("HOUSE_PHONE_TRAILING_GUTTER_CLASS");
    expect(leadLibSrc).toContain("HOUSE_SHELL_GUTTER_X_CLASS");
    expect(shellSrc).toContain("AskAiOverlayProvider");
    expect(shellSrc).not.toContain('data-app-messages-frame=""');
    expect(overlaySrc).toContain("AskFrameAiLanding");

    expect(destsSrc).not.toContain("MOBILE_CHROME_HAMBURGER_BUTTON_CLASS");
    expect(destsSrc).not.toContain("data-mobile-nav-trigger");
    expect(destsSrc).toContain("data-house-phone-bottom-nav");

    expect(landingSrc).not.toContain("ASK_FRAME_AI_CLOCK_BUTTON_CLASS");
    expect(landingSrc).not.toContain("MOBILE_CHROME_CLOCK_DOCK_CLASS");
    expect(landingSrc).not.toContain("ASK_AI_OVERLAY_PHONE_CLOCK_DOCK_CLASS");
    expect(landingSrc).not.toContain("data-ask-frame-ai-clock");
    expect(landingSrc).toContain("ASK_AI_OVERLAY_PHONE_SCROLL_CLASS");
    expect(landingSrc).not.toContain("absolute left-0 top-0");
    expect(overlaySrc).toContain("AskFrameAiHistoryClock");
    expect(overlaySrc).not.toContain("MOBILE_CHROME_CLOCK_DOCK_CLASS");
    expect(historySrc).toContain("AskFrameAiHistoryClock");
    expect(historySrc).toContain("data-ask-frame-ai-clock");
    expect(historySrc).toContain("MOBILE_CHROME_ICON_BUTTON_CLASS");
    expect(historySrc).toContain("MOBILE_CHROME_ICON_CLASS");
    expect(historySrc).toContain("PHOSPHOR_CHROME_IDLE_WEIGHT");

    expect(threadSrc).not.toContain("data-ask-frame-ai-clock");
    expect(threadSrc).not.toContain("MOBILE_CHROME_CLOCK_DOCK_CLASS");
  });
});
