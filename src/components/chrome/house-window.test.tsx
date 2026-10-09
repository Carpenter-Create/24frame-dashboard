import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { HouseWindowAsk, HouseWindowFrame, useHouseWindow } from "./house-window";

const shellSrc = readFileSync("src/components/chrome/house-window.tsx", "utf8");

function Host({ face = "index", busy = false, holdOpen = false }: { face?: string; busy?: boolean; holdOpen?: boolean }) {
  const [win, refs] = useHouseWindow({
    attr: "w",
    face,
    indexFace: "index",
    dirty: false,
    busy,
    holdOpen: holdOpen || busy,
    onDone: () => undefined,
    onBack: () => undefined,
    onClose: () => undefined,
    onDiscard: () => undefined,
  });
  return (
    <HouseWindowFrame
      win={win}
      refs={refs}
      title="Metadata"
      motion={null}
      closeLabel="Close"
      backLabel="Back"
      doneLabel="Done"
      closeIcon={<span>x</span>}
      backIcon={<span>‹</span>}
      ask={<div data-ask="" />}
    >
      <p>body</p>
    </HouseWindowFrame>
  );
}

describe("house window shell (components/chrome/house-window)", () => {
  it("draws the house 600 window: close · title · Done over the body", () => {
    const html = renderToStaticMarkup(<Host />);
    expect(html).toContain('data-house-overlay-host="house-dialog"');
    expect(html).toContain("data-w-window");
    expect(html).toContain('data-w-close=""');
    expect(html).not.toContain("data-w-back");
    expect(html).toMatch(/<h2[^>]*>Metadata<\/h2>/);
    expect(html).toMatch(/<button[^>]*data-w-done=""/);
    expect(html).toContain("<p>body</p>");
    expect(html).not.toContain("data-ask");
  });

  it("puts Back in the header on a face", () => {
    const html = renderToStaticMarkup(<Host face="genre" />);
    expect(html).toContain('data-w-back=""');
    expect(html).toContain('aria-label="Back"');
    expect(html).not.toContain("data-w-close");
  });

  it("waits while busy: Done disabled, header and body inert", () => {
    const html = renderToStaticMarkup(<Host busy />);
    expect(html).toMatch(/<button[^>]*data-w-done=""[^>]*disabled=""[^>]*aria-busy="true"/);
    expect(html).toMatch(/<header[^>]*inert=""/);
    expect(html).toMatch(/<div[^>]*inert=""[^>]*aria-busy="true"/);
    // Something still saving on its own (an upload): Done waits, typing doesn't.
    const holding = renderToStaticMarkup(<Host holdOpen />);
    expect(holding).toMatch(/<button[^>]*data-w-done=""[^>]*disabled=""/);
    expect(holding).not.toMatch(/<header[^>]*inert=""/);
  });

  it("asks with Discard then Keep editing in the strip, Keep editing first on a phone", () => {
    const props = {
      attr: "w",
      titleId: "t",
      title: "Discard changes?",
      lines: ["Your changes will be lost."],
      keepLabel: "Keep editing",
      discardLabel: "Discard",
      onKeep: () => undefined,
      onDiscard: () => undefined,
    };
    const strip = renderToStaticMarkup(<HouseWindowAsk {...props} variant="strip" />);
    expect(strip).toContain('role="alertdialog"');
    expect(strip).toContain('aria-labelledby="t"');
    expect(strip.indexOf("data-w-discard=")).toBeLessThan(strip.indexOf("data-w-keep="));
    const sheet = renderToStaticMarkup(<HouseWindowAsk {...props} variant="sheet" />);
    expect(sheet).toContain('data-house-overlay-host="app-sheet"');
    expect(sheet.indexOf("data-w-keep=")).toBeLessThan(sheet.indexOf("data-w-discard="));
  });

  it("never discards on a double Esc and lets an open menu close itself first", () => {
    const escape = shellSrc.slice(shellSrc.indexOf("function onEscape()"), shellSrc.indexOf("// Latest handlers"));
    expect(escape).not.toContain("discard(");
    expect(escape.indexOf("if (asking)")).toBeLessThan(escape.indexOf("requestClose();"));
    expect(shellSrc).toContain('if (frameRef.current?.querySelector("[data-house-form-select-menu]")) return;');
    // Below md a window holds no keys and no scroll lock, unless it opts
    // into the phone sheet.
    expect(shellSrc).toContain("const shown = desktop || sheet;");
    expect(shellSrc).toContain("if (!shown) return undefined;");
  });

  it("keeps Tab inside by real stops (a radio group is one) and opens a face on its first real field", () => {
    const trap = shellSrc.slice(shellSrc.indexOf('if (event.key !== "Tab") return;'), shellSrc.indexOf("document.addEventListener(\"keydown\", onKey);"));
    expect(trap).toContain(
      "const target = houseWindowTabTarget(houseWindowFocusables(frame), active, event.shiftKey, frame.contains(active));",
    );
    expect(trap).not.toContain("active === last");
    expect(trap).not.toContain("active === first");
    const focus = shellSrc.slice(shellSrc.indexOf("const firstFace = useRef(true);"), shellSrc.indexOf("const state: HouseWindowState"));
    expect(focus).toContain("houseWindowFirstField(body)?.focus();");
    // Never the first input in the markup (an unchosen radio of a group).
    expect(focus).not.toContain('"input:not([type=file]):not(.sr-only), textarea"');
  });

  it("runs a close's follow-up once Back has landed on the page", () => {
    const close = shellSrc.slice(shellSrc.indexOf("function close(key: number, after?"), shellSrc.indexOf("function reopenAfterFailure("));
    expect(close).toContain(
      'if (after) window.addEventListener("popstate", () => window.setTimeout(after, 0), { once: true });\n      window.history.back();',
    );
    // A window that stripped its query (it came with the page) runs it at once.
    expect(close).toContain("if (addressHasWindow()) strip();\n      after?.();");
  });
});
