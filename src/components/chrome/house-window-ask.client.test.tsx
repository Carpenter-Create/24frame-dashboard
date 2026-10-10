import { minimalDocument } from "@/test/minimal-document";

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { HouseWindowAsk } from "./house-window-ask";

// The ask's panel, mounted (docs/design-locks/house-dual-host-primitive-audit-v1.md,
// "HouseWindowAsk panel"): where focus lands when it appears, while it waits,
// and when the answer is back. The minimal document has no focus, so this
// file gives its element one that records the active element.

type MiniNode = {
  nodeType: number;
  childNodes: MiniNode[];
  hasAttribute?(name: string): boolean;
};

const miniDocument = minimalDocument() as unknown as MiniNode & {
  body: MiniNode & { appendChild(node: unknown): unknown };
  createElement(tag: string): MiniNode & { remove(): void };
};
const elementProto = Object.getPrototypeOf(miniDocument.createElement("div")) as { focus?: () => void };

const focus: { active: unknown } = { active: null };
let container: MiniNode & { remove(): void };
let root: Root;

function find(attr: string): MiniNode {
  const stack: MiniNode[] = [container];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.nodeType === 1 && node.hasAttribute?.(attr)) return node;
    stack.push(...node.childNodes);
  }
  throw new Error(`no ${attr}`);
}

function draw(busy: boolean) {
  act(() =>
    root.render(
      <HouseWindowAsk
        attr="w"
        variant="panel"
        layout="row"
        titleId="t"
        title="Remove this?"
        lines={["It goes."]}
        keepLabel="Keep"
        discardLabel="Remove"
        discardTone="danger"
        busy={busy}
        onKeep={() => undefined}
        onDiscard={() => undefined}
      />,
    ),
  );
}

beforeEach(() => {
  focus.active = null;
  elementProto.focus = function recordFocus(this: unknown) {
    focus.active = this;
  };
  Object.defineProperty(miniDocument, "activeElement", { configurable: true, get: () => focus.active });
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete elementProto.focus;
  delete (miniDocument as unknown as { activeElement?: unknown }).activeElement;
});

describe("HouseWindowAsk panel: focus", () => {
  it("lands on Keep when it appears", () => {
    draw(false);
    expect(focus.active).toBe(find("data-w-keep"));
  });

  it("lands on the panel when it appears waiting (a disabled Keep cannot take it)", () => {
    draw(true);
    expect(focus.active).toBe(find("data-w-discard-ask"));
  });

  it("holds on the panel while it waits, and returns to the action when the answer is back", () => {
    draw(false);
    // The action was pressed.
    (find("data-w-discard") as unknown as { focus(): void }).focus();
    expect(focus.active).toBe(find("data-w-discard"));
    draw(true);
    expect(focus.active).toBe(find("data-w-discard-ask"));
    draw(false);
    expect(focus.active).toBe(find("data-w-discard"));
  });

  it("returns to the action when the answer is back even if a scrim click took focus off the ask", () => {
    // The host's scrim sits outside the ask; Chrome focuses a clicked
    // button on mousedown, and the scrim does nothing while the ask waits.
    const scrim = miniDocument.createElement("button") as MiniNode & { remove(): void; focus(): void };
    miniDocument.body.appendChild(scrim);
    try {
      draw(false);
      (find("data-w-discard") as unknown as { focus(): void }).focus();
      draw(true);
      expect(focus.active).toBe(find("data-w-discard-ask"));
      scrim.focus();
      expect(focus.active).toBe(scrim);
      draw(false);
      expect(focus.active).toBe(find("data-w-discard"));
    } finally {
      scrim.remove();
    }
  });

  it("leaves focus where it is inside the ask when the answer is back", () => {
    draw(true);
    const keep = find("data-w-keep") as unknown as { focus(): void };
    keep.focus();
    draw(false);
    expect(focus.active).toBe(keep);
  });
});
