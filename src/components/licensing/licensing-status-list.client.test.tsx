import "@/test/minimal-document";

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HouseWindowEntryOptions } from "@/components/chrome/house-window";
import type { DeliverActions, DeliverCloseOutcome } from "@/lib/deliver-stepper";
import type { LicensingTitleGroup } from "@/lib/gc-deliveries";
import { minimalDocument, serializeElement } from "@/test/minimal-document";

// The list mounted and driven: ticks, a search or filter that changes the
// rows under them, the Deliver bar, and what the window is handed. The shell
// entry and the window are stubs (each has its own tests); this file checks
// the list's side of the contract
// (docs/design-locks/staff-licensing-deliver-window-lock-v1.md §7, §9, §11).

const nav = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: nav.refresh }),
}));

vi.mock("next/image", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ src, className }: { src: string; className?: string }) =>
      createElement("img", { src, className, alt: "" }),
  };
});

const shell = vi.hoisted(() => ({
  options: null as HouseWindowEntryOptions<"channel"> | null,
  win: null as { face: "channel"; key: number } | null,
  openFromPage: vi.fn(),
  close: vi.fn(),
}));

vi.mock("@/components/chrome/house-window", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-window")>()),
  useHouseWindowEntry: (options: HouseWindowEntryOptions<"channel">) => {
    shell.options = options;
    return {
      win: shell.win,
      saving: false,
      requestRef: { current: null },
      openFromPage: shell.openFromPage,
      close: shell.close,
      reopenAfterFailure: () => undefined,
      onPersisting: () => undefined,
      push: () => undefined,
      addressHasWindow: () => false,
    };
  },
}));

type WindowProps = { titleIds: readonly string[]; onClose: (outcome: DeliverCloseOutcome) => void };

const deliverWindow = vi.hoisted(() => ({ props: null as WindowProps | null }));

vi.mock("@/components/licensing/deliver-window", () => ({
  DeliverWindow: (props: WindowProps) => {
    deliverWindow.props = props;
    return null;
  },
}));

import { LicensingStatusList } from "./licensing-status-list";

const TITLE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const TITLE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2";

function group(id: string, title: string): LicensingTitleGroup {
  return {
    id,
    title,
    href: `/gc/titles/${id}`,
    stillUrl: null,
    year: "2024",
    publicId: null,
    lastActivity: null,
    vendors: [],
  };
}

const NORTH_STAR = group(TITLE_A, "North Star");
const HARBOR = group(TITLE_B, "Harbor");

const actions: DeliverActions = {
  load: vi.fn(async () => ({ ok: false as const, reason: "load_failed" as const })),
  deliver: vi.fn(async () => ({ created: [], existing: [], failed: [], stop: null })),
};

type MiniNode = {
  nodeType: number;
  childNodes: MiniNode[];
  getAttribute?(name: string): string | null;
};

const miniDocument = minimalDocument();
let container: ReturnType<typeof miniDocument.createElement>;
let root: Root;

function render(groups: readonly LicensingTitleGroup[]) {
  act(() =>
    root.render(
      createElement(LicensingStatusList, {
        groups,
        vendors: [{ id: "v1", name: "Channel One" }],
        canDeliver: true,
        deliverActions: actions,
        empty: createElement("p", { "data-gc-licensing-empty": "" }, "No match."),
      }),
    ),
  );
}

function html(): string {
  return serializeElement(container);
}

function find(name: string, value = ""): MiniNode {
  const stack: MiniNode[] = [container as unknown as MiniNode];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.nodeType === 1 && node.getAttribute?.(name) === value) return node;
    stack.push(...node.childNodes);
  }
  throw new Error(`no element with ${name}="${value}"`);
}

// React listens at its root: a click there with the row's node as target
// runs that node's onClick.
function click(target: MiniNode) {
  const event = {
    type: "click",
    target,
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    timeStamp: 0,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    stopPropagation() {},
  };
  act(() => {
    container.dispatchEvent(event as unknown as Event);
  });
}

function tick(id: string) {
  click(find("data-gc-licensing-select", id));
}

const location = { pathname: "/staff/gc/deliveries", search: "" };
const history = { replaceState: vi.fn() };

beforeEach(() => {
  shell.options = null;
  shell.win = null;
  shell.openFromPage.mockClear();
  shell.close.mockClear();
  nav.refresh.mockClear();
  deliverWindow.props = null;
  location.search = "";
  history.replaceState.mockClear();
  vi.stubGlobal("location", location);
  vi.stubGlobal("history", history);
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("Licensing Status ticks and Deliver (mounted)", () => {
  it("a search that hides every row takes the Deliver bar with it; the tick comes back with the row", () => {
    render([NORTH_STAR, HARBOR]);
    tick(TITLE_A);
    expect(html()).toContain("data-gc-licensing-deliver-bar");
    expect(html()).toContain("Deliver · 1");

    // The search matches nothing: the list stays mounted and draws the empty
    // state, and there is no Deliver to open over it.
    render([]);
    expect(html()).toContain('<p data-gc-licensing-empty="">No match.</p>');
    expect(html()).not.toContain("data-gc-licensing-deliver-bar");
    expect(html()).not.toContain("Deliver · ");

    // A filter that hides only the ticked row: no Deliver either.
    render([HARBOR]);
    expect(html()).not.toContain("data-gc-licensing-deliver-bar");

    // The row shows again, still ticked.
    render([NORTH_STAR, HARBOR]);
    expect(find("data-gc-licensing-select", TITLE_A).getAttribute?.("aria-checked")).toBe("true");
    expect(html()).toContain("Deliver · 1");
  });

  it("counts and hands the window only the ticks the list draws", () => {
    render([NORTH_STAR, HARBOR]);
    tick(TITLE_A);
    tick(TITLE_B);
    expect(html()).toContain("Deliver · 2");

    render([HARBOR]);
    expect(html()).toContain("Deliver · 1");
    click(find("data-gc-licensing-deliver"));
    expect(shell.openFromPage).toHaveBeenCalledWith("channel");

    shell.win = { face: "channel", key: 1 };
    render([HARBOR]);
    expect(deliverWindow.props?.titleIds).toEqual([TITLE_B]);
  });

  it("a bare ?deliver forwards only drawn ticks, and opens nothing when every tick is hidden", () => {
    render([NORTH_STAR, HARBOR]);
    tick(TITLE_A);
    render([HARBOR]);
    location.search = "?deliver";
    let opened = true;
    act(() => {
      opened = shell.options!.opensOnArrival();
    });
    expect(opened).toBe(false);
    expect(history.replaceState).toHaveBeenCalledWith({}, "", "/staff/gc/deliveries");

    render([NORTH_STAR, HARBOR]);
    act(() => {
      opened = shell.options!.opensOnArrival();
    });
    expect(opened).toBe(true);
    shell.win = { face: "channel", key: 1 };
    render([NORTH_STAR, HARBOR]);
    expect(deliverWindow.props?.titleIds).toEqual([TITLE_A]);
  });

  it("on close, delivered titles un-tick, the rest stay ticked, and the refresh waits for Back", () => {
    render([NORTH_STAR, HARBOR]);
    tick(TITLE_A);
    tick(TITLE_B);
    click(find("data-gc-licensing-deliver"));
    shell.win = { face: "channel", key: 7 };
    render([NORTH_STAR, HARBOR]);
    expect(deliverWindow.props?.titleIds).toEqual([TITLE_A, TITLE_B]);

    act(() => deliverWindow.props!.onClose({ saved: true, delivered: [TITLE_A], created: ["d-9"] }));
    expect(shell.close).toHaveBeenCalledTimes(1);
    expect(shell.close.mock.calls[0]![0]).toBe(7);
    expect(nav.refresh).not.toHaveBeenCalled();

    shell.win = null;
    render([NORTH_STAR, HARBOR]);
    expect(find("data-gc-licensing-select", TITLE_A).getAttribute?.("aria-checked")).toBe("false");
    expect(find("data-gc-licensing-select", TITLE_B).getAttribute?.("aria-checked")).toBe("true");
    expect(html()).toContain("Deliver · 1");

    const after = shell.close.mock.calls[0]![1] as () => void;
    act(() => after());
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it("a failed title stays ticked; a tick hidden while Deliver ran drops at close", () => {
    render([NORTH_STAR, HARBOR]);
    tick(TITLE_A);
    tick(TITLE_B);
    render([HARBOR]);
    click(find("data-gc-licensing-deliver"));
    shell.win = { face: "channel", key: 3 };
    render([HARBOR]);
    expect(deliverWindow.props?.titleIds).toEqual([TITLE_B]);

    // Harbor failed: nothing delivered, nothing saved.
    act(() => deliverWindow.props!.onClose({ saved: false, delivered: [], created: [] }));
    expect(shell.close).toHaveBeenCalledWith(3, undefined);

    shell.win = null;
    render([NORTH_STAR, HARBOR]);
    expect(find("data-gc-licensing-select", TITLE_B).getAttribute?.("aria-checked")).toBe("true");
    expect(find("data-gc-licensing-select", TITLE_A).getAttribute?.("aria-checked")).toBe("false");
    expect(html()).toContain("Deliver · 1");
  });
});
