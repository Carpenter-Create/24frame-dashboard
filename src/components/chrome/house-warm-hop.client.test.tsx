import "@/test/minimal-document";

import { act, createElement, useEffect, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A warm hop calls pushState with Next's private `__NA` flag, so Next's
// router never learns about it: usePathname keeps the previous screen.
// These tests drive the real house shell through a warm hop and check what
// chrome does next.

const nav = vi.hoisted(() => ({
  pathname: "/social",
  search: "",
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => {
  const router = {
    push: nav.push,
    replace: nav.replace,
    refresh: nav.refresh,
    prefetch: nav.prefetch,
  };
  return {
    usePathname: () => nav.pathname,
    useSearchParams: () => new URLSearchParams(nav.search),
    useRouter: () => router,
  };
});

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  const NEXT_ONLY_PROPS = new Set(["prefetch", "scroll", "replace"]);
  type LinkClick = {
    defaultPrevented: boolean;
    preventDefault(): void;
    metaKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    altKey: boolean;
  };
  return {
    // Same click contract as next/dist/client/app-dir/link.js: the caller's
    // onClick first, then a Next navigation unless the click was prevented.
    // Modified clicks are left to the browser (a new tab).
    default: function Link(
      props: { href: string; onClick?: (event: LinkClick) => void; children?: ReactNode } & Record<
        string,
        unknown
      >,
    ) {
      const { href, onClick, children, ...rest } = props;
      const anchorProps = Object.fromEntries(
        Object.entries(rest).filter(([key]) => !NEXT_ONLY_PROPS.has(key)),
      );
      return createElement(
        "a",
        {
          ...anchorProps,
          href,
          onClick: (event: LinkClick) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            nav.push(href);
          },
        },
        children,
      );
    },
    useLinkStatus: () => ({ pending: false }),
  };
});

vi.mock("@/app/actions", () => ({ signOut: vi.fn() }));

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

vi.mock("@/app/(app)/aggregation/messages/ask-globee-actions", () => ({
  loadAskAiOverlay: () => new Promise(() => undefined),
}));

import { houseSyncPainted, resetHousePaintedForTests } from "@/lib/house-client-shell";
import { minimalDocument } from "@/test/minimal-document";
import { useAccountMenuOpen } from "./account-sheet";
import { AskAiOverlayProvider, useAskAiOverlay } from "./ask-ai-overlay";
import { HousePathProvider, useHouseClient } from "./house-client-shell";
import { HouseLink } from "./house-link";
import { WorkspaceSwitcher } from "./workspace-switcher";

const miniDocument = minimalDocument();
// The shell's instanceof checks need DOM classes. Every mini node is one class.
const MiniElement = miniDocument.createElement("a").constructor;

type MiniNode = {
  nodeType: number;
  tagName?: string;
  parentNode: MiniNode | null;
  childNodes: MiniNode[];
  getAttribute?(name: string): string | null;
  hasAttribute?(name: string): boolean;
};

// The shell's click interceptor finds the anchor with closest("a[href]").
function closestFrom(start: MiniNode, selector: string): MiniNode | null {
  const match = /^([a-z]*)(?:\[([^\]]+)\])?$/i.exec(selector);
  if (!match) throw new Error(`closest stub cannot match ${selector}`);
  const [, tag, attr] = match;
  for (let node: MiniNode | null = start; node && node.nodeType === 1; node = node.parentNode) {
    if ((!tag || node.tagName === tag.toUpperCase()) && (!attr || node.hasAttribute?.(attr))) {
      return node;
    }
  }
  return null;
}

function closest(this: MiniNode, selector: string): MiniNode | null {
  return closestFrom(this, selector);
}

// The open waffle measures its trigger and the chrome above it.
const ZERO_RECT = { top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0, x: 0, y: 0 };

const miniElementProto = MiniElement.prototype as {
  closest?: typeof closest;
  getBoundingClientRect?: () => typeof ZERO_RECT;
};
const miniDocumentQueries = miniDocument as unknown as { querySelectorAll?: () => never[] };

// The shell reads location and writes history. Node has neither.
const shellLocation = { origin: "https://app.test", pathname: "/social", search: "" };
const shellHistory = {
  state: null as unknown,
  pushState: vi.fn((state: unknown, _title: string, url: string) => {
    shellHistory.state = state;
    const next = new URL(url, shellLocation.origin);
    shellLocation.pathname = next.pathname;
    shellLocation.search = next.search;
  }),
};

const probe: {
  house: ReturnType<typeof useHouseClient>;
  ai: ReturnType<typeof useAskAiOverlay> | null;
  menu: ReturnType<typeof useAccountMenuOpen> | null;
} = { house: null, ai: null, menu: null };

// Probes record hook values after each commit. act() flushes the effect.
function HouseProbe() {
  const house = useHouseClient();
  useEffect(() => {
    probe.house = house;
  });
  return null;
}

function AskAiProbe() {
  const ai = useAskAiOverlay();
  useEffect(() => {
    probe.ai = ai;
  });
  return null;
}

function AccountMenuProbe() {
  const menu = useAccountMenuOpen();
  useEffect(() => {
    probe.menu = menu;
  });
  return null;
}

let container: ReturnType<typeof miniDocument.createElement>;
let root: Root;

function render(node: ReactNode) {
  act(() => root.render(node));
}

function warmHop(href: string) {
  act(() => {
    expect(probe.house?.navigateOwned(href)).toBe(true);
  });
}

// Searches body, so sheets portaled out of the React root are found too.
function findLink(href: string): MiniNode {
  const stack: MiniNode[] = [miniDocument.body as unknown as MiniNode];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.tagName === "A" && node.getAttribute?.("href") === href) return node;
    stack.push(...node.childNodes);
  }
  throw new Error(`no link to ${href}`);
}

type FakeClick = {
  type: "click";
  target: MiniNode;
  button: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  timeStamp: number;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
};

// In production React's root is document (next/dist/client/app-index.js),
// so stopPropagation in the shell's capture listener also cancels React's
// onClick dispatch. Same order here: document listeners first, then React —
// body for portaled sheets, the root for everything else (each ignores the
// other's targets) — unless propagation was stopped.
function click(
  target: MiniNode,
  modifiers: Partial<Pick<FakeClick, "altKey" | "ctrlKey" | "metaKey" | "shiftKey">> = {},
): FakeClick {
  const event: FakeClick = {
    type: "click",
    target,
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    ...modifiers,
    timeStamp: 0,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    stopPropagation() {
      event.propagationStopped = true;
    },
  };
  act(() => {
    miniDocument.dispatchEvent(event as unknown as Event);
    if (event.propagationStopped) return;
    miniDocument.body.dispatchEvent(event as unknown as Event);
    container.dispatchEvent(event as unknown as Event);
  });
  return event;
}

beforeEach(() => {
  resetHousePaintedForTests();
  nav.pathname = "/social";
  nav.search = "";
  for (const fn of [nav.push, nav.replace, nav.refresh, nav.prefetch]) fn.mockClear();
  shellLocation.pathname = "/social";
  shellLocation.search = "";
  shellHistory.state = null;
  shellHistory.pushState.mockClear();
  probe.house = null;
  probe.ai = null;
  probe.menu = null;
  miniElementProto.closest = closest;
  miniElementProto.getBoundingClientRect = () => ZERO_RECT;
  miniDocumentQueries.querySelectorAll = () => [];
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("Element", MiniElement);
  vi.stubGlobal("HTMLElement", MiniElement);
  vi.stubGlobal("HTMLAnchorElement", MiniElement);
  vi.stubGlobal("location", shellLocation);
  vi.stubGlobal("history", shellHistory);
  vi.stubGlobal("addEventListener", () => undefined);
  vi.stubGlobal("removeEventListener", () => undefined);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete miniElementProto.closest;
  delete miniElementProto.getBoundingClientRect;
  delete miniDocumentQueries.querySelectorAll;
  vi.unstubAllGlobals();
});

describe("waffle Home exit on a warm hop", () => {
  function renderWaffle() {
    houseSyncPainted(["/social", "/home"]);
    render(
      createElement(
        HousePathProvider,
        null,
        createElement(HouseProbe),
        createElement(WorkspaceSwitcher, {
          current: "social",
          presentation: "waffle",
          defaultOpen: true,
        }),
      ),
    );
  }

  it("pushes history once and closes the sheet", () => {
    renderWaffle();

    const event = click(findLink("/home"));

    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState.mock.calls[0]?.[2]).toBe("/home");
    expect(nav.push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(probe.house?.pathname).toBe("/home");
    expect(() => findLink("/home")).toThrow();
  });

  it("leaves a modified click to the browser", () => {
    renderWaffle();

    const event = click(findLink("/home"), { metaKey: true });

    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});

describe("warm hops keep the link's own click handler", () => {
  function renderLink(link: ReactNode) {
    render(createElement(HousePathProvider, null, createElement(HouseProbe), link));
  }

  it("runs a HouseLink onClick, then the shell owns the hop", () => {
    houseSyncPainted(["/social", "/home"]);
    const onClick = vi.fn();
    renderLink(createElement(HouseLink, { href: "/home", onClick }, "Home"));

    const event = click(findLink("/home"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState.mock.calls[0]?.[2]).toBe("/home");
    expect(probe.house?.pathname).toBe("/home");
    expect(nav.push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets a HouseLink onClick take the click over", () => {
    houseSyncPainted(["/social", "/home"]);
    const takeOver = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    renderLink(createElement(HouseLink, { href: "/home", onClick: takeOver }, "Home"));

    click(findLink("/home"));

    expect(takeOver).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
    expect(probe.house?.pathname).toBe("/social");
  });

  it("hands a cold hop to Next after the HouseLink onClick", () => {
    houseSyncPainted(["/social"]);
    const onClick = vi.fn();
    renderLink(createElement(HouseLink, { href: "/education", onClick }, "Education"));

    click(findLink("/education"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/education");
    expect(shellHistory.pushState).not.toHaveBeenCalled();
  });

  it("still owns warm hops on raw links", () => {
    houseSyncPainted(["/social", "/home"]);
    renderLink(createElement("a", { href: "/home" }, "Home"));

    const event = click(findLink("/home"));

    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe("account menu after a warm hop", () => {
  it("closes when a warm hop leaves the page it opened on", () => {
    houseSyncPainted(["/social", "/settings"]);
    render(
      createElement(
        HousePathProvider,
        null,
        createElement(HouseProbe),
        createElement(AccountMenuProbe),
      ),
    );
    act(() => probe.menu?.openMenu());
    expect(probe.menu?.open).toBe(true);

    warmHop("/settings");

    expect(probe.menu?.open).toBe(false);
  });
});

describe("24Frame AI after a warm hop", () => {
  function renderAskAi() {
    houseSyncPainted(["/social", "/social/profile"]);
    render(
      createElement(
        HousePathProvider,
        null,
        createElement(
          AskAiOverlayProvider,
          null,
          createElement(HouseProbe),
          createElement(AskAiProbe),
        ),
      ),
    );
    warmHop("/social/profile");
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(probe.house?.pathname).toBe("/social/profile");
  }

  it("opens on the screen the shell shows, not the one Next last rendered", () => {
    renderAskAi();

    act(() => probe.ai?.openAskAi());

    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/social/profile?ai=1");
  });

  it("closes onto the screen the shell shows", () => {
    renderAskAi();

    act(() => probe.ai?.closeAskAi());

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/social/profile");
  });
});
