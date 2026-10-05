import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("one icon SoT (P2-2 rematch)", () => {
  it("drops lucide-react; house Phosphor is the only icon package", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.["lucide-react"]).toBeUndefined();
    expect(pkg.devDependencies?.["lucide-react"]).toBeUndefined();
    expect(pkg.dependencies?.["@phosphor-icons/react"]).toBeTruthy();

    const nav = readFileSync("src/lib/nav.ts", "utf8");
    expect(nav).not.toContain("lucide-react");
    expect(nav).not.toContain('family: "lucide"');
    expect(nav).toContain('family: "phosphor"');

    const glyph = readFileSync("src/components/chrome/nav-glyph.tsx", "utf8");
    expect(glyph).not.toContain("lucide");
    // Side-menu glyphs are the nav item's own Phosphor icon at the
    // rail weights (screening chrome: Regular idle / Bold current).
    expect(glyph).toContain("const Glyph = item.icon;");
    expect(glyph).toContain("houseDestRailGlyphWeight");
  });

  it("RSC glyph renders import Phosphor SSR, not the context entry", () => {
    const rscGlyphFiles = [
      "src/components/ui/page-header.tsx",
      "src/components/titles/titles-catalog.tsx",
      "src/components/layout/title-hero.tsx",
      "src/components/dashboard/dashboard-home.tsx",
      "src/components/dashboard/dashboard-licensing-status.tsx",
      "src/app/(app)/(operator)/staff/channels/page.tsx",
    ];
    for (const path of rscGlyphFiles) {
      const src = readFileSync(path, "utf8");
      expect(src, path).toContain('from "@phosphor-icons/react/ssr"');
      expect(src, path).not.toMatch(/from ["']@phosphor-icons\/react["']/);
      expect(src, path).not.toContain("lucide-react");
    }
  });
});
