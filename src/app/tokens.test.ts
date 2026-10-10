import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const globals = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

type Rgb = [number, number, number];

function hex(block: string, name: string): Rgb {
  const m = block.match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6});`));
  if (!m) throw new Error(`missing hex --${name}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// The first hex a block declares for a token: what other tests' fill parses read.
function firstHex(block: string, name: string): string | undefined {
  return block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6});`))?.[1];
}

const linear = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

function luminance([r, g, b]: Rgb): number {
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --accent-wash = color-mix(in srgb, var(--accent) 10%, var(--surface)).
function wash(accent: Rgb, surface: Rgb): Rgb {
  return accent.map((c, i) => 0.1 * c + 0.9 * surface[i]) as Rgb;
}

// OKLCH (Ottosson) for the same-hue check.
function oklch(rgb: Rgb): { l: number; c: number; h: number } {
  const [r, g, b] = rgb.map(linear);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  return { l: L, c: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((p) => /\.(ts|tsx)$/.test(p) && !/\.test\.(ts|tsx)$/.test(p))
    .map((p) => `${dir}/${p}`);
}

// The @theme inline map with comments taken out, so a mapping counts only
// where Tailwind reads it.
function themeMap(): string {
  return extractBlock(globals, "@theme inline").replace(/\/\*[\s\S]*?\*\//g, "");
}

function extractBlock(css: string, selector: string): string {
  const marker = `${selector} {`;
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`missing ${selector}`);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}") {
      depth--;
      if (depth === 0) return css.slice(start, i + 1);
    }
  }
  throw new Error(`unclosed ${selector}`);
}

describe("house accent — one token, mode flip", () => {
  const light = extractBlock(tokens, ":root");
  const dark = extractBlock(tokens, ".dark");

  it("keeps Sporty Blue on light :root", () => {
    expect(light).toMatch(/--accent:\s*#1769ff;/);
    // Negative accent guards elsewhere read the first declaration in the file.
    expect(tokens.match(/--accent:\s*(#[0-9a-fA-F]{6});/)?.[1]).toBe("#1769ff");
    expect(light).toMatch(/--accent-contrast:\s*#ffffff;/);
    expect(light).toContain("color-mix(in srgb, var(--accent) 10%, var(--surface))");
    expect(light).not.toMatch(/#70b5f9/i);
    expect(light).not.toMatch(/#3ea6ff/i);
  });

  it("flips dark --accent to LinkedIn soft and ink contrast", () => {
    // Adam lock 2026-09-22. White on #70b5f9 is 2.17:1 (fails AA).
    // #0A0B0D on the fill is 9.06:1. Canvas is YouTube near-black.
    expect(dark).toMatch(/--accent:\s*#70b5f9;/);
    expect(dark).toMatch(/--accent-contrast:\s*#0A0B0D;/);
    expect(dark).toMatch(/--bg:\s*#0f0f0f;/);
    expect(dark).not.toMatch(/--bg:\s*#050835;/);
    // First declaration in the block: social-post-register reads it for the
    // grey card's fill. Dark muted stays the house ramp
    // (shell-screening-chrome-lock-v1, Departure 4).
    expect(firstHex(dark, "surface")).toBe("#1e2126");
    expect(firstHex(dark, "surface-muted")).toBe("#25292f");
    expect(dark).not.toMatch(/--accent:\s*#1769ff;/);
    expect(dark).not.toMatch(/--accent:\s*#3ea6ff;/i);
    expect(dark).not.toMatch(/--accent-wash:/);
    expect(tokens.match(/--accent:/g)).toHaveLength(2);
  });
});

describe("accent ink on the wash (founder pick \"Deeper blue text\", Adam 2026-10-04)", () => {
  const light = extractBlock(tokens, ":root");
  const dark = extractBlock(tokens, ".dark");
  const accent = hex(light, "accent");
  const surface = hex(light, "surface");
  const ink = hex(light, "accent-ink");
  const lightWash = wash(accent, surface);

  it("adds one deeper Sporty Blue for text on the wash; dark maps it back to --accent", () => {
    expect(light).toMatch(/--accent-ink:\s*#0a5ff5;/);
    expect(light).toContain('Founder pick "Deeper blue text" (Adam 2026-10-04)');
    expect(light).toContain("On the wash 4.62:1 (--accent was 4.07:1)");
    expect(light).toContain("on white 5.29:1");
    expect(dark).toMatch(/--accent-ink:\s*var\(--accent\);/);
    expect(dark).toContain("6.17:1");
    expect(tokens.match(/--accent-ink:/g)).toHaveLength(2);
    // Tailwind mapping: text-accent-ink flips with .dark like every token.
    expect(themeMap()).toMatch(/--color-accent-ink:\s*var\(--accent-ink\);/);
  });

  it("reaches 4.6:1 on the light wash and 4.5:1 on white, where Sporty Blue is 4.07:1", () => {
    expect(contrast(accent, lightWash)).toBeLessThan(4.5);
    expect(contrast(accent, lightWash)).toBeCloseTo(4.07, 2);
    expect(contrast(ink, lightWash)).toBeGreaterThanOrEqual(4.6);
    expect(contrast(ink, lightWash)).toBeCloseTo(4.62, 2);
    // The browser paints the wash at 8 bits; it must pass there too.
    expect(contrast(ink, lightWash.map(Math.round) as Rgb)).toBeGreaterThanOrEqual(4.6);
    expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink, [255, 255, 255])).toBeCloseTo(5.29, 2);
  });

  it("is the same hue and chroma, only darker, and the smallest such step", () => {
    const a = oklch(accent);
    const k = oklch(ink);
    expect(Math.abs(k.h - a.h)).toBeLessThan(0.25);
    expect(Math.abs(k.c - a.c)).toBeLessThan(0.002);
    expect(k.l).toBeLessThan(a.l);
    expect(a.l - k.l).toBeLessThan(0.03);
    // One 8-bit green step lighter at the same hue misses 4.6:1.
    const lighter: Rgb = [ink[0], ink[1] + 1, ink[2]];
    expect(contrast(lighter, lightWash)).toBeLessThan(4.6);
  });

  it("keeps dark text on the dark wash above 4.5:1", () => {
    const darkWash = wash(hex(dark, "accent"), hex(dark, "surface"));
    expect(contrast(hex(dark, "accent"), darkWash)).toBeCloseTo(6.17, 2);
  });

  it("never pairs the wash, or a light Sporty tint that paints like it, with Sporty Blue ink in source", () => {
    // bg-accent/10 over white paints (232,240,255), the wash itself (voice
    // mic recording state). Any bg-accent tint up to 20% counts as the wash.
    const washFill = /bg-accent(?:-wash(?![\w-])|\/(?:[1-9]|1\d|20)(?!\d))/;
    expect(washFill.test("bg-accent/10 text-accent-ink ring-2 ring-accent")).toBe(true);
    expect(washFill.test("bg-accent/70")).toBe(false);
    const offenders: string[] = [];
    for (const file of sourceFiles("src")) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (!washFill.test(line)) return;
          if (/(?:^|[\s"'`:])text-accent(?=[\s"'`]|$)/.test(line)) offenders.push(`${file}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});

// Shell, width, gutter and dock tokens: the one value pin per token. Other
// tests read or name these tokens; they do not re-type the values.
// docs/design-locks/shell-coinbase-register-lock-v1.md (side menu 240 / 80,
// controls 44), docs/design-locks/social-feed-cards-lock-v1.md §8 Header
// height (the header 56 on desktop and phone, founder 2026-10-07: "Header
// height locked: 56 (match Facebook), shell-wide." and "Phone header → 56
// same as desktop."),
// docs/design-locks/shell-desktop-horizontal-gutter-lock-v2.md (32 / 32),
// src/lib/HOME-width-lock.md (1376).
describe("danger ink (founder pick, Adam 2026-10-10: \"Yes, change that.\")", () => {
  const light = extractBlock(tokens, ":root");
  const dark = extractBlock(tokens, ".dark");

  it("adds one --danger per mode and maps text-danger onto it", () => {
    expect(light).toMatch(/--danger:\s*#bc4a3d;/);
    expect(dark).toMatch(/--danger:\s*#cf776d;/);
    expect(tokens.match(/--danger:/g)).toHaveLength(2);
    expect(light.replace(/\s+/g, " ")).toContain('"Yes, change that."');
    expect(themeMap()).toMatch(/--color-danger:\s*var\(--danger\);/);
  });

  // The surfaces a destructive row or button sits on: the page, a card or
  // sheet, and the muted row fill / hover.
  it("reads AA (4.5:1) on every light surface, where #c4564a did not", () => {
    const danger = hex(light, "danger");
    const old = hex(":root { --old: #c4564a; }", "old");
    for (const name of ["bg", "surface", "surface-muted"]) {
      expect(contrast(danger, hex(light, name))).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(old, hex(light, "surface-muted"))).toBeLessThan(4.5);
    expect(contrast(danger, hex(light, "bg"))).toBeCloseTo(5.02, 2);
    expect(contrast(danger, hex(light, "surface-muted"))).toBeCloseTo(4.57, 2);
  });

  it("reads AA (4.5:1) on every dark surface, where #c4564a did not", () => {
    const danger = hex(dark, "danger");
    const old = hex(":root { --old: #c4564a; }", "old");
    for (const name of ["bg", "surface", "surface-muted"]) {
      expect(contrast(danger, hex(dark, name))).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(old, hex(dark, "surface-muted"))).toBeLessThan(4.5);
    expect(contrast(danger, hex(dark, "bg"))).toBeCloseTo(5.94, 2);
    expect(contrast(danger, hex(dark, "surface-muted"))).toBeCloseTo(4.53, 2);
  });

  it("keeps the old red's hue: a darker step on light, a lighter one on dark", () => {
    const base = oklch(hex(":root { --old: #c4564a; }", "old"));
    const lightInk = oklch(hex(light, "danger"));
    const darkInk = oklch(hex(dark, "danger"));
    expect(Math.abs(lightInk.h - base.h)).toBeLessThan(3);
    expect(Math.abs(darkInk.h - base.h)).toBeLessThan(3);
    expect(lightInk.l).toBeLessThan(base.l);
    expect(darkInk.l).toBeGreaterThan(base.l);
  });

  it("leaves no raw danger red in source: every danger ink is the token", () => {
    // The old red and both new values, anywhere in code or CSS.
    const red = /#(c4564a|bc4a3d|cf776d)\b/gi;
    for (const file of sourceFiles("src")) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(red);
    }
    const uncommented = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(uncommented(globals)).not.toMatch(red);
    // tokens.css holds the two declarations and nothing else red.
    expect(uncommented(tokens).match(red)).toEqual(["#bc4a3d", "#cf776d"]);
  });
});

describe("shell tokens — one value pin each", () => {
  const light = extractBlock(tokens, ":root");
  const phone = extractBlock(tokens, "@media (max-width: 767px)");

  it("pins the header (one value, desktop and phone), side menu, and width tokens", () => {
    // 56 on desktop and phone (cards lock §8 Header height): one
    // declaration, on :root; the phone block does not override it. The H
    // register's 80 and phone 60, and the screening bar's 52, are gone.
    expect(light).toMatch(/--header-height:\s*56px;/);
    expect(tokens.match(/--header-height:/g)).toHaveLength(1);
    expect(tokens).not.toMatch(/--header-height:\s*80px;/);
    expect(tokens).not.toMatch(/--header-height:\s*60px;/);
    expect(tokens).not.toMatch(/--header-height:\s*52px;/);
    // 44 is the touch-target floor for every header control and the avatar.
    expect(light).toMatch(/--header-avatar-size:\s*44px;/);
    expect(light).toMatch(/--header-control-size:\s*44px;/);
    expect(light).toMatch(/--header-desktop-control-size:\s*44px;/);
    expect(light).toMatch(/--header-search-height:\s*48px;/);
    expect(light).toMatch(/--sidebar-width:\s*240px;/);
    // social-home-lock reads the first declaration in the file.
    expect(tokens.match(/--sidebar-width:\s*(\d+)px;/)?.[1]).toBe("240");
    expect(light).toMatch(/--sidebar-width-collapsed:\s*80px;/);
    expect(light).toMatch(/--access-rail-width:\s*var\(--sidebar-width\);/);
    expect(light).toMatch(/--home-content-width:\s*1376px;/);
    expect(tokens).not.toMatch(/--home-content-width:\s*1364px;/);
  });

  it("pins the gutters, the page inset, and the phone dock clearance", () => {
    expect(light).toMatch(/--chrome-gutter:\s*16px;/);
    expect(light).toMatch(/--shell-gutter-inline-start:\s*32px;/);
    expect(light).toMatch(/--shell-gutter-inline-end:\s*32px;/);
    // social-home-lock reads the first declaration in the file.
    expect(tokens.match(/--shell-gutter-inline-end:\s*(\d+)px;/)?.[1]).toBe("32");
    expect(light).toMatch(/--content-inset:\s*48px;/);
    expect(light).toContain(
      "--house-phone-dock-clearance: calc(3.5rem + max(16px, env(safe-area-inset-bottom)) + var(--space-4));",
    );
  });

  it("pins the phone overrides: no rail slot, 44 controls; the bar keeps the one 56", () => {
    expect(phone).toMatch(/--sidebar-width:\s*0px;/);
    expect(phone).toMatch(/--sidebar-width-collapsed:\s*0px;/);
    expect(phone).toMatch(/--access-rail-width:\s*0px;/);
    // "Phone header → 56 same as desktop.": no phone override.
    expect(phone).not.toContain("--header-height");
    expect(phone).toMatch(/--header-avatar-size:\s*44px;/);
    expect(phone).toMatch(/--header-control-size:\s*44px;/);
    expect(phone).toMatch(/--header-search-height:\s*44px;/);
  });
});

// Accent, type and surface tokens: the one value pin per token (--accent and
// the dark surfaces are pinned above). Other tests read or name these tokens;
// they do not re-type the values. Negative accent guards elsewhere read
// --accent from tokens.css, so they follow the pending GC accent checkpoint.
describe("accent, type and surface tokens — one value pin each", () => {
  const light = extractBlock(tokens, ":root");

  it("pins the light canvas, surfaces, ink, card radius, and the accent wash", () => {
    expect(light).toMatch(/--bg:\s*#ffffff;/);
    // First declaration in the block: social-post-register reads it for the
    // grey card's fill.
    expect(firstHex(light, "surface")).toBe("#ffffff");
    expect(firstHex(light, "surface-muted")).toBe("#f4f4f6");
    expect(light).toMatch(/--text:\s*#0A0B0D;/);
    expect(light).toMatch(/--text-tertiary:\s*#6B7280;/);
    expect(light).toMatch(
      /--accent-wash:\s*color-mix\(in srgb, var\(--accent\) 10%, var\(--surface\)\);/,
    );
    expect(light).toMatch(/--radius-lg:\s*16px;/);
    expect(tokens).not.toMatch(/--radius-lg:\s*14px;/);
    expect(globals).toMatch(/\.card-surface\s*\{[^}]*border-radius:\s*var\(--radius-lg\)/);
    expect(globals).toMatch(/\.card-surface\s*\{[^}]*box-shadow:\s*none/);
  });

  it("pins the rem type ladder and the role sizes", () => {
    expect(light).toMatch(/--text-xs:\s*0\.8125rem;/);
    expect(light).toMatch(/--text-sm:\s*0\.9375rem;/);
    expect(light).toMatch(/--text-base:\s*1\.0625rem;/);
    expect(light).toMatch(/--text-lg:\s*1\.25rem;/);
    expect(light).toMatch(/--text-title:\s*1\.75rem;/);
    expect(light).toMatch(/--text-hero:\s*3\.5rem;/);
    expect(globals).toMatch(/\.t-title\s*\{[^}]*font-size:\s*var\(--text-title\)/);
    expect(globals).toMatch(/\.t-heading\s*\{[^}]*font-size:\s*var\(--text-lg\)/);
    expect(globals).toMatch(/\.t-body\s*\{[^}]*font-size:\s*var\(--text-base\)/);
    expect(globals).toMatch(/\.t-body-sm\s*\{[^}]*font-size:\s*var\(--text-sm\)/);
    expect(globals).toMatch(/\.t-control\s*\{[^}]*font-size:\s*16px/);
  });
});

// Spacing steps other tests name (8/16/24/32/48): the one value pin per step.
// Other tests assert the classes that use var(--space-N); they do not re-type the values.
describe("spacing tokens — one value pin each", () => {
  const light = extractBlock(tokens, ":root");

  it("pins the 4px-base spacing steps", () => {
    expect(light).toMatch(/--space-2:\s*0\.5rem;/);
    expect(light).toMatch(/--space-4:\s*1rem;/);
    expect(light).toMatch(/--space-6:\s*1\.5rem;/);
    expect(light).toMatch(/--space-8:\s*2rem;/);
    expect(light).toMatch(/--space-12:\s*3rem;/);
  });
});
