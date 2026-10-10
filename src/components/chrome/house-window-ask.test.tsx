import { readFileSync, writeFileSync } from "node:fs";
import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HOUSE_DANGER_INK_CLASS } from "@/lib/house-sheet";
import {
  HOUSE_WINDOW_ASK_ACTIONS_CLASS,
  HOUSE_WINDOW_ASK_PANEL_CLASS,
  HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS,
} from "@/lib/house-window";

import { HouseWindowAsk as ShellAsk } from "./house-window";
import { HouseWindowAsk } from "./house-window-ask";

// The house ask before its move (docs/design-locks/house-dual-host-primitive-audit-v1.md,
// "HouseWindowAsk panel"): the strip and the sheet every window draws today
// are pinned byte for byte in house-window-ask.pin.json, first rendered from
// origin/main before HouseWindowAsk left house-window.tsx. A change meant to
// alter what today's asks draw rewrites the pin and says so in its pull request:
//   UPDATE_HOUSE_WINDOW_ASK_PIN=1 pnpm exec vitest run src/components/chrome/house-window-ask.test.tsx

const PIN_PATH = "src/components/chrome/house-window-ask.pin.json";
const PIN_UPDATE_ENV = "UPDATE_HOUSE_WINDOW_ASK_PIN";

type AskProps = ComponentProps<typeof HouseWindowAsk>;

// The props house-window.test.tsx draws the ask with, and the same with no
// line (Edit caption's ask has none).
const BASE: Omit<AskProps, "variant"> = {
  attr: "w",
  titleId: "t",
  title: "Discard changes?",
  lines: ["Your changes will be lost."],
  keepLabel: "Keep editing",
  discardLabel: "Discard",
  onKeep: () => undefined,
  onDiscard: () => undefined,
};

const CASES: Record<string, AskProps> = {
  strip: { ...BASE, variant: "strip" },
  sheet: { ...BASE, variant: "sheet" },
  "strip-no-line": { ...BASE, lines: [], variant: "strip" },
  "sheet-no-line": { ...BASE, lines: [], variant: "sheet" },
};

function renders(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(CASES).map(([name, props]) => [name, renderToStaticMarkup(<HouseWindowAsk {...props} />)]),
  );
}

describe("HouseWindowAsk: today's asks are pinned", () => {
  const now = renders();
  if (process.env[PIN_UPDATE_ENV] === "1") {
    writeFileSync(PIN_PATH, `${JSON.stringify(now, null, 2)}\n`);
  }
  const pinned = JSON.parse(readFileSync(PIN_PATH, "utf8")) as Record<string, string>;

  it("pins the same cases", () => {
    expect(Object.keys(now)).toEqual(Object.keys(pinned));
  });

  for (const name of Object.keys(pinned)) {
    it(`draws ${name} exactly as before`, () => {
      expect(now[name]).toBe(pinned[name]);
    });
  }
});

describe("HouseWindowAsk: the shell still hands out the one ask", () => {
  it("is re-exported by house-window.tsx, so every caller is unchanged", () => {
    expect(ShellAsk).toBe(HouseWindowAsk);
    const shell = readFileSync("src/components/chrome/house-window.tsx", "utf8");
    expect(shell).toContain('export { HouseWindowAsk } from "./house-window-ask";');
    expect(shell).not.toContain("function HouseWindowAsk(");
  });
});

/** The opening tag that carries `needle`. */
function tagOf(html: string, needle: string): string {
  const at = html.indexOf(needle);
  expect(at, needle).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

describe("HouseWindowAsk: the opt-ins (absent for every ask before them)", () => {
  const panel = (props: Partial<AskProps> = {}) =>
    renderToStaticMarkup(<HouseWindowAsk {...BASE} variant="panel" {...props} />);

  it("draws the panel alone, as its own alertdialog described by its first line", () => {
    const html = panel();
    expect(html).not.toContain("data-house-overlay-host");
    expect(html).not.toContain("app-sheet-scrim-fade");
    const root = tagOf(html, "data-w-discard-ask");
    expect(html.startsWith(root)).toBe(true);
    expect(root).toContain('role="alertdialog"');
    expect(root).toContain('aria-modal="true"');
    expect(root).toContain('aria-labelledby="t"');
    expect(root).toContain('tabindex="-1"');
    expect(root).toContain(`class="${HOUSE_WINDOW_ASK_PANEL_CLASS}"`);
    const lineId = root.match(/aria-describedby="([^"]+)"/)?.[1];
    expect(lineId).toBeTruthy();
    expect(html).toContain(`<p id="${lineId}" class="t-body-sm text-ink-2">Your changes will be lost.</p>`);
    // No line, nothing to describe it.
    expect(tagOf(panel({ lines: [] }), "data-w-discard-ask")).not.toContain("aria-describedby");
  });

  it("puts Keep first in a row at the right, or stacked full width", () => {
    const row = panel({ layout: "row" });
    expect(row).toContain(`class="${HOUSE_WINDOW_ASK_ACTIONS_CLASS}"`);
    expect(row.indexOf("data-w-keep=")).toBeLessThan(row.indexOf('data-w-discard=""'));
    const stack = panel({ layout: "stack" });
    expect(stack).toContain(`class="${HOUSE_WINDOW_ASK_SHEET_ACTIONS_CLASS}"`);
    expect(stack.indexOf("data-w-keep=")).toBeLessThan(stack.indexOf('data-w-discard=""'));
  });

  it("draws a danger action in the house danger ink, on the action only", () => {
    const html = panel({ discardTone: "danger" });
    expect(tagOf(html, 'data-w-discard=""')).toContain(HOUSE_DANGER_INK_CLASS);
    expect(tagOf(html, "data-w-keep=")).not.toContain(HOUSE_DANGER_INK_CLASS);
    expect(panel()).not.toContain(HOUSE_DANGER_INK_CLASS);
  });

  it("waits with both buttons while busy, the action busy", () => {
    const html = panel({ busy: true });
    expect(tagOf(html, "data-w-keep=")).toContain('disabled=""');
    const discard = tagOf(html, 'data-w-discard=""');
    expect(discard).toContain('disabled=""');
    expect(discard).toContain('aria-busy="true"');
    expect(tagOf(html, "data-w-keep=")).not.toContain("aria-busy");
  });

  it("draws a notice after the lines and before the buttons", () => {
    const html = panel({ notice: <span data-notice="">Could not do that.</span> });
    expect(html.indexOf("Your changes will be lost.")).toBeLessThan(html.indexOf("data-notice"));
    expect(html.indexOf("data-notice")).toBeLessThan(html.indexOf("data-w-keep="));
  });
});
