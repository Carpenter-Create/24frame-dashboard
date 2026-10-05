import "@/test/minimal-document";

import { createElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SOCIAL_MUX_PLAYBACK_ROUTE } from "@/lib/social-mux";
import {
  resetSocialFeedReelReturnForTests,
  socialFeedReelOpenedExplore,
  socialFeedReelTiles,
  SOCIAL_FEED_REEL_STEP_PX,
  type SocialFeedReelTile,
} from "@/lib/social-feed-reels";
import { minimalDocument, serializeElement, uninstallMinimalDocument } from "@/test/minimal-document";

const back = vi.fn();

vi.mock("next/image", () => ({
  default: ({ src, loading, className }: { src: string; loading?: string; className?: string }) =>
    createElement("img", { src, loading, className, alt: "" }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    prefetch: _prefetch,
    ...props
  }: {
    href: string;
    prefetch?: boolean;
    children?: React.ReactNode;
  }) {
    void _prefetch;
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

import { SocialExploreExit } from "./social-explore-exit";
import { SocialFeedReelRail } from "./social-feed-reel-rail";

const AUTHOR = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

type Node = {
  tagName?: string;
  childNodes: Node[];
  getAttribute?: (name: string) => string | null;
  dispatchEvent?: (event: Event) => boolean;
  [key: string]: unknown;
};

function tiles(n: number): SocialFeedReelTile[] {
  return socialFeedReelTiles({
    hits: Array.from({ length: n }, (_, i) => ({ id: `r${i + 1}`, authorId: AUTHOR, body: `Reel ${i + 1}` })),
    mediaByPost: new Map(
      Array.from({ length: n }, (_, i) => [
        `r${i + 1}`,
        [
          {
            kind: "video" as const,
            url: "",
            contentType: "video/mp4" as const,
            playbackId: `ReelStill${i + 1}PlaybackA`,
            playbackPolicy: "signed" as const,
          },
        ],
      ]),
    ),
    authors: new Map([[AUTHOR, { handle: "sam", display_name: "Sam Okafor" }]]),
  });
}

function find(node: Node, match: (node: Node) => boolean): Node | null {
  if (match(node)) return node;
  for (const child of node.childNodes ?? []) {
    const hit = find(child, match);
    if (hit) return hit;
  }
  return null;
}

function byAttr(name: string, value?: string) {
  return (node: Node) =>
    typeof node.getAttribute === "function" &&
    (value === undefined ? node.getAttribute(name) !== null : node.getAttribute(name) === value);
}

const observed: {
  callback: (entries: { isIntersecting: boolean }[]) => void;
  margin?: string;
  root?: unknown;
}[] = [];
const fetches: string[] = [];

describe("SocialFeedReelRail (client)", () => {
  let root: Root | null = null;
  let container: Node | null = null;

  afterAll(() => {
    uninstallMinimalDocument();
  });

  beforeEach(() => {
    resetSocialFeedReelReturnForTests();
    observed.length = 0;
    fetches.length = 0;
    back.mockReset();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(
          callback: (entries: { isIntersecting: boolean }[]) => void,
          options?: { rootMargin?: string; root?: unknown },
        ) {
          observed.push({ callback, margin: options?.rootMargin, root: options?.root });
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      },
    );
    vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
      fetches.push(String(input));
      return new Promise<Response>(() => {});
    });
  });

  afterEach(() => {
    if (root) {
      const mounted = root;
      act(() => mounted.unmount());
    }
    root = null;
    container = null;
    vi.unstubAllGlobals();
  });

  function mount(element: ReturnType<typeof createElement>) {
    const host = minimalDocument();
    const node = host.createElement("div");
    host.body.appendChild(node);
    container = node as unknown as Node;
    root = createRoot(node as unknown as HTMLElement);
    act(() => root?.render(element));
  }

  function html(): string {
    return container ? serializeElement(container as never) : "";
  }

  // React delegates clicks to the root; hand it the target as a browser would.
  function click(target: Node, modifiers: Partial<Record<"metaKey" | "ctrlKey" | "shiftKey" | "altKey", boolean>> = {}) {
    act(() => {
      container?.dispatchEvent?.({
        type: "click",
        target,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        ...modifiers,
        bubbles: true,
        defaultPrevented: false,
        preventDefault() {
          (this as { defaultPrevented: boolean }).defaultPrevented = true;
        },
        stopPropagation() {},
      } as unknown as Event);
    });
  }

  function track(): Node & { scrollLeft: number; clientWidth: number; scrollWidth: number; scrolls: unknown[] } {
    const ul = find(container!, byAttr("data-social-feed-reels-track"));
    if (!ul) throw new Error("track not mounted");
    return ul as never;
  }

  function measure(ul: ReturnType<typeof track>, left: number) {
    ul.scrollLeft = left;
    ul.clientWidth = 620;
    ul.scrollWidth = 6 * 180 + 5 * 12;
    act(() => {
      ul.dispatchEvent?.({ type: "scroll" } as Event);
    });
  }

  // The page scrolls inside main[data-house-lead-scroll], never the window.
  // With a null root, main's overflow box clips the rail and the 600px lead
  // never applies: each rail would scroll in empty (Chromium-verified).
  it("observes the rail against the house scroller with the 600px lead, window only without one", () => {
    const doc = minimalDocument() as unknown as { querySelector: (selector: string) => unknown };
    const querySelector = doc.querySelector;
    const scroller = minimalDocument().createElement("main");
    const asked: string[] = [];
    doc.querySelector = (selector) => {
      asked.push(selector);
      return selector === "[data-house-lead-scroll]" ? scroller : null;
    };
    try {
      mount(createElement(SocialFeedReelRail, { rail: 0, tiles: tiles(6) }));
    } finally {
      doc.querySelector = querySelector;
    }
    expect(asked).toContain("[data-house-lead-scroll]");
    expect(observed).toHaveLength(1);
    expect(observed[0]!.root).toBe(scroller);
    expect(observed[0]!.margin).toBe("600px 0px 600px 0px");

    // No house scroller (a page outside the shell): the viewport.
    act(() => root?.render(createElement("div")));
    observed.length = 0;
    act(() => root?.render(createElement(SocialFeedReelRail, { rail: 0, tiles: tiles(6) })));
    expect(observed).toHaveLength(1);
    expect(observed[0]!.root).toBeNull();
    expect(observed[0]!.margin).toBe("600px 0px 600px 0px");
  });

  it("holds every still and portrait until the rail nears the viewport, then mints stills only", async () => {
    mount(createElement(SocialFeedReelRail, { rail: 0, tiles: tiles(6) }));
    expect(observed.some((row) => row.margin === "600px 0px 600px 0px")).toBe(true);
    expect(fetches).toHaveLength(0);
    expect(html().match(/data-social-feed-reel-still="held"/g)).toHaveLength(6);
    expect(html()).not.toContain("<img");

    const near = observed.find((row) => row.margin === "600px 0px 600px 0px")!;
    await act(async () => {
      near.callback([{ isIntersecting: true }]);
    });
    expect(html()).not.toContain('data-social-feed-reel-still="held"');
    expect(fetches).toEqual(
      Array.from(
        { length: 6 },
        (_, i) => `${SOCIAL_MUX_PLAYBACK_ROUTE}?playbackId=${encodeURIComponent(`ReelStill${i + 1}PlaybackA`)}`,
      ),
    );
    expect(html()).toContain('loading="eager"');
    expect(html()).not.toContain("data-social-mux-player");
    expect(html()).not.toContain("<video");
  });

  it("pages two tiles with the arrows and disables each at its end", () => {
    mount(createElement(SocialFeedReelRail, { rail: 0, tiles: tiles(6) }));
    const ul = track();
    const scrolls: unknown[] = [];
    (ul as unknown as { scrollBy: (opts: unknown) => void }).scrollBy = (opts) => scrolls.push(opts);
    measure(ul, 0);
    const prev = () => find(container!, byAttr("data-social-feed-reels-prev"))!;
    const next = () => find(container!, byAttr("data-social-feed-reels-next"))!;
    expect(prev().getAttribute?.("aria-disabled")).toBe("true");
    expect(next().getAttribute?.("aria-disabled")).toBeNull();

    click(prev());
    expect(scrolls).toEqual([]);
    click(next());
    expect(scrolls).toEqual([{ left: SOCIAL_FEED_REEL_STEP_PX, behavior: "smooth" }]);

    measure(ul, 384);
    expect(prev().getAttribute?.("aria-disabled")).toBeNull();
    expect(next().getAttribute?.("aria-disabled")).toBeNull();
    click(prev());
    expect(scrolls.at(-1)).toEqual({ left: -SOCIAL_FEED_REEL_STEP_PX, behavior: "smooth" });

    measure(ul, 6 * 180 + 5 * 12 - 620);
    expect(next().getAttribute?.("aria-disabled")).toBe("true");
    const before = scrolls.length;
    click(next());
    expect(scrolls).toHaveLength(before);
  });

  it("notes the tapped reel so Exit takes Back and the rail returns to the same spot", () => {
    mount(createElement(SocialFeedReelRail, { rail: 1, tiles: tiles(6) }));
    const ul = track();
    measure(ul, 384);
    const tile = find(container!, byAttr("data-social-feed-reel", "r4"))!;
    click(tile);
    expect(socialFeedReelOpenedExplore("/social/explore?v=r4")).toBe(true);
    expect(socialFeedReelOpenedExplore("/social/explore?v=r1")).toBe(false);

    // Exit on that Explore address goes Back (the house shell restores the feed's scroll).
    vi.stubGlobal("location", { pathname: "/social/explore", search: "?v=r4", origin: "https://24frame.local" });
    act(() => root?.render(createElement(SocialExploreExit)));
    const exit = find(container!, byAttr("data-social-explore-exit"))!;
    click(exit);
    expect(back).toHaveBeenCalledTimes(1);

    // Back on the Feed, the same rail takes its sideways spot once.
    act(() => root?.render(createElement("div")));
    act(() => root?.render(createElement(SocialFeedReelRail, { rail: 1, tiles: tiles(6) })));
    expect(track().scrollLeft).toBe(384);
  });

  // Cmd / Ctrl / Shift / Alt-click opens the reel in a new tab; this tab
  // never leaves, so no note may be left for a later remount to take.
  it("leaves no return note for a modified click", () => {
    mount(createElement(SocialFeedReelRail, { rail: 0, tiles: tiles(6) }));
    const ul = track();
    measure(ul, 384);
    for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      click(find(container!, byAttr("data-social-feed-reel", "r4"))!, { [key]: true });
      expect(socialFeedReelOpenedExplore("/social/explore?v=r4")).toBe(false);
    }

    // Later the Feed remounts: the rail stays where it starts.
    act(() => root?.render(createElement("div")));
    act(() => root?.render(createElement(SocialFeedReelRail, { rail: 0, tiles: tiles(6) })));
    expect(track().scrollLeft ?? 0).toBe(0);

    // A plain click still leaves the note.
    click(find(container!, byAttr("data-social-feed-reel", "r4"))!);
    expect(socialFeedReelOpenedExplore("/social/explore?v=r4")).toBe(true);
  });

  it("leaves Exit on its Feed link for an Explore address no reel opened", () => {
    vi.stubGlobal("location", { pathname: "/social/explore", search: "", origin: "https://24frame.local" });
    mount(createElement(SocialExploreExit));
    const exit = find(container!, byAttr("data-social-explore-exit"))!;
    expect(exit.getAttribute?.("href")).toBe("/social");
    click(exit);
    expect(back).not.toHaveBeenCalled();
  });
});
