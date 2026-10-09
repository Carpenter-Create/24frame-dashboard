import "@/test/minimal-document";

import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HouseWindowOptions } from "@/components/chrome/house-window";
import type {
  DeliverActions,
  DeliverItem,
  DeliverTitleRow,
  DeliverTitlesResult,
  GrantChoice,
} from "@/lib/deliver-stepper";
import { minimalDocument, serializeElement } from "@/test/minimal-document";

// The Deliver window mounted with fake actions: the walk to "Deliver · N",
// the batched commit, and what each outcome does to the face and to close
// (docs/design-locks/staff-licensing-deliver-window-lock-v1.md §6). The
// shell is a stub that hands the test its header action (Continue / Deliver /
// Done, as a click or ⌘/Ctrl+Enter would) and its ✕; the shell has its own
// tests.

const shell = vi.hoisted(() => ({ options: null as HouseWindowOptions | null }));

vi.mock("@/components/chrome/house-window", async (importActual) => {
  const { createElement } = await import("react");
  return {
    ...(await importActual<typeof import("@/components/chrome/house-window")>()),
    useHouseWindow: (options: HouseWindowOptions) => {
      shell.options = options;
      return [
        { askTitleId: "ask", keepEditing: () => undefined, discard: () => undefined },
        { frameRef: { current: null }, bodyRef: { current: null } },
      ];
    },
    HouseWindowFrame: ({
      title,
      doneLabel,
      doneDisabled,
      children,
    }: {
      title: string;
      doneLabel: string;
      doneDisabled: boolean;
      children: ReactNode;
    }) =>
      createElement(
        "section",
        {
          "data-stub-frame": "",
          "data-title": title,
          "data-done": doneLabel,
          "data-done-disabled": doneDisabled ? "true" : "false",
        },
        children,
      ),
    HouseWindowAsk: () => null,
  };
});

vi.mock("@/components/chrome/house-overlay", async (importActual) => ({
  ...(await importActual<typeof import("@/components/chrome/house-overlay")>()),
  useHouseDesktop: () => true,
}));

import { DeliverWindow } from "./deliver-window";

function tid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

const VENDORS = [
  { id: "v1", name: "Channel One" },
  { id: "v2", name: "Channel Two" },
];

type MiniNode = {
  nodeType: number;
  childNodes: MiniNode[];
  getAttribute?(name: string): string | null;
};

const miniDocument = minimalDocument();
let container: ReturnType<typeof miniDocument.createElement>;
let root: Root;

function html(): string {
  return serializeElement(container);
}

function all(name: string): MiniNode[] {
  const out: MiniNode[] = [];
  const walk = (node: MiniNode) => {
    if (node.nodeType === 1 && node.getAttribute?.(name) !== null && node.getAttribute?.(name) !== undefined) {
      out.push(node);
    }
    node.childNodes.forEach(walk);
  };
  walk(container as unknown as MiniNode);
  return out;
}

function frame(attr: string): string | null {
  return all("data-stub-frame")[0]?.getAttribute?.(attr) ?? null;
}

function face(): string | null {
  return all("data-deliver-face")[0]?.getAttribute?.("data-deliver-face") ?? null;
}

// React listens at its root: a click there with the card as target runs the
// card's onClick.
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

// Every fake answer resolves in microtasks: one macrotask lets the load or
// every batch settle.
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** The header's action: Continue, Deliver · N, or Done. */
async function headerAction() {
  act(() => shell.options!.onDone());
  await settle();
}

type DeliverInput = { vendorId: string; items: DeliverItem[] };

async function mount(count: number, deliver: (input: DeliverInput) => Promise<DeliverTitlesResult>) {
  const titles: DeliverTitleRow[] = Array.from({ length: count }, (_, i) => ({
    id: tid(i + 1),
    title: `Film ${i + 1}`,
    status: "in_delivery",
  }));
  // One identical grant shape each: 6 or more share one Rights and one
  // Territory face; fewer keep a face each (one title here).
  const grants: GrantChoice[] = titles.map((row, i) => ({
    id: `g-${i + 1}`,
    title_id: row.id,
    rights_type: "avod",
    territory_mode: "include",
    territories: ["US", "CA"],
  }));
  const actions = {
    load: vi.fn(async () => ({ ok: true as const, titles, notFound: [], grants })),
    deliver: vi.fn(deliver),
  } satisfies DeliverActions;
  const onClose = vi.fn();
  act(() =>
    root.render(
      createElement(DeliverWindow, {
        titleIds: titles.map((row) => row.id),
        vendors: VENDORS,
        actions,
        requestRef: { current: null },
        onClose,
      }),
    ),
  );
  await settle();
  return { actions, onClose };
}

/** Channel One → the grant → United States → Deliver · N. */
async function walkAndDeliver() {
  click(all("data-deliver-option")[0]!);
  await headerAction();
  expect(face()).toBe("rights-0");
  click(all("data-deliver-option")[0]!);
  await headerAction();
  expect(face()).toBe("territory-0");
  click(all("data-deliver-option")[0]!);
  await headerAction();
}

function created(items: readonly DeliverItem[]): DeliverTitlesResult {
  return {
    created: items.map((item) => ({ titleId: item.titleId, deliveryId: `d-${item.titleId.slice(-3)}` })),
    existing: [],
    failed: [],
    stop: null,
  };
}

beforeEach(() => {
  shell.options = null;
  container = miniDocument.createElement("div");
  miniDocument.body.appendChild(container);
  root = createRoot(container as unknown as HTMLElement);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("Deliver window commit (mounted, fake actions)", () => {
  it("nothing went through: stays on the last face with the reasons, and the draft is kept", async () => {
    const { actions, onClose } = await mount(1, async (input) => ({
      created: [],
      existing: [],
      failed: input.items.map((item) => ({ titleId: item.titleId, reason: "no_cover" as const })),
      stop: null,
    }));
    await walkAndDeliver();

    expect(actions.deliver).toHaveBeenCalledTimes(1);
    expect(face()).toBe("territory-0");
    expect(html()).toContain("Film 1 · No active grant covers this territory.");
    // The pick is still made and a retry is one press.
    expect(all("data-deliver-option-selected")).toHaveLength(1);
    expect(frame("data-done")).toBe("Deliver · 1");
    expect(frame("data-done-disabled")).toBe("false");
    expect(onClose).not.toHaveBeenCalled();

    act(() => shell.options!.onClose());
    expect(onClose).toHaveBeenCalledWith({ saved: false, delivered: [], created: [] });
  });

  it("a part that went through moves to the result; batches of 25 carry no org", async () => {
    let call = 0;
    const { actions, onClose } = await mount(30, async (input) => {
      call += 1;
      if (call === 1) return created(input.items);
      return {
        created: [],
        existing: [],
        failed: input.items.map((item) => ({ titleId: item.titleId, reason: "no_cover" as const })),
        stop: null,
      };
    });
    await walkAndDeliver();

    expect(actions.deliver).toHaveBeenCalledTimes(2);
    const inputs = actions.deliver.mock.calls.map(([input]) => input);
    expect(inputs.map((input) => input.items.length)).toEqual([25, 5]);
    for (const input of inputs) {
      expect(Object.keys(input).sort()).toEqual(["items", "vendorId"]);
      expect(input.vendorId).toBe("v1");
      for (const item of input.items) {
        expect(Object.keys(item).sort()).toEqual(["grantId", "territory", "titleId"]);
        expect(item.territory).toBe("US");
      }
    }
    expect(face()).toBe("done");
    expect(frame("data-title")).toBe("25 of 30 deliveries created");
    expect(html()).toContain("Film 30 · No active grant covers this territory.");

    await headerAction();
    expect(onClose).toHaveBeenCalledTimes(1);
    const outcome = onClose.mock.calls[0]![0] as { saved: boolean; delivered: string[]; created: string[] };
    expect(outcome.saved).toBe(true);
    expect(outcome.delivered).toHaveLength(25);
    expect(outcome.created).toHaveLength(25);
  });

  it("a stop ends the run: the rest are not sent, and the stop line shows", async () => {
    let call = 0;
    const { actions } = await mount(60, async (input) => {
      call += 1;
      if (call === 1) return created(input.items);
      return { created: [], existing: [], failed: [], stop: "vendor_inactive" as const };
    });
    await walkAndDeliver();

    expect(actions.deliver).toHaveBeenCalledTimes(2);
    expect(face()).toBe("done");
    expect(frame("data-title")).toBe("25 of 60 deliveries created");
    expect(all("data-deliver-stop")).toHaveLength(1);
    expect(html()).toContain("This channel is no longer active.");
  });

  it("a batch that throws stops the run: its titles are named, the stop line covers the unsent rest", async () => {
    let call = 0;
    const { actions, onClose } = await mount(60, async (input) => {
      call += 1;
      if (call === 1) return created(input.items);
      throw new Error("network");
    });
    await walkAndDeliver();

    expect(actions.deliver).toHaveBeenCalledTimes(2);
    expect(face()).toBe("done");
    expect(frame("data-title")).toBe("25 of 60 deliveries created");
    expect(html()).toContain("Film 26 · Could not save.");
    expect(html()).toContain("Film 50 · Could not save.");
    // Batch 3 (Film 51-60) was never sent: no line of its own, the stop
    // line says the run stopped.
    expect(html()).not.toContain("Film 51 ·");
    const stop = all("data-deliver-stop");
    expect(stop).toHaveLength(1);
    expect(serializeElement(stop[0] as never)).toContain("Could not save.");

    await headerAction();
    expect(onClose.mock.calls[0]![0]).toMatchObject({ saved: true });
  });

  it("a first batch that throws keeps the face, and close still refreshes the list", async () => {
    const { actions, onClose } = await mount(1, async () => {
      throw new Error("timeout");
    });
    await walkAndDeliver();

    expect(actions.deliver).toHaveBeenCalledTimes(1);
    expect(face()).toBe("territory-0");
    expect(html()).toContain("Film 1 · Could not save.");
    expect(all("data-deliver-stop")).toHaveLength(1);
    expect(frame("data-done")).toBe("Deliver · 1");

    // What the server kept is unknown: the list refreshes on close.
    act(() => shell.options!.onClose());
    expect(onClose).toHaveBeenCalledWith({ saved: true, delivered: [], created: [] });
  });
});
