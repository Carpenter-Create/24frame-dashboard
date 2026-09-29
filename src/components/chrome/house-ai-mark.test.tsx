import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HOUSE_AI_MARK_PATHS,
  HOUSE_AI_MARK_REGULAR_STROKE_WIDTH,
  HOUSE_AI_MARK_SRC,
  HOUSE_AI_MARK_VIEWBOX,
  HOUSE_AI_MARK_VIEWBOX_SIZE,
} from "@/lib/house-ai-mark";
import {
  HOUSE_HEADER_TRAILING_DESKTOP_CLASS,
  HOUSE_HEADER_TRAILING_PHONE_CLASS,
  HOUSE_PHONE_CHROME_IDLE_INK_CLASS,
} from "@/lib/house-phone-shell";
import { PHOSPHOR_CHROME_ICON_CLASS } from "@/lib/phosphor-icon";
import { AskAssistantHeaderLink } from "./ask-assistant-header";
import { HouseAiMark } from "./house-ai-mark";

const svg = readFileSync("public/brand/24frame-ai-mark.svg", "utf8");
const primitiveSrc = readFileSync("src/components/chrome/house-ai-mark.tsx", "utf8");
const headerSrc = readFileSync("src/components/chrome/ask-assistant-header.tsx", "utf8");
const navSrc = readFileSync("src/lib/nav.ts", "utf8");
const glyphSrc = readFileSync("src/components/chrome/nav-glyph.tsx", "utf8");

describe("HouseAiMark", () => {
  it("commits Adam's three-sparkle cluster as the house AI asset", () => {
    expect(existsSync("public/brand/24frame-ai-mark.svg")).toBe(true);
    expect(HOUSE_AI_MARK_SRC).toBe("/brand/24frame-ai-mark.svg");
    expect(svg).toContain(`viewBox="${HOUSE_AI_MARK_VIEWBOX}"`);
    expect(svg).toContain('fill="#000"');
    expect(svg).not.toContain("<rect");
    expect(HOUSE_AI_MARK_PATHS).toHaveLength(3);
    for (const d of HOUSE_AI_MARK_PATHS) {
      expect(svg).toContain(`d="${d}"`);
    }
  });

  it("renders the same paths at chrome idle size with currentColor", () => {
    const html = renderToStaticMarkup(<HouseAiMark />);
    expect(html).toContain("data-house-ai-mark");
    expect(html).toContain('data-house-ai-mark-register="fill"');
    expect(html).toContain(`viewBox="${HOUSE_AI_MARK_VIEWBOX}"`);
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain("stroke-width");
    expect(html).toContain(PHOSPHOR_CHROME_ICON_CLASS);
    expect(html).toContain("size-4");
    expect(html).toContain("shrink-0");
    expect(html.match(/<path /g)?.length).toBe(3);
    for (const d of HOUSE_AI_MARK_PATHS) {
      expect(html).toContain(`d="${d}"`);
    }
    expect(primitiveSrc).toContain("PHOSPHOR_CHROME_ICON_CLASS");
    expect(primitiveSrc).not.toContain("Sparkle");
  });

  it("strokes the same paths at Regular optical for the phone header register", () => {
    // Optical Regular — bumped 25% over pure Phosphor Regular (16 on 256)
    // to compensate for `strokeLinejoin="round"` softening on the sparkle
    // arms' ~59° tips. Still well below Phosphor Bold (24 on 256), so the
    // AI mark sits at Regular-optical parity with the Mercury bar — never
    // Bold, never fill. See src/lib/house-ai-mark.ts for the derivation.
    expect(HOUSE_AI_MARK_REGULAR_STROKE_WIDTH).toBe(
      (20 * HOUSE_AI_MARK_VIEWBOX_SIZE) / 256,
    );
    expect(HOUSE_AI_MARK_REGULAR_STROKE_WIDTH).toBeGreaterThan(
      (16 * HOUSE_AI_MARK_VIEWBOX_SIZE) / 256,
    );
    expect(HOUSE_AI_MARK_REGULAR_STROKE_WIDTH).toBeLessThan(
      (24 * HOUSE_AI_MARK_VIEWBOX_SIZE) / 256,
    );
    const html = renderToStaticMarkup(
      <HouseAiMark className={HOUSE_HEADER_TRAILING_PHONE_CLASS} register="stroke" />,
    );
    expect(html).toContain('data-house-ai-mark-register="stroke"');
    expect(html).toContain('fill="none"');
    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain(`stroke-width="${HOUSE_AI_MARK_REGULAR_STROKE_WIDTH}"`);
    // Phone header trailing renders at 24px, split from the dock's 28px.
    expect(html).toContain("size-6");
    expect(html).not.toContain("size-7");
    expect(html).not.toContain("size-4");
    expect(html).toContain("md:hidden");
    // Ink parity — phone AI stroke rides the bottom-bar idle ink so the
    // sparkles read at the same optical weight as the Mercury Regular
    // glyphs sitting below. Desktop fill keeps HOUSE_THEME_TOGGLE_CLASS.
    expect(html).toContain(HOUSE_PHONE_CHROME_IDLE_INK_CLASS);
    expect(HOUSE_PHONE_CHROME_IDLE_INK_CLASS).toBe("text-ink-2");
    expect(html.match(/<path /g)?.length).toBe(3);
    for (const d of HOUSE_AI_MARK_PATHS) {
      expect(html).toContain(`d="${d}"`);
    }
    expect(html).not.toContain("Sparkle");
  });

  it("is the only 24Frame AI chrome glyph — header and overlay, not the rail", () => {
    expect(headerSrc).toContain("<HouseAiMark");
    expect(headerSrc).toContain('register="stroke"');
    expect(headerSrc).toContain('register="fill"');
    expect(headerSrc).not.toContain("Sparkle");
    expect(navSrc).toContain('family: "house-ai"');
    expect(navSrc).not.toContain('href: "?ai=1"');
    expect(navSrc).not.toContain("Sparkle");
    expect(glyphSrc).toContain("<HouseAiMark");
    expect(glyphSrc).not.toContain("Sparkle");

    const header = renderToStaticMarkup(<AskAssistantHeaderLink />);
    expect(header).toContain("data-ask-assistant-header");
    expect(header).toContain("data-house-ai-mark");
    expect(header).toContain(HOUSE_HEADER_TRAILING_PHONE_CLASS);
    expect(header).toContain(HOUSE_HEADER_TRAILING_DESKTOP_CLASS);
    // Header trailing glyphs share the 24px box. Dock stays off this control.
    expect(header).toContain("size-6");
    expect(header).not.toContain("size-5");
    expect(header).not.toContain("size-7");
    expect(header).not.toContain("size-4");
    expect(header).not.toContain("md:size-5");
    expect(header).toContain('data-house-ai-mark-register="stroke"');
    expect(header).toContain('data-house-ai-mark-register="fill"');
    expect(header).not.toContain("lucide-");
    expect(headerSrc).toContain("HOUSE_HEADER_TRAILING_PHONE_CLASS");
    expect(headerSrc).toContain("HOUSE_HEADER_TRAILING_DESKTOP_CLASS");
  });
});
