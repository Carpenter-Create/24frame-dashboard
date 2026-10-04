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
    expect(dark).toMatch(/--surface:\s*#1e2126;/);
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
    expect(globals).toMatch(/@theme inline \{[\s\S]*?--color-accent-ink:\s*var\(--accent-ink\);[\s\S]*?\}/);
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
