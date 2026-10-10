import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";

import {
  HOUSE_PHONE_DOCK_HIDDEN_ATTR,
  HOUSE_PHONE_SHEET_MOTION_CLASS,
  HOUSE_PHONE_SHEET_SETTLE_ATTR,
} from "./house-lead-chrome";
import { HOUSE_PHONE_SHEET_EASE } from "./house-phone-chrome";
import { HOUSE_PHONE_BOTTOM_NAV_CLASS, HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS } from "./house-phone-shell";

// Band lock v1.5 (Adam 2026-10-09): the phone chrome's marks reach the CSS
// as the installed Tailwind compiles them (C1), so a renamed mark or class
// cannot silently stop the dock hiding or the settle easing.

const TAILWIND = join(process.cwd(), "node_modules", "tailwindcss");

async function build(candidates: string[]): Promise<string> {
  const compiler = await compile('@import "tailwindcss/theme.css";\n@import "tailwindcss/utilities.css";', {
    base: process.cwd(),
    loadStylesheet: async (id: string) => {
      const file = join(TAILWIND, id.replace(/^tailwindcss\//, ""));
      return { path: file, base: TAILWIND, content: readFileSync(file, "utf8") };
    },
  });
  return compiler.build(candidates);
}

const escape = (candidate: string) => candidate.replace(/[^a-zA-Z0-9_-]/g, "\\$&");

/** The compiled rule for one class, braces balanced. */
function rule(css: string, candidate: string): string {
  const start = css.indexOf(`.${escape(candidate)} {`);
  expect(start, candidate).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, i + 1);
  }
  return css.slice(start);
}

const classes = (value: string) => value.split(/\s+/).filter(Boolean);

describe("phone chrome CSS, compiled (band lock v1.5)", () => {
  it("C1: the dock hides from the shell's mark, with the same 200ms transition", async () => {
    const tokens = classes(HOUSE_PHONE_BOTTOM_NAV_HIDE_CLASS);
    expect(tokens).toHaveLength(2);
    const css = await build([...tokens, ...classes(HOUSE_PHONE_BOTTOM_NAV_CLASS)]);
    const where = `:where(*[${HOUSE_PHONE_DOCK_HIDDEN_ATTR}]) &`;
    const translate = rule(css, `in-${HOUSE_PHONE_DOCK_HIDDEN_ATTR}:translate-y-full`);
    expect(translate).toContain(where);
    expect(translate).toContain("--tw-translate-y: 100%;");
    const pointer = rule(css, `in-${HOUSE_PHONE_DOCK_HIDDEN_ATTR}:pointer-events-none`);
    expect(pointer).toContain(where);
    expect(pointer).toContain("pointer-events: none;");
    // The dock's own transition still carries the translate, over 200ms.
    expect(rule(css, "transition-transform")).toMatch(/transition-property:[^;]*translate/);
    expect(rule(css, "duration-200")).toContain("transition-duration: 200ms;");
  });

  it("C1: the bar's settle eases on HOUSE_PHONE_SHEET_EASE for 180ms under the mark, phone only", async () => {
    const tokens = classes(HOUSE_PHONE_SHEET_MOTION_CLASS);
    const css = await build([...tokens, "max-md:ease-out"]);
    const curve = `cubic-bezier(${HOUSE_PHONE_SHEET_EASE.join(",")})`;
    const ease = rule(css, `max-md:ease-[${curve}]`);
    expect(ease).toContain("@media (width < 48rem)");
    expect(ease).toContain(`transition-timing-function: ${curve};`);
    const settle = rule(css, `max-md:in-${HOUSE_PHONE_SHEET_SETTLE_ATTR}:duration-[180ms]`);
    expect(settle).toContain("@media (width < 48rem)");
    expect(settle).toContain(`:where(*[${HOUSE_PHONE_SHEET_SETTLE_ATTR}]) &`);
    expect(settle).toContain("transition-duration: 180ms;");
    // The written-out curve is the one `ease-out` named before v1.5: no visual change.
    expect(rule(css, "max-md:ease-out")).toContain("transition-timing-function: var(--ease-out);");
    const theme = readFileSync(join(TAILWIND, "theme.css"), "utf8");
    expect(theme).toContain(`--ease-out: cubic-bezier(${HOUSE_PHONE_SHEET_EASE.join(", ")});`);
    // The app keeps Tailwind's md breakpoint, so max-md is HOUSE_PHONE_CHROME_MEDIA.
    for (const file of ["src/app/globals.css", "src/app/tokens.css"]) {
      expect(readFileSync(file, "utf8"), file).not.toContain("--breakpoint-md");
    }
  });
});
