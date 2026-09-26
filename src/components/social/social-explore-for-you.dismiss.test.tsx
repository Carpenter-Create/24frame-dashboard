import "@/test/minimal-document";

import { createElement, type ReactNode } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () =>
    function MuxPlayerStub(props: { playbackId?: string; muted?: boolean }) {
      return createElement("div", {
        "data-mux-player-stub": props.playbackId ?? "",
        "data-mux-muted": props.muted ? "yes" : "no",
      });
    },
}));

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string }) => createElement("img", { src: props.src, alt: props.alt ?? "" }),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  function MockLink({
    href,
    children,
    ...props
  }: {
    href: string;
    children?: ReactNode;
  }) {
    return React.createElement("a", { href, ...props }, children);
  }
  return { __esModule: true, default: MockLink };
});

vi.mock("@/app/(app)/social/light-actions", () => ({
  listStorySendPeople: vi.fn(async () => ({ people: [] })),
  sendSocialPostShare: vi.fn(async () => ({ ok: true })),
}));

import { SOCIAL } from "@/lib/social";
import type { SocialExploreForYouItem } from "@/lib/social-explore-for-you";
import { minimalDocument, uninstallMinimalDocument } from "@/test/minimal-document";
import { SocialExploreForYouStream } from "./social-explore-for-you";

const ACTIVE_PLAYBACK = "uNbxnGLKJ00yfbijDO8COxT";
const NEXT_PLAYBACK = "SecondMuxPlaybackId1";
const SLIDE_N = "1";

type MiniNode = {
  nodeType: number;
  parentNode: MiniNode | null;
  childNodes: MiniNode[];
  tagName?: string;
  getAttribute?(name: string): string | null;
  hasAttribute?(name: string): boolean;
  addEventListener?(
    type: string,
    handler: (event: NativeEvent) => void,
    options?: boolean | { capture?: boolean },
  ): void;
  removeEventListener?(type: string, handler: (event: NativeEvent) => void): void;
  querySelectorAll?(selector: string): MiniNode[];
};

type NativeEvent = {
  type: string;
  target: MiniNode;
  srcElement: MiniNode;
  currentTarget: MiniNode | null;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented: boolean;
  button: number;
  buttons: number;
  detail: number;
  eventPhase: number;
  timeStamp: number;
  isTrusted: boolean;
  preventDefault: () => void;
  stopPropagation: () => void;
  stopImmediatePropagation: () => void;
  persist: () => void;
};

type Listener = (event: NativeEvent) => void;

const listenerBuckets = new WeakMap<object, Map<string, Set<Listener>>>();

function captureFlag(options?: boolean | { capture?: boolean }): boolean {
  return options === true || (typeof options === "object" && options !== null && options.capture === true);
}

function listenersFor(target: object, type: string, capture: boolean): Set<Listener> {
  let map = listenerBuckets.get(target);
  if (!map) {
    map = new Map();
    listenerBuckets.set(target, map);
  }
  const key = `${type}:${capture ? "capture" : "bubble"}`;
  let set = map.get(key);
  if (!set) {
    set = new Set();
    map.set(key, set);
  }
  return set;
}

function installDomHooks() {
  const sample = minimalDocument().createElement("div") as unknown as MiniNode;
  const elementProto = Object.getPrototypeOf(sample) as MiniNode & {
    addEventListener: MiniNode["addEventListener"];
    removeEventListener: MiniNode["removeEventListener"];
    querySelectorAll?: MiniNode["querySelectorAll"];
  };
  const nodeProto = Object.getPrototypeOf(elementProto) as {
    addEventListener: (
      type: string,
      handler: Listener,
      options?: boolean | { capture?: boolean },
    ) => void;
    removeEventListener: (
      type: string,
      handler: Listener,
      options?: boolean | { capture?: boolean },
    ) => void;
  };
  const originalAdd = nodeProto.addEventListener;
  const originalRemove = nodeProto.removeEventListener;
  const originalQuery = elementProto.querySelectorAll;

  nodeProto.addEventListener = function addEventListener(
    this: object,
    type: string,
    handler: Listener,
    options?: boolean | { capture?: boolean },
  ) {
    listenersFor(this, type, captureFlag(options)).add(handler);
  };
  nodeProto.removeEventListener = function removeEventListener(
    this: object,
    type: string,
    handler: Listener,
    options?: boolean | { capture?: boolean },
  ) {
    listenersFor(this, type, captureFlag(options)).delete(handler);
  };
  elementProto.querySelectorAll = function querySelectorAll(this: MiniNode, selector: string) {
    const found: MiniNode[] = [];
    const walk = (node: MiniNode) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 1 && matches(child, selector)) found.push(child);
        walk(child);
      }
    };
    walk(this);
    return found;
  };

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ comments: [] }),
    })),
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal("scrollTo", () => {});
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://24frame.test" },
  });
  const hadWindowListener = typeof globalThis.addEventListener === "function";
  const windowListeners = new Map<string, Set<(event: { key?: string }) => void>>();
  if (!hadWindowListener) {
    Object.defineProperty(globalThis, "addEventListener", {
      configurable: true,
      writable: true,
      value(type: string, handler: (event: { key?: string }) => void) {
        let set = windowListeners.get(type);
        if (!set) {
          set = new Set();
          windowListeners.set(type, set);
        }
        set.add(handler);
      },
    });
    Object.defineProperty(globalThis, "removeEventListener", {
      configurable: true,
      writable: true,
      value(type: string, handler: (event: { key?: string }) => void) {
        windowListeners.get(type)?.delete(handler);
      },
    });
  }

  return () => {
    nodeProto.addEventListener = originalAdd;
    nodeProto.removeEventListener = originalRemove;
    if (originalQuery) elementProto.querySelectorAll = originalQuery;
    else delete elementProto.querySelectorAll;
    delete (globalThis as { location?: unknown }).location;
    if (!hadWindowListener) {
      delete (globalThis as { addEventListener?: unknown }).addEventListener;
      delete (globalThis as { removeEventListener?: unknown }).removeEventListener;
    }
    vi.unstubAllGlobals();
  };
}

function matches(node: MiniNode, selector: string): boolean {
  if (!selector.startsWith("[") || !selector.endsWith("]") || !node.hasAttribute || !node.getAttribute) return false;
  const body = selector.slice(1, -1);
  const eq = body.indexOf("=");
  if (eq < 0) return node.hasAttribute(body);
  const name = body.slice(0, eq);
  let value = body.slice(eq + 1);
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  return node.getAttribute(name) === value;
}

function elementsIn(root: MiniNode): MiniNode[] {
  const found: MiniNode[] = [];
  const walk = (node: MiniNode) => {
    if (node.nodeType === 1) found.push(node);
    for (const child of node.childNodes) walk(child);
  };
  walk(root);
  return found;
}

function attr(node: MiniNode, name: string): string | null {
  return node.getAttribute?.(name) ?? null;
}

function closest(node: MiniNode | null, name: string): MiniNode | null {
  let current = node;
  while (current) {
    if (current.hasAttribute?.(name)) return current;
    current = current.parentNode;
  }
  return null;
}

function fireClick(target: MiniNode) {
  const event: NativeEvent = {
    type: "click",
    target,
    srcElement: target,
    currentTarget: null,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    button: 0,
    buttons: 1,
    detail: 1,
    eventPhase: 3,
    timeStamp: Date.now(),
    isTrusted: true,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {},
    stopImmediatePropagation() {},
    persist() {},
  };
  const path: MiniNode[] = [];
  let current: MiniNode | null = target;
  while (current) {
    path.push(current);
    current = current.parentNode;
  }
  const phase = path.some((node) => (listenerBuckets.get(node)?.get("click:bubble")?.size ?? 0) > 0)
    ? "click:bubble"
    : "click:capture";
  const ordered = phase === "click:capture" ? [...path].reverse() : path;
  for (const node of ordered) {
    event.currentTarget = node;
    for (const handler of [...(listenerBuckets.get(node)?.get(phase) ?? [])]) handler(event);
  }
}

const first: SocialExploreForYouItem = {
  postId: "v1",
  playbackId: ACTIVE_PLAYBACK,
  playbackPolicy: "public",
  body: "Night clip",
  authorId: "11111111-1111-4111-8111-111111111111",
  authorHandle: "ada",
  authorName: "Ada Lovelace",
  authorPhotoUrl: "",
  likeCount: 2,
  commentCount: 1,
  liked: true,
  canLike: true,
};

const next: SocialExploreForYouItem = {
  ...first,
  postId: "v2",
  playbackId: NEXT_PLAYBACK,
  playbackPolicy: "signed",
  body: "Next clip",
  liked: false,
  commentCount: 0,
};

describe("SocialExploreForYouStream dismiss", () => {
  let root: Root | null = null;
  let host: MiniNode | null = null;
  let restore: (() => void) | null = null;

  afterAll(() => {
    uninstallMinimalDocument();
  });

  afterEach(() => {
    if (root) {
      const mounted = root;
      act(() => {
        mounted.unmount();
      });
    }
    root = null;
    const parent = host?.parentNode as { removeChild?: (child: MiniNode) => void } | null;
    if (host && parent?.removeChild) parent.removeChild(host);
    host = null;
    restore?.();
    restore = null;
  });

  async function renderStream() {
    restore = installDomHooks();
    const doc = minimalDocument();
    const node = doc.createElement("div") as unknown as MiniNode;
    (doc.body as unknown as { appendChild: (child: MiniNode) => MiniNode }).appendChild(node);
    host = node;
    root = createRoot(node as unknown as HTMLElement);
    await act(async () => {
      root?.render(createElement(SocialExploreForYouStream, { items: [first, next], emptyLabel: null }));
    });
    await act(async () => {
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
  }

  function body(): MiniNode {
    return minimalDocument().body as unknown as MiniNode;
  }

  function slide(index: string): MiniNode {
    const found = elementsIn(body()).find((node) => attr(node, "data-explore-index") === index);
    if (!found) throw new Error(`slide ${index} missing`);
    return found;
  }

  function control(marker: string, index: string): MiniNode {
    const found = elementsIn(body()).find(
      (node) => node.hasAttribute?.(marker) && closest(node, "data-explore-index") === slide(index),
    );
    if (!found) throw new Error(`${marker} on slide ${index} missing`);
    return found;
  }

  function dismissButton(sheetMarker: string, label: string): MiniNode {
    const sheet = elementsIn(body()).find((node) => node.hasAttribute?.(sheetMarker));
    if (!sheet) throw new Error(`${sheetMarker} missing`);
    const button = elementsIn(sheet).find((node) => node.tagName === "BUTTON" && attr(node, "aria-label") === label);
    if (!button) throw new Error(`dismiss for ${sheetMarker} missing`);
    return button;
  }

  async function click(node: MiniNode) {
    await act(async () => {
      fireClick(node);
      for (let i = 0; i < 8; i += 1) await Promise.resolve();
    });
  }

  function expectSameItem() {
    const active = slide("0");
    const other = slide(SLIDE_N);
    expect(attr(active, "data-explore-index")).toBe("0");
    expect(active.hasAttribute?.("data-social-explore-active")).toBe(true);
    expect(attr(active, "data-social-explore-active-index")).toBe("0");
    expect(attr(other, "data-explore-index")).toBe(SLIDE_N);
    expect(other.hasAttribute?.("data-social-explore-active")).toBe(false);
    const players = elementsIn(body()).filter((node) => node.hasAttribute?.("data-mux-player-stub"));
    expect(players.map((node) => attr(node, "data-mux-player-stub"))).toEqual([ACTIVE_PLAYBACK]);
    expect(closest(players[0] ?? null, "data-explore-index")).toBe(active);
    const slideLinks = [...elementsIn(active), ...elementsIn(other)];
    expect(slideLinks.some((node) => attr(node, "href")?.startsWith("/social/p/"))).toBe(false);
  }

  it("opens comment and share on slide N and dismisses back to the same Mux item", async () => {
    await renderStream();
    expectSameItem();

    await click(control("data-social-comment-open", SLIDE_N));
    expect(elementsIn(body()).some((node) => node.hasAttribute?.("data-social-comment-thread"))).toBe(true);
    expectSameItem();
    await click(dismissButton("data-social-comment-thread", SOCIAL.create.close));
    expect(elementsIn(body()).some((node) => node.hasAttribute?.("data-social-comment-thread"))).toBe(false);
    expectSameItem();

    await click(control("data-social-post-share", SLIDE_N));
    expect(elementsIn(body()).some((node) => node.hasAttribute?.("data-social-post-share-sheet"))).toBe(true);
    expectSameItem();
    await click(dismissButton("data-social-post-share-sheet", SOCIAL.post.shareClose));
    expect(elementsIn(body()).some((node) => node.hasAttribute?.("data-social-post-share-sheet"))).toBe(false);
    expectSameItem();
  });
});
