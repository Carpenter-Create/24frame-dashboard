import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { NAV, SOCIAL_NAV, type HouseAiNavItem } from "@/lib/nav";
import { NavGlyph } from "./nav-glyph";

const src = readFileSync("src/components/chrome/nav-glyph.tsx", "utf8");

describe("NavGlyph", () => {
  // Screening chrome: 18 glyph, Phosphor Regular idle / Bold current
  // (the board's stroke 1.7 / 2) — never Fill.
  it("renders the side-menu Phosphor glyph Bold when current and Regular when idle, at 18", () => {
    const active = renderToStaticMarkup(<NavGlyph item={NAV[0]} active />);
    const idle = renderToStaticMarkup(<NavGlyph item={NAV[0]} active={false} />);
    const Glyph = NAV[0].icon;
    const bold = renderToStaticMarkup(<Glyph weight="bold" className="size-4.5 shrink-0" />);
    const regular = renderToStaticMarkup(<Glyph weight="regular" className="size-4.5 shrink-0" />);
    const fill = renderToStaticMarkup(<Glyph weight="fill" className="size-4.5 shrink-0" />);
    expect(active).toBe(bold);
    expect(idle).toBe(regular);
    expect(active).not.toBe(fill);
    expect(active).toContain("size-4.5 shrink-0");
    expect(active).toContain('fill="currentColor"');
    expect(idle).toContain('fill="currentColor"');
    expect(active).not.toContain("lucide-");
    expect(idle).not.toContain("lucide-");
    expect(active).not.toContain("stroke-width");
    expect(src).toContain("houseDestRailGlyphWeight(active)");
    expect(src).not.toContain('item.family === "lucide"');
    expect(src).toContain('item.family === "house-ai"');
    expect(src).toContain("HouseAiMark");
  });

  it("renders the house AI mark for the overlay family — not a rail dest", () => {
    expect(NAV.every((item) => item.family === "phosphor")).toBe(true);
    const ask: HouseAiNavItem = { label: "Ask 24Frame AI", href: "?ai=1", family: "house-ai" };
    const html = renderToStaticMarkup(<NavGlyph item={ask} active={false} />);
    expect(html).toContain("data-house-ai-mark");
    expect(html).toContain('fill="currentColor"');
    expect(html).toContain("size-4");
    expect(html).not.toContain("lucide-");
    expect(html).not.toContain("stroke-width");
  });

  it("renders SOCIAL_NAV dests as house Phosphor, not Lucide", () => {
    const html = renderToStaticMarkup(<NavGlyph item={SOCIAL_NAV[0]} active />);
    expect(html).not.toContain("lucide-");
    expect(html).not.toContain("stroke-width");
    expect(html).toContain('fill="currentColor"');
    expect(src).not.toContain("strokeWidth={1.33}");
  });
});
