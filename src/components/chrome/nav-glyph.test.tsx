import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { HOUSE_DEST_RAIL_GLYPH_CLASS } from "@/lib/house-shell";
import { NAV, SOCIAL_NAV, type HouseAiNavItem } from "@/lib/nav";
import { NavGlyph } from "./nav-glyph";

const src = readFileSync("src/components/chrome/nav-glyph.tsx", "utf8");

describe("NavGlyph", () => {
  // H register (Adam 2026-10-05): 24 glyph, Phosphor Regular idle / Fill
  // current (the board's filled icon) — never Bold.
  it("renders the side-menu Phosphor glyph filled when current and Regular when idle, at 24", () => {
    const active = renderToStaticMarkup(<NavGlyph item={NAV[0]} active />);
    const idle = renderToStaticMarkup(<NavGlyph item={NAV[0]} active={false} />);
    const Glyph = NAV[0].icon;
    const bold = renderToStaticMarkup(<Glyph weight="bold" className={HOUSE_DEST_RAIL_GLYPH_CLASS} />);
    const regular = renderToStaticMarkup(<Glyph weight="regular" className={HOUSE_DEST_RAIL_GLYPH_CLASS} />);
    const fill = renderToStaticMarkup(<Glyph weight="fill" className={HOUSE_DEST_RAIL_GLYPH_CLASS} />);
    expect(active).toBe(fill);
    expect(idle).toBe(regular);
    expect(active).not.toBe(bold);
    expect(active).toContain(HOUSE_DEST_RAIL_GLYPH_CLASS);
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
