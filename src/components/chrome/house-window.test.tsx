import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  HOUSE_WINDOW_FOOT_CLASS,
  HOUSE_WINDOW_FRAME_CLASS,
  HOUSE_WINDOW_FRAME_FILL_CLASS,
  HOUSE_WINDOW_HEADER_SPACER_CLASS,
} from "@/lib/house-window";

import { HouseWindowAsk, HouseWindowFrame, useHouseWindow } from "./house-window";

const shellSrc = readFileSync("src/components/chrome/house-window.tsx", "utf8");

function Host({
  face = "index",
  busy = false,
  holdOpen = false,
  doneLabel = "Done",
  foot,
  fill,
  asking = false,
}: {
  face?: string;
  busy?: boolean;
  holdOpen?: boolean;
  /** null: the window draws no Done. */
  doneLabel?: string | null;
  foot?: ReactNode;
  fill?: boolean;
  /** Draw the frame as it is while the ask shows. */
  asking?: boolean;
}) {
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
      win={asking ? { ...win, asking: true } : win}
      refs={refs}
      title="Metadata"
      motion={null}
      closeLabel="Close"
      backLabel="Back"
      doneLabel={doneLabel ?? undefined}
      closeIcon={<span>x</span>}
      backIcon={<span>‹</span>}
      ask={<div data-ask="" />}
      foot={foot}
      fill={fill}
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

  // An address that already carries the window's query on an entry that is
  // not the window's own (a reload, a pasted link): opening from the page
  // puts the page under it and pushes the window's own entry, so Back
  // reaches the ask (social-post-caption-window-lock-v1; dual-host lock).
  // Bugbot on #804: Back while a window's code is still loading. With no
  // handler yet nothing is typed, so the window closes instead of appearing
  // later with no entry (the next Back would then leave the page).
  it("closes a window Back reaches before it has mounted", () => {
    const effect = shellSrc.slice(
      shellSrc.indexOf("if (addressFace === null && prev !== null) {"),
      shellSrc.indexOf("push(indexFace);\n      pushedRef.current = true;"),
    );
    const guard = effect.indexOf("if (!requestRef.current) {\n        if (onBackBeforeMount) onBackBeforeMount(winRef.current.key);\n        else close(winRef.current.key);\n        return;\n      }");
    expect(guard).toBeGreaterThan(-1);
    // After the checks that this is Back on a live window, before asking it.
    expect(effect.indexOf("if (addressHasWindow()) return;")).toBeLessThan(guard);
    expect(guard).toBeLessThan(effect.indexOf("const closed = requestRef.current();"));
    expect(effect).not.toContain("requestRef.current ? requestRef.current() : true");
  });

  it("opens from the page over a leftover query with its own entry", () => {
    const openFromPage = shellSrc.slice(
      shellSrc.indexOf("function openFromPage(face: F)"),
      shellSrc.indexOf("function close(key: number, after?"),
    );
    const install = openFromPage.indexOf(
      "if (addressHasWindow() && !isOwnEntry()) {\n      install(face);\n      open(face, true);\n      return;\n    }",
    );
    expect(install).toBeGreaterThan(-1);
    // Otherwise as before: push without the query, reuse its own entry.
    expect(openFromPage.indexOf("const pushed = !addressHasWindow();")).toBeGreaterThan(install);
    expect(openFromPage).toContain("if (pushed) push(face);\n    open(face, pushed);");
  });

  // The optional parts (docs/design-locks/social-comments-window-lock-v1.md),
  // absent for every window before them.
  it("draws no Done when the window has none: a 44 spacer keeps the title centred", () => {
    const html = renderToStaticMarkup(<Host doneLabel={null} />);
    expect(html).not.toContain("data-w-done");
    expect(html).toContain(`<span aria-hidden="true" class="${HOUSE_WINDOW_HEADER_SPACER_CLASS}"></span>`);
    expect(html).toMatch(/<h2[^>]*>Metadata<\/h2><span aria-hidden="true"/);
    expect(html).toContain('data-w-close=""');
    // With a Done, no spacer.
    expect(renderToStaticMarkup(<Host />)).not.toContain(HOUSE_WINDOW_HEADER_SPACER_CLASS);
  });

  it("pins a foot under the body, inert while busy", () => {
    const html = renderToStaticMarkup(<Host doneLabel={null} foot={<form data-f="" />} />);
    expect(html).toContain(`<div data-w-foot="" class="${HOUSE_WINDOW_FOOT_CLASS}"><form data-f=""></form></div>`);
    expect(html.indexOf("<p>body</p>")).toBeLessThan(html.indexOf("data-w-foot"));
    const busy = renderToStaticMarkup(<Host doneLabel={null} busy foot={<form data-f="" />} />);
    expect(busy).toMatch(/<div data-w-foot=""[^>]*inert=""/);
    // No foot: nothing drawn for it.
    expect(renderToStaticMarkup(<Host />)).not.toContain("data-w-foot");
  });

  it("makes the foot inert while the ask shows, so Tab never reaches the field under the strip", () => {
    const html = renderToStaticMarkup(<Host doneLabel={null} asking foot={<form data-f="" />} />);
    expect(html).toMatch(/<div data-w-foot=""[^>]*inert=""/);
    expect(html).toMatch(/<header[^>]*inert=""/);
    expect(html).toMatch(/<div[^>]*inert=""[^>]*><div[^>]*><p>body<\/p>/);
    // The ask is drawn after the foot, the one live part of the window.
    expect(html.indexOf("data-w-foot")).toBeLessThan(html.indexOf("data-ask"));
    // Not asking and not busy: the foot takes keys.
    expect(renderToStaticMarkup(<Host doneLabel={null} foot={<form data-f="" />} />)).not.toContain("inert");
  });

  it("fills 80vh only when asked, and a filled frame never takes the held height", () => {
    const filled = renderToStaticMarkup(<Host fill />);
    expect(filled).toContain(`data-w-window="" class="${HOUSE_WINDOW_FRAME_FILL_CLASS}"`);
    expect(filled).not.toContain(`class="${HOUSE_WINDOW_FRAME_CLASS}"`);
    const plain = renderToStaticMarkup(<Host />);
    expect(plain).toContain(`data-w-window="" class="${HOUSE_WINDOW_FRAME_CLASS}"`);
    expect(shellSrc).toContain("style={onSheet || fill || win.held === null ? undefined : { height: win.held }}");
  });

  it("mounts in the layer that owns it, else the page body; never during a server render", () => {
    expect(shellSrc).toContain('return typeof document === "undefined" ? host : createPortal(host, container ?? document.body);');
  });

  it("never runs Done behind the ask (⌘/Ctrl+Enter while asking does nothing)", () => {
    const done = shellSrc.slice(shellSrc.indexOf("function done()"), shellSrc.indexOf("function discard()"));
    expect(done).toContain("if (holdOpen || asking) return;");
    expect(done.indexOf("if (holdOpen || asking) return;")).toBeLessThan(done.indexOf("onDone();"));
  });
});
