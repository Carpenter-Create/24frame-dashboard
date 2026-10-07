import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { HOUSE_LEAD_CHROME_CLASS } from "./house-lead-chrome";
import { HOUSE_RAIL_BRAND_BAND_CLASS, HOUSE_RAIL_BRAND_BAND_COLLAPSED_CLASS } from "./house-shell";
import { OVERVIEW_AREA_NEWS_CLASS } from "./overview";

// The header's height hangs off one token, one value on desktop and phone
// (founder 2026-10-07: "Header height locked: 56 (match Facebook),
// shell-wide." and "Phone header → 56 same as desktop."; the cards lock §8
// Header height). Its value is pinned once, in src/app/tokens.test.ts;
// this file reads it from tokens.css and checks that everything hanging
// off the header reads the token, and that no source re-types the height.
// (Class names are assembled, not spelled: Tailwind scans this file.)

const tokens = readFileSync("src/app/tokens.css", "utf8");

const TOKEN = "var(--header-height)";

/** The px values `--header-height` takes, from tokens.css (one since the
 *  phone header matched desktop; a phone override would add a second). */
function headerHeights(): number[] {
  const values = [...tokens.matchAll(/--header-height:\s*(\d+(?:\.\d+)?)px;/g)].map((m) => Number(m[1]));
  if (values.length === 0) throw new Error("--header-height has no px value in tokens.css");
  return [...new Set(values)];
}

/** A token's first px value in tokens.css (the desktop :root value). */
function tokenPx(name: string): number {
  const match = tokens.match(new RegExp(`--${name}:\\s*(\\d+(?:\\.\\d+)?)px;`));
  if (!match) throw new Error(`--${name} has no px value in tokens.css`);
  return Number(match[1]);
}

/** The phone block's px value for a token. */
function phonePx(name: string): number {
  const block = tokens.slice(tokens.indexOf("@media (max-width: 767px)"));
  const match = block.match(new RegExp(`--${name}:\\s*(\\d+(?:\\.\\d+)?)px;`));
  if (!match) throw new Error(`--${name} has no phone px value in tokens.css`);
  return Number(match[1]);
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** A header height written as a length: 56px or 3.5rem (16 per rem). */
function lengthPattern(heights: number[]): RegExp {
  const forms = heights.flatMap((px) => [`${px}px`, `${px / 16}rem`]);
  return new RegExp(`(?<![\\w.])(?:${forms.map(escape).join("|")})(?![\\w])`);
}

/** A header height as a Tailwind spacing step (4 per step): 14 for 56. */
function stepPattern(heights: number[]): string {
  return heights.map((px) => escape(String(px / 4))).join("|");
}

/** Every non-test source under src: .ts, .tsx and .css. */
function sources(dir = "src"): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sources(path));
    else if (/\.(?:ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(path);
  }
  return out;
}

/** Source without comments (a comment may name the token or a number). */
function code(path: string): string {
  const src = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return path.endsWith(".css") ? src : src.replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Bracketed arbitrary values and calc() bodies on a line. */
function expressions(line: string): string[] {
  const out: string[] = [];
  for (const open of ["[", "calc("]) {
    let at = line.indexOf(open);
    while (at >= 0) {
      let depth = 0;
      let end = at;
      for (; end < line.length; end += 1) {
        const ch = line[end];
        if (ch === "[" || ch === "(") depth += 1;
        else if (ch === "]" || ch === ")") {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      out.push(line.slice(at, end + 1));
      at = line.indexOf(open, at + 1);
    }
  }
  return out;
}

/** Lines that re-type a header height where the header's height is meant. */
function retypedHeaderHeights(heights: number[]): string[] {
  const length = lengthPattern(heights);
  const steps = stepPattern(heights);
  const viewport = /\d(?:dvh|svh|lvh|vh)\b/;
  const pinned = /(?:^|[\s"'`])(?:[\w@[\]&:-]*:)?(?:sticky|fixed)(?=$|[\s"'`])|position:\s*(?:sticky|fixed)/;
  const offset = "-?(?:top|inset-y|inset|scroll-m[ty]?|scroll-p[ty]?)-";
  const offsetStep = new RegExp(`(?:^|[\\s"'\`:])${offset}(?:${steps})(?=$|[\\s"'\`])`);
  const offsetValue = new RegExp(`(?:^|[\\s"'\`:])${offset}(\\[[^\\]]*\\])`, "g");
  const scrollStep = new RegExp(`(?:^|[\\s"'\`:])scroll-[mp][ty]?-(?:${steps})(?=$|[\\s"'\`])`);
  const cssOffset = /(?:^|[\s;{])(?:top|inset(?:-block)?(?:-start)?|scroll-(?:margin|padding)(?:-top|-block|-block-start)?)\s*:\s*([^;}]*)/g;
  const hits: string[] = [];
  for (const path of sources()) {
    if (path === "src/app/tokens.css") continue;
    const src = code(path);
    // Line-based for classes; CSS rules are checked whole (a rule spans lines).
    const units = path.endsWith(".css") ? src.split("}") : src.split("\n");
    units.forEach((unit, i) => {
      const where = `${path}:${path.endsWith(".css") ? `rule ${i + 1}` : i + 1}`;
      // A viewport height less the header, re-typed: calc(100dvh-56px).
      if (expressions(unit).some((expr) => viewport.test(expr) && length.test(expr))) hits.push(where);
      // A scroll margin or padding the header's height.
      if (scrollStep.test(unit)) hits.push(where);
      for (const m of unit.matchAll(offsetValue)) {
        if (/^-?scroll-/.test(m[0].trim().split(":").pop() ?? "") && length.test(m[1]!)) hits.push(where);
      }
      for (const m of unit.matchAll(cssOffset)) {
        if (/scroll-/.test(m[0]) && length.test(m[1]!)) hits.push(where);
      }
      // A sticky or fixed element offset by the header's height.
      if (pinned.test(unit)) {
        if (offsetStep.test(unit)) hits.push(where);
        for (const m of unit.matchAll(offsetValue)) if (length.test(m[1]!)) hits.push(where);
        for (const m of unit.matchAll(cssOffset)) if (length.test(m[1]!)) hits.push(where);
      }
    });
  }
  return [...new Set(hits)];
}

/** The `h-[…]` utility in a class string. */
function heightClass(classes: string): string | undefined {
  return classes.split(/\s+/).find((cls) => /^h-\[/.test(cls));
}

describe("the header height: one token, everything that hangs off it reads it", () => {
  it("the bar and the side menu's top band, open and collapsed, are the same token, so the band stays level with the bar", () => {
    const bar = heightClass(HOUSE_LEAD_CHROME_CLASS);
    expect(bar).toBe(`h-[${TOKEN}]`);
    expect(heightClass(HOUSE_RAIL_BRAND_BAND_CLASS)).toBe(bar);
    expect(heightClass(HOUSE_RAIL_BRAND_BAND_COLLAPSED_CLASS)).toBe(bar);
    // The bar's own floor reads the token too.
    expect(readFileSync("src/components/chrome/house-lead-chrome.tsx", "utf8")).toContain(
      `style={{ minHeight: "${TOKEN}" }}`,
    );
  });

  it("the sticky and full-height offsets under the header subtract the token", () => {
    // Home's News rail pins under the header and fits the viewport below it.
    const news = OVERVIEW_AREA_NEWS_CLASS.split(/\s+/);
    expect(news.find((cls) => cls.includes(":top-["))).toContain(TOKEN);
    expect(news.find((cls) => cls.includes(":max-h-["))).toContain(`100dvh-${TOKEN}`);
    // The Ask gate fits the viewport below the header.
    expect(readFileSync("src/components/messages/access-upgrade-gate.tsx", "utf8")).toContain(
      `calc(100dvh-${TOKEN}-`,
    );
  });

  it("names every consumer of the token: a new one is reviewed here and in the cards lock §8", () => {
    const consumers = sources()
      .filter((path) => path !== "src/app/tokens.css" && code(path).includes("--header-height"))
      .sort();
    expect(consumers).toEqual([
      "src/components/chrome/house-lead-chrome.tsx",
      "src/components/messages/access-upgrade-gate.tsx",
      "src/lib/house-lead-chrome.ts",
      "src/lib/house-shell.ts",
      "src/lib/overview.ts",
    ]);
  });

  it("no source re-types the header's height in a sticky, fixed, scroll-margin or viewport-height rule", () => {
    const heights = headerHeights();
    // One value on desktop and phone, read here, not typed.
    expect(heights).toHaveLength(1);
    expect(retypedHeaderHeights(heights)).toEqual([]);
  });

  it("no source still types a retired bar height there (the H register's 80 and phone 60, the screening 52)", () => {
    // A dependant that types an old height did not follow the token.
    expect(retypedHeaderHeights([80, 60, 52])).toEqual([]);
  });

  it("the sweep catches a re-typed height (self-check on synthetic lines)", () => {
    const length = lengthPattern(headerHeights());
    const [desktop] = headerHeights();
    expect(length.test(`calc(100dvh-${desktop}px)`)).toBe(true);
    expect(length.test(`calc(100dvh-${desktop! / 16}rem)`)).toBe(true);
    expect(length.test(`calc(100dvh-1${desktop}px)`)).toBe(false);
    expect(length.test(`${TOKEN}`)).toBe(false);
    expect(stepPattern(headerHeights()).split("|")).toContain(String(desktop! / 4));
  });

  it("every header control fits inside the bar above its hairline, on desktop and on phone", () => {
    const hairline = 1;
    // The phone bar is the same token (no phone override, tokens.test.ts).
    const bar = tokenPx("header-height") - hairline;
    for (const name of ["header-control-size", "header-desktop-control-size", "header-avatar-size"]) {
      expect(tokenPx(name), name).toBeLessThanOrEqual(bar);
    }
    for (const name of ["header-control-size", "header-avatar-size"]) {
      expect(phonePx(name), name).toBeLessThanOrEqual(bar);
      // Phone targets stay at least 44 (the touch floor, tokens.test.ts).
      expect(phonePx(name), name).toBe(tokenPx("header-control-size"));
    }
  });
});
