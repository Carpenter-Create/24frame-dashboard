import "@/test/minimal-document";

import {
  act,
  cloneElement,
  createElement,
  isValidElement,
  useEffect,
  type ComponentProps,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Every screen change is a Next navigation. A panel hop (the same screen,
// other query: profile ?tab=, Social Home lane) calls pushState with Next's
// private `__NA` flag, so Next keeps the previous query. These tests drive
// the real house shell and check what chrome and its links do.

// Next resolves an href against the browser's address
// (dispatchNavigateAction), so `?ai=…` keeps only the path.
const resolveHref = vi.hoisted(() => (href: string) => {
  const url = new URL(href, `${location.origin}${location.pathname}${location.search}`);
  return `${url.pathname}${url.search}`;
});

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
    push: (href: string) => nav.push(resolveHref(href)),
    replace: (href: string) => nav.replace(resolveHref(href)),
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
            nav.push(resolveHref(href));
          },
        },
        children,
      );
    },
    useLinkStatus: () => ({ pending: false }),
  };
});

vi.mock("@/app/actions", () => ({ signOut: vi.fn() }));

const notifications = vi.hoisted(() => ({ read: [] as string[][] }));

vi.mock("@/app/(app)/aggregation/messages/actions", () => ({
  markNotificationsRead: async (ids: string[]) => {
    notifications.read.push(ids);
  },
}));

vi.mock("@/lib/notifications-realtime", () => ({ retireLiveNotification: () => undefined }));

vi.mock("next/dynamic", () => ({
  default: () =>
    function DynamicStub() {
      return null;
    },
}));

const askActions = vi.hoisted(() => ({ startedId: "" }));

vi.mock("@/app/(app)/aggregation/messages/ask-globee-actions", () => ({
  loadAskAiOverlay: () => new Promise(() => undefined),
  startAskGlobeeConversation: async () => ({ conversationId: askActions.startedId }),
  renameAskGlobeeConversation: vi.fn(),
  pinAskGlobeeConversation: vi.fn(),
  deleteAskGlobeeConversation: vi.fn(),
}));

import { MessageLink } from "@/app/(app)/aggregation/messages/message-link";
import { AskAssistantChromeProvider, useAskGlobeeChrome } from "@/components/messages/ask-globee-chrome";
import { AskGlobeeHistoryPanel } from "@/components/messages/ask-globee-history";
import { AskGlobeeLanding } from "@/components/messages/ask-globee-landing";
import { NewsSourceChips } from "@/components/news/news-sources-filter";
import { SocialCreateFan } from "@/components/social/social-create-fan";
import { SocialCreateTile } from "@/components/social/social-create-sheet";
import { SocialFrameAiOpen } from "@/components/social/social-frame-ai-face";
import { houseReadScroll, resetHouseScrollForTests } from "@/lib/house-client-shell";
import { NEWS_HREF, NEWS_SOURCE_FILTER_SOURCES, newsHistoryHref } from "@/lib/news";
import { SOCIAL_CREATE_TILES } from "@/lib/social-create-sheet";
import { socialFrameAiThreadHref } from "@/lib/social-frame-ai";
import { minimalDocument } from "@/test/minimal-document";
import { useAccountMenuOpen } from "./account-sheet";
import { AskAiOverlayProvider, useAskAiOverlay } from "./ask-ai-overlay";
import { HousePathProvider, HouseScreenOutlet, useHouseClient } from "./house-client-shell";
import { HouseLink } from "./house-link";
import { MessagesAppHeader } from "./messages-app-header";
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
  click?: () => void;
  querySelectorAll?: () => never[];
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

// Window listeners, so a test can fire popstate (Back and Forward).
type WindowListener = (event: unknown) => void;
const windowListeners = new Map<string, Set<WindowListener>>();

function fireWindow(type: string, event: unknown) {
  act(() => {
    for (const listener of windowListeners.get(type) ?? []) listener(event);
  });
}

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

const createMiniElement = miniDocument.createElement;

// The Create fan writes CSS custom properties (style.setProperty) and the
// News track queries its items. Only those tests opt in.
function richerMiniElements() {
  miniElementProto.querySelectorAll = () => [];
  miniDocument.createElement = ((tag: string) => {
    const el = createMiniElement.call(miniDocument, tag);
    const style = el.style as Record<string, unknown>;
    style.setProperty = (name: string, value: string) => {
      style[name] = value;
    };
    style.removeProperty = (name: string) => {
      delete style[name];
    };
    return el;
  }) as typeof miniDocument.createElement;
}

let container: ReturnType<typeof miniDocument.createElement>;
let root: Root;
let rendered: ReactNode = null;

function render(node: ReactNode) {
  rendered = node;
  act(() => root.render(node));
}

function startAt(pathname: string, search = "") {
  nav.pathname = pathname;
  nav.search = search;
  shellLocation.pathname = pathname;
  shellLocation.search = search;
}

// Same screen, other query. The shell owns it with a pushState.
function panelHop(href: string) {
  act(() => {
    expect(probe.house?.navigateOwned(href)).toBe(true);
  });
}

// Next lands on another screen. A new element re-renders the provider,
// which reads the mocked usePathname, as a real navigation's context does.
function nextNavigate(pathname: string, search = "") {
  startAt(pathname, search);
  if (!isValidElement(rendered)) throw new Error("render a tree first");
  const tree = rendered;
  act(() => root.render(cloneElement(tree)));
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

function findByAttribute(name: string): MiniNode {
  const stack: MiniNode[] = [miniDocument.body as unknown as MiniNode];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.nodeType === 1 && node.hasAttribute?.(name)) return node;
    stack.push(...node.childNodes);
  }
  throw new Error(`no element with ${name}`);
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
  rendered = null;
  resetHouseScrollForTests();
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
  notifications.read = [];
  miniElementProto.closest = closest;
  miniElementProto.getBoundingClientRect = () => ZERO_RECT;
  miniDocumentQueries.querySelectorAll = () => [];
  vi.stubGlobal("innerWidth", 390);
  vi.stubGlobal("Element", MiniElement);
  vi.stubGlobal("HTMLElement", MiniElement);
  vi.stubGlobal("HTMLAnchorElement", MiniElement);
  vi.stubGlobal("location", shellLocation);
  vi.stubGlobal("history", shellHistory);
  windowListeners.clear();
  vi.stubGlobal("addEventListener", (type: string, listener: WindowListener) => {
    if (!windowListeners.has(type)) windowListeners.set(type, new Set());
    windowListeners.get(type)!.add(listener);
  });
  vi.stubGlobal("removeEventListener", (type: string, listener: WindowListener) => {
    windowListeners.get(type)?.delete(listener);
  });
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
  delete miniElementProto.click;
  delete miniElementProto.querySelectorAll;
  miniDocument.createElement = createMiniElement;
  delete miniDocumentQueries.querySelectorAll;
  vi.unstubAllGlobals();
});

describe("unread notification rows", () => {
  function renderRow(href: string) {
    render(
      createElement(
        HousePathProvider,
        null,
        createElement(HouseProbe),
        createElement(
          MessageLink,
          // children ride as the third argument (react/no-children-prop).
          { id: "n-1", href, unread: true } as ComponentProps<typeof MessageLink>,
          "Open",
        ),
      ),
    );
  }

  async function settleMarkRead() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  it("marks read, then stays on the screen it already shows", async () => {
    renderRow("/social");

    click(findLink("/social"));
    await settleMarkRead();

    expect(notifications.read).toEqual([["n-1"]]);
    expect(probe.house?.pathname).toBe("/social");
    expect(nav.push).not.toHaveBeenCalled();
    expect(shellHistory.pushState).not.toHaveBeenCalled();
  });

  it("marks read, then hands another screen to Next", async () => {
    renderRow("/education");

    click(findLink("/education"));
    await settleMarkRead();

    expect(notifications.read).toEqual([["n-1"]]);
    expect(nav.push).toHaveBeenCalledWith("/education");
    expect(shellHistory.pushState).not.toHaveBeenCalled();
  });
});

// The screen Next shows is the screen. Before, a dock tap to a visited
// screen pushStated to a kept copy of the layout's children, which renders
// Next's current route: the address moved and the page stayed behind.
describe("dock hops to another screen go through Next", () => {
  function renderWaffle() {
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

  it("waffle Home exit: pushes Home through Next and closes the sheet", () => {
    renderWaffle();

    const event = click(findLink("/home"));

    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/home");
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
    expect(() => findLink("/home")).toThrow();
  });

  it("waffle Home exit: leaves a modified click to the browser", () => {
    renderWaffle();

    const event = click(findLink("/home"), { metaKey: true });

    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  // Each landing is a new screen element, as a Next navigation renders.
  function shellAt(pathname: string) {
    startAt(pathname);
    render(
      createElement(
        HousePathProvider,
        null,
        createElement(HouseProbe),
        createElement(HouseScreenOutlet, null, createElement("p", null, `screen ${pathname}`)),
      ),
    );
  }

  function screens(): string[] {
    const found: string[] = [];
    const stack: MiniNode[] = [miniDocument.body as unknown as MiniNode];
    for (let node = stack.pop(); node; node = stack.pop()) {
      if (node.nodeType === 1 && node.hasAttribute?.("data-house-screen")) {
        found.push((node as unknown as { textContent: string }).textContent);
      }
      stack.push(...node.childNodes);
    }
    return found;
  }

  it("never pushStates to a screen visited before", () => {
    shellAt("/social");
    shellAt("/home");
    shellAt("/social");

    act(() => {
      expect(probe.house?.navigateOwned("/home")).toBe(false);
    });

    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(probe.house?.pathname).toBe("/social");
  });

  // Story create's frame is a flex column the page fills (flex-1,
  // min-h-full). A block wrapper collapsed the stage to its cards.
  it("marks the screen without adding a layout box", () => {
    shellAt("/social/stories/new");

    const wrapper = findByAttribute("data-house-screen") as unknown as {
      getAttribute(name: string): string | null;
      className?: string;
    };
    const classes = wrapper.getAttribute("class") ?? wrapper.className ?? "";
    expect(classes.split(/\s+/)).toContain("contents");
  });

  it("keeps only the screen Next shows, with no hidden copies", () => {
    shellAt("/social");
    shellAt("/home");
    shellAt("/aggregation/titles");

    expect(screens()).toEqual(["screen /aggregation/titles"]);
  });
});

// Next restores every entry on Back and Forward: its own, and the shell's
// panel entries, which carry the flight tree they were pushed over.
describe("Back and Forward", () => {
  it("drops the owned panel query and leaves the restore to Next", () => {
    startAt("/social/profile");
    render(createElement(HousePathProvider, null, createElement(HouseProbe)));
    panelHop("/social/profile?tab=media");
    expect(probe.house?.href).toBe("/social/profile?tab=media");

    shellLocation.search = "";
    fireWindow("popstate", { state: { __NA: true } });

    expect(probe.house?.href).toBe("/social/profile");
    expect(nav.replace).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe("scroll memory", () => {
  // Workspace pills are buttons: navigateOwned, then router.push. They
  // never reach the shell's anchor listener.
  it("remembers the screen's scroll when a button hop leaves it", () => {
    const scroller = miniDocument.createElement("div") as unknown as { scrollTop: number };
    scroller.scrollTop = 480;
    const doc = miniDocument as unknown as { querySelector: (selector: string) => unknown };
    const querySelector = doc.querySelector;
    doc.querySelector = (selector) => (selector === "[data-house-lead-scroll]" ? scroller : null);
    try {
      render(createElement(HousePathProvider, null, createElement(HouseProbe)));

      act(() => {
        expect(probe.house?.navigateOwned("/home")).toBe(false);
      });

      expect(houseReadScroll("/social")).toBe(480);
    } finally {
      doc.querySelector = querySelector;
    }
  });
});

describe("house links keep their own click handler", () => {
  function renderLink(link: ReactNode) {
    render(createElement(HousePathProvider, null, createElement(HouseProbe), link));
  }

  it("runs a HouseLink onClick, then hands another screen to Next", () => {
    const onClick = vi.fn();
    renderLink(createElement(HouseLink, { href: "/home", onClick }, "Home"));

    const event = click(findLink("/home"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/home");
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("runs a HouseLink onClick, then the shell owns a panel hop", () => {
    startAt("/social/profile");
    const onClick = vi.fn();
    renderLink(createElement(HouseLink, { href: "/social/profile?tab=media", onClick }, "Media"));

    const event = click(findLink("/social/profile?tab=media"));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState.mock.calls[0]?.[2]).toBe("/social/profile?tab=media");
    expect(probe.house?.href).toBe("/social/profile?tab=media");
    expect(nav.push).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("lets a HouseLink onClick take the click over", () => {
    const takeOver = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    renderLink(createElement(HouseLink, { href: "/home", onClick: takeOver }, "Home"));

    click(findLink("/home"));

    expect(takeOver).toHaveBeenCalledTimes(1);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
    expect(probe.house?.pathname).toBe("/social");
  });

  it("owns a panel hop on a raw link and leaves another screen to it", () => {
    startAt("/social/profile");
    renderLink(
      createElement(
        "div",
        null,
        createElement("a", { href: "/social/profile?tab=media" }, "Media"),
        createElement("a", { href: "/home" }, "Home"),
      ),
    );

    const panel = click(findLink("/social/profile?tab=media"));
    expect(panel.defaultPrevented).toBe(true);
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);

    const other = click(findLink("/home"));
    expect(other.defaultPrevented).toBe(false);
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe("account menu across navigations", () => {
  function renderMenu() {
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
  }

  it("closes when Next leaves the page it opened on", () => {
    renderMenu();

    nextNavigate("/home");

    expect(probe.menu?.open).toBe(false);
  });

  it("stays closed when a later navigation returns to that page", () => {
    renderMenu();
    nextNavigate("/home");

    nextNavigate("/social");

    expect(probe.house?.pathname).toBe("/social");
    expect(probe.menu?.open).toBe(false);
  });
});

describe("24Frame AI over a panel hop", () => {
  function renderAskAi() {
    startAt("/social/profile");
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
    panelHop("/social/profile?tab=media");
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
    expect(probe.house?.href).toBe("/social/profile?tab=media");
  }

  it("opens on the screen and query the shell shows", () => {
    renderAskAi();

    act(() => probe.ai?.openAskAi());

    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/social/profile?tab=media&ai=1");
  });

  it("closes onto the screen and query the shell shows", () => {
    renderAskAi();

    act(() => probe.ai?.closeAskAi());

    expect(nav.replace).toHaveBeenCalledTimes(1);
    expect(nav.replace).toHaveBeenCalledWith("/social/profile?tab=media");
  });
});

describe("Social, AI and News links keep their click handler", () => {
  const WRITE = SOCIAL_CREATE_TILES.find((tile) => tile.id === "write")!;
  const MEDIA = SOCIAL_CREATE_TILES.find((tile) => tile.id === "media")!;


  function renderInShell(node: ReactNode) {
    render(createElement(HousePathProvider, null, createElement(HouseProbe), node));
  }

  function renderFan() {
    richerMiniElements();
    renderInShell(
      createElement(SocialCreateFan, {
        defaultOpen: true,
        trigger: createElement("button", { type: "button" }, "Create"),
      }),
    );
  }

  it("Create sheet Write tile: runs onPick, then Next opens the screen", () => {
    const onPick = vi.fn();
    renderInShell(createElement(SocialCreateTile, { tile: WRITE, onPick }));

    const event = click(findLink(WRITE.href));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(WRITE.href);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);
  });

  it("Create sheet Media tile: opens the picker and never hops", () => {
    const pick = vi.fn();
    miniElementProto.click = pick;
    renderInShell(createElement(SocialCreateTile, { tile: MEDIA }));

    const event = click(findLink(MEDIA.href));

    expect(pick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("Create fan Write item: closes the fan, then Next opens the screen", () => {
    renderFan();
    expect(findLink(WRITE.href).getAttribute?.("data-open")).toBe("");

    click(findLink(WRITE.href));

    expect(nav.push).toHaveBeenCalledWith(WRITE.href);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(findLink(WRITE.href).getAttribute?.("data-open")).toBeNull();
  });

  it("Create fan Media item: opens the picker and never hops", () => {
    const pick = vi.fn();
    miniElementProto.click = pick;
    renderFan();

    const event = click(findLink(MEDIA.href));

    expect(pick).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("24Frame AI face: runs onOpen, then Next opens the thread", () => {
    const href = socialFrameAiThreadHref();
    const onOpen = vi.fn();
    renderInShell(
      createElement(SocialFrameAiOpen, {
        className: "",
        faceClassName: "",
        label: "24Frame AI",
        labelClassName: "",
        marker: {},
        onOpen,
      }),
    );

    click(findLink(href));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(href);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
  });

  it("News source pill: selects in place and never hops", () => {
    const source = NEWS_SOURCE_FILTER_SOURCES[0]!;
    const href = newsHistoryHref([source.id]);
    startAt(NEWS_HREF);
    const onSelect = vi.fn();
    richerMiniElements();
    renderInShell(createElement(NewsSourceChips, { selected: [], onSelect }));

    const event = click(findLink(href));

    expect(onSelect).toHaveBeenCalledWith([source.id]);
    expect(event.defaultPrevented).toBe(true);
    expect(shellHistory.pushState).not.toHaveBeenCalled();
    expect(nav.push).not.toHaveBeenCalled();
  });
});

describe("Ask AI history rows", () => {
  const THREAD = "0f8e2c1a-5b7d-4e3f-9a6b-2c4d6e8f0a1b";
  const NOW = new Date("2026-10-02T12:00:00Z");
  const ROWS = [
    {
      id: THREAD,
      title: "Delivery status",
      pinned_at: null,
      created_at: "2026-10-01T09:00:00Z",
      updated_at: "2026-10-01T09:00:00Z",
    },
  ];
  const chrome: { historyOpen: boolean; setHistoryOpen: ((open: boolean) => void) | null } = {
    historyOpen: false,
    setHistoryOpen: null,
  };

  function ChromeProbe() {
    const { historyOpen, setHistoryOpen } = useAskGlobeeChrome();
    useEffect(() => {
      chrome.historyOpen = historyOpen;
      chrome.setHistoryOpen = setHistoryOpen;
    });
    return null;
  }

  // History open over a panel hop: the shell shows ?tab=media, and Next
  // still shows the screen's earlier query.
  function renderHistory() {
    startAt("/social/profile");
    render(
      createElement(
        HousePathProvider,
        null,
        createElement(HouseProbe),
        createElement(
          AskAssistantChromeProvider,
          null,
          createElement(ChromeProbe),
          createElement(AskGlobeeHistoryPanel, { conversations: ROWS, now: NOW }),
        ),
      ),
    );
    panelHop("/social/profile?tab=media");
    act(() => chrome.setHistoryOpen?.(true));
    expect(chrome.historyOpen).toBe(true);
  }

  it("opens the thread through Next and keeps the screen's own query", () => {
    renderHistory();

    const event = click(findLink(`?ai=${THREAD}`));

    expect(event.defaultPrevented).toBe(true);
    expect(chrome.historyOpen).toBe(false);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(`/social/profile?tab=media&ai=${THREAD}`);
    // The panel hop only. A shell pushState here would hide ?ai= from the
    // overlay, which reads Next's search params.
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
  });

  it("leaves a modified click to the browser", () => {
    renderHistory();

    const event = click(findLink(`?ai=${THREAD}`), { metaKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(nav.push).not.toHaveBeenCalled();
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
  });
});

describe("Ask AI landing and thread header keep the screen's query", () => {
  const THREAD = "7c1d9e4b-3a2f-4b6c-8d5e-1f0a2b3c4d5e";

  // The overlay over a panel hop: the shell shows ?tab=media, and Next
  // still shows the screen's earlier query.
  function renderOverScreen(node: ReactNode) {
    startAt("/social/profile");
    render(createElement(HousePathProvider, null, createElement(HouseProbe), node));
    panelHop("/social/profile?tab=media");
  }

  function renderThreadHeader() {
    renderOverScreen(
      createElement(
        AskAssistantChromeProvider,
        // children ride as the third argument (react/no-children-prop).
        {
          initialChrome: { id: THREAD, title: "Delivery status", pinned_at: null },
        } as ComponentProps<typeof AskAssistantChromeProvider>,
        createElement(MessagesAppHeader, { surface: "ask-globee-thread" }),
      ),
    );
  }

  it("thread header Back opens the landing on that screen, through Next", () => {
    renderThreadHeader();

    const event = click(findLink("?ai=1"));

    expect(event.defaultPrevented).toBe(true);
    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith("/social/profile?tab=media&ai=1");
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
  });

  it("thread header Back leaves a modified click to the browser", () => {
    renderThreadHeader();

    const event = click(findLink("?ai=1"), { metaKey: true });

    expect(event.defaultPrevented).toBe(false);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("a new conversation from the landing opens on that screen, through Next", async () => {
    askActions.startedId = THREAD;
    renderOverScreen(createElement(AskGlobeeLanding));

    click(findByAttribute("data-ask-globee-chip"));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(nav.push).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(`/social/profile?tab=media&ai=${THREAD}`);
    expect(shellHistory.pushState).toHaveBeenCalledTimes(1);
  });
});
