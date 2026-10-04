import "@/test/minimal-document";

import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

import { SOCIAL } from "@/lib/social";
import { minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({ href, children, ...props }: { href: string; children?: React.ReactNode }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

import { SocialHomeTopics } from "./social-home-topics";

type Node = {
  childNodes: Node[];
  getAttribute?: (name: string) => string | null;
  dispatchEvent?: (event: Event) => boolean;
  [key: string]: unknown;
};

function find(node: Node, attr: string): Node | null {
  if (typeof node.getAttribute === "function" && node.getAttribute(attr) !== null) return node;
  for (const child of node.childNodes ?? []) {
    const hit = find(child, attr);
    if (hit) return hit;
  }
  return null;
}

// docs/design-locks/social-home-lane-tabs-lock-v1.md — the fade and
// "More topics" sit over the trailing edge and leave at the row's end.
describe("SocialHomeTopics fade (client)", () => {
  let root: Root | null = null;
  let container: Node | null = null;

  afterAll(() => {
    uninstallMinimalDocument();
  });

  afterEach(() => {
    if (root) {
      const mounted = root;
      act(() => mounted.unmount());
    }
    root = null;
    container = null;
  });

  function mount() {
    const host = minimalDocument();
    const node = host.createElement("div");
    host.body.appendChild(node);
    container = node as unknown as Node;
    root = createRoot(node as unknown as HTMLElement);
    act(() => root?.render(createElement(SocialHomeTopics, {})));
  }

  function html() {
    return container ? serializeElement(container as never) : "";
  }

  function row() {
    const node = find(container!, "data-social-home-topics-rail");
    if (!node) throw new Error("topic row not mounted");
    return node as Node & { scrollLeft: number; clientWidth: number; scrollWidth: number };
  }

  function measure(left: number, scrollWidth = 1400) {
    const node = row();
    node.scrollLeft = left;
    node.clientWidth = 390;
    node.scrollWidth = scrollWidth;
    act(() => {
      node.dispatchEvent?.({ type: "scroll" } as Event);
    });
  }

  it("shows the fade and More topics while more words sit past the edge", () => {
    mount();
    measure(0);
    expect(html()).toContain("data-social-home-topics-fade");
    expect(html()).toContain(`aria-label="${SOCIAL.home.moreTopics}"`);
  });

  it("drops the fade at the end of the row, and for a row that fits", () => {
    mount();
    measure(1400 - 390);
    expect(html()).not.toContain("data-social-home-topics-fade");
    measure(200);
    expect(html()).toContain("data-social-home-topics-fade");
    measure(0, 380);
    expect(html()).not.toContain("data-social-home-topics-fade");
  });

  it("scrolls the row on by part of its width when More topics is pressed", () => {
    mount();
    measure(0);
    const scrolls: unknown[] = [];
    (row() as unknown as { scrollBy: (opts: unknown) => void }).scrollBy = (opts) => scrolls.push(opts);
    const more = find(container!, "data-social-home-topics-more")!;
    act(() => {
      container?.dispatchEvent?.({
        type: "click",
        target: more,
        button: 0,
        bubbles: true,
        preventDefault() {},
        stopPropagation() {},
      } as unknown as Event);
    });
    expect(scrolls).toEqual([{ left: Math.round(390 * 0.6), behavior: "smooth" }]);
  });

  // Chromium leaves a focused word that sits whole inside the track under
  // the fade (scroll padding moves where focus lands, not whether it
  // scrolls). The row moves it clear on keyboard focus only.
  describe("keyboard focus reveal", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    function topic(label: string): Node {
      const walk = (node: Node): Node | null => {
        if (typeof node.getAttribute === "function" && node.getAttribute("data-social-home-topic") === label) {
          return node;
        }
        for (const child of node.childNodes ?? []) {
          const hit = walk(child);
          if (hit) return hit;
        }
        return null;
      };
      const hit = walk(container!);
      if (!hit) throw new Error(`no topic ${label}`);
      return hit;
    }

    function focus(label: string, box: [number, number], keyboard: boolean, port: [number, number], pad: string) {
      vi.stubGlobal("getComputedStyle", () => ({ scrollPaddingInlineStart: "0px", scrollPaddingInlineEnd: pad }));
      const scrolls: unknown[] = [];
      const track = row() as unknown as Record<string, unknown>;
      track.getBoundingClientRect = () => ({ left: port[0], right: port[1] });
      track.scrollBy = (opts: unknown) => scrolls.push(opts);
      const link = topic(label) as unknown as Record<string, unknown>;
      link.getBoundingClientRect = () => ({ left: box[0], right: box[1] });
      link.matches = (selector: string) => keyboard && selector === ":focus-visible";
      act(() => {
        container?.dispatchEvent?.({
          type: "focusin",
          target: link,
          bubbles: true,
          preventDefault() {},
          stopPropagation() {},
        } as unknown as Event);
      });
      return scrolls;
    }

    it("scrolls a Tab-focused word under the fade clear of the track's scroll padding", () => {
      mount();
      measure(0);
      // Chromium 390: Post-production rests at 238–363 under the 120 fade.
      expect(focus("Post-production", [238, 363], true, [0, 390], "120px")).toEqual([{ left: 93 }]);
      // Desktop: the padding is read from the CSS (76), not a copy in JS.
      expect(focus("Content creator", [517, 640], true, [0, 636], "76px")).toEqual([{ left: 80 }]);
    });

    it("leaves a word that already sits clear", () => {
      mount();
      measure(0);
      expect(focus("Casting", [99, 172], true, [0, 390], "120px")).toEqual([]);
    });

    it("never moves the row on a mouse press, so the click lands on the word pressed", () => {
      mount();
      measure(0);
      expect(focus("Post-production", [238, 363], false, [0, 390], "120px")).toEqual([]);
    });
  });
});
