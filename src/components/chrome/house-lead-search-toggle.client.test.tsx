import { minimalDocument } from "@/test/minimal-document";

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Education's desktop search icon (md to xl) opens the quiet field in a
// panel and autofocuses its input. Escape unmounts that input, so the
// toggle must take focus back — otherwise focus falls to <body> and a
// keyboard user restarts at the top of the page (WCAG 2.4.3).

vi.mock("next/navigation", () => ({
  usePathname: () => "/education",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/components/chrome/house-voice-mic", () => ({
  HouseVoiceMic: () => null,
}));

import { HouseLeadSearch } from "./house-lead-search";

type MiniNode = {
  nodeType: number;
  childNodes: MiniNode[];
  hasAttribute?(name: string): boolean;
  getAttribute?(name: string): string | null;
  dispatchEvent(event: unknown): boolean;
};

const miniDocument = minimalDocument() as unknown as MiniNode & {
  body: MiniNode & { appendChild(node: unknown): unknown };
  createElement(tag: string): MiniNode & { remove(): void };
};
const elementProto = Object.getPrototypeOf(miniDocument.createElement("div")) as {
  focus?: () => void;
};

let focused: MiniNode[] = [];
let container: MiniNode & { remove(): void };
let root: Root;

function find(attr: string): MiniNode | null {
  const stack: MiniNode[] = [container];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.nodeType === 1 && node.hasAttribute?.(attr)) return node;
    stack.push(...node.childNodes);
  }
  return null;
}

function findInput(): MiniNode | null {
  const stack: MiniNode[] = [container];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if ((node as unknown as { tagName?: string }).tagName === "INPUT") return node;
    stack.push(...node.childNodes);
  }
  return null;
}

function event(type: string, target: MiniNode, extra: Record<string, unknown> = {}) {
  return {
    type,
    target,
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    timeStamp: 0,
    defaultPrevented: false,
    preventDefault() {},
    stopPropagation() {},
    ...extra,
  };
}

beforeEach(() => {
  focused = [];
  elementProto.focus = function focus(this: MiniNode) {
    focused.push(this);
  };
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete elementProto.focus;
});

describe("Education desktop search toggle", () => {
  it("returns focus to the icon when Escape closes the panel", () => {
    act(() => {
      root.render(createElement(HouseLeadSearch, { tone: "quiet", presentation: "icon" }));
    });
    const button = find("data-education-header-search-icon");
    expect(button).not.toBeNull();
    expect(button!.getAttribute!("aria-expanded")).toBe("false");
    expect(button!.hasAttribute!("aria-controls")).toBe(false);

    act(() => {
      container.dispatchEvent(event("click", button!));
    });
    const panel = find("data-house-lead-search-panel");
    expect(panel).not.toBeNull();
    expect(button!.getAttribute!("aria-expanded")).toBe("true");
    expect(panel!.getAttribute!("id")).toBeTruthy();
    expect(button!.getAttribute!("aria-controls")).toBe(panel!.getAttribute!("id"));
    const input = findInput();
    expect(input).not.toBeNull();
    expect(focused.at(-1)).toBe(input);

    act(() => {
      miniDocument.dispatchEvent(event("keydown", miniDocument, { key: "Escape" }));
    });
    expect(find("data-house-lead-search-panel")).toBeNull();
    expect(button!.getAttribute!("aria-expanded")).toBe("false");
    expect(focused.at(-1)).toBe(button);
  });

  it("leaves focus alone on an outside press", () => {
    act(() => {
      root.render(createElement(HouseLeadSearch, { tone: "quiet", presentation: "icon" }));
    });
    const button = find("data-education-header-search-icon")!;
    act(() => {
      container.dispatchEvent(event("click", button));
    });
    const before = focused.length;
    act(() => {
      miniDocument.dispatchEvent(event("mousedown", miniDocument.body));
    });
    expect(find("data-house-lead-search-panel")).toBeNull();
    expect(focused.length).toBe(before);
  });
});
