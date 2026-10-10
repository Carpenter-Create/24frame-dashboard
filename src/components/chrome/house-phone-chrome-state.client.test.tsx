import "@/test/minimal-document";

import { act, createElement, Fragment, useLayoutEffect, type ReactNode, type RefObject } from "react";
import { readFileSync } from "node:fs";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOUSE_PHONE_CHROME_HEIGHT_VAR, HOUSE_PHONE_DOCK_HIDDEN_ATTR, HOUSE_PHONE_SHEET_Y_VAR } from "@/lib/house-lead-chrome";
import { HOUSE_LEAD_SCROLL_TO_TOP_EVENT } from "@/lib/house-lead-scroll-to-top";
import { HOUSE_PHONE_CHROME_MEDIA } from "@/lib/house-phone-chrome";
import { minimalDocument } from "@/test/minimal-document";

// One router instance across renders, as Next's useRouter gives.
const router = vi.hoisted(() => ({
  push: () => undefined,
  refresh: () => undefined,
  replace: () => undefined,
  prefetch: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/aggregation/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", async () => {
  const React = await import("react");
  return {
    __esModule: true,
    default: (props: { href: string; children?: ReactNode; prefetch?: boolean }) => {
      // An anchor takes no `prefetch` attribute.
      const attrs: Record<string, unknown> = { ...props };
      delete attrs.children;
      delete attrs.prefetch;
      return React.createElement("a", attrs, props.children);
    },
    useLinkStatus: () => ({ pending: false }),
  };
});

// The track measures the DOM (not here); the dock's items are what count.
vi.mock("@/components/ui/segmented-track", async () => {
  const React = await import("react");
  return {
    SegmentedTrack: ({ children }: { children: ReactNode | ((state: { selectedIndex: number }) => ReactNode) }) =>
      React.createElement(React.Fragment, null, typeof children === "function" ? children({ selectedIndex: -1 }) : children),
  };
});

import { HousePhoneBottomNav } from "./house-phone-bottom-nav";
import {
  HousePhoneChromeContext,
  useHousePhoneBandValue,
  useHousePhoneChromeTracker,
  type HousePhoneBand,
  type HousePhoneChrome,
} from "./house-phone-chrome-state";

// docs/design-locks/shell-phone-workspace-band-lock-v1.md G8, G15, G16 (v1.5,
// Adam 2026-10-09: "fix and change everything that you recommend").

type Entry = { type: string; listener: unknown; capture: boolean };

const captureOf = (options: unknown) =>
  typeof options === "object" && options !== null && (options as { capture?: boolean }).capture === true;

function fakeTarget<T extends object>(extra: T) {
  const added: Entry[] = [];
  const removed: Entry[] = [];
  const listeners = new Map<string, (event?: unknown) => void>();
  return Object.assign(
    {
      added,
      removed,
      listeners,
      addEventListener(type: string, listener: (event?: unknown) => void, options?: unknown) {
        added.push({ type, listener, capture: captureOf(options) });
        listeners.set(type, listener);
      },
      removeEventListener(type: string, listener: unknown, options?: unknown) {
        removed.push({ type, listener, capture: captureOf(options) });
        if (listeners.get(type) === listener) listeners.delete(type);
      },
    },
    extra,
  );
}

function shell({ scrollend = true }: { scrollend?: boolean } = {}) {
  const scroller = fakeTarget({
    scrollTop: 0,
    scrollHeight: 2800,
    clientHeight: 800,
    scrollTo: vi.fn(),
    ...(scrollend ? { onscrollend: null } : {}),
  });
  const stack = { offsetHeight: 130, getClientRects: () => [{}] };
  const attrs = new Set<string>();
  const vars = new Map<string, string>();
  const root = fakeTarget({
    attrs,
    vars,
    setAttribute: (name: string) => {
      attrs.add(name);
    },
    removeAttribute: (name: string) => {
      attrs.delete(name);
    },
    style: {
      setProperty: (name: string, value: string) => {
        vars.set(name, value);
      },
    },
    querySelector: (selector: string) =>
      selector === "[data-house-lead-scroll]" ? scroller : selector === "[data-house-lead-stack]" ? stack : null,
  });
  const ref = { current: root as unknown as HTMLElement } as RefObject<HTMLElement | null>;
  const scroll = (y: number) => {
    scroller.scrollTop = y;
    scroller.listeners.get("scroll")?.();
  };
  return { root, scroller, ref, scroll };
}

// matchMedia: the phone query is switchable; everything else is off.
const phone = { matches: true, listeners: new Set<() => void>() };
function installMedia() {
  const host = globalThis as unknown as Record<string, unknown>;
  host.matchMedia = (query: string) =>
    query === HOUSE_PHONE_CHROME_MEDIA
      ? {
          get matches() {
            return phone.matches;
          },
          addEventListener: (_type: string, listener: () => void) => phone.listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => phone.listeners.delete(listener),
        }
      : { matches: false, addEventListener: () => undefined, removeEventListener: () => undefined };
  host.requestAnimationFrame = () => 1;
  host.cancelAnimationFrame = () => undefined;
}
function setPhone(matches: boolean) {
  phone.matches = matches;
  for (const listener of [...phone.listeners]) listener();
}

const seen: HousePhoneChrome[] = [];
const atLayout: Array<{ dock: boolean; y: string | undefined }> = [];

function AttrProbe({ pathname, root }: { pathname: string; root: ReturnType<typeof shell>["root"] }) {
  // A child's layout effect runs after the parent's layout cleanup and
  // before any passive effect: what the new route's first paint sees.
  useLayoutEffect(() => {
    atLayout.push({ dock: root.attrs.has(HOUSE_PHONE_DOCK_HIDDEN_ATTR), y: root.vars.get(HOUSE_PHONE_SHEET_Y_VAR) });
  }, [pathname, root]);
  return null;
}

function TrackerProbe({ s, pathname }: { s: ReturnType<typeof shell>; pathname: string }) {
  const chrome = useHousePhoneChromeTracker(s.ref, pathname);
  useLayoutEffect(() => {
    seen.push(chrome);
  });
  return createElement(AttrProbe, { pathname, root: s.root });
}

const bands: HousePhoneBand[] = [];
function BandProbe({ chrome }: { chrome: HousePhoneChrome }) {
  const band = useHousePhoneBandValue(chrome);
  useLayoutEffect(() => {
    bands.push(band);
  });
  return null;
}

let root: Root | null = null;
function mount(node: ReactNode) {
  const container = minimalDocument().createElement("div");
  minimalDocument().body.appendChild(container);
  root = createRoot(container as unknown as Element);
  act(() => root?.render(node));
}

beforeEach(() => {
  installMedia();
  setPhone(true);
  seen.length = 0;
  atLayout.length = 0;
  bands.length = 0;
  router.prefetch.mockClear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

afterAll(() => {
  const host = globalThis as unknown as Record<string, unknown>;
  delete host.matchMedia;
  delete host.requestAnimationFrame;
  delete host.cancelAnimationFrame;
});

describe("useHousePhoneChromeTracker (band lock v1.5)", () => {
  it("H1: the band's value keeps its identity across dock flips and changes with the band", () => {
    const open = () => {};
    mount(createElement(BandProbe, { chrome: { dockHidden: false, bandTucked: false, open } }));
    act(() => root?.render(createElement(BandProbe, { chrome: { dockHidden: true, bandTucked: false, open } })));
    act(() => root?.render(createElement(BandProbe, { chrome: { dockHidden: false, bandTucked: false, open } })));
    expect(bands).toHaveLength(3);
    expect(bands[1]).toBe(bands[0]);
    expect(bands[2]).toBe(bands[0]);
    act(() => root?.render(createElement(BandProbe, { chrome: { dockHidden: true, bandTucked: true, open } })));
    expect(bands[3]).not.toBe(bands[0]);
    expect(bands[3]).toEqual({ bandTucked: true, open });
  });

  it("H2: on phone it binds scroll, scrollend and the bridge on main, four passive touches on the shell; unmount removes each", () => {
    const s = shell();
    mount(createElement(TrackerProbe, { s, pathname: "/a" }));
    expect(s.scroller.added.map((entry) => entry.type)).toEqual(["scroll", "scrollend", HOUSE_LEAD_SCROLL_TO_TOP_EVENT]);
    expect(s.root.added.map((entry) => entry.type)).toEqual(["touchstart", "touchmove", "touchend", "touchcancel"]);
    expect(s.root.vars.get(HOUSE_PHONE_CHROME_HEIGHT_VAR)).toBe("130px");
    act(() => root?.unmount());
    root = null;
    for (const target of [s.scroller, s.root]) {
      const key = (entry: Entry) => `${entry.type} ${entry.capture}`;
      expect(target.removed.map(key).sort()).toEqual(target.added.map(key).sort());
      for (const entry of target.added) {
        expect(target.removed.some((gone) => gone.type === entry.type && gone.listener === entry.listener)).toBe(true);
      }
    }
  });

  it("H2: a scroller without onscrollend gets the 120ms timer, no scrollend listener", () => {
    const s = shell({ scrollend: false });
    mount(createElement(TrackerProbe, { s, pathname: "/a" }));
    expect(s.scroller.added.map((entry) => entry.type)).toEqual(["scroll", HOUSE_LEAD_SCROLL_TO_TOP_EVENT]);
  });

  it("H2/G16: off phone nothing is bound, and the chrome reads open even after a stale state", () => {
    const s = shell();
    mount(createElement(TrackerProbe, { s, pathname: "/a" }));
    act(() => s.scroll(400));
    expect(seen.at(-1)).toMatchObject({ dockHidden: true, bandTucked: true });
    expect(s.root.attrs.has(HOUSE_PHONE_DOCK_HIDDEN_ATTR)).toBe(true);
    act(() => setPhone(false));
    expect(seen.at(-1)).toMatchObject({ dockHidden: false, bandTucked: false });
    expect(s.root.attrs.has(HOUSE_PHONE_DOCK_HIDDEN_ATTR)).toBe(false);
    expect(s.scroller.removed.map((entry) => entry.type)).toContain("scroll");
    // Back on phone: a fresh tracker, from open.
    act(() => setPhone(true));
    expect(seen.at(-1)).toMatchObject({ dockHidden: false, bandTucked: false });
    expect(s.scroller.added.filter((entry) => entry.type === "scroll")).toHaveLength(2);

    const desk = shell();
    setPhone(false);
    act(() => root?.render(createElement(TrackerProbe, { s: desk, pathname: "/b" })));
    expect(desk.scroller.added).toHaveLength(0);
    expect(desk.root.added).toHaveLength(0);
    expect(desk.root.vars.size).toBe(0);
  });

  it("H3: a navigation stops the tracker in the new route's commit, then binds again", () => {
    const s = shell();
    mount(createElement(TrackerProbe, { s, pathname: "/a" }));
    act(() => s.scroll(400));
    expect(s.root.attrs.has(HOUSE_PHONE_DOCK_HIDDEN_ATTR)).toBe(true);
    expect(s.root.vars.get(HOUSE_PHONE_SHEET_Y_VAR)).toBe("56px");
    act(() => root?.render(createElement(TrackerProbe, { s, pathname: "/b" })));
    // Already clear when the new route's layout runs (before it paints).
    expect(atLayout.at(-1)).toEqual({ dock: false, y: "0px" });
    expect(seen.at(-1)).toMatchObject({ dockHidden: false, bandTucked: false });
    expect(s.scroller.added.filter((entry) => entry.type === "scroll")).toHaveLength(2);
    expect(s.scroller.removed.filter((entry) => entry.type === "scroll")).toHaveLength(1);
    const src = readFileSync("src/components/chrome/house-phone-chrome-state.tsx", "utf8");
    expect(src).toContain("useLayoutEffect(() => halt, [pathname, halt]);");
  });

  it("H4: the dock's destinations survive a dock flip, so it never re-prefetches them", () => {
    const open = () => {};
    const dock = (dockHidden: boolean) =>
      createElement(
        HousePhoneChromeContext.Provider,
        { value: { dockHidden, bandTucked: dockHidden, open } },
        createElement(Fragment, null, createElement(HousePhoneBottomNav, { workspace: "aggregation" })),
      );
    mount(dock(false));
    const first = router.prefetch.mock.calls.length;
    expect(first).toBeGreaterThan(0);
    act(() => root?.render(dock(true)));
    act(() => root?.render(dock(false)));
    act(() => root?.render(dock(true)));
    expect(router.prefetch.mock.calls.length).toBe(first);
  });
});
