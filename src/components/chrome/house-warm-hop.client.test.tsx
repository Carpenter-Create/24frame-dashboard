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
import { AskAiOverlayProvider, useAskAiOverlay } from "./ask-ai-overlay";
import { HousePathProvider, useHouseClient } from "./house-client-shell";

const miniDocument = minimalDocument();
// The shell's instanceof checks need DOM classes. Every mini node is one class.
const MiniElement = miniDocument.createElement("a").constructor;

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
} = { house: null, ai: null };

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
  vi.unstubAllGlobals();
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
